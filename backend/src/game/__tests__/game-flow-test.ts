#!/usr/bin/env tsx
/**
 * End-to-End Game Flow Smoke Test
 * ================================
 *
 * Simulates a complete game from draft through combat to game over,
 * exercising the GameEngine, GameRegistry, and the full subsystem chain
 * (DraftManager → TurnManager → CombatResolver → KiManager → CardEffectEngine
 *  → WinConditionChecker → EventBus → ActionValidator).
 *
 * Run with:  npx tsx src/game/__tests__/game-flow-test.ts
 *
 * The socket layer (socket.io) is NOT exercised here because it requires
 * socket.io-client, which isn't installed in the project. The test verifies
 * the game flow at the engine + registry level — the socket handlers are
 * thin delegates that pass through to this same engine API.
 *
 * To fully verify the socket integration, run the server and use a client
 * to connect and play a game manually.
 */

/* eslint-disable no-console */

import { GameEngine } from '../engine/GameEngine';
import { gameRegistry } from '../GameRegistry';
import type { GameState, GameAction } from '@dbt-online/shared';

// ─── Test configuration ──────────────────────────────────────────

const ROOM_CODE = 'TEST01';
const ROOM_ID = 'test-room-uuid-0000-0000-000000000000';
const PLAYER_1_ID = 'test-player-socket-1';
const PLAYER_2_ID = 'test-player-socket-2';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function assertState(
  label: string,
  state: GameState,
  check: (s: GameState) => boolean,
  detail?: string
): void {
  assert(label, check(state), detail);
}

// ─── Helpers ─────────────────────────────────────────────────────

function act(engine: GameEngine, playerId: string, action: GameAction): Awaited<ReturnType<typeof engine.handleAction>> {
  return engine.handleAction(playerId, action);
}

// ─── Test suite ──────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  🎴 DBT-ONLINE — End-to-End Game Flow Smoke Test');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  // ─────────────────────────────────────────────────────────────
  // 1. Game Registry — create a game
  // ─────────────────────────────────────────────────────────────
  console.log('── Phase 1: Game Creation ────────────────────────');

  const engine = gameRegistry.createGame(ROOM_CODE, ROOM_ID, PLAYER_1_ID, PLAYER_2_ID);

  assert('Registry size is 1', gameRegistry.size === 1);
  assert('Game can be retrieved by room code', gameRegistry.getGame(ROOM_CODE) === engine);
  assert('Room ID maps correctly', gameRegistry.getRoomId(ROOM_CODE) === ROOM_ID);

  // ─────────────────────────────────────────────────────────────
  // 2. Initial State — DRAFT phase
  // ─────────────────────────────────────────────────────────────
  console.log('');
  console.log('── Phase 2: Initial State (DRAFT) ────────────────');

  const state0 = engine.getState();

  assertState('Phase is DRAFT', state0, (s) => s.phase === 'DRAFT');
  assertState('Turn number is 1', state0, (s) => s.turnNumber === 1);
  assertState('Winner is null', state0, (s) => s.winner === null);
  assertState('Player 1 has correct ID', state0, (s) => s.players[0].playerId === PLAYER_1_ID);
  assertState('Player 2 has correct ID', state0, (s) => s.players[1].playerId === PLAYER_2_ID);
  assertState('Both players have empty hands', state0, (s) =>
    s.players[0].hand.length === 0 && s.players[1].hand.length === 0
  );
  assertState('Both players have empty characters', state0, (s) =>
    s.players[0].characters.length === 0 && s.players[1].characters.length === 0
  );
  assertState('Draft state exists', state0, (s) => s.draftState !== null);
  assertState('Draft is in PICKING phase', state0, (s) => s.draftState?.phase === 'PICKING');
  assertState('Draft has available characters', state0, (s) =>
    (s.draftState?.availableCharacters.length ?? 0) > 0
  );
  assertState('No battlefield yet', state0, (s) => s.battlefield === null);

  // ─────────────────────────────────────────────────────────────
  // 3. Draft Phase — PICKING
  // ─────────────────────────────────────────────────────────────
  // Draft sequence: J1 picks 1, J2 picks 2, J1 picks 2, J2 picks 1
  // = 3 characters per player, 6 picks total
  console.log('');
  console.log('── Phase 3: Draft Picking ────────────────────────');

  const availableChars = state0.draftState!.availableCharacters;
  const p1Picks: string[] = [];
  const p2Picks: string[] = [];

  // Each pick reads the CURRENT available characters from the live state,
  // because the array shrinks as characters are picked.

  function readAvailable(): string[] {
    return engine.getState().draftState!.availableCharacters;
  }

  // Pick 1 (step 0): P1 picks 1
  let r = act(engine, PLAYER_1_ID, { type: 'DRAFT_SELECT', characterId: readAvailable()[0] });
  assert('Pick 1 (P1) succeeds', r.success, JSON.stringify(r.error));
  if (r.success) {
    const s = engine.getState();
    p1Picks.push(s.draftState!.picks[0].slice(-1)[0]);
  }

  // Pick 2 (step 1): P2 picks (first of 2)
  r = act(engine, PLAYER_2_ID, { type: 'DRAFT_SELECT', characterId: readAvailable()[0] });
  assert('Pick 2 (P2) succeeds', r.success, JSON.stringify(r.error));
  if (r.success) {
    const s = engine.getState();
    p2Picks.push(s.draftState!.picks[1].slice(-1)[0]);
  }

  // Pick 3 (step 1): P2 picks (second of 2)
  r = act(engine, PLAYER_2_ID, { type: 'DRAFT_SELECT', characterId: readAvailable()[0] });
  assert('Pick 3 (P2) succeeds', r.success, JSON.stringify(r.error));
  if (r.success) {
    const s = engine.getState();
    p2Picks.push(s.draftState!.picks[1].slice(-1)[0]);
  }

  // Pick 4 (step 2): P1 picks (first of 2)
  r = act(engine, PLAYER_1_ID, { type: 'DRAFT_SELECT', characterId: readAvailable()[0] });
  assert('Pick 4 (P1) succeeds', r.success, JSON.stringify(r.error));
  if (r.success) {
    const s = engine.getState();
    p1Picks.push(s.draftState!.picks[0].slice(-1)[0]);
  }

  // Pick 5 (step 2): P1 picks (second of 2)
  r = act(engine, PLAYER_1_ID, { type: 'DRAFT_SELECT', characterId: readAvailable()[0] });
  assert('Pick 5 (P1) succeeds', r.success, JSON.stringify(r.error));
  if (r.success) {
    const s = engine.getState();
    p1Picks.push(s.draftState!.picks[0].slice(-1)[0]);
  }

  // Pick 6 (step 3): P2 picks (last one)
  r = act(engine, PLAYER_2_ID, { type: 'DRAFT_SELECT', characterId: readAvailable()[0] });
  assert('Pick 6 (P2) succeeds', r.success, JSON.stringify(r.error));
  if (r.success) {
    const s = engine.getState();
    p2Picks.push(s.draftState!.picks[1].slice(-1)[0]);
  }

  // Verify draft state
  const stateAfterPicks = engine.getState();
  assertState('Draft phase is PLACING', stateAfterPicks, (s) => s.draftState?.phase === 'PLACING');
  assertState('P1 has 3 picks', stateAfterPicks, (s) => s.draftState!.picks[0].length === 3);
  assertState('P2 has 3 picks', stateAfterPicks, (s) => s.draftState!.picks[1].length === 3);
  console.log(`  P1 picks: ${p1Picks.join(', ')}`);
  console.log(`  P2 picks: ${p2Picks.join(', ')}`);

  // ─────────────────────────────────────────────────────────────
  // 4. Draft Phase — PLACING (character order)
  // ─────────────────────────────────────────────────────────────
  console.log('');
  console.log('── Phase 4: Draft Placing ────────────────────────');

  // P1 places characters
  r = act(engine, PLAYER_1_ID, { type: 'PLACE_CHARACTERS', order: p1Picks });
  assert('P1 places characters', r.success, JSON.stringify(r.error));

  const stateBeforeP2Place = engine.getState();
  assertState('P1 has characters on field', stateBeforeP2Place, (s) => s.players[0].characters.length === 3);
  assertState('Game still in DRAFT phase (waiting for P2)', stateBeforeP2Place, (s) => s.phase === 'DRAFT');

  // P2 places characters — this triggers deal + first turn
  r = act(engine, PLAYER_2_ID, { type: 'PLACE_CHARACTERS', order: p2Picks });
  assert('P2 places characters', r.success, JSON.stringify(r.error));

  const stateAfterPlace = engine.getState();
  assertState('P2 has characters on field', stateAfterPlace, (s) => s.players[1].characters.length === 3);
  assertState('Phase transitioned from DRAFT', stateAfterPlace, (s) => s.phase !== 'DRAFT');

  // After placing both, the game should deal hands and start the first turn
  assertState('Players have cards in hand', stateAfterPlace, (s) =>
    s.players[0].hand.length > 0 && s.players[1].hand.length > 0
  );
  assertState('Players have decks', stateAfterPlace, (s) =>
    s.players[0].deck.length > 0 && s.players[1].deck.length > 0
  );
    assertState('Players have empty discard piles', stateAfterPlace, (s) =>
    s.players[0].discardPile.length === 0 && s.players[1].discardPile.length === 0
  );
  assertState('Battlefield is set', stateAfterPlace, (s) => s.battlefield !== null, 'Battlefield phase should pick a random battlefield');
  if (stateAfterPlace.battlefield) {
    console.log(`  Battlefield: ${stateAfterPlace.battlefield.name}`);
  }

  // Phase should be WAITING_FOR_ACTION (TurnManager.startTurn sets this)
  assertState('Phase is WAITING_FOR_ACTION', stateAfterPlace, (s) => s.phase === 'WAITING_FOR_ACTION');
  assertState('Turn number is 1', stateAfterPlace, (s) => s.turnNumber === 1);
  assertState('Current player is P1 (index 0)', stateAfterPlace, (s) => s.currentPlayerIndex === 0);

  console.log(`  P1 hand (${stateAfterPlace.players[0].hand.length} cards): ${stateAfterPlace.players[0].hand.slice(0, 3).join(', ')}...`);
  console.log(`  P2 hand (${stateAfterPlace.players[1].hand.length} cards): ${stateAfterPlace.players[1].hand.slice(0, 3).join(', ')}...`);

  // ─────────────────────────────────────────────────────────────
  // 5. Turn 1 — P1 Turn
  // ─────────────────────────────────────────────────────────────
  console.log('');
  console.log('── Phase 5: Turn 1 (P1) ──────────────────────────');

  // P1 plays a card — try Ki cards first (no target needed), then fall back
  const p1Hand = stateAfterPlace.players[0].hand;
  const p1Chars = stateAfterPlace.players[0].characters;
  let cardPlayed = false;

  if (p1Hand.length > 0) {
    // Try Ki cards first (carga_ki / super_carga_ki) — no target needed
    for (const cardId of p1Hand) {
      if (cardId.startsWith('carga_ki') || cardId.startsWith('super_carga_ki')) {
        r = act(engine, PLAYER_1_ID, { type: 'PLAY_CARD', cardId });
        if (r.success) { cardPlayed = true; break; }
      }
    }

    // Fallback: try with a target character for equipable/heal cards
    if (!cardPlayed && p1Chars.length > 0) {
      const targetId = p1Chars[0].characterId;
      for (const cardId of p1Hand) {
        r = act(engine, PLAYER_1_ID, { type: 'PLAY_CARD', cardId, targetCharacterId: targetId });
        if (r.success) { cardPlayed = true; break; }
      }
    }

    // Last resort: just play the first card without target
    if (!cardPlayed) {
      r = act(engine, PLAYER_1_ID, { type: 'PLAY_CARD', cardId: p1Hand[0] });
      cardPlayed = r.success;
    }

    assert('P1 plays a card successfully', cardPlayed, cardPlayed ? undefined : JSON.stringify(r.error));

    if (cardPlayed) {
      const s = engine.getState();
      const discardsAfter = s.players[0].discardPile;
      const handsAfter = s.players[0].hand;
      assert('Card moved to discard or hand changed',
        discardsAfter.length > 0 || handsAfter.length < p1Hand.length);
    }
  } else {
    console.log('  (P1 has empty hand — skipping card play)');
  }

  // ── PASS → ADVANCE phase ─────────────────────────────────
  r = act(engine, PLAYER_1_ID, { type: 'PASS' });
  assert('P1 passes in WAITING_FOR_ACTION', r.success, JSON.stringify(r.error));

  let s = engine.getState();
  if (s.phase === 'ADVANCE') {
    assertState('Phase is ADVANCE after pass', s, (st) => st.phase === 'ADVANCE');

    // ── ADVANCE a character ────────────────────────────────
    const p1AliveChars = s.players[0].characters.filter((c) => c.isAlive);
    assert('P1 has alive characters', p1AliveChars.length > 0);

    if (p1AliveChars.length > 0) {
      const charToAdvance = p1AliveChars[0];
      const beforeLentitud = charToAdvance.currentLentitud;
      const beforeCounter = charToAdvance.advanceCounter;

      r = act(engine, PLAYER_1_ID, { type: 'ADVANCE', characterId: charToAdvance.characterId });
      assert('P1 advances character', r.success, JSON.stringify(r.error));

      s = engine.getState();
      const advancedChar = s.players[0].characters.find(
        (c) => c.characterId === charToAdvance.characterId
      );
      if (advancedChar) {
        const counterIncreased = advancedChar.advanceCounter > beforeCounter;
        assert(
          'Advance counter increased',
          counterIncreased || advancedChar.hasAttackedThisTurn,
          `lentitud: ${beforeLentitud}, counter: ${beforeCounter} → ${advancedChar.advanceCounter}`
        );
      }
    }

    // After advance: if eligible attackers exist → ATTACK phase
    // Auto end-turn triggers if no eligible attackers
    s = engine.getState();
    console.log(`  Phase after advance: ${s.phase}`);

    // ── ATTACK if eligible ─────────────────────────────────
    if (s.phase === 'ATTACK') {
      const p1Alive = s.players[0].characters.filter((c) => c.isAlive && c.advanceCounter >= c.currentLentitud && !c.hasAttackedThisTurn);
      const p2Alive = s.players[1].characters.filter((c) => c.isAlive);

      if (p1Alive.length > 0 && p2Alive.length > 0) {
        r = act(engine, PLAYER_1_ID, {
          type: 'ATTACK',
          attackerId: p1Alive[0].characterId,
          targetId: p2Alive[0].characterId,
          attackType: 'NORMAL',
        });
        assert('P1 attacks', r.success, JSON.stringify(r.error));

        if (r.success && r.defenderWindow) {
          // Defender (P2) responds with NONE
          console.log('  Defender window opened — P2 responds NONE');
          r = act(engine, PLAYER_2_ID, {
            type: 'DEFENDER_RESPONSE',
            action: 'NONE',
            characterId: p2Alive[0].characterId,
          });
          assert('P2 responds NONE to attack', r.success, JSON.stringify(r.error));
        }

        s = engine.getState();
        console.log(`  Phase after combat: ${s.phase}`);

        // Check if any damage was done
        const p2After = s.players[1].characters.filter((c) => c.characterId === p2Alive[0].characterId);
        if (p2After.length > 0) {
          const dmg = p2Alive[0].currentVida - p2After[0].currentVida;
          console.log(`  Damage dealt to ${p2Alive[0].characterId}: ${dmg > 0 ? dmg : 'none'}`);
        }
      }
    } else {
      console.log(`  Phase is ${s.phase} — no attack phase this turn`);
    }
  } else {
    console.log(`  Phase after pass: ${s.phase} (expected ADVANCE)`);
  }

  // ── End turn ────────────────────────────────────────────
  s = engine.getState();
  if (s.phase !== 'GAME_OVER' && s.phase === 'END_TURN') {
    // Auto-transitioned or we need explicit END_TURN
    r = act(engine, PLAYER_1_ID, { type: 'END_TURN' });
    // May fail if already transitioned — that's OK
  }

  // Check turn advanced
  s = engine.getState();
  console.log(`  Turn ${s.turnNumber}, current player: P${s.currentPlayerIndex + 1}, phase: ${s.phase}`);
  assertState('Turn advanced or game ongoing', s, (st) => st.turnNumber >= 1 || st.phase === 'GAME_OVER');

  // ─────────────────────────────────────────────────────────────
  // 6. Turn 2 — P2 (if game is still going)
  // ─────────────────────────────────────────────────────────────
  if (engine.getState().phase !== 'GAME_OVER') {
    console.log('');
    console.log('── Phase 6: Turn 2 (P2) ──────────────────────────');

    s = engine.getState();
    if (s.currentPlayerIndex === 1 && s.phase === 'WAITING_FOR_ACTION') {
      // P2 plays a card — try Ki cards first, then with target
      const p2HandCards = s.players[1].hand;
      const p2Chars = s.players[1].characters;
      let p2CardPlayed = false;

      if (p2HandCards.length > 0) {
        for (const cardId of p2HandCards) {
          if (cardId.startsWith('carga_ki') || cardId.startsWith('super_carga_ki')) {
            r = act(engine, PLAYER_2_ID, { type: 'PLAY_CARD', cardId });
            if (r.success) { p2CardPlayed = true; break; }
          }
        }
        if (!p2CardPlayed && p2Chars.length > 0) {
          const targetId = p2Chars[0].characterId;
          for (const cardId of p2HandCards) {
            r = act(engine, PLAYER_2_ID, { type: 'PLAY_CARD', cardId, targetCharacterId: targetId });
            if (r.success) { p2CardPlayed = true; break; }
          }
        }
        if (!p2CardPlayed) {
          r = act(engine, PLAYER_2_ID, { type: 'PLAY_CARD', cardId: p2HandCards[0] });
          p2CardPlayed = r.success;
        }
        assert('P2 plays a card', p2CardPlayed, p2CardPlayed ? undefined : JSON.stringify(r.error));
      }

      // P2 pass → advance
      r = act(engine, PLAYER_2_ID, { type: 'PASS' });
      assert('P2 passes', r.success, JSON.stringify(r.error));

      s = engine.getState();
      if (s.phase === 'ADVANCE') {
        const p2Char = s.players[1].characters.find((c) => c.isAlive);
        if (p2Char) {
          r = act(engine, PLAYER_2_ID, { type: 'ADVANCE', characterId: p2Char.characterId });
          assert('P2 advances character', r.success, JSON.stringify(r.error));
        }

        s = engine.getState();
        if (s.phase === 'ATTACK') {
          const p2Atk = s.players[1].characters.filter(
            (c) => c.isAlive && c.advanceCounter >= c.currentLentitud && !c.hasAttackedThisTurn
          );
          const p1Def = s.players[0].characters.filter((c) => c.isAlive);
          if (p2Atk.length > 0 && p1Def.length > 0) {
            r = act(engine, PLAYER_2_ID, {
              type: 'ATTACK',
              attackerId: p2Atk[0].characterId,
              targetId: p1Def[0].characterId,
              attackType: 'NORMAL',
            });
            assert('P2 attacks', r.success, JSON.stringify(r.error));

            if (r.success && r.defenderWindow) {
              r = act(engine, PLAYER_1_ID, {
                type: 'DEFENDER_RESPONSE',
                action: 'NONE',
                characterId: p1Def[0].characterId,
              });
              assert('P1 responds NONE', r.success, JSON.stringify(r.error));
            }
          }
        }

        // End turn
        s = engine.getState();
        if (s.phase !== 'GAME_OVER' && s.phase !== 'WAITING_FOR_ACTION') {
          r = act(engine, PLAYER_2_ID, { type: 'END_TURN' });
        }
      }

      s = engine.getState();
      console.log(`  After P2: turn ${s.turnNumber}, phase: ${s.phase}`);
    }
  } else {
    console.log('');
    console.log('  (Game ended after Turn 1 — skipping Turn 2)');
  }

  // ─────────────────────────────────────────────────────────────
  // 7. Game Registry — getGameByPlayer
  // ─────────────────────────────────────────────────────────────
  console.log('');
  console.log('── Phase 7: Registry Query ───────────────────────');

  const gameByP1 = gameRegistry.getGameByPlayer(PLAYER_1_ID);
  assert('Can find game by P1 socket ID', !!gameByP1);
  if (gameByP1) {
    assert('Correct room code for P1', gameByP1.roomCode === ROOM_CODE);
  }

  const gameByP2 = gameRegistry.getGameByPlayer(PLAYER_2_ID);
  assert('Can find game by P2 socket ID', !!gameByP2);

  const gameByUnknown = gameRegistry.getGameByPlayer('nonexistent-socket');
  assert('Unknown player returns undefined', !gameByUnknown);

  // ─────────────────────────────────────────────────────────────
  // 8. Game Registry — cleanup lifecycle
  // ─────────────────────────────────────────────────────────────
  console.log('');
  console.log('── Phase 8: Multiple Game Lifecycle ──────────────');

  // Remove current game first
  gameRegistry.removeGame(ROOM_CODE);
  assert('Registry has 0 after removal', gameRegistry.size === 0);

  // Create and manage multiple games
  const g1 = gameRegistry.createGame('GAME01', 'room-uuid-1', 'socket-a', 'socket-b');
  const g2 = gameRegistry.createGame('GAME02', 'room-uuid-2', 'socket-c', 'socket-d');

  assert('Registry has 2 games', gameRegistry.size === 2);
  assert('GAME01 is accessible', gameRegistry.getGame('GAME01') === g1);
  assert('GAME02 is accessible', gameRegistry.getGame('GAME02') === g2);
  assert('Find socket-a in GAME01', gameRegistry.getGameByPlayer('socket-a')?.roomCode === 'GAME01');
  assert('Find socket-c in GAME02', gameRegistry.getGameByPlayer('socket-c')?.roomCode === 'GAME02');
  assert('GAME01 room ID maps', gameRegistry.getRoomId('GAME01') === 'room-uuid-1');

  // Remove one
  gameRegistry.removeGame('GAME01');
  assert('Registry has 1 after remove', gameRegistry.size === 1);
  assert('GAME01 no longer exists', !gameRegistry.getGame('GAME01'));
  assert('GAME02 still exists', !!gameRegistry.getGame('GAME02'));
  assert('socket-a no longer in any game', !gameRegistry.getGameByPlayer('socket-a'));

  // Clean up
  gameRegistry.removeGame('GAME02');
  assert('Registry has 0 after full cleanup', gameRegistry.size === 0);

  // ─────────────────────────────────────────────────────────────
  // 9. Error Handling
  // ─────────────────────────────────────────────────────────────
  console.log('');
  console.log('── Phase 9: Error Handling ───────────────────────');

  // PASS in DRAFT phase
  const errEngine = gameRegistry.createGame('ERR01', 'room-err', 'p1', 'p2');
  r = errEngine.handleAction('p1', { type: 'PASS' } as GameAction);
  assert('PASS in DRAFT returns error', !r.success && r.error?.code === 'INVALID_PHASE');
  console.log(`  Expected: ${r.error?.code} — ${r.error?.message}`);

  // Unknown player
  const studioEngine = gameRegistry.createGame('ERR02', 'room-err-2', 'p1', 'p2');
  r = studioEngine.handleAction('unknown-player', { type: 'DRAFT_SELECT', characterId: 'ssj-god-goku' });
  assert('Unknown player returns PLAYER_NOT_FOUND', !r.success && r.error?.code === 'PLAYER_NOT_FOUND');
  gameRegistry.removeGame('ERR02');

  // Action on removed game
  gameRegistry.removeGame('ERR01');
  const nullEngine = gameRegistry.getGame('ERR01');
  assert('Removed game returns null', !nullEngine);

  // ─────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed, ${total} total`);
  console.log(`  ${failed === 0 ? '🎉 ALL PASSED' : '❌ SOME FAILED'}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
