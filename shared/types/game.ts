import type { Card } from './card';

// ─── Estado del Juego ──────────────────────────────────────────

export type GamePhase =
  | 'dealing'       // Repartiendo cartas
  | 'playing'       // Jugando una ronda
  | 'round_end'     // Fin de ronda
  | 'game_over';    // Alguien ganó

export type GameAction =
  | { type: 'play_card'; card: Card }
  | { type: 'pass' }
  | { type: 'challenge' }   // Ej: truco/envido
  | { type: 'accept' }
  | { type: 'decline' };

export interface PlayedCard {
  playerId: string;
  card: Card;
}

export interface Round {
  number: number;
  plays: PlayedCard[];
  winnerId?: string;
}

export interface GameState {
  roomId: string;
  phase: GamePhase;
  players: PlayerGameState[];
  currentTurn: string;      // playerId del que le toca
  round: Round;
  scores: Record<string, number>;  // playerId → puntos
  winnerId?: string;
  deck: Card[];              // Solo se envía al servidor (null en cliente)
}

export interface PlayerGameState {
  id: string;
  hand: Card[];             // Sus cartas
  cardCount: number;        // Cantidad de cartas (para oponentes)
}

// ─── Resultados de validación ──────────────────────────────────

export interface ActionResult {
  valid: boolean;
  error?: string;
  newState?: GameState;
}
