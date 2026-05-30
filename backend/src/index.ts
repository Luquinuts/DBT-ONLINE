import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuid } from 'uuid';
import { supabase } from './db/client';
import friendsRouter from './routes/friends';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  Room,
  Player,
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

// ─── Socket.IO ─────────────────────────────────────────────────

io.on('connection', (socket) => {
  const userId = socket.data.supabaseUserId;
  console.log(`[connect] ${socket.id}${userId ? ` (user:${userId.slice(0,8)})` : ''}`);

  // ── Crear sala ─────────────────────────────────────────────
  socket.on('room:create', ({ name, maxPlayers, isPublic = true }) => {
    const code = generateCode();
    const room: RoomStore = {
      id: uuid(),
      code,
      name,
      status: 'waiting',
      players: [],
      maxPlayers: 2,
      hostUserId: userId ?? socket.id,
      isPublic,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    rooms.set(room.id, room);
    socket.data.roomId = room.id;

    socket.join(room.id);
    console.log(`[room:create] ${room.id} (${code}) público:${isPublic}`);

    io.to(room.id).emit('room:updated', { room });
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
  socket.on('room:leave', () => handleLeave(socket));
  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);
    handleLeave(socket);
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
