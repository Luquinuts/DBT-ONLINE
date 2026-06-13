import type { PlayerGameState, DraftState, GamePhase, GameAction } from './game';

// ─── Factory: PlayerGameState ───────────────────────────────────

export function createInitialPlayerState(playerId: string): PlayerGameState {
  return {
    playerId,
    characters: [],
    hand: [],
    deck: [],
    discardPile: [],
    ki: 0,
    ultimateUsesRemaining: 2,  // ULTIMATE card max 2 per game
    canRedrawThisTurn: false,
    hasAdvancedThisTurn: false,
    hasPlayedEquipableThisTurn: false,
    hasAttackedThisTurn: false,
    turnActionsRemaining: 1,
  };
}

// ─── Factory: DraftState ────────────────────────────────────────

export function createEmptyDraftState(): DraftState {
  return {
    phase: 'PICKING',
    currentPicker: 0,
    pickSequence: 0,
    availableCharacters: [],
    picks: [[], []],
  };
}

// ─── Phase validation helper ────────────────────────────────────

/**
 * Returns which game phases allow a given action type.
 * Based on the phase validation matrix from design.md.
 * PRE_BATTLE allows no actions — it's a reveal-only phase.
 */
export function validPhasesForAction(actionType: GameAction['type']): GamePhase[] {
  switch (actionType) {
    case 'DRAFT_SELECT':
      return ['DRAFT'];

    case 'PLACE_CHARACTERS':
      return ['DRAFT'];

    case 'PLAY_CARD':
      return ['WAITING_FOR_ACTION'];

    case 'USE_HABILIDAD':
      return ['WAITING_FOR_ACTION', 'DEFENDER_RESPONSE'];

    case 'ADVANCE':
      return ['ADVANCE'];

    case 'ATTACK':
      return ['ATTACK'];

    case 'DEFENDER_RESPONSE':
      return ['DEFENDER_RESPONSE'];

    case 'PASS':
      return ['WAITING_FOR_ACTION', 'ADVANCE', 'ATTACK'];

    case 'SWITCH_FORM':
      return ['WAITING_FOR_ACTION'];

    case 'DRAGON_REVIVE':
      return ['WAITING_FOR_ACTION'];

    case 'REDRAW':
      return ['WAITING_FOR_ACTION', 'ADVANCE', 'ATTACK'];

    case 'BAN_CHARACTER':
      return ['PRE_BATTLE'];

    case 'END_TURN':
      return ['WAITING_FOR_ACTION', 'ADVANCE', 'ATTACK', 'DEFENDER_RESPONSE', 'END_TURN'];

    default:
      return [];
  }
}

/**
 * Checks whether an action type is valid in the current game phase.
 */
export function isActionValidForPhase(actionType: GameAction['type'], phase: GamePhase): boolean {
  return validPhasesForAction(actionType).includes(phase);
}
