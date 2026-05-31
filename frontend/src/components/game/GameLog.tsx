'use client';

import { useEffect, useRef, useState } from 'react';
import type { TurnLogEntry } from '@dbt-online/shared';

interface GameLogProps {
  entries: TurnLogEntry[];
  maxVisible?: number;
}

const ACTION_ICONS: Record<string, string> = {
  'TURN_START': '▶️',
  'TURN_END': '⏹️',
  'ADVANCE': '⬆️',
  'ATTACK': '⚔️',
  'DEFEND': '🛡️',
  'PLAY_CARD': '🃏',
  'DRAW': '📥',
  'PASS': '⏭️',
  'GAME_OVER': '🏆',
  'NO_ELIGIBLE': '⏸️',
};

const ACTION_COLORS: Record<string, string> = {
  'TURN_START': 'text-blue-400',
  'TURN_END': 'text-gray-500',
  'ADVANCE': 'text-yellow-400',
  'ATTACK': 'text-red-400',
  'DEFEND': 'text-green-400',
  'PLAY_CARD': 'text-purple-400',
  'DRAW': 'text-blue-400',
  'PASS': 'text-gray-400',
  'GAME_OVER': 'text-yellow-300',
  'NO_ELIGIBLE': 'text-gray-500',
};

function getActionIcon(action: string): string {
  return ACTION_ICONS[action] || '•';
}

function getActionColor(action: string): string {
  return ACTION_COLORS[action] || 'text-gray-400';
}

export function GameLog({ entries, maxVisible = 10 }: GameLogProps) {
  const [minimized, setMinimized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'l' || e.key === 'L') {
        setMinimized((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const display = entries.slice(-maxVisible);

  if (minimized) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-1.5">
        <span className="text-xs text-gray-500">
          📋 {entries.length} acciones
        </span>
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="text-[10px] text-gray-600 hover:text-gray-400 transition"
        >
          Expandir
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 max-h-32 overflow-y-auto">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-600 font-medium uppercase tracking-wide">
          Historial ({entries.length})
        </span>
        <button
          type="button"
          onClick={() => setMinimized(true)}
          className="text-[10px] text-gray-600 hover:text-gray-400 transition"
        >
          Minimizar
        </button>
      </div>
      <div className="space-y-0.5">
        {display.map((entry, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px] leading-tight">
            <span className="text-gray-600 shrink-0 font-mono">
              T{entry.turnNumber}
            </span>
            <span className="shrink-0">{getActionIcon(entry.action)}</span>
            <span className={`shrink-0 font-medium ${getActionColor(entry.action)}`}>
              {entry.action}
            </span>
            <span className="text-gray-400 truncate">
              {entry.details}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
