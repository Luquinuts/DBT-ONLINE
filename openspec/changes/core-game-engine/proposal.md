# Proposal: Core Game Engine (v1)

## Intent

Add the first playable Dragon Ball card game to DBT-ONLINE. App supports rooms, auth, friends — no game logic. Deliver full backend engine: draft, turn flow, combat, card effects with 16 characters and a 52-card deck per player.

## Scope

### In Scope
- Shared types (Character, Card, GameState, GameAction, socket events)
- Backend engine (draft, turn manager, combat resolver, card effects)
- Socket handlers bridging room system to game
- 16 characters, full deck, all core mechanics

### Out of Scope
- UI/UX (board, card rendering, animations)
- Battlefield cards
- Characters beyond the 16 listed
- Negative/Cereal Dragon Balls, Anillo del Tiempo

## Capabilities

### New Capabilities
- `game-types`: Character, card, GameState, GameAction definitions
- `game-engine`: Draft, turn management, combat, card effect resolution
- `game-socket`: Socket.IO events for game creation and in-game actions

### Modified Capabilities
- None — no existing specs prior to this change

## Approach

Three layers, bottom-up:
1. **Types** — Rewrite `shared/types/game.ts` and `shared/types/card.ts`. Characters as enums with stats (ki, lentitud, ataque, definitiva). Cards as discriminated unions per ability.
2. **Engine** — Pure-logic modules in `backend/src/game/`: `DraftService`, `TurnManager`, `CombatResolver`, `CardEffectEngine`. Stateless where possible, state as GameState.
3. **Socket** — Handlers for `room:start_game` (create game) and `game:action` (delegate to engine). New server events: `game:draft_state`, `game:turn_state`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `shared/types/game.ts` | Rewritten | Replace placeholder with DB types |
| `shared/types/card.ts` | Rewritten | Replace placeholder with DB types |
| `shared/types/socket.ts` | Modified | Add game socket events |
| `backend/src/game/` | New | Draft, turn, combat, effects modules |
| `backend/src/index.ts` | Modified | Add game event handlers |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Circular deps in card effects | Med | Event-driven resolution — effects emit, engine resolves |
| Draft desync | Low | Server-authoritative, reject out-of-turn picks |

## Rollback Plan

- Wipe `backend/src/game/`, revert changed `shared/*.ts` to git HEAD
- Revert socket additions in `shared/types/socket.ts` and `backend/src/index.ts`
- No DB migrations (game state is in-memory)

## Dependencies

- `socket.io`, `uuid` already in `backend/package.json`
- No new npm packages
- Existing room system used as-is

## Success Criteria

- [ ] Two players can draft teams from 16 characters
- [ ] Turn flow (Action→Advance→Attack→End) resolves correctly
- [ ] All card types execute their effects
- [ ] Win condition triggers when opponent has no characters
- [ ] `shared/types/card.ts` and `shared/types/game.ts` pass `tsc --noEmit`
