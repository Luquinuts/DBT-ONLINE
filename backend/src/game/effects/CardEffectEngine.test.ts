import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager, createCharacterState } from '../state/GameState';
import { CardEffectEngine } from './CardEffectEngine';
import { KiManager } from './KiManager';
import { EventBus } from '../hooks/EventBus';
import { WinConditionChecker } from '../conditions/WinConditionChecker';

const ALL_CHAR_IDS = [
  'ssj-god-goku', 'ssj-blue-vegeta', 'golden-frieza', 'ssj-rose-black-goku',
  'ssj-broly', 'perfect-cell', 'kid-buu', 'beerus', 'hit', 'ssj2-gohan',
  'a17-a18', 'ssj3-gotenks', 'piccolo', 'jiren', 'ssj-future-trunks', 'ssj-goku',
];

interface TestContext {
  state: GameStateManager;
  engine: CardEffectEngine;
  kiManager: KiManager;
}

function createTestContext(): TestContext {
  const state = new GameStateManager('TEST', 'p1', 'p2', ALL_CHAR_IDS);
  const gs = state.getState();
  gs.phase = 'WAITING_FOR_ACTION';
  gs.currentPlayerIndex = 0;
  gs.turnNumber = 3;

  // Place one character per player
  const p1Defs = ['ssj-broly', 'ssj-blue-vegeta', 'ssj-rose-black-goku'].map(id => state.getCharacterDef(id)!);
  gs.players[0].characters = p1Defs.map(d => createCharacterState(d));

  const p2Defs = ['beerus', 'ssj2-gohan', 'ssj3-gotenks'].map(id => state.getCharacterDef(id)!);
  gs.players[1].characters = p2Defs.map(d => createCharacterState(d));

  const kiManager = new KiManager();
  const eventBus = new EventBus();
  const winChecker = new WinConditionChecker();
  const engine = new CardEffectEngine(kiManager, eventBus, winChecker);

  return { state, engine, kiManager };
}

describe('CardEffectEngine', () => {
  describe('Carga de Ki (ki:1)', () => {
    it('adds 1 ki to the player', () => {
      const { state, engine } = createTestContext();
      const before = state.getPlayer(0).ki;
      const result = engine.resolve(state, 0, 'ki:1');
      expect(result.success).toBe(true);
      expect(result.kiGained).toBe(1);
      expect(state.getPlayer(0).ki).toBe(before + 1);
    });
  });

  describe('Super Carga de Ki (ki:2)', () => {
    it('adds 2 ki to the player', () => {
      const { state, engine } = createTestContext();
      const before = state.getPlayer(0).ki;
      const result = engine.resolve(state, 0, 'ki:2');
      expect(result.success).toBe(true);
      expect(result.kiGained).toBe(2);
      expect(state.getPlayer(0).ki).toBe(before + 2);
    });
  });

  describe('Semilla Senzu (heal:3)', () => {
    it('heals +3 HP without exceeding maxVida', () => {
      const { state, engine } = createTestContext();
      const char = state.getPlayer(0).characters[0];
      char.currentVida = 5; // Not full
      const maxBefore = char.maxVida;

      const result = engine.resolve(state, 0, 'heal:3', char.characterId);
      expect(result.success).toBe(true);
      expect(result.targetHealed).toBeLessThanOrEqual(3);
      expect(char.currentVida).toBe(5 + result.targetHealed!);
      expect(char.currentVida).toBeLessThanOrEqual(maxBefore);
    });

    it('caps heal at maxVida', () => {
      const { state, engine } = createTestContext();
      const char = state.getPlayer(0).characters[0];
      char.currentVida = char.maxVida - 1; // Almost full

      const result = engine.resolve(state, 0, 'heal:3', char.characterId);
      expect(result.success).toBe(true);
      expect(char.currentVida).toBe(char.maxVida);
    });
  });

  describe('+1 Vida (hp:1)', () => {
    it('adds +1 max HP and +1 current HP', () => {
      const { state, engine } = createTestContext();
      const char = state.getPlayer(0).characters[0];
      const beforeMax = char.maxVida;
      const beforeCur = char.currentVida;

      const result = engine.resolve(state, 0, 'hp:1', char.characterId);
      expect(result.success).toBe(true);
      expect(char.maxVida).toBe(beforeMax + 1);
      expect(char.currentVida).toBe(beforeCur + 1);
    });
  });

  describe('Báculo Sagrado (direct_damage:1)', () => {
    it('deals 1 damage to target', () => {
      const { state, engine } = createTestContext();
      // Target opponent's character
      const target = state.getPlayer(1).characters[0];
      const beforeHp = target.currentVida;

      const result = engine.resolve(state, 0, 'direct_damage:1', target.characterId);
      expect(result.success).toBe(true);
      expect(result.damageDealt).toBe(1);
      expect(target.currentVida).toBe(beforeHp - 1);
    });

    it('does not end the turn (no phase change)', () => {
      const { state, engine } = createTestContext();
      const target = state.getPlayer(1).characters[0];
      const beforePhase = state.getPhase();

      engine.resolve(state, 0, 'direct_damage:1', target.characterId);
      expect(state.getPhase()).toBe(beforePhase);
    });

    it('breaks shield before dealing damage', () => {
      const { state, engine } = createTestContext();
      const target = state.getPlayer(1).characters[0];
      target.shieldEquipped = true;
      const beforeHp = target.currentVida;

      const result = engine.resolve(state, 0, 'direct_damage:1', target.characterId);
      expect(result.success).toBe(true);
      expect(target.shieldEquipped).toBe(false);
      // Damage still goes through after shield is broken
      expect(target.currentVida).toBeLessThan(beforeHp);
    });
  });

  describe('Rage (rage_boost)', () => {
    it('sets rageActive and gives +1 attack to rage-icon allies', () => {
      const { state, engine } = createTestContext();
      // SSJ Broly has rage icon, SSJ Blue Vegeta does not
      const broly = state.getPlayer(0).characters[0];
      const vegeta = state.getPlayer(0).characters[1];
      const brolyAtkBefore = broly.currentAtaque;
      const vegetaAtkBefore = vegeta.currentAtaque;

      const result = engine.resolve(state, 0, 'rage_boost');
      expect(result.success).toBe(true);
      expect(state.isRageActive()).toBe(true);

      // Broly (rage icon) gets +1
      expect(broly.currentAtaque).toBe(brolyAtkBefore + 1);
      // Vegeta (no rage icon) does not
      expect(vegeta.currentAtaque).toBe(vegetaAtkBefore);
    });
  });

  describe('Nube Kinton (attack_no_lentitud)', () => {
    it('sets advanceCounter to lentitud, enabling attack', () => {
      const { state, engine } = createTestContext();
      const char = state.getPlayer(0).characters[0];
      char.advanceCounter = 0;
      char.currentLentitud = 2;

      const result = engine.resolve(state, 0, 'attack_no_lentitud', char.characterId);
      expect(result.success).toBe(true);
      expect(char.nubeKintonUsed).toBe(true);
      expect(char.advanceCounter).toBe(char.currentLentitud);
    });

    it('rejects second use on same character', () => {
      const { state, engine } = createTestContext();
      const char = state.getPlayer(0).characters[0];
      char.nubeKintonUsed = true;

      const result = engine.resolve(state, 0, 'attack_no_lentitud', char.characterId);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already used');
    });
  });

  describe('Esfera del Dragón (revive:full)', () => {
    it('revives a dead character to full stats', () => {
      const { state, engine } = createTestContext();
      const target = state.getPlayer(0).characters[0];
      // Kill the character
      target.isAlive = false;
      target.currentVida = 0;

      const result = engine.resolve(state, 0, 'revive:full', target.characterId);
      expect(result.success).toBe(true);
      expect(result.reviveComplete).toBe(true);
      expect(target.isAlive).toBe(true);
      expect(target.currentVida).toBeGreaterThan(0);
      expect(target.advanceCounter).toBe(0);
      expect(target.shieldEquipped).toBe(false);
    });

    it('fails on already alive character', () => {
      const { state, engine } = createTestContext();
      const target = state.getPlayer(0).characters[0];
      expect(target.isAlive).toBe(true);

      const result = engine.resolve(state, 0, 'revive:full', target.characterId);
      expect(result.success).toBe(false);
    });
  });

  describe('Máquina del Tiempo (extra_turn:2)', () => {
    it('returns isExtraTurn flag', () => {
      const { state, engine } = createTestContext();
      const result = engine.resolve(state, 0, 'extra_turn:2');
      expect(result.success).toBe(true);
      expect(result.isExtraTurn).toBe(true);
    });
  });

  describe('Nave Espacial (reroll_battlefield)', () => {
    it('returns battlefieldRerolled flag', () => {
      const { state, engine } = createTestContext();
      const result = engine.resolve(state, 0, 'reroll_battlefield');
      expect(result.success).toBe(true);
      expect(result.battlefieldRerolled).toBe(true);
    });
  });

  describe('ULTIMATE (ultimate_attack)', () => {
    it('decrements ultimateUsesRemaining and returns isUltimateAttack', () => {
      const { state, engine } = createTestContext();
      expect(state.getPlayer(0).ultimateUsesRemaining).toBe(2);

      const result = engine.resolve(state, 0, 'ultimate_attack');
      expect(result.success).toBe(true);
      expect(result.isUltimateAttack).toBe(true);
      expect(state.getPlayer(0).ultimateUsesRemaining).toBe(1);
    });

    it('tracks usage count — allows 2 uses, rejects third', () => {
      const { state, engine } = createTestContext();

      // Use 1
      expect(engine.resolve(state, 0, 'ultimate_attack').success).toBe(true);
      expect(state.getPlayer(0).ultimateUsesRemaining).toBe(1);

      // Use 2
      expect(engine.resolve(state, 0, 'ultimate_attack').success).toBe(true);
      expect(state.getPlayer(0).ultimateUsesRemaining).toBe(0);

      // Use 3 — fails
      const result = engine.resolve(state, 0, 'ultimate_attack');
      expect(result.success).toBe(false);
      expect(result.error).toContain('ULTIMATE');
    });
  });

  describe('Defense cards', () => {
    it('esquive (defense:esquive) returns success', () => {
      const { state, engine } = createTestContext();
      const result = engine.resolve(state, 0, 'defense:esquive');
      expect(result.success).toBe(true);
    });

    it('escudo (defense:escudo) equips shield to target', () => {
      const { state, engine } = createTestContext();
      const target = state.getPlayer(0).characters[0];
      expect(target.shieldEquipped).toBe(false);

      const result = engine.resolve(state, 0, 'defense:escudo', target.characterId);
      expect(result.success).toBe(true);
      expect(target.shieldEquipped).toBe(true);
    });
  });
});
