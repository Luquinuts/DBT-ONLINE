'use client';

import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import type { GamePhase } from '@dbt-online/shared';
import type { GameUIState } from '@/lib/gameReducer';
import type { UseGameReturn } from '@/lib/useGame';
import { FieldArea } from './FieldArea';
import { HandArea } from './HandArea';
import { CardInHand } from './CardInHand';
import { ActionBar } from './ActionBar';
import { CardPlayPanel } from './CardPlayPanel';
import { BattlefieldDisplay } from './BattlefieldDisplay';
import { CharacterModal } from './CharacterModal';
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
    flyingCard,
    attackAnimation,
  } = state;

  // ─── Modal state ─────────────────────────────────────────────
  const [modalCharacterId, setModalCharacterId] = useState<string | null>(null);

  // ─── Close modal on phase change ─────────────────────────────
  useEffect(() => {
    if (modalCharacterId && phase !== 'WAITING_FOR_ACTION' && phase !== 'ADVANCE') {
      setModalCharacterId(null);
    }
  }, [phase, modalCharacterId]);

  // ─── Close modal if character dies ──────────────────────────
  useEffect(() => {
    if (!modalCharacterId || !currentPlayer) return;
    const char = currentPlayer.characters.find(
      (c) => c.characterId === modalCharacterId,
    );
    if (!char || !char.isAlive) {
      setModalCharacterId(null);
    }
  }, [currentPlayer, modalCharacterId]);

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

  /** Returns 'ally', 'enemy', or null if the card doesn't need a target. */
  function getCardTargetSide(cardId: string | null): 'ally' | 'enemy' | null {
    if (!cardId) return null;
    const base = cardId.replace(/_\d+$/, '');
    // Cards that target YOUR characters
    const allyCards = ['plus_vida', 'escudo', 'semilla_senzu', 'nube_kinton', 'rage', 'esfera_dragon'];
    if (allyCards.some((c) => base === c)) return 'ally';
    // Cards that target OPPONENT characters
    const enemyCards = ['baculo_sagrado'];
    if (enemyCards.some((c) => base === c)) return 'enemy';
    return null;
  }

  const cardTargetSide = getCardTargetSide(selectedCard);

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
          !character.hasAttackedThisTurn &&
          !currentPlayer?.hasAttackedThisTurn;

        const canCardTarget =
          phase === 'WAITING_FOR_ACTION' &&
          selectedCard !== null &&
          cardTargetSide !== 'enemy';

        return {
          isEligible: canAdvance || canActAsAttacker,
          canTarget: canCardTarget,
        };
      }

      // Opponent side: characters can be targeted during ATTACK
      if (
        phase === 'ATTACK' &&
        selectedCharacter !== null &&
        character.isAlive
      ) {
        // Cell Games: only the character in the same position is targetable
        if (battlefield?.effect === 'attack_front_only') {
          const selectedIdx = currentPlayer?.characters.findIndex(
            (c) => c.characterId === selectedCharacter,
          ) ?? -1;
          const targetIdx = opponent?.characters.findIndex(
            (c) => c.characterId === characterId,
          ) ?? -1;
          return { isEligible: false, canTarget: selectedIdx === targetIdx };
        }
        return { isEligible: false, canTarget: true };
      }

      // Opponent side: selectable as card target in WAITING_FOR_ACTION
      if (
        phase === 'WAITING_FOR_ACTION' &&
        selectedCard !== null &&
        cardTargetSide !== 'ally' &&
        character.isAlive
      ) {
        return { isEligible: false, canTarget: true };
      }

      return { isEligible: false, canTarget: false };
    },
    [phase, isMyTurn, currentPlayer, opponent, selectedCharacter, selectedCard, cardTargetSide, battlefield],
  );

  const playerEligibilityMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    currentPlayer?.characters.forEach((c) => {
      map[c.characterId] = computeFieldState(c.characterId, true).isEligible;
    });
    return map;
  }, [currentPlayer, computeFieldState]);

  const playerTargetMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    currentPlayer?.characters.forEach((c) => {
      map[c.characterId] = computeFieldState(c.characterId, true).canTarget;
    });
    return map;
  }, [currentPlayer, computeFieldState]);

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

      // Player side
      if (isPlayerSide) {
        // In WAITING_FOR_ACTION with a card selected: toggle as card target
        if (phase === 'WAITING_FOR_ACTION' && selectedCard) {
          actions.selectCharacter(
            selectedCharacter === characterId ? null : characterId,
          );
          return;
        }

        // In ADVANCE or WAITING_FOR_ACTION (no card selected): open modal
        if (phase === 'ADVANCE' || phase === 'WAITING_FOR_ACTION') {
          setModalCharacterId(characterId);
          return;
        }

        // ATTACK phase: toggle attacker selection (existing behavior)
        if (
          phase === 'ATTACK' &&
          character.advanceCounter >= character.currentLentitud &&
          !character.hasAttackedThisTurn &&
          !currentPlayer?.hasAttackedThisTurn
        ) {
          actions.selectCharacter(
            selectedCharacter === characterId ? null : characterId,
          );
          return;
        }

        // BATTLEFIELD: select character for card targeting
        if (phase === 'BATTLEFIELD') {
          actions.selectCharacter(
            selectedCharacter === characterId ? null : characterId,
          );
          return;
        }

        // Other phases (DEFENDER_RESPONSE, END_TURN): no action
        return;
      }

      // Opponent side: target in ATTACK phase with an attacker selected
      if (phase === 'ATTACK' && selectedCharacter) {
        // Cell Games: only allow attacking the character at the same position
        if (battlefield?.effect === 'attack_front_only') {
          const selectedIdx = currentPlayer?.characters.findIndex(
            (c) => c.characterId === selectedCharacter,
          ) ?? -1;
          const targetIdx = opponent?.characters.findIndex(
            (c) => c.characterId === characterId,
          ) ?? -1;
          if (selectedIdx !== targetIdx) return;
        }
        actions.attack(selectedCharacter, characterId, 'NORMAL');
        actions.selectCharacter(null);
        return;
      }

      // Opponent side: select as card target in WAITING_FOR_ACTION (only for enemy-targeting cards)
      if (phase === 'WAITING_FOR_ACTION' && selectedCard && cardTargetSide === 'enemy') {
        actions.selectCharacter(
          selectedCharacter === characterId ? null : characterId,
        );
        return;
      }
    },
    [isMyTurn, phase, currentPlayer, opponent, selectedCharacter, selectedCard, cardTargetSide, actions, battlefield],
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
        // Cell Games: only allow attacking the character at the same position
        if (battlefield?.effect === 'attack_front_only') {
          const selectedIdx = currentPlayer?.characters.findIndex(
            (c) => c.characterId === selectedCharacter,
          ) ?? -1;
          const targetIdx = opponent?.characters.findIndex(
            (c) => c.characterId === characterId,
          ) ?? -1;
          if (selectedIdx !== targetIdx) return;
        }
        actions.attack(selectedCharacter, characterId, 'DEFINITIVA');
        actions.selectCharacter(null);
      }
    },
    [selectedCharacter, opponent, actions, currentPlayer, battlefield],
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

  const handleRedraw = useCallback(() => {
    actions.redraw();
  }, [actions]);

  const handlePlaySelectedCard = useCallback(() => {
    if (!selectedCard) return;
    actions.playCard(selectedCard, selectedCharacter ?? undefined);
    actions.selectCard(null);
    actions.selectCharacter(null);
  }, [selectedCard, selectedCharacter, actions]);

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

  // ─── Find modal character ─────────────────────────────────────
  const modalCharacter = modalCharacterId && currentPlayer
    ? currentPlayer.characters.find((c) => c.characterId === modalCharacterId)
    : null;

  const isCompact = phase === 'WAITING_FOR_ACTION';

  // ─── Render ----------------------------------------------------
  return (
    <div className={`flex flex-1 flex-col max-w-5xl mx-auto w-full ${
      isCompact ? 'gap-0.5 p-1 md:p-2' : 'gap-3 p-3 md:p-6'
    }`}>
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

      {/* ─── Battlefield (left) + Game content (right) ────────── */}
      <div className="flex flex-1 gap-4">
        {/* Left: Battlefield TCG card — vertically centered */}
        <div className="hidden md:flex flex-col justify-center">
          <BattlefieldDisplay
            battlefield={battlefield}
            isNullified={false}
          />
        </div>

        {/* Right: main game column */}
        <div className={`flex flex-1 flex-col min-w-0 ${
          isCompact ? 'gap-0.5' : 'gap-3'
        }`}>
          {/* ─── Opponent field ──────────────────────────────── */}
          {opponent && phase && (
            <FieldArea
              characters={opponent.characters}
              isPlayer={false}
              playerData={opponent}
              playerKi={currentPlayer?.ki ?? 0}
              selectedCharacter={selectedCharacter}
              phase={phase}
              onCharacterClick={(id) => handleCharacterClick(id, false)}
              eligibilityMap={opponentEligibilityMap}
              targetMap={opponentTargetMap}
              compact={isCompact}
            />
          )}

          {/* ─── Action bar ──────────────────────────────────── */}
          {currentPlayer && phase && (
            <ActionBar
              phase={phase}
              isMyTurn={isMyTurn}
              hasAdvancedThisTurn={currentPlayer.hasAdvancedThisTurn}
              hasPlayedEquipableThisTurn={currentPlayer.hasPlayedEquipableThisTurn}
              canRedrawThisTurn={currentPlayer.canRedrawThisTurn}
              onPass={handlePass}
              onRedraw={handleRedraw}
              onEndTurn={handleEndTurn}
            />
          )}

          {/* ─── Player field ────────────────────────────────── */}
          {currentPlayer && phase && (
            <FieldArea
              characters={currentPlayer.characters}
              isPlayer={true}
              playerData={currentPlayer}
              playerKi={currentPlayer.ki}
              selectedCharacter={selectedCharacter}
              phase={phase}
              onCharacterClick={(id) => handleCharacterClick(id, true)}
              eligibilityMap={playerEligibilityMap}
              targetMap={playerTargetMap}
              compact={isCompact}
              dimmed={!isMyTurn}
            />
          )}

          {/* ─── Hand area (minimized) ─────────────────────── */}
          {currentPlayer && phase !== 'WAITING_FOR_ACTION' && (
            <HandArea
              hand={currentPlayer.hand}
              isPlayable={false}
              selectedCard={selectedCard}
              onCardClick={handleCardClick}
            />
          )}

          {/* ─── Action hand (WAITING_FOR_ACTION) ──────────── */}
          {currentPlayer && phase === 'WAITING_FOR_ACTION' && (
            <div className="flex flex-col gap-1">
              {selectedCard && (
                <CardPlayPanel
                  cardId={selectedCard}
                  phase={phase}
                  selectedCharacter={selectedCharacter}
                  onPlay={handlePlaySelectedCard}
                  onCancel={() => {
                    actions.selectCard(null);
                    actions.selectCharacter(null);
                  }}
                />
              )}
              <div className={`flex justify-center ${
                selectedCard ? 'gap-1 py-1' : 'gap-0.5'
              }`}>
                {currentPlayer.hand.map((cardId) => (
                  <CardInHand
                    key={cardId}
                    cardId={cardId}
                    isPlayable={true}
                    isSelected={selectedCard === cardId}
                    onClick={() => handleCardClick(cardId)}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

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

      {/* ─── Namek Revive Overlay ──────────────────────────── */}
      {state.gameState?.namekRevivePending === state.playerIndex &&
       phase === 'WAITING_FOR_ACTION' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="rounded-lg border border-yellow-500/50 bg-gray-900 p-6 shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-yellow-400 mb-2">
              Namek Battlefield Revive
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Your last fighter is standing! Choose a dead character to revive:
            </p>
            <div className="flex flex-col gap-2">
              {currentPlayer?.characters
                .filter((c) => !c.isAlive)
                .map((char) => (
                  <button
                    key={char.characterId}
                    type="button"
                    onClick={() => actions.dragonRevive(char.characterId)}
                    className="rounded border border-gray-600 bg-gray-800 px-4 py-3 text-left text-sm text-white hover:border-yellow-500 hover:bg-gray-700 transition cursor-pointer"
                  >
                    <span className="font-medium">{char.characterId}</span>
                    <span className="text-gray-500 ml-2">(dead)</span>
                  </button>
                ))}
            </div>
            {(!currentPlayer?.characters.filter((c) => !c.isAlive).length ||
              currentPlayer?.characters.filter((c) => !c.isAlive).length === 0) && (
              <p className="text-sm text-red-400 mt-2">
                No dead characters available to revive.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── Character Modal ─────────────────────────────────── */}
      {modalCharacter && phase && isMyTurn && (
        <CharacterModal
          character={modalCharacter}
          playerKi={currentPlayer?.ki ?? 0}
          phase={phase}
          isMyTurn={isMyTurn}
          onAdvance={() => {
            actions.advance(modalCharacterId!);
            setModalCharacterId(null);
          }}
          onAbility={() => {
            handleAbility(modalCharacterId!);
            setModalCharacterId(null);
          }}
          onDefinitiva={() => {
            handleDefinitiva(modalCharacterId!);
            setModalCharacterId(null);
          }}
          onClose={() => setModalCharacterId(null)}
        />
      )}
    </div>
  );
}
