import type { GameStateManager } from '../../state/GameState';
import type { EffectResult } from '../EffectTypes';

/**
 * Nave Espacial (reroll_battlefield).
 *
 * Removes the current battlefield and picks a new one randomly from the
 * remaining battlefield pool. All previous battlefield modifiers are removed,
 * and new modifiers from the new battlefield are applied by FieldEffectEngine.
 *
 * Behavior:
 * - Returns `battlefieldRerolled: true` so the engine knows to:
 *   1. Remove current battlefield modifiers
 *   2. Pick a new battlefield (using getRandomBattlefield)
 *   3. Apply new battlefield modifiers
 * - The actual reroll logic is handled by GameEngine/FieldEffectEngine
 *   because FieldEffectEngine needs to manage modifier state
 * - This handler just triggers the process
 *
 * Effect format: `reroll_battlefield`
 */
export function handleNaveEspacial(
  state: GameStateManager,
  playerIndex: number,
  _cardEffect: string,
  _targetCharacterId?: string
): EffectResult {
  state.addLog('BATTLEFIELD_REROLL', 'Nave Espacial used — battlefield will be rerolled.');
  return { success: true, battlefieldRerolled: true };
}
