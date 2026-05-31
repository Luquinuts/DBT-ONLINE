import type { GameStateManager } from '../../state/GameState';
import type { EffectResult } from '../EffectTypes';

/**
 * +1 Vida (hp:1).
 *
 * Equipable card that permanently increases a character's max HP by 1.
 * Also heals the character by 1 (currentVida follows maxVida).
 *
 * Behavior:
 * - Max 1 equipable per turn (enforced by TurnManager via hasPlayedEquipableThisTurn)
 * - Increases both maxVida and currentVida by 1
 *
 * Effect format: `hp:1`
 */
export function handlePlusVida(
  state: GameStateManager,
  playerIndex: number,
  _cardEffect: string,
  targetCharacterId?: string
): EffectResult {
  if (!targetCharacterId) {
    return { success: false, error: '+1 Vida requires a target character.' };
  }

  const char = state.getCharacter(playerIndex, targetCharacterId);
  if (!char) {
    return { success: false, error: `Target '${targetCharacterId}' not found.` };
  }

  if (!char.isAlive) {
    return { success: false, error: 'Cannot apply +1 Vida to a dead character.' };
  }

  char.maxVida += 1;
  char.currentVida = Math.min(char.currentVida + 1, char.maxVida);

  state.addLog('HP_UP', `+1 HP to ${targetCharacterId}. Now ${char.currentVida}/${char.maxVida}`);
  return { success: true };
}
