import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager, createCharacterState } from '../state/GameState';
import { WinConditionChecker } from './WinConditionChecker';

const ALL_CHAR_IDS = [
  'ssj-god-goku', 'ssj-blue-vegeta', 'golden-frieza', 'ssj-rose-black-goku',
  'ssj-broly', 'perfect-cell', 'kid-buu', 'beerus', 'hit', 'ssj2-gohan',
  'a17-a18', 'ssj3-gotenks', 'piccolo', 'jiren', 'ssj-future-trunks', 'ssj-goku',
];

/**
 * Helper: create a GameStateManager with two placed characters per side.
 * The caller can mutate the state afterward to set up specific death scenarios.
 */
function createPopulatedState(): GameStateManager {
  const state = new GameStateManager('TEST', 'p1', 'p2', ALL_CHAR_IDS);
  const gs = state.getState();

  // Place one character per player for testing
  const c1 = state.getCharacterDef('ssj-god-goku')!;
  const c2 = state.getCharacterDef('ssj-blue-vegeta')!;

  gs.players[0].characters = [createCharacterState(c1)];
  gs.players[1].characters = [createCharacterState(c2)];

  // Move out of DRAFT so winCheck doesn't get skipped by GameEngine
  gs.phase = 'WAITING_FOR_ACTION';

  return state;
}

describe('WinConditionChecker', () => {
  let state: GameStateManager;
  let checker: WinConditionChecker;

  beforeEach(() => {
    state = createPopulatedState();
    checker = new WinConditionChecker();
  });

  describe('check()', () => {
    it('returns no winner if both players have alive characters', () => {
      const result = checker.check(state);
      expect(result.gameOver).toBe(false);
      expect(result.winner).toBeNull();
    });

    it('returns P2 as winner when P1 has no alive characters', () => {
      state.getPlayer(0).characters[0].isAlive = false;
      const result = checker.check(state);
      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe('p2');
      expect(result.reason).toContain('alive');
    });

    it('returns P1 as winner when P2 has no alive characters', () => {
      state.getPlayer(1).characters[0].isAlive = false;
      const result = checker.check(state);
      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe('p1');
      expect(result.reason).toContain('alive');
    });

    it('returns no winner when both die simultaneously (draw)', () => {
      state.getPlayer(0).characters[0].isAlive = false;
      state.getPlayer(1).characters[0].isAlive = false;
      const result = checker.check(state);
      expect(result.gameOver).toBe(true);
      expect(result.winner).toBeNull();
      expect(result.reason).toContain('Both');
    });

    it('continues game after a revive (Esfera del Dragón)', () => {
      // Kill P1's character, then revive it
      state.getPlayer(0).characters[0].isAlive = false;
      let result = checker.check(state);
      expect(result.gameOver).toBe(true);

      // Revive
      const revived = state.getPlayer(0).characters[0];
      revived.isAlive = true;
      revived.currentVida = 3;
      result = checker.check(state);
      expect(result.gameOver).toBe(false);
      expect(result.winner).toBeNull();
    });
  });

  describe('checkAfterDeath()', () => {
    it('returns game over if the dead player has no more alive characters', () => {
      state.getPlayer(0).characters[0].isAlive = false;
      const result = checker.checkAfterDeath(state, 0);
      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe('p2');
    });

    it('returns not game over if the dead player still has alive characters', () => {
      // Add a second character to P1
      const cDef = state.getCharacterDef('ssj-broly')!;
      state.getPlayer(0).characters.push(createCharacterState(cDef));

      state.getPlayer(0).characters[0].isAlive = false;
      const result = checker.checkAfterDeath(state, 0);
      expect(result.gameOver).toBe(false);
      expect(result.winner).toBeNull();
    });
  });

  describe('Namek revive guard', () => {
    beforeEach(() => {
      state.getState().battlefield = {
        id: 'namek',
        name: 'Namek',
        effect: 'revive_on_last:1',
        description: 'Namek battlefield',
      };
    });

    it('check() does NOT end game when player has 0 alive but namekRevivePending is set', () => {
      state.getPlayer(0).characters[0].isAlive = false;
      state.getState().namekRevivePending = 0;
      const result = checker.check(state);
      expect(result.gameOver).toBe(false);
      expect(result.winner).toBeNull();
    });

    it('check() DOES end game when player has 0 alive and no pending revive', () => {
      state.getPlayer(0).characters[0].isAlive = false;
      state.getState().namekRevivePending = null;
      const result = checker.check(state);
      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe('p2');
    });

    it('checkAfterDeath() does NOT end game when dead player has pending revive', () => {
      state.getPlayer(0).characters[0].isAlive = false;
      state.getState().namekRevivePending = 0;
      const result = checker.checkAfterDeath(state, 0);
      expect(result.gameOver).toBe(false);
      expect(result.winner).toBeNull();
    });

    it('checkAfterDeath() DOES end game when dead player has no pending revive', () => {
      state.getPlayer(0).characters[0].isAlive = false;
      state.getState().namekRevivePending = null;
      const result = checker.checkAfterDeath(state, 0);
      expect(result.gameOver).toBe(true);
      expect(result.winner).toBe('p2');
    });

    it('check() does NOT end game when opponent has 0 alive but revive pending for them', () => {
      state.getPlayer(1).characters[0].isAlive = false;
      state.getState().namekRevivePending = 1;
      const result = checker.check(state);
      expect(result.gameOver).toBe(false);
      expect(result.winner).toBeNull();
    });
  });
});
