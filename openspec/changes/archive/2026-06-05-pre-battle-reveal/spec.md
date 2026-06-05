# Pre-Battle Reveal — Specification

After draft placement, game enters `PRE_BATTLE` — a synchronous reveal showing battlefield card, character lineups, and 5-second countdown.

**Phase 1**: Basic reveal + countdown. **Phase 2** (extension): Kame House ban sub-phase.

---

## game-types — Delta

### MODIFIED: GT-3 — Phase lifecycle

DRAFT→BATTLEFIELD→**PRE_BATTLE**→WAITING_FOR_ACTION→ADVANCE→ATTACK→DEFENDER_RESPONSE→END_TURN→GAME_OVER.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Pre-battle inserted | Both finish drafting | `readyToStart` triggers | Phase = PRE_BATTLE, countdown begins |
| After countdown | secondsRemaining = 0 | Timer fires | Phase = WAITING_FOR_ACTION |

### ADDED: GT-9 — secondsRemaining

`GameState` MUST include optional `secondsRemaining: number` during PRE_BATTLE. Emitted in each `game:state_update` tick.

### ADDED: GT-10 — BAN_CHARACTER

`GameAction` MUST include `{ type: 'BAN_CHARACTER'; targetCharacterId: string; targetPlayerIndex: number }`. Valid only during PRE_BATTLE with `disable_character` battlefield.

---

## game-engine — Delta

### MODIFIED: GE-2 — Deferred startTurn

`handlePlaceCharacters`: when `readyToStart` → pick battlefield → apply effects → deal decks → phase=PRE_BATTLE → countdown → `startTurn()`.

### ADDED: GE-9 — Countdown timer

Server MUST emit `game:state_update` with decremented `secondsRemaining` each second for 5 ticks. After tick 0: call `startTurn()` → phase = WAITING_FOR_ACTION. Reconnecting players MUST receive current `secondsRemaining`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Full countdown | PRE_BATTLE, sec=5 | 5 ticks pass | Each tick emits 4→3→2→1→0, then startTurn() |
| Reconnect | D/C at sec=3 | Request sync | Return current sec=3 |

### ADDED: GE-10 — Ban sub-phase (Phase 2)

If battlefield effect = `disable_character`, engine MUST wait for both `BAN_CHARACTER` actions before starting countdown. Non-ban battlefields MUST start countdown immediately and reject ban actions.

---

## game-socket — Delta

### ADDED: GS-7 — PRE_BATTLE events

| Scenario | Event | Payload |
|----------|-------|---------|
| Initial reveal | `game:state_update` | phase=PRE_BATTLE, battlefield, sec=5 |
| Each tick | `game:state_update` | sec=4, 3, 2, 1, 0 |
| Complete | `game:state_update` | phase=WAITING_FOR_ACTION, no sec |

### ADDED: GS-8 — Reconnection

`game:request_sync` returns full GameState with current `secondsRemaining` and `battlefield`.

### ADDED: GS-9 — Ban event (Phase 2)

`game:action` accepts `BAN_CHARACTER` during PRE_BATTLE (Kame House). Emits `game:state_update` after each ban. No countdown until both received.

---

## pre-battle-reveal — New Spec

Full-screen overlay during `PRE_BATTLE`. Renders instead of `GameBoard`.

### PBR-1: Overlay | PBR-2: Battlefield

- GIVEN phase = PRE_BATTLE
- THEN overlay shows battlefield card (HoloCard, center) with name, effect, description

### PBR-3: Rosters

- GIVEN both players have 3 placed characters
- THEN left column = J1 portraits, right column = J2 portraits

### PBR-4: Countdown

- GIVEN secondsRemaining = N
- THEN overlay shows large centered N (5→4→3→2→1→"FIGHT!")
- AND after FIGHT! → overlay unmounts, GameBoard renders

### PBR-5: Reconnection

- GIVEN disconnect at sec=3
- WHEN reconnect sync
- THEN overlay shows "3"

### GamePage routing

```
DRAFT → DraftPhase | PRE_BATTLE → PreBattleReveal | isPlayingPhase → GameBoard | gameOver → GameOverOverlay
```

### gameReducer delta

- ADD `secondsRemaining: number | null` to `GameUIState`
- `SET_GAME_STATE` populates it from `gameState.secondsRemaining`

### useGame delta

- `game:state_update` already dispatches `SET_GAME_STATE` — no additional listener needed

---

## Data Contracts

```typescript
type GamePhase = 'DRAFT' | 'BATTLEFIELD' | 'PRE_BATTLE' | 'WAITING_FOR_ACTION' | /* ... */;
interface GameState { secondsRemaining?: number; }
type GameAction = /* ... */ | { type: 'BAN_CHARACTER'; targetCharacterId: string; targetPlayerIndex: number };
```

## State Transitions

```
[Ready to start] → PRE_BATTLE (sec=5) → tick(4→3→2→1→0) → WAITING_FOR_ACTION
                                              ↑
                                    Ban sub-phase (Kame House only)
```
