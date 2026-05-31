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
  showActions: boolean;
  onClick?: () => void;
  onAbility?: () => void;
  onDefinitiva?: () => void;
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
  showActions,
  onClick,
  onAbility,
  onDefinitiva,
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
        bg-gradient-to-b from-black/20 to-black/40
        backdrop-blur-sm
        transition-all duration-200 select-none
        ${borderClass}
        ${!isDead && onClick ? 'hover:scale-[1.03]' : ''}
        ${isDefending ? 'ring-2 ring-yellow-400/60' : ''}
      `}
      style={{ backgroundColor: charDef.color + '20' }}
    >
      {/* ─── Character art background ─────────────────────── */}
      <GameImage
        src={getCharacterImageSrc(character.characterId)}
        alt={charDef.displayName}
        className="absolute inset-0 w-full h-full object-cover opacity-60"
        fallback={null}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 pointer-events-none" />

      {/* ─── Dead overlay ─────────────────────────────────── */}
      {isDead && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
          <div className="text-center">
            <span className="text-4xl">💀</span>
            <p className="text-[10px] text-gray-400 mt-1">DERRIBADO</p>
          </div>
        </div>
      )}

      {/* ─── Name + Type badge ─────────────────────────────── */}
      <div className="flex items-start justify-between gap-1 px-3 pt-2.5 pb-1">
        <span className="text-sm font-bold text-white truncate drop-shadow-sm">
          {charDef.displayName}
        </span>
        <span
          className={`shrink-0 rounded-md ${typeStyle.badge} px-1.5 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm`}
        >
          {charDef.type}
        </span>
      </div>

      {/* ─── HP Bar ────────────────────────────────────────── */}
      <div className="px-3 pb-1">
        <HpBar current={character.currentVida} max={character.maxVida} animated />
      </div>

      {/* ─── Stats row ──────────────────────────────────────── */}
      <div className="mx-3 flex justify-between rounded-md bg-black/20 px-2 py-1 text-xs border border-white/5">
        <span className="text-gray-400">
          ATK <span className="font-bold text-red-400">{character.currentAtaque}</span>
        </span>
        <span className="text-gray-400">
          LENT <span className="font-bold text-blue-400">{character.currentLentitud}</span>
        </span>
      </div>

      {/* ─── Advance counter (progress bar) ─────────────────── */}
      <div className="px-3 pt-1">
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

      {/* ─── Ability / Definitiva buttons ──────────────────── */}
      {showActions && !isDead && (
        <div className="flex gap-1.5 px-3 py-1.5 mt-0.5 border-t border-white/10">
          {onAbility && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAbility(); }}
              className="flex-1 rounded-md bg-blue-600/50 px-2 py-1 text-[10px] font-semibold text-white
                         transition hover:bg-blue-500/70 active:scale-95"
            >
              ⚡ HAB
            </button>
          )}
          {onDefinitiva && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDefinitiva(); }}
              className="flex-1 rounded-md bg-purple-600/50 px-2 py-1 text-[10px] font-semibold text-white
                         transition hover:bg-purple-500/70 active:scale-95"
            >
              💥 DEF
            </button>
          )}
        </div>
      )}

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
