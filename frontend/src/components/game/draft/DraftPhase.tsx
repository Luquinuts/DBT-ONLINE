'use client';

import type { GameUIState } from '@/lib/gameReducer';
import type { UseGameReturn } from '@/lib/useGame';
import { DraftStatus } from './DraftStatus';
import { CharacterPickCard } from './CharacterPickCard';
import { PlaceOrderArea } from './PlaceOrderArea';
import { CHARACTER_DISPLAY } from '@/data/character-display';
import { getBackgroundSrc } from '@/lib/assets';

interface Props {
  state: GameUIState;
  actions: UseGameReturn['actions'];
}

export function DraftPhase({ state, actions }: Props) {
  const {
    draftAvailable,
    draftPicks,
    currentPicker,
    playerIndex,
    draftPhase,
  } = state;

  const isMyTurn = currentPicker === playerIndex;
  const myPicks = draftPicks[playerIndex] || [];
  const opponentPicks = draftPicks[1 - playerIndex] || [];

  return (
    <div
      className="flex min-h-screen flex-col items-center bg-cover bg-center p-4"
      style={{ backgroundImage: `url(${getBackgroundSrc('character-selection')})` }}
    >
      <h1 className="mb-2 text-2xl font-bold text-white drop-shadow-lg">
        Selección de Personajes
      </h1>

      <DraftStatus state={state} />

      {/* Pick grid */}
      {(draftPhase === 'PICKING' || !draftPhase) && (
        <div className="mb-6 w-full max-w-2xl">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {draftAvailable.map((charId) => {
              const isSelected =
                myPicks.includes(charId) || opponentPicks.includes(charId);
              return (
                <CharacterPickCard
                  key={charId}
                  characterId={charId}
                  onClick={() => actions.draftSelect(charId)}
                  disabled={!isMyTurn || isSelected}
                  selected={myPicks.includes(charId)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Picks display */}
      <div className="flex w-full max-w-md gap-8">
        {/* My picks */}
        <div className="flex-1 rounded-lg border border-gray-700 bg-black/60 p-3 backdrop-blur-sm">
          <h3 className="mb-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Tus personajes
          </h3>
          {myPicks.length === 0 ? (
            <p className="text-center text-xs text-gray-500">-</p>
          ) : (
            <ul className="space-y-1">
              {myPicks.map((id) => (
                <li
                  key={id}
                  className="truncate rounded bg-gray-700/50 px-2 py-1 text-sm text-white"
                >
                  {CHARACTER_DISPLAY[id]?.displayName || id}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Opponent picks */}
        <div className="flex-1 rounded-lg border border-gray-700 bg-black/60 p-3 backdrop-blur-sm">
          <h3 className="mb-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Rival
          </h3>
          {opponentPicks.length === 0 ? (
            <p className="text-center text-xs text-gray-500">-</p>
          ) : (
            <ul className="space-y-1">
              {opponentPicks.map((id) => (
                <li
                  key={id}
                  className="truncate rounded bg-gray-700/50 px-2 py-1 text-sm text-gray-300"
                >
                  {CHARACTER_DISPLAY[id]?.displayName || id}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Place order area */}
      {draftPhase === 'PLACING' && (
        <PlaceOrderArea state={state} actions={actions} />
      )}
    </div>
  );
}
