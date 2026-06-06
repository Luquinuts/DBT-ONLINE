## Verification Report

**Change**: namek-revive
**Version**: N/A
**Mode**: Standard

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 16 |
| Tasks complete | 16 |
| Tasks incomplete | 0 |

### Build & Tests Execution

**Backend Tests**: ✅ 150 passed / ❌ 0 failed / ⚠️ 0 skipped
```text
> vitest run

 Test Files  8 passed (8)
      Tests  150 passed (150)
   Duration  1.70s
```

All 8 test files pass, covering GameEngine, ActionValidator, WinConditionChecker, CombatResolver, CardEffectEngine, DraftManager, PreBattleManager, and EventBus.

**Frontend TypeScript Check**: ✅ Passed (after building `shared/dist/`)
```text
> npx tsc --noEmit --project frontend/tsconfig.json
(no output — clean compilation)
```

Note: The shared package (`@dbt-online/shared`) must be built before running the frontend tsc check, because the shared `package.json` points `"types": "dist/index.d.ts"`. The backend tests work without this because `tsx` transpiles on the fly.

### Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| GT-12 — `namekReviveUsed: boolean` | Revive used flag persists after success | `GameEngine.test.ts > "DRAGON_REVIVE succeeds without card"` (line 717) | ✅ COMPLIANT |
| GT-13 — `namekRevivePending: number \| null` | Pending set to triggering player | `GameEngine.test.ts > "triggers namekRevivePending"` (line 626) | ✅ COMPLIANT |
| GT-13 — Pending cleared after revive | Pending reset to null on success | `GameEngine.test.ts > "DRAGON_REVIVE succeeds without card"` (line 718) | ✅ COMPLIANT |
| GT-13 — No pending in non-Namek | Non-revive battlefield, no pending | `GameEngine.test.ts > "does NOT trigger on non-revive battlefields"` (line 688) | ✅ COMPLIANT |
| GE-12 — Detection hook | Happy path detection | `GameEngine.test.ts > "triggers namekRevivePending"` (lines 608-628) | ✅ COMPLIANT |
| GE-12 — Kid Buu blocks | Kid Buu alive blocks detection | `GameEngine.test.ts > "does NOT trigger when Kid Buu is alive"` (lines 630-651) | ✅ COMPLIANT |
| GE-12 — Only triggers once | `namekReviveUsed` blocks re-trigger | `GameEngine.test.ts > "does NOT trigger when namekReviveUsed is true"` (lines 653-668) | ✅ COMPLIANT |
| GE-13 — Cardless DRAGON_REVIVE | Accepted when pending | `ActionValidator.test.ts > "accepts DRAGON_REVIVE when pending"` (line 536) | ✅ COMPLIANT |
| GE-13 — DRAGON_REVIVE rejected | Rejected when not pending (no card) | `GameEngine.test.ts > "rejects DRAGON_REVIVE without card when not pending"` (line 722) | ✅ COMPLIANT |
| GE-14 — Revive execution | `EsferaDragonEffect` called directly | `GameEngine.test.ts > "DRAGON_REVIVE succeeds without card"` (lines 691-720) | ✅ COMPLIANT |
| GE-15 — Post-revive state | used=true, pending=null, win check | `GameEngine.test.ts > "DRAGON_REVIVE succeeds without card"` (lines 716-719) | ✅ COMPLIANT |
| GE-7 — Win condition (modified) | Revive pending prevents game over | `WinConditionChecker.test.ts > "check() does NOT end game when pending"` (line 119) | ✅ COMPLIANT |
| GE-7 — Win condition (modified) | checkAfterDeath pending guard | `WinConditionChecker.test.ts > "checkAfterDeath() does NOT end game"` (line 135) | ✅ COMPLIANT |
| NR-1 — Happy path trigger | Battlefield + Kid Buu absence + 1 alive | `GameEngine.test.ts > "triggers namekRevivePending"` (lines 608-628) | ✅ COMPLIANT |
| NR-2 — No premature game over | Game stays in WAITING_FOR_ACTION | `GameEngine.test.ts > "win condition does NOT trigger when pending"` (lines 749-763) | ✅ COMPLIANT |
| NR-3 — Cardless revive | No esfera_dragon required | `GameEngine.test.ts > "DRAGON_REVIVE succeeds without card"` (lines 691-720) | ✅ COMPLIANT |
| NR-4 — Own character only | Opponent dead char rejected | `ActionValidator.test.ts > "rejects when pending player targets opponent dead"` (line 548) | ✅ COMPLIANT |
| NR-5 — Post-revive cleanup | used=true, pending=null, win check | `GameEngine.test.ts > "DRAGON_REVIVE succeeds without card"` (lines 716-719) | ✅ COMPLIANT |
| NR-6 — Once per game | namekReviveUsed blocks re-trigger | `GameEngine.test.ts > "does NOT trigger when namekReviveUsed is true"` (lines 653-668) | ✅ COMPLIANT |
| NR-7 — Kid Buu blocks | Kid Buu on field blocks trigger | `GameEngine.test.ts > "does NOT trigger when Kid Buu is alive"` (lines 630-651) | ✅ COMPLIANT |

**Compliance summary**: 20/20 scenarios compliant

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| GameState `namekReviveUsed: boolean` | ✅ Implemented | `shared/types/game.ts:155`, initialized `false` in `GameState.ts:85` |
| GameState `namekRevivePending: number \| null` | ✅ Implemented | `shared/types/game.ts:156`, initialized `null` in `GameState.ts:86` |
| `isNamekRevivePending()` / `setNamekRevivePending()` helpers | ✅ Implemented | `GameState.ts:200-210` |
| `checkReviveTrigger()` detection | ✅ Implemented | `GameEngine.ts:839-868` — checks battlefield effect, Kid Buu, used flag, alive+dead count |
| Detection hook placement | ✅ Implemented | Called in `handleAction()` lines 180-187, before win check, after all action types |
| `handleDragonRevive()` bypass card search when pending | ✅ Implemented | `GameEngine.ts:684` — `isNamekRevivePending(playerIndex)` → direct `cards.resolve()` |
| `validateDragonRevive()` ownership check | ✅ Implemented | `ActionValidator.ts:696-705` — rejects opponent target when pending |
| WinConditionChecker.check() pending guard | ✅ Implemented | `WinConditionChecker.ts:32-36` — guards P0/P1 with 0 alive + pending |
| WinConditionChecker.checkAfterDeath() pending guard | ✅ Implemented | `WinConditionChecker.ts:81-83` |
| Frontend revive prompt overlay | ✅ Implemented | `GameBoard.tsx:548-581` — renders dead-character picker when `namekRevivePending === playerIndex` |
| `dragonRevive()` emits DRAGON_REVIVE action | ✅ Implemented | `useGame.ts:255-263` |
| `DRAGON_REVIVE` valid in `WAITING_FOR_ACTION` | ✅ Implemented | `game-helpers.ts:70-71` — phase validation accepts it |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Detection placement: before every win check in `handleAction()` | ✅ Yes | `checkReviveTrigger()` at line 180-187 before win check at 198-206 |
| Revive execution: reuse `EsferaDragonEffect` via registry | ✅ Yes | `this.cards.resolve(state, playerIndex, 'revive:full', targetId)` at line 685-690 |
| Validation: validator adds pending check + ownership guard | ✅ Yes | `validateDragonRevive()` at lines 663-705 — checks pending status and target ownership |
| Validation: handler skips card search when pending | ✅ Yes | `handleDragonRevive()` at line 684 — direct branch for pending path, card search only in standard path |
| Win condition guard: both `check()` and `checkAfterDeath()` | ✅ Yes | Both methods guard against pending at lines 32-36 and 81-83 |
| Flag-based, no new phase | ✅ Yes | No new phases added; `namekRevivePending` flag drives behavior |
| Frontend reads `namekRevivePending` from game state | ✅ Yes | `state.gameState?.namekRevivePending` at line 548 |
| `DRAGON_REVIVE` already valid in `WAITING_FOR_ACTION` | ✅ Yes | `game-helpers.ts:70-71` — unchanged, already present |

### Edge Cases Coverage

| Edge Case | Status | Details |
|-----------|--------|---------|
| Kid Buu nullification | ✅ Covered | `isKidBuuAlive()` checks both players' fields (line 818-825) |
| Once-per-game enforcement | ✅ Covered | `namekReviveUsed` flag checked at line 850 |
| Simultaneous eligibility (both players at 1 alive) | ⚠️ Design choice | `checkReviveTrigger()` prioritizes player index 0 (loop order), returns after first match. Per design's open question, this is acceptable — one action per tick means simultaneous is extremely rare |
| Counter-damage kills last char | ✅ Covered | Detection hook runs AFTER all combat resolves, not per-attack. Mitigation per design risk table |
| Revive with no dead characters | ⚠️ Partial | Validator rejects with CHARATER_ALIVE for alive targets; GameBoard overlay shows "No dead characters available" if none dead |
| Own-character-only enforcement | ✅ Covered | `validateDragonRevive()` lines 696-705 — ownership check with `INVALID_TARGET` error |

### Issues Found

**CRITICAL**: None

**WARNING**: None

**SUGGESTION**:
1. **Shared package build ordering**: The frontend `tsc --noEmit` check requires `shared/dist/` to exist (since `shared/package.json` points `"types": "dist/index.d.ts"`). Add a CI step to build shared first, or change the type resolution path for the frontend. Currently the build pipeline (`npm run build`) handles this via the workspace build order.

2. **Simultaneous eligibility edge case**: If both players simultaneously hit 1 alive character (e.g., via counter-damage + area-effect card), `checkReviveTrigger()` prioritizes player index 0. The design's open question about queuing vs. priority is unresolved. Current behavior is acceptable per design but should be documented or resolved.

### Verdict

**PASS**

All 16 tasks are complete. All 20 spec scenarios (across 3 spec files) have passing covering tests. All design decisions are coherently implemented. Backend tests pass (150/150), frontend TypeScript compiles cleanly. No CRITICAL or WARNING issues found. The Namek revive mechanic is fully verified.
