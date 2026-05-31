import type { GameStateManager } from '../../state/GameState';
import type { EffectResult } from '../EffectTypes';

/**
 * Escudo (defense:escudo).
 *
 * Equipable shield card that protects a character from ANY attack type
 * (normal, habilidad, definitiva).
 *
 * Behavior:
 * - Must be equipped BEFORE the attack (during your turn, via PLAY_CARD)
 * - Sets `shieldEquipped = true` on the target character
 * - Removed after blocking one attack (handled in CombatResolver)
 * - Blocks any attack type (unlike Esquive which only blocks NORMAL)
 *
 * Effect format: `defense:escudo`
 */
export function handleEscudo(
  state: GameStateManager,
  playerIndex: number,
  cardEffect: string,
  targetCharacterId?: string
): EffectResult {
  if (!targetCharacterId) {
    return { success: false, error: 'Escudo requires a target character.' };
  }

  const target = state.getCharacter(playerIndex, targetCharacterId);
  if (!target) {
    return { success: false, error: `Target '${targetCharacterId}' not found.` };
  }

  if (!target.isAlive) {
    return { success: false, error: 'Cannot equip shield on a dead character.' };
  }

  target.shieldEquipped = true;
  state.addLog('ESCUDO_EQUIP', `Shield equipped on ${targetCharacterId}.`);
  return { success: true };
}
