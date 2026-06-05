# Delta for game-socket

## ADDED Requirements

### Requirement: GS-7 — Pre-battle state emission

When entering `PRE_BATTLE` phase, the server MUST emit `game:state_update` with `phase = 'PRE_BATTLE'`, `battlefield` set, and `secondsRemaining` present. Subsequent countdown ticks MUST emit incremental `game:state_update` with decremented `secondsRemaining`.

#### Scenario: PRE_BATTLE state broadcast

- GIVEN both players complete draft placement
- WHEN engine transitions to `PRE_BATTLE`
- THEN both players receive `game:state_update` with `phase = 'PRE_BATTLE'`, `secondsRemaining = 5`, and `battlefield` set

#### Scenario: Countdown tick broadcasts

- GIVEN `PRE_BATTLE` phase is active with `secondsRemaining = 5`
- WHEN each second elapses
- THEN server emits `game:state_update` with `secondsRemaining = 4`, then `3`, `2`, `1`, `0`
- AND both clients receive the same sequence simultaneously

#### Scenario: Countdown complete broadcast

- GIVEN `secondsRemaining = 0` is emitted
- WHEN engine calls `startTurn()`
- THEN server emits final `game:state_update` with `phase = 'WAITING_FOR_ACTION'`, no `secondsRemaining` field
- AND `currentPlayerIndex` is set to the first player

### Requirement: GS-8 — Reconnection with pre-battle data

`game:request_sync` MUST return the complete `GameState` including `secondsRemaining` and battlefield when the game is in `PRE_BATTLE` phase.

#### Scenario: Reconnect during countdown

- GIVEN a player disconnects with `secondsRemaining = 3`
- WHEN they reconnect and send `game:request_sync`
- THEN server returns `game:state_update` with `phase = 'PRE_BATTLE'`, `secondsRemaining = 3`, `battlefield` set, and both player states
- AND the reconnecting client renders `PreBattleReveal` with the remaining time

### Requirement: GS-9 — Ban character action event (Phase 2)

During `PRE_BATTLE` with `disable_character` battlefield, the server MUST accept `BAN_CHARACTER` actions and emit `game:state_update` after each valid ban to confirm.

#### Scenario: Ban submission broadcasts

- GIVEN battlefield effect = `disable_character`
- WHEN a player submits `game:action` with `{ type: 'BAN_CHARACTER', targetCharacterId, targetPlayerIndex }`
- THEN server validates and emits `game:state_update` to both players with the banned character removed from playable roster
- AND emits `game:state_update` with phase still `PRE_BATTLE`, `secondsRemaining` still null (both bans required before countdown)
