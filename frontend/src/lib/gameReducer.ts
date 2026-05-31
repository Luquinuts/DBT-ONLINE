'use client';

import type {
  GameState,
  GamePhase,
  PlayerGameState,
  BattlefieldDef,
  GameError,
  PendingAttack,
  TurnLogEntry,
} from '@dbt-online/shared';

export interface GameUIState {
  // Core game state (from server)
  gameState: GameState | null;
  phase: GamePhase | null;
  currentPlayer: PlayerGameState | null;
  opponent: PlayerGameState | null;
  battlefield: BattlefieldDef | null;
  isMyTurn: boolean;

  // UI State
  selectedCharacter: string | null;
  selectedCard: string | null;
  isDefenderResponse: boolean;
  pendingAttack: PendingAttack | null;
  error: GameError | null;
  gameOver: boolean;
  winner: string | null;
  playerIndex: number;
  roomCode: string;

  // Animations
  flyingCard: {
    cardId: string;
    from: 'hand' | 'field' | string;
    to: string;
  } | null;
  attackAnimation: {
    attackerId: string;
    targetId: string;
    damage: number;
  } | null;

  // Draft
  draftAvailable: string[];
  draftPicks: [string[], string[]];
  draftPhase: 'PICKING' | 'PLACING' | 'DONE' | null;
  currentPicker: number | null;

  // Log
  logEntries: TurnLogEntry[];
}

export type GameUIAction =
  | { type: 'SET_GAME_STATE'; payload: GameState; playerId: string }
  | { type: 'SET_ERROR'; payload: GameError }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SELECT_CHARACTER'; characterId: string | null }
  | { type: 'SELECT_CARD'; cardId: string | null }
  | { type: 'DEFENDER_WINDOW'; payload: PendingAttack }
  | { type: 'DEFENDER_RESPONDED' }
  | { type: 'GAME_OVER'; winner: string }
  | {
      type: 'FLYING_CARD';
      payload: {
        cardId: string;
        from: 'hand' | 'field' | string;
        to: string;
      } | null;
    }
  | {
      type: 'ATTACK_ANIMATION';
      payload: { attackerId: string; targetId: string; damage: number } | null;
    }
  | { type: 'RESET' };

export function createInitialGameUIState(): GameUIState {
  return {
    gameState: null,
    phase: null,
    currentPlayer: null,
    opponent: null,
    battlefield: null,
    isMyTurn: false,

    selectedCharacter: null,
    selectedCard: null,
    isDefenderResponse: false,
    pendingAttack: null,
    error: null,
    gameOver: false,
    winner: null,
    playerIndex: 0,
    roomCode: '',

    flyingCard: null,
    attackAnimation: null,

    draftAvailable: [],
    draftPicks: [[], []],
    draftPhase: null,
    currentPicker: null,

    logEntries: [],
  };
}

export function gameReducer(
  state: GameUIState,
  action: GameUIAction,
): GameUIState {
  switch (action.type) {
    case 'SET_GAME_STATE': {
      const gameState = action.payload;
      const players = gameState.players;

      // Discover player index from playerId if possible
      let playerIdx = state.playerIndex;
      if (action.playerId && players) {
        const found = players.findIndex(
          (p) => p?.playerId === action.playerId,
        );
        if (found >= 0) {
          playerIdx = found;
        }
      }

      // Derive player/opponent from game state
      const currentPlayer =
        players && players[playerIdx] ? players[playerIdx] : null;
      const opponent =
        players && players[1 - playerIdx] ? players[1 - playerIdx] : null;
      const isMyTurn = gameState.currentPlayerIndex === playerIdx;

      // Derive defender response flag from game phase
      const isDefenderResponse = gameState.phase === 'DEFENDER_RESPONSE';

      // Draft state
      let draftAvailable = state.draftAvailable;
      let draftPicks: [string[], string[]] = state.draftPicks;
      let draftPhase = state.draftPhase;
      let currentPicker = state.currentPicker;

      if (gameState.draftState) {
        draftAvailable = gameState.draftState.availableCharacters;
        draftPicks = gameState.draftState.picks;
        draftPhase = gameState.draftState.phase as GameUIState['draftPhase'];
        currentPicker = gameState.draftState.currentPicker;
      }

      // Append only new log entries
      const existingCount = state.logEntries.length;
      const newTurnLog = gameState.turnLog
        ? gameState.turnLog.slice(existingCount)
        : [];
      const logEntries =
        newTurnLog.length > 0
          ? [...state.logEntries, ...newTurnLog]
          : state.logEntries;

      return {
        ...state,
        gameState,
        phase: gameState.phase,
        playerIndex: playerIdx,
        currentPlayer,
        opponent,
        battlefield: gameState.battlefield,
        isMyTurn,
        isDefenderResponse,
        pendingAttack: gameState.pendingAttack,
        gameOver: gameState.phase === 'GAME_OVER',
        winner: gameState.winner || state.winner,
        draftAvailable,
        draftPicks,
        draftPhase,
        currentPicker,
        logEntries,
      };
    }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'SELECT_CHARACTER':
      return {
        ...state,
        selectedCharacter: action.characterId,
      };

    case 'SELECT_CARD':
      return {
        ...state,
        selectedCard: action.cardId,
      };

    case 'DEFENDER_WINDOW':
      return {
        ...state,
        isDefenderResponse: true,
        pendingAttack: action.payload,
      };

    case 'DEFENDER_RESPONDED':
      return {
        ...state,
        isDefenderResponse: false,
        pendingAttack: null,
      };

    case 'GAME_OVER':
      return {
        ...state,
        gameOver: true,
        winner: action.winner,
      };

    case 'FLYING_CARD':
      return {
        ...state,
        flyingCard: action.payload,
      };

    case 'ATTACK_ANIMATION':
      return {
        ...state,
        attackAnimation: action.payload,
      };

    case 'RESET':
      return createInitialGameUIState();

    default:
      return state;
  }
}
