import type { GameStateManager } from '../../state/GameState';
import type { EffectResult } from '../EffectTypes';

/**
 * Rage (rage_boost).
 *
 * PERMANENT effect that lasts for the rest of the game.
 * Sets GameState.rageActive = true. All characters with the `rage` icon
 * get +1 attack permanently.
 *
 * Behavior:
 * - One-time effect that stays active for the remainder of the game
 * - rageActive is set on GameState so other systems can check it
 * - +1 attack is applied to ALL current and future alive rage-icon allies
 *   (since it sets a flag, additional rage-icon characters summoned later
 *    could also benefit — though in this game, all characters are on field)
 *
 * Effect format: `rage_boost`
 */
export function handleRage(
  state: GameStateManager,
  playerIndex: number,
  _cardEffect: string,
  _targetCharacterId?: string
): EffectResult {
  state.setRageActive(true);

  // +1 permanent atk to all alive allies with rage icon
  for (const char of state.getPlayer(playerIndex).characters) {
    if (!char.isAlive) continue;
    const charDef = state.getCharacterDef(char.characterId);
    if (charDef?.icons?.rage) {
      char.currentAtaque += 1;
      state.addLog('RAGE_BOOST', `${char.characterId} gains +1 atk from Rage (now ${char.currentAtaque})`);
    }
  }

  return { success: true };
}
