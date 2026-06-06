# Tasks: Namek Revive Mechanic

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 200–280 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Foundation — Types & State

- [x] 1.1 Add `namekReviveUsed: boolean` and `namekRevivePending: number | null` to `GameState` interface in `shared/types/game.ts`
- [x] 1.2 Initialize `namekReviveUsed: false, namekRevivePending: null` in `GameStateManager` constructor in `backend/src/game/state/GameState.ts`
- [x] 1.3 Add `isNamekRevivePending(playerIndex): boolean` and `setNamekRevivePending(index | null): void` helpers to `GameStateManager`

## Phase 2: Backend — Detection & Validation

- [x] 2.1 Add `checkReviveTrigger()` to `GameEngine` — check `revive_on_last` effect, Kid Buu absence, `namekReviveUsed`, 1-alive + ≥1-dead per player; set `namekRevivePending` on match
- [x] 2.2 Call `checkReviveTrigger()` in `handleAction()` after success branch, before win condition check
- [x] 2.3 Modify `validateDragonRevive()` in `ActionValidator` — accept without card when `namekRevivePending === playerIndex`; add target-ownership validation (reject revive of opponent's dead char)
- [x] 2.4 Modify `handleDragonRevive()` in `GameEngine` — when pending, call `EsferaDragonEffect` directly via `cards.resolve()`, then set `namekReviveUsed=true` and clear `namekRevivePending` (skip card search)

## Phase 3: Backend — Win Condition Guard

- [x] 3.1 Guard `WinConditionChecker.check()` — if player has 0 alive AND `namekRevivePending === playerIndex`, return `gameOver: false`
- [x] 3.2 Guard `WinConditionChecker.checkAfterDeath()` — same logic for event-hook path

## Phase 4: Frontend — Revive Prompt

- [x] 4.1 Derive `namekRevivePending` from server state in `gameReducer` `SET_GAME_STATE` (already in `gameState` payload, exposed via `state.gameState.namekRevivePending`)
- [x] 4.2 Add revive prompt overlay in `GameBoard.tsx` — when `state.gameState?.namekRevivePending === playerIndex`, render dead-character picker with confirm button that calls `actions.dragonRevive(targetCharacterId)`

## Phase 5: Testing

- [x] 5.1 Unit: `ActionValidator.validateDragonRevive` — pending player can revive without card; non-pending player rejected; wrong-owner target rejected
- [x] 5.2 Unit: `WinConditionChecker` — 0 alive + pending → not game over; no pending → game over
- [x] 5.3 Unit: `GameEngine.checkReviveTrigger()` — conditions: correct effect, Kid Buu blocks, used flag blocks, happy path
- [x] 5.4 Integration: full revive flow via `GameEngine.handleAction` — kill a character → assert pending set → revive → assert used + cleared
