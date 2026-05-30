import type { Room, Player, RoomEvent } from './room';
import type { GameState, GameAction, ActionResult } from './game';
import type { UserPresence } from './profile';

// ─── Eventos Cliente → Servidor ────────────────────────────────

export interface ClientToServerEvents {
  // Sala
  'room:create': (data: {
    name: string;
    maxPlayers?: number;
    isPublic?: boolean;
  }) => void;
  'room:join': (data: { code: string; playerName: string }) => void;
  'room:leave': () => void;
  'room:start_game': () => void;
  'room:public_listing': () => void;

  // Juego
  'game:action': (data: GameAction) => void;
}

// ─── Eventos Servidor → Cliente ────────────────────────────────

export interface ServerToClientEvents {
  // Sala
  'room:joined': (data: { room: Room; player: Player }) => void;
  'room:updated': (data: { room: Room }) => void;
  'room:event': (data: RoomEvent) => void;
  'room:error': (data: { message: string }) => void;
  'room:public_list': (data: {
    rooms: Array<{
      id: string;
      code: string;
      name: string;
      playerCount: number;
      maxPlayers: number;
      hostUserId: string;
    }>;
  }) => void;

  // Presencia
  'presence:friends': (data: { presences: UserPresence[] }) => void;

  // Juego
  'game:state': (data: GameState) => void;
  'game:action_result': (data: ActionResult) => void;
}

// ─── Eventos Internos (sin cliente) ────────────────────────────

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
  roomId?: string;
  supabaseUserId?: string;
}
