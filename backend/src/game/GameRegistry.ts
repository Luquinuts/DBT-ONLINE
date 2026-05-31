import { GameEngine } from './engine/GameEngine';

interface GameRegistryEntry {
  engine: GameEngine;
  roomId: string;
}

/**
 * In-memory registry of active game instances.
 *
 * Games are keyed by room code (the short alphanumeric code like "AB12CD")
 * so the socket handlers can look up a game from the room code sent in events.
 *
 * Singleton — export the `gameRegistry` instance directly.
 */
class GameRegistry {
  private entries = new Map<string, GameRegistryEntry>();

  /**
   * Create a new game engine and register it.
   *
   * @param roomCode - Short room code shared by players
   * @param roomId   - Internal room UUID (socket.io room)
   * @param player1Id - Socket ID of player 1 (host)
   * @param player2Id - Socket ID of player 2 (joiner)
   */
  createGame(
    roomCode: string,
    roomId: string,
    player1Id: string,
    player2Id: string
  ): GameEngine {
    const engine = new GameEngine(roomCode, player1Id, player2Id);
    this.entries.set(roomCode, { engine, roomId });
    return engine;
  }

  /** Look up a game by its room code. */
  getGame(roomCode: string): GameEngine | undefined {
    return this.entries.get(roomCode)?.engine;
  }

  /** Get the room UUID (socket.io room) for a game. */
  getRoomId(roomCode: string): string | undefined {
    return this.entries.get(roomCode)?.roomId;
  }

  /** Remove a game from the registry (game over, disconnect, etc.). */
  removeGame(roomCode: string): void {
    this.entries.delete(roomCode);
  }

  /**
   * Find an active game by a player's socket ID.
   * Used during disconnect to look up the game without the room code.
   */
  getGameByPlayer(playerId: string): { engine: GameEngine; roomCode: string; roomId: string } | undefined {
    for (const [roomCode, entry] of this.entries) {
      const state = entry.engine.getState();
      if (
        state.players[0].playerId === playerId ||
        state.players[1].playerId === playerId
      ) {
        return { engine: entry.engine, roomCode, roomId: entry.roomId };
      }
    }
    return undefined;
  }

  /** Check if a game exists for the given room code. */
  hasGame(roomCode: string): boolean {
    return this.entries.has(roomCode);
  }

  /** Number of active games. */
  get size(): number {
    return this.entries.size;
  }
}

export const gameRegistry = new GameRegistry();
