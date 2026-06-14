'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/lib/useGame';
import { CharacterSelectScreen } from '@/components/game/CharacterSelectScreen';
import { GameBoard } from '@/components/game/GameBoard';
import { GameOverOverlay } from '@/components/game/GameOverOverlay';
import { PreBattleReveal } from '@/components/game/PreBattleReveal';
import { DefenderResponseModal } from '@/components/game/DefenderResponseModal';
import { ErrorToast } from '@/components/game/ErrorToast';
import { getSocket } from '@/lib/socket';
import SidebarLayout from '@/components/SidebarLayout';

interface Props {
  roomCode: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
}

function isPlayingPhase(phase: string | null): boolean {
  return !!phase && phase !== 'DRAFT' && phase !== 'GAME_OVER' && phase !== 'PRE_BATTLE';
}

export default function GamePage({ roomCode, playerId, playerName, isHost }: Props) {
  const router = useRouter();
  const { state, actions } = useGame(roomCode, playerId);

  // ─── Exit handler: leave room + reset + navigate home ─────
  const handleReturnToLobby = useCallback(() => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('room:leave');
    }
    actions.reset();
    router.push('/');
  }, [roomCode, actions, router]);

  // ─── Lobby — waiting for game to start ────────────────────
  if (!state.gameState) {
    return (
      <SidebarLayout>
        <div className="flex flex-1 flex-col items-center justify-center p-8">
          <div className="w-full max-w-md space-y-6 text-center">
            <p className="text-sm text-gray-400">Código de sala</p>
            <p className="select-all text-4xl font-bold tracking-[0.3em] text-[#e94560]">
              {roomCode}
            </p>

            {isHost ? (
              <button
                type="button"
                onClick={() => actions.startGame(roomCode)}
                className="w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-500"
              >
                Comenzar Partida
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium text-white">
                  Esperando al host...
                </p>
                <p className="text-sm text-gray-400">
                  El host iniciará la partida cuando esté listo
                </p>
              </div>
            )}

            {state.error && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {state.error.message}
                <button
                  type="button"
                  onClick={actions.clearError}
                  className="ml-2 text-red-300 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </SidebarLayout>
    );
  }

  // ─── Derive opponent name ────────────────────────────────
  // If we have player names from the socket, we could use them.
  // For now, use a simple fallback.
  const opponentName = 'Rival';

  // ─── Full-screen game ────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Draft Phase — fighting game style */}
      {state.phase === 'DRAFT' && (
        <CharacterSelectScreen
          state={state}
          actions={actions}
          playerName={playerName}
          opponentName={opponentName}
        />
      )}

      {/* Pre-Battle Reveal (fighting-game intro + ban stage) */}
      {state.phase === 'PRE_BATTLE' && (
        <PreBattleReveal
          battlefield={state.battlefield}
          playerCharacters={state.currentPlayer?.characters || []}
          opponentCharacters={state.opponent?.characters || []}
          secondsRemaining={state.secondsRemaining}
          stage={state.preBattle?.stage || null}
          playerName={playerName}
          opponentName={opponentName}
          bannedCharacters={state.gameState?.bannedCharacters || []}
          pendingBan={state.preBattle?.pendingBan ?? null}
          playerIndex={state.playerIndex}
          onBanCharacter={(characterId) => actions.banCharacter(characterId)}
        />
      )}

      {/* Game Board (all play phases except DRAFT, PRE_BATTLE, and GAME_OVER) */}
      {isPlayingPhase(state.phase) && (
        <>
          <GameBoard
            state={state}
            actions={actions}
            onLeave={handleReturnToLobby}
          />

          {/* Defender Response Modal — solo visible para el defensor */}
          {state.isDefenderResponse && state.pendingAttack && state.pendingAttack.targetPlayerIndex === state.playerIndex && (
            <DefenderResponseModal
              pendingAttack={state.pendingAttack}
              playerHand={state.currentPlayer?.hand || []}
              defenderCharacters={state.currentPlayer?.characters || []}
              isVisible={true}
              onRespond={(action, charId, cardId) => {
                actions.defenderResponse(action, charId, cardId);
              }}
              onUseAbility={(charId) => {
                actions.useHabilidad(charId, state.pendingAttack?.targetId);
              }}
            />
          )}
        </>
      )}

      {/* Game Over */}
      {state.gameOver && (
        <GameOverOverlay
          winner={state.winner || ''}
          isPlayerWinner={state.winner === playerId}
          playerName={playerName}
          opponentName={opponentName}
          onReturnToLobby={handleReturnToLobby}
        />
      )}

      {/* Error Toast */}
      {state.error && (
        <ErrorToast error={state.error} onDismiss={actions.clearError} />
      )}
    </div>
  );
}
