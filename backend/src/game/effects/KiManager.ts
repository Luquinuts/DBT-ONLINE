import type { GameStateManager } from '../state/GameState';

/**
 * Manages ki accumulation and spending for players.
 * Called by CardEffectEngine and GameEngine.
 */
export class KiManager {
  /**
   * Add ki to a player's pool.
   */
  addKi(state: GameStateManager, playerIndex: number, amount: number): void {
    const player = state.getPlayer(playerIndex);
    player.ki += amount;
  }

  /**
   * Spend ki from a player's pool.
   * Returns false if insufficient ki.
   */
  spendKi(state: GameStateManager, playerIndex: number, amount: number): boolean {
    const player = state.getPlayer(playerIndex);
    if (player.ki < amount) return false;
    player.ki -= amount;
    return true;
  }

  /**
   * Check if a player can afford a ki cost.
   */
  canAfford(state: GameStateManager, playerIndex: number, amount: number): boolean {
    return state.getPlayer(playerIndex).ki >= amount;
  }
}
