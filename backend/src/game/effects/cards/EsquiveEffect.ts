import type { GameStateManager } from '../../state/GameState';
import type { EffectResult } from '../EffectTypes';

/**
 * Esquive (defense:esquive).
 *
 * Defensive card used in the defender response window.
 * When played during the action phase (rare), it simply logs the play — the
 * actual blocking logic is handled by CombatResolver during DEFENDER_RESPONSE.
 *
 * Behavior:
 * - Only blocks NORMAL attacks (not habilidades or definitivas)
 * - For ULTIMATE card attacks: only blocks ONE of the attacks
 *   (need 3 esquives to fully block an ULTIMATE all-characters assault)
 */
export function handleEsquive(
  state: GameStateManager,
  playerIndex: number,
  cardEffect: string,
  _targetCharacterId?: string
): EffectResult {
  state.addLog('DEFENSE_PREPPED', `Player ${playerIndex} played Esquive.`);
  return { success: true };
}
