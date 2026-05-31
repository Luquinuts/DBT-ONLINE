import type { GameStateManager } from '../state/GameState';
import type { KiManager } from './KiManager';
import type { EventBus } from '../hooks/EventBus';
import type { WinConditionChecker } from '../conditions/WinConditionChecker';
import type { GameAction } from '@dbt-online/shared';
import { buildEffectRegistry } from './cards/index';
import type { EffectHandler } from './cards/index';

// Re-export EffectResult for backward compatibility
export type { EffectResult } from './EffectTypes';
import type { EffectResult } from './EffectTypes';

interface LegacyEffectHandler {
  (state: GameStateManager, playerIndex: number, cardEffect: string, targetCharacterId?: string): EffectResult;
}

/**
 * Registry-based card effect resolution.
 *
 * Phase 4 refactored: delegates each effect to a dedicated handler file
 * in the `cards/` directory. The registry is built by `buildEffectRegistry()`
 * in `cards/index.ts`, which imports from individual handler files.
 *
 * This class remains the public API for resolving card effects. The `resolve()`
 * method looks up handlers by effect ID and delegates. Fallback returns a
 * placeholder result for unimplemented effects.
 */
export class CardEffectEngine {
  private registry: Map<string, LegacyEffectHandler>;
  private kiManager: KiManager;
  private eventBus: EventBus;
  private winChecker: WinConditionChecker;

  constructor(
    kiManager: KiManager,
    eventBus: EventBus,
    winChecker: WinConditionChecker
  ) {
    this.kiManager = kiManager;
    this.eventBus = eventBus;
    this.winChecker = winChecker;
    this.registry = new Map();

    // Phase 4: Build registry from separate handler files.
    // Each handler is stored under its effect key (e.g. "ki", "defense", "heal").
    // Composite keys like "defense" dispatch internally by effect suffix.
    const handlerRegistry = buildEffectRegistry();

    // Convert EffectHandler -> LegacyEffectHandler (same signature, different named type)
    for (const [key, handler] of handlerRegistry) {
      this.registry.set(key, handler as LegacyEffectHandler);
    }
  }

  /**
   * Resolve a card effect by its effect ID.
   *
   * @param state - Game state manager
   * @param playerIndex - Player using the card
   * @param cardEffect - The effect string from CardDef.effect (e.g. "ki:1", "heal:3")
   * @param targetCharacterId - Optional target character
   */
  resolve(
    state: GameStateManager,
    playerIndex: number,
    cardEffect: string,
    targetCharacterId?: string
  ): EffectResult {
    // Extract the base effect key (before the colon)
    const effectKey = cardEffect.split(':')[0];
    const handler = this.registry.get(effectKey);

    if (!handler) {
      // Placeholder for unimplemented effects
      state.addLog(
        'EFFECT_PLACEHOLDER',
        `Card effect '${cardEffect}' not yet implemented. Logging only.`
      );
      return {
        success: true,
        error: `Effect '${cardEffect}' has a placeholder implementation.`,
      };
    }

    try {
      return handler(state, playerIndex, cardEffect, targetCharacterId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: `Effect '${cardEffect}' failed: ${msg}` };
    }
  }

  /**
   * Apply damage to A17&A18 dual-HP pool.
   * Kept for backward compatibility (used by old inline handlers;
   * new handlers in cards/ have their own implementation).
   */
  private applyAndroidDamage(
    state: GameStateManager,
    targetState: import('@dbt-online/shared').CharacterState,
    playerIndex: number,
    damage: number
  ): void {
    if (
      targetState.androide17Vida === undefined ||
      targetState.androide18Vida === undefined
    ) {
      targetState.currentVida = Math.max(0, targetState.currentVida - damage);
      if (targetState.currentVida <= 0) targetState.isAlive = false;
      return;
    }

    const halfDamage = Math.ceil(damage / 2);
    const remaining = damage - halfDamage;
    targetState.androide17Vida = Math.max(0, targetState.androide17Vida - halfDamage);
    targetState.androide18Vida = Math.max(0, targetState.androide18Vida - remaining);

    const totalRemaining =
      (targetState.androide17Vida ?? 0) + (targetState.androide18Vida ?? 0);
    if (totalRemaining <= 0) {
      targetState.currentVida = 0;
      targetState.isAlive = false;
    } else {
      targetState.currentVida = totalRemaining;
    }
  }
}
