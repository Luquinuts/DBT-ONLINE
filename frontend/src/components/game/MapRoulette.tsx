'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getBattlefieldImageSrc } from '@/lib/assets';
import type { BattlefieldDef } from '@dbt-online/shared';

/**
 * All battlefield IDs and display names for the roulette.
 * Matches the images in public/images/battlefields/ and backend data.
 */
const ALL_BATTLEFIELDS: { id: string; name: string }[] = [
  { id: 'hyperbolic-time-chamber', name: 'Hyperbolic Time Chamber' },
  { id: 'namek', name: 'Namek' },
  { id: 'tenkaichi-budokai', name: 'Tenkaichi Budokai' },
  { id: 'power-tournament', name: 'Power Tournament' },
  { id: 'north-kaio-planet', name: 'North Kaio Planet' },
  { id: 'capsule-corp', name: 'Capsule Corp' },
  { id: 'cell-games', name: 'Cell Games' },
  { id: 'beerus-planet', name: 'Beerus Planet' },
  { id: 'kamehouse', name: 'Kamehouse' },
  { id: 'destroyed-namek', name: 'Destroyed Namek' },
];

interface Props {
  /** The actual battlefield selected by the backend (may be null while loading) */
  selectedBattlefield: BattlefieldDef | null;
  /** Called when the roulette has finished and revealed the battlefield */
  onComplete: () => void;
}

type RouletteState = 'spinning' | 'decelerating' | 'revealed';

export function MapRoulette({ selectedBattlefield, onComplete }: Props) {
  const [phase, setPhase] = useState<RouletteState>('spinning');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine which battlefield is the actual one
  const actualBfId = selectedBattlefield?.id ?? null;
  const actualBfName = selectedBattlefield?.name ?? null;
  const actualIndex = actualBfId
    ? ALL_BATTLEFIELDS.findIndex((b) => b.id === actualBfId)
    : -1;

  // ─── Cycle through battlefields while spinning ──────────
  useEffect(() => {
    if (phase !== 'spinning') return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ALL_BATTLEFIELDS.length);
    }, 120);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  // ─── Handle deceleration: slow down to target ───────────
  const decelerateToTarget = useCallback(() => {
    if (phase !== 'spinning') return;
    setPhase('decelerating');

    // If the actual battlefield is known, stop there
    // Otherwise stop at current position and reveal when data arrives
    if (actualIndex >= 0) {
      setTargetIndex(actualIndex);
    } else {
      // Keep current index as target, will update when backend sends data
      setTargetIndex(currentIndex);
    }
  }, [phase, actualIndex, currentIndex]);

  // ─── When decelerating, animate to target ───────────────
  useEffect(() => {
    if (phase !== 'decelerating') return;
    if (targetIndex === null) return;

    // Clear the cycling interval
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Animate: fast steps slowing down to the target
    let steps = 0;
    const maxSteps = 20 + Math.abs(targetIndex - currentIndex);
    const animateStep = () => {
      setCurrentIndex((prev) => {
        // Determine direction (shortest path)
        const diff = targetIndex - prev;
        const absDiff = Math.abs(diff);
        const wrappedDiff =
          absDiff <= ALL_BATTLEFIELDS.length / 2
            ? diff
            : diff > 0
              ? diff - ALL_BATTLEFIELDS.length
              : diff + ALL_BATTLEFIELDS.length;

        if (absDiff === 0 || (steps >= 12 && absDiff <= 2)) {
          // Arrived at target
          setPhase('revealed');
          return targetIndex;
        }

        steps++;
        // Move toward target
        return (prev + Math.sign(wrappedDiff) + ALL_BATTLEFIELDS.length) % ALL_BATTLEFIELDS.length;
      });
    };

    // Progressive slowdown: start fast, end slow
    let delay = 60;
    const doStep = () => {
      if (phase !== 'decelerating') return;
      animateStep();
      delay = Math.min(delay + 25, 250);
      if (phase === 'decelerating') {
        revealTimeoutRef.current = setTimeout(doStep, delay);
      }
    };
    doStep();

    return () => {
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, targetIndex]);

  // ─── After revealing, wait and auto-complete ────────────
  useEffect(() => {
    if (phase !== 'revealed') return;
    // Wait a moment for the player to see the result, then auto-complete
    const t = setTimeout(onComplete, 2500);
    return () => clearTimeout(t);
  }, [phase, onComplete]);

  // ─── Cleanup on unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    };
  }, []);

  const currentBf = ALL_BATTLEFIELDS[currentIndex];
  const isRevealed = phase === 'revealed';
  const displayName = isRevealed
    ? actualBfName || currentBf.name
    : currentBf.name;
  const displayId = isRevealed
    ? actualBfId || currentBf.id
    : currentBf.id;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95">
      {/* Scanlines overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.08) 4px)',
        }}
      />

      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 opacity-20 bg-gradient-to-b from-yellow-600/30 via-transparent to-red-600/30" />

      {/* Header */}
      <h2
        className={`relative z-10 mb-8 text-4xl md:text-6xl font-black uppercase tracking-widest drop-shadow-[0_0_20px_rgba(251,191,36,0.6)] transition-all ${
          isRevealed
            ? 'text-green-400 drop-shadow-[0_0_30px_rgba(74,222,128,0.8)]'
            : 'text-yellow-400'
        }`}
      >
        {isRevealed ? '¡ESCENARIO ELEGIDO!' : 'ELEGIR ESCENARIO'}
      </h2>

      {/* Roulette window */}
      <div className="relative z-10 mb-6 w-72 h-48 md:w-96 md:h-64 overflow-hidden rounded-xl border-2 border-yellow-500/40 bg-slate-900 shadow-[0_0_40px_rgba(0,0,0,0.9)]">
        {/* Decorative top/bottom borders */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 h-8 bg-gradient-to-b from-black/80 to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-8 bg-gradient-to-t from-black/80 to-transparent" />

        {/* Center indicator line */}
        <div
          className={`pointer-events-none absolute left-0 right-0 top-1/2 z-10 h-0.5 -translate-y-1/2 transition-all duration-500 ${
            isRevealed ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]' : 'bg-yellow-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]'
          }`}
        />

        {/* Current battlefield */}
        <img
          key={displayId + (isRevealed ? '-revealed' : '')}
          src={getBattlefieldImageSrc(displayId)}
          alt={displayName}
          className={`h-full w-full object-cover transition-all duration-300 ${
            isRevealed ? 'scale-105 brightness-110' : ''
          }`}
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            t.style.display = 'none';
          }}
        />

        {/* Gradient overlay at bottom for readability */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 pt-12">
          <p
            className={`text-center font-black uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-all ${
              isRevealed ? 'text-2xl md:text-3xl text-green-400' : 'text-base md:text-lg text-white'
            }`}
          >
            {displayName}
          </p>
          {isRevealed && selectedBattlefield?.description && (
            <p className="mt-1 text-center text-xs text-gray-400 italic">
              {selectedBattlefield.description}
            </p>
          )}
        </div>
      </div>

      {/* Action */}
      {phase === 'spinning' && (
        <button
          onClick={decelerateToTarget}
          className="relative z-10 mt-4 px-10 py-4 bg-gradient-to-b from-yellow-600 to-yellow-800 text-white font-black text-xl uppercase tracking-widest rounded-lg transition-all transform hover:scale-110 hover:from-yellow-500 hover:to-yellow-700 shadow-[0_0_30px_rgba(251,191,36,0.4)]"
        >
          ⬇ DETENER ⬇
        </button>
      )}

      {phase === 'decelerating' && (
        <p className="relative z-10 mt-4 text-yellow-400 font-bold tracking-widest animate-pulse">
          SELECCIONANDO...
        </p>
      )}

      {phase === 'revealed' && (
        <p className="relative z-10 mt-4 text-green-400 font-bold tracking-widest">
          PREPARANDO COMBATE...
        </p>
      )}
    </div>
  );
}
