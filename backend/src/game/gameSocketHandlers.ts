import { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  GameAction,
} from '@dbt-online/shared';
import { gameRegistry } from './GameRegistry';

// ─── Room shape needed by the game handlers ──────────────────────
// Matches the RoomStore interface from index.ts at runtime.
// Defined locally to avoid coupling the game module to the server module.

interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: string;
}

type RoomStatus = 'waiting' | 'playing' | 'finished';

interface GameRoomData {
  id: string;
  code: string;
  name: string;
  status: RoomStatus;
  players: RoomPlayer[];
  hostUserId: string;
  maxPlayers: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

type RoomMap = Map<string, GameRoomData>;

// ─── Public API ──────────────────────────────────────────────────

/**
 * Register all game-related socket event handlers for a connected socket.
 *
 * Must be called once per socket connection, AFTER auth middleware and
 * AFTER the existing room/presence handlers are registered (order doesn't
 * matter since socket events queue until registered).
 *
 * @param io     - Socket.IO server instance (for broadcasting)
 * @param socket - The connected socket
 * @param rooms  - The in-memory rooms map from the main server
 */
export function registerGameHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  rooms: RoomMap
): void {
  // ── room:start_game ──────────────────────────────────────────
  socket.on('room:start_game', (roomCode: string) => {
    try {
      handleStartGame(io, socket, socket.data.playerId || socket.id, rooms, roomCode);
    } catch (err) {
      console.error('[game:start_game] error:', err);
      socket.emit('game:error', {
        code: 'INTERNAL_ERROR',
        message: 'Error interno al iniciar la partida.',
      });
    }
  });

  // ── game:action ──────────────────────────────────────────────
  socket.on('game:action', (data: { roomCode: string; action: GameAction }) => {
    try {
      handleGameAction(io, socket, socket.data.playerId || socket.id, data);
    } catch (err) {
      console.error('[game:action] error:', err);
      socket.emit('game:error', {
        code: 'INTERNAL_ERROR',
        message: 'Error interno al procesar la acción.',
      });
    }
  });

  // ── game:defender_response ───────────────────────────────────
  socket.on('game:defender_response', (data: { roomCode: string; action: GameAction }) => {
    try {
      handleDefenderResponse(io, socket, socket.data.playerId || socket.id, data);
    } catch (err) {
      console.error('[game:defender_response] error:', err);
      socket.emit('game:error', {
        code: 'INTERNAL_ERROR',
        message: 'Error interno al procesar la respuesta del defensor.',
      });
    }
  });

  // ── game:request_sync ───────────────────────────────────────
  socket.on('game:request_sync', (data: string | { roomCode: string; playerId?: string }) => {
    try {
      // Support both old (string) and new ({ roomCode, playerId }) formats
      const roomCode = typeof data === 'string' ? data : data.roomCode;
      const playerId = typeof data === 'string' ? undefined : data.playerId;

      // Cancel any pending disconnect grace period for this player
      if (playerId && cancelDisconnectGracePeriod(playerId)) {
        console.log(`[game:request_sync] player ${playerId.slice(0, 8)} reconnected to ${roomCode}`);
      }

      const engine = gameRegistry.getGame(roomCode);
      if (engine) {
        const state = engine.getState();
        socket.emit('game:state_update', state);
        console.log(`[game:request_sync] synced ${roomCode} — phase ${state.phase}`);
      }
    } catch (err) {
      console.error('[game:request_sync] error:', err);
    }
  });
}

// ─── Handler implementations ────────────────────────────────────

/**
 * room:start_game — Host starts the game.
 *
 * Flow:
 *  1. Validate the room exists, is full, and the requester is host
 *  2. Create a GameEngine instance and register it
 *  3. Update room status to "playing"
 *  4. Emit game:state_update (shows draft phase) + room events
 */
function handleStartGame(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  playerId: string,
  rooms: RoomMap,
  roomCode: string
): void {
  // ── Find room by code ──────────────────────────────────────
  const room = Array.from(rooms.values()).find(
    (r) => r.code === roomCode.toUpperCase() && r.status === 'waiting'
  );

  if (!room) {
    socket.emit('game:error', {
      code: 'ROOM_NOT_FOUND',
      message: 'Sala no encontrada o la partida ya comenzó.',
    });
    return;
  }

  // ── Verify host ────────────────────────────────────────────
  const hostPlayer = room.players.find((p) => p.isHost);
  if (!hostPlayer || hostPlayer.id !== playerId) {
    socket.emit('game:error', {
      code: 'NOT_HOST',
      message: 'Solo el anfitrión puede iniciar la partida.',
    });
    return;
  }

  // ── Verify two players ─────────────────────────────────────
  if (room.players.length !== 2) {
    socket.emit('game:error', {
      code: 'NOT_ENOUGH_PLAYERS',
      message: 'Se necesitan 2 jugadores para iniciar la partida.',
    });
    return;
  }

  const player1Id = room.players[0].id;
  const player2Id = room.players[1].id;

  // ── Create game engine ─────────────────────────────────────
  const engine = gameRegistry.createGame(roomCode, room.id, player1Id, player2Id);

  // ── Update room status ─────────────────────────────────────
  room.status = 'playing';
  room.updatedAt = new Date().toISOString();

  // ── Emit initial game state (DRAFT phase) ──────────────────
  const state = engine.getState();
  io.to(room.id).emit('game:state_update', state);

  // ── Emit room update events ────────────────────────────────
  io.to(room.id).emit('room:updated', { room });
  io.to(room.id).emit('room:event', { type: 'game_started' });

  console.log(`[game:start_game] ${room.code} (${room.id}) — game started`);
}

/**
 * game:action — A player submits any game action.
 *
 * Flow:
 *  1. Look up the game from the registry
 *  2. Call engine.handleAction()
 *  3. If error → emit game:error to the sender
 *  4. If success → broadcast game:state_update to both players
 *  5. If defender window needed → emit game:defender_window to the defender
 *  6. If extra turn (Máquina del Tiempo) → state already reflects same player
 *  7. If game over → emit game:over and clean up
 */
function handleGameAction(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  playerId: string,
  data: { roomCode: string; action: GameAction }
): void {
  const engine = gameRegistry.getGame(data.roomCode);
  if (!engine) {
    socket.emit('game:error', {
      code: 'GAME_NOT_FOUND',
      message: 'Partida no encontrada.',
    });
    return;
  }

  // ── Execute the action ─────────────────────────────────────
  const result = engine.handleAction(playerId, data.action);

  if (!result.success) {
    socket.emit('game:error', result.error!);
    return;
  }

  // ── Resolve state to broadcast ─────────────────────────────
  // The engine may have set state directly, or we need to fetch it
  const state = result.state || engine.getState();
  const roomId = gameRegistry.getRoomId(data.roomCode);
  if (!roomId) {
    socket.emit('game:error', {
      code: 'ROOM_NOT_FOUND',
      message: 'Sala no encontrada al emitir state_update.',
    });
    return;
  }

  // ── Broadcast updated state to both players ────────────────
  io.to(roomId).emit('game:state_update', state);
  console.log(
    `[game:action] ${data.action.type} — room ${data.roomCode}, phase ${state.phase}`
  );

  // ── Defender window ────────────────────────────────────────
  if (result.defenderWindow && state.pendingAttack) {
    const defenderPlayerId =
      state.players[state.pendingAttack.targetPlayerIndex].playerId;

    // Find the defender's socket(s) and emit the window notification
    const defenderSockets = Array.from(io.sockets.sockets.values()).filter(
      (s) => (s.data.playerId || s.id) === defenderPlayerId
    );

    for (const defSocket of defenderSockets) {
      defSocket.emit('game:defender_window', {
        pendingAttack: state.pendingAttack,
        timeoutMs: 30_000,
      });
    }

    console.log(
      `[game:action] defender_window opened for ${defenderPlayerId} — ` +
        `${state.pendingAttack.attackerId} → ${state.pendingAttack.targetId}`
    );
  }

  // ── Game over ──────────────────────────────────────────────
  if (result.gameOver) {
    io.to(roomId).emit('game:over', state);
    gameRegistry.removeGame(data.roomCode);
    console.log(`[game:over] ${data.roomCode} — winner: ${state.winner}`);
  }
}

/**
 * game:defender_response — The defender responds to a pending attack.
 *
 * Flow:
 *  1. Look up the game
 *  2. Call engine.handleDefenderResponse()
 *  3. Broadcast game:state_update
 *  4. If game over → emit game:over and clean up
 */
function handleDefenderResponse(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  playerId: string,
  data: { roomCode: string; action: GameAction }
): void {
  const engine = gameRegistry.getGame(data.roomCode);
  if (!engine) {
    socket.emit('game:error', {
      code: 'GAME_NOT_FOUND',
      message: 'Partida no encontrada.',
    });
    return;
  }

  // ── Execute the defender response ──────────────────────────
  const result = engine.handleAction(playerId, data.action);

  if (!result.success) {
    socket.emit('game:error', result.error!);
    return;
  }

  // ── Broadcast updated state ────────────────────────────────
  const state = result.state || engine.getState();
  const roomId = gameRegistry.getRoomId(data.roomCode);
  if (!roomId) {
    socket.emit('game:error', {
      code: 'ROOM_NOT_FOUND',
      message: 'Sala no encontrada al responder defensa.',
    });
    return;
  }

  io.to(roomId).emit('game:state_update', state);

  // ── Game over after defense resolves ───────────────────────
  if (result.gameOver) {
    io.to(roomId).emit('game:over', state);
    gameRegistry.removeGame(data.roomCode);
    console.log(`[game:over] ${data.roomCode} — winner: ${state.winner}`);
  }

  console.log(
    `[game:defender_response] ${data.roomCode} — ${state.phase}`
  );
}

// ─── Grace period for reconnection ──────────────────────────────

/** Timers keyed by playerId — game stays alive while the timer is pending */
const disconnectTimers = new Map<string, NodeJS.Timeout>();
const DISCONNECT_GRACE_MS = 60_000; // 60 seconds to reconnect

/**
 * Cancel the disconnect grace period for a reconnecting player.
 * Called from game:request_sync when the server detects a reconnection.
 *
 * @returns true if the player had a pending disconnect timer (was in grace period).
 */
export function cancelDisconnectGracePeriod(playerId: string): boolean {
  const timer = disconnectTimers.get(playerId);
  if (!timer) return false;

  clearTimeout(timer);
  disconnectTimers.delete(playerId);
  console.log(`[game:reconnect] player ${playerId.slice(0, 8)} reconnected — grace cancelled`);
  return true;
}

// ─── Disconnect helper (called FROM index.ts disconnect handler) ──

/**
 * Handle a player disconnection during an active game.
 *
 * Instead of immediately ending the game, starts a 60-second grace
 * period. If the player reconnects (via game:request_sync) within that
 * time, the game continues. If the timer expires, the game ends and
 * the opposing player wins.
 *
 * @returns true if the player was in a game (grace timer started).
 */
export function handleGameDisconnect(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  playerId: string
): boolean {
  const game = gameRegistry.getGameByPlayer(playerId);
  if (!game) return false;

  const { engine, roomCode, roomId } = game;
  const state = engine.getState();

  const opponentPlayerId =
    state.players[0].playerId === playerId
      ? state.players[1].playerId
      : state.players[0].playerId;

  // If there's already a pending timer for this player, don't start another
  if (disconnectTimers.has(playerId)) {
    console.log(`[game:disconnect] player ${playerId.slice(0, 8)} already in grace period`);
    return true;
  }

  console.log(
    `[game:disconnect] player ${playerId.slice(0, 8)} disconnected — ` +
    `grace period ${DISCONNECT_GRACE_MS / 1000}s for ${roomCode}`
  );

  const timer = setTimeout(() => {
    disconnectTimers.delete(playerId);

    // Game might have been removed already during the grace period
    const gameAfterWait = gameRegistry.getGameByPlayer(playerId);
    if (!gameAfterWait) return;

    const { engine: e, roomCode: rc, roomId: rid } = gameAfterWait;
    const finalState = e.getState();
    finalState.winner = opponentPlayerId;
    finalState.phase = 'GAME_OVER';

    io.to(rid).emit('game:over', finalState);
    io.to(rid).emit('room:event', {
      type: 'game_ended',
      winnerId: opponentPlayerId,
    });

    gameRegistry.removeGame(rc);

    console.log(
      `[game:disconnect] grace expired — ${rc} ended. ` +
      `Winner: ${opponentPlayerId.slice(0, 8)}`
    );
  }, DISCONNECT_GRACE_MS);

  disconnectTimers.set(playerId, timer);
  return true;
}
