// ─── Sala y Jugadores ──────────────────────────────────────────

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: string; // ISO timestamp
}

export interface Room {
  id: string;
  code: string;         // Código corto para compartir (ej: "AB12")
  name: string;
  status: RoomStatus;
  players: Player[];
  maxPlayers: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// Eventos de sala
export type RoomEvent =
  | { type: 'player_joined'; player: Player }
  | { type: 'player_left'; playerId: string }
  | { type: 'game_started' }
  | { type: 'game_ended'; winnerId?: string }
  | { type: 'room_closed' };
