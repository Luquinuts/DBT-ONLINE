// ─── Perfil de usuario ──────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  username?: string;
  createdAt: string;
}

export interface UserPresence {
  userId: string;
  username?: string;
  status: 'online' | 'in_game';
  roomCode?: string;
  roomName?: string;
}
