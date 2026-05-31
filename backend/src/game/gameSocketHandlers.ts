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
  socket.on('game:request_sync', (roomCode: string) => {
    try {
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
  if (!roomId) return;

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
  if (!roomId) return;

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

// ─── Disconnect helper (called FROM index.ts disconnect handler) ──

/**
 * Handle game cleanup when a player disconnects during an active game.
 *
 * This is exported separately so index.ts can call it from its existing
 * disconnect handler without needing to import registerGameHandlers.
 *
 * @returns true if the player was in a game (and it was cleaned up), false otherwise.
 */
export function handleGameDisconnect(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  playerId: string
): boolean {
  const game = gameRegistry.getGameByPlayer(playerId);
  if (!game) return false;

  const { engine, roomCode, roomId } = game;

  // Determine the remaining (winner) player
  const state = engine.getState();
  const opponentPlayerId =
    state.players[0].playerId === playerId
      ? state.players[1].playerId
      : state.players[0].playerId;

  // Emit game:over to the remaining player
  const finalState = engine.getState();
  finalState.winner = opponentPlayerId;
  finalState.phase = 'GAME_OVER';

  io.to(roomId).emit('game:over', finalState);
  io.to(roomId).emit('room:event', {
    type: 'game_ended',
    winnerId: opponentPlayerId,
  });

  // Clean up
  gameRegistry.removeGame(roomCode);

  // Update room status back to 'waiting' or mark as 'finished'
  // (The rooms map is managed by index.ts — this module doesn't have
  //  a reference to it, so room status is handled in the parent.)

  console.log(
    `[game:disconnect] player ${playerId} left — game ${roomCode} ended. ` +
      `Winner: ${opponentPlayerId}`
  );

  return true;
}
