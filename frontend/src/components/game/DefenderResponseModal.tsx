'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { PendingAttack, CharacterState } from '@dbt-online/shared';
import { CHARACTER_DISPLAY } from '@/data/character-display';

interface DefenderResponseModalProps {
  pendingAttack: PendingAttack | null;
  playerHand: string[];
  defenderCharacters: CharacterState[];
  isVisible: boolean;
  onRespond: (action: 'ESQUIVE' | 'ESCUDO' | 'NONE', characterId: string, cardId?: string) => void;
  onUseAbility: (characterId: string) => void;
}

const TIMEOUT_SECONDS = 10;

export function DefenderResponseModal({
  pendingAttack,
  playerHand,
  defenderCharacters,
  isVisible,
  onRespond,
  onUseAbility,
}: DefenderResponseModalProps) {
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_SECONDS);
  const responded = useRef(false);

  // Reset and start countdown when modal opens
  useEffect(() => {
    if (!isVisible || !pendingAttack) return;
    responded.current = false;
    setTimeLeft(TIMEOUT_SECONDS);

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    const timeout = setTimeout(() => {
      if (!responded.current) {
        responded.current = true;
        onRespond('NONE', pendingAttack.targetId);
      }
    }, TIMEOUT_SECONDS * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isVisible, pendingAttack, onRespond]);

  const handleRespond = useCallback(
    (action: 'ESQUIVE' | 'ESCUDO' | 'NONE', charId: string, cardId?: string) => {
      if (responded.current) return;
      responded.current = true;
      onRespond(action, charId, cardId);
    },
    [onRespond],
  );

  const handleUseAbility = useCallback(
    (charId: string) => {
      if (responded.current) return;
      responded.current = true;
      onUseAbility(charId);
    },
    [onUseAbility],
  );

  if (!isVisible || !pendingAttack) return null;

  const { attackerId, targetId, damage, attackType, isUltimate } = pendingAttack;

  // Find target defender character
  const targetChar = defenderCharacters.find((c) => c.characterId === targetId);
  const targetDisplay = CHARACTER_DISPLAY[targetId];

  // Attacker display (from static data, we don't have runtime state for opponent here)
  const attackerDisplay = CHARACTER_DISPLAY[attackerId];

  // Check esquive availability — cards are created as esquive_1, esquive_2, etc.
  const esquiveCardId = playerHand.find((id) => id.startsWith('esquive'));
  const hasEsquiveCard = !!esquiveCardId;
  const isDefinitiva = attackType === 'DEFINITIVA';
  const canEsquive = hasEsquiveCard && !isDefinitiva;

  // Check shield — either already equipped or a shield card in hand to play
  const shieldCardId = playerHand.find((id) => id.startsWith('escudo'));
  const hasShieldEquipped = targetChar?.shieldEquipped ?? false;
  const canUseShield = hasShieldEquipped || !!shieldCardId;

  // Button state descriptions
  let esquiveLabel = 'ESQUIVE';
  let esquiveDisabled = false;
  if (isDefinitiva) {
    esquiveLabel = 'No se puede esquivar definitivas';
    esquiveDisabled = true;
  } else if (isUltimate && hasEsquiveCard) {
    esquiveLabel = 'ULTIMATE — Esquive solo bloquea 1';
    esquiveDisabled = false;
  } else if (!hasEsquiveCard) {
    esquiveLabel = 'No tienes Esquive';
    esquiveDisabled = true;
  }

  const timerPercent = (timeLeft / TIMEOUT_SECONDS) * 100;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-gray-700/50 bg-gray-900/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* ─── Header ─────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-red-900/40 to-orange-900/40 px-6 py-4 border-b border-gray-700/30">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">¡Ataque entrante!</h2>
            <span className="rounded-full bg-red-600/80 px-3 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
              {attackType}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Elegí cómo responder al ataque
          </p>
        </div>

        {/* ─── Content ────────────────────────────────────── */}
        <div className="p-6 space-y-5">
          {/* Attacker → Target cards */}
          <div className="flex items-center justify-center gap-4">
            {/* Attacker card */}
            <div className="flex flex-col items-center flex-1">
              <div
                className="w-full rounded-xl border-2 border-red-500/30 bg-gradient-to-b from-red-900/30 to-black/30 p-3 text-center"
                style={{ borderColor: attackerDisplay?.color + '60' }}
              >
                <p className="text-sm font-bold text-white truncate">
                  {attackerDisplay?.displayName || attackerId}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {attackerDisplay?.type || ''}
                </p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="text-lg">⚔️</span>
                  <span className="text-xl font-bold text-red-400">{damage}</span>
                </div>
              </div>
            </div>

            {/* VS */}
            <div className="shrink-0">
              <span className="text-2xl font-black text-gray-600">VS</span>
            </div>

            {/* Defender card */}
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-full rounded-xl border-2 p-3 text-center bg-gradient-to-b from-blue-900/30 to-black/30 ${
                  targetChar?.isAlive === false
                    ? 'border-gray-700 opacity-50'
                    : 'border-blue-500/30'
                }`}
              >
                <p className="text-sm font-bold text-white truncate">
                  {targetDisplay?.displayName || targetId}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {targetDisplay?.type || ''}
                </p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="text-lg">❤️</span>
                  <span className="text-lg font-bold text-green-400">
                    {targetChar?.currentVida ?? '?'}/{targetChar?.maxVida ?? '?'}
                  </span>
                </div>
                {hasShieldEquipped && (
                  <span className="mt-1 inline-block rounded bg-yellow-600/40 px-2 py-0.5 text-[10px] text-yellow-300">
                    🛡️ Escudo equipado
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Damage info */}
          <div className="rounded-lg bg-gray-800/50 px-4 py-2 text-center">
            <p className="text-sm text-gray-300">
              Daño: <span className="font-bold text-red-400">{damage}</span>
              {isUltimate && (
                <span className="ml-2 rounded bg-pink-600/40 px-2 py-0.5 text-[10px] text-pink-300">
                  ULTIMATE
                </span>
              )}
            </p>
          </div>

          {/* ─── Action Buttons ─────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {/* ESQUIVE */}
            <button
              type="button"
              disabled={esquiveDisabled}
              onClick={() => handleRespond('ESQUIVE', targetId, esquiveCardId)}
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-95 ${
                esquiveDisabled
                  ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed border border-gray-700/30'
                  : 'bg-sky-600/60 text-white border border-sky-500/30 hover:bg-sky-500/70 shadow-md'
              }`}
            >
              <span className="text-xl">💨</span>
              <span>{esquiveLabel}</span>
            </button>

            {/* ESCUDO */}
            <button
              type="button"
              disabled={!canUseShield}
              onClick={() => handleRespond('ESCUDO', targetId, shieldCardId)}
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-95 ${
                !canUseShield
                  ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed border border-gray-700/30'
                  : 'bg-indigo-600/60 text-white border border-indigo-500/30 hover:bg-indigo-500/70 shadow-md'
              }`}
            >
              <span className="text-xl">🛡️</span>
                <span>{hasShieldEquipped ? 'ESCUDO' : 'JUGAR ESCUDO'}</span>
            </button>

            {/* USE ABILITY */}
            <button
              type="button"
              onClick={() => handleUseAbility(targetId)}
              className="flex flex-col items-center gap-1 rounded-xl bg-amber-600/60 px-4 py-3 text-sm font-semibold text-white border border-amber-500/30 hover:bg-amber-500/70 transition active:scale-95 shadow-md"
            >
              <span className="text-xl">⚡</span>
              <span>USAR HABILIDAD</span>
            </button>

            {/* NONE (take the hit) */}
            <button
              type="button"
              onClick={() => handleRespond('NONE', targetId)}
              className="flex flex-col items-center gap-1 rounded-xl bg-red-700/60 px-4 py-3 text-sm font-semibold text-white border border-red-500/30 hover:bg-red-600/70 transition active:scale-95 shadow-md"
            >
              <span className="text-xl">💥</span>
              <span>RECIBIR DAÑO</span>
            </button>
          </div>
        </div>

        {/* ─── Countdown bar ──────────────────────────────── */}
        <div className="h-1.5 w-full bg-gray-800">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              timeLeft <= 3 ? 'bg-red-500' : timeLeft <= 5 ? 'bg-yellow-500' : 'bg-red-600'
            }`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
        <div className="px-6 py-2 text-center">
          <span className="text-xs text-gray-500">
            Respondiendo en {timeLeft}s...
          </span>
        </div>
      </div>
    </div>
  );
}
