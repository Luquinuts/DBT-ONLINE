'use client';

import type { CharacterState } from '@dbt-online/shared';
import { CHARACTER_DISPLAY } from '@/data/character-display';
import { getCharacterImageSrc } from '@/lib/assets';
import { GameImage } from './GameImage';
import { HoloCard } from './HoloCard';
import { HpBar } from './HpBar';

interface CharacterCardProps {
  character: CharacterState;
  isPlayer: boolean;
  isSelected: boolean;
  isEligible: boolean;
  canTarget: boolean;
  onClick?: () => void;
  battlefieldEffect?: string;
  isDefending?: boolean;
  compact?: boolean;
}

export function CharacterCard({
  character,
  isPlayer,
  isSelected,
  isEligible,
  canTarget,
  onClick,
  battlefieldEffect,
  isDefending,
  compact,
}: CharacterCardProps) {
  const charDef = CHARACTER_DISPLAY[character.currentForm ?? character.characterId];
  const isDead = !character.isAlive;
  const canAttack = character.advanceCounter >= character.currentLentitud;

  // ─── Fallback if character ID not in display data ──────────
  if (!charDef) {
    return (
      <div className="flex h-48 w-48 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 p-2">
        <p className="text-xs text-gray-500">{character.characterId}</p>
      </div>
    );
  }

  // ─── Glow / feedback classes ──────────────────────────────
  const feedbackClass = isDead
    ? 'opacity-40'
    : isSelected
      ? 'shadow-[0_0_14px_rgba(96,165,250,0.6)] ring-2 ring-blue-500/50'
      : canTarget
        ? 'shadow-[0_0_14px_rgba(248,113,113,0.6)] ring-2 ring-red-500/50 cursor-pointer'
        : isEligible
          ? 'shadow-[0_0_14px_rgba(74,222,128,0.6)] ring-2 ring-green-500/50 cursor-pointer'
          : '';

  return (
    <div
      onClick={isDead ? undefined : onClick}
      className={`
        relative flex ${compact ? 'w-36' : 'w-48'} flex-col overflow-hidden rounded-xl
        bg-gray-900
        transition-all duration-200 select-none
        ${feedbackClass}
        ${!isDead && onClick ? 'hover:scale-[1.03]' : ''}
        ${isDefending ? 'ring-2 ring-yellow-400/60' : ''}
      `}
    >
      {/* ─── Character image (full art, no crop) ──────────── */}
      <div
        className="relative flex-shrink-0"
        style={{ backgroundColor: charDef.color + '20' }}
      >
        <HoloCard className="w-full">
          <GameImage
            src={getCharacterImageSrc(character.currentForm ?? character.characterId)}
            alt={charDef.displayName}
            className="w-full object-contain"
            fallback={
              <div className={`flex w-full items-center justify-center ${compact ? 'h-36' : 'h-48'}`}>
                <span className={compact ? 'text-2xl' : 'text-3xl'}>?</span>
              </div>
            }
          />
        </HoloCard>

        {/* ─── Dead overlay ──────────────────────────────── */}
        {isDead && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
            <div className="text-center">
              <span className={compact ? 'text-3xl' : 'text-4xl'}>💀</span>
              <p className="text-[10px] text-gray-400 mt-1">DERRIBADO</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── HP Bar (below image) ──────────────────────────── */}
      <div className={`${compact ? 'px-2 pt-1 pb-0.5' : 'px-3 pt-2 pb-1'}`}>
        <HpBar current={character.currentVida} max={character.maxVida} animated />
      </div>

      {/* ─── Advance counter (below HP bar) ────────────────── */}
      <div className={`${compact ? 'px-2 pb-0.5' : 'px-3 pb-1'}`}>
        <div className={`flex items-center justify-between ${compact ? 'mb-0' : 'mb-0.5'}`}>
          <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} text-gray-400 font-medium`}>AVANCE</span>
          {!canAttack && (
            <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} text-yellow-400 font-semibold`}>
              {character.advanceCounter}/{character.currentLentitud}
            </span>
          )}
        </div>
        <div className={`w-full rounded-full bg-gray-700/60 overflow-hidden ${compact ? 'h-1' : 'h-1.5'}`}>
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              canAttack ? 'bg-green-500' : 'bg-yellow-500'
            }`}
            style={{
              width: `${Math.min(100, (character.advanceCounter / Math.max(1, character.currentLentitud)) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* ─── Shield / Rage icons ──────────────────────────── */}
      <div className={`flex items-center ${compact ? 'gap-1 px-2 pt-0 pb-0' : 'gap-1.5 px-3 pt-0.5 pb-0.5'}`}>
        {character.shieldEquipped && (
          <span className="text-xs" title="Escudo equipado">🛡️</span>
        )}
        {battlefieldEffect && (
          <span className="text-[10px] text-yellow-500/80 italic" title="Efecto de campo">
            {battlefieldEffect}
          </span>
        )}
      </div>

      {/* ─── Status text ───────────────────────────────────── */}
      {!isDead && canAttack && !character.hasAttackedThisTurn && (
        <div className={`${compact ? 'px-2 pb-1' : 'px-3 pb-1.5'} text-[10px] text-green-400/80 italic`}>
          ✦ Puede atacar
        </div>
      )}
      {!isDead && isDefending && (
        <div className={`${compact ? 'px-2 pb-1' : 'px-3 pb-1.5'} text-[10px] text-yellow-400/80 italic`}>
          🛡 Defendiendo
        </div>
      )}
    </div>
  );
}
