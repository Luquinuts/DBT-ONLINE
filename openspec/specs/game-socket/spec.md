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

## Requirements (Added by pre-battle-reveal)

| ID | Requirement | Strength |
|----|-------------|----------|
| GS-7 | When entering `PRE_BATTLE` phase, the server MUST emit `game:state_update` with `phase = 'PRE_BATTLE'`, `battlefield` set, and `secondsRemaining` present. Subsequent countdown ticks MUST emit incremental `game:state_update` with decremented `secondsRemaining` | MUST |
| GS-8 | `game:request_sync` MUST return the complete `GameState` including `secondsRemaining` and battlefield when the game is in `PRE_BATTLE` phase | MUST |
| GS-9 | During `PRE_BATTLE` with `disable_character` battlefield, the server MUST accept `BAN_CHARACTER` actions and emit `game:state_update` after each valid ban to confirm (Phase 2) | MUST |

### Scenario: GS-7 — PRE_BATTLE state broadcast

- GIVEN both players complete draft placement
- WHEN engine transitions to `PRE_BATTLE`
- THEN both players receive `game:state_update` with `phase = 'PRE_BATTLE'`, `secondsRemaining = 5`, and `battlefield` set

### Scenario: GS-7 — Countdown tick broadcasts

- GIVEN `PRE_BATTLE` phase is active with `secondsRemaining = 5`
- WHEN each second elapses
- THEN server emits `game:state_update` with `secondsRemaining = 4`, then `3`, `2`, `1`, `0`
- AND both clients receive the same sequence simultaneously

### Scenario: GS-7 — Countdown complete broadcast

- GIVEN `secondsRemaining = 0` is emitted
- WHEN engine calls `startTurn()`
- THEN server emits final `game:state_update` with `phase = 'WAITING_FOR_ACTION'`, no `secondsRemaining` field
- AND `currentPlayerIndex` is set to the first player

### Scenario: GS-8 — Reconnect during countdown

- GIVEN a player disconnects with `secondsRemaining = 3`
- WHEN they reconnect and send `game:request_sync`
- THEN server returns `game:state_update` with `phase = 'PRE_BATTLE'`, `secondsRemaining = 3`, `battlefield` set, and both player states
- AND the reconnecting client renders `PreBattleReveal` with the remaining time

### Scenario: GS-9 — Ban submission broadcasts (Phase 2)

- GIVEN battlefield effect = `disable_character`
- WHEN a player submits `game:action` with `{ type: 'BAN_CHARACTER', characterId }`
- THEN server validates and emits `game:state_update` to both players with the banned character removed from playable roster
- AND emits `game:state_update` with phase still `PRE_BATTLE`, `secondsRemaining` still null (both bans required before countdown)
