import type { GameStateManager } from '../../state/GameState';
import type { EffectResult } from '../EffectTypes';

/**
 * Báculo Sagrado (direct_damage:1).
 *
 * Deals 1 direct damage to a target character. Does NOT end the turn.
 * Can break shields before dealing damage. Can be used even if the player
 * has already attacked this turn.
 *
 * Behavior:
 * - Deals 1 damage to the target
 * - Breaks shield first (if equipped) — the shield is removed but damage still goes through
 * - Does NOT end the turn (unlike normal attacks)
 * - Can target either the opponent's character or your own
 * - Handles A17&A18 dual-HP pool damage
 *
 * Effect format: `direct_damage:1`
 */
export function handleBaculoSagrado(
  state: GameStateManager,
  playerIndex: number,
  _cardEffect: string,
  targetCharacterId?: string
): EffectResult {
  if (!targetCharacterId) {
    return { success: false, error: 'Báculo Sagrado requires a target character.' };
  }

  // Resolve target — can be opponent's (default) or own character
  const targetPlayerIndex = playerIndex === 0 ? 1 : 0;
  let target = state.getCharacter(targetPlayerIndex, targetCharacterId);
  let actualPlayerIndex = targetPlayerIndex;

  if (!target) {
    target = state.getCharacter(playerIndex, targetCharacterId);
    actualPlayerIndex = playerIndex;
  }

  if (!target) {
    return { success: false, error: `Target '${targetCharacterId}' not found.` };
  }

  if (!target.isAlive) {
    return { success: false, error: 'Target is already dead.' };
  }

  const amount = 1; // Báculo Sagrado always deals 1 damage

  // Break shield first (Báculo Sagrado breaks shields before dealing damage)
  if (target.shieldEquipped) {
    target.shieldEquipped = false;
    state.addLog('SHIELD_BROKEN', `Báculo Sagrado broke ${targetCharacterId}'s shield.`);
  }

  // Apply damage — handle A17&A18 dual-HP pool
  if (target.characterId === 'a17-a18') {
    applyAndroidDamage(state, actualPlayerIndex, target, amount);
  } else {
    target.currentVida = Math.max(0, target.currentVida - amount);
    if (target.currentVida <= 0) {
      state.killCharacter(actualPlayerIndex, targetCharacterId);
      state.addLog('DIRECT_KILL', `${targetCharacterId} killed by Báculo Sagrado.`);
    }
  }

  state.addLog('DIRECT_DAMAGE', `Báculo Sagrado: ${amount} damage to ${targetCharacterId}.`);
  return { success: true, damageDealt: amount };
}

/**
 * Apply the correct split damage to A17&A18's dual-HP pools.
 */
function applyAndroidDamage(
  state: GameStateManager,
  playerIndex: number,
  targetState: import('@dbt-online/shared').CharacterState,
  damage: number
): void {
  if (
    targetState.androide17Vida === undefined ||
    targetState.androide18Vida === undefined
  ) {
    targetState.currentVida = Math.max(0, targetState.currentVida - damage);
    if (targetState.currentVida <= 0) state.killCharacter(playerIndex, targetState.characterId);
    return;
  }

  // Split damage evenly between the two androids
  const halfDamage = Math.ceil(damage / 2);
  const remaining = damage - halfDamage;

  targetState.androide17Vida = Math.max(0, targetState.androide17Vida - halfDamage);
  targetState.androide18Vida = Math.max(0, targetState.androide18Vida - remaining);

  const totalRemaining =
    (targetState.androide17Vida ?? 0) + (targetState.androide18Vida ?? 0);

  if (totalRemaining <= 0) {
    targetState.currentVida = 0;
    state.killCharacter(playerIndex, targetState.characterId);
  } else {
    targetState.currentVida = totalRemaining;
  }
}
