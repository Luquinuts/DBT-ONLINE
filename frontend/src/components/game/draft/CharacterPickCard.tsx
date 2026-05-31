'use client';

import { CHARACTER_DISPLAY } from '@/data/character-display';

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
  const info = CHARACTER_DISPLAY[characterId];

  if (!info) {
    return (
      <div className="flex h-48 w-36 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 p-2">
        <p className="text-xs text-gray-500">{characterId}</p>
      </div>
    );
  }

  const typeColors: Record<string, string> = {
    TANQUE: 'bg-violet-600',
    DAMAGE: 'bg-red-600',
    SUPPORT: 'bg-sky-400',
  };

  const typeBg = typeColors[info.type] || 'bg-gray-600';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex h-48 w-36 flex-col overflow-hidden rounded-lg border-2
        transition-all duration-150 hover:scale-105
        ${
          selected
            ? 'border-yellow-400 ring-2 ring-yellow-400/50'
            : disabled
              ? 'cursor-not-allowed border-gray-700 opacity-50'
              : 'border-gray-600 hover:border-gray-400'
        }
      `}
      style={{ backgroundColor: info.color + '30' }}
    >
      {/* Type badge */}
      <span
        className={`${typeBg} absolute right-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white`}
      >
        {info.type}
      </span>

      {/* Character name */}
      <div className="flex flex-1 items-center justify-center px-2">
        <span className="text-center text-sm font-bold text-white drop-shadow-lg">
          {info.displayName}
        </span>
      </div>

      {/* Stats */}
      <div className="flex justify-around border-t border-white/10 bg-black/20 px-2 py-1.5">
        <div className="text-center">
          <p className="text-[10px] text-gray-400">HP</p>
          <p className="text-sm font-bold text-green-400">{info.stats.vida}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400">SPD</p>
          <p className="text-sm font-bold text-blue-400">
            {info.stats.lentitud}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400">ATK</p>
          <p className="text-sm font-bold text-red-400">
            {info.stats.ataque}
          </p>
        </div>
      </div>
    </button>
  );
}
