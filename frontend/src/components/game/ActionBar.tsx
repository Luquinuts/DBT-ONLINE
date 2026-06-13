'use client';

import type { GamePhase } from '@dbt-online/shared';

interface ActionBarProps {
  phase: GamePhase;
  isMyTurn: boolean;
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
    <div className="rounded-lg bg-gray-900/60 backdrop-blur-sm px-4 py-3">
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
