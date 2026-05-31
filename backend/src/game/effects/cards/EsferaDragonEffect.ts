import type { GameStateManager } from '../../state/GameState';
import type { EffectResult } from '../EffectTypes';

/**
 * Esfera del Dragón (revive:full).
 *
 * Revives a dead character to its FULL initial stats (vida, ataque, lentitud).
 *
 * Behavior:
 * - 1 use per game (enforced by usageLimit on CardDef)
 * - Revives to maxVida = initial vida, currentVida = initial vida
 * - Resets advanceCounter, shieldEquipped, hasAttackedThisTurn, nubeKintonUsed
 * - Habilidad resets on revive (abilityUsedThisGame = false, abilityCooldownRemaining = 0)
 * - If character had dual forms (Rose+Zamasu), both revive
 * - Can target ANY dead character on either player's field
 *
 * Effect format: `revive:full`
 */
export function handleEsferaDragon(
  state: GameStateManager,
  playerIndex: number,
  cardEffect: string,
  targetCharacterId?: string
): EffectResult {
  if (!targetCharacterId) {
    return { success: false, error: 'Esfera del Dragón requires a target character.' };
  }

  // Find the dead character — try current player first, then opponent
  let targetChar = state.getCharacter(playerIndex, targetCharacterId);
  let actualPlayerIndex = playerIndex;

  if (!targetChar || targetChar.isAlive) {
    const oppIdx = playerIndex === 0 ? 1 : 0;
    targetChar = state.getCharacter(oppIdx, targetCharacterId);
    actualPlayerIndex = oppIdx;
  }

  if (!targetChar) {
    return { success: false, error: `Character '${targetCharacterId}' not found.` };
  }

  if (targetChar.isAlive) {
    return { success: false, error: `'${targetCharacterId}' is already alive.` };
  }

  const charDef = state.getCharacterDef(targetCharacterId);
  if (!charDef) {
    return { success: false, error: `Character definition for '${targetCharacterId}' not found.` };
  }

  const reviveType = cardEffect.split(':')[1] || 'full';

  if (reviveType === 'full') {
    // Restore to full initial stats
    targetChar.currentVida = charDef.stats.vida;
    targetChar.maxVida = charDef.stats.vida;
    targetChar.currentAtaque = charDef.stats.ataque;
    targetChar.currentLentitud = charDef.stats.lentitud;
    targetChar.advanceCounter = 0;
    targetChar.shieldEquipped = false;
    targetChar.isAlive = true;
    targetChar.hasAttackedThisTurn = false;
    targetChar.nubeKintonUsed = false;

    // Reset habilidad so it can be used again
    targetChar.abilityUsedThisGame = false;
    targetChar.abilityCooldownRemaining = 0;

    // Handle dual-form characters (Rose+Zamasu)
    // A17&A18 dual-HP pools are also reset
    if (targetCharacterId === 'a17-a18') {
      const halfVida = Math.floor(charDef.stats.vida / 2);
      targetChar.androide17Vida = halfVida;
      targetChar.androide18Vida = charDef.stats.vida - halfVida;
    }

    state.addLog('REVIVE', `${targetCharacterId} revived with full HP via Esfera del Dragón.`);
  } else {
    return { success: false, error: `Unknown revive type: '${reviveType}'.` };
  }

  return { success: true, reviveComplete: true };
}
