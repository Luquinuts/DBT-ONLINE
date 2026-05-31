import type { GameStateManager } from '../../state/GameState';
import type { EffectResult } from '../EffectTypes';

/**
 * Semilla Senzu (heal:3).
 *
 * Heals the target character by +3 HP, capped at the character's maxVida.
 *
 * Effect format: `heal:3`
 *   The numeric suffix indicates the amount to heal.
 */
export function handleSemillaSenzu(
  state: GameStateManager,
  playerIndex: number,
  cardEffect: string,
  targetCharacterId?: string
): EffectResult {
  if (!targetCharacterId) {
    return { success: false, error: 'Semilla Senzu requires a target character.' };
  }

  const char = state.getCharacter(playerIndex, targetCharacterId);
  if (!char) {
    return { success: false, error: `Target '${targetCharacterId}' not found.` };
  }

  if (!char.isAlive) {
    return { success: false, error: 'Cannot heal a dead character.' };
  }

  const amount = parseInt(cardEffect.split(':')[1] || '3', 10);
  const originalHp = char.currentVida;

  // Heal up to maxVida (initial max)
  char.currentVida = Math.min(char.currentVida + amount, char.maxVida);
  const healed = char.currentVida - originalHp;

  state.addLog('HEAL', `Healed ${targetCharacterId} for ${healed} HP. Now ${char.currentVida}/${char.maxVida}`);
  return { success: true, targetHealed: healed };
}
