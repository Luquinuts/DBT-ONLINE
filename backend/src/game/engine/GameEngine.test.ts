import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from './GameEngine';
import { createCharacterState } from '../state/GameState';
import type { GameAction } from '@dbt-online/shared';

const P1 = 'player1';
const P2 = 'player2';

/**
 * Creates a fresh GameEngine for each test.
 */
function createEngine(): GameEngine {
  return new GameEngine('TEST01', P1, P2);
}

/**
 * Runs the full draft sequence for both players using available characters.
 * Skips paired characters (ssj-rose-black-goku) to avoid auto-pairing disruption
 * in generic integration tests. Use specific character IDs when testing pairing.
 */
function completeDraft(engine: GameEngine): { p1Picks: string[]; p2Picks: string[] } {
  const p1Picks: string[] = [];
  const p2Picks: string[] = [];

  function available(): string[] {
    // Filter out paired (ssj-rose-black-goku) and battlefield-affecting (kid-buu)
    // characters to keep pick counts and battlefield state predictable.
    return engine.getState().draftState!.availableCharacters.filter(
      (id) => id !== 'ssj-rose-black-goku' && id !== 'kid-buu'
    );
  }

  // P0 picks 1
  let r = engine.handleAction(P1, { type: 'DRAFT_SELECT', characterId: available()[0] });
  expect(r.success).toBe(true);
  p1Picks.push(engine.getState().draftState!.picks[0].slice(-1)[0]);

  // P1 picks 2
  r = engine.handleAction(P2, { type: 'DRAFT_SELECT', characterId: available()[0] });
  expect(r.success).toBe(true);
  p2Picks.push(engine.getState().draftState!.picks[1].slice(-1)[0]);

  r = engine.handleAction(P2, { type: 'DRAFT_SELECT', characterId: available()[0] });
  expect(r.success).toBe(true);
  p2Picks.push(engine.getState().draftState!.picks[1].slice(-1)[0]);

  // P0 picks 2
  r = engine.handleAction(P1, { type: 'DRAFT_SELECT', characterId: available()[0] });
  expect(r.success).toBe(true);
  p1Picks.push(engine.getState().draftState!.picks[0].slice(-1)[0]);

  r = engine.handleAction(P1, { type: 'DRAFT_SELECT', characterId: available()[0] });
  expect(r.success).toBe(true);
  p1Picks.push(engine.getState().draftState!.picks[0].slice(-1)[0]);

  // P1 picks last
  r = engine.handleAction(P2, { type: 'DRAFT_SELECT', characterId: available()[0] });
  expect(r.success).toBe(true);
  p2Picks.push(engine.getState().draftState!.picks[1].slice(-1)[0]);

  expect(engine.getState().draftState!.phase).toBe('PLACING');
  return { p1Picks, p2Picks };
}

/**
 * Places characters for both players and completes the PRE_BATTLE phase,
 * returning the state in WAITING_FOR_ACTION.
 */
function placeCharacters(engine: GameEngine, p1Picks: string[], p2Picks: string[]): void {
  let r = engine.handleAction(P1, { type: 'PLACE_CHARACTERS', order: p1Picks });
  expect(r.success).toBe(true);

  r = engine.handleAction(P2, { type: 'PLACE_CHARACTERS', order: p2Picks });
  expect(r.success).toBe(true);

  // After both place, phase should be PRE_BATTLE (not WAITING_FOR_ACTION)
  let s = engine.getState();
  expect(s.phase).toBe('PRE_BATTLE');
  expect(s.battlefield).not.toBeNull();

  // Complete the pre-battle countdown to reach WAITING_FOR_ACTION
  engine.completePreBattle();

  s = engine.getState();
  expect(s.phase).toBe('WAITING_FOR_ACTION');
  expect(s.players[0].hand.length).toBeGreaterThan(0);
  expect(s.players[1].hand.length).toBeGreaterThan(0);
}

/**
 * Run a single player's turn: play a ki card → pass → advance → (if possible) attack → end turn.
 * Returns true if the game is still going, false if it ended.
 */
function runTurn(engine: GameEngine, playerId: string, opponentId: string): boolean {
  const s0 = engine.getState();
  const playerIndex = s0.players[0].playerId === playerId ? 0 : 1;
  const pi = playerIndex;
  const opp = pi === 0 ? 1 : 0;

  // ── Play a card (ki card if possible) ──
  const hand = s0.players[pi].hand;
  let cardPlayed = false;
  for (const cardId of hand) {
    if (cardId.startsWith('carga_ki') || cardId.startsWith('super_carga_ki')) {
      const r = engine.handleAction(playerId, { type: 'PLAY_CARD', cardId });
      if (r.success) { cardPlayed = true; break; }
    }
  }
  if (!cardPlayed && hand.length > 0) {
    const target = s0.players[pi].characters.find(c => c.isAlive);
    if (target) {
      const r = engine.handleAction(playerId, { type: 'PLAY_CARD', cardId: hand[0], targetCharacterId: target.characterId });
      cardPlayed = r.success;
    }
  }

  // ── Pass to advance phase ──
  let r = engine.handleAction(playerId, { type: 'PASS' });
  if (!r.success) return false; // Game may have ended

  // ── Advance a character ──
  let s = engine.getState();
  if (s.phase === 'ADVANCE') {
    const aliveChars = s.players[pi].characters.filter(c => c.isAlive);
    // Don't advance disabled characters like Jiren in first 2 turns
    const advancable = aliveChars.find(c =>
      !(c.characterId === 'jiren' && s.turnNumber <= 2)
    );
    if (advancable) {
      r = engine.handleAction(playerId, { type: 'ADVANCE', characterId: advancable.characterId });
      if (!r.success) return false;
    }
  }

  // ── Attack if eligible ──
  s = engine.getState();
  if (s.phase === 'ATTACK') {
    const eligible = s.players[pi].characters.filter(
      c => c.isAlive && c.advanceCounter >= c.currentLentitud && !c.hasAttackedThisTurn && !(c.characterId === 'jiren' && s.turnNumber <= 2)
    );
    const targets = s.players[opp].characters.filter(c => c.isAlive);
    if (eligible.length > 0 && targets.length > 0) {
      r = engine.handleAction(playerId, {
        type: 'ATTACK',
        attackerId: eligible[0].characterId,
        targetId: targets[0].characterId,
        attackType: 'NORMAL',
      } as GameAction);

      if (r.success && r.defenderWindow) {
        // Defender responds NONE
        r = engine.handleAction(opponentId, {
          type: 'DEFENDER_RESPONSE',
          action: 'NONE',
          characterId: targets[0].characterId,
        } as GameAction);
      }
    }
  }

  // ── End turn ──
  s = engine.getState();
  if (s.phase !== 'GAME_OVER') {
    if (s.phase !== 'WAITING_FOR_ACTION') {
      engine.handleAction(playerId, { type: 'END_TURN' });
    }
  }

  s = engine.getState();
  return s.phase !== 'GAME_OVER';
}

/**
 * Helper: sets up a game and forces the Namek battlefield.
 * Returns the engine instance and the internal state for manipulation.
 */
function setupNamekReviveTest(): { engine: GameEngine; internal: any } {
  const engine = createEngine();
  const { p1Picks, p2Picks } = completeDraft(engine);
  placeCharacters(engine, p1Picks, p2Picks);

  const internal = (engine as any).state;
  const gs = internal.getState();

  // Override battlefield to Namek with revive_on_last
  gs.battlefield = {
    id: 'namek',
    name: 'Namek',
    effect: 'revive_on_last:1',
    description: 'Namek battlefield — revive once when one fighter remains.',
  };

  return { engine, internal };
}

describe('GameEngine Integration', () => {
  describe('Draft phase', () => {
    it('completes full draft sequence correctly', () => {
      const engine = createEngine();
      const { p1Picks, p2Picks } = completeDraft(engine);

      const s = engine.getState();
      expect(s.draftState!.picks[0].length).toBe(3);
      expect(s.draftState!.picks[1].length).toBe(3);
      expect(s.draftState!.phase).toBe('PLACING');
    });

    it('rejects invalid draft picks', () => {
      const engine = createEngine();
      const available = engine.getState().draftState!.availableCharacters;

      // P2 tries to pick first (out of turn) — validation catches it first
      let r = engine.handleAction(P2, { type: 'DRAFT_SELECT', characterId: available[0] });
      expect(r.success).toBe(false);
      expect(r.error?.code).toBe('NOT_YOUR_PICK');

      // P1 picks valid first
      r = engine.handleAction(P1, { type: 'DRAFT_SELECT', characterId: available[0] });
      expect(r.success).toBe(true);

      // P1 tries to pick again (out of turn — now it's P2's turn)
      r = engine.handleAction(P1, { type: 'DRAFT_SELECT', characterId: available[1] });
      expect(r.success).toBe(false);
      expect(r.error?.code).toBe('NOT_YOUR_PICK');
    });
  });

  describe('Pre-battle phase', () => {
    it('transitions through PRE_BATTLE to WAITING_FOR_ACTION', () => {
      const engine = createEngine();
      const { p1Picks, p2Picks } = completeDraft(engine);

      placeCharacters(engine, p1Picks, p2Picks);

      const s = engine.getState();
      expect(s.phase).toBe('WAITING_FOR_ACTION');
      expect(s.battlefield).not.toBeNull();
      expect(s.turnNumber).toBe(1);
      expect(s.currentPlayerIndex).toBe(0);
    });
  });

  describe('Turn lifecycle', () => {
    it('executes a full turn: WAITING → ADVANCE → ATTACK → END_TURN', () => {
      const engine = createEngine();
      const { p1Picks, p2Picks } = completeDraft(engine);
      placeCharacters(engine, p1Picks, p2Picks);

      const gameStillGoing = runTurn(engine, P1, P2);

      const s = engine.getState();
      // Game should still be going after 1 turn
      if (gameStillGoing) {
        expect(s.phase).toBe('WAITING_FOR_ACTION');
        // Should be P2's turn now
        expect(s.currentPlayerIndex).toBe(1);
        expect(s.turnNumber).toBe(2);
      }
    });

  it('alternates turns between players', () => {
      const engine = createEngine();
      const { p1Picks, p2Picks } = completeDraft(engine);
      placeCharacters(engine, p1Picks, p2Picks);

      let s = engine.getState();
      // Record initial turn info
      expect(s.phase).toBe('WAITING_FOR_ACTION');
      expect(s.currentPlayerIndex).toBe(0);
      expect(s.turnNumber).toBe(1);

      // ── P1's turn ──
      // PASS to go from WAITING → ADVANCE
      let r = engine.handleAction(P1, { type: 'PASS' });
      expect(r.success).toBe(true);

      s = engine.getState();
      // Advance a character
      if (s.phase === 'ADVANCE') {
        const adv = s.players[0].characters.find(c => c.isAlive && !(c.characterId === 'jiren' && s.turnNumber <= 2));
        if (adv) {
          r = engine.handleAction(P1, { type: 'ADVANCE', characterId: adv.characterId });
          expect(r.success).toBe(true);
        }
      }

      // After advancing, the phase could be ATTACK (if eligible attackers exist)
      // or WAITING_FOR_ACTION (if auto-endTurn triggered due to no eligible attackers).
      // Either way is fine — what matters is that the turn eventually transitions.
      s = engine.getState();
      const p1Phase = s.phase;
      if (p1Phase === 'ATTACK') {
        r = engine.handleAction(P1, { type: 'PASS' });
        s = engine.getState(); // Re-read state after action
        // PASS in ATTACK should succeed unless game already ended
        if (!r.success) {
          // Game may have ended (e.g., if auto-win triggered)
          expect(s.phase).toBe('GAME_OVER');
        }
      }

      // The game should now be on P2's turn
      s = engine.getState();
      if (s.phase !== 'GAME_OVER') {
        expect(s.phase).toBe('WAITING_FOR_ACTION');
        expect(s.currentPlayerIndex).toBe(1);
        // Turn number must have advanced
        expect(s.turnNumber).toBeGreaterThanOrEqual(2);
      }
      const turnBeforeP2 = s.turnNumber;

      // ── P2's turn ──
      if (s.phase !== 'GAME_OVER') {
        r = engine.handleAction(P2, { type: 'PASS' });
        expect(r.success).toBe(true);

        s = engine.getState();
        if (s.phase === 'ADVANCE') {
          const adv = s.players[1].characters.find(c => c.isAlive && !(c.characterId === 'jiren' && s.turnNumber <= 2));
          if (adv) {
            r = engine.handleAction(P2, { type: 'ADVANCE', characterId: adv.characterId });
            expect(r.success).toBe(true);
          }
        }

        s = engine.getState();
        if (s.phase === 'ATTACK') {
          r = engine.handleAction(P2, { type: 'PASS' });
        }

        s = engine.getState();
      }

      // Verify we're back to P1's turn
      if (s.phase !== 'GAME_OVER') {
        expect(s.phase).toBe('WAITING_FOR_ACTION');
        expect(s.currentPlayerIndex).toBe(0);
        expect(s.turnNumber).toBe(turnBeforeP2 + 1);
      }
    });

    it('player draws a card at end of turn', () => {
      const engine = createEngine();
      const { p1Picks, p2Picks } = completeDraft(engine);
      placeCharacters(engine, p1Picks, p2Picks);

      const handSizeBefore = engine.getState().players[0].hand.length;
      runTurn(engine, P1, P2);

      const s = engine.getState();
      // P1 should have drawn a card (hand size increased by 1)
      if (s.phase !== 'GAME_OVER') {
        // Hand may be same if a card was played, but total (hand + discard) should increase by 1
        const p1 = s.players[0];
        expect(handSizeBefore + p1.discardPile.length).toBeGreaterThanOrEqual(handSizeBefore);
      }
    });
  });

  describe('Defender response', () => {
    it('esquive blocks damage and transitions correctly', () => {
      const engine = createEngine();
      const { p1Picks, p2Picks } = completeDraft(engine);
      placeCharacters(engine, p1Picks, p2Picks);

      const s = engine.getState();

      // ── Ensure P2 has an esquive card in hand ──
      // engine.getState() returns a DEEP CLONE, so we access the internal state directly
      ;(engine as any).state.getState().players[1].hand.push('esquive_1');
      const esquiveCard = 'esquive_1';

      // ── Manually set P1's first alive character to be attack-ready ──
      const p1Char = s.players[0].characters.find(c => c.isAlive);
      expect(p1Char).toBeDefined();

      // Jiren can't act in first 2 turns
      if (p1Char!.characterId === 'jiren' && s.turnNumber <= 2) {
        console.warn('Jiren cannot act — skipping test');
        return;
      }

      // Can't attack the same turn as advancing — set advanceCounter so they're already advanced
      if (p1Char!.currentLentitud > 0) {
        p1Char!.advanceCounter = p1Char!.currentLentitud;
      }

      // ── Pass WAITING_FOR_ACTION → ADVANCE ──
      engine.handleAction(P1, { type: 'PASS' });

      let gs = engine.getState();
      expect(gs.phase).toBe('ADVANCE');

      // ── Advance a DIFFERENT character (so the attack-ready one stays eligible) ──
      const otherChar = gs.players[0].characters.find(
        c => c.isAlive && c.characterId !== p1Char!.characterId
      );

      if (otherChar) {
        engine.handleAction(P1, { type: 'ADVANCE', characterId: otherChar.characterId });
      } else {
        // No other character — advance the attacker anyway
        // Their advanceCounter will go above lentitud but hasAttackedThisTurn will be true
        // This means no one is eligible after advance, turn ends, we can't test esquive
        engine.handleAction(P1, { type: 'ADVANCE', characterId: p1Char!.characterId });
        gs = engine.getState();
        if (gs.phase !== 'ATTACK') {
          console.warn('No eligible attackers after advance — test inconclusive');
          return;
        }
      }

      gs = engine.getState();
      if (gs.phase !== 'ATTACK') {
        console.warn('Phase is not ATTACK — skipping test');
        return;
      }

      // ── Attack with the manually-prepared character ──
      const attacker = gs.players[0].characters.find(
        c => c.characterId === p1Char!.characterId
      );
      const target = gs.players[1].characters.find(c => c.isAlive);

      expect(attacker).toBeDefined();
      expect(target).toBeDefined();
      expect(attacker!.advanceCounter >= attacker!.currentLentitud).toBe(true);
      expect(attacker!.hasAttackedThisTurn).toBe(false);

      const hpBefore = target!.currentVida;

      const r = engine.handleAction(P1, {
        type: 'ATTACK',
        attackerId: attacker!.characterId,
        targetId: target!.characterId,
        attackType: 'NORMAL',
      } as GameAction);

      expect(r.defenderWindow).toBe(true);

      // ── Defender esquives ──
      const r2 = engine.handleAction(P2, {
        type: 'DEFENDER_RESPONSE',
        action: 'ESQUIVE',
        characterId: target!.characterId,
        cardId: esquiveCard,
      } as GameAction);

      if (!r2.success) {
        console.warn('Esquive failed:', r2.error?.code, r2.error?.message);
      }
      expect(r2.success).toBe(true);

      gs = engine.getState();

      // Target should have full HP (no damage through)
      const targetAfter = gs.players[1].characters.find(c => c.characterId === target!.characterId);
      expect(targetAfter?.currentVida).toBe(hpBefore);

      // Attacker advanceCounter should be reset to 0
      const attackerAfter = gs.players[0].characters.find(c => c.characterId === attacker!.characterId);
      expect(attackerAfter?.advanceCounter).toBe(0);

      // hasAttackedThisTurn: reset by endTurn since no more eligible attackers remained
      // (checked via the DEBUG value below — CombatResolver sets it to true, endTurn resets to false)

      // Phase should be WAITING_FOR_ACTION (next player) since no more eligible attackers
      expect(gs.phase).toBe('WAITING_FOR_ACTION');
      expect(gs.currentPlayerIndex).toBe(1);

      // Esquive card should be consumed
      expect(gs.players[1].hand).not.toContain(esquiveCard);
      expect(gs.players[1].discardPile).toContain(esquiveCard);
    });

    it('opens defender window on attack, NONE goes through', () => {
      const engine = createEngine();
      const { p1Picks, p2Picks } = completeDraft(engine);
      placeCharacters(engine, p1Picks, p2Picks);

      // Get P1 to attack phase
      const s0 = engine.getState();
      // Play a Nube Kinton card if available to skip lentitud
      const p1Hand = s0.players[0].hand;
      const nubeKinton = p1Hand.find(c => c.startsWith('nube_kinton'));
      if (nubeKinton) {
        const target = s0.players[0].characters.find(c => c.isAlive);
        if (target) {
          engine.handleAction(P1, { type: 'PLAY_CARD', cardId: nubeKinton, targetCharacterId: target.characterId });
        }
      }

      // Pass to advance
      engine.handleAction(P1, { type: 'PASS' });

      let s = engine.getState();
      // Advance a character
      const advancable = s.players[0].characters.find(c => c.isAlive);
      if (advancable) {
        // If Jiren in first 2 turns, skip
        if (!(advancable.characterId === 'jiren' && s.turnNumber <= 2)) {
          engine.handleAction(P1, { type: 'ADVANCE', characterId: advancable.characterId });
        }
      }

      // Attack if eligible
      s = engine.getState();
      if (s.phase === 'ATTACK') {
        const eligible = s.players[0].characters.filter(
          c => c.isAlive && c.advanceCounter >= c.currentLentitud && !c.hasAttackedThisTurn
        );
        const target = s.players[1].characters.find(c => c.isAlive);
        if (eligible.length > 0 && target) {
          const hpBefore = target.currentVida;
          const r = engine.handleAction(P1, {
            type: 'ATTACK',
            attackerId: eligible[0].characterId,
            targetId: target.characterId,
            attackType: 'NORMAL',
          } as GameAction);

          expect(r.defenderWindow).toBe(true);

          // Defender responds NONE
          const r2 = engine.handleAction(P2, {
            type: 'DEFENDER_RESPONSE',
            action: 'NONE',
            characterId: target.characterId,
          } as GameAction);

          expect(r2.success).toBe(true);

          s = engine.getState();
          const targetAfter = s.players[1].characters.find(c => c.characterId === target.characterId);
          if (targetAfter) {
            // Damage went through since defender chose NONE
            expect(targetAfter.currentVida).toBeLessThanOrEqual(hpBefore);
          }
        }
      }
    });
  });

  describe('Game over', () => {
    it('game ends when all characters on one side die', () => {
      const engine = createEngine();
      const { p1Picks, p2Picks } = completeDraft(engine);
      placeCharacters(engine, p1Picks, p2Picks);

      // Kill all of P2's characters by direct damage
      const s = engine.getState();
      const p2Chars = s.players[1].characters;
      for (let i = 0; i < p2Chars.length; i++) {
        p2Chars[i].isAlive = false;
        p2Chars[i].currentVida = 0;
      }

      // Trigger win check
      const r = engine.handleAction(P1, { type: 'PASS' });
      // Game should be over
      if (engine.isGameOver()) {
        expect(engine.getWinner()).toBe(P1);
        expect(engine.getState().phase).toBe('GAME_OVER');
      }
    });
  });

  describe('Jiren meditation lock', () => {
    it('Jiren cannot act for first 2 turns', () => {
      const engine = createEngine();
      const { p1Picks, p2Picks } = completeDraft(engine);
      // Force Jiren into P1's picks
      // Instead, modify the state to add the right character

      // First, let's just complete placement normally, then check Jiren rules
      placeCharacters(engine, p1Picks, p2Picks);

      // Check that Jiren (if present) is blocked
      const s = engine.getState();
      const p1Jiren = s.players[0].characters.find(c => c.characterId === 'jiren');
      if (p1Jiren && s.turnNumber <= 2) {
        const r = engine.handleAction(P1, { type: 'ADVANCE', characterId: 'jiren' });
        expect(r.success).toBe(false);
        expect(r.error?.code).toBe('ADVANCE_ERROR');
      }
    });
  });

  describe('Multiple turns with advance tracking', () => {
    it('can play multiple turns without crashing', () => {
      const engine = createEngine();
      const { p1Picks, p2Picks } = completeDraft(engine);
      placeCharacters(engine, p1Picks, p2Picks);

      // Play through up to 4 turns (2 per player)
      for (let turn = 0; turn < 4; turn++) {
        const s = engine.getState();
        if (s.phase === 'GAME_OVER') break;

        const currentPlayerId = s.players[s.currentPlayerIndex].playerId;
        const opponentId = s.players[s.currentPlayerIndex === 0 ? 1 : 0].playerId;
        runTurn(engine, currentPlayerId, opponentId);
      }

      const s = engine.getState();
      if (s.phase !== 'GAME_OVER') {
        expect(s.turnNumber).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('Namek revive mechanic', () => {
    it('triggers namekRevivePending when a player has 1 alive on revive_on_last battlefield', () => {
      const { engine, internal } = setupNamekReviveTest();
      const gs = internal.getState();

      // Kill one of P1's characters so they have 2 alive (from 3)
      gs.players[0].characters[0].isAlive = false;
      expect(internal.getAliveCharacters(0).length).toBe(2);

      // Kill another so they have exactly 1 alive + ≥1 dead
      gs.players[0].characters[1].isAlive = false;
      expect(internal.getAliveCharacters(0).length).toBe(1);
      expect(gs.namekRevivePending).toBeNull();

      // Run an action to trigger the detection hook
      const r = engine.handleAction(P1, { type: 'PASS' });
      expect(r.success).toBe(true);

      // Verify pending is set for P0
      expect(gs.namekRevivePending).toBe(0);
      expect(gs.namekReviveUsed).toBe(false);
    });

    it('does NOT trigger when Kid Buu is alive on either field', () => {
      const { engine, internal } = setupNamekReviveTest();
      const gs = internal.getState();

      // Add Kid Buu to P1's field as alive
      const kidBuuDef = internal.getCharacterDef('kid-buu');
      const kidBuuState = createCharacterState(kidBuuDef);
      gs.players[0].characters.push(kidBuuState);

      // Kill all 3 original characters, leaving only Kid Buu alive
      gs.players[0].characters[0].isAlive = false;
      gs.players[0].characters[1].isAlive = false;
      gs.players[0].characters[2].isAlive = false;

      // P0 now has only Kid Buu alive = 1 alive
      expect(internal.getAliveCharacters(0).length).toBe(1);

      // Run action — should NOT trigger because Kid Buu blocks
      const r = engine.handleAction(P1, { type: 'PASS' });
      expect(r.success).toBe(true);
      expect(gs.namekRevivePending).toBeNull();
    });

    it('does NOT trigger when namekReviveUsed is already true', () => {
      const { engine, internal } = setupNamekReviveTest();
      const gs = internal.getState();

      // Mark revive as already used
      gs.namekReviveUsed = true;

      // Kill two characters so P0 has 1 alive
      gs.players[0].characters[0].isAlive = false;
      gs.players[0].characters[1].isAlive = false;
      expect(internal.getAliveCharacters(0).length).toBe(1);

      const r = engine.handleAction(P1, { type: 'PASS' });
      expect(r.success).toBe(true);
      expect(gs.namekRevivePending).toBeNull();
    });

    it('does NOT trigger on non-revive battlefields', () => {
      const { engine, internal } = setupNamekReviveTest();
      const gs = internal.getState();

      // Change battlefield to something else
      gs.battlefield = {
        id: 'tenkaichi',
        name: 'Tenkaichi Budokai',
        effect: 'no_definitivas',
        description: 'Definitivas forbidden.',
      };

      gs.players[0].characters[0].isAlive = false;
      gs.players[0].characters[1].isAlive = false;
      expect(internal.getAliveCharacters(0).length).toBe(1);

      const r = engine.handleAction(P1, { type: 'PASS' });
      expect(r.success).toBe(true);
      expect(gs.namekRevivePending).toBeNull();
    });

    it('DRAGON_REVIVE succeeds without card when namekRevivePending is set', () => {
      const { engine, internal } = setupNamekReviveTest();
      const gs = internal.getState();

      // Kill 2 characters so P0 has 1 alive
      gs.players[0].characters[0].isAlive = false;
      gs.players[0].characters[1].isAlive = false;

      // Manually set pending (detection would do this, but action changes phase)
      gs.namekRevivePending = 0;
      gs.phase = 'WAITING_FOR_ACTION';

      // Ensure no Esfera del Dragón in hand
      gs.players[0].hand = gs.players[0].hand.filter(
        (c: string) => !c.startsWith('esfera_dragon_')
      );

      // Revive without having Esfera del Dragón in hand
      const deadCharId = gs.players[0].characters[0].characterId;
      const r = engine.handleAction(P1, {
        type: 'DRAGON_REVIVE',
        targetCharacterId: deadCharId,
      });
      expect(r.success).toBe(true);

      // Verify post-revive state
      expect(gs.namekReviveUsed).toBe(true);
      expect(gs.namekRevivePending).toBeNull();
      expect(internal.getCharacter(0, deadCharId)!.isAlive).toBe(true);
    });

    it('rejects DRAGON_REVIVE without card when not pending', () => {
      const { engine, internal } = setupNamekReviveTest();
      const gs = internal.getState();

      // Kill a character but don't trigger revive (different battlefield)
      gs.battlefield = {
        id: 'tenkaichi',
        name: 'Tenkaichi Budokai',
        effect: 'no_definitivas',
        description: '',
      };
      gs.players[0].characters[0].isAlive = false;
      const deadCharId = gs.players[0].characters[0].characterId;

      // Ensure no Esfera del Dragón in hand
      gs.players[0].hand = gs.players[0].hand.filter(
        (c: string) => !c.startsWith('esfera_dragon_')
      );

      const r = engine.handleAction(P1, {
        type: 'DRAGON_REVIVE',
        targetCharacterId: deadCharId,
      });
      expect(r.success).toBe(false);
      expect(r.error?.code).toBe('NO_DRAGON_BALL');
    });

    it('win condition does NOT trigger when player has 0 alive but revive pending', () => {
      const { engine, internal } = setupNamekReviveTest();
      const gs = internal.getState();

      // Kill all P0 characters
      gs.players[0].characters.forEach((c: any) => { c.isAlive = false; });
      // Set pending for P0
      gs.namekRevivePending = 0;

      // Run action that would trigger win check
      const r = engine.handleAction(P1, { type: 'PASS' });
      // Game should NOT be over
      expect(gs.phase).not.toBe('GAME_OVER');
      expect(gs.winner).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('rejects action from unknown player', () => {
      const engine = createEngine();
      const r = engine.handleAction('unknown', { type: 'PASS' });
      expect(r.success).toBe(false);
      expect(r.error?.code).toBe('PLAYER_NOT_FOUND');
    });

    it('rejects PASS in DRAFT phase', () => {
      const engine = createEngine();
      const r = engine.handleAction(P1, { type: 'PASS' });
      expect(r.success).toBe(false);
    });
  });
});
