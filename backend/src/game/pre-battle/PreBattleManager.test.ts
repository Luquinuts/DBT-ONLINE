import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { GameState } from '@dbt-online/shared';
import { PreBattleManager } from './PreBattleManager';
import { GameStateManager, createCharacterState } from '../state/GameState';

type TickCallback = (state: GameState) => void;
type CompleteCallback = () => void;

const ALL_CHARS = [
  'ssj-god-goku', 'ssj-blue-vegeta', 'golden-frieza', 'ssj-rose-black-goku',
  'ssj-broly', 'perfect-cell', 'kid-buu', 'beerus', 'hit', 'ssj2-gohan',
  'a17-a18', 'ssj3-gotenks', 'piccolo', 'jiren', 'ssj-future-trunks', 'ssj-goku',
];

describe('PreBattleManager', () => {
  let manager: PreBattleManager;
  let state: GameStateManager;
  let tickCallback: Mock<TickCallback>;
  let completeCallback: Mock<CompleteCallback>;

  beforeEach(() => {
    manager = new PreBattleManager();
    state = new GameStateManager('TEST', 'p1', 'p2', ALL_CHARS);
    state.getState().phase = 'PRE_BATTLE';
    tickCallback = vi.fn<TickCallback>();
    completeCallback = vi.fn<CompleteCallback>();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits initial reveal state on startCountdown', () => {
    manager.startCountdown(state, tickCallback, completeCallback);

    // Initial call: reveal with secondsRemaining = 5
    expect(tickCallback).toHaveBeenCalledTimes(1);
    const initial = tickCallback.mock.calls[0][0];
    expect(initial.secondsRemaining).toBe(5);
    expect(initial.preBattle?.stage).toBe('reveal');
    expect(initial.phase).toBe('PRE_BATTLE');
  });

  it('ticks 5→4→3→2→1→0 with correct values', () => {
    vi.useFakeTimers();
    manager.startCountdown(state, tickCallback, completeCallback);

    // Initial call: reveal with 5
    expect(tickCallback).toHaveBeenCalledTimes(1);
    expect(tickCallback.mock.calls[0][0].secondsRemaining).toBe(5);
    expect(tickCallback.mock.calls[0][0].preBattle?.stage).toBe('reveal');

    // Advance through intervals (5 x 1000ms)
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(1000);
    }

    // 5 ticks + 1 initial = 6 calls
    expect(tickCallback).toHaveBeenCalledTimes(6);

    // Tick values
    expect(tickCallback.mock.calls[1][0].secondsRemaining).toBe(4);
    expect(tickCallback.mock.calls[1][0].preBattle?.stage).toBe('countdown');
    expect(tickCallback.mock.calls[2][0].secondsRemaining).toBe(3);
    expect(tickCallback.mock.calls[2][0].preBattle?.stage).toBe('countdown');
    expect(tickCallback.mock.calls[3][0].secondsRemaining).toBe(2);
    expect(tickCallback.mock.calls[3][0].preBattle?.stage).toBe('countdown');
    expect(tickCallback.mock.calls[4][0].secondsRemaining).toBe(1);
    expect(tickCallback.mock.calls[4][0].preBattle?.stage).toBe('countdown');
    expect(tickCallback.mock.calls[5][0].secondsRemaining).toBe(0);
    expect(tickCallback.mock.calls[5][0].preBattle?.stage).toBe('fight');
  });

  it('calls onComplete after countdown reaches 0 + fight delay', () => {
    const quickManager = new PreBattleManager(0);
    vi.useFakeTimers();
    quickManager.startCountdown(state, tickCallback, completeCallback);

    // Advance through 5 countdown ticks (5000ms) + fight delay (0ms)
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(1000);
    }

    // At this point remaining=0 was emitted as FIGHT! and the fightDelay
    // timeout was set (0ms). Advance one microtask to trigger it.
    vi.advanceTimersByTime(1);

    expect(completeCallback).toHaveBeenCalledTimes(1);
  });

  it('stopCountdown + manual cleanup does not call onComplete', () => {
    const spyManager = new PreBattleManager(0);
    vi.useFakeTimers();
    spyManager.startCountdown(state, tickCallback, completeCallback);

    // Advance 2 ticks
    vi.advanceTimersByTime(2000);
    expect(tickCallback).toHaveBeenCalledTimes(3);

    // Stop — should prevent completion
    spyManager.stopCountdown();
    vi.advanceTimersByTime(10000);

    expect(completeCallback).not.toHaveBeenCalled();
  });

  it('reports correct secondsRemaining at each tick', () => {
    vi.useFakeTimers();
    manager.startCountdown(state, tickCallback, completeCallback);

    // Initial: 5
    expect(tickCallback.mock.calls[0][0].secondsRemaining).toBe(5);

    // After 1s: 4
    vi.advanceTimersByTime(1000);
    expect(tickCallback.mock.calls[1][0].secondsRemaining).toBe(4);

    // After 2s: 3
    vi.advanceTimersByTime(1000);
    expect(tickCallback.mock.calls[2][0].secondsRemaining).toBe(3);

    // After 3s: 2
    vi.advanceTimersByTime(1000);
    expect(tickCallback.mock.calls[3][0].secondsRemaining).toBe(2);

    // After 4s: 1
    vi.advanceTimersByTime(1000);
    expect(tickCallback.mock.calls[4][0].secondsRemaining).toBe(1);

    // After 5s: 0 (FIGHT!)
    vi.advanceTimersByTime(1000);
    expect(tickCallback.mock.calls[5][0].secondsRemaining).toBe(0);
    expect(tickCallback.mock.calls[5][0].preBattle?.stage).toBe('fight');
  });

  it('calls onTick immediately for each second', () => {
    vi.useFakeTimers();
    manager.startCountdown(state, tickCallback, completeCallback);

    // Advance 3 seconds
    vi.advanceTimersByTime(3000);

    // Initial + 3 ticks = 4 calls
    expect(tickCallback).toHaveBeenCalledTimes(4);
  });

  it('stopCountdown stops the timer before completion', () => {
    vi.useFakeTimers();
    manager.startCountdown(state, tickCallback, completeCallback);

    // Advance 2 seconds
    vi.advanceTimersByTime(2000);
    const callsBeforeStop = tickCallback.mock.calls.length;

    manager.stopCountdown();

    // Advance more — should NOT trigger more ticks
    vi.advanceTimersByTime(10000);

    expect(tickCallback).toHaveBeenCalledTimes(callsBeforeStop);
    expect(completeCallback).not.toHaveBeenCalled();
  });

  it('cleanup stops timers and nulls references', () => {
    vi.useFakeTimers();
    manager.startCountdown(state, tickCallback, completeCallback);

    manager.cleanup();

    // Advance — no more ticks
    vi.advanceTimersByTime(10000);

    expect(completeCallback).not.toHaveBeenCalled();
    // Only the initial tick + ticks before cleanup should have fired
    expect(tickCallback).toHaveBeenCalledTimes(1);
  });

  it('is safe to call stopCountdown when not started', () => {
    expect(() => manager.stopCountdown()).not.toThrow();
    expect(() => manager.cleanup()).not.toThrow();
  });

  it('is safe to call cleanup multiple times', () => {
    manager.startCountdown(state, tickCallback, completeCallback);
    manager.cleanup();
    expect(() => manager.cleanup()).not.toThrow();
  });

  // ── Ban stage (Kame House) tests ────────────────────────────────

  describe('ban stage', () => {
    let banManager: PreBattleManager;
    let banState: GameStateManager;
    let banTick: Mock<TickCallback>;
    let banComplete: Mock<CompleteCallback>;

    beforeEach(() => {
      banManager = new PreBattleManager(0);
      banState = new GameStateManager('TEST', 'p1', 'p2', ALL_CHARS);
      banState.getState().phase = 'PRE_BATTLE';
      banTick = vi.fn<TickCallback>();
      banComplete = vi.fn<CompleteCallback>();

      // Populate characters for both players (3 each)
      const defs0 = ['ssj-broly', 'ssj-blue-vegeta', 'ssj2-gohan'].map(
        id => banState.getCharacterDef(id)!,
      );
      banState.getState().players[0].characters = defs0.map(d => {
        const c = createCharacterState(d);
        c.isAlive = true;
        return c;
      });

      const defs1 = ['ssj3-gotenks', 'golden-frieza', 'perfect-cell'].map(
        id => banState.getCharacterDef(id)!,
      );
      banState.getState().players[1].characters = defs1.map(d => {
        const c = createCharacterState(d);
        c.isAlive = true;
        return c;
      });

      // Set battlefield to Kame House
      banState.getState().battlefield = {
        id: 'kamehouse',
        name: 'Kamehouse',
        effect: 'disable_character',
        description: '',
      };
    });

    it('enters ban stage when battlefield effect is disable_character', () => {
      banManager.startCountdown(banState, banTick, banComplete);

      // 2 calls: first reveal (5s), then ban stage
      expect(banTick).toHaveBeenCalledTimes(2);
      const banCall = banTick.mock.calls[1][0];
      expect(banCall.preBattle?.stage).toBe('ban');
      expect(banCall.secondsRemaining).toBeNull();
      expect(banCall.preBattle?.pendingBan).toEqual({ playerIndexes: [] });
      expect(banManager.isBanStageActive()).toBe(true);
    });

    it('enters normal countdown when battlefield does not have disable_character', () => {
      banState.getState().battlefield = null;
      banManager.startCountdown(banState, banTick, banComplete);

      expect(banTick).toHaveBeenCalledTimes(1);
      expect(banTick.mock.calls[0][0].preBattle?.stage).toBe('reveal');
      expect(banTick.mock.calls[0][0].secondsRemaining).toBe(5);
      expect(banManager.isBanStageActive()).toBe(false);
    });

    it('handleBanAction bans opponent character and marks player as submitted', () => {
      vi.useFakeTimers();
      banManager.startCountdown(banState, banTick, banComplete);

      // P0 bans one of the opponent's characters
      const result = banManager.handleBanAction('p1', 'ssj3-gotenks');
      expect(result).toEqual({ success: true });

      const state = banState.getState();
      // Opponent's character should be dead
      const gotenks = banState.getCharacter(1, 'ssj3-gotenks');
      expect(gotenks?.isAlive).toBe(false);

      // BannedCharacters should contain the ID
      expect(state.bannedCharacters).toContain('ssj3-gotenks');

      // pendingBan should include P0
      expect(state.preBattle?.pendingBan?.playerIndexes).toEqual([0]);
    });

    it('rejects ban if player already submitted', () => {
      vi.useFakeTimers();
      banManager.startCountdown(banState, banTick, banComplete);

      banManager.handleBanAction('p1', 'ssj3-gotenks');
      const result = banManager.handleBanAction('p1', 'golden-frieza');

      expect(result.success).toBe(false);
      expect(result.error).toBe('You have already submitted a ban.');
    });

    it('rejects ban for non-existent character', () => {
      vi.useFakeTimers();
      banManager.startCountdown(banState, banTick, banComplete);

      const result = banManager.handleBanAction('p1', 'beerus');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Character not found in opponent roster.');
    });

    it('rejects ban for an already dead character', () => {
      vi.useFakeTimers();
      banManager.startCountdown(banState, banTick, banComplete);

      // Kill the opponent's character first
      const char = banState.getCharacter(1, 'ssj3-gotenks')!;
      char.isAlive = false;

      const result = banManager.handleBanAction('p1', 'ssj3-gotenks');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Character is already dead or banned.');
    });

    it('rejects banning the last alive opponent character', () => {
      vi.useFakeTimers();
      banManager.startCountdown(banState, banTick, banComplete);

      // Kill 2 of P1's characters so only 1 remains alive
      banState.getCharacter(1, 'ssj3-gotenks')!.isAlive = false;
      banState.getCharacter(1, 'golden-frieza')!.isAlive = false;

      const result = banManager.handleBanAction('p1', 'perfect-cell');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot ban the last alive character.');
    });

    it('rejects ban when ban stage is not active', () => {
      vi.useFakeTimers();
      // Set a non-ban battlefield so startCountdown skips ban stage
      banState.getState().battlefield = null;
      banManager.startCountdown(banState, banTick, banComplete);

      const result = banManager.handleBanAction('p1', 'ssj-broly');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Ban stage is not active.');
    });

    it('transitions to countdown when both players have banned', () => {
      vi.useFakeTimers();
      banManager.startCountdown(banState, banTick, banComplete);
      banTick.mockClear(); // Clear initial ban tick

      // P0 bans P1's character
      banManager.handleBanAction('p1', 'ssj3-gotenks');
      expect(banTick).toHaveBeenCalledTimes(1);
      const afterP0 = banTick.mock.calls[0][0];
      expect(afterP0.bannedCharacters).toContain('ssj3-gotenks');
      expect(afterP0.preBattle?.pendingBan?.playerIndexes).toEqual([0]);

      banTick.mockClear();

      // P1 bans P0's character
      banManager.handleBanAction('p2', 'ssj-broly');

      // After both bans: handleBanAction emits:
      //  (1) after P1's ban is applied (stage=ban, pendingBan=[0,1])
      //  (2) reveal state when both submitted (stage=reveal, secondsRemaining=5)
      expect(banTick).toHaveBeenCalledTimes(2);

      // The reveal call should have stage = 'reveal' and secondsRemaining = 5
      const afterBoth = banTick.mock.calls[1][0];
      expect(afterBoth.preBattle?.stage).toBe('reveal');
      expect(afterBoth.secondsRemaining).toBe(5);

      // pendingBan should be cleared
      expect(afterBoth.preBattle?.pendingBan).toBeNull();

      // banActive should be false
      expect(banManager.isBanStageActive()).toBe(false);
    });
  });
});
