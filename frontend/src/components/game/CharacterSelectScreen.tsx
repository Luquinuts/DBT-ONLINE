'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import type { GameUIState } from '@/lib/gameReducer';
import type { UseGameReturn } from '@/lib/useGame';
import { CHARACTER_DISPLAY, type CharacterDisplayEntry } from '@/data/character-display';
import { getCharacterIconSrc, getCharacterFullImageSrc } from '@/lib/assets';
import { MapRoulette } from './MapRoulette';

interface Props {
  state: GameUIState;
  actions: UseGameReturn['actions'];
  playerName: string;
  opponentName: string;
}

type TeamSide = 'j1' | 'j2';
type LocalPhase = 'selecting' | 'placing' | 'ready' | 'map';

interface PreviewState {
  characterId: string | null;
  skinIndex: number;
}

const SKIN_PLACEHOLDER: Record<string, { name: string }[]> = {};

// Build a minimal skin entry for each character using display data
function getSkins(charId: string): { name: string }[] {
  if (SKIN_PLACEHOLDER[charId]) return SKIN_PLACEHOLDER[charId];
  SKIN_PLACEHOLDER[charId] = [{ name: CHARACTER_DISPLAY[charId]?.displayName || charId }];
  return SKIN_PLACEHOLDER[charId];
}

export function CharacterSelectScreen({ state, actions, playerName, opponentName }: Props) {
  const { draftAvailable, draftPicks, currentPicker, playerIndex, draftPhase } = state;

  const mySide: TeamSide = playerIndex === 0 ? 'j1' : 'j2';
  const opponentSide: TeamSide = playerIndex === 0 ? 'j2' : 'j1';
  const isMyTurn = currentPicker === playerIndex;

  const [localPhase, setLocalPhase] = useState<LocalPhase>('selecting');
  const [mapRevealed, setMapRevealed] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({ characterId: null, skinIndex: 0 });

  const myPicks = draftPicks[playerIndex] || [];
  const opponentPicks = draftPicks[1 - playerIndex] || [];
  const totalPicks = myPicks.length + opponentPicks.length;
  const isDone = draftPhase === 'DONE' || draftPhase === 'PLACING' || totalPicks >= 6;

  // ─── Auto-place when PLACING phase hits ───────────────
  useEffect(() => {
    if (draftPhase === 'PLACING' && myPicks.length === 3 && localPhase === 'selecting') {
      setLocalPhase('placing');
      // Auto-place in the order they were picked
      actions.placeCharacters([...myPicks]);
    }
  }, [draftPhase, myPicks, actions, localPhase]);

  // ─── Show ready overlay when all done ─────────────────
  useEffect(() => {
    if (draftPhase === 'DONE' && localPhase !== 'map') {
      setLocalPhase('ready');
    }
  }, [draftPhase, localPhase]);

  // ─── Preview a character ──────────────────────────────
  const handlePreview = useCallback((charId: string) => {
    if (isDone) return;
    // Only allow previewing available characters
    if (!draftAvailable.includes(charId)) return;

    setPreview({ characterId: charId, skinIndex: 0 });
  }, [draftAvailable, isDone]);

  // ─── Confirm selection ────────────────────────────────
  const handleConfirm = useCallback(() => {
    if (!preview.characterId || !isMyTurn || isDone) return;
    actions.draftSelect(preview.characterId);
    setPreview({ characterId: null, skinIndex: 0 });
  }, [preview.characterId, isMyTurn, isDone, actions]);

  // ─── Change skin (future) ─────────────────────────────
  const changeSkin = useCallback((direction: number) => {
    setPreview(prev => ({
      ...prev,
      skinIndex: Math.max(0, (prev.skinIndex + direction)),
    }));
  }, []);

  // ─── Get character type color ─────────────────────────
  const getTypeBorderColor = (charId: string): string => {
    const info = CHARACTER_DISPLAY[charId];
    if (!info) return 'border-slate-600';
    switch (info.type) {
      case 'TANQUE': return 'border-purple-500';
      case 'DAMAGE': return 'border-red-500';
      case 'SUPPORT': return 'border-blue-400';
      default: return 'border-slate-600';
    }
  };

  const getTypeLabel = (charId: string): string => {
    const info = CHARACTER_DISPLAY[charId];
    return info?.type || '???';
  };

  const getTypeColor = (charId: string): string => {
    const info = CHARACTER_DISPLAY[charId];
    if (!info) return 'text-slate-400';
    switch (info.type) {
      case 'TANQUE': return 'text-purple-400';
      case 'DAMAGE': return 'text-red-400';
      case 'SUPPORT': return 'text-blue-400';
      default: return 'text-slate-400';
    }
  };

  // ─── Roster helpers ───────────────────────────────────
  const isLocked = useCallback((charId: string): boolean => {
    return [...myPicks, ...opponentPicks].includes(charId);
  }, [myPicks, opponentPicks]);

  const isPreviewed = useCallback((charId: string): boolean => {
    return preview.characterId === charId;
  }, [preview.characterId]);

  // ─── Team slot images ─────────────────────────────────
  const charIconSrc = useCallback((charId: string): string => {
    return getCharacterIconSrc(charId);
  }, []);

  const charFullSrc = useCallback((charId: string): string => {
    return getCharacterFullImageSrc(charId);
  }, []);

  // ─── Memoized roster ──────────────────────────────────
  const rosterItems = useMemo(() => {
    const allIds = draftAvailable.concat(
      [...myPicks, ...opponentPicks].filter(
        (id, i, arr) => arr.indexOf(id) === i && !draftAvailable.includes(id)
      )
    );
    return allIds.map((charId) => ({
      charId,
      locked: [...myPicks, ...opponentPicks].includes(charId),
      previewed: preview.characterId === charId,
      name: CHARACTER_DISPLAY[charId]?.displayName || charId,
    }));
  }, [draftAvailable, myPicks, opponentPicks, preview.characterId]);

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-black">
      {/* Background pattern */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.08]"
        style={{
          backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      {/* Background glow for current player */}
      <div className="pointer-events-none absolute inset-0 z-0 flex opacity-30">
        <div
          className="w-1/2 bg-gradient-to-tr from-blue-600 to-transparent transition-all duration-500"
          style={{ opacity: isMyTurn ? 0.8 : 0.2 }}
        />
        <div
          className="w-1/2 bg-gradient-to-tl from-red-600 to-transparent transition-all duration-500"
          style={{ opacity: !isMyTurn ? 0.8 : 0.2 }}
        />
      </div>

      {/* ─── TURN INDICATOR ───────────────────────────── */}
      <div className="relative z-10 mb-4 mt-4 text-center">
        <h2
          className={`text-2xl font-black uppercase tracking-widest drop-shadow-[0_0_10px_var(--glow-color)] transition-colors ${
            isMyTurn
              ? 'text-blue-400 [--glow-color:rgba(59,130,246,0.8)]'
              : 'text-red-400 [--glow-color:rgba(239,68,68,0.8)]'
          }`}
        >
          {isDone ? (
            <span className="text-green-400 [--glow-color:rgba(74,222,128,0.8)]">
              ¡SELECCIÓN COMPLETADA!
            </span>
          ) : (
            `> TURNO DE ${isMyTurn ? playerName.toUpperCase() : opponentName.toUpperCase()} <`
          )}
        </h2>
      </div>

      {/* ─── MAIN CONTENT ──────────────────────────────── */}
      <div className="relative z-10 flex flex-1 flex-col md:flex-row gap-4 md:gap-8 px-4 md:px-8 pb-8">
        {/* J1 PANEL (left) OR J2 PANEL if player is J2 */}
        <PlayerPanel
          side={mySide}
          isActive={isMyTurn && !isDone}
          picks={myPicks}
          preview={mySide === 'j1' ? preview : { characterId: null, skinIndex: 0 }}
          onConfirm={handleConfirm}
          onChangeSkin={changeSkin}
          charFullSrc={charFullSrc}
          charIconSrc={charIconSrc}
          getTypeBorderColor={getTypeBorderColor}
          getTypeLabel={getTypeLabel}
          getTypeColor={getTypeColor}
          playerName={playerName}
          isMyPanel={true}
        />

        {/* ─── ROSTER GRID ───────────────────────────── */}
        <div className="flex items-center justify-center md:w-2/4">
          <div className="w-full bg-black/60 rounded-xl border border-yellow-500/20 p-4 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
            <div className="grid grid-cols-4 gap-2 md:gap-3 place-items-center">
              {rosterItems.map(({ charId, locked, previewed, name }) => (
                <button
                  key={charId}
                  onClick={() => !locked && handlePreview(charId)}
                  disabled={locked || isDone}
                  className={`
                    w-16 h-16 sm:w-20 sm:h-20 bg-slate-800 rounded shadow-md overflow-hidden
                    transition-all duration-100 cursor-pointer
                    ${locked
                      ? 'grayscale opacity-30 cursor-not-allowed pointer-events-none'
                      : previewed
                        ? 'scale-105 z-15 border-2 border-yellow-400 shadow-[0_0_20px_rgba(251,191,36,0.6)]'
                        : 'hover:scale-110 hover:z-20 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] hover:border-white border-2 border-transparent'
                    }
                  `}
                  title={name}
                >
                  <img
                    src={getCharacterIconSrc(charId)}
                    alt={name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* J2 PANEL (right) OR J1 PANEL if player is J2 */}
        <PlayerPanel
          side={opponentSide}
          isActive={!isMyTurn && !isDone}
          picks={opponentPicks}
          preview={opponentSide === 'j2' ? preview : { characterId: null, skinIndex: 0 }}
          onConfirm={handleConfirm}
          onChangeSkin={changeSkin}
          charFullSrc={charFullSrc}
          charIconSrc={charIconSrc}
          getTypeBorderColor={getTypeBorderColor}
          getTypeLabel={getTypeLabel}
          getTypeColor={getTypeColor}
          playerName={opponentName}
          isMyPanel={false}
        />
      </div>

      {/* ─── MAP ROULETTE ──────────────────────────────── */}
      {localPhase === 'ready' && !mapRevealed && (
        <MapRoulette
          selectedBattlefield={state.battlefield}
          onComplete={() => setMapRevealed(true)}
        />
      )}

      {/* ─── AWAITING RIVAL AFTER MAP REVEAL ───────────── */}
      {localPhase === 'ready' && mapRevealed && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90">
          <h1 className="text-4xl md:text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-600 uppercase mb-8 text-center">
            ¡PREPARATE!
          </h1>
          <p className="text-gray-400 text-lg animate-pulse">Esperando al rival...</p>
        </div>
      )}
    </div>
  );
}

// ─── Player Panel Component ──────────────────────────────────

interface PlayerPanelProps {
  side: TeamSide;
  isActive: boolean;
  picks: string[];
  preview: PreviewState;
  onConfirm: () => void;
  onChangeSkin: (direction: number) => void;
  charFullSrc: (charId: string) => string;
  charIconSrc: (charId: string) => string;
  getTypeBorderColor: (charId: string) => string;
  getTypeLabel: (charId: string) => string;
  getTypeColor: (charId: string) => string;
  playerName: string;
  isMyPanel: boolean;
}

const PlayerPanel = memo(function PlayerPanel({
  side,
  isActive,
  picks,
  preview,
  onConfirm,
  onChangeSkin,
  charFullSrc,
  charIconSrc,
  getTypeBorderColor,
  getTypeLabel,
  getTypeColor,
  playerName,
  isMyPanel,
}: PlayerPanelProps) {
  const borderColor = side === 'j1' ? 'border-blue-900/50' : 'border-red-900/50';
  const titleColor = side === 'j1' ? 'text-blue-400' : 'text-red-400';
  const slotBorder = side === 'j1' ? 'border-blue-500/30' : 'border-red-500/30';
  const previewBorder = side === 'j1' ? 'border-blue-500' : 'border-red-500';
  const confirmGradient = side === 'j1'
    ? 'from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)]'
    : 'from-red-700 to-red-500 hover:from-red-600 hover:to-red-400 shadow-[0_0_15px_rgba(239,68,68,0.6)]';
  const arrowColor = side === 'j1' ? 'text-blue-400' : 'text-red-400';
  const skinTextColor = side === 'j1' ? 'text-blue-200' : 'text-red-200';
  const title = isMyPanel ? `TÚ (${playerName})` : playerName;

  // Skew direction based on side
  const slotSkew = side === 'j1' ? '-skew-x-12' : 'skew-x-12';
  const unskew = side === 'j1' ? 'skew-x-12' : '-skew-x-12';

  return (
    <div className={`w-full md:w-1/4 flex flex-col items-center bg-black/40 border ${borderColor} rounded-xl p-4`}>
      <h3 className={`${titleColor} font-bold uppercase tracking-widest mb-2 text-sm`}>
        {title}
      </h3>

      {/* Team slots */}
      <div className="flex gap-2 mb-4 w-full justify-center h-16">
        {[0, 1, 2].map((i) => {
          const picked = picks[i];
          return (
            <div
              key={i}
              className={`w-16 h-16 bg-slate-800 rounded border ${slotBorder} overflow-hidden transform ${slotSkew} ${
                picked ? 'bg-black' : ''
              }`}
            >
              {picked ? (
                <div className={`w-[120%] h-full -ml-2 relative transform ${unskew}`}>
                  <img
                    src={charIconSrc(picked)}
                    alt={picked}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Preview panel */}
                  {preview.characterId ? (
        <div
          className={`flex flex-col items-center flex-1 w-full bg-slate-900/80 rounded-lg p-4 border-2 ${previewBorder} shadow-[0_0_15px_var(--shadow-color)] ${
            side === 'j1'
              ? '[--shadow-color:rgba(59,130,246,0.4)]'
              : '[--shadow-color:rgba(239,68,68,0.4)]'
          }`}
        >
          {/* Character image */}
          <div className="w-full flex-1 min-h-[200px] md:min-h-[280px] relative overflow-hidden mb-2 rounded border border-slate-600 bg-slate-800">
            <img
              key={preview.characterId + preview.skinIndex}
              src={charFullSrc(preview.characterId!)}
              alt={preview.characterId}
              className="w-full h-full object-cover object-top"
              loading="eager"
              fetchPriority="high"
              onError={(e) => {
                // Fallback: show icon instead
                const target = e.target as HTMLImageElement;
                target.style.objectFit = 'contain';
                target.style.padding = '20px';
                target.src = charIconSrc(preview.characterId!);
              }}
            />
          </div>

          {/* Name */}
          <h3 className="font-black text-xl text-white uppercase tracking-wider mb-1 text-center w-full truncate">
            {CHARACTER_DISPLAY[preview.characterId]?.displayName || preview.characterId}
          </h3>

          {/* Stats */}
          <div className="flex gap-4 text-sm font-bold mb-4">
            <span className="text-green-400">
              ♥ Vida: {CHARACTER_DISPLAY[preview.characterId]?.stats?.vida ?? '?'}
            </span>
            <span className="text-red-400">
              ⚔ Atq: {CHARACTER_DISPLAY[preview.characterId]?.stats?.ataque ?? '?'}
            </span>
          </div>

          {/* Type badge */}
          <span className={`text-xs font-bold uppercase tracking-widest mb-3 ${getTypeColor(preview.characterId!)}`}>
            [{getTypeLabel(preview.characterId!)}]
          </span>

          {/* Skin selector (future) */}
          <div className="flex items-center gap-2 mb-4 w-full justify-between bg-black/50 px-2 py-2 rounded">
            <button
              onClick={() => onChangeSkin(-1)}
              className={`${arrowColor} hover:text-white px-2 font-bold text-lg`}
            >
              ◀
            </button>
            <span className={`text-xs font-bold ${skinTextColor} uppercase tracking-widest text-center truncate`}>
              {getSkins(preview.characterId)[preview.skinIndex]?.name || 'Skin'}
            </span>
            <button
              onClick={() => onChangeSkin(1)}
              className={`${arrowColor} hover:text-white px-2 font-bold text-lg`}
            >
              ▶
            </button>
          </div>
          {/* Confirm button */}
          {isActive && (
            <button
              onClick={onConfirm}
              className={`mt-auto w-full py-3 bg-gradient-to-r ${confirmGradient} text-white font-black uppercase tracking-widest rounded transition-all transform hover:scale-105`}
            >
              Seleccionar
            </button>
          )}

          {!isActive && (
            <p className="text-xs text-gray-500 italic uppercase tracking-wider">
              Esperando tu turno...
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-1 w-full items-center justify-center bg-slate-900/40 rounded-lg border border-dashed border-slate-700">
          <p className="text-xs text-gray-600 uppercase tracking-wider text-center px-2">
            {picks.length > 0 ? 'Seleccioná un personaje del roster' : 'Esperando selección...'}
          </p>
        </div>
      )}
    </div>
  );
});
