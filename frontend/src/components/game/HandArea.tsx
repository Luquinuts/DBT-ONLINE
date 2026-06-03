'use client';

import { CardInHand } from './CardInHand';

interface HandAreaProps {
  hand: string[];
  isPlayable: boolean;
  selectedCard: string | null;
  onCardClick: (cardId: string) => void;
}

export function HandArea({
  hand,
  isPlayable,
  selectedCard,
  onCardClick,
}: HandAreaProps) {
  if (hand.length === 0) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-sm text-gray-500">Sin cartas en la mano</p>
      </div>
    );
  }

  return (
    <div className="relative flex items-end justify-center gap-0 py-2">
      {/* Fanned layout: overlapping cards centered */}
      <div className="relative flex justify-center" style={{ width: `${hand.length * 6 + 4}rem` }}>
        {hand.map((cardId, index) => {
          // Calculate fan: each card slightly offset
          const offset = index - (hand.length - 1) / 2;
          const rotation = offset * 2; // degrees
          const translateY = Math.abs(offset) * 2; // slight rise for center cards

          return (
            <div
              key={cardId}
              className="absolute transition-transform duration-200 hover:z-30"
              style={{
                left: `calc(50% + ${offset * 5.5}rem - 3.5rem)`,
                transform: `rotate(${rotation}deg) translateY(-${translateY}px)`,
                zIndex: selectedCard === cardId ? 20 : index + 1,
              }}
            >
              <CardInHand
                cardId={cardId}
                isPlayable={isPlayable}
                isSelected={selectedCard === cardId}
                onClick={() => onCardClick(cardId)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
