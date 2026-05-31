import type { GameStateManager } from '../state/GameState';
import type { BattlefieldDef } from '@dbt-online/shared';

/**
 * Manages applying and removing battlefield modifier effects from characters.
 *
 * Each battlefield has an effect string (e.g. "attack:2", "lentitud:1") that
 * modifies all characters' stats while the battlefield is active.
 *
 * Kid Buu's passive (BATTLEFIELD_NULLIFY) nullifies these effects — checked
 * in EventBus and also here during apply.
 *
 * The engine tracks the previously applied effect so it can be cleanly reverted
 * when the battlefield changes or is cleared.
 */
export class FieldEffectEngine {
  private appliedEffect: string | null = null;
  private currentBattlefieldId: string | null = null;

  /**
   * Check if Kid Buu is alive on either player's field.
   * If so, battlefield modifiers should NOT be applied.
   */
  private hasKidBuuAlive(state: GameStateManager): boolean {
    for (let i = 0; i < 2; i++) {
      const kidBuu = state
        .getPlayer(i)
        .characters.find((c) => c.characterId === 'kid-buu' && c.isAlive);
      if (kidBuu) return true;
    }
    return false;
  }

  /**
   * Apply modifiers from a new battlefield.
   *
   * 1. Removes any previously applied modifiers
   * 2. If Kid Buu is alive, skips application (effects nullified)
   * 3. Otherwise, applies the new battlefield's effects to all characters
   *
   * @param state - Game state manager
   * @param battlefield - The battlefield definition to apply
   */
  applyModifiers(state: GameStateManager, battlefield: BattlefieldDef): void {
    // Always remove previous modifiers first
    this.removeModifiers(state);

    // Skip if Kid Buu alive (his passive nullifies battlefield effects)
    if (this.hasKidBuuAlive(state)) {
      state.addLog(
        'FIELD_NULLIFIED',
        'Kid Buu nullifies battlefield effects — modifiers not applied.'
      );
      this.appliedEffect = null;
      this.currentBattlefieldId = null;
      return;
    }

    this.appliedEffect = battlefield.effect;
    this.currentBattlefieldId = battlefield.id;

    const baseKey = battlefield.effect.split(':')[0];

    switch (baseKey) {
      case 'none':
        // No modifiers
        break;

      case 'lentitud': {
        // +N to all characters' currentLentitud
        const value = parseInt(battlefield.effect.split(':')[1] || '1', 10);
        for (let p = 0; p < 2; p++) {
          for (const char of state.getPlayer(p).characters) {
            if (char.isAlive) {
              char.currentLentitud += value;
            }
          }
        }
        break;
      }

      case 'hp': {
        // +N to all characters' maxVida and currentVida
        const value = parseInt(battlefield.effect.split(':')[1] || '1', 10);
        for (let p = 0; p < 2; p++) {
          for (const char of state.getPlayer(p).characters) {
            if (char.isAlive) {
              char.maxVida += value;
              char.currentVida = Math.min(char.currentVida + value, char.maxVida);
            }
          }
        }
        break;
      }

      case 'attack': {
        // +N to all characters' currentAtaque
        const value = parseInt(battlefield.effect.split(':')[1] || '2', 10);
        for (let p = 0; p < 2; p++) {
          for (const char of state.getPlayer(p).characters) {
            if (char.isAlive) {
              char.currentAtaque += value;
            }
          }
        }
        break;
      }

      case 'no_definitivas':
      case 'no_equipables':
      case 'attack_front_only':
      case 'revive_on_last':
      case 'disable_character':
      case 'turn_limit':
        // These are flags tracked on GameState — no stat changes to apply here.
        // CombatResolver and ActionValidator check the battlefield's effect string directly.
        break;

      default:
        state.addLog(
          'FIELD_UNKNOWN',
          `Unknown battlefield effect: '${battlefield.effect}'`
        );
        break;
    }

    state.addLog(
      'FIELD_APPLIED',
      `Battlefield '${battlefield.name}' modifiers applied (${battlefield.effect}).`
    );
  }

  /**
   * Remove previously applied battlefield modifiers.
   *
   * Reverses the stat changes made by applyModifiers().
   * Call this when the battlefield changes or is cleared.
   */
  removeModifiers(state: GameStateManager): void {
    if (!this.appliedEffect) return;

    const baseKey = this.appliedEffect.split(':')[0];

    switch (baseKey) {
      case 'none':
        break;

      case 'lentitud': {
        const value = parseInt(this.appliedEffect.split(':')[1] || '1', 10);
        for (let p = 0; p < 2; p++) {
          for (const char of state.getPlayer(p).characters) {
            char.currentLentitud = Math.max(0, char.currentLentitud - value);
          }
        }
        break;
      }

      case 'hp': {
        const value = parseInt(this.appliedEffect.split(':')[1] || '1', 10);
        for (let p = 0; p < 2; p++) {
          for (const char of state.getPlayer(p).characters) {
            if (char.isAlive || char.currentVida > 0) {
              char.maxVida = Math.max(1, char.maxVida - value);
              char.currentVida = Math.min(char.currentVida, char.maxVida);
            }
          }
        }
        break;
      }

      case 'attack': {
        const value = parseInt(this.appliedEffect.split(':')[1] || '2', 10);
        for (let p = 0; p < 2; p++) {
          for (const char of state.getPlayer(p).characters) {
            char.currentAtaque = Math.max(0, char.currentAtaque - value);
          }
        }
        break;
      }

      case 'no_definitivas':
      case 'no_equipables':
      case 'attack_front_only':
      case 'revive_on_last':
      case 'disable_character':
      case 'turn_limit':
        // Flag-type effects — no stat changes to revert
        break;

      default:
        break;
    }

    state.addLog(
      'FIELD_REMOVED',
      `Previous battlefield modifiers removed (was: ${this.appliedEffect}).`
    );

    this.appliedEffect = null;
    this.currentBattlefieldId = null;
  }

  /**
   * Get the currently applied battlefield effect string, if any.
   */
  getCurrentEffect(): string | null {
    return this.appliedEffect;
  }

  /**
   * Get the currently active battlefield ID, if any.
   */
  getCurrentBattlefieldId(): string | null {
    return this.currentBattlefieldId;
  }
}
