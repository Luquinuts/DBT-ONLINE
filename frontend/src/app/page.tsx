'use client';

import { useState } from 'react';

type View = 'home' | 'create' | 'join';

export default function Home() {
  const [view, setView] = useState<View>('home');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo / Título */}
        <div>
          <h1 className="text-5xl font-bold tracking-tight text-white">
            DBT Online
          </h1>
          <p className="mt-2 text-gray-400">
            Juego de cartas por turnos con amigos
          </p>
        </div>

        {view === 'home' && (
          <div className="space-y-4">
            <button
              onClick={() => setView('create')}
              className="w-full rounded-lg bg-[#e94560] px-6 py-3 font-semibold text-white transition hover:bg-[#d63850]"
            >
              Crear Sala
            </button>
            <button
              onClick={() => setView('join')}
              className="w-full rounded-lg border border-gray-600 px-6 py-3 font-semibold text-white transition hover:bg-gray-800"
            >
              Unirse a Sala
            </button>
          </div>
        )}

        {view === 'create' && (
          <CreateRoomView onBack={() => setView('home')} />
        )}

        {view === 'join' && (
          <JoinRoomView onBack={() => setView('home')} />
        )}
      </div>
    </main>
  );
}

function CreateRoomView({ onBack }: { onBack: () => void }) {
  const [roomName, setRoomName] = useState('');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Crear Sala</h2>
      <input
        type="text"
        placeholder="Nombre de la sala"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        className="w-full rounded-lg border border-gray-600 bg-transparent px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
      />
      <button className="w-full rounded-lg bg-[#e94560] px-6 py-3 font-semibold text-white transition hover:bg-[#d63850] disabled:opacity-50">
        Crear
      </button>
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-white">
        ← Volver
      </button>
    </div>
  );
}

function JoinRoomView({ onBack }: { onBack: () => void }) {
  const [code, setCode] = useState('');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Unirse a Sala</h2>
      <input
        type="text"
        placeholder="Código de la sala"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        maxLength={6}
        className="w-full rounded-lg border border-gray-600 bg-transparent px-4 py-2 text-center text-2xl font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
      />
      <button className="w-full rounded-lg bg-[#e94560] px-6 py-3 font-semibold text-white transition hover:bg-[#d63850] disabled:opacity-50">
        Unirse
      </button>
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-white">
        ← Volver
      </button>
    </div>
  );
}
