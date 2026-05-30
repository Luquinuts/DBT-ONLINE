'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useRoom } from '@/lib/useRoom';
import type { Room, Player, RoomEvent } from '@dbt-online/shared';

type View = 'home' | 'create' | 'join' | 'lobby';

export default function Home() {
  const { user, loading: authLoading, logout } = useAuth();
  const {
    view,
    room,
    player,
    playerName,
    events,
    error,
    connected,
    createRoom,
    joinRoom,
    leaveRoom,
    setPlayerName,
    clearError,
  } = useRoom();

  const [localView, setLocalView] = useState<View>('home');
  const currentView = room ? 'lobby' : localView;

  // ── Cargando auth ────────────────────────────────────────
  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </main>
    );
  }

  // ── No autenticado ───────────────────────────────────────
  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <h1 className="text-5xl font-bold text-white">DBT Online</h1>
          <p className="text-gray-400">
            Juego de cartas por turnos con amigos
          </p>
          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full rounded-lg bg-[#e94560] px-6 py-3 font-semibold text-white hover:bg-[#d63850]"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="block w-full rounded-lg border border-gray-600 px-6 py-3 font-semibold text-white hover:bg-gray-800"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Autenticado — juego ──────────────────────────────────
  return (
    <main className="flex min-h-screen flex-col p-4">
      {/* Header */}
      <header className="mx-auto flex w-full max-w-md items-center justify-between">
        <h1 className="text-xl font-bold text-white">DBT Online</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/friends"
            className="text-sm text-gray-400 hover:text-white"
          >
            Amigos
          </Link>
          <span className="text-sm text-gray-500">{user.email}</span>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-[#e94560]"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Contenido */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-8 text-center">
          {/* Conexión */}
          {!connected && (
            <p className="text-sm text-yellow-400">
              Conectando al servidor...
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
              <button
                onClick={clearError}
                className="ml-2 text-red-300 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {/* ─── LOBBY ─────────────────────────── */}
          {currentView === 'lobby' && room && player && (
            <LobbyView
              room={room}
              player={player}
              events={events}
              onLeave={leaveRoom}
            />
          )}

          {/* ─── HOME ──────────────────────────── */}
          {currentView === 'home' && (
            <div className="space-y-6">
              <p className="text-gray-400">
                Jugá al truco con amigos en salas 1vs1
              </p>

              <div>
                <label className="mb-1 block text-left text-sm text-gray-400">
                  Tu nombre en el juego
                </label>
                <input
                  type="text"
                  placeholder="Ej: Luquinuts"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                  className="w-full rounded-lg border border-gray-600 bg-transparent px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
                />
              </div>

              {localView === 'home' && (
                <div className="space-y-3">
                  <button
                    onClick={() => setLocalView('create')}
                    disabled={!playerName.trim() || !connected}
                    className="w-full rounded-lg bg-[#e94560] px-6 py-3 font-semibold text-white transition hover:bg-[#d63850] disabled:opacity-50"
                  >
                    Crear Sala
                  </button>
                  <button
                    onClick={() => setLocalView('join')}
                    disabled={!playerName.trim() || !connected}
                    className="w-full rounded-lg border border-gray-600 px-6 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
                  >
                    Unirse a Sala
                  </button>
                </div>
              )}

              {localView === 'create' && (
                <CreateView
                  onBack={() => setLocalView('home')}
                  onCreate={(name) => createRoom(name)}
                />
              )}

              {localView === 'join' && (
                <JoinView
                  onBack={() => setLocalView('home')}
                  onJoin={(code) => joinRoom(code)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// ─── Crear Sala ─────────────────────────────────────────────

function CreateView({
  onBack,
  onCreate,
}: {
  onBack: () => void;
  onCreate: (name: string) => void;
}) {
  const [roomName, setRoomName] = useState('');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Crear Sala</h2>
      <input
        type="text"
        placeholder="Nombre de la sala"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        maxLength={30}
        className="w-full rounded-lg border border-gray-600 bg-transparent px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
      />
      <button
        onClick={() => onCreate(roomName)}
        disabled={!roomName.trim()}
        className="w-full rounded-lg bg-[#e94560] px-6 py-3 font-semibold text-white transition hover:bg-[#d63850] disabled:opacity-50"
      >
        Crear
      </button>
      <button
        onClick={onBack}
        className="text-sm text-gray-400 hover:text-white"
      >
        ← Volver
      </button>
    </div>
  );
}

// ─── Unirse a Sala ──────────────────────────────────────────

function JoinView({
  onBack,
  onJoin,
}: {
  onBack: () => void;
  onJoin: (code: string) => void;
}) {
  const [code, setCode] = useState('');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Unirse a Sala</h2>
      <input
        type="text"
        placeholder="Código"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        maxLength={6}
        className="w-full rounded-lg border border-gray-600 bg-transparent px-4 py-2 text-center text-2xl font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e94560]"
      />
      <button
        onClick={() => onJoin(code)}
        disabled={code.length < 4}
        className="w-full rounded-lg bg-[#e94560] px-6 py-3 font-semibold text-white transition hover:bg-[#d63850] disabled:opacity-50"
      >
        Unirse
      </button>
      <button
        onClick={onBack}
        className="text-sm text-gray-400 hover:text-white"
      >
        ← Volver
      </button>
    </div>
  );
}

// ─── Sala (Lobby) ───────────────────────────────────────────

function LobbyView({
  room,
  player,
  events,
  onLeave,
}: {
  room: Room;
  player: Player;
  events: RoomEvent[];
  onLeave: () => void;
}) {
  const isHost = player.isHost;
  const playerCount = room.players.length;
  const lastEvent = events[events.length - 1];

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-sm text-gray-400">Código de sala</p>
        <p className="select-all text-4xl font-bold tracking-[0.3em] text-[#e94560]">
          {room.code}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Compartí este código con tus amigos
        </p>
      </div>

      <p className="text-lg font-medium">{room.name}</p>

      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
        <h3 className="mb-3 text-left text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Jugadores ({playerCount}/{room.maxPlayers})
        </h3>
        <ul className="space-y-2">
          {room.players.map((p: Player) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-md bg-gray-700/50 px-3 py-2"
            >
              <span className="text-white">
                {p.name}
                {p.id === player.id && (
                  <span className="ml-2 text-xs text-gray-400">(vos)</span>
                )}
              </span>
              <span className="text-xs text-gray-500">
                {p.isHost ? '👑 Host' : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {isHost && playerCount >= 2 ? (
        <button className="w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-500">
          Iniciar Partida
        </button>
      ) : (
        <p className="text-sm text-gray-400">
          {playerCount < 2
            ? 'Esperando jugadores...'
            : 'El host iniciará la partida'}
        </p>
      )}

      {lastEvent?.type === 'player_joined' && (
        <p className="text-sm text-green-400">
          {lastEvent.player.name} se unió a la sala
        </p>
      )}
      {lastEvent?.type === 'player_left' && (
        <p className="text-sm text-yellow-400">
          Un jugador abandonó la sala
        </p>
      )}

      <button
        onClick={onLeave}
        className="text-sm text-gray-500 hover:text-white"
      >
        ← Salir de la sala
      </button>
    </div>
  );
}
