# Tasks: Pre-Battle Reveal — Phase 2 (Kame House Ban)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 200–300 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR (stacked-to-main PR #2) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

## Phase 1: Foundation — Types & Data Model

- [ ] 1.1 Add `'ban'` to `PreBattleState.stage` union and `bans: [string \| null, string \| null]` in `shared/types/game.ts`
- [ ] 1.2 Add `BAN_CHARACTER` action (`{ type: 'BAN_CHARACTER'; characterId: string }`) to `GameAction` union in `shared/types/game.ts`
- [ ] 1.3 Add `bannedCharacters: string[]` field to `GameState` in `shared/types/game.ts`
- [ ] 1.4 Map `BAN_CHARACTER` → `PRE_BATTLE` phase in `validPhasesForAction()` in `shared/types/game-helpers.ts`

## Phase 2: Backend — State & Validation

- [ ] 2.1 Add `setBannedCharacters()` mutator to `GameStateManager` in `backend/src/game/state/GameState.ts`
- [ ] 2.2 Add `validateBanCharacter()` to `ActionValidator` — check phase=PRE_BATTLE, stage=ban, owns character, character alive, >1 alive, not already submitted
- [ ] 2.3 Verify Kame House entry has `disable_character` effect in `backend/src/data/battlefields.ts`

## Phase 3: Backend — Ban Stage Logic

- [ ] 3.1 Add `startBanStage()` to `PreBattleManager` — detect `disable_character` effect, set stage=ban, emit state
- [ ] 3.2 Add `handleBanAction()` to `PreBattleManager` — store ban in `bans[pendingIndex]`, check both submitted, apply via FieldEffectEngine, then call `startCountdown()`
- [ ] 3.3 Route `BAN_CHARACTER` action to `PreBattleManager.handleBanAction()` in `GameEngine.handleAction()`

## Phase 4: Frontend — Ban UI

- [ ] 4.1 Pass `preBattle.bans` and `bannedCharacters` through `gameReducer` state
- [ ] 4.2 Add `banCharacter(characterId)` action helper to `useGame` hook
- [ ] 4.3 Build `BanStage` sub-component in `PreBattleReveal.tsx` — selectable character cards, confirm button, waiting state, opponent ban reveal
- [ ] 4.4 Wire ban handler through `GamePage.tsx` to `PreBattleReveal`

## Phase 5: Verification

- [ ] 5.1 Manual: Play Kame House — both ban, verify countdown starts after both bans, banned char not usable
- [ ] 5.2 Manual: Verify non-Kame-House battlefields skip ban stage and go straight to countdown
- [ ] 5.3 Manual: Verify ban on last alive returns error, state unchanged
