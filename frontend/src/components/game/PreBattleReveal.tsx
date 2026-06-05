'use client';

import type { CharacterState, BattlefieldDef } from '@dbt-online/shared';
import { CHARACTER_DISPLAY } from '@/data/character-display';
import { getBattlefieldImageSrc, getCharacterIconSrc } from '@/lib/assets';
import { GameImage } from './GameImage';
import { HoloCard } from './HoloCard';

interface PreBattleRevealProps {
  battlefield: BattlefieldDef | null;
  playerCharacters: CharacterState[];
  opponentCharacters: CharacterState[];
  secondsRemaining: number | null;
  stage: 'reveal' | 'countdown' | 'fight' | null;
  playerName?: string;
  opponentName?: string;
}

/**
 * Full-screen fighting-game-style intro overlay.
 *
 * Stages:
 *  - reveal:   battlefield card shown, characters positioned, countdown at 5
 *  - countdown: big number overlay counts down 4, 3, 2, 1
 *  - fight:     "FIGHT!" splash, then fades out as game transitions to WAITING_FOR_ACTION
 */
export function PreBattleReveal({
  battlefield,
  playerCharacters,
  opponentCharacters,
  secondsRemaining,
  stage,
  playerName = 'Tú',
  opponentName = 'Rival',
}: PreBattleRevealProps) {
  const showCountdown =
    stage === 'countdown' &&
    secondsRemaining !== null &&
    secondsRemaining > 0 &&
    secondsRemaining <= 5;

  const showFight = stage === 'fight' || secondsRemaining === 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gradient-to-b from-gray-950 via-[#0d0d1a] to-gray-950 animate-fade-in">
      <div className="relative flex w-full max-w-5xl items-center justify-center gap-4 px-4">
        {/* ─── Left: J1 characters ──────────────────────────── */}
        <div className="flex flex-col gap-3">
          {opponentCharacters.map((char) => (
            <CharacterPortrait
              key={char.characterId}
              characterId={char.characterId}
              side="left"
            />
          ))}
        </div>

        {/* ─── Center: battlefield card + effect ───────────── */}
        <div className="flex flex-col items-center gap-4">
          {/* Battlefield card */}
          <div className="relative aspect-[3/4] w-64 sm:w-72">
            <HoloCard className="h-full w-full rounded-2xl shadow-2xl shadow-yellow-900/30">
              <GameImage
                src={battlefield ? getBattlefieldImageSrc(battlefield.id) : ''}
                alt={battlefield?.name ?? 'Battlefield'}
                className="h-full w-full rounded-2xl object-cover"
                fallback={
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-yellow-950/60 to-amber-900/40 rounded-2xl">
                    <span className="text-6xl">{battlefield?.icon || '🗺️'}</span>
                  </div>
                }
              />
            </HoloCard>

            {/* VS badge between sides */}
            <div className="absolute -left-4 -right-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
              <span className="rounded-full bg-gradient-to-br from-red-600 to-orange-500 px-4 py-1.5 text-sm font-black tracking-widest text-white shadow-lg shadow-red-900/50">
                VS
              </span>
            </div>
          </div>

          {/* Effect description */}
          {battlefield && (
            <p className="max-w-xs text-center text-sm text-yellow-400/80 italic leading-relaxed">
              {battlefield.description}
            </p>
          )}
        </div>

        {/* ─── Right: J2 characters ─────────────────────────── */}
        <div className="flex flex-col gap-3">
          {playerCharacters.map((char) => (
            <CharacterPortrait
              key={char.characterId}
              characterId={char.characterId}
              side="right"
            />
          ))}
        </div>
      </div>

      {/* ─── Big countdown number overlay ──────────────────── */}
      {showCountdown && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <span
            key={secondsRemaining}
            className="animate-countdown-pop text-9xl font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.5)]"
          >
            {secondsRemaining}
          </span>
        </div>
      )}

      {/* ─── FIGHT! splash ─────────────────────────────────── */}
      {showFight && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none animate-fight-flash">
          <span className="text-8xl font-black tracking-[0.15em] text-red-500 drop-shadow-[0_0_60px_rgba(239,68,68,0.7)]">
            FIGHT!
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Small character portrait for the sides ─────────────────────

function CharacterPortrait({
  characterId,
  side,
}: {
  characterId: string;
  side: 'left' | 'right';
}) {
  const display = CHARACTER_DISPLAY[characterId];

  return (
    <div
      className={`flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 backdrop-blur-sm ${
        side === 'left' ? 'flex-row' : 'flex-row-reverse'
      }`}
    >
      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-800">
        <GameImage
          src={getCharacterIconSrc(characterId)}
          alt={characterId}
          className="h-full w-full object-contain"
          fallback={
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-lg text-gray-500">?</span>
            </div>
          }
        />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-gray-200 leading-tight">
          {display?.displayName || characterId}
        </span>
        <span className="text-[10px] text-gray-500">
          {display?.type || ''}
        </span>
      </div>
    </div>
  );
}
