import type { GameStateManager } from '../../state/GameState';
import type { EffectResult } from '../EffectTypes';

/**
 * ULTIMATE (ultimate_attack).
 *
 * All the player's characters can attack without meeting lentitud requirement.
 * This card can be used up to 2 times per game.
 *
 * Behavior:
 * - ALL characters skip the lentitud check for this turn
 * - 2 uses per game total (tracked on PlayerGameState.ultimateUsesRemaining)
 * - Attacks can target different enemies
 * - Shield: one attack can be used to break a shield, another to deal damage
 * - Definitivas CAN be used during ULTIMATE
 * - Esquive only blocks ONE of the attacks (need 3 esquives to block all)
 * - The actual multi-attack flow is handled by GameEngine/TurnManager:
 *   this handler just consumes a use and flags the attack as ultimate
 *
 * Effect format: `ultimate_attack`
 */
export function handleUltimate(
  state: GameStateManager,
  playerIndex: number,
  _cardEffect: string,
  _targetCharacterId?: string
): EffectResult {
  const player = state.getPlayer(playerIndex);

  if (player.ultimateUsesRemaining <= 0) {
    return { success: false, error: 'ULTIMATE can only be used 2 times per game.' };
  }

  player.ultimateUsesRemaining--;

  state.addLog(
    'ULTIMATE',
    `Player ${playerIndex} plays ULTIMATE. ${player.ultimateUsesRemaining} uses remaining.`
  );

  return { success: true, isUltimateAttack: true };
}
