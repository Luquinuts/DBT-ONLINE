'use client';

import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@dbt-online/shared';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (socket) {
    socket.auth = { token };
    if (socket.connected) {
      socket.disconnect();
      socket.connect();
    }
  }
}

export function getSocket() {
  if (!socket) {
    socket = io(BACKEND_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: { token: authToken },
    });
  }
  return socket;
}

export function connect() {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnect() {
  if (socket?.connected) {
    socket.disconnect();
  }
}
