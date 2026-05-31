import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager, createCharacterState } from '../state/GameState';
import { CombatResolver } from './CombatResolver';
import { EventBus } from '../hooks/EventBus';

const ALL_CHAR_IDS = [
  'ssj-god-goku', 'ssj-blue-vegeta', 'golden-frieza', 'ssj-rose-black-goku',
  'ssj-broly', 'perfect-cell', 'kid-buu', 'beerus', 'hit', 'ssj2-gohan',
  'a17-a18', 'ssj3-gotenks', 'piccolo', 'jiren', 'ssj-future-trunks', 'ssj-goku',
];

/**
 * Create a game state with two characters placed per side, ready for combat.
 */
function createCombatState(): { state: GameStateManager; combat: CombatResolver } {
  const state = new GameStateManager('TEST', 'p1', 'p2', ALL_CHAR_IDS);
  const gs = state.getState();
  gs.phase = 'ATTACK';
  gs.currentPlayerIndex = 0;
  gs.turnNumber = 3;

  // Place characters
  const p1Defs = ['ssj-broly', 'ssj-blue-vegeta'].map(id => state.getCharacterDef(id)!);
  gs.players[0].characters = p1Defs.map(d => createCharacterState(d));

  const p2Defs = ['ssj2-gohan', 'beerus'].map(id => state.getCharacterDef(id)!);
  gs.players[1].characters = p2Defs.map(d => createCharacterState(d));

  // Advance the attacker enough to attack
  gs.players[0].characters[0].advanceCounter = gs.players[0].characters[0].currentLentitud;

  const bus = new EventBus();
  const combat = new CombatResolver(bus);
  return { state, combat };
}

describe('CombatResolver', () => {
  describe('Normal attack', () => {
    it('deals damage equal to attacker\'s currentAtaque', () => {
      const { state, combat } = createCombatState();
      const attacker = state.getPlayer(0).characters[0];
      const target = state.getPlayer(1).characters[0];
      const beforeHp = target.currentVida;

      const result = combat.resolveAttack(state, 0, attacker.characterId, 1, target.characterId, 'NORMAL', false, false, false);

      expect(result.success).toBe(true);
      expect(result.damageDealt).toBe(attacker.currentAtaque);
      expect(target.currentVida).toBe(beforeHp - attacker.currentAtaque);
    });

    it('resets advanceCounter to 0 after attack', () => {
      const { state, combat } = createCombatState();
      const attacker = state.getPlayer(0).characters[0];
      const target = state.getPlayer(1).characters[0];

      combat.resolveAttack(state, 0, attacker.characterId, 1, target.characterId, 'NORMAL', false, false, false);

      expect(attacker.advanceCounter).toBe(0);
    });

    it('marks attacker as having attacked this turn', () => {
      const { state, combat } = createCombatState();
      const attacker = state.getPlayer(0).characters[0];
      const target = state.getPlayer(1).characters[0];

      combat.resolveAttack(state, 0, attacker.characterId, 1, target.characterId, 'NORMAL', false, false, false);

      expect(attacker.hasAttackedThisTurn).toBe(true);
    });
  });

  describe('Definitiva attack', () => {
    it('deals the defined definitiva damage', () => {
      const { state, combat } = createCombatState();
      // Use SSJ Blue Vegeta who has a definitiva with damage 4
      const attacker = state.getPlayer(0).characters[1]; // ssj-blue-vegeta
      attacker.advanceCounter = attacker.currentLentitud;
      const target = state.getPlayer(1).characters[0];
      const beforeHp = target.currentVida;

      const result = combat.resolveAttack(state, 0, attacker.characterId, 1, target.characterId, 'DEFINITIVA', false, false, false);

      expect(result.success).toBe(true);
      expect(result.damageDealt).toBe(4);
      expect(target.currentVida).toBe(beforeHp - 4);
    });

    it('Beerus Hakai (INFINITE) kills any character instantly', () => {
      const { state, combat } = createCombatState();
      // Replace P1's first character with Beerus
      const beerusDef = state.getCharacterDef('beerus')!;
      state.getPlayer(0).characters[0] = createCharacterState(beerusDef);
      const attacker = state.getPlayer(0).characters[0];
      attacker.advanceCounter = attacker.currentLentitud;

      const target = state.getPlayer(1).characters[0];
      expect(target.isAlive).toBe(true);

      const result = combat.resolveAttack(state, 0, attacker.characterId, 1, target.characterId, 'DEFINITIVA', false, false, false);

      expect(result.success).toBe(true);
      expect(result.targetKilled).toBe(true);
      expect(target.isAlive).toBe(false);
      expect(target.currentVida).toBe(0);
    });
  });

  describe('Shield', () => {
    it('blocks damage when defender has shield', () => {
      const { state, combat } = createCombatState();
      const attacker = state.getPlayer(0).characters[0];
      const target = state.getPlayer(1).characters[0];
      target.shieldEquipped = true;
      const beforeHp = target.currentVida;

      const result = combat.resolveAttack(state, 0, attacker.characterId, 1, target.characterId, 'NORMAL', false, true, false);

      expect(result.success).toBe(true);
      expect(result.damageDealt).toBe(0);
      expect(result.shieldBroken).toBe(true);
      expect(target.shieldEquipped).toBe(false); // Shield removed
      expect(target.currentVida).toBe(beforeHp); // No damage taken
    });

    it('shield blocks definitiva too', () => {
      const { state, combat } = createCombatState();
      const attacker = state.getPlayer(0).characters[0];
      const target = state.getPlayer(1).characters[0];
      target.shieldEquipped = true;
      const beforeHp = target.currentVida;

      const result = combat.resolveAttack(state, 0, attacker.characterId, 1, target.characterId, 'DEFINITIVA', false, true, false);

      expect(result.success).toBe(true);
      expect(result.damageDealt).toBe(0);
      expect(target.currentVida).toBe(beforeHp);
    });
  });

  describe('Esquive', () => {
    it('blocks normal attack damage', () => {
      const { state, combat } = createCombatState();
      const attacker = state.getPlayer(0).characters[0];
      const target = state.getPlayer(1).characters[0];
      const beforeHp = target.currentVida;

      const result = combat.resolveAttack(state, 0, attacker.characterId, 1, target.characterId, 'NORMAL', false, false, true);

      expect(result.success).toBe(true);
      expect(result.damageDealt).toBe(0);
      expect(result.esquiveApplied).toBe(true);
      expect(target.currentVida).toBe(beforeHp);
    });

    it('does NOT block definitiva damage', () => {
      const { state, combat } = createCombatState();
      // Use Beerus to make a clear kill
      const beerusDef = state.getCharacterDef('beerus')!;
      state.getPlayer(0).characters[0] = createCharacterState(beerusDef);
      const attacker = state.getPlayer(0).characters[0];
      attacker.advanceCounter = attacker.currentLentitud;

      const target = state.getPlayer(1).characters[0];
      const beforeHp = target.currentVida;

      // Attack with definitiva + esquive — esquive should NOT work
      const result = combat.resolveAttack(state, 0, attacker.characterId, 1, target.characterId, 'DEFINITIVA', false, false, true);

      expect(result.success).toBe(true);
      // Damage goes through despite esquive
      expect(target.currentVida).toBeLessThan(beforeHp);
    });
  });

  describe('A17&A18 dual-HP pool', () => {
    it('damage applies to the twin HP pools', () => {
      const { state, combat } = createCombatState();
      // Replace P2's first character with A17&A18
      const androidDef = state.getCharacterDef('a17-a18')!;
      state.getPlayer(1).characters[0] = createCharacterState(androidDef);
      const target = state.getPlayer(1).characters[0];

      expect(target.androide17Vida).toBeDefined();
      expect(target.androide18Vida).toBeDefined();
      const before17 = target.androide17Vida!;
      const before18 = target.androide18Vida!;

      const attacker = state.getPlayer(0).characters[0];
      const result = combat.resolveAttack(state, 0, attacker.characterId, 1, target.characterId, 'NORMAL', false, false, false);

      expect(result.success).toBe(true);
      // Damage should be split between the two pools
      expect(target.androide17Vida).toBeLessThan(before17);
      expect(target.androide18Vida).toBeLessThanOrEqual(before18);
    });
  });

  describe('SSJ3 Gotenks counter-damage', () => {
    it('deals 1 damage to attacker', () => {
      const { state, combat } = createCombatState();
      // Replace P2's first character with SSJ3 Gotenks
      const gotenksDef = state.getCharacterDef('ssj3-gotenks')!;
      state.getPlayer(1).characters[0] = createCharacterState(gotenksDef);

      const attacker = state.getPlayer(0).characters[0];
      const target = state.getPlayer(1).characters[0];
      const beforeAttackerHp = attacker.currentVida;

      const result = combat.resolveAttack(state, 0, attacker.characterId, 1, target.characterId, 'NORMAL', false, false, false);

      expect(result.success).toBe(true);
      expect(result.counterDamage).toBe(1);
      expect(attacker.currentVida).toBe(beforeAttackerHp - 1);
    });
  });

  describe('Attack on dead character', () => {
    it('fails when target is already dead', () => {
      const { state, combat } = createCombatState();
      const attacker = state.getPlayer(0).characters[0];
      const target = state.getPlayer(1).characters[0];
      target.isAlive = false;

      const result = combat.resolveAttack(state, 0, attacker.characterId, 1, target.characterId, 'NORMAL', false, false, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already dead');
    });

    it('fails when attacker is dead', () => {
      const { state, combat } = createCombatState();
      const attacker = state.getPlayer(0).characters[0];
      attacker.isAlive = false;
      const target = state.getPlayer(1).characters[0];

      const result = combat.resolveAttack(state, 0, attacker.characterId, 1, target.characterId, 'NORMAL', false, false, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('dead');
    });
  });

  describe('Kid Buu double-hit', () => {
    it('applies double-hit when Kid Buu is the target', () => {
      const { state, combat } = createCombatState();
      // Replace P2's first character with Kid Buu
      const kidBuuDef = state.getCharacterDef('kid-buu')!;
      state.getPlayer(1).characters[0] = createCharacterState(kidBuuDef);

      const attacker = state.getPlayer(0).characters[0];
      const target = state.getPlayer(1).characters[0];
      const hpBeforeSecondHit = target.currentVida;

      // First hit
      const firstResult = combat.resolveAttack(state, 0, attacker.characterId, 1, target.characterId, 'NORMAL', false, false, false);
      expect(firstResult.success).toBe(true);

      if (!firstResult.targetKilled) {
        // Second hit via Kid Buu
        const secondResult = combat.applyKidBuuDoubleHit(state, 0, attacker.characterId, 1, target.characterId, 'NORMAL', false);
        expect(secondResult).not.toBeNull();
        expect(secondResult!.isDoubleHit).toBe(true);
        expect(target.currentVida).toBeLessThanOrEqual(hpBeforeSecondHit - 1);
      }
    });

    it('does not double-hit for non-Kid-Buu target', () => {
      const { state, combat } = createCombatState();
      const attacker = state.getPlayer(0).characters[0];
      const target = state.getPlayer(1).characters[0]; // ssj2-gohan, not Kid Buu

      const result = combat.applyKidBuuDoubleHit(state, 0, attacker.characterId, 1, target.characterId, 'NORMAL', false);
      expect(result).toBeNull();
    });
  });

  describe('Battlefield restrictions', () => {
    it('rejects definitiva on Tenkaichi Budokai battlefield', () => {
      const { state, combat } = createCombatState();
      state.getState().battlefield = {
        id: 'tenkaichi-budokai',
        name: 'Tenkaichi Budokai',
        effect: 'no_definitivas',
        description: '',
      };
      const attacker = state.getPlayer(0).characters[0];
      const target = state.getPlayer(1).characters[0];

      const result = combat.resolveAttack(state, 0, attacker.characterId, 1, target.characterId, 'DEFINITIVA', false, false, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Definitivas');
    });

    it('rejects attack on wrong position in Cell Games (attack_front_only)', () => {
      const { state, combat } = createCombatState();
      state.getState().battlefield = {
        id: 'cell-games',
        name: 'Cell Games',
        effect: 'attack_front_only',
        description: '',
      };
      const attacker = state.getPlayer(0).characters[0];
      const target = state.getPlayer(1).characters[1]; // Different position

      const result = combat.resolveAttack(state, 0, attacker.characterId, 1, target.characterId, 'NORMAL', false, false, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cell Games');
    });
  });
});
