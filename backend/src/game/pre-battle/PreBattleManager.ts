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
  private onTick: ((state: GameState) => void) | null = null;
  private onComplete: (() => void) | null = null;
  private completeTimeout: NodeJS.Timeout | null = null;

  /**
   * Start the 5-second pre-battle countdown.
   *
   * @param gameState - The GameStateManager for this game
   * @param onTick    - Called on every tick (including initial reveal) with the full GameState
   * @param onComplete - Called after FIGHT! state is emitted and the delay elapses
   */
  startCountdown(
    gameState: GameStateManager,
    onTick: (state: GameState) => void,
    onComplete: () => void,
  ): void {
    this.stateManager = gameState;
    this.onTick = onTick;
    this.onComplete = onComplete;

    // ── Initial state: reveal with 5 seconds ────────────────
    gameState.setSecondsRemaining(5);
    gameState.setPreBattle({ stage: 'reveal' });
    onTick(gameState.toJSON());

    // ── Give the reveal a moment, then start the countdown ──
    // Use a brief delay so the reveal stage is visible before numbers start
    this.timer = setInterval(() => {
      const gs = gameState.getState();
      if (gs.secondsRemaining === null) return;

      const remaining = gs.secondsRemaining - 1;
      gameState.setSecondsRemaining(remaining);

      if (remaining <= 0) {
        // ── Countdown done: FIGHT! ──────────────────────────
        this.stopCountdown();
        gameState.setPreBattle({ stage: 'fight' });
        gameState.setSecondsRemaining(0);
        onTick(gameState.toJSON());

        // ── Brief pause so the client can show FIGHT! ───────
        this.completeTimeout = setTimeout(() => {
          this.cleanup();
          if (this.onComplete) {
            this.onComplete();
          }
        }, 600);
        return;
      }

      // ── Normal tick ──────────────────────────────────────
      gameState.setPreBattle({ stage: 'countdown' });
      onTick(gameState.toJSON());
    }, 1000);
  }

  /**
   * Immediately stop the countdown timer.
   * Safe to call even if not started.
   */
  stopCountdown(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.completeTimeout) {
      clearTimeout(this.completeTimeout);
      this.completeTimeout = null;
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
  }
}
