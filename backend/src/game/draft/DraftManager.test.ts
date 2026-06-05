import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager, createCharacterState } from '../state/GameState';
import { DraftManager } from './DraftManager';

const ALL_CHAR_IDS = [
  'ssj-god-goku', 'ssj-blue-vegeta', 'golden-frieza', 'ssj-rose-black-goku',
  'ssj-broly', 'perfect-cell', 'kid-buu', 'beerus', 'hit', 'ssj2-gohan',
  'a17-a18', 'ssj3-gotenks', 'piccolo', 'jiren', 'ssj-future-trunks', 'ssj-goku',
];

describe('DraftManager', () => {
  let state: GameStateManager;
  let draft: DraftManager;

  beforeEach(() => {
    state = new GameStateManager('TEST', 'p1', 'p2', ALL_CHAR_IDS);
    draft = new DraftManager();
  });

  describe('Pick sequence validation', () => {
    it('follows correct pick sequence: P0×1 → P1×2 → P0×2 → P1×1', () => {
      const avail = () => state.getDraftState()!.availableCharacters;

      // Step 0: P0 picks 1
      let result = draft.handleDraftSelect(state, avail()[0], 0);
      expect(result.success).toBe(true);
      expect(state.getDraftState()!.picks[0].length).toBe(1);
      expect(state.getDraftState()!.picks[1].length).toBe(0);

      // Step 1: P1 picks 2 (first)
      result = draft.handleDraftSelect(state, avail()[0], 1);
      expect(result.success).toBe(true);
      expect(state.getDraftState()!.picks[1].length).toBe(1);

      // Step 1: P1 picks 2 (second)
      result = draft.handleDraftSelect(state, avail()[0], 1);
      expect(result.success).toBe(true);
      expect(state.getDraftState()!.picks[1].length).toBe(2);

      // Step 2: P0 picks 2 (first)
      result = draft.handleDraftSelect(state, avail()[0], 0);
      expect(result.success).toBe(true);
      expect(state.getDraftState()!.picks[0].length).toBe(2);

      // Step 2: P0 picks 2 (second)
      result = draft.handleDraftSelect(state, avail()[0], 0);
      expect(result.success).toBe(true);
      expect(state.getDraftState()!.picks[0].length).toBe(3);

      // Step 3: P1 picks 1 (last)
      result = draft.handleDraftSelect(state, avail()[0], 1);
      expect(result.success).toBe(true);
      expect(state.getDraftState()!.picks[1].length).toBe(3);

      // After all picks, phase should be PLACING
      expect(state.getDraftState()!.phase).toBe('PLACING');
    });

    it('rejects pick from wrong player (out of turn)', () => {
      // Step 0: P0 should pick first, P1 tries to pick
      const firstAvail = state.getDraftState()!.availableCharacters[0];
      const result = draft.handleDraftSelect(state, firstAvail, 1);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not Player 1');
    });

    it('rejects picking the same character twice', () => {
      const firstAvail = state.getDraftState()!.availableCharacters[0];

      // P0 picks a character
      draft.handleDraftSelect(state, firstAvail, 0);

      // The character should no longer be available
      expect(state.getDraftState()!.availableCharacters).not.toContain(firstAvail);
    });

    it('rejects pick if draft is not in PICKING phase', () => {
      state.getDraftState()!.phase = 'PLACING';
      const result = draft.handleDraftSelect(state, 'ssj-broly', 0);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not in PICKING');
    });
  });

  describe('After all picks, both players have 3 characters', () => {
    function completePicks(): void {
      const avail = () => state.getDraftState()!.availableCharacters;
      draft.handleDraftSelect(state, avail()[0], 0);   // P0 pick 1
      draft.handleDraftSelect(state, avail()[0], 1);   // P1 pick 1
      draft.handleDraftSelect(state, avail()[0], 1);   // P1 pick 2
      draft.handleDraftSelect(state, avail()[0], 0);   // P0 pick 2
      draft.handleDraftSelect(state, avail()[0], 0);   // P0 pick 3
      draft.handleDraftSelect(state, avail()[0], 1);   // P1 pick 3
    }

    it('both players have 3 picks each after full sequence', () => {
      completePicks();
      expect(state.getDraftState()!.picks[0].length).toBe(3);
      expect(state.getDraftState()!.picks[1].length).toBe(3);
    });

    it('available characters decrease correctly after each pick', () => {
      const initialCount = state.getDraftState()!.availableCharacters.length;

      draft.handleDraftSelect(state, state.getDraftState()!.availableCharacters[0], 0);
      expect(state.getDraftState()!.availableCharacters.length).toBe(initialCount - 1);

      draft.handleDraftSelect(state, state.getDraftState()!.availableCharacters[0], 1);
      expect(state.getDraftState()!.availableCharacters.length).toBe(initialCount - 2);

      draft.handleDraftSelect(state, state.getDraftState()!.availableCharacters[0], 1);
      expect(state.getDraftState()!.availableCharacters.length).toBe(initialCount - 3);

      // After all 6 picks, 10 characters remain (16 - 6)
      completePicks();
      expect(state.getDraftState()!.availableCharacters.length).toBe(ALL_CHAR_IDS.length - 6);
    });
  });

  describe('PLACING phase', () => {
    function completePicks(): void {
      const avail = () => state.getDraftState()!.availableCharacters;
      draft.handleDraftSelect(state, avail()[0], 0);
      draft.handleDraftSelect(state, avail()[0], 1);
      draft.handleDraftSelect(state, avail()[0], 1);
      draft.handleDraftSelect(state, avail()[0], 0);
      draft.handleDraftSelect(state, avail()[0], 0);
      draft.handleDraftSelect(state, avail()[0], 1);
    }

    it('accepts valid character placement from P0', () => {
      completePicks();
      const picks = state.getDraftState()!.picks[0];
      const result = draft.handlePlaceCharacters(state, picks, 0);
      expect(result.success).toBe(true);
      expect(result.readyToStart).toBe(false);
      // P0 should have characters on field
      expect(state.getPlayer(0).characters.length).toBe(3);
    });

    it('transitions to PRE_BATTLE phase when both players place', () => {
      completePicks();
      const p1Picks = state.getDraftState()!.picks[0];
      const p2Picks = state.getDraftState()!.picks[1];

      draft.handlePlaceCharacters(state, p1Picks, 0);
      expect(state.getState().phase).toBe('DRAFT'); // Still DRAFT waiting for P2

      const result = draft.handlePlaceCharacters(state, p2Picks, 1);
      expect(result.success).toBe(true);
      expect(result.readyToStart).toBe(true);
      expect(state.getDraftState()!.phase).toBe('DONE');
      expect(state.getState().phase).toBe('PRE_BATTLE');
    });

    it('rejects placement if not in PLACING phase', () => {
      const result = draft.handlePlaceCharacters(state, ['ssj-broly', 'ssj2-gohan', 'beerus'], 0);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not in PLACING');
    });

    it('rejects placement with wrong character count', () => {
      completePicks();
      state.getDraftState()!.phase = 'PLACING';
      // Override picks to known set of 3, then try placing only 2
      state.getDraftState()!.picks[0] = ['ssj-broly', 'ssj2-gohan', 'beerus'];
      const result = draft.handlePlaceCharacters(state, ['ssj-broly', 'ssj2-gohan'], 0);
      expect(result.success).toBe(false);
      expect(result.error).toContain('3');
    });

    it('rejects placement with unpicked character', () => {
      completePicks();
      state.getDraftState()!.phase = 'PLACING';
      // P1 owns picks[1], try placing a character they didn't pick
      const result = draft.handlePlaceCharacters(state, ['ssj-broly', 'ssj2-gohan', 'beerus'], 1);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not picked');
    });
  });
});
