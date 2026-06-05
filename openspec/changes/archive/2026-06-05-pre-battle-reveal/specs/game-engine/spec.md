# Delta for game-engine

## MODIFIED Requirements

### Requirement: GE-2 — Turn lifecycle includes PRE_BATTLE

Turn lifecycle MUST enforce: WAITING_FOR_ACTION → ADVANCE → ATTACK → END_TURN; each phase validates preconditions before proceeding. PRE_BATTLE is handled separately between BATTLEFIELD and WAITING_FOR_ACTION.
(Previously: turn lifecycle started immediately after draft — now PRE_BATTLE runs before the first turn)

#### Scenario: GE-2 — Draft transitions to PRE_BATTLE

- GIVEN both players have placed characters
- WHEN `handlePlaceCharacters` detects `readyToStart`
- THEN a random battlefield is picked
- AND battlefield effect is applied via `FieldEffectEngine`
- AND decks are dealt to both players
- AND state transitions to `PRE_BATTLE` (not `WAITING_FOR_ACTION`)
- AND `startTurn()` is deferred until countdown completes

## ADDED Requirements

### Requirement: GE-9 — Pre-battle countdown timer

The engine MUST run a server-authoritative countdown after entering `PRE_BATTLE`. The countdown MUST emit `game:state_update` with `secondsRemaining` each second for 5 ticks. After tick 0, the engine MUST call `startTurn()` to transition to `WAITING_FOR_ACTION`.

#### Scenario: Full countdown lifecycle

- GIVEN engine enters PRE_BATTLE with `secondsRemaining = 5`
- WHEN 1 second elapses
- THEN server emits `game:state_update` with `secondsRemaining = 4`
- AFTER 5 ticks reaching 0
- THEN engine calls `startTurn()`, phase transitions to `WAITING_FOR_ACTION`
- AND both clients receive final `game:state_update` with `phase = 'WAITING_FOR_ACTION'`

#### Scenario: Countdown timer source

- GIVEN countdown is active
- WHEN a client disconnects and reconnects
- THEN the server MUST return the current `secondsRemaining` value in `game:state_update`

### Requirement: GE-10 — Random battlefield selection

When entering `PRE_BATTLE`, the engine MUST call `getRandomBattlefield()` and set it on GameState. If a battlefield was already set (from `BATTLEFIELD` phase), it MUST NOT be reselected.

#### Scenario: Single battlefield selection

- GIVEN no battlefield was selected during draft
- WHEN `handlePlaceCharacters` triggers `readyToStart`
- THEN `getRandomBattlefield()` is called once
- AND the selected battlefield is set on `GameState.battlefield`
- AND battlefield effect is applied via `FieldEffectEngine.applyModifiers()`

### Requirement: GE-11 — Ban character action (Phase 2)

If the battlefield effect is `disable_character` (Kame House), the engine MUST enter a ban sub-phase before countdown. Both players MUST submit a `BAN_CHARACTER` action. Countdown starts only after both bans are received.

#### Scenario: Kame House ban flow

- GIVEN battlefield effect = `disable_character`
- WHEN engine enters `PRE_BATTLE`
- THEN both players receive prompt to ban a character
- WHEN Player A sends `BAN_CHARACTER` with `targetCharacterId`
- THEN the target character is marked as banned (cannot be used this battle)
- AND engine waits for Player B's ban
- WHEN both bans received
- THEN countdown begins normally

#### Scenario: Ban not required for non-Kame battlefields

- GIVEN battlefield effect ≠ `disable_character`
- WHEN engine enters `PRE_BATTLE`
- THEN countdown starts immediately (no ban sub-phase)
- AND `BAN_CHARACTER` actions are rejected with error
