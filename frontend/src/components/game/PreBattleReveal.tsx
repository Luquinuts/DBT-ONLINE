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
  stage: 'reveal' | 'countdown' | 'fight' | 'ban' | null;
  playerName?: string;
  opponentName?: string;
  bannedCharacters?: string[];
  pendingBan?: { playerIndexes: number[] } | null;
  playerIndex?: number;
  onBanCharacter?: (characterId: string) => void;
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
  bannedCharacters,
  pendingBan,
  playerIndex,
  onBanCharacter,
}: PreBattleRevealProps) {
  const showCountdown =
    stage === 'countdown' &&
    secondsRemaining !== null &&
    secondsRemaining > 0 &&
    secondsRemaining <= 5;

  const showFight = stage === 'fight' || secondsRemaining === 0;

  const showBanStage = stage === 'ban';

  // The player has already submitted a ban if their playerIndex appears in pendingBan
  const hasSubmittedBan =
    showBanStage &&
    pendingBan != null &&
    playerIndex != null &&
    pendingBan.playerIndexes.includes(playerIndex);

  // If the opponent has submitted a ban, find which of their characters was banned
  const opponentBannedCharId =
    showBanStage && bannedCharacters
      ? opponentCharacters.find((c) => bannedCharacters.includes(c.characterId))
      : undefined;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gradient-to-b from-gray-950 via-[#0d0d1a] to-gray-950 animate-fade-in">
      <div className="relative flex w-full max-w-5xl flex-col items-center justify-center gap-4 px-4">
        {showBanStage ? (
          /* ─── BAN STAGE ─────────────────────────────────────── */
          <>
            {/* Top: battlefield card */}
            <div className="flex items-center justify-center gap-4">
              <div className="relative aspect-[3/4] w-48 sm:w-56">
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
              </div>
            </div>

            {/* Ban instructions */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-yellow-400">
                {hasSubmittedBan
                  ? 'Esperando al oponente...'
                  : 'Elige un personaje para inhabilitar'}
              </h2>
              {battlefield && (
                <p className="mt-1 text-sm text-yellow-400/60 italic">
                  {battlefield.description}
                </p>
              )}
            </div>

            {/* Selectable character cards */}
            <div className="flex flex-wrap justify-center gap-3">
              {playerCharacters.map((char) => {
                const display = CHARACTER_DISPLAY[char.characterId];
                const isBanned = !char.isAlive;
                const isLastAlive =
                  playerCharacters.filter((c) => c.isAlive).length <= 1 && char.isAlive;
                const canSelect =
                  !hasSubmittedBan && !isBanned && !isLastAlive;

                return (
                  <BanCharacterCard
                    key={char.characterId}
                    characterId={char.characterId}
                    displayName={display?.displayName || char.characterId}
                    color={display?.color || '#6b7280'}
                    isBanned={isBanned}
                    isLastAlive={isLastAlive}
                    disabled={!canSelect}
                    onSelect={canSelect ? () => onBanCharacter?.(char.characterId) : undefined}
                  />
                );
              })}
            </div>

            {/* Opponent ban info */}
            {opponentBannedCharId && (
              <div className="mt-2 text-center text-sm text-red-400">
                <span className="font-semibold">{opponentName}</span> inhabilitó a{' '}
                <span className="font-semibold">
                  {CHARACTER_DISPLAY[opponentBannedCharId.characterId]?.displayName ||
                    opponentBannedCharId.characterId}
                </span>
              </div>
            )}
          </>
        ) : (
          /* ─── REVEAL / COUNTDOWN / FIGHT ────────────────────── */
          <>
            {/* Left: player (host) characters */}
            <div className="flex flex-row items-center justify-center gap-4 sm:gap-6">
              <CharacterRoster
                characters={playerCharacters}
                label={playerName}
                side="left"
              />

              {/* Center: battlefield card + effect */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative aspect-[3/4] w-48 sm:w-56">
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

                  {/* VS badge */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="rounded-full bg-gradient-to-br from-red-600 to-orange-500 px-4 py-1.5 text-sm font-black tracking-widest text-white shadow-lg shadow-red-900/50">
                      VS
                    </span>
                  </div>
                </div>

                {battlefield && (
                  <p className="max-w-[240px] text-center text-xs text-yellow-400/80 italic leading-relaxed">
                    {battlefield.description}
                  </p>
                )}
              </div>

              {/* Right: opponent characters */}
              <CharacterRoster
                characters={opponentCharacters}
                label={opponentName}
                side="right"
              />
            </div>
          </>
        )}
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

// ─── Selectable ban character card ──────────────────────────────

function BanCharacterCard({
  characterId,
  displayName,
  color,
  isBanned,
  isLastAlive,
  disabled,
  onSelect,
}: {
  characterId: string;
  displayName: string;
  color: string;
  isBanned: boolean;
  isLastAlive: boolean;
  disabled: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`
        relative flex h-28 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 p-2
        transition-all duration-200
        ${disabled
          ? 'cursor-not-allowed opacity-50 grayscale'
          : 'cursor-pointer hover:scale-105 hover:border-yellow-400 hover:shadow-lg hover:shadow-yellow-400/20'
        }
        ${isBanned
          ? 'border-red-500/40 bg-red-950/20'
          : isLastAlive
            ? 'border-gray-700/30 bg-gray-900/40'
            : 'border-gray-600/30 bg-gray-800/40 hover:bg-gray-700/50'
        }
      `}
    >
      {/* Character icon */}
      <div className="h-10 w-10 overflow-hidden rounded-lg bg-gray-800">
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

      {/* Name */}
      <span className="text-xs font-semibold text-gray-200 leading-tight text-center line-clamp-2">
        {displayName}
      </span>

      {/* Status badge */}
      <div className="absolute top-1 right-1">
        {isBanned && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow">
            ✕
          </span>
        )}
        {isLastAlive && !isBanned && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-600 text-[10px] font-bold text-white shadow" title="Último personaje vivo">
            ★
          </span>
        )}
      </div>

      {/* Click hint for selectable cards */}
      {!disabled && !isBanned && (
        <span className="text-[10px] text-yellow-500/70">Elegir</span>
      )}
    </button>
  );
}

// ─── Character roster: big icons left/right ─────────────────────

function CharacterRoster({
  characters,
  label,
  side,
}: {
  characters: CharacterState[];
  label: string;
  side: 'left' | 'right';
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
        {label}
      </span>
      <div className="flex flex-col gap-2">
        {characters.map((char) => (
          <CharacterIcon
            key={char.characterId}
            characterId={char.characterId}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Big character icon (arcade-style) ──────────────────────────

function CharacterIcon({ characterId }: { characterId: string }) {
  const display = CHARACTER_DISPLAY[characterId];

  return (
    <div className="group relative h-20 w-20 overflow-hidden rounded-xl bg-gray-900/60 ring-1 ring-white/10 transition-all duration-200 hover:ring-yellow-500/40 sm:h-24 sm:w-24">
      <GameImage
        src={getCharacterIconSrc(characterId)}
        alt={characterId}
        className="h-full w-full scale-110 object-contain transition-transform duration-300 group-hover:scale-125"
        fallback={
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-2xl text-gray-600">?</span>
          </div>
        }
      />
      {display && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1">
          <p className="truncate text-center text-[10px] font-semibold text-white/90 leading-tight">
            {display.displayName}
          </p>
        </div>
      )}
    </div>
  );
}
