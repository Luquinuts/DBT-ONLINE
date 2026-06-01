'use client';

import { GameImage } from '@/components/game/GameImage';
import { getCharacterIconSrc } from '@/lib/assets';

interface Props {
  characterId: string;
  onClick: () => void;
  disabled?: boolean;
  selected?: boolean;
}

export function CharacterPickCard({
  characterId,
  onClick,
  disabled = false,
  selected = false,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative aspect-[3/4] overflow-hidden rounded-lg border-2
        bg-black/40 transition-all duration-150
        ${
          selected
            ? 'border-yellow-400 ring-2 ring-yellow-400/50 scale-105'
            : disabled
              ? 'cursor-not-allowed border-gray-700 opacity-40 grayscale'
              : 'border-white/10 hover:border-[#e94560]/50 hover:scale-105 hover:shadow-lg hover:shadow-[#e94560]/10'
        }
      `}
    >
      <GameImage
        src={getCharacterIconSrc(characterId)}
        alt={characterId}
        className="h-full w-full object-contain p-1 transition group-hover:scale-105"
        fallback={<span className="text-4xl text-gray-600">?</span>}
      />
    </button>
  );
}
