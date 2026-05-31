'use client';

interface GameOverOverlayProps {
  winner: string;
  isPlayerWinner: boolean;
  playerName?: string;
  opponentName?: string;
  onReturnToLobby: () => void;
  onRematch?: () => void;
}

export function GameOverOverlay({
  winner,
  isPlayerWinner,
  playerName = 'Tú',
  opponentName = 'Rival',
  onReturnToLobby,
  onRematch,
}: GameOverOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in">
      <div className="text-center space-y-8 px-8 max-w-lg">
        {/* Victory/Defeat title */}
        <div className="space-y-2">
          <h1
            className={`text-6xl font-black tracking-wider ${
              isPlayerWinner
                ? 'text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]'
                : 'text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]'
            }`}
          >
            {isPlayerWinner ? 'VICTORIA' : 'DERROTA'}
          </h1>
          <p className="text-lg text-gray-400">
            {isPlayerWinner
              ? `¡${playerName} ha ganado la partida!`
              : `${opponentName} ha ganado la partida`}
          </p>
        </div>

        {/* VS display */}
        <div className="flex items-center justify-center gap-6">
          <div className="text-right">
            <p className={`text-2xl font-bold ${isPlayerWinner ? 'text-yellow-400' : 'text-gray-300'}`}>
              {playerName}
            </p>
            <p className="text-xs text-gray-500">Jugador</p>
          </div>
          <span className="text-4xl font-black text-gray-600">VS</span>
          <div className="text-left">
            <p className={`text-2xl font-bold ${!isPlayerWinner ? 'text-yellow-400' : 'text-gray-300'}`}>
              {opponentName}
            </p>
            <p className="text-xs text-gray-500">Rival</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onReturnToLobby}
            className="w-64 rounded-lg bg-[#e94560] px-6 py-3 font-semibold text-white
                       transition hover:bg-[#d63850] active:scale-95 shadow-lg"
          >
            Volver al Lobby
          </button>
          {onRematch && (
            <button
              type="button"
              onClick={onRematch}
              className="w-64 rounded-lg border border-gray-600 px-6 py-3 text-sm font-medium text-gray-400
                         transition hover:border-gray-500 hover:text-white active:scale-95"
            >
              🔄 Rematch
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
