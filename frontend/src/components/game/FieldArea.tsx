'use client';

import type { CharacterState, PlayerGameState, GamePhase } from '@dbt-online/shared';
import { CharacterCard } from './CharacterCard';

interface FieldAreaProps {
  characters: CharacterState[];
  isPlayer: boolean;
  playerData: PlayerGameState;
  playerKi: number;
  selectedCharacter: string | null;
  phase: GamePhase;
  onCharacterClick: (characterId: string) => void;
  /** Per-character eligibility: map of characterId -> isEligible */
  eligibilityMap: Record<string, boolean>;
  /** Per-character targetability: map of characterId -> canTarget */
  targetMap: Record<string, boolean>;
  battlefieldEffect?: string;
  isDefending?: boolean;
  compact?: boolean;
  dimmed?: boolean;
}

export function FieldArea({
  characters,
  isPlayer,
  playerData,
  playerKi,
  selectedCharacter,
  phase,
  onCharacterClick,
  eligibilityMap,
  targetMap,
  battlefieldEffect,
  isDefending,
  compact,
  dimmed,
}: FieldAreaProps) {
  // ─── Ki display — show ki as filled/empty crystal icons ─────
  const renderKiDisplay = (ki: number) => {
    // Show up to 10 ki indicators; if ki > 10 just show the number
    if (ki > 10) {
      return (
        <span className="text-sm font-bold text-yellow-400">
          ⚡ {ki}
        </span>
      );
    }
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: Math.max(ki, 1) }).map((_, i) => (
          <span key={i} className={`text-sm ${i < ki ? 'text-yellow-400' : 'text-gray-700'}`}>
            ⚡
          </span>
        ))}
      </div>
    );
  };

  const playerLabel = isPlayer ? 'Tu Campo' : 'Rival';

  return (
    <div className={`flex flex-col gap-2 ${dimmed ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
      {/* ─── Player info bar ────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-gray-300">{playerLabel}</h3>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-1" title="Ki disponible — se genera 1 por turno">
            <span className="text-[10px] text-gray-500">KI</span>
            {renderKiDisplay(playerData.ki)}
          </div>
          <span className="text-gray-600">|</span>
          <span title="Mazo">📚 {playerData.deck.length}</span>
          <span title="Descarte">🗑️ {playerData.discardPile.length}</span>
        </div>
      </div>

      {/* ─── Character cards ────────────────────────────────── */}
      <div className={`flex justify-center ${compact ? 'gap-1' : 'gap-3'}`}>
        {characters.map((char) => (
          <CharacterCard
            key={char.characterId}
            character={char}
            isPlayer={isPlayer}
            isSelected={selectedCharacter === char.characterId}
            isEligible={eligibilityMap[char.characterId] ?? false}
            canTarget={targetMap[char.characterId] ?? false}
            onClick={() => onCharacterClick(char.characterId)}
            battlefieldEffect={battlefieldEffect}
            isDefending={isDefending}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}
