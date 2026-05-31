'use client';

import { CARD_DISPLAY } from '@/data/card-display';
import { getCardImageSrc } from '@/lib/assets';
import { GameImage } from './GameImage';

interface CardInHandProps {
  cardId: string;
  isPlayable: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export function CardInHand({
  cardId,
  isPlayable,
  isSelected,
  onClick,
}: CardInHandProps) {
  const cardInfo = CARD_DISPLAY[cardId];

  if (!cardInfo) {
    return (
      <div className="flex h-28 w-20 flex-col items-center justify-center rounded-lg border border-gray-700 bg-gray-800/60 p-1">
        <span className="text-[10px] text-gray-500">{cardId}</span>
      </div>
    );
  }

  const borderColor = cardInfo.color;
  const isItem = cardInfo.type === 'ITEM';
  const cardImageSrc = getCardImageSrc(cardId);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative flex h-28 w-20 shrink-0 flex-col overflow-hidden rounded-lg border-2
        transition-all duration-200
        hover:-translate-y-5 hover:scale-110 hover:shadow-lg hover:z-20
        cursor-pointer
        ${
          isSelected
            ? 'border-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.6)] z-10'
            : isPlayable
              ? 'border-gray-600 hover:border-gray-400'
              : 'border-gray-700'
        }
        ${!isPlayable ? 'opacity-60' : ''}
      `}
      style={{ borderColor: isSelected ? undefined : borderColor + '60' }}
    >
      {/* Card art background (or emoji fallback while loading / absent) */}
      <GameImage
        src={cardImageSrc ?? ''}
        alt={cardInfo.displayName}
        className="absolute inset-0 w-full h-full object-cover"
        fallbackClassName="absolute inset-0 flex items-start justify-center pt-2 bg-gradient-to-b from-white/10 to-white/5"
        fallback={<span className="text-lg">{cardInfo.icon}</span>}
      />

      {/* Gradient overlay so text stays readable on any art */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

      {/* Non-playable subtle indicator */}
      {!isPlayable && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 rounded-lg">
          <span className="text-[10px] font-semibold text-gray-500 bg-black/60 px-2 py-0.5 rounded">No jugable</span>
        </div>
      )}

      {/* Card name */}
      <div className="relative z-10 flex-1 flex items-end justify-center px-1 pb-0.5">
        <span
          className="text-[10px] font-semibold text-center leading-tight text-white drop-shadow-lg"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {cardInfo.displayName}
        </span>
      </div>

      {/* Effect text */}
      <div className="relative z-10 px-1 pb-1.5">
        <p className="text-[8px] text-gray-300 leading-tight text-center line-clamp-2 drop-shadow-md">
          {cardInfo.effect}
        </p>
      </div>

      {/* Item vs Action indicator */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-1 z-10 ${isItem ? 'bg-orange-500/50' : 'bg-blue-500/50'}`}
      />
    </button>
  );
}
