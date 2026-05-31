'use client';

import type { GamePhase } from '@dbt-online/shared';

interface ActionBarProps {
  phase: GamePhase;
  isMyTurn: boolean;
  playerKi: number;
  deckCount: number;
  discardCount: number;
  ultimateUses: number;
  hasAdvancedThisTurn: boolean;
  hasPlayedEquipableThisTurn: boolean;
  onPass: () => void;
  onEndTurn: () => void;
}

const PHASE_CONFIG: Record<
  string,
  { label: string; color: string; showPass: boolean; passLabel?: string }
> = {
  BATTLEFIELD: {
    label: 'Seleccionando Battlefield',
    color: 'bg-purple-700',
    showPass: false,
  },
  WAITING_FOR_ACTION: {
    label: 'Tu Turno',
    color: 'bg-yellow-600',
    showPass: true,
    passLabel: 'PASAR',
  },
  ADVANCE: {
    label: 'Avanzar',
    color: 'bg-blue-600',
    showPass: true,
    passLabel: 'SALTAR',
  },
  ATTACK: {
    label: 'Atacar',
    color: 'bg-red-600',
    showPass: true,
    passLabel: 'PASAR',
  },
  DEFENDER_RESPONSE: {
    label: 'Defensa',
    color: 'bg-orange-600',
    showPass: false,
  },
  END_TURN: {
    label: 'Finalizando turno...',
    color: 'bg-gray-600',
    showPass: false,
  },
  DRAFT: {
    label: 'Draft',
    color: 'bg-green-700',
    showPass: false,
  },
  GAME_OVER: {
    label: 'Fin de la partida',
    color: 'bg-gray-800',
    showPass: false,
  },
};

export function ActionBar({
  phase,
  isMyTurn,
  playerKi,
  deckCount,
  discardCount,
  ultimateUses,
  hasAdvancedThisTurn,
  hasPlayedEquipableThisTurn,
  onPass,
  onEndTurn,
}: ActionBarProps) {
  const config = PHASE_CONFIG[phase] || PHASE_CONFIG.WAITING_FOR_ACTION;

  const isWaiting = phase === 'WAITING_FOR_ACTION';
  const isAdvance = phase === 'ADVANCE';
  const isAttack = phase === 'ATTACK';
  const showControls = isMyTurn && (isWaiting || isAdvance || isAttack);

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/60 backdrop-blur-sm px-4 py-3">
      {/* ─── Phase indicator + counters ─────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        {/* Phase badge */}
        <div className="flex items-center gap-2">
          <span
            className={`rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white ${config.color}`}
          >
            {config.label}
          </span>
          {isMyTurn ? (
            <span className="text-xs text-green-400 font-semibold">● Tu turno</span>
          ) : (
            <span className="text-xs text-gray-500">● Esperando rival</span>
          )}
        </div>

        {/* Ki / Deck / Discard */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-1" title="Ki disponible">
            <span className="text-yellow-400">⚡</span>
            <span className="font-semibold text-yellow-300">{playerKi}</span>
          </div>
          {ultimateUses > 0 && (
            <span className="text-pink-400" title="ULTIMATE disponible">
              💥 ×{ultimateUses}
            </span>
          )}
          <span className="text-gray-600">|</span>
          <span title="Mazo">📚 {deckCount}</span>
          <span title="Descarte">🗑️ {discardCount}</span>
        </div>
      </div>

      {/* ─── Action buttons ─────────────────────────────────── */}
      {showControls && (
        <div className="flex items-center justify-center gap-3">
          {/* Pass button */}
          {config.showPass && (
            <button
              type="button"
              onClick={onPass}
              className="rounded-lg bg-green-700/80 px-6 py-2 text-sm font-semibold text-white
                         transition hover:bg-green-600 active:scale-95 shadow-md"
            >
              {config.passLabel || 'PASAR'}
            </button>
          )}

          {/* End Turn button (always available to the active player) */}
          <button
            type="button"
            onClick={onEndTurn}
            className="rounded-lg border border-gray-600 px-4 py-2 text-xs font-medium text-gray-300
                       transition hover:bg-gray-800 hover:text-white active:scale-95"
          >
            Finalizar Turno
          </button>
        </div>
      )}

      {/* ─── Not your turn indicator ─────────────────────────── */}
      {!isMyTurn && (
        <div className="text-center py-1">
          <p className="text-xs text-gray-500">Esperá a que tu rival termine su turno</p>
        </div>
      )}
    </div>
  );
}
