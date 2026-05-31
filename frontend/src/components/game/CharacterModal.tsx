'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CharacterState, GamePhase } from '@dbt-online/shared';
import { CHARACTER_DISPLAY, CHARACTERS_WITH_HABILIDAD } from '@/data/character-display';
import { getCharacterImageSrc } from '@/lib/assets';
import { GameImage } from './GameImage';

interface CharacterModalProps {
  character: CharacterState;
  playerKi: number;
  phase: GamePhase;
  isMyTurn: boolean;
  onAdvance: () => void;
  onAbility: () => void;
  onDefinitiva: () => void;
  onClose: () => void;
}

const TYPE_STYLES: Record<string, { badge: string; accent: string }> = {
  TANQUE: { badge: 'bg-violet-700', accent: 'border-violet-500' },
  DAMAGE: { badge: 'bg-red-700', accent: 'border-red-500' },
  SUPPORT: { badge: 'bg-sky-700', accent: 'border-sky-500' },
};

export function CharacterModal({
  character,
  playerKi,
  phase,
  isMyTurn,
  onAdvance,
  onAbility,
  onDefinitiva,
  onClose,
}: CharacterModalProps) {
  const charDef = CHARACTER_DISPLAY[character.characterId];
  const hasHabilidad = CHARACTERS_WITH_HABILIDAD.has(character.characterId);
  const hasDefinitiva = charDef?.abilities?.definitiva;
  const canAdvance = character.advanceCounter < character.currentLentitud;

  // ─── Disabled state computations ────────────────────────────
  const defKiCost = hasDefinitiva?.kiCost ?? Infinity;
  const isDefDisabled = playerKi < defKiCost;
  const isHabDisabled = character.abilityCooldownRemaining > 0;

  // ─── Close on Escape key ────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // ─── Prevent body scroll ────────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ─── Fallback if character definition not found ─────────────
  if (!charDef) {
    return createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        onClick={onClose}
      >
        <div
          className="rounded-lg bg-gray-800 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-gray-400">Personaje desconocido</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 transition"
          >
            Cerrar
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  const typeStyle = TYPE_STYLES[charDef.type] || TYPE_STYLES.DAMAGE;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* ─── Modal content ──────────────────────────────────── */}
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-gray-700/50 bg-gray-900/95 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Large character image ───────────────────────── */}
        <div
          className="relative h-48 overflow-hidden"
          style={{ backgroundColor: charDef.color + '20' }}
        >
          <GameImage
            src={getCharacterImageSrc(character.characterId)}
            alt={charDef.displayName}
            className="absolute inset-0 w-full h-full object-cover"
            fallback={
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-4xl">?</span>
              </div>
            }
          />

          {/* Name + type badge */}
          <div className="absolute top-0 left-0 right-0 flex items-start justify-between gap-1 px-4 pt-3 pb-1 pointer-events-none">
            <span className="text-lg font-bold text-white drop-shadow-sm">
              {charDef.displayName}
            </span>
            <span
              className={`shrink-0 rounded-md ${typeStyle.badge} px-2 py-0.5 text-xs font-bold uppercase text-white shadow-sm`}
            >
              {charDef.type}
            </span>
          </div>
        </div>

        {/* ─── Stats row ────────────────────────────────────── */}
        <div className="flex justify-center gap-6 border-b border-gray-700/30 px-4 py-3">
          <span className="text-sm text-gray-400">
            ATK{' '}
            <span className="font-bold text-red-400">{character.currentAtaque}</span>
          </span>
          <span className="text-sm text-gray-400">
            LENT{' '}
            <span className="font-bold text-blue-400">{character.currentLentitud}</span>
          </span>
          <span className="text-sm text-gray-400">
            KI{' '}
            <span className="font-bold text-yellow-400">{playerKi}</span>
          </span>
        </div>

        {/* ─── Action buttons ───────────────────────────────── */}
        <div className="flex flex-col gap-2 p-4">
          {/* Avanzar — only in ADVANCE phase when not at max advance */}
          {phase === 'ADVANCE' && canAdvance && (
            <button
              type="button"
              onClick={onAdvance}
              className="w-full rounded-xl border border-green-500/30 bg-green-600/70 px-4 py-3 text-sm font-semibold text-white transition active:scale-95 hover:bg-green-500/80"
            >
              ▶ Avanzar ({character.advanceCounter}/{character.currentLentitud})
            </button>
          )}

          {/* Habilidad — only if character has one */}
          {hasHabilidad && (
            <button
              type="button"
              disabled={isHabDisabled}
              onClick={onAbility}
              className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold transition active:scale-95 ${
                isHabDisabled
                  ? 'cursor-not-allowed border-gray-700/30 bg-gray-800/50 text-gray-600'
                  : 'border-blue-500/30 bg-blue-600/70 text-white hover:bg-blue-500/80'
              }`}
            >
              ⚡ HAB
              {isHabDisabled && ` (enfriamiento: ${character.abilityCooldownRemaining})`}
            </button>
          )}

          {/* Definitiva — only if character has one */}
          {hasDefinitiva && (
            <button
              type="button"
              disabled={isDefDisabled}
              onClick={onDefinitiva}
              className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold transition active:scale-95 ${
                isDefDisabled
                  ? 'cursor-not-allowed border-gray-700/30 bg-gray-800/50 text-gray-600'
                  : 'border-purple-500/30 bg-purple-600/70 text-white hover:bg-purple-500/80'
              }`}
            >
              💥 DEF ({defKiCost} KI)
              {isDefDisabled && ` (necesitas ${defKiCost})`}
            </button>
          )}

          {/* Cancel / close */}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-gray-700/30 bg-gray-800/70 px-4 py-2.5 text-sm text-gray-400 transition active:scale-95 hover:bg-gray-700/70 hover:text-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
