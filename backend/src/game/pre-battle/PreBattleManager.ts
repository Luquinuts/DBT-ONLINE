import type { GameState } from '@dbt-online/shared';
import type { GameStateManager } from '../state/GameState';

/**
 * Manages the pre-battle countdown lifecycle.
 *
 * Flow:
 *  1. startCountdown() is called after both players place characters
 *  2. Initial state: secondsRemaining = 5, stage = 'reveal'
 *  3. Each second: decrement secondsRemaining, emit tick via onTick callback
 *  4. At 0: set stage to 'fight', emit final update, then call onComplete
 *     after a short delay so clients can display the FIGHT! marker
 *
 * Cleanup:
 *  - stopCountdown() clears the interval timer
 *  - cleanup() does the same and nulls callbacks
 */
export class PreBattleManager {
  private timer: NodeJS.Timeout | null = null;
  private stateManager: GameStateManager | null = null;
  // Accept a callable with any signature so test mocks (vi.fn) are assignable
  private onTick: ((...args: any[]) => any) | null = null;
  private onComplete: ((...args: any[]) => any) | null = null;
  private fightDelayMs: number;
  private tickIntervalMs: number;
  private banActive: boolean = false;

  constructor(fightDelayMs: number = 600, tickIntervalMs: number = 1000) {
    this.fightDelayMs = fightDelayMs;
    this.tickIntervalMs = tickIntervalMs;
  }

  /**
   * Whether the ban stage is currently active.
   */
  isBanStageActive(): boolean {
    return this.banActive;
  }

  /**
   * Start the 5-second pre-battle countdown.
   *
   * @param gameState - The GameStateManager for this game
   * @param onTick    - Called on every tick (including initial reveal) with the full GameState
   * @param onComplete - Called after FIGHT! state is emitted and the delay elapses
   */
  startCountdown(
    gameState: GameStateManager,
    onTick: (...args: any[]) => any,
    onComplete: (...args: any[]) => any,
  ): void {
    this.stateManager = gameState;
    this.onTick = onTick;
    this.onComplete = onComplete;

    // ── Initial state: reveal with 5 seconds ────────────────
    gameState.setSecondsRemaining(5);
    gameState.setPreBattle({ stage: 'reveal', pendingBan: null });
    onTick(gameState.toJSON());

    // ── Check if ban stage is needed (Kame House) ──────────
    const bfBase = gameState.getState().battlefield?.effect?.split(':')[0];
    if (bfBase === 'disable_character') {
      this.startBanStage(gameState, onTick);
      return;
    }

    // ── Start the countdown chain using recursive setTimeout ──
    this.scheduleNextTick(gameState, onTick, onComplete);
  }

  /**
   * Enter the ban stage (Kame House mechanic).
   * Sets stage to 'ban', initializes pendingBan tracker, and broadcasts.
   * The countdown is NOT started — it waits for both players to submit.
   */
  private startBanStage(
    gameState: GameStateManager,
    onTick: (...args: any[]) => any,
  ): void {
    this.banActive = true;
    gameState.setPreBattle({
      stage: 'ban',
      pendingBan: { playerIndexes: [] },
    });
    gameState.setSecondsRemaining(null);
    onTick(gameState.toJSON());
  }

  /**
   * Handle a player's ban action during the ban stage.
   *
   * Flow:
   *  1. Validate the action (stage, submission status, character ownership, last-alive guard)
   *  2. Apply the ban: set isAlive = false, add to bannedCharacters
   *  3. Mark player as submitted
   *  4. Broadcast updated state
   *  5. If both players have submitted → clear ban state, start countdown
   */
  handleBanAction(playerId: string, characterId: string): { success: boolean; error?: string } {
    if (!this.stateManager || !this.onTick || !this.banActive) {
      return { success: false, error: 'Ban stage is not active.' };
    }

    const gs = this.stateManager.getState();

    // Must be in ban stage
    if (!gs.preBattle || gs.preBattle.stage !== 'ban') {
      return { success: false, error: 'Ban stage is not active.' };
    }

    // Find player index
    const playerIndex = gs.players.findIndex((p) => p.playerId === playerId);
    if (playerIndex === -1) {
      return { success: false, error: 'Player not found.' };
    }

    // Check hasn't already submitted
    if (gs.preBattle.pendingBan?.playerIndexes.includes(playerIndex)) {
      return { success: false, error: 'You have already submitted a ban.' };
    }

    // Validate character belongs to this player and is alive
    const character = this.stateManager.getCharacter(playerIndex, characterId);
    if (!character) {
      return { success: false, error: 'Character not found in your roster.' };
    }
    if (!character.isAlive) {
      return { success: false, error: 'Character is already dead or banned.' };
    }

    // Validate it's not the last alive character for that player
    const aliveCount = this.stateManager.getAliveCharacters(playerIndex).length;
    if (aliveCount <= 1) {
      return { success: false, error: 'Cannot ban the last alive character.' };
    }

    // ── Apply the ban ──────────────────────────────────────────
    character.isAlive = false;
    gs.bannedCharacters.push(characterId);

    // Track submission
    if (gs.preBattle.pendingBan) {
      gs.preBattle.pendingBan.playerIndexes.push(playerIndex);
    }

    // Broadcast updated state
    this.onTick(this.stateManager.toJSON());

    // ── Check if both players have submitted ─────────────────
    if (gs.preBattle?.pendingBan?.playerIndexes.length === 2) {
      // Clear ban stage state (keep bannedCharacters), start countdown
      gs.preBattle.pendingBan = null;
      gs.preBattle.stage = 'reveal';
      this.stateManager.setSecondsRemaining(5);

      // Broadcast the reveal state
      this.onTick(this.stateManager.toJSON());

      // Start the countdown chain
      this.banActive = false;
      this.scheduleNextTick(this.stateManager, this.onTick, this.onComplete!);
    }

    return { success: true };
  }

  private scheduleNextTick(
    gameState: GameStateManager,
    onTick: (...args: any[]) => any,
    onComplete: (...args: any[]) => any,
  ): void {
    if (this.timer !== null) return; // Already stopped

    this.timer = setTimeout(() => {
      this.timer = null;
      const gs = gameState.getState();
      if (gs.secondsRemaining === null) return;

      const remaining = gs.secondsRemaining - 1;
      gameState.setSecondsRemaining(remaining);

      if (remaining <= 0) {
        // ── Countdown done: FIGHT! ──────────────────────────
        gameState.setPreBattle({ stage: 'fight', pendingBan: null });
        gameState.setSecondsRemaining(0);
        onTick(gameState.toJSON());

        // ── Brief pause so the client can show FIGHT! ───────
        this.timer = setTimeout(() => {
          this.timer = null;
          const onComplete = this.onComplete;
          this.cleanup();
          if (onComplete) {
            onComplete();
          }
        }, this.fightDelayMs);
        return;
      }

      // ── Normal tick ──────────────────────────────────────
      gameState.setPreBattle({ stage: 'countdown', pendingBan: null });
      onTick(gameState.toJSON());
      this.scheduleNextTick(gameState, onTick, onComplete);
    }, this.tickIntervalMs);
  }

  /**
   * Immediately stop the countdown timer.
   * Safe to call even if not started.
   */
  stopCountdown(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Full cleanup: stop timer, null references.
   * Called automatically when countdown completes.
   */
  cleanup(): void {
    this.stopCountdown();
    this.stateManager = null;
    this.onTick = null;
    this.onComplete = null;
    this.banActive = false;
  }
}
