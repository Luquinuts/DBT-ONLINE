import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuid } from 'uuid';
import { supabase } from './db/client';
import { getAuthClient } from './db/auth-client';
import friendsRouter from './routes/friends';
import { registerGameHandlers, handleGameDisconnect } from './game/gameSocketHandlers';
import { gameRegistry } from './game/GameRegistry';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  Room,
  Player,
  UserPresence,
} from '@dbt-online/shared';

// ─── App ───────────────────────────────────────────────────────

const app = express();
const httpServer = createServer(app);

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim());

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// ─── Auth middleware (Socket.IO) ────────────────────────────────

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    // Conexión sin auth — permitimos pero no vinculamos usuario
    socket.data.supabaseUserId = undefined;
    return next();
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return next(new Error('Token inválido'));
  }

  socket.data.supabaseUserId = data.user.id;
  next();
});

// ─── Estado en memoria ─────────────────────────────────────────

interface RoomStore extends Omit<Room, 'maxPlayers'> {
  maxPlayers: 2;
  hostUserId: string; // Supabase user ID del host
  isPublic: boolean;
}

const rooms = new Map<string, RoomStore>();

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─── Presencia en tiempo real ──────────────────────────────────

interface PresenceEntry {
  status: 'online' | 'in_game';
  roomId?: string;
  roomCode?: string;
  roomName?: string;
  socketId: string;
}

/** Mapa efímero: supabaseUserId → presencia (solo usuarios autenticados) */
const presenceMap = new Map<string, PresenceEntry>();

/** Obtiene los IDs de los amigos aceptados de un usuario */
async function getFriendIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('friends')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (!data) return [];

  return data.map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  );
}

/** Emite `presence:friends` a un usuario específico con la lista
 *  de todos sus amigos que están actualmente online. */
async function emitPresenceToUser(targetUserId: string) {
  const friendIds = await getFriendIds(targetUserId);
  const onlineFriendIds = friendIds.filter((id) => presenceMap.has(id));
  if (onlineFriendIds.length === 0) return;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', onlineFriendIds);

  const usernameMap = new Map(
    (profiles || []).map((p) => [p.id, p.username])
  );

  const presences: UserPresence[] = onlineFriendIds.map((id) => {
    const entry = presenceMap.get(id)!;
    return {
      userId: id,
      username: usernameMap.get(id) ?? undefined,
      status: entry.status,
      roomCode: entry.roomCode,
      roomName: entry.roomName,
    };
  });

  const entry = presenceMap.get(targetUserId);
  if (!entry) return;

  const socket = io.sockets.sockets.get(entry.socketId);
  if (socket) {
    socket.emit('presence:friends', { presences });
  }
}

/** Notifica a todos los amigos online de `userId` que su presencia cambió. */
async function broadcastPresenceChange(userId: string) {
  const friendIds = await getFriendIds(userId);
  if (friendIds.length === 0) return;

  for (const friendId of friendIds) {
    if (presenceMap.has(friendId)) {
      await emitPresenceToUser(friendId);
    }
  }
}

// ─── Health check ──────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

// ─── Rutas REST ─────────────────────────────────────────────────

app.use('/api/friends', friendsRouter);

// Auth check básico
app.get('/api/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const { data, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error) return res.status(401).json({ error: error.message });

  res.json({ user: data.user });
});

// ─── GET /api/profiles/:id — perfil público ───────────────────

app.get('/api/profiles/:id', async (req, res) => {
  const { id } = req.params;

  // Usar cliente autenticado si hay token, o caer al anon si no
  const auth = req.headers.authorization;
  const sb = auth?.startsWith('Bearer ')
    ? getAuthClient(auth.slice(7))
    : supabase;

  const { data: profile, error } = await sb
    .from('profiles')
    .select('id, email, username, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });

  // Contar amigos aceptados
  const { count } = await sb
    .from('friends')
    .select('id', { count: 'exact', head: true })
    .or(`requester_id.eq.${id},addressee_id.eq.${id}`)
    .eq('status', 'accepted');

  res.json({
    id: profile.id,
    email: profile.email,
    username: profile.username,
    createdAt: profile.created_at,
    friendCount: count ?? 0,
  });
});

// ─── Socket.IO ─────────────────────────────────────────────────

io.on('connection', async (socket) => {
  const userId = socket.data.supabaseUserId;
  console.log(`[connect] ${socket.id}${userId ? ` (user:${userId.slice(0,8)})` : ''}`);

  // ── Presencia: registrar y notificar amigos ────────────────
  if (userId) {
    presenceMap.set(userId, {
      status: 'online',
      socketId: socket.id,
    });
    try {
      await broadcastPresenceChange(userId);
    } catch (err) {
      console.error('[presence] error al conectar:', err);
    }
  }

  // ── Game event handlers ──────────────────────────────────
  registerGameHandlers(io, socket, rooms);

  // ── Crear sala ─────────────────────────────────────────────
  socket.on('room:create', ({ name, playerName, maxPlayers, isPublic = true }) => {
    const code = generateCode();
    const player: Player = {
      id: socket.id,
      name: playerName || name,
      isHost: true,
      joinedAt: new Date().toISOString(),
    };

    const room: RoomStore = {
      id: uuid(),
      code,
      name,
      status: 'waiting',
      players: [player],
      maxPlayers: 2,
      hostUserId: userId ?? socket.id,
      isPublic,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    rooms.set(room.id, room);
    socket.data.roomId = room.id;
    socket.data.playerId = player.id;

    socket.join(room.id);
    console.log(`[room:create] ${room.id} (${code}) público:${isPublic}`);

    socket.emit('room:joined', { room, player });
    socket.to(room.id).emit('room:updated', { room });

    // Presencia: actualizar estado si es usuario autenticado
    if (userId) {
      const entry = presenceMap.get(userId);
      if (entry) {
        entry.status = 'in_game';
        entry.roomId = room.id;
        entry.roomCode = room.code;
        entry.roomName = room.name;
        broadcastPresenceChange(userId).catch((err) =>
          console.error('[presence] error en room:create:', err)
        );
      }
    }
  });

  // ── Unirse a sala ──────────────────────────────────────────
  socket.on('room:join', ({ code, playerName }) => {
    const room = Array.from(rooms.values()).find(
      (r) => r.code === code.toUpperCase() && r.status === 'waiting'
    );

    if (!room) {
      socket.emit('room:error', { message: 'Sala no encontrada o la partida ya empezó' });
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      socket.emit('room:error', { message: 'La sala está llena' });
      return;
    }

    const player: Player = {
      id: socket.id,
      name: playerName,
      isHost: room.players.length === 0,
      joinedAt: new Date().toISOString(),
    };

    room.players.push(player);
    room.updatedAt = new Date().toISOString();
    socket.data.roomId = room.id;
    socket.data.playerId = player.id;

    socket.join(room.id);
    console.log(`[room:join] ${player.name} → ${room.code}`);

    socket.emit('room:joined', { room, player });
    socket.to(room.id).emit('room:updated', { room });
    socket.to(room.id).emit('room:event', {
      type: 'player_joined',
      player,
    });

    // Presencia: actualizar estado si es usuario autenticado
    if (userId) {
      const entry = presenceMap.get(userId);
      if (entry) {
        entry.status = 'in_game';
        entry.roomId = room.id;
        entry.roomCode = room.code;
        entry.roomName = room.name;
        broadcastPresenceChange(userId).catch((err) =>
          console.error('[presence] error en room:join:', err)
        );
      }
    }
  });

  // ── Listar salas públicas ──────────────────────────────────
  socket.on('room:public_listing', () => {
    const publicRooms = Array.from(rooms.values())
      .filter((r) => r.isPublic && r.status === 'waiting')
      .map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        playerCount: r.players.length,
        maxPlayers: r.maxPlayers,
        hostUserId: r.hostUserId,
      }));

    socket.emit('room:public_list', { rooms: publicRooms });
  });

  // ── Salir de sala ──────────────────────────────────────────
  socket.on('room:leave', () => {
    handleLeave(socket);

    // Presencia: volver a online sin sala
    if (userId) {
      const entry = presenceMap.get(userId);
      if (entry) {
        entry.status = 'online';
        entry.roomId = undefined;
        entry.roomCode = undefined;
        entry.roomName = undefined;
        broadcastPresenceChange(userId).catch((err) =>
          console.error('[presence] error en room:leave:', err)
        );
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);
    handleLeave(socket);

    // ── Game cleanup on disconnect ───────────────────────────
    const dcPlayerId = socket.data.playerId || socket.id;
    if (handleGameDisconnect(io, dcPlayerId)) {
      console.log(`[game:disconnect] game cleaned up for ${dcPlayerId.slice(0, 8)}`);
    }

    // Presencia: remover y notificar amigos
    if (userId) {
      // Guardar friends antes de borrar la entrada
      getFriendIds(userId)
        .then((friendIds) => {
          presenceMap.delete(userId);
          // Notificar a cada amigo online
          for (const friendId of friendIds) {
            if (presenceMap.has(friendId)) {
              emitPresenceToUser(friendId).catch((err) =>
                console.error('[presence] error en disconnect:', err)
              );
            }
          }
        })
        .catch((err) =>
          console.error('[presence] error obteniendo friends en disconnect:', err)
        );
    }
  });

  function handleLeave(socket: any) {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const idx = room.players.findIndex((p) => p.id === socket.id);
    if (idx === -1) return;

    const [player] = room.players.splice(idx, 1);
    room.updatedAt = new Date().toISOString();

    if (room.players.length === 0) {
      rooms.delete(roomId);
      console.log(`[room:close] ${roomId}`);
      return;
    }

    if (player.isHost && room.players.length > 0) {
      room.players[0].isHost = true;
    }

    io.to(roomId).emit('room:updated', { room });
    io.to(roomId).emit('room:event', {
      type: 'player_left',
      playerId: player.id,
    });

    socket.leave(roomId);
    socket.data.roomId = undefined;
  }
});

// ─── Arranque ──────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🎴 DBT Online Server running on port ${PORT}`);
});
