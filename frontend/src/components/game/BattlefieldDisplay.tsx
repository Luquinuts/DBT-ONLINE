'use client';

import { useState } from 'react';
import type { BattlefieldDef } from '@dbt-online/shared';
import { GameImage } from './GameImage';
import { HoloCard } from './HoloCard';
import { getBattlefieldImageSrc } from '@/lib/assets';

interface BattlefieldDisplayProps {
  battlefield: BattlefieldDef | null;
  isNullified?: boolean;
}

export function BattlefieldDisplay({
  battlefield,
  isNullified = false,
}: BattlefieldDisplayProps) {
  const [showModal, setShowModal] = useState(false);

  if (!battlefield) {
    return (
      <div className="flex aspect-[3/4] w-48 items-center justify-center rounded-xl border-2 border-dashed border-gray-700 bg-gray-900/50">
        <p className="text-center text-sm text-gray-500">Sin battlefield activo</p>
      </div>
    );
  }

  return (
    <>
      {/* ─── Battlefield TCG Card ─────────────────────────────── */}
      <button
        onClick={() => setShowModal(true)}
        className="group relative aspect-[3/4] w-48 flex-shrink-0 overflow-hidden rounded-xl border-2 border-yellow-700/50 bg-gray-900 shadow-lg shadow-black/30 transition hover:border-yellow-500/70 hover:shadow-xl hover:shadow-yellow-900/20"
      >
        {/* Holo card art */}
        <HoloCard className="absolute inset-0" disabled={isNullified}>
          <GameImage
            src={getBattlefieldImageSrc(battlefield.id)}
            alt={battlefield.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-yellow-950/60 to-amber-900/40">
                <span className="text-6xl">{battlefield.icon || '🗺️'}</span>
              </div>
            }
          />
        </HoloCard>

        {/* Nullified overlay */}
        {isNullified && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
            <div className="text-center">
              <p className="text-lg font-bold text-red-400 line-through decoration-red-500 decoration-2">
                {battlefield.name}
              </p>
              <p className="text-xs text-red-400/80">ANULADO por Kid Buu</p>
            </div>
          </div>
        )}

        {/* Gradient + text overlay at bottom */}
        <div
          className={`absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 pt-10 ${
            isNullified ? 'opacity-50' : ''
          }`}
        >
          <p className="truncate text-sm font-bold text-yellow-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {battlefield.icon ? `${battlefield.icon} ` : ''}
            {battlefield.name}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-yellow-400/70 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
            {battlefield.effect || battlefield.description}
          </p>
        </div>

        {/* Click hint */}
        <div className="absolute right-2 top-2 z-10 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] text-gray-400 opacity-0 transition group-hover:opacity-100">
          🔍
        </div>
      </button>

      {/* ─── Detail Modal ─────────────────────────────────────── */}
      {showModal && (
        <BattlefieldModal
          battlefield={battlefield}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// ─── Modal ─────────────────────────────────────────────────────

function BattlefieldModal({
  battlefield,
  onClose,
}: {
  battlefield: BattlefieldDef;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-gray-700 bg-[#1a1a2e] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-500 transition hover:bg-gray-800 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="flex gap-4">
          {/* Image — left */}
          <div className="w-60 flex-shrink-0 overflow-hidden rounded-lg">
            <GameImage
              src={getBattlefieldImageSrc(battlefield.id)}
              alt={battlefield.name}
              className="w-full object-cover"
              fallback={<div className="h-40 w-full bg-gray-800" />}
            />
          </div>

          {/* Data — right */}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2 className="text-xl font-bold text-white">{battlefield.name}</h2>
            <p className="text-sm leading-relaxed text-gray-400">
              {battlefield.description}
            </p>
            <span className="inline-block self-start rounded bg-gray-700/50 px-2 py-0.5 text-xs font-mono text-gray-500">
              {battlefield.effect}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
