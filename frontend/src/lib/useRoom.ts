'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { connect, getSocket } from './socket';
import type { Room, Player, RoomEvent } from '@dbt-online/shared';

interface RoomState {
  view: 'home' | 'lobby';
  playerName: string;
  room: Room | null;
  player: Player | null;
  events: RoomEvent[];
  error: string | null;
  connected: boolean;
}

export function useRoom() {
  const [state, setState] = useState<RoomState>({
    view: 'home',
    playerName: '',
    room: null,
    player: null,
    events: [],
    error: null,
    connected: false,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Conectar al montar, desconectar al desmontar
  useEffect(() => {
    const socket = connect();

    const onConnect = () => {
      setState((prev) => ({ ...prev, connected: true, error: null }));
    };

    const onDisconnect = () => {
      setState((prev) => ({ ...prev, connected: false }));
    };

    const onRoomJoined = (data: { room: Room; player: Player }) => {
      setState((prev) => ({
        ...prev,
        view: 'lobby',
        room: data.room,
        player: data.player,
        error: null,
      }));
    };

    const onRoomUpdated = (data: { room: Room }) => {
      setState((prev) => ({ ...prev, room: data.room }));
    };

    const onRoomEvent = (data: RoomEvent) => {
      setState((prev) => ({
        ...prev,
        events: [...prev.events, data],
      }));
    };

    const onError = (data: { message: string }) => {
      setState((prev) => ({ ...prev, error: data.message }));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:joined', onRoomJoined);
    socket.on('room:updated', onRoomUpdated);
    socket.on('room:event', onRoomEvent);
    socket.on('room:error', onError);

    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:joined', onRoomJoined);
      socket.off('room:updated', onRoomUpdated);
      socket.off('room:event', onRoomEvent);
      socket.off('room:error', onError);
    };
  }, []);

  const createRoom = useCallback(
    (name: string, isPublic = true) => {
      const socket = getSocket();
      console.log('[room] createRoom called', { name, isPublic, connected: socket?.connected, playerName: stateRef.current.playerName });
      if (!socket.connected) {
        console.warn('[room] socket not connected, skipping emit');
        return;
      }
      socket.emit('room:create', {
        name,
        playerName: stateRef.current.playerName,
        maxPlayers: 2,
        isPublic,
      });
    },
    []
  );

  const joinRoom = useCallback((code: string) => {
    const socket = getSocket();
    if (!socket.connected) return;
    socket.emit('room:join', {
      code,
      playerName: stateRef.current.playerName,
    });
  }, []);

  const leaveRoom = useCallback(() => {
    const socket = getSocket();
    if (!socket.connected) return;
    socket.emit('room:leave');

    setState((prev) => ({
      ...prev,
      view: 'home',
      room: null,
      player: null,
      events: [],
      error: null,
    }));
  }, []);

  const setPlayerName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, playerName: name }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    createRoom,
    joinRoom,
    leaveRoom,
    setPlayerName,
    clearError,
  };
}
