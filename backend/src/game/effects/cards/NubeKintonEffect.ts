import type { GameStateManager } from '../../state/GameState';
import type { EffectResult } from '../EffectTypes';

/**
 * Nube Kinton (attack_no_lentitud).
 *
 * Allows the target character to attack without meeting the lentitud
 * (advance) requirement. Effectively sets advanceCounter to lentitud so
 * the character becomes eligible to attack immediately.
 *
 * Behavior:
 * - 1 use per character per game (tracked via CharacterState.nubeKintonUsed)
 * - If the character was already advanced (advanceCounter > 0), they go
 *   back to position 0 after attacking (advanceCounter reset happens in CombatResolver)
 * - The actual attack still needs to be initiated by the player — this card
 *   just makes the character eligible
 *
 * Effect format: `attack_no_lentitud`
 */
export function handleNubeKinton(
  state: GameStateManager,
  playerIndex: number,
  _cardEffect: string,
  targetCharacterId?: string
): EffectResult {
  if (!targetCharacterId) {
    return { success: false, error: 'Nube Kinton requires a target character.' };
  }

  const char = state.getCharacter(playerIndex, targetCharacterId);
  if (!char) {
    return { success: false, error: `Character '${targetCharacterId}' not found.` };
  }

  if (!char.isAlive) {
    return { success: false, error: 'Cannot use Nube Kinton on a dead character.' };
  }

  if (char.nubeKintonUsed) {
    return { success: false, error: `Nube Kinton already used on ${targetCharacterId} this game.` };
  }

  char.nubeKintonUsed = true;

  // Set advanceCounter so the character is immediately eligible to attack
  // If already advanced beyond lentitud, leave it — the counter will reset
  // to 0 after attacking (handled by CombatResolver)
  if (char.advanceCounter < char.currentLentitud) {
    char.advanceCounter = char.currentLentitud;
  }

  state.addLog('NUBE_KINTON', `${targetCharacterId} can attack without lentitud.`);
  return { success: true };
}
