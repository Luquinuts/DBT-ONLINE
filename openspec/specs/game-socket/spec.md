# game-socket — Specification

## Purpose

Bridge the existing room system with the new game engine via typed Socket.IO events.

## Requirements

| ID | Requirement | Strength |
|----|-------------|----------|
| GS-1 | `room:start_game` MUST validate both players are ready, create a game instance via engine, deal decks, and emit `game:draft_state` to both players | MUST |
| GS-2 | `game:action` MUST route the typed action to the engine for validation; if invalid, emit `game:error` with descriptive `message` | MUST |
| GS-3 | After every valid action that mutates state, server MUST emit `game:state_update` with full `GameState` to ALL players in the room | MUST |
| GS-4 | `game:error` MUST include `message` and `code` fields explaining why the action was rejected (e.g., "not_your_turn", "no_ki") | MUST |
| GS-5 | When game ends, server MUST emit `game:state_update` with `phase=GAME_OVER` and `winnerId` set, then clean up the game instance | MUST |
| GS-6 | Disconnecting during a game MUST emit `game:error` with `code=player_disconnected` and pause the game timer (if any) | MUST |

### Scenario: GS-1 — Start game

- GIVEN room with 2 players, host clicks "Start"
- WHEN server receives `room:start_game`
- THEN both players receive `game:draft_state` with their 52-card deck and empty field
- AND game phase = DRAFT, currentTurn = random first picker

### Scenario: GS-2 — Invalid action rejected

- GIVEN it is Player A's turn
- WHEN server receives `game:action` from Player B
- THEN server emits `game:error` to Player B with message="Not your turn", code="not_your_turn"
- AND game state does NOT change

### Scenario: GS-5 — Game over

- GIVEN last opponent character reaches 0 vida
- WHEN combat resolves and win condition triggers
- THEN both players receive `game:state_update` with phase=GAME_OVER, winnerId set
- AND game instance is cleaned up
