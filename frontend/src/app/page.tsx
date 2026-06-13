'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SidebarLayout from '@/components/SidebarLayout';
import { useRoom } from '@/lib/useRoom';
import { useProfile } from '@/lib/useProfile';
import { getSocket } from '@/lib/socket';
import type { Room, Player, RoomEvent } from '@dbt-online/shared';

interface PublicRoom {
  id: string;
  code: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  hostUserId: string;
}

type View = 'modes' | 'quick' | 'quick-join' | 'quick-create' | 'quick-public' | 'lobby';

export default function HomePage() {
  const router = useRouter();
  const { profile } = useProfile();
  const {
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

  const [view, setView] = useState<View>('modes');
  const inLobby = room !== null;

  // Sync profile username
  useEffect(() => {
    if (profile?.username && !playerName) {
      setPlayerName(profile.username);
    }
  }, [profile, playerName, setPlayerName]);

  // Navigate to game page when started
  useEffect(() => {
    const lastEvent = events[events.length - 1];
    if (lastEvent?.type === 'game_started' && room?.code) {
      router.push(`/game?roomCode=${room.code}`);
    }
  }, [events, room?.code, router]);

  // Auto-switch to lobby view when a room is joined
  useEffect(() => {
    if (inLobby) setView('lobby');
  }, [inLobby]);

  const handleStartGame = () => {
    if (!room) return;
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('room:start_game', room.code);
      router.push(`/game?roomCode=${room.code}&host=true`);
    }
  };

  // ─── Public rooms ──────────────────────────────────────────

  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [publicRoomsLoading, setPublicRoomsLoading] = useState(false);

  useEffect(() => {
    if (inLobby || view !== 'quick-public' || !connected) return;

    setPublicRoomsLoading(true);
    const socket = getSocket();
    socket.emit('room:public_listing');

    const onList = (data: { rooms: PublicRoom[] }) => {
      setPublicRooms(data.rooms);
      setPublicRoomsLoading(false);
    };

    socket.on('room:public_list', onList);
    return () => { socket.off('room:public_list', onList); };
  }, [inLobby, view, connected]);

  return (
    <SidebarLayout>
      <div className="flex flex-grow items-center justify-center p-4 md:p-8 z-10 w-full max-w-7xl mx-auto relative">
        <div className="flex w-full flex-col items-center">

          {/* Connection warning */}
          {!connected && (
            <p className="mb-4 text-sm text-yellow-400">Conectando al servidor...</p>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
              <button onClick={clearError} className="ml-auto text-red-300 hover:text-white">✕</button>
            </div>
          )}

          {/* ─── LOBBY ──────────────────────────── */}
          {view === 'lobby' && room && player && (
            <LobbyView
              room={room}
              player={player}
              events={events}
              onLeave={() => { leaveRoom(); setView('modes'); }}
              onStartGame={handleStartGame}
            />
          )}

          {/* ─── GAME MODES GRID ────────────────── */}
          {view === 'modes' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full h-auto md:h-[60vh]">
              {/* ── Partida Rápida (hero card) ──── */}
              <div
                onClick={() => connected && setView('quick')}
                className={`menu-card menu-card-primary rounded-xl flex flex-col h-full group ${!connected ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-indigo-900 opacity-60 group-hover:opacity-80 transition-opacity">
                  <div className="w-full h-full flex items-center justify-center opacity-20">
                    <svg className="w-32 h-32 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-auto z-20 p-6 text-gradient-bg h-2/5 flex flex-col justify-end">
                  <h2 className="text-5xl md:text-6xl font-bold text-white uppercase italic tracking-wider glow-text-primary mb-1 leading-none">
                    Partida<br />Rápida
                  </h2>
                  <p className="text-gray-300 text-base md:text-lg uppercase tracking-widest font-semibold">
                    Encuentra oponente casual
                  </p>
                </div>
              </div>

              {/* ── Right grid: 2×2 ──────────────── */}
              <div className="md:col-span-2 grid grid-cols-2 gap-6 h-full">
                {/* Clasificatoria (bloqueada) */}
                <div className="menu-card rounded-xl flex flex-col group relative cursor-not-allowed opacity-40 grayscale">
                  <div className="scanlines"></div>
                  <div className="absolute inset-0 bg-gradient-to-tr from-gray-700/60 to-black/60"></div>
                  <div className="mt-auto z-20 p-5 text-gradient-bg w-full absolute bottom-0">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-400 uppercase tracking-wider">
                      Partida<br />Clasificatoria
                    </h2>
                    <p className="text-gray-600 text-xs md:text-sm uppercase tracking-wide">
                      Compite por el rango Z
                    </p>
                  </div>
                </div>

                {/* Misiones (bloqueada) */}
                <div className="menu-card rounded-xl flex flex-col group relative cursor-not-allowed opacity-40 grayscale">
                  <div className="scanlines"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-700/60 to-black/60"></div>
                  <div className="mt-auto z-20 p-5 text-gradient-bg w-full absolute bottom-0">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-400 uppercase tracking-wider">
                      Misiones
                    </h2>
                    <p className="text-gray-600 text-xs md:text-sm uppercase tracking-wide">
                      Historia y eventos diarios
                    </p>
                  </div>
                </div>

                {/* Amigos */}
                <div className="menu-card rounded-xl flex flex-col group relative">
                  <Link href="/friends" className="absolute inset-0 z-30" />
                  <div className="scanlines"></div>
                  <div className="absolute inset-0 bg-gradient-to-tl from-purple-900/60 to-black/60 group-hover:from-purple-800/80 transition-colors"></div>
                  <div className="z-20 p-5 flex justify-between items-start w-full relative">
                    <svg className="w-8 h-8 text-[#64ffda]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="mt-auto z-20 p-5 text-gradient-bg w-full absolute bottom-0">
                    <h2 className="text-3xl md:text-4xl font-bold text-white uppercase tracking-wider glow-text">
                      Amigos
                    </h2>
                    <p className="text-gray-400 text-xs md:text-sm uppercase tracking-wide">
                      Reta a tus aliados
                    </p>
                  </div>
                </div>

                {/* Empty cell (Construcción removed) */}
                <div />
              </div>
            </div>
          )}

          {/* ─── PARTIDA RÁPIDA — 3 OPTION CARDS ──── */}
          {view === 'quick' && (
            <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
              <div className="w-full flex items-center gap-3">
                <button onClick={() => setView('modes')} className="text-sm text-gray-400 hover:text-white uppercase tracking-wider">
                  ← Volver
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full h-auto md:h-[40vh]">
                {/* Unirse a Sala */}
                <div
                  onClick={() => setView('quick-join')}
                  className="menu-card rounded-xl flex flex-col group relative"
                >
                  <div className="scanlines"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-800/80 to-gray-900 group-hover:from-blue-700/90 transition-colors"></div>
                  <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.07]">
                    <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div className="mt-auto z-20 p-5 text-gradient-bg w-full">
                    <h3 className="text-3xl md:text-4xl font-bold text-white uppercase tracking-wider glow-text">
                      Unirse<br />a Sala
                    </h3>
                    <p className="text-gray-400 text-xs md:text-sm uppercase tracking-wide">
                      Ingresá un código
                    </p>
                  </div>
                </div>

                {/* Crear Sala */}
                <div
                  onClick={() => setView('quick-create')}
                  className="menu-card rounded-xl flex flex-col group relative"
                >
                  <div className="scanlines"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-green-800/80 to-gray-900 group-hover:from-green-700/90 transition-colors"></div>
                  <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.07]">
                    <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="mt-auto z-20 p-5 text-gradient-bg w-full">
                    <h3 className="text-3xl md:text-4xl font-bold text-white uppercase tracking-wider glow-text">
                      Crear<br />Sala
                    </h3>
                    <p className="text-gray-400 text-xs md:text-sm uppercase tracking-wide">
                      Configurá tu sala
                    </p>
                  </div>
                </div>

                {/* Salas Públicas */}
                <div
                  onClick={() => setView('quick-public')}
                  className="menu-card rounded-xl flex flex-col group relative"
                >
                  <div className="scanlines"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-800/80 to-gray-900 group-hover:from-purple-700/90 transition-colors"></div>
                  <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.07]">
                    <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="mt-auto z-20 p-5 text-gradient-bg w-full">
                    <h3 className="text-3xl md:text-4xl font-bold text-white uppercase tracking-wider glow-text">
                      Salas<br />Públicas
                    </h3>
                    <p className="text-gray-400 text-xs md:text-sm uppercase tracking-wide">
                      Unite a una sala abierta
                    </p>
                  </div>
                </div>
              </div>

              <button onClick={() => setView('modes')} className="text-sm text-gray-500 hover:text-white uppercase tracking-wider">
                ← Volver al menú principal
              </button>
            </div>
          )}

          {/* ─── JOIN ROOM ──────────────────────────── */}
          {view === 'quick-join' && (
            <div className="flex w-full max-w-md flex-col items-center gap-6">
              <button onClick={() => setView('quick')} className="self-start text-sm text-gray-400 hover:text-white uppercase tracking-wider">
                ← Partida Rápida
              </button>
              <h2 className="text-4xl font-bold text-white uppercase tracking-wider glow-text">
                Unirse a Sala
              </h2>
              <p className="text-sm text-gray-400">Ingresá el código de sala que te compartieron</p>

              <JoinForm onJoin={(code) => joinRoom(code)} />

              <button onClick={() => setView('quick')} className="text-sm text-gray-500 hover:text-white uppercase tracking-wider">
                ← Volver
              </button>
            </div>
          )}

          {/* ─── CREATE ROOM ──────────────────────────── */}
          {view === 'quick-create' && (
            <div className="flex w-full max-w-md flex-col items-center gap-6">
              <button onClick={() => setView('quick')} className="self-start text-sm text-gray-400 hover:text-white uppercase tracking-wider">
                ← Partida Rápida
              </button>
              <h2 className="text-4xl font-bold text-white uppercase tracking-wider glow-text">
                Crear Sala
              </h2>

              <CreateForm onCreate={(name, isPublic) => createRoom(name, isPublic)} />

              <button onClick={() => setView('quick')} className="text-sm text-gray-500 hover:text-white uppercase tracking-wider">
                ← Volver
              </button>
            </div>
          )}

          {/* ─── PUBLIC ROOMS ──────────────────────────── */}
          {view === 'quick-public' && (
            <div className="flex w-full max-w-2xl flex-col items-center gap-6">
              <button onClick={() => setView('quick')} className="self-start text-sm text-gray-400 hover:text-white uppercase tracking-wider">
                ← Partida Rápida
              </button>
              <h2 className="text-4xl font-bold text-white uppercase tracking-wider glow-text">
                Salas Públicas
              </h2>

              <PublicRoomsList
                rooms={publicRooms}
                loading={publicRoomsLoading}
                onJoin={joinRoom}
              />

              <button onClick={() => setView('quick')} className="text-sm text-gray-500 hover:text-white uppercase tracking-wider">
                ← Volver
              </button>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}

// ─── Local Components ──────────────────────────────────────

function JoinForm({ onJoin }: { onJoin: (code: string) => void }) {
  const [code, setCode] = useState('');

  return (
    <div className="flex w-full flex-col gap-4">
      <input
        type="text"
        placeholder="Código"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        maxLength={6}
        className="w-full rounded-lg border border-gray-600 bg-transparent px-4 py-3 text-center text-2xl font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
      <button
        onClick={() => onJoin(code)}
        disabled={code.length < 4}
        className="w-full rounded-xl border-2 border-orange-500/60 bg-gradient-to-br from-blue-900 to-indigo-900 px-6 py-3 text-lg font-bold uppercase tracking-wider text-white transition hover:scale-[1.02] hover:border-orange-400 disabled:opacity-50"
      >
        Unirse
      </button>
    </div>
  );
}

function CreateForm({ onCreate }: { onCreate: (name: string, isPublic: boolean) => void }) {
  const [roomName, setRoomName] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  return (
    <div className="flex w-full flex-col gap-4">
      <input
        type="text"
        placeholder="Nombre de la sala"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        maxLength={30}
        className="w-full rounded-lg border border-gray-600 bg-transparent px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
      />

      {/* Visibilidad toggle */}
      <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3">
        <div className="text-left">
          <p className="text-sm text-white">Sala pública</p>
          <p className="text-xs text-gray-500">
            {isPublic
              ? 'Tus amigos van a poder ver que estás acá'
              : 'Solo con el código pueden entrar'}
          </p>
        </div>
        <button
          onClick={() => setIsPublic(!isPublic)}
          className={`relative h-6 w-11 rounded-full transition ${isPublic ? 'bg-orange-500' : 'bg-gray-600'}`}
        >
          <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition ${isPublic ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      <button
        onClick={() => onCreate(roomName, isPublic)}
        disabled={!roomName.trim()}
        className="w-full rounded-xl border-2 border-orange-500/60 bg-gradient-to-br from-blue-900 to-indigo-900 px-6 py-3 text-lg font-bold uppercase tracking-wider text-white transition hover:scale-[1.02] hover:border-orange-400 disabled:opacity-50"
      >
        Crear Sala
      </button>
    </div>
  );
}

function PublicRoomsList({
  rooms,
  loading,
  onJoin,
}: {
  rooms: PublicRoom[];
  loading: boolean;
  onJoin: (code: string) => void;
}) {
  if (loading) {
    return (
      <div className="w-full rounded-xl border border-gray-700 bg-gray-800/50 p-6 text-center">
        <p className="text-sm text-gray-400">Cargando salas públicas...</p>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="w-full rounded-xl border border-gray-700 bg-gray-800/50 p-6 text-center">
        <p className="text-sm text-gray-500">No hay salas públicas disponibles</p>
        <p className="mt-1 text-xs text-gray-600">Creá una sala o pedile el código a un amigo</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {rooms.map((r) => (
        <div
          key={r.id}
          className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-5 py-4 transition hover:border-gray-600"
        >
          <div className="min-w-0 text-left">
            <p className="truncate font-medium text-white">{r.name}</p>
            <p className="text-xs text-gray-400">
              {r.playerCount}/{r.maxPlayers} jugadores
              <span className="ml-2 text-gray-500">· Código: {r.code}</span>
            </p>
          </div>
          <button
            onClick={() => onJoin(r.code)}
            disabled={r.playerCount >= r.maxPlayers}
            className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-orange-400 disabled:opacity-50"
          >
            {r.playerCount >= r.maxPlayers ? 'Llena' : 'Unirse'}
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Lobby ──────────────────────────────────────────────────

function LobbyView({
  room,
  player,
  events,
  onLeave,
  onStartGame,
}: {
  room: Room;
  player: Player;
  events: RoomEvent[];
  onLeave: () => void;
  onStartGame: () => void;
}) {
  const isHost = player.isHost;
  const playerCount = room.players.length;
  const lastEvent = events[events.length - 1];

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <div className="text-center">
        <p className="mb-1 text-sm text-gray-400">Código de sala</p>
        <p className="select-all text-4xl font-bold tracking-[0.3em] text-orange-400 glow-text-primary">
          {room.code}
        </p>
        <p className="mt-1 text-xs text-gray-500">Compartí este código con tus amigos</p>
      </div>

      <p className="text-lg font-medium text-white">{room.name}</p>

      <div className="w-full rounded-xl border border-gray-700 bg-gray-800/50 p-5">
        <h3 className="mb-3 text-left text-sm font-semibold uppercase tracking-wide text-gray-400">
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
                {p.id === player.id && <span className="ml-2 text-xs text-gray-400">(vos)</span>}
              </span>
              <span className="text-xs text-gray-500">{p.isHost ? 'Host' : ''}</span>
            </li>
          ))}
        </ul>
      </div>

      {isHost && playerCount >= 2 ? (
        <button
          onClick={onStartGame}
          className="w-full rounded-xl border-2 border-orange-500/60 bg-gradient-to-br from-blue-900 to-indigo-900 px-6 py-3 text-lg font-bold uppercase tracking-wider text-white transition hover:scale-[1.02] hover:border-orange-400"
        >
          Iniciar Partida
        </button>
      ) : (
        <p className="text-sm text-gray-400">
          {playerCount < 2 ? 'Esperando jugadores...' : 'El host iniciará la partida'}
        </p>
      )}

      {lastEvent?.type === 'player_joined' && (
        <p className="text-sm text-green-400">{lastEvent.player.name} se unió a la sala</p>
      )}
      {lastEvent?.type === 'player_left' && (
        <p className="text-sm text-yellow-400">Un jugador abandonó la sala</p>
      )}

      <button onClick={onLeave} className="text-sm text-gray-500 hover:text-white">
        ← Salir de la sala
      </button>
    </div>
  );
}
