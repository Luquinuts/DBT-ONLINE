'use client';

import type { BattlefieldDef } from '@dbt-online/shared';

interface BattlefieldDisplayProps {
  battlefield: BattlefieldDef | null;
  isNullified?: boolean;
}

export function BattlefieldDisplay({
  battlefield,
  isNullified = false,
}: BattlefieldDisplayProps) {
  if (!battlefield) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-700 bg-gray-900/30 px-6 py-3">
        <p className="text-sm text-gray-500">Sin battlefield activo</p>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-lg border border-yellow-700/50 bg-gradient-to-r from-yellow-950/40 via-yellow-900/30 to-yellow-950/40 px-6 py-3">
      {/* Nullified overlay */}
      {isNullified && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="text-center">
            <p className="text-lg font-bold text-red-400 line-through decoration-red-500 decoration-2">
              {battlefield.name}
            </p>
            <p className="text-xs text-red-400/80">ANULADO por Kid Buu</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`text-center ${isNullified ? 'opacity-30 blur-[1px]' : ''}`}>
        <p className="text-sm font-bold text-yellow-300">
          {battlefield.icon ? `${battlefield.icon} ` : ''}
          {battlefield.name}
        </p>
        <p className="mt-0.5 text-xs text-yellow-400/80">
          {battlefield.effect || battlefield.description}
        </p>
      </div>
    </div>
  );
}
