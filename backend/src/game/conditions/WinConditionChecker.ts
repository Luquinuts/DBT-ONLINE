import type { GameStateManager } from '../state/GameState';

export interface WinCheckResult {
  gameOver: boolean;
  winner: string | null;  // playerId of winner, or null
  reason: string;
}

/**
 * Checks win conditions after every state mutation.
 * A player loses when they have no alive characters.
 * Beerus' Hakai (INFINITE damage) is handled as instant kill in CombatResolver.
 */
export class WinConditionChecker {
  /**
   * Check if the game is over and who won.
   */
  check(state: GameStateManager): WinCheckResult {
    const gs = state.getState();

    // Player 0 has no alive characters
    const p0Alive = state.getAliveCharacters(0);
    const p1Alive = state.getAliveCharacters(1);

    if (p0Alive.length === 0 && p1Alive.length === 0) {
      // Both died simultaneously — draw, but set no winner
      return {
        gameOver: true,
        winner: null,
        reason: 'Both players have no alive characters.',
      };
    }

    if (p0Alive.length === 0) {
      return {
        gameOver: true,
        winner: gs.players[1].playerId,
        reason: 'Player 1 has no alive characters.',
      };
    }

    if (p1Alive.length === 0) {
      return {
        gameOver: true,
        winner: gs.players[0].playerId,
        reason: 'Player 0 has no alive characters.',
      };
    }

    return { gameOver: false, winner: null, reason: '' };
  }

  /**
   * Check if a specific character death triggers game over.
   * Called after a character is killed.
   */
  checkAfterDeath(state: GameStateManager, deadPlayerIndex: number): WinCheckResult {
    const alive = state.getAliveCharacters(deadPlayerIndex);
    if (alive.length > 0) {
      return { gameOver: false, winner: null, reason: '' };
    }

    // This player has no alive characters — they lose
    const gs = state.getState();
    const winnerIndex = deadPlayerIndex === 0 ? 1 : 0;
    return {
      gameOver: true,
      winner: gs.players[winnerIndex].playerId,
      reason: `Player ${deadPlayerIndex} has no alive characters remaining.`,
    };
  }
}
