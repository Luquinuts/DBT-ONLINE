import type { GameStateManager } from '../state/GameState';
import type { EventBus } from '../hooks/EventBus';
import type { CharacterState, BattlefieldDef } from '@dbt-online/shared';

export interface CombatResult {
  success: boolean;
  error?: string;
  damageDealt: number;
  targetKilled: boolean;
  attackerCharacterId: string;
  targetCharacterId: string;
  shieldBroken: boolean;
  esquiveApplied: boolean;
  counterDamage: number; // damage dealt to attacker via passives (Gotenks)
  logEntry: string;
  // Kid Buu double-hit flag
  isDoubleHit?: boolean;
}

/**
 * Handles damage calculation and combat resolution.
 *
 * Combat flow:
 * 1. Calculate base damage = attacker's currentAtaque (or definitiva damage)
 * 2. Apply battlefield modifiers
 * 3. Check defender's shield — if shielded, shield blocks, shield removed
 * 4. Check defender's passive auto-dodge
 * 5. If not blocked: apply damage to target's currentVida
 * 6. Check counter-damage passives (SSJ3 Gotenks)
 * 7. Check if character died → trigger death events
 * 8. After attack: reset attacker's advanceCounter to 0
 * 9. Log the combat result
 */
export class CombatResolver {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Resolve an attack from attacker to target.
   *
   * @param state - Game state manager
   * @param attackerPlayerIndex - Index of the attacking player
   * @param attackerId - Character ID of the attacker
   * @param targetPlayerIndex - Index of the defending player
   * @param targetId - Character ID of the target
   * @param attackType - NORMAL or DEFINITIVA
   * @param isUltimateAttack - Whether this is from an ULTIMATE card
   * @param defenderShield - Whether target has shield equipped
   * @param defenderEsquive - Whether esquive defense is applied
   * @returns Combat result
   */
  resolveAttack(
    state: GameStateManager,
    attackerPlayerIndex: number,
    attackerId: string,
    targetPlayerIndex: number,
    targetId: string,
    attackType: 'NORMAL' | 'DEFINITIVA',
    isUltimateAttack: boolean,
    defenderShield: boolean,
    defenderEsquive: boolean
  ): CombatResult {
    const attacker = state.getCharacter(attackerPlayerIndex, attackerId);
    const target = state.getCharacter(targetPlayerIndex, targetId);

    if (!attacker) {
      return {
        success: false,
        error: `Attacker '${attackerId}' not found.`,
        damageDealt: 0,
        targetKilled: false,
        attackerCharacterId: attackerId,
        targetCharacterId: targetId,
        shieldBroken: false,
        esquiveApplied: false,
        counterDamage: 0,
        logEntry: 'Attack failed: attacker not found',
      };
    }

    if (!target) {
      return {
        success: false,
        error: `Target '${targetId}' not found.`,
        damageDealt: 0,
        targetKilled: false,
        attackerCharacterId: attackerId,
        targetCharacterId: targetId,
        shieldBroken: false,
        esquiveApplied: false,
        counterDamage: 0,
        logEntry: 'Attack failed: target not found',
      };
    }

    if (!target.isAlive) {
      return {
        success: false,
        error: `Target '${targetId}' is already dead.`,
        damageDealt: 0,
        targetKilled: false,
        attackerCharacterId: attackerId,
        targetCharacterId: targetId,
        shieldBroken: false,
        esquiveApplied: false,
        counterDamage: 0,
        logEntry: 'Attack failed: target already dead',
      };
    }

    if (!attacker.isAlive) {
      return {
        success: false,
        error: `Attacker '${attackerId}' is dead.`,
        damageDealt: 0,
        targetKilled: false,
        attackerCharacterId: attackerId,
        targetCharacterId: targetId,
        shieldBroken: false,
        esquiveApplied: false,
        counterDamage: 0,
        logEntry: 'Attack failed: attacker is dead',
      };
    }

    // ── Step 1: Check battlefield attack restrictions ─────────
    const battlefield = state.getState().battlefield;
    if (battlefield) {
      const bfEffect = battlefield.effect;

      // no_definitivas: definitiva attacks are forbidden
      if (bfEffect === 'no_definitivas' && attackType === 'DEFINITIVA') {
        return {
          success: false,
          error: 'Definitivas are forbidden by the current battlefield (Tenkaichi Budokai).',
          damageDealt: 0,
          targetKilled: false,
          attackerCharacterId: attackerId,
          targetCharacterId: targetId,
          shieldBroken: false,
          esquiveApplied: false,
          counterDamage: 0,
          logEntry: 'Attack blocked by battlefield: no_definitivas',
        };
      }

      // attack_front_only: can only target the character at the same position
      if (bfEffect === 'attack_front_only') {
        const attackerIdx = state.getPlayer(attackerPlayerIndex).characters.indexOf(attacker);
        const targetIdx = state.getPlayer(targetPlayerIndex).characters.indexOf(target);
        if (attackerIdx !== targetIdx) {
          return {
            success: false,
            error: `Cell Games: ${attackerId} can only attack the character in front (position ${attackerIdx}).`,
            damageDealt: 0,
            targetKilled: false,
            attackerCharacterId: attackerId,
            targetCharacterId: targetId,
            shieldBroken: false,
            esquiveApplied: false,
            counterDamage: 0,
            logEntry: 'Attack blocked by battlefield: attack_front_only',
          };
        }
      }
    }

    // ── Step 2: Calculate base damage ──────────────────────────
    let baseDamage: number;

    if (attackType === 'DEFINITIVA') {
      // Check if it's Beerus Hakai (INFINITE)
      const attackerDef = state.getCharacterDef(attackerId);
      if (
        attackerDef?.abilities?.definitiva?.damage === 'INFINITE'
      ) {
        baseDamage = 9999; // Effectively infinite = instant kill
      } else {
        baseDamage = attackerDef?.abilities?.definitiva?.damage ?? attacker.currentAtaque;
      }
    } else {
      baseDamage = attacker.currentAtaque;
    }

    // ── Step 3: Battlefield attack stat modifiers ──────────────
    // Battlefield effects like "attack:2" (Beerus Planet) are applied
    // by FieldEffectEngine to all characters' currentAtaque when the
    // battlefield is set. The stats are already modified by this point,
    // so baseDamage already includes the bonus.
    //
    // If FieldEffectEngine wasn't called (e.g. battlefield set without
    // modifier application), this is a safety check to add the bonus.
    if (battlefield && !defenderEsquive) {
      const bfBase = battlefield.effect.split(':')[0];
      if (bfBase === 'attack') {
        const bonus = parseInt(battlefield.effect.split(':')[1] || '2', 10);
        baseDamage += bonus;
        state.addLog('FIELD_ATK_BONUS', `Beerus Planet: +${bonus} attack bonus applied.`);
      }
    }

    // ── Step 4: Check shield ────────────────────────────────────
    let shieldBroken = false;
    if (defenderShield) {
      // Shield blocks ANY attack (after esquive check passes, shield blocks the rest)
      target.shieldEquipped = false;
      shieldBroken = true;
      // Don't apply damage — shield absorbs it
      attacker.advanceCounter = 0;
      attacker.hasAttackedThisTurn = true;

      // Emit post_damage for passive triggers
      this.eventBus.emit(
        'post_damage',
        state,
        attackerPlayerIndex,
        targetPlayerIndex,
        targetId
      );

      const logEntry = `Player ${attackerPlayerIndex}'s ${attackerId} attacked ${targetId} — blocked by shield (${attackType})`;
      state.addLog('ATTACK_BLOCKED', logEntry);

      return {
        success: true,
        damageDealt: 0,
        targetKilled: false,
        attackerCharacterId: attackerId,
        targetCharacterId: targetId,
        shieldBroken: true,
        esquiveApplied: false,
        counterDamage: 0,
        logEntry,
      };
    }

    // ── Step 5: Check esquive ──────────────────────────────────
    if (defenderEsquive && attackType === 'NORMAL') {
      // Esquive only blocks normal attacks
      attacker.advanceCounter = 0;
      attacker.hasAttackedThisTurn = true;

      this.eventBus.emit(
        'post_damage',
        state,
        attackerPlayerIndex,
        targetPlayerIndex,
        targetId
      );

      const logEntry = `Player ${attackerPlayerIndex}'s ${attackerId} attacked ${targetId} — esquived!`;
      state.addLog('ATTACK_ESQUIVED', logEntry);

      return {
        success: true,
        damageDealt: 0,
        targetKilled: false,
        attackerCharacterId: attackerId,
        targetCharacterId: targetId,
        shieldBroken: false,
        esquiveApplied: true,
        counterDamage: 0,
        logEntry,
      };
    }

    // Esquive doesn't work against definitivas (but shield does)
    if (defenderEsquive && attackType === 'DEFINITIVA') {
      // Esquive fails against definitiva — proceed with normal damage
      state.addLog(
        'ESQUIVE_FAILED',
        `Esquive failed against definitiva attack on ${targetId}`
      );
    }

    // ── Step 6: Apply damage ───────────────────────────────────
    // Emit pre_damage
    this.eventBus.emit(
      'pre_damage',
      state,
      attackerPlayerIndex,
      targetPlayerIndex,
      attackerId,
      targetId,
      baseDamage
    );

    let damageDealt = baseDamage;
    let targetKilled = false;

    // Apply damage — handle A17&A18 separately
    if (target.characterId === 'a17-a18') {
      damageDealt = this.applyDamageToAndroid(state, target, targetPlayerIndex, baseDamage);
    } else {
      target.currentVida = Math.max(0, target.currentVida - damageDealt);
      if (target.currentVida <= 0) {
        state.killCharacter(targetPlayerIndex, targetId);
        targetKilled = true;
      }
    }

    // Check for A17&A18 death (both die if one falls below thresholds)
    if (target.characterId === 'a17-a18' && (target.isAlive as boolean) === false) {
      targetKilled = true;
    }

    // ── Step 7: Check counter-damage (SSJ3 Gotenks) ───────────
    let counterDamage = 0;
    if (!defenderEsquive) {
      // Check if target has COUNTER_DAMAGE passive
      const targetDef = state.getCharacterDef(targetId);
      if (
        targetDef?.abilities?.pasiva?.type === 'COUNTER_DAMAGE' &&
        targetDef.abilities.pasiva.value
      ) {
        counterDamage = targetDef.abilities.pasiva.value;
        // Apply counter damage to attacker
        attacker.currentVida = Math.max(0, attacker.currentVida - counterDamage);
        if (attacker.currentVida <= 0) {
          state.killCharacter(attackerPlayerIndex, attackerId);
        }
        state.addLog(
          'COUNTER_DAMAGE',
          `${targetId} deals ${counterDamage} counter-damage to ${attackerId}`
        );
      }
    }

    // ── Step 8: Emit post_damage for registered passives ──────
    this.eventBus.emit(
      'post_damage',
      state,
      attackerPlayerIndex,
      targetPlayerIndex,
      targetId
    );

    // ── Step 9: Reset attacker's advanceCounter ────────────────
    attacker.advanceCounter = 0;
    attacker.hasAttackedThisTurn = true;

    // Build log
    const dmgDesc = baseDamage >= 9999 ? 'INFINITE' : `${baseDamage}`;
    const logEntry = `Player ${attackerPlayerIndex}'s ${attackerId} deals ${dmgDesc} damage to ${targetId} (${attackType})${targetKilled ? ' — KILL!' : ''}`;
    state.addLog(targetKilled ? 'ATTACK_KILL' : 'ATTACK', logEntry);

    return {
      success: true,
      damageDealt,
      targetKilled,
      attackerCharacterId: attackerId,
      targetCharacterId: targetId,
      shieldBroken: false,
      esquiveApplied: false,
      counterDamage,
      logEntry,
    };
  }

  /**
   * Special damage handling for A17&A18 dual-HP pool.
   * Damage is split between the two androids.
   * When one android is fully depleted, that one "dies" but the other survives.
   * When both are depleted, the character dies entirely.
   */
  private applyDamageToAndroid(
    state: GameStateManager,
    targetState: CharacterState,
    playerIndex: number,
    damage: number
  ): number {
    if (
      targetState.androide17Vida === undefined ||
      targetState.androide18Vida === undefined
    ) {
      // Fallback to normal damage
      targetState.currentVida = Math.max(0, targetState.currentVida - damage);
      if (targetState.currentVida <= 0) state.killCharacter(playerIndex, targetState.characterId);
      return damage;
    }

    // Split damage between the two
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

    return damage;
  }

  /**
   * Check if Kid Buu is the target and hit it twice.
   * Kid Buu passive: attacks hit twice to the SAME target.
   * This should be called after resolveAttack if the target is Kid Buu.
   */
  applyKidBuuDoubleHit(
    state: GameStateManager,
    attackerPlayerIndex: number,
    attackerId: string,
    targetPlayerIndex: number,
    targetId: string,
    attackType: 'NORMAL' | 'DEFINITIVA',
    isUltimateAttack: boolean
  ): CombatResult | null {
    const target = state.getCharacter(targetPlayerIndex, targetId);
    if (!target || target.characterId !== 'kid-buu' || !target.isAlive) {
      return null;
    }

    // The second hit doesn't deal with shield/esquive (already resolved in first hit)
    // Apply just the damage portion
    const attacker = state.getCharacter(attackerPlayerIndex, attackerId);
    if (!attacker) return null;

    // Check the charDef for kid buu to get the passive
    const kidBuuDef = state.getCharacterDef('kid-buu');
    if (!kidBuuDef?.abilities?.pasiva) return null;

    // Apply second hit damage (same as first)
    const baseDamage = attackType === 'DEFINITIVA'
      ? (state.getCharacterDef(attackerId)?.abilities?.definitiva?.damage as number) ?? attacker.currentAtaque
      : attacker.currentAtaque;

    target.currentVida = Math.max(0, target.currentVida - baseDamage);
    if (target.currentVida <= 0) {
      state.killCharacter(targetPlayerIndex, targetId);
    }

    state.addLog(
      'KID_BUU_DOUBLE',
      `Kid Buu hit twice! Second hit deals ${baseDamage} damage.`
    );

    return {
      success: true,
      damageDealt: baseDamage,
      targetKilled: !target.isAlive,
      attackerCharacterId: attackerId,
      targetCharacterId: targetId,
      shieldBroken: false,
      esquiveApplied: false,
      counterDamage: 0,
      isDoubleHit: true,
      logEntry: `Kid Buu double-hit: ${baseDamage} additional damage`,
    };
  }
}
