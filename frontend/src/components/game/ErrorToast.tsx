'use client';

import { useEffect } from 'react';
import type { GameError } from '@dbt-online/shared';

interface ErrorToastProps {
  error: GameError;
  onDismiss: () => void;
}

export function ErrorToast({ error, onDismiss }: ErrorToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
      <div className="flex items-center gap-3 rounded-lg bg-red-600/90 backdrop-blur-sm px-5 py-3 shadow-lg border border-red-400/30">
        <span className="text-xs font-bold text-red-200 uppercase tracking-wider bg-red-800/50 rounded px-1.5 py-0.5">
          {error.code}
        </span>
        <span className="text-sm text-red-100">{error.message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="ml-2 text-red-200 hover:text-white transition shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
