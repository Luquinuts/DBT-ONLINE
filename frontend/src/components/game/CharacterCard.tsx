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

const TYPE_STYLES: Record<string, { badge: string; accent: string }> = {
  TANQUE: { badge: 'bg-violet-700', accent: 'border-violet-500' },
  DAMAGE: { badge: 'bg-red-700', accent: 'border-red-500' },
  SUPPORT: { badge: 'bg-sky-700', accent: 'border-sky-500' },
};

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

  const typeStyle = TYPE_STYLES[charDef.type] || TYPE_STYLES.DAMAGE;

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
      {/* ─── Image area (fixed height, full-opacity art) ──── */}
      <div
        className="relative h-36 overflow-hidden"
        style={{ backgroundColor: charDef.color + '20' }}
      >
        <GameImage
          src={getCharacterImageSrc(character.characterId)}
          alt={charDef.displayName}
          className="absolute inset-0 w-full h-full object-cover"
          fallback={
            <div className="flex h-full w-full items-center justify-center">
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

        {/* ─── Name + Type badge (overlaid on art) ─────────── */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between gap-1 px-3 pt-2.5 pb-1 pointer-events-none">
          <span className="text-sm font-bold text-white truncate drop-shadow-sm">
            {charDef.displayName}
          </span>
          <span
            className={`shrink-0 rounded-md ${typeStyle.badge} px-1.5 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm`}
          >
            {charDef.type}
          </span>
        </div>

        {/* ─── Stats row (overlaid at bottom of art) ───────── */}
        <div className="absolute bottom-1 left-0 right-0 z-10 mx-3 rounded-md bg-black/30 px-2 py-1 text-xs backdrop-blur-sm pointer-events-none">
          <span className="text-gray-400">
            ATK <span className="font-bold text-red-400">{character.currentAtaque}</span>
          </span>
          <span className="ml-4 text-gray-400">
            LENT <span className="font-bold text-blue-400">{character.currentLentitud}</span>
          </span>
        </div>
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
