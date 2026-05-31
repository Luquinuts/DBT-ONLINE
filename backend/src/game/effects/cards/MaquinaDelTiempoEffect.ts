import type { GameStateManager } from '../../state/GameState';
import type { EffectResult } from '../EffectTypes';

/**
 * Máquina del Tiempo (extra_turn).
 *
 * The current player gets 2 consecutive turns. After finishing the current
 * turn normally, the same player goes again instead of switching to the
 * opponent.
 *
 * Behavior:
 * - After the current turn ends, the same player gets another turn
 * - The player draws 1 card at the end of EACH turn (normal end-of-turn draw)
 * - The extra turn is handled by GameEngine/TurnManager via the isExtraTurn flag
 *
 * Effect format: `extra_turn:2`
 */
export function handleMaquinaDelTiempo(
  state: GameStateManager,
  playerIndex: number,
  _cardEffect: string,
  _targetCharacterId?: string
): EffectResult {
  state.addLog('EXTRA_TURN', `Player ${playerIndex} will get an extra turn.`);
  return { success: true, isExtraTurn: true };
}
