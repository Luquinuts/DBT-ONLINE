# Design: Namek Revive Mechanic

## Technical Approach

Flag-based trigger with zero new phases. After every successful action, run a cheap detection hook that checks battlefield effect `revive_on_last`, Kid Buu absence, and 2→1 alive transition. On trigger, set `namekRevivePending` — the existing `DRAGON_REVIVE` action handles execution by bypassing the card search and calling `EsferaDragonEffect` directly. Win condition checker defers game-over when pending is active. Frontend reads the flag and shows a dead-character picker overlay.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| Detection placement | Inside `handleDefenderResponse` vs before every win check | **Before every win check** | Death can come from combat OR card/ability effects (Beerus Hakai). A single hook in `handleAction()` before the win-check block catches all paths. Idempotent after first trigger. |
| Revive execution | New dedicated handler vs reuse EsferaDragonEffect | **Reuse EsferaDragonEffect via registry** | The effect already does full-stat revive correctly. Calling `this.cards.resolve(state, playerIndex, 'revive:full', targetId)` avoids duplicating revive logic. |
| Validation approach | Card check in validator vs handler | **Keep card check in handler, add ownership guard to validator** | Existing pattern: validator checks preconditions (phase, target alive/dead, ownership), handler checks card possession. For Namek revive, validator adds `namekRevivePending === playerIndex` + target-ownership check. Handler skips card search when pending. |
| Win condition guard | In `check()` vs `checkAfterDeath()` | **Both** | `check()` is called from `handleAction` loop; `checkAfterDeath()` is called from event hooks. Both need the guard to prevent premature game-over. |

## Data Flow

```
handleAction() flow:
┌─────────────────────────────────────────────┐
│ 1. Validate action                           │
│ 2. Route to handler (switch on action.type)  │
│    ├─ handleDefenderResponse → CombatResolver │
│    │   └─ sets isAlive = false on death       │
│    ├─ handlePlayCard → CardEffectEngine       │
│    │   └─ may kill via Hakai, etc.            │
│    └─ handleDragonRevive → revive execution   │
│ 3. checkReviveTrigger() ★ NEW ★              │
│    ├─ battlefield.revive_on_last?             │
│    ├─ Kid Buu alive? → skip                  │
│    ├─ namekReviveUsed? → skip                │
│    ├─ any player has 1 alive + ≥1 dead?      │
│    └─ set namekRevivePending = playerIndex   │
│ 4. winCheck.check() ← guards pending ★       │
│ 5. Return EngineResult                        │
└─────────────────────────────────────────────┘
```

**Revive execution flow** (when `namekRevivePending` is active):

```
DRAGON_REVIVE action
  → ActionValidator: pending matches? target owned & dead?
  → handleDragonRevive:
      if (state.namekRevivePending === playerIndex):
        this.cards.resolve(state, playerIndex, 'revive:full', targetId)
        state.namekReviveUsed = true
        state.namekRevivePending = null
      else:
        (existing: find esfera_dragon_N in hand → handlePlayCard)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `shared/types/game.ts` | Modify | Add `namekReviveUsed: boolean` and `namekRevivePending: number \| null` to `GameState` interface |
| `backend/src/game/state/GameState.ts` | Modify | Initialize `namekReviveUsed: false`, `namekRevivePending: null` in constructor |
| `backend/src/game/engine/GameEngine.ts` | Modify | Add `checkReviveTrigger()` private method; call it in `handleAction()` before win check; modify `handleDragonRevive()` to bypass card search when pending |
| `backend/src/game/validation/ActionValidator.ts` | Modify | `validateDragonRevive`: add `namekRevivePending` player check + target ownership validation |
| `backend/src/game/conditions/WinConditionChecker.ts` | Modify | `check()` and `checkAfterDeath()`: if player has 0 alive AND `namekRevivePending === playerIndex`, return NOT game over |
| `frontend/src/components/game/GameBoard.tsx` | Modify | Add revive prompt overlay when `namekRevivePending === playerIndex` |
| `shared/types/game-helpers.ts` | No change | DRAGON_REVIVE already valid in `WAITING_FOR_ACTION` — the pending flag doesn't change phase |

## Interfaces / Contracts

**GameState additions** (in `shared/types/game.ts`):

```typescript
export interface GameState {
  // …existing fields…
  namekReviveUsed: boolean;
  namekRevivePending: number | null;  // player index or null
}
```

**Initial values** (in `GameStateManager` constructor):

```typescript
this.state = {
  // …existing…
  namekReviveUsed: false,
  namekRevivePending: null,
};
```

**Public API** — no new socket events. The `dragonRevive()` function in `useGame.ts` already emits the correct `DRAGON_REVIVE` action. Frontend reads the pending flag from the existing `game:state_update` payload.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `checkReviveTrigger()` conditions | Isolate the detection logic: battlefield effect, Kid Buu, alive count, used flag |
| Unit | `WinConditionChecker` with pending flag | Supply state with 0 alive + pending set → assert NOT game over |
| Unit | `ActionValidator` with pending | Assert pending player can revive without card; non-pending player rejected; wrong-target rejected |
| Integration | Full revive flow via `handleAction` | Chain: kill a character → assert pending is set → revive → assert used flag + cleared pending |
| Integration | Kid Buu blocks revive | Place Kid Buu on field, kill other character → assert pending NOT set → game over fires |
| E2E | Frontend revive prompt | Simulate state with `namekRevivePending` → assert overlay renders with dead characters |

## Migration / Rollout

No migration required. Game state is in-memory only. New fields start at defaults (`false`/`null`).

## Open Questions

- [ ] **Both players hit 1 alive simultaneously** — extremely rare edge case (counter-damage + card effect). Current design sets pending for first matching player (index 0). Is this acceptable or should we queue?
- [ ] **Timeout for revive prompt** — if player doesn't revive within N seconds, should we auto-pass? Current design waits indefinitely (player must revive or the game would end next action).
