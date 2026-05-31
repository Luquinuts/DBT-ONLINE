'use client';

import type { GameUIState } from '@/lib/gameReducer';

interface Props {
  state: GameUIState;
}

export function DraftStatus({ state }: Props) {
  const { draftPhase, currentPicker, playerIndex, draftPicks } = state;

  if (!draftPhase) return null;

  const isMyTurn = currentPicker === playerIndex;
  const totalPicks = 4;
  const currentPickNumber = Math.min(
    draftPicks[0].length + draftPicks[1].length + 1,
    totalPicks,
  );

  // PLACING phase — both players arrange their characters
  if (draftPhase === 'PLACING' || draftPhase === 'DONE') {
    return (
      <div className="mb-4 text-center">
        <p className="text-lg font-semibold text-white">
          {draftPhase === 'PLACING'
            ? 'Ordená tus personajes'
            : 'Selección completa'}
        </p>
        <p className="text-sm text-gray-400">
          {draftPhase === 'PLACING'
            ? 'Arreglá el orden de tus 3 personajes en el campo'
            : 'La partida está por comenzar...'}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 text-center">
      <p className="text-lg font-semibold text-white">
        {isMyTurn ? 'Es tu turno de seleccionar' : 'Esperando al rival...'}
      </p>
      <p className="text-sm text-gray-400">
        Pick {currentPickNumber} de {totalPicks}
        {' · '}
        {isMyTurn ? 'Elegí un personaje' : 'Esperá a que el rival elija'}
      </p>
    </div>
  );
}
