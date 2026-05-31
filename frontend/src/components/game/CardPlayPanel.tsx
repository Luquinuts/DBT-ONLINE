'use client';

import { CARD_DISPLAY } from '@/data/card-display';
import { CHARACTER_DISPLAY } from '@/data/character-display';
import { getCardImageSrc } from '@/lib/assets';
import { GameImage } from './GameImage';

interface CardPlayPanelProps {
  cardId: string;
  phase: string;
  selectedCharacter: string | null;
  onPlay: () => void;
  onCancel: () => void;
}

export function CardPlayPanel({
  cardId,
  phase,
  selectedCharacter,
  onPlay,
  onCancel,
}: CardPlayPanelProps) {
  const cardInfo = CARD_DISPLAY[cardId];
  if (!cardInfo) return null;

  const needsTarget =
    cardInfo.type === 'ITEM' ||
    ['semilla_senzu', 'plus_vida', 'nube_kinton', 'baculo_sagrado', 'rage', 'esfera_dragon'].some((k) =>
      cardId.startsWith(k),
    );

  const targetCharDef = selectedCharacter
    ? CHARACTER_DISPLAY[selectedCharacter]
    : null;

  const canPlay =
    phase === 'WAITING_FOR_ACTION' && (!needsTarget || selectedCharacter !== null);

  return (
    <div className="rounded-lg border border-blue-600/30 bg-blue-900/20 backdrop-blur-sm px-4 py-3">
      <div className="flex items-start gap-4">
        {/* ─── Left: mini card preview ─────────────────────── */}
        <div className="shrink-0 w-14 h-20 rounded-lg border border-gray-600 overflow-hidden relative bg-gradient-to-b from-white/10 to-white/5">
          <GameImage
            src={getCardImageSrc(cardId) ?? ''}
            alt={cardInfo.displayName}
            className="absolute inset-0 w-full h-full object-cover"
            fallbackClassName="absolute inset-0 flex items-start justify-center pt-1.5"
            fallback={<span className="text-base">{cardInfo.icon}</span>}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
          <div
            className={`absolute bottom-0 left-0 right-0 h-0.5 ${cardInfo.type === 'ITEM' ? 'bg-orange-500/50' : 'bg-blue-500/50'}`}
          />
        </div>

        {/* ─── Center: card info ───────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white truncate">
              {cardInfo.displayName}
            </span>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                cardInfo.type === 'ITEM'
                  ? 'bg-orange-700/60 text-orange-200'
                  : 'bg-blue-700/60 text-blue-200'
              }`}
            >
              {cardInfo.type}
            </span>
          </div>

          <p className="text-xs text-gray-400 mt-0.5">{cardInfo.effect}</p>

          {needsTarget && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[11px] text-gray-500">Objetivo:</span>
              {targetCharDef ? (
                <span className="text-[11px] font-semibold text-green-400">
                  {targetCharDef.displayName}
                </span>
              ) : (
                <span className="text-[11px] text-yellow-400 animate-pulse">
                  Seleccioná un personaje
                </span>
              )}
            </div>
          )}
        </div>

        {/* ─── Right: action buttons ───────────────────────── */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            type="button"
            disabled={!canPlay}
            onClick={onPlay}
            className={`rounded-lg px-4 py-1.5 text-sm font-bold transition active:scale-95 ${
              canPlay
                ? 'bg-green-600 text-white hover:bg-green-500 shadow-md'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
            }`}
          >
            JUGAR
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-600 px-4 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-gray-800 hover:text-white active:scale-95"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
