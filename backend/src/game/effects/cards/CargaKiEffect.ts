import type { GameStateManager } from '../../state/GameState';
import type { EffectResult } from '../EffectTypes';

/**
 * Carga de Ki (ki:1) and Super Carga de Ki (ki:2).
 *
 * Adds the parsed amount of ki (from the effect suffix) to the current player's pool.
 *
 * Effect format: `ki:1` or `ki:2`
 *   ki:1 → +1 ki (Carga de Ki)
 *   ki:2 → +2 ki (Super Carga de Ki)
 */
export function handleCargaKi(
  state: GameStateManager,
  playerIndex: number,
  cardEffect: string,
  _targetCharacterId?: string
): EffectResult {
  const amount = parseInt(cardEffect.split(':')[1] || '1', 10);
  const player = state.getPlayer(playerIndex);
  player.ki += amount;
  state.addLog('KI_GAIN', `Player ${playerIndex} gains ${amount} ki. Now: ${player.ki}`);
  return { success: true, kiGained: amount };
}
