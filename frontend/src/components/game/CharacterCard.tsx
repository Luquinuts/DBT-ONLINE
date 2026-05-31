'use client';

import type { CharacterState } from '@dbt-online/shared';
import { CHARACTER_DISPLAY } from '@/data/character-display';
import { getCharacterImageSrc } from '@/lib/assets';
import { GameImage } from './GameImage';
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
}: CharacterCardProps) {
  const charDef = CHARACTER_DISPLAY[character.characterId];
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

  // ─── Glow / border classes ────────────────────────────────
  const borderClass = isDead
    ? 'border-gray-700 opacity-40'
    : isSelected
      ? 'border-blue-400 shadow-[0_0_14px_rgba(96,165,250,0.6)] ring-2 ring-blue-500/50'
      : canTarget
        ? 'border-red-400 shadow-[0_0_14px_rgba(248,113,113,0.6)] ring-2 ring-red-500/50 cursor-pointer'
        : isEligible
          ? 'border-green-400 shadow-[0_0_14px_rgba(74,222,128,0.6)] ring-2 ring-green-500/50 cursor-pointer'
          : 'border-gray-600';

  return (
    <div
      onClick={isDead ? undefined : onClick}
      className={`
        relative flex w-48 flex-col overflow-hidden rounded-xl border-2
        bg-gray-900
        transition-all duration-200 select-none
        ${borderClass}
        ${!isDead && onClick ? 'hover:scale-[1.03]' : ''}
        ${isDefending ? 'ring-2 ring-yellow-400/60' : ''}
      `}
    >
      {/* ─── Character image (full art, no crop) ──────────── */}
      <div
        className="relative flex-shrink-0"
        style={{ backgroundColor: charDef.color + '20' }}
      >
        <GameImage
          src={getCharacterImageSrc(character.characterId)}
          alt={charDef.displayName}
          className="w-full object-contain"
          fallback={
            <div className="flex h-48 w-full items-center justify-center">
              <span className="text-3xl">?</span>
            </div>
          }
        />

        {/* ─── Dead overlay ──────────────────────────────── */}
        {isDead && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
            <div className="text-center">
              <span className="text-4xl">💀</span>
              <p className="text-[10px] text-gray-400 mt-1">DERRIBADO</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── HP Bar (below image) ──────────────────────────── */}
      <div className="px-3 pt-2 pb-1">
        <HpBar current={character.currentVida} max={character.maxVida} animated />
      </div>

      {/* ─── Advance counter (below HP bar) ────────────────── */}
      <div className="px-3 pb-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[11px] text-gray-400 font-medium">AVANCE</span>
          {canAttack ? (
            <span className="text-[11px] font-semibold text-green-400">✅ LISTO</span>
          ) : (
            <span className="text-[11px] text-yellow-400 font-semibold">
              {character.advanceCounter}/{character.currentLentitud}
            </span>
          )}
        </div>
        <div className="w-full h-1.5 rounded-full bg-gray-700/60 overflow-hidden">
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
      <div className="flex items-center gap-1.5 px-3 pt-0.5 pb-0.5">
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
        <div className="px-3 pb-1.5 text-[10px] text-green-400/80 italic">
          ✦ Puede atacar
        </div>
      )}
      {!isDead && isDefending && (
        <div className="px-3 pb-1.5 text-[10px] text-yellow-400/80 italic">
          🛡 Defendiendo
        </div>
      )}
    </div>
  );
}
