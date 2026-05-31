'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

type View = 'home' | 'create' | 'join' | 'lobby';

export default function GamePage() {
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

  const [localView, setLocalView] = useState<View>('home');
  const inLobby = room !== null;

  // Sincronizar username del perfil
  useEffect(() => {
    if (profile?.username && !playerName) {
      setPlayerName(profile.username);
    }
  }, [profile, playerName, setPlayerName]);

  // Navegar a la página de juego cuando arranca la partida
  useEffect(() => {
    const lastEvent = events[events.length - 1];
    if (lastEvent?.type === 'game_started' && room?.code) {
      router.push(`/game?roomCode=${room.code}`);
    }
  }, [events, room?.code, router]);

  // ─── Salas públicas ──────────────────────────────────────────

  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [publicRoomsLoading, setPublicRoomsLoading] = useState(false);

  useEffect(() => {
    if (inLobby || localView !== 'home' || !connected) return;

    setPublicRoomsLoading(true);
    const socket = getSocket();
    socket.emit('room:public_listing');

    const onList = (data: { rooms: PublicRoom[] }) => {
      setPublicRooms(data.rooms);
      setPublicRoomsLoading(false);
    };

    socket.on('room:public_list', onList);

    return () => {
      socket.off('room:public_list', onList);
    };
  }, [inLobby, localView, connected]);

  return (
    <SidebarLayout>
      <div className="flex flex-1 flex-col items-center justify-center p-4 pb-20 md:pb-4">
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
          {inLobby && room && player && (
              <LobbyView
                room={room}
                player={player}
                events={events}
                onLeave={leaveRoom}
                onStartGame={() => {
                  const socket = getSocket();
                  if (socket?.connected) {
                    socket.emit('room:start_game', room.code);
                    router.push(`/game?roomCode=${room.code}&host=true`);
                  }
                }}
              />
          )}

          {/* ─── HOME ──────────────────────────── */}
          {!inLobby && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  ¡Bienvenido, {profile?.username || 'Jugador'}!
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  {connected
                    ? 'Jugá 1vs1 con amigos'
                    : 'Conectando al servidor...'}
                </p>
              </div>

              {localView === 'home' && (
                <div className="space-y-3">
                  <button
                    onClick={() => setLocalView('create')}
                    disabled={!connected}
                    className="w-full rounded-lg bg-[#e94560] px-6 py-3 font-semibold text-white transition hover:bg-[#d63850] disabled:opacity-50"
                  >
                    Crear Sala
                  </button>
                  <button
                    onClick={() => setLocalView('join')}
                    disabled={!connected}
                    className="w-full rounded-lg border border-gray-600 px-6 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
                  >
                    Unirse a Sala
                  </button>
                </div>
              )}

              {/* ─── Salas Públicas ─────────────────── */}
              {localView === 'home' && (
                <PublicRoomsSection
                  rooms={publicRooms}
                  loading={publicRoomsLoading}
                  onJoin={joinRoom}
                />
              )}

              {localView === 'create' && (
                <CreateView
                  onBack={() => setLocalView('home')}
                  onCreate={(name, isPublic) => createRoom(name, isPublic)}
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
    </SidebarLayout>
  );
}

// ─── Crear Sala ─────────────────────────────────────────────

function CreateView({
  onBack,
  onCreate,
}: {
  onBack: () => void;
  onCreate: (name: string, isPublic: boolean) => void;
}) {
  const [roomName, setRoomName] = useState('');
  const [isPublic, setIsPublic] = useState(true);

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

      {/* Visibilidad */}
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
          className={`relative h-6 w-11 rounded-full transition ${
            isPublic ? 'bg-[#e94560]' : 'bg-gray-600'
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition ${
              isPublic ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      <button
        onClick={() => onCreate(roomName, isPublic)}
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
        <button
          onClick={onStartGame}
          className="w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-500"
        >
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

// ─── Salas Públicas ──────────────────────────────────────────

function PublicRoomsSection({
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
      <div className="border-t border-gray-800 pt-6">
        <h3 className="mb-3 text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Salas Públicas
        </h3>
        <p className="text-sm text-gray-500">Cargando salas...</p>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-800 pt-6">
      <h3 className="mb-3 text-sm font-semibold text-gray-400 uppercase tracking-wide">
        Salas Públicas
      </h3>
      {rooms.length === 0 ? (
        <p className="text-sm text-gray-500">
          No hay salas públicas disponibles
        </p>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3"
            >
              <div className="min-w-0 text-left">
                <p className="truncate font-medium text-white">
                  {room.name}
                </p>
                <p className="text-xs text-gray-400">
                  {room.playerCount}/{room.maxPlayers} jugadores
                  <span className="ml-2 text-gray-500">
                    · Código: {room.code}
                  </span>
                </p>
              </div>
              <button
                onClick={() => onJoin(room.code)}
                disabled={room.playerCount >= room.maxPlayers}
                className="shrink-0 rounded-lg bg-[#e94560] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#d63850] disabled:opacity-50"
              >
                {room.playerCount >= room.maxPlayers
                  ? 'Llena'
                  : 'Unirse'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
