# Proposal: Namek Revive Mechanic

## Intent

First player left with 1 alive on Namek can revive one dead character, once per game.

## Scope

### In Scope
- GameState fields for revive tracking (`namekReviveUsed`, `namekRevivePending`)
- Detection hook after combat resolves
- DRAGON_REVIVE without card when pending
- Win condition guard so game doesn't end prematurely
- Frontend revive prompt overlay
- Kid Buu nullification check (revive blocked if Kid Buu alive)

### Out of Scope
- New game phases (flag-based, no phase added)
- Auto-revive (player always chooses the target)
- Changes to Esfera del Dragón card behavior for non-Namek contexts
- Other battlefields or revive mechanics

## Capabilities

### New Capabilities
- `namek-revive`: Namek battlefield revive — triggers on 2→1 alive, one free revive per game without Esfera del Dragón card

### Modified Capabilities
- `game-types`: Add `namekReviveUsed: boolean` and `namekRevivePending: number | null` to GameState
- `game-engine`: Detection hook after combat, bypass card check when pending, guard win condition

## Approach

Flag-based, no new phase. After combat, detect 2→1 alive on `revive_on_last` battlefield (Kid Buu blocks). Set `namekRevivePending`. `validateDragonRevive` allows without card when pending. `handleDragonRevive` calls `EsferaDragonEffect` directly. On success: clear pending, run win check. Frontend shows prompt when `namekRevivePending`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `shared/types/game.ts` | Modified | Add namekReviveUsed, namekRevivePending to GameState |
| `backend/src/game/engine/GameEngine.ts` | Modified | Detection hook + handleDragonRevive changes |
| `backend/src/game/validation/ActionValidator.ts` | Modified | Bypass card check when namekRevivePending |
| `backend/src/game/conditions/WinConditionChecker.ts` | Modified | Guard against GAME_OVER when revive pending |
| `backend/src/game/state/GameState.ts` | Modified | Initialize new fields |
| `frontend/src/components/game/GameBoard.tsx` | Modified | Revive prompt overlay when namekRevivePending |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Revive with Kid Buu on field | Low | Explicit Kid Buu check in hook |
| Both players eligible at once | Low | Only triggers for 1-alive player; one action per tick |
| Counter-damage kills last char | Low | Detection after all combat, not per-attack |

## Rollback Plan

Revert GameState fields, detection hook, ActionValidator/WinConditionChecker changes. Remove frontend prompt.

## Dependencies

- `DRAGON_REVIVE` action type, `EsferaDragonEffect`, `revive_on_last` flag (all exist)

## Success Criteria

- [ ] Player with 1 alive on Namek gets revive prompt
- [ ] Revive succeeds without Esfera del Dragón in hand
- [ ] Revive works once per game, then never again
- [ ] Kid Buu on field blocks revive trigger
- [ ] Game does NOT end while revive is pending
- [ ] Revive clears state and runs win check after success
