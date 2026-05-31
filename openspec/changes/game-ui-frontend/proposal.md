# Proposal: Game UI Frontend (v2)

## Intent

Browser-playable game UI. Backend engine exists; players need a visual interface for draft, combat, and game flow — turn-based actions, character management, and real-time state.

## Scope

### In Scope
- Draft phase UI: 16-character grid, alternating picks, order arrangement
- Game board: two-sided field, character cards (HP, stats, status), battlefield display
- Hand component: fanned cards, play action with disabled state
- Action controls: PASS, ADVANCE, ATTACK, HABILIDAD, DEFINITIVA, SWITCH FORM — phase-conditional
- Defender response: esquive/escudo/NONE overlay on incoming attacks
- Game log: scrollable action history
- Game over screen: winner, return to lobby
- `useGame()` hook: socket event wiring + state management

### Out of Scope
- Sound effects / music
- Spectator mode, replay, tournament

## Capabilities

### New Capabilities
- `game-ui-draft`: Character selection grid, alternating pick flow, order arrangement
- `game-ui-board`: Game board with fields, character cards, HP/buffs, hand, battlefield display, game log
- `game-ui-actions`: Phase-sensitive action buttons, defender response modal

### Modified Capabilities
- None — UI consumes existing specs; no requirement changes

## Approach

Phase-driven component tree: `GamePage` switches between `DraftBoard`, `GameBoard`, or `GameOverScreen` based on `gameState.phase`. `useGame()` wraps socket events via `useReducer` — one dispatch per `game:state_update`. Each major area is a separate component (`FieldSide`, `CharacterCard`, `HandArea`, `ActionBar`, `DefenderModal`, `GameLog`). Styling via Tailwind v4 + CSS Grid. Desktop-first, tablet fallback.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/src/app/game/[roomCode]/` | New | Game page route (board + draft) |
| `frontend/src/lib/useGame.ts` | New | Socket event hook for game state |
| `frontend/src/components/game/` | New | All game UI components |
| `frontend/src/app/page.tsx` | Modified | Navigate to game page on start |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Socket state desync on reconnect | Med | `useGame()` re-requests state via socket event |
| Mobile layout breakage | Med | Desktop-first; no mobile support for game |

## Rollback Plan

Wipe `frontend/src/app/game/`, `frontend/src/lib/useGame.ts`, and `frontend/src/components/game/`. Revert changes to `frontend/src/app/page.tsx`. No DB or backend changes.

## Dependencies

- `@dbt-online/shared` types (existing)
- `socket.io-client` (already in frontend)
- `framer-motion` or CSS transitions for animations (new dep)

## Success Criteria

- [ ] Two players can complete full game: draft → play → game over
- [ ] Action buttons enable/disable correctly per phase
- [ ] Defender response resolves attack flow
- [ ] Game log shows all actions taken
- [ ] Game over screen displays winner
