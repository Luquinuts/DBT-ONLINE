'use client';

import { useReducer, useCallback, useEffect } from 'react';
import type {
  GameState,
  GameAction,
  PendingAttack,
  GameError,
} from '@dbt-online/shared';
import { getSocket } from './socket';
import {
  gameReducer,
  createInitialGameUIState,
  type GameUIState,
} from './gameReducer';

export interface UseGameReturn {
  state: GameUIState;
  actions: {
    startGame: (roomCode: string) => void;
    draftSelect: (characterId: string) => void;
    placeCharacters: (order: string[]) => void;
    playCard: (cardId: string, targetCharacterId?: string) => void;
    advance: (characterId: string) => void;
    attack: (
      attackerId: string,
      targetId: string,
      attackType: 'NORMAL' | 'DEFINITIVA',
    ) => void;
    useHabilidad: (characterId: string, targetCharacterId?: string) => void;
    pass: () => void;
    endTurn: () => void;
    defenderResponse: (
      action: 'ESQUIVE' | 'ESCUDO' | 'NONE',
      characterId: string,
      cardId?: string,
    ) => void;
    switchForm: (characterId: string, targetForm: string) => void;
    dragonRevive: (targetCharacterId: string) => void;
    selectCharacter: (id: string | null) => void;
    selectCard: (id: string | null) => void;
    clearError: () => void;
    reset: () => void;
    setFlyingCard: (
      payload: {
        cardId: string;
        from: string;
        to: string;
      } | null,
    ) => void;
    setAttackAnimation: (
      payload: {
        attackerId: string;
        targetId: string;
        damage: number;
      } | null,
    ) => void;
  };
}

export function useGame(
  roomCode: string,
  playerId: string,
): UseGameReturn {
  const [state, dispatch] = useReducer(
    gameReducer,
    { ...createInitialGameUIState(), roomCode },
  );

  // Listen for socket game events
  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    // Pedir estado actual al montar — cubre navegación desde el lobby
    socket.emit('game:request_sync', roomCode);

    const onStateUpdate = (gameState: GameState) => {
      dispatch({ type: 'SET_GAME_STATE', payload: gameState, playerId });
    };

    const onDefenderWindow = (data: {
      pendingAttack: PendingAttack;
      timeoutMs: number;
    }) => {
      dispatch({ type: 'DEFENDER_WINDOW', payload: data.pendingAttack });
    };

    const onError = (error: GameError) => {
      // Si la sala no se encuentra por empezar dos veces, pedir sync
      if (error.code === 'ROOM_NOT_FOUND' || error.code === 'NOT_ENOUGH_PLAYERS' || error.code === 'NOT_HOST') {
        socket.emit('game:request_sync', roomCode);
        return;
      }
      dispatch({ type: 'SET_ERROR', payload: error });
    };

    const onGameOver = (gameState: GameState) => {
      dispatch({ type: 'SET_GAME_STATE', payload: gameState, playerId });
      dispatch({ type: 'GAME_OVER', winner: gameState.winner || '' });
    };

    socket.on('game:state_update', onStateUpdate);
    socket.on('game:defender_window', onDefenderWindow);
    socket.on('game:error', onError);
    socket.on('game:over', onGameOver);

    return () => {
      socket.off('game:state_update', onStateUpdate);
      socket.off('game:defender_window', onDefenderWindow);
      socket.off('game:error', onError);
      socket.off('game:over', onGameOver);
    };
  }, [playerId]);

  const emitGameAction = useCallback(
    (action: GameAction) => {
      const socket = getSocket();
      if (!socket?.connected) return;
      socket.emit('game:action', { roomCode, action });
    },
    [roomCode],
  );

  const actions = {
    startGame: useCallback(
      (rc: string) => {
        const socket = getSocket();
        if (!socket?.connected) return;
        socket.emit('room:start_game', rc);
      },
      [],
    ),

    draftSelect: useCallback(
      (characterId: string) => {
        emitGameAction({ type: 'DRAFT_SELECT', characterId });
      },
      [emitGameAction],
    ),

    placeCharacters: useCallback(
      (order: string[]) => {
        emitGameAction({ type: 'PLACE_CHARACTERS', order });
      },
      [emitGameAction],
    ),

    playCard: useCallback(
      (cardId: string, targetCharacterId?: string) => {
        emitGameAction({ type: 'PLAY_CARD', cardId, targetCharacterId });
      },
      [emitGameAction],
    ),

    advance: useCallback(
      (characterId: string) => {
        emitGameAction({ type: 'ADVANCE', characterId });
      },
      [emitGameAction],
    ),

    attack: useCallback(
      (
        attackerId: string,
        targetId: string,
        attackType: 'NORMAL' | 'DEFINITIVA',
      ) => {
        emitGameAction({
          type: 'ATTACK',
          attackerId,
          targetId,
          attackType,
        });
      },
      [emitGameAction],
    ),

    useHabilidad: useCallback(
      (characterId: string, targetCharacterId?: string) => {
        emitGameAction({
          type: 'USE_HABILIDAD',
          characterId,
          targetCharacterId,
        });
      },
      [emitGameAction],
    ),

    pass: useCallback(() => {
      emitGameAction({ type: 'PASS' });
    }, [emitGameAction]),

    endTurn: useCallback(() => {
      emitGameAction({ type: 'END_TURN' });
    }, [emitGameAction]),

    defenderResponse: useCallback(
      (
        action: 'ESQUIVE' | 'ESCUDO' | 'NONE',
        characterId: string,
        cardId?: string,
      ) => {
        const socket = getSocket();
        if (!socket?.connected) return;
        socket.emit('game:defender_response', {
          roomCode,
          action: {
            type: 'DEFENDER_RESPONSE',
            action,
            characterId,
            ...(cardId ? { cardId } : {}),
          } as GameAction,
        });
        dispatch({ type: 'DEFENDER_RESPONDED' });
      },
      [roomCode],
    ),

    switchForm: useCallback(
      (characterId: string, targetForm: string) => {
        emitGameAction({
          type: 'SWITCH_FORM',
          characterId,
          targetForm,
        });
      },
      [emitGameAction],
    ),

    dragonRevive: useCallback(
      (targetCharacterId: string) => {
        emitGameAction({
          type: 'DRAGON_REVIVE',
          targetCharacterId,
        });
      },
      [emitGameAction],
    ),

    selectCharacter: useCallback((id: string | null) => {
      dispatch({ type: 'SELECT_CHARACTER', characterId: id });
    }, []),

    selectCard: useCallback((id: string | null) => {
      dispatch({ type: 'SELECT_CARD', cardId: id });
    }, []),

    clearError: useCallback(() => {
      dispatch({ type: 'CLEAR_ERROR' });
    }, []),

    reset: useCallback(() => {
      dispatch({ type: 'RESET' });
    }, []),

    setFlyingCard: useCallback(
      (
        payload: {
          cardId: string;
          from: string;
          to: string;
        } | null,
      ) => {
        dispatch({ type: 'FLYING_CARD', payload });
      },
      [],
    ),

    setAttackAnimation: useCallback(
      (
        payload: {
          attackerId: string;
          targetId: string;
          damage: number;
        } | null,
      ) => {
        dispatch({ type: 'ATTACK_ANIMATION', payload });
      },
      [],
    ),
  };

  return { state, actions };
}
