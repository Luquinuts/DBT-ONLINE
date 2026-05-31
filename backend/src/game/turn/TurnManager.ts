import type { GameStateManager } from '../state/GameState';
import type { EventBus } from '../hooks/EventBus';

export interface TurnActionResult {
  success: boolean;
  error?: string;
  newPhase?: string;
  turnOver?: boolean; // true when switching to next player
}

/**
 * Manages the turn lifecycle:
 * WAITING_FOR_ACTION → ADVANCE → ATTACK → END_TURN
 *
 * Each turn follows this flow:
 * 1. Start turn: phase = WAITING_FOR_ACTION, apply turn-start effects
 * 2. Action phase: player plays cards / uses abilities
 * 3. Pass from WAITING_FOR_ACTION → ADVANCE
 * 4. Advance: player advances exactly 1 character
 * 5. After advance → ATTACK
 * 6. Attack: player attacks with eligible characters (advanceCounter >= lentitud)
 * 7. When done → END_TURN
 * 8. End turn: draw card, reset flags, switch player
 */
export class TurnManager {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Start a new turn for the current player.
   * Called when transitioning from BATTLEFIELD → first turn,
   * or after the previous player's END_TURN.
   */
  startTurn(state: GameStateManager): void {
    const gs = state.getState();
    gs.phase = 'WAITING_FOR_ACTION';
    state.addLog('TURN_START', `Turn ${gs.turnNumber}: Player ${gs.currentPlayerIndex}'s turn`);

    // Apply turn-start passives via EventBus
    this.eventBus.emit('pre_turn', state);
  }

  /**
   * Handle a PASS action from WAITING_FOR_ACTION or ADVANCE.
   */
  handlePass(state: GameStateManager): TurnActionResult {
    const phase = state.getPhase();

    if (phase === 'WAITING_FOR_ACTION') {
      // Advance action counts as an action
      state.getCurrentPlayer().turnActionsRemaining = 0;
      state.transitionTo('ADVANCE');
      state.addLog('PASS', 'Player passed action phase, entering ADVANCE');
      return { success: true, newPhase: 'ADVANCE' };
    }

    if (phase === 'ADVANCE') {
      state.transitionTo('ATTACK');
      state.addLog('PASS', 'Player passed advance, entering ATTACK');
      return { success: true, newPhase: 'ATTACK' };
    }

    if (phase === 'ATTACK') {
      // Pass in attack ends the turn
      return this.endTurn(state);
    }

    return { success: false, error: `Cannot PASS in ${phase} phase.` };
  }

  /**
   * Handle an ADVANCE action — advance a character by 1.
   */
  handleAdvance(state: GameStateManager, characterId: string): TurnActionResult {
    const cpi = state.getCurrentPlayerIndex();
    const character = state.getCharacter(cpi, characterId);

    if (!character) {
      return { success: false, error: `Character '${characterId}' not found on your field.` };
    }

    if (!character.isAlive) {
      return { success: false, error: `Character '${characterId}' is dead and cannot advance.` };
    }

    // Increment advance counter
    character.advanceCounter++;
    state.getCurrentPlayer().hasAdvancedThisTurn = true;

    state.addLog(
      'ADVANCE',
      `Player ${cpi} advanced ${characterId} to ${character.advanceCounter} (need ${character.currentLentitud} to attack)`
    );

    // After advancing, enter ATTACK phase
    state.transitionTo('ATTACK');
    return { success: true, newPhase: 'ATTACK' };
  }

  /**
   * Check if the player has eligible attackers.
   * An attacker is eligible if alive, advanceCounter >= lentitud,
   * and hasn't attacked this turn.
   */
  getEligibleAttackers(state: GameStateManager): string[] {
    const cpi = state.getCurrentPlayerIndex();
    const alive = state.getAliveCharacters(cpi);
    return alive
      .filter((c) => c.advanceCounter >= c.currentLentitud && !c.hasAttackedThisTurn)
      .map((c) => c.characterId);
  }

  /**
   * End the current turn.
   * - Draw 1 card (if deck has cards)
   * - Reset per-turn flags
   * - Switch to next player
   */
  endTurn(state: GameStateManager): TurnActionResult {
    const gs = state.getState();
    const currentPlayer = gs.players[gs.currentPlayerIndex];

    // ── Draw 1 card ──────────────────────────────────────────
    if (currentPlayer.deck.length > 0) {
      const drawn = currentPlayer.deck.shift()!;
      currentPlayer.hand.push(drawn);
      state.addLog('DRAW', `Player ${gs.currentPlayerIndex} drew a card.`);
    }

    // ── Can redraw once (future: let player choose discard) ──
    currentPlayer.canRedrawThisTurn = true;

    // ── Reset per-turn character flags ───────────────────────
    for (const char of currentPlayer.characters) {
      char.hasAttackedThisTurn = false;
    }

    // ── Reset player flags ───────────────────────────────────
    currentPlayer.hasAdvancedThisTurn = false;
    currentPlayer.hasPlayedEquipableThisTurn = false;
    currentPlayer.hasAttackedThisTurn = false;
    currentPlayer.turnActionsRemaining = 1;

    // ── Emit post_turn ───────────────────────────────────────
    this.eventBus.emit('post_turn', state);

    // ── Switch player ────────────────────────────────────────
    gs.currentPlayerIndex = gs.currentPlayerIndex === 0 ? 1 : 0;
    gs.turnNumber++;
    gs.phase = 'WAITING_FOR_ACTION';

    state.addLog(
      'TURN_END',
      `Turn ends. Next: Player ${gs.currentPlayerIndex}, Turn ${gs.turnNumber}`
    );

    // ── Emit pre_turn for the new player ─────────────────────
    this.eventBus.emit('pre_turn', state);

    return {
      success: true,
      turnOver: true,
      newPhase: 'WAITING_FOR_ACTION',
    };
  }

  /**
   * Handle a USE_HABILIDAD action.
   * For Phase 3, this validates cooldown/usage and routes to the effect engine.
   * Currently validates basic constraints — full ability resolution in later phases.
   */
  handleUseHabilidad(
    state: GameStateManager,
    characterId: string
  ): TurnActionResult {
    const cpi = state.getCurrentPlayerIndex();
    const character = state.getCharacter(cpi, characterId);

    if (!character) {
      return { success: false, error: `Character '${characterId}' not found.` };
    }

    if (!character.isAlive) {
      return { success: false, error: 'Dead characters cannot use abilities.' };
    }

    if (character.abilityUsedThisGame) {
      return { success: false, error: 'Ability already used this game.' };
    }

    if (character.abilityCooldownRemaining > 0) {
      return {
        success: false,
        error: `Ability on cooldown for ${character.abilityCooldownRemaining} more turn(s).`,
      };
    }

    // Mark as used and set cooldown
    character.abilityUsedThisGame = true;
    character.abilityCooldownRemaining = 3; // default cooldown; overridden per character

    // The charDef determines actual cooldown
    const charDef = state.getCharacterDef(characterId);
    if (charDef?.abilities?.habilidad) {
      character.abilityCooldownRemaining = charDef.abilities.habilidad.cooldown;
    }

    state.addLog('USE_HABILIDAD', `Player ${cpi} used ${characterId}'s ability.`);
    return { success: true };
  }
}
