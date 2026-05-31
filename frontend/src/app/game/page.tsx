'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useProfile } from '@/lib/useProfile';
import GamePage from './GamePage';

function GameContent() {
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('roomCode') || '';
  const isHost = searchParams.get('host') === 'true';
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1a2e]">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  if (!roomCode || !profile?.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1a2e]">
        <p className="text-gray-400">
          {!roomCode
            ? 'Falta código de sala'
            : 'Necesitás iniciar sesión para jugar'}
        </p>
      </div>
    );
  }

  return (
    <GamePage
      roomCode={roomCode}
      playerId={profile.id}
      playerName={profile.username || 'Jugador'}
      isHost={isHost}
    />
  );
}

export default function GameRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#1a1a2e]">
          <p className="text-gray-400">Cargando...</p>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
