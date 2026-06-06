import type { GameStateManager, } from '../state/GameState';
import { createCharacterState } from '../state/GameState';
import { getCharacterById } from '../../data/characters';

// ─── Draft Sequence Definition ────────────────────────────────────
//
// Sequence: J1 picks 1, J2 picks 2, J1 picks 2, J2 picks 1
// (total 3 characters per player)
//
// After each step, we check if the cumulative picks match the target.
// Step → [P0 cumulative target, P1 cumulative target]
const CUMULATIVE_TARGETS: Array<[number, number]> = [
  [1, 0], // Step 0: P0 has 1 pick
  [1, 2], // Step 1: P1 has 2 picks
  [3, 2], // Step 2: P0 has 3 picks  (had 1, now +2)
  [3, 3], // Step 3: P1 has 3 picks  (had 2, now +1)
];

const TOTAL_STEPS = 4;
const TOTAL_PICKS = 3; // per player

export interface DraftPickResult {
  success: boolean;
  error?: string;
  phase?: 'PICKING' | 'PLACING' | 'DONE';
  picker?: number;
  message?: string;
}

export interface DraftPlaceResult {
  success: boolean;
  error?: string;
  readyToStart?: boolean; // both players have placed
}

/**
 * Manages the alternating draft pick process.
 * Validates picks, tracks sequence, and transitions to placement phase.
 */
export class DraftManager {
  /**
   * Handle a DRAFT_SELECT action from a player.
   */
  handleDraftSelect(
    state: GameStateManager,
    characterId: string,
    playerIndex: number
  ): DraftPickResult {
    const draft = state.getDraftState();
    if (!draft || draft.phase !== 'PICKING') {
      return { success: false, error: 'Draft is not in PICKING phase.' };
    }

    // Validate it's this player's turn to pick
    if (draft.currentPicker !== playerIndex) {
      return {
        success: false,
        error: `It is not Player ${playerIndex}'s turn to pick.`,
      };
    }

    // Validate character is available
    if (!draft.availableCharacters.includes(characterId)) {
      return {
        success: false,
        error: `Character '${characterId}' is not available or already picked.`,
      };
    }

    // Remove character from available pool
    draft.availableCharacters = draft.availableCharacters.filter(
      (id) => id !== characterId
    );

    // Add to player's picks
    draft.picks[playerIndex].push(characterId);

    // ─── Auto-pairing ──────────────────────────────────────────
    // If this character has a paired companion, auto-draft it too.
    const pickedDef = getCharacterById(characterId);
    if (pickedDef?.pairedWith) {
      const pairedId = pickedDef.pairedWith;
      // Only add if not already picked by either player
      if (
        !draft.picks[0].includes(pairedId) &&
        !draft.picks[1].includes(pairedId)
      ) {
        draft.picks[playerIndex].push(pairedId);
        draft.availableCharacters = draft.availableCharacters.filter(
          (id) => id !== pairedId
        );
        state.addLog(
          'DRAFT_PICK',
          `Auto-paired ${pairedId} with ${characterId} for Player ${playerIndex}`
        );
      }
    }

    // Check if this step is complete
    const stepIndex = draft.pickSequence;
    const target = CUMULATIVE_TARGETS[stepIndex];

    if (
      draft.picks[0].length >= target[0] &&
      draft.picks[1].length >= target[1]
    ) {
      // Advance to next sequence step
      draft.pickSequence++;

      if (draft.pickSequence >= TOTAL_STEPS) {
        // All draft picks complete — transition to PLACING
        draft.phase = 'PLACING';
        draft.currentPicker = 0; // Player 0 places first
        state.transitionTo('DRAFT'); // Stay in DRAFT phase but with PLACING substate
        state.addLog(
          'DRAFT_COMPLETE',
          `All picks done. P0: ${draft.picks[0].join(', ')}, P1: ${draft.picks[1].join(', ')}`
        );
        return {
          success: true,
          phase: 'PLACING',
          message: 'All picks complete. Players must now arrange their characters.',
        };
      } else {
        // Set next picker based on the next step
        const nextTarget = CUMULATIVE_TARGETS[draft.pickSequence];
        // The next player to pick is the one whose cumulative count needs to increase
        if (nextTarget[0] > draft.picks[0].length) {
          draft.currentPicker = 0;
        } else {
          draft.currentPicker = 1;
        }

        state.addLog(
          'DRAFT_PICK',
          `Player ${playerIndex} picked ${characterId}. Next: Player ${draft.currentPicker}`
        );
        return {
          success: true,
          phase: 'PICKING',
          picker: draft.currentPicker,
          message: `Player ${playerIndex} picked ${characterId}. Player ${draft.currentPicker} picks next.`,
        };
      }
    }

    // Still within the same step (same player picks again)
    state.addLog('DRAFT_PICK', `Player ${playerIndex} picked ${characterId}.`);
    return {
      success: true,
      phase: 'PICKING',
      picker: draft.currentPicker,
      message: `Player ${playerIndex} picked ${characterId}. Same player picks again.`,
    };
  }

  /**
   * Handle a PLACE_CHARACTERS action.
   * A player submits their ordered character list after all picks are done.
   */
  handlePlaceCharacters(
    state: GameStateManager,
    order: string[],
    playerIndex: number
  ): DraftPlaceResult {
    const draft = state.getDraftState();
    if (!draft || draft.phase !== 'PLACING') {
      return { success: false, error: 'Draft is not in PLACING phase.' };
    }

    // Validate: the player's pick count matches
    const playerPicks = draft.picks[playerIndex];
    if (playerPicks.length !== TOTAL_PICKS) {
      return {
        success: false,
        error: `Expected ${TOTAL_PICKS} picks, got ${playerPicks.length}.`,
      };
    }

    // Validate: all characters in the order were actually picked by this player
    for (const charId of order) {
      if (!playerPicks.includes(charId)) {
        return {
          success: false,
          error: `Character '${charId}' was not picked by Player ${playerIndex}.`,
        };
      }
    }

    // Validate: no duplicates, correct count
    const uniqueIds = new Set(order);
    if (uniqueIds.size !== order.length || order.length !== TOTAL_PICKS) {
      return {
        success: false,
        error: `Must provide exactly ${TOTAL_PICKS} unique character IDs.`,
      };
    }

    // Create CharacterState for each placed character
    const characterStates = order
      .map((charId) => {
        const charDef = state.getCharacterDef(charId);
        if (!charDef) return null;
        return createCharacterState(charDef);
      })
      .filter((cs): cs is NonNullable<typeof cs> => cs !== null);

    // Assign characters to the player
    state.getPlayer(playerIndex).characters = characterStates;

    // Track which players have placed
    // We use a simple approach: track which players submitted their order
    // by marking their picks as "placed" (we use a placeholder on draft)
    if (!(draft as any)._placedMask) {
      (draft as any)._placedMask = 0;
    }
    (draft as any)._placedMask |= (1 << playerIndex);

    const placedMask = (draft as any)._placedMask as number;
    state.addLog(
      'PLACE_CHARACTERS',
      `Player ${playerIndex} placed ${order.join(', ')}`
    );

    // Check if both players have placed
    if (placedMask === 3) {
      // Both placed (bits 0 and 1 set)
      draft.phase = 'DONE';
      state.transitionTo('PRE_BATTLE');
      state.addLog(
        'PLACING_COMPLETE',
        'Both players have placed their characters. Entering pre-battle reveal.'
      );
      return { success: true, readyToStart: true };
    }

    return {
      success: true,
      readyToStart: false,
    };
  }
}
