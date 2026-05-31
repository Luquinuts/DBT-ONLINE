'use client';

import { useState, useEffect } from 'react';
import type { GameUIState } from '@/lib/gameReducer';
import type { UseGameReturn } from '@/lib/useGame';
import { CHARACTER_DISPLAY } from '@/data/character-display';

interface Props {
  state: GameUIState;
  actions: UseGameReturn['actions'];
}

export function PlaceOrderArea({ state, actions }: Props) {
  const { draftPicks, playerIndex, draftPhase } = state;
  const picks = draftPicks[playerIndex] || [];
  const isMyTurn = draftPhase === 'PLACING';

  const [order, setOrder] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  // Initialize order from picks
  useEffect(() => {
    if (picks.length > 0 && order.length === 0 && !confirmed) {
      setOrder([...picks]);
    }
  }, [picks, order.length, confirmed]);

  if (picks.length === 0) return null;

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...order];
    [newOrder[index - 1], newOrder[index]] = [
      newOrder[index],
      newOrder[index - 1],
    ];
    setOrder(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === order.length - 1) return;
    const newOrder = [...order];
    [newOrder[index], newOrder[index + 1]] = [
      newOrder[index + 1],
      newOrder[index],
    ];
    setOrder(newOrder);
  };

  const handleConfirm = () => {
    if (order.length === picks.length) {
      actions.placeCharacters(order);
      setConfirmed(true);
    }
  };

  return (
    <div className="mt-6 w-full max-w-md rounded-lg border border-gray-700 bg-gray-800/60 p-4">
      <h3 className="mb-3 text-center text-sm font-semibold text-gray-300 uppercase tracking-wide">
        Orden de personajes
      </h3>

      <div className="space-y-2">
        {order.map((charId, index) => {
          const info = CHARACTER_DISPLAY[charId];
          return (
            <div
              key={charId}
              className="flex items-center gap-3 rounded-md border border-gray-700 bg-gray-800 px-3 py-2"
            >
              {/* Position number */}
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 text-sm font-bold text-white">
                {index + 1}
              </span>

              {/* Character info */}
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-white">
                  {info?.displayName || charId}
                </p>
                <p className="text-xs text-gray-400">
                  {info?.type || '???'}
                </p>
              </div>

              {/* Move buttons */}
              {isMyTurn && !confirmed && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="rounded bg-gray-700 px-2 py-1 text-xs text-white transition hover:bg-gray-600 disabled:opacity-30"
                    title="Mover arriba"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    disabled={index === order.length - 1}
                    className="rounded bg-gray-700 px-2 py-1 text-xs text-white transition hover:bg-gray-600 disabled:opacity-30"
                    title="Mover abajo"
                  >
                    ▼
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isMyTurn && !confirmed && (
        <button
          type="button"
          onClick={handleConfirm}
          disabled={order.length !== picks.length}
          className="mt-4 w-full rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-500 disabled:opacity-50"
        >
          Confirmar orden
        </button>
      )}

      {confirmed && (
        <p className="mt-2 text-center text-sm text-green-400">
          Orden confirmado — esperando al rival...
        </p>
      )}
    </div>
  );
}
