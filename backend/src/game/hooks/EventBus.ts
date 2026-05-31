import type { GameStateManager } from '../state/GameState';

// ─── Event Types ─────────────────────────────────────────────────

export type GameEventType =
  | 'pre_damage'
  | 'post_damage'
  | 'pre_turn'
  | 'post_turn'
  | 'on_character_death'
  | 'on_attack';

export type GameEventHandler = (
  state: GameStateManager,
  ...args: any[]
) => void;

// ─── Event Bus ───────────────────────────────────────────────────

export class EventBus {
  private handlers: Map<GameEventType, GameEventHandler[]> = new Map();

  /**
   * Register a handler for a game event.
   */
  on(event: GameEventType, handler: GameEventHandler): void {
    const existing = this.handlers.get(event) || [];
    existing.push(handler);
    this.handlers.set(event, existing);
  }

  /**
   * Remove a previously registered handler.
   */
  off(event: GameEventType, handler: GameEventHandler): void {
    const existing = this.handlers.get(event);
    if (!existing) return;
    this.handlers.set(
      event,
      existing.filter((h) => h !== handler)
    );
  }

  /**
   * Emit an event, calling all registered handlers in order.
   */
  emit(event: GameEventType, state: GameStateManager, ...args: any[]): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(state, ...args);
      } catch (err) {
        console.error(`[EventBus] Error in handler for ${event}:`, err);
      }
    }
  }

  /**
   * Clear all handlers (for cleanup or testing).
   */
  clear(): void {
    this.handlers.clear();
  }
}

// ─── Passive Ability Registration ────────────────────────────────

/**
 * Register the most important passive abilities on the event bus.
 *
 * Current passives (Phase 3):
 * - SSJ3 Gotenks: COUNTER_DAMAGE — on 'post_damage', deal 1 counter damage to attacker
 * - Kid Buu: BATTLEFIELD_NULLIFY — on 'pre_turn', nullify battlefield effects
 * - A17&A18: KI_PER_TURN — on 'pre_turn', add 1 ki to their player
 *
 * Additional passives can be registered in later phases.
 */
export function registerPassives(eventBus: EventBus): void {
  // ── SSJ3 Gotenks: Counter-damage ──────────────────────────────
  // When a character with SSJ3 Gotenks passive takes damage,
  // deal 1 damage back to the attacker (not esquivable).
  // Registered via post_damage: args = [attackerPlayerIndex, targetPlayerIndex, targetCharacterId]
  eventBus.on('post_damage', (state: GameStateManager, attackerPlayerIndex: number, _targetPlayerIndex: number, targetCharacterId: string) => {
    const targetState = state.findCharacterState(_targetPlayerIndex, targetCharacterId);
    if (!targetState) return;

    // Check if the damaged character is SSJ3 Gotenks (has COUNTER_DAMAGE passive)
    const charDef = state.getCharacterDef(targetState.characterId);
    if (!charDef?.abilities?.pasiva || charDef.abilities.pasiva.type !== 'COUNTER_DAMAGE') {
      return;
    }

    const counterDmg = charDef.abilities.pasiva.value ?? 1;
    if (counterDmg <= 0) return;

    // Find attacker (first alive character the attacker has)
    // The attacker is the character whose player attacked
    const attackerPlayer = state.getPlayer(attackerPlayerIndex);
    const attackerChars = attackerPlayer.characters.filter((c) => c.isAlive);

    if (attackerChars.length > 0) {
      // Apply counter damage to first alive attacker character
      // Note: for multi-character attacker, we hit the first alive one
      // This matches "whoever damages Gotenks takes 1 damage"
      const target = attackerChars[0];
      target.currentVida = Math.max(0, target.currentVida - counterDmg);

      if (target.currentVida <= 0) {
        target.isAlive = false;
      }

      state.addLog(
        'COUNTER_DAMAGE',
        `SSJ3 Gotenks deals ${counterDmg} counter-damage to ${target.characterId}`
      );
    }
  });

  // ── Kid Buu: Battlefield Nullification ─────────────────────────
  // At the start of each turn, nullify battlefield effects.
  eventBus.on('pre_turn', (state: GameStateManager) => {
    // Check if any player has Kid Buu alive
    for (let i = 0; i < 2; i++) {
      const kidBuu = state
        .getPlayer(i)
        .characters.find((c) => c.characterId === 'kid-buu' && c.isAlive);
      if (kidBuu) {
        state.setBattlefield(null);
        state.addLog('BATTLEFIELD_NULLIFY', 'Kid Buu nullifies battlefield effects');
        return; // Only need one Kid Buu alive
      }
    }
  });

  // ── A17&A18: Ki per turn ─────────────────────────────────────
  // At the start of each turn, give +1 ki to the controller of A17&A18.
  eventBus.on('pre_turn', (state: GameStateManager) => {
    for (let i = 0; i < 2; i++) {
      const hasA17a18 = state
        .getPlayer(i)
        .characters.some((c) => c.characterId === 'a17-a18' && c.isAlive);
      if (hasA17a18) {
        state.getPlayer(i).ki += 1;
        state.addLog('KI_PER_TURN', `A17&A18 grants +1 ki to Player ${i}`);
      }
    }
  });
}
