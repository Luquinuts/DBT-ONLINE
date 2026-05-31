# Design: Game UI Frontend

## Technical Approach

Phase-driven component tree rendered from `GameState.phase`. A `useGame()` hook wraps socket events via `useReducer` for predictable state transitions, mirroring `useRoom.ts`'s socket pattern but upgraded to reducer for complex nested state. Components are pure function of game state — zero local mutation of game data.

## Architecture Decisions

| Option | Tradeoffs | Decision |
|--------|-----------|----------|
| **State mgmt**: `useReducer` vs `useState` | `useReducer` gives atomic transitions, debuggable actions, easier derived state — at cost of boilerplate. `useState` simpler but risk of stale closure bugs across 5+ co-dependent fields. | **useReducer** — game state has 20+ interdependent fields; reducer dispatches per `game:state_update` guarantee atomic consistency. |
| **Socket wiring**: single `useGame` vs per-component listeners | Single hook follows `useRoom.ts` pattern — one mount/unmount lifecycle. Per-component listeners risk duplicate connections and race conditions. | **Single useGame hook** — parent `GamePage` owns the socket lifecycle; children receive props. |
| **Component split**: `FieldArea` shared vs separate `PlayerField`/`OpponentField` | Shared component means prop switches for mirror/flip; separate gives cleaner each-side layout. | **Separate** — player vs opponent layout differs (action buttons only on player side, card backs on opponent). Shared sub-components (`CharacterCard`, `HpBar`). |
| **Draft routing**: inline phase vs separate route | Inline avoids URL gymnastics; separate is cleaner for deep-linking. Draft transitions immediately to game — no navigational reason for distinct route. | **Inline phase** — `GamePage` renders `DraftPhase` when `phase === 'DRAFT'`. No URL change. |

## Data Flow

```
User click → useGame.action() emits game:action
  → Backend validates + applies game logic + broadcasts
  → game:state_update arrives at both clients
  → useGame listener dispatches SET_STATE to reducer
  → React re-renders entire tree with new GameState
```

Defender response flow:
```
Attacker action → server sets pendingAttack → game:defender_window
  → useGame sets isDefenderResponse=true, renders modal
  → Defender clicks esquive/escudo/none
  → useGame emits game:defender_response
  → Server resolves → game:state_update (no pendingAttack) → modal closes
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/app/game/page.tsx` | Create | New game page route, renders `GamePage` component |
| `frontend/src/app/game/GamePage.tsx` | Create | Phase router: DraftPhase, GameBoard, or GameOverOverlay |
| `frontend/src/lib/useGame.ts` | Create | Socket hook + reducer for game state |
| `frontend/src/lib/gameReducer.ts` | Create | Pure reducer: SET_STATE, SELECT_CHARACTER, SHOW_DEFENDER, CLEAR_ERROR |
| `frontend/src/components/game/GameBoard.tsx` | Create | Main board layout: fields + hand + action bar + log |
| `frontend/src/components/game/CharacterCard.tsx` | Create | Character display with HP bar, advance counter, action overlay |
| `frontend/src/components/game/HpBar.tsx` | Create | Color-coded HP bar: green/yellow/red with damage flash |
| `frontend/src/components/game/FieldArea.tsx` | Create | Renders 3 CharacterCards in a row (player or opponent) |
| `frontend/src/components/game/HandArea.tsx` | Create | Fanned hand cards, tap-to-play, playability graying |
| `frontend/src/components/game/CardInHand.tsx` | Create | Single hand card: type icon, name, effect |
| `frontend/src/components/game/ActionBar.tsx` | Create | Phase-conditional buttons: Pass, EndTurn, phase indicator |
| `frontend/src/components/game/GameLog.tsx` | Create | Scrollable log of TurnLogEntry items |
| `frontend/src/components/game/GameOverOverlay.tsx` | Create | Winner announcement + return to lobby |
| `frontend/src/components/game/DefenderResponseModal.tsx` | Create | Modal: esquive/escudo/none with timer |
| `frontend/src/components/game/BattlefieldDisplay.tsx` | Create | Active battlefield area |
| `frontend/src/components/game/draft/DraftPhase.tsx` | Create | Draft flow: pick grid + order arrangement |
| `frontend/src/components/game/draft/CharacterPickCard.tsx` | Create | Single draft pick card in grid |
| `frontend/src/components/game/draft/DraftStatus.tsx` | Create | Current picker + remaining picks display |
| `frontend/src/components/game/draft/PlaceOrderArea.tsx` | Create | Drag-to-order your 3 chosen characters |

**0 modified, 20 new files.**

## Interfaces / Contracts

The `useGame` hook signature (types in proposal, omitting here for length) — key contract: all mutation flows through `actions` object. Components never import socket directly.

Reducer shape:

```typescript
type GameAction_UI =
  | { type: 'SET_STATE'; payload: GameState }
  | { type: 'SELECT_CHARACTER'; characterId: string | null }
  | { type: 'SHOW_DEFENDER'; payload: { pendingAttack: PendingAttack; timeoutMs: number } }
  | { type: 'CLEAR_DEFENDER' }
  | { type: 'SET_ERROR'; payload: GameError }
  | { type: 'CLEAR_ERROR' };
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `gameReducer` transitions | Pure function tests: dispatch SET_STATE with fixture, assert new state shape |
| Unit | Phase visibility logic | Test that ActionBar shows correct buttons per phase (table-driven) |
| Integration | `useGame` socket wiring | Mock socket.io, emit fake `game:state_update`, assert hook state |
| E2E | Draft → Game → Game Over flow | Manual playtest (no e2e infra yet per config.yaml) |

## Migration / Rollout

No migration required. Game page is additive — no existing game UI to replace. Feature-gated by room code navigation from lobby.

## Open Questions

- [ ] Card play targeting UX: click card → highlight targets → click target? Or drag card onto character? Proposal implies click-flow.
- [ ] Animation strategy: CSS transitions (no dep) or framer-motion (new dep)? Proposal lists framer-motion as optional.
