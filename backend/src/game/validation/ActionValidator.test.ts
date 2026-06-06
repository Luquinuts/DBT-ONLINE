import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager, createCharacterState } from '../state/GameState';
import { ActionValidator } from './ActionValidator';
import type { GameAction } from '@dbt-online/shared';

const ALL_CHAR_IDS = [
  'ssj-god-goku', 'ssj-blue-vegeta', 'golden-frieza', 'ssj-rose-black-goku',
  'ssj-broly', 'perfect-cell', 'kid-buu', 'beerus', 'hit', 'ssj2-gohan',
  'a17-a18', 'ssj3-gotenks', 'piccolo', 'jiren', 'ssj-future-trunks', 'ssj-goku',
];

/**
 * Creates a GameStateManager in DRAFT phase ready for pick validation.
 */
function createDraftState(): GameStateManager {
  return new GameStateManager('TEST', 'p1', 'p2', ALL_CHAR_IDS);
}

/**
 * Creates a GameStateManager with characters on field in a specific phase,
 * simulating mid-game state.
 */
function createCombatState(phase: string = 'WAITING_FOR_ACTION', turnNumber: number = 3): GameStateManager {
  const state = new GameStateManager('TEST', 'p1', 'p2', ALL_CHAR_IDS);
  const gs = state.getState();

  // Place characters for both players
  const defs = ['ssj-broly', 'ssj-blue-vegeta'].map(id => state.getCharacterDef(id)!);
  gs.players[0].characters = defs.map(d => createCharacterState(d));
  const defs2 = ['ssj2-gohan', 'ssj3-gotenks'].map(id => state.getCharacterDef(id)!);
  gs.players[1].characters = defs2.map(d => createCharacterState(d));

  // Set turn and phase
  gs.currentPlayerIndex = 0;
  gs.turnNumber = turnNumber;
  gs.phase = phase as any;

  // Add some ki
  gs.players[0].ki = 5;
  gs.players[1].ki = 3;

  return state;
}

describe('ActionValidator', () => {
  describe('DRAFT_SELECT validation', () => {
    it('accepts a valid draft pick for the correct player', () => {
      const state = createDraftState();
      const available = state.getDraftState()!.availableCharacters[0];
      const result = ActionValidator.validate(state, 0, { type: 'DRAFT_SELECT', characterId: available });
      expect(result.valid).toBe(true);
    });

    it('rejects a draft pick when it is not the player\'s turn', () => {
      const state = createDraftState();
      const available = state.getDraftState()!.availableCharacters[0];
      const result = ActionValidator.validate(state, 1, { type: 'DRAFT_SELECT', characterId: available });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('NOT_YOUR_PICK');
    });

    it('rejects a draft pick for an already-picked character', () => {
      const state = createDraftState();
      // Use a character not available
      const result = ActionValidator.validate(state, 0, { type: 'DRAFT_SELECT', characterId: 'nonexistent' });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('CHARACTER_UNAVAILABLE');
    });

    it('rejects a draft pick outside PICKING phase', () => {
      const state = createDraftState();
      state.getDraftState()!.phase = 'PLACING';
      const result = ActionValidator.validate(state, 0, { type: 'DRAFT_SELECT', characterId: 'ssj-broly' });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('DRAFT_NOT_PICKING');
    });
  });

  describe('PLACE_CHARACTERS validation', () => {
    it('accepts valid character placement', () => {
      const state = createDraftState();
      const draft = state.getDraftState()!;
      draft.phase = 'PLACING';
      // Simulate P1 has 3 picks
      draft.picks[0] = ['ssj-broly', 'ssj-blue-vegeta', 'ssj2-gohan'];
      const result = ActionValidator.validate(state, 0, {
        type: 'PLACE_CHARACTERS',
        order: ['ssj-broly', 'ssj-blue-vegeta', 'ssj2-gohan'],
      });
      expect(result.valid).toBe(true);
    });

    it('rejects if character was not picked', () => {
      const state = createDraftState();
      const draft = state.getDraftState()!;
      draft.phase = 'PLACING';
      draft.picks[0] = ['ssj-broly', 'ssj-blue-vegeta', 'ssj2-gohan'];
      const result = ActionValidator.validate(state, 0, {
        type: 'PLACE_CHARACTERS',
        order: ['ssj-broly', 'ssj-blue-vegeta', 'beerus'], // beerus not picked
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('CHARACTER_NOT_PICKED');
    });
  });

  describe('ADVANCE validation', () => {
    it('accepts a valid advance', () => {
      const state = createCombatState('ADVANCE');
      const charId = state.getPlayer(0).characters[0].characterId;
      const result = ActionValidator.validate(state, 0, { type: 'ADVANCE', characterId: charId });
      expect(result.valid).toBe(true);
    });

    it('rejects advance of a dead character', () => {
      const state = createCombatState('ADVANCE');
      const char = state.getPlayer(0).characters[0];
      char.isAlive = false;
      const result = ActionValidator.validate(state, 0, { type: 'ADVANCE', characterId: char.characterId });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('CHARACTER_DEAD');
    });

    it('rejects advance if player already advanced this turn', () => {
      const state = createCombatState('ADVANCE');
      state.getPlayer(0).hasAdvancedThisTurn = true;
      const charId = state.getPlayer(0).characters[0].characterId;
      const result = ActionValidator.validate(state, 0, { type: 'ADVANCE', characterId: charId });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('ALREADY_ADVANCED');
    });

    it('rejects Jiren advance during first 2 turns', () => {
      const state = createCombatState('ADVANCE', 2);
      // Replace P1's first character with Jiren
      const jirenDef = state.getCharacterDef('jiren')!;
      state.getPlayer(0).characters[0] = createCharacterState(jirenDef);
      const result = ActionValidator.validate(state, 0, { type: 'ADVANCE', characterId: 'jiren' });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('JIREN_MEDITATION');
    });

    it('allows Jiren advance after turn 2', () => {
      const state = createCombatState('ADVANCE', 3);
      const jirenDef = state.getCharacterDef('jiren')!;
      state.getPlayer(0).characters[0] = createCharacterState(jirenDef);
      const result = ActionValidator.validate(state, 0, { type: 'ADVANCE', characterId: 'jiren' });
      expect(result.valid).toBe(true);
    });
  });

  describe('ATTACK validation', () => {
    it('accepts a valid normal attack', () => {
      const state = createCombatState('ATTACK');
      const attacker = state.getPlayer(0).characters[0];
      attacker.advanceCounter = attacker.currentLentitud; // ready to attack
      const target = state.getPlayer(1).characters[0];
      const result = ActionValidator.validate(state, 0, {
        type: 'ATTACK',
        attackerId: attacker.characterId,
        targetId: target.characterId,
        attackType: 'NORMAL',
      });
      expect(result.valid).toBe(true);
    });

    it('rejects attack on a dead target', () => {
      const state = createCombatState('ATTACK');
      const attacker = state.getPlayer(0).characters[0];
      attacker.advanceCounter = attacker.currentLentitud;
      const target = state.getPlayer(1).characters[0];
      target.isAlive = false;
      const result = ActionValidator.validate(state, 0, {
        type: 'ATTACK',
        attackerId: attacker.characterId,
        targetId: target.characterId,
        attackType: 'NORMAL',
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('TARGET_DEAD');
    });

    it('rejects attack when advanceCounter < lentitud', () => {
      const state = createCombatState('ATTACK');
      const attacker = state.getPlayer(0).characters[0];
      attacker.advanceCounter = 0; // not advanced enough
      attacker.currentLentitud = 2;
      const target = state.getPlayer(1).characters[0];
      const result = ActionValidator.validate(state, 0, {
        type: 'ATTACK',
        attackerId: attacker.characterId,
        targetId: target.characterId,
        attackType: 'NORMAL',
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('NOT_ADVANCED_ENOUGH');
    });

    it('rejects definitiva for a character without definitiva', () => {
      const state = createCombatState('ATTACK');
      const attacker = state.getPlayer(0).characters[0];
      attacker.advanceCounter = attacker.currentLentitud;
      const target = state.getPlayer(1).characters[0];
      // SSJ Broly (index 0) has a definitiva, but let's use a char without one
      // Actually Broly does have one. Let's use one without: a17-a18 has no definitiva
      const brolyDef = state.getCharacterDef('a17-a18')!;
      state.getPlayer(0).characters[0] = createCharacterState(brolyDef);
      const result = ActionValidator.validate(state, 0, {
        type: 'ATTACK',
        attackerId: 'a17-a18',
        targetId: target.characterId,
        attackType: 'DEFINITIVA',
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('NO_DEFINITIVA');
    });

    it('rejects attack when action is in wrong phase', () => {
      // Try to attack during WAITING_FOR_ACTION
      const state = createCombatState('WAITING_FOR_ACTION');
      const attacker = state.getPlayer(0).characters[0];
      const target = state.getPlayer(1).characters[0];
      const result = ActionValidator.validate(state, 0, {
        type: 'ATTACK',
        attackerId: attacker.characterId,
        targetId: target.characterId,
        attackType: 'NORMAL',
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('INVALID_PHASE');
    });
  });

  describe('DEFENDER_RESPONSE validation', () => {
    it('accepts a valid NONE response', () => {
      const state = createCombatState('DEFENDER_RESPONSE');
      state.setPendingAttack({
        attackerId: 'ssj-broly',
        attackerPlayerIndex: 0,
        targetId: 'ssj2-gohan',
        targetPlayerIndex: 1,
        attackType: 'NORMAL',
        damage: 3,
        isUltimate: false,
      });
      const result = ActionValidator.validate(state, 1, {
        type: 'DEFENDER_RESPONSE',
        action: 'NONE',
        characterId: 'ssj2-gohan',
      });
      expect(result.valid).toBe(true);
    });

    it('rejects defender response for wrong character', () => {
      const state = createCombatState('DEFENDER_RESPONSE');
      state.setPendingAttack({
        attackerId: 'ssj-broly',
        attackerPlayerIndex: 0,
        targetId: 'ssj2-gohan',
        targetPlayerIndex: 1,
        attackType: 'NORMAL',
        damage: 3,
        isUltimate: false,
      });
      const result = ActionValidator.validate(state, 1, {
        type: 'DEFENDER_RESPONSE',
        action: 'NONE',
        characterId: 'ssj3-gotenks', // wrong character
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('WRONG_CHARACTER');
    });

    it('rejects esquive against definitiva', () => {
      const state = createCombatState('DEFENDER_RESPONSE');
      state.setPendingAttack({
        attackerId: 'ssj-broly',
        attackerPlayerIndex: 0,
        targetId: 'ssj2-gohan',
        targetPlayerIndex: 1,
        attackType: 'DEFINITIVA', // not NORMAL
        damage: 5,
        isUltimate: false,
      });
      // Give P2 an esquive card in hand
      state.getPlayer(1).hand.push('esquive_1');
      const result = ActionValidator.validate(state, 1, {
        type: 'DEFENDER_RESPONSE',
        action: 'ESQUIVE',
        cardId: 'esquive_1',
        characterId: 'ssj2-gohan',
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('ESQUIVE_INVALID');
    });
  });

  describe('Phase validation', () => {
    it('rejects actions in GAME_OVER phase', () => {
      const state = createCombatState('GAME_OVER');
      const result = ActionValidator.validate(state, 0, { type: 'PASS' });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('GAME_OVER');
    });

    it('rejects action from wrong player (not their turn)', () => {
      const state = createCombatState('WAITING_FOR_ACTION');
      // P2 tries to act during P1's turn
      const result = ActionValidator.validate(state, 1, { type: 'PASS' });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('NOT_YOUR_TURN');
    });

    it('allows defender response from either player', () => {
      const state = createCombatState('DEFENDER_RESPONSE');
      state.setPendingAttack({
        attackerId: 'ssj-broly',
        attackerPlayerIndex: 0,
        targetId: 'ssj2-gohan',
        targetPlayerIndex: 1,
        attackType: 'NORMAL',
        damage: 3,
        isUltimate: false,
      });
      // P2 responds (not P1's turn, but DEFENDER_RESPONSE bypasses turn check)
      const result = ActionValidator.validate(state, 1, {
        type: 'DEFENDER_RESPONSE',
        action: 'NONE',
        characterId: 'ssj2-gohan',
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('Battlefield restrictions', () => {
    it('rejects definitiva attack on Tenkaichi Budokai battlefield', () => {
      const state = createCombatState('ATTACK');
      state.getState().battlefield = {
        id: 'tenkaichi-budokai',
        name: 'Tenkaichi Budokai',
        effect: 'no_definitivas',
        description: '',
      };
      const attacker = state.getPlayer(0).characters[0];
      attacker.advanceCounter = attacker.currentLentitud;
      const target = state.getPlayer(1).characters[0];
      const result = ActionValidator.validate(state, 0, {
        type: 'ATTACK',
        attackerId: attacker.characterId,
        targetId: target.characterId,
        attackType: 'DEFINITIVA',
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('BATTLEFIELD_BLOCKED');
    });
  });

  describe('CARD play validation', () => {
    it('rejects card not in hand', () => {
      const state = createCombatState('WAITING_FOR_ACTION');
      const result = ActionValidator.validate(state, 0, {
        type: 'PLAY_CARD',
        cardId: 'carga_ki_1',
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('CARD_NOT_IN_HAND');
    });

    it('accepts card in hand', () => {
      const state = createCombatState('WAITING_FOR_ACTION');
      state.getPlayer(0).hand.push('carga_ki_1');
      const result = ActionValidator.validate(state, 0, {
        type: 'PLAY_CARD',
        cardId: 'carga_ki_1',
      });
      expect(result.valid).toBe(true);
    });

    it('rejects target character not found', () => {
      const state = createCombatState('WAITING_FOR_ACTION');
      state.getPlayer(0).hand.push('semilla_senzu_1');
      const result = ActionValidator.validate(state, 0, {
        type: 'PLAY_CARD',
        cardId: 'semilla_senzu_1',
        targetCharacterId: 'nonexistent',
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('INVALID_TARGET');
    });
  });

  describe('Jiren meditation lock', () => {
    it('blocks Jiren from using habilidad in first 2 turns', () => {
      const state = createCombatState('WAITING_FOR_ACTION', 1);
      const jirenDef = state.getCharacterDef('jiren')!;
      state.getPlayer(0).characters[0] = createCharacterState(jirenDef);
      const result = ActionValidator.validate(state, 0, {
        type: 'USE_HABILIDAD',
        characterId: 'jiren',
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('JIREN_MEDITATION');
    });

    it('allows Jiren after turn 2', () => {
      const state = createCombatState('WAITING_FOR_ACTION', 3);
      const jirenDef = state.getCharacterDef('jiren')!;
      state.getPlayer(0).characters[0] = createCharacterState(jirenDef);
      state.getPlayer(0).hand.push('carga_ki_1');
      const result = ActionValidator.validate(state, 0, {
        type: 'PLAY_CARD',
        cardId: 'carga_ki_1',
      });
      // Card play is not Jiren-specific; Jiren lock only blocks ADVANCE, ATTACK, USE_HABILIDAD
      expect(result.valid).toBe(true);
    });
  });

  describe('BAN_CHARACTER validation', () => {
    function createBanState(): GameStateManager {
      const state = new GameStateManager('TEST', 'p1', 'p2', ALL_CHAR_IDS);
      const gs = state.getState();

      gs.phase = 'PRE_BATTLE';
      gs.preBattle = { stage: 'ban', pendingBan: { playerIndexes: [] } };
      gs.bannedCharacters = [];
      gs.battlefield = { id: 'kamehouse', name: 'Kamehouse', effect: 'disable_character', description: '' };

      // Place 3 characters per player
      const defs0 = ['ssj-broly', 'ssj-blue-vegeta', 'ssj2-gohan'].map(
        id => state.getCharacterDef(id)!,
      );
      gs.players[0].characters = defs0.map(d => createCharacterState(d));

      const defs1 = ['ssj3-gotenks', 'golden-frieza', 'perfect-cell'].map(
        id => state.getCharacterDef(id)!,
      );
      gs.players[1].characters = defs1.map(d => createCharacterState(d));

      return state;
    }

    it('accepts a valid BAN_CHARACTER action', () => {
      const state = createBanState();
      const result = ActionValidator.validate(state, 0, {
        type: 'BAN_CHARACTER',
        characterId: 'ssj-broly',
      });
      expect(result.valid).toBe(true);
    });

    it('rejects BAN_CHARACTER when not in PRE_BATTLE phase', () => {
      const state = createBanState();
      state.getState().phase = 'WAITING_FOR_ACTION';
      const result = ActionValidator.validate(state, 0, {
        type: 'BAN_CHARACTER',
        characterId: 'ssj-broly',
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('INVALID_PHASE');
    });

    it('rejects BAN_CHARACTER when ban stage is not active', () => {
      const state = createBanState();
      state.getState().preBattle = { stage: 'reveal', pendingBan: null };
      const result = ActionValidator.validate(state, 0, {
        type: 'BAN_CHARACTER',
        characterId: 'ssj-broly',
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('NOT_BAN_STAGE');
    });

    it('rejects BAN_CHARACTER for character not owned by player', () => {
      const state = createBanState();
      // Try to ban the opponent's character
      const result = ActionValidator.validate(state, 0, {
        type: 'BAN_CHARACTER',
        characterId: 'ssj3-gotenks', // P1's character
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('CHARACTER_NOT_FOUND');
    });

    it('rejects BAN_CHARACTER for already dead character', () => {
      const state = createBanState();
      const char = state.getCharacter(0, 'ssj-broly')!;
      char.isAlive = false;
      const result = ActionValidator.validate(state, 0, {
        type: 'BAN_CHARACTER',
        characterId: 'ssj-broly',
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('CHARACTER_DEAD');
    });

    it('rejects BAN_CHARACTER for the last alive character', () => {
      const state = createBanState();
      // Kill 2 of P0's characters
      state.getCharacter(0, 'ssj-broly')!.isAlive = false;
      state.getCharacter(0, 'ssj-blue-vegeta')!.isAlive = false;
      const result = ActionValidator.validate(state, 0, {
        type: 'BAN_CHARACTER',
        characterId: 'ssj2-gohan',
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('LAST_CHARACTER');
    });

    it('rejects BAN_CHARACTER if player already submitted', () => {
      const state = createBanState();
      state.getState().preBattle = {
        stage: 'ban',
        pendingBan: { playerIndexes: [0] }, // P0 already submitted
      };
      const result = ActionValidator.validate(state, 0, {
        type: 'BAN_CHARACTER',
        characterId: 'ssj-broly',
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('ALREADY_BANNED');
    });

    it('allows BAN_CHARACTER from either player (no turn check)', () => {
      const state = createBanState();
      // P2 tries to ban during what would be P1's turn
      const result = ActionValidator.validate(state, 1, {
        type: 'BAN_CHARACTER',
        characterId: 'ssj3-gotenks',
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('DRAGON_REVIVE validation (Namek revive)', () => {
    it('accepts DRAGON_REVIVE when namekRevivePending matches current player', () => {
      const state = createCombatState();
      state.getState().namekRevivePending = 0;
      // Kill a character owned by P0
      state.getCharacter(0, 'ssj-broly')!.isAlive = false;
      const result = ActionValidator.validate(state, 0, {
        type: 'DRAGON_REVIVE',
        targetCharacterId: 'ssj-broly',
      });
      expect(result.valid).toBe(true);
    });

    it('rejects DRAGON_REVIVE when pending player targets opponent dead character', () => {
      const state = createCombatState();
      state.getState().namekRevivePending = 0;
      // Kill a character owned by P1 (opponent)
      state.getCharacter(1, 'ssj2-gohan')!.isAlive = false;
      const result = ActionValidator.validate(state, 0, {
        type: 'DRAGON_REVIVE',
        targetCharacterId: 'ssj2-gohan',
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('INVALID_TARGET');
    });

    it('rejects DRAGON_REVIVE for alive character when pending', () => {
      const state = createCombatState();
      state.getState().namekRevivePending = 0;
      // ssj-broly is alive
      const result = ActionValidator.validate(state, 0, {
        type: 'DRAGON_REVIVE',
        targetCharacterId: 'ssj-broly',
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('CHARACTER_ALIVE');
    });

    it('rejects DRAGON_REVIVE when target character does not exist', () => {
      const state = createCombatState();
      state.getState().namekRevivePending = 0;
      const result = ActionValidator.validate(state, 0, {
        type: 'DRAGON_REVIVE',
        targetCharacterId: 'nonexistent',
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe('CHARACTER_NOT_FOUND');
    });
  });
});
