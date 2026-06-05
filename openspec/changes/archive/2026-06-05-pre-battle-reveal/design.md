# Design: Pre-Battle Reveal + Countdown

## Technical Approach

Server-authoritative state machine between draft and first turn. A `PreBattleManager` runs countdown ticks (setInterval, 5s), emitting `game:state_update` each second. For Kame House, a ban sub-stage waits for both `BAN_CHARACTER` actions before countdown. Frontend renders a full-screen overlay (`PreBattleReveal`) keyed to `PRE_BATTLE` phase — three visual stages: reveal, ban, countdown.

## Architecture Decisions

| Decision | Options | Tradeoffs | Chosen |
|----------|---------|-----------|--------|
| Countdown source | Server setInterval vs client setTimeout | Server authoritative prevents desync; client-only simpler but drifts | **Server** — socket emits per tick |
| PreBattle data shape | Nested `preBattleState` vs flat fields on `GameState` | Nested scales for Phase 2 (ban state); flat is simpler for reducer | **Nested `preBattle`**, plus flat `secondsRemaining` for reducer ease |
| Ban validation | In PreBattleManager vs ActionValidator | Validator already has phase dispatch pattern; PreBattleManager handles ban lifecycle | **ActionValidator** for ban validity, **PreBattleManager** for lifecycle |
| New socket events | `game:pre_battle_tick` vs reuse `game:state_update` | New event means separate listener; reuse keeps reducer uniform | **Reuse `game:state_update`** — `secondsRemaining` field drives UI |

## Data Flow

```
DraftManager (both placed)                  GameEngine
  │                                            │
  └─ readyToStart=true ───────────────────►  pick battlefield
                                              apply FieldEffectEngine
                                              deal decks
                                              preBattle.startReveal()
                                                    │
                                                    ▼
                                            PreBattleManager
                                              stage='reveal'
                                              emit state_update (PRE_BATTLE, seconds=5)
                                              │
                                              ├── [Kame House] → stage='ban' → wait for 2 bans
                                              │                    ↓
                                              │              both submitted → stage='countdown'
                                              │
                                              └── setInterval (1000ms) × 5
                                                    emit state_update (seconds=n)
                                                    │
                                                    ▼
                                              tick 0 → turn.startTurn()
                                              emit state_update (WAITING_FOR_ACTION)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `shared/types/game.ts` | Modify | Add `PRE_BATTLE` to `GamePhase`, `BAN_CHARACTER` to `GameAction`, `secondsRemaining` to `GameState`, new `PreBattleState` interface |
| `shared/types/game-helpers.ts` | Modify | Add `PRE_BATTLE` to `validPhasesForAction`, map `BAN_CHARACTER` and `PASS` |
| `backend/src/game/engine/GameEngine.ts` | Modify | Intercept `readyToStart` → init `PreBattleManager` instead of `startTurn()` |
| `backend/src/game/engine/PreBattleManager.ts` | Create | State machine: reveal → (ban?) → countdown → complete callback |
| `backend/src/game/state/GameState.ts` | Modify | Add `preBattle` getter/setter, expose `secondsRemaining` |
| `backend/src/game/draft/DraftManager.ts` | Modify | `transitionTo('PRE_BATTLE')` instead of `'BATTLEFIELD'` |
| `backend/src/game/turn/TurnManager.ts` | No change | Called by `PreBattleManager` after countdown |
| `backend/src/game/validation/ActionValidator.ts` | Modify | Add `validateBanCharacter`, allow `PASS` in `PRE_BATTLE` |
| `backend/src/game/gameSocketHandlers.ts` | Modify | Wire countdown broadcast, handle ban emit after action |
| `backend/src/game/GameRegistry.ts` | Modify | Store `activeTimers` map for cleanup |
| `frontend/src/lib/gameReducer.ts` | Modify | Handle `preBattle`, `secondsRemaining`, `phase === 'PRE_BATTLE'` |
| `frontend/src/lib/useGame.ts` | Modify | Add `banCharacter` action export |
| `frontend/src/app/game/GamePage.tsx` | Modify | Route `PRE_BATTLE` → `<PreBattleReveal />` |
| `frontend/src/components/game/PreBattleReveal.tsx` | Create | Full-screen overlay with 3 visual stages |

## Interfaces / Contracts

```typescript
// ── shared/types/game.ts additions ──

type GamePhase = 'DRAFT' | 'BATTLEFIELD' | 'PRE_BATTLE' | 'WAITING_FOR_ACTION' | …;

interface PreBattleState {
  stage: 'reveal' | 'ban' | 'countdown';
  secondsRemaining: number | null;      // null before countdown starts
  banState?: {
    bans: [string | null, string | null]; // banned opponent char IDs
    received: [boolean, boolean];
  };
  rosters: [string[], string[]];        // character IDs per player (3 each)
}

interface GameState {
  // …existing fields
  secondsRemaining?: number;             // flat for reducer convenience
  preBattle?: PreBattleState | null;
}

// New action
type GameAction = /* …existing */
  | { type: 'BAN_CHARACTER'; targetCharacterId: string; targetPlayerIndex: number };

// ── PreBattleManager ──
class PreBattleManager {
  startReveal(state: GameStateManager, battlefield: BattlefieldDef): void;
  handleBan(state: GameStateManager, playerIndex: number, targetId: string): { success: boolean; error?: string; allBansReceived?: boolean };
  startCountdown(state: GameStateManager, onTick: (seconds: number) => void, onComplete: () => void): void;
  cancel(): void;  // cleanup on game end
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `PreBattleManager` state transitions (reveal → ban → countdown) | Mock `GameStateManager`, assert stages and emitted values |
| Unit | `validPhasesForAction` includes `PRE_BATTLE` and `BAN_CHARACTER` | Assert correct mapping |
| Unit | Ban validation: cannot ban last character, own character, or non-existent | Unit test `ActionValidator.validateBanCharacter` |
| Integration | Full game flow: draft → PRE_BATTLE → countdown → WAITING_FOR_ACTION | Create game, complete draft, assert phase sequence via state snapshots |
| E2E | Two clients see same countdown ticks and FIGHT! transition | Socket.io test harness with 2 fake clients |
| E2E | Kame House: both bans → countdown → banned char marked | Full flow with `disable_character` battlefield |

## Migration / Rollout

**Phase 1** (this slice): Basic reveal + countdown. No ban — countdown starts immediately after reveal. `PreBattleManager.stage` goes `reveal → countdown`.

**Phase 2** (separate slice): Kame House ban detection (`battlefield.effect === 'disable_character'`). Stage goes `reveal → ban → countdown`. Ban validation and `banState` tracking.

No data migration — all state is transient server memory.

## Open Questions

- [ ] Should rosters be full `CharacterState[]` or just ID strings? IDs are lighter for state_update payload.
- [ ] What happens if a player disconnects during ban stage? Auto-pick a random ban? Fail-safe timeout?
- [ ] Timer cleanup: when game ends during PRE_BATTLE (disconnect), ensure setInterval is cleared.
