'use client';

import { useCallback, useMemo, useEffect, useRef } from 'react';
import type { GamePhase } from '@dbt-online/shared';
import type { GameUIState } from '@/lib/gameReducer';
import type { UseGameReturn } from '@/lib/useGame';
import { FieldArea } from './FieldArea';
import { HandArea } from './HandArea';
import { ActionBar } from './ActionBar';
import { BattlefieldDisplay } from './BattlefieldDisplay';
import { GameLog } from './GameLog';
import './card-effects.css';

interface GameBoardProps {
  state: GameUIState;
  actions: UseGameReturn['actions'];
  onLeave?: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  BATTLEFIELD: 'Battlefield',
  WAITING_FOR_ACTION: 'Acción',
  ADVANCE: 'Avanzar',
  ATTACK: 'Atacar',
  DEFENDER_RESPONSE: 'Defensa',
  END_TURN: 'Finalizando',
};

export function GameBoard({ state, actions, onLeave }: GameBoardProps) {
  const {
    phase,
    currentPlayer,
    opponent,
    battlefield,
    isMyTurn,
    selectedCharacter,
    selectedCard,
    error,
    logEntries,
    flyingCard,
    attackAnimation,
  } = state;

  // ─── Auto-trigger animations from turn log ────────────────
  const prevLogLen = useRef(0);

  useEffect(() => {
    const log = state.gameState?.turnLog;
    if (!log || log.length <= prevLogLen.current) {
      prevLogLen.current = log?.length || 0;
      return;
    }

    prevLogLen.current = log.length;
    const lastEntry = log[log.length - 1];
    if (!lastEntry) return;

    // Detect card play → trigger flying card animation
    if (lastEntry.action === 'PLAY_CARD' && !state.flyingCard) {
      const cardId = lastEntry.details?.split(' ')[0] || '';
      actions.setFlyingCard({ cardId, from: 'hand', to: 'field' });
      setTimeout(() => actions.setFlyingCard(null), 600);
    }

    // Detect attack → trigger damage number animation
    if (lastEntry.action === 'ATTACK' && !state.attackAnimation) {
      const dmgMatch = lastEntry.details?.match(/-?\d+/);
      const damage = dmgMatch ? parseInt(dmgMatch[0], 10) : 0;
      actions.setAttackAnimation({
        attackerId: '',
        targetId: '',
        damage,
      });
      setTimeout(() => actions.setAttackAnimation(null), 1000);
    }
  }, [state.gameState?.turnLog, state.flyingCard, state.attackAnimation, actions]);

  // ─── Derive per-character eligibility --------------------------
  const computeFieldState = useCallback(
    (characterId: string, isPlayerSide: boolean) => {
      if (!phase || !isMyTurn) {
        return { isEligible: false, canTarget: false };
      }

      const characters = isPlayerSide
        ? currentPlayer?.characters
        : opponent?.characters;

      const character = characters?.find((c) => c.characterId === characterId);
      if (!character || !character.isAlive) {
        return { isEligible: false, canTarget: false };
      }

      if (isPlayerSide) {
        const canAdvance =
          phase === 'ADVANCE' &&
          character.advanceCounter < character.currentLentitud;

        const canActAsAttacker =
          phase === 'ATTACK' &&
          character.advanceCounter >= character.currentLentitud &&
          !character.hasAttackedThisTurn;

        return {
          isEligible: canAdvance || canActAsAttacker,
          canTarget: false,
        };
      }

      // Opponent side: characters can be targeted during ATTACK
      if (
        phase === 'ATTACK' &&
        selectedCharacter !== null &&
        character.isAlive
      ) {
        return { isEligible: false, canTarget: true };
      }

      return { isEligible: false, canTarget: false };
    },
    [phase, isMyTurn, currentPlayer, opponent, selectedCharacter],
  );

  const playerEligibilityMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    currentPlayer?.characters.forEach((c) => {
      map[c.characterId] = computeFieldState(c.characterId, true).isEligible;
    });
    return map;
  }, [currentPlayer, computeFieldState]);

  const playerTargetMap: Record<string, boolean> = {};

  const opponentEligibilityMap: Record<string, boolean> = {};
  const opponentTargetMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    opponent?.characters.forEach((c) => {
      const state = computeFieldState(c.characterId, false);
      map[c.characterId] = state.canTarget;
    });
    return map;
  }, [opponent, computeFieldState]);

  // ─── Character click handler -----------------------------------
  const handleCharacterClick = useCallback(
    (characterId: string, isPlayerSide: boolean) => {
      if (!isMyTurn || !phase) return;

      const characters = isPlayerSide
        ? currentPlayer?.characters
        : opponent?.characters;
      const character = characters?.find(
        (c) => c.characterId === characterId,
      );
      if (!character || !character.isAlive) return;

      // Player side: advance or select
      if (isPlayerSide) {
        if (
          phase === 'ADVANCE' &&
          character.advanceCounter < character.currentLentitud
        ) {
          actions.advance(characterId);
          return;
        }

        if (
          phase === 'ATTACK' &&
          character.advanceCounter >= character.currentLentitud &&
          !character.hasAttackedThisTurn
        ) {
          // Toggle attacker selection
          actions.selectCharacter(
            selectedCharacter === characterId ? null : characterId,
          );
          return;
        }

        // Default: select character for ability targeting etc.
        actions.selectCharacter(
          selectedCharacter === characterId ? null : characterId,
        );
        return;
      }

      // Opponent side: targeting
      if (phase === 'ATTACK' && selectedCharacter) {
        actions.attack(selectedCharacter, characterId, 'NORMAL');
        actions.selectCharacter(null);
      }
    },
    [isMyTurn, phase, currentPlayer, opponent, selectedCharacter, actions],
  );

  const handleAbility = useCallback(
    (characterId: string) => {
      actions.useHabilidad(characterId);
    },
    [actions],
  );

  const handleDefinitiva = useCallback(
    (characterId: string) => {
      if (!selectedCharacter) {
        // First click: select character for definitiva targeting
        actions.selectCharacter(characterId);
        return;
      }
      // Second click on opponent: fire definitiva
      if (opponent?.characters.find((c) => c.characterId === characterId)) {
        actions.attack(selectedCharacter, characterId, 'DEFINITIVA');
        actions.selectCharacter(null);
      }
    },
    [selectedCharacter, opponent, actions],
  );

  const handleCardClick = useCallback(
    (cardId: string) => {
      if (!isMyTurn) return;
      actions.selectCard(selectedCard === cardId ? null : cardId);
      // In Phase 3, this will also handle card play
    },
    [isMyTurn, selectedCard, actions],
  );

  const handlePass = useCallback(() => {
    actions.pass();
  }, [actions]);

  const handleEndTurn = useCallback(() => {
    actions.endTurn();
  }, [actions]);

  const isHandPlayable =
    isMyTurn && phase === 'WAITING_FOR_ACTION';

  // ─── Eligibility for advance (ActionBar) -----------------------
  const eligibleAttackers = useMemo(() => {
    if (phase !== 'ATTACK') return [];
    return (
      currentPlayer?.characters
        .filter(
          (c) =>
            c.isAlive &&
            c.advanceCounter >= c.currentLentitud &&
            !c.hasAttackedThisTurn,
        )
        .map((c) => c.characterId) ?? []
    );
  }, [phase, currentPlayer]);

  const phaseLabel = phase ? PHASE_LABELS[phase] || phase : '';

  // ─── Render ----------------------------------------------------
  return (
    <div className="flex flex-1 flex-col gap-3 p-3 md:p-6 max-w-5xl mx-auto w-full">
      {/* ─── Top bar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2">
        <button
          type="button"
          onClick={onLeave}
          className="text-xs text-gray-500 hover:text-gray-300 transition cursor-pointer"
        >
          ← Salir al lobby
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            Turno <span className="font-semibold text-white">{state.gameState?.turnNumber ?? '-'}</span>
          </span>
          <span className="text-xs text-gray-600">·</span>
          <span className="text-xs font-medium text-gray-400">{phaseLabel}</span>
        </div>
      </div>

      {/* ─── Error ─────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-400">⚠️</span>
            <span className="text-sm text-red-300">{error.message}</span>
          </div>
          <button
            type="button"
            onClick={actions.clearError}
            className="text-sm text-red-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── Opponent field ────────────────────────────────────── */}
      {opponent && phase && (
        <FieldArea
          characters={opponent.characters}
          isPlayer={false}
          playerData={opponent}
          selectedCharacter={selectedCharacter}
          phase={phase}
          onCharacterClick={(id) => handleCharacterClick(id, false)}
          onAbility={handleAbility}
          onDefinitiva={handleDefinitiva}
          eligibilityMap={opponentEligibilityMap}
          targetMap={opponentTargetMap}
        />
      )}

      {/* ─── Battlefield ────────────────────────────────────────── */}
      <BattlefieldDisplay
        battlefield={battlefield}
        isNullified={false}
      />

      {/* ─── Player field ──────────────────────────────────────── */}
      {currentPlayer && phase && (
        <FieldArea
          characters={currentPlayer.characters}
          isPlayer={true}
          playerData={currentPlayer}
          selectedCharacter={selectedCharacter}
          phase={phase}
          onCharacterClick={(id) => handleCharacterClick(id, true)}
          onAbility={handleAbility}
          onDefinitiva={handleDefinitiva}
          eligibilityMap={playerEligibilityMap}
          targetMap={playerTargetMap}
        />
      )}

      {/* ─── Action bar ────────────────────────────────────────── */}
      {currentPlayer && phase && (
        <ActionBar
          phase={phase}
          isMyTurn={isMyTurn}
          playerKi={currentPlayer.ki}
          deckCount={currentPlayer.deck.length}
          discardCount={currentPlayer.discardPile.length}
          ultimateUses={currentPlayer.ultimateUsesRemaining}
          hasAdvancedThisTurn={currentPlayer.hasAdvancedThisTurn}
          hasPlayedEquipableThisTurn={currentPlayer.hasPlayedEquipableThisTurn}
          onPass={handlePass}
          onEndTurn={handleEndTurn}
        />
      )}

      {/* ─── Hand area ──────────────────────────────────────────── */}
      {currentPlayer && (
        <HandArea
          hand={currentPlayer.hand}
          isPlayable={isHandPlayable}
          selectedCard={selectedCard}
          onCardClick={handleCardClick}
        />
      )}

      {/* ─── Game log ─────────────────────────────────────────── */}
      {logEntries.length > 0 && (
        <GameLog entries={logEntries} maxVisible={10} />
      )}

      {/* ─── Flying card animation overlay ────────────────────── */}
      {flyingCard && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-card-pulse text-6xl">
            🃏
          </div>
        </div>
      )}

      {/* ─── Attack animation overlay ─────────────────────────── */}
      {attackAnimation && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-damage-float text-red-500 font-bold text-5xl drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
            -{attackAnimation.damage}
          </div>
        </div>
      )}
    </div>
  );
}
