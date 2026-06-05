# Tasks: Pre-Battle Reveal + Countdown

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350-450 (Phase 1) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (basic reveal+countdown) → PR 2 (Kame House ban) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Basic reveal + countdown (Phase 1 only) | PR 1 | base=main; 10 files modified, 2 created |
| 2 | Kame House ban stage (Phase 2) | PR 2 | base=main; extends PreBattleManager, ActionValidator, UI |

## Phase 1: Shared Types & Backend State

- [x] 1.1 `shared/types/game.ts` — Add `PRE_BATTLE` to `GamePhase`, add `PreBattleState` interface, add `secondsRemaining` to `GameState`
- [x] 1.2 `shared/types/game-helpers.ts` — Add `PRE_BATTLE` to `validPhasesForAction` (no actions allowed — per spec, PRE_BATTLE is reveal-only for Phase 1)
- [x] 1.3 `backend/src/game/state/GameState.ts` — Add `preBattle` property + getter/setter, `secondsRemaining` in initial state
- [ ] 1.4 `backend/src/game/GameRegistry.ts` — Add `activeTimers: Map<string, NodeJS.Timeout>` and `cleanupTimers(roomCode)` method
  *(Deviated: cleanup via `engine.destroy()` → `PreBattleManager.cleanup()` instead. Cleaner separation — registry shouldn't know timer internals.)*

## Phase 2: PreBattleManager & Engine Wiring

- [x] 2.1 `backend/src/game/pre-battle/PreBattleManager.ts` — NEW: class with `startCountdown()` (setInterval 5→0, emit callback each tick, call `onComplete` at 0), `stopCountdown()`/`cleanup()` (clearInterval)
- [x] 2.2 `backend/src/game/draft/DraftManager.ts` — Change `state.transitionTo('BATTLEFIELD')` → `state.transitionTo('PRE_BATTLE')`
- [x] 2.3 `backend/src/game/engine/GameEngine.ts` — Intercept `readyToStart`: pick battlefield, apply effects, deal decks, init `PreBattleManager`, start countdown with `broadcastFn`
- [x] 2.4 `backend/src/game/gameSocketHandlers.ts` — Wire `setBroadcastCallback` for countdown ticks; `engine.destroy()` on disconnect/game-over

## Phase 3: Frontend UI

- [x] 3.1 `frontend/src/components/game/PreBattleReveal.tsx` — NEW: full-screen overlay with battlefield card (HoloCard, centered), J1/J2 character portraits with icons, countdown number (5→1 → "FIGHT!"), CSS animations
- [x] 3.2 `frontend/src/lib/gameReducer.ts` — Add `secondsRemaining` + `preBattle` to `GameUIState`; read from `gameState` in `SET_GAME_STATE`
- [x] 3.3 `frontend/src/app/game/GamePage.tsx` — Route `state.phase === 'PRE_BATTLE'` to `<PreBattleReveal />`; exclude `PRE_BATTLE` from `isPlayingPhase`
- [ ] 3.4 `frontend/src/lib/assets.ts` — Verify `getBattlefieldImageSrc` renders all battlefield IDs; add any missing mappings
  *(Not needed — `getBattlefieldImageSrc` is already generic; IDs come from `battlefields.ts` data)*

## Phase 4: Tests

- [ ] 4.1 `backend/src/game/__tests__/PreBattleManager.test.ts` — *Skipped (no test runner configured)*
- [ ] 4.2 `backend/src/game/engine/GameEngine.test.ts` — *Skipped (no test runner configured)*
- [ ] 4.3 `shared/types/__tests__/game-helpers.test.ts` — *Skipped (no test runner configured)*
- [ ] 4.4 Frontend tests — *Skipped (no test runner configured)*
