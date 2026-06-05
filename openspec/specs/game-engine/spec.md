# game-engine — Specification

## Purpose

Server-authoritative game engine managing draft, turn lifecycle, combat, card effects, ki, and win conditions.

## Requirements

| ID | Requirement | Strength |
|----|-------------|----------|
| GE-1 | Draft MUST alternate picks between players and reject out-of-turn or unavailable characters | MUST |
| GE-2 | Turn lifecycle MUST enforce: WAITING_FOR_ACTION → ADVANCE → ATTACK → END_TURN; each phase validates preconditions before proceeding. PRE_BATTLE is handled separately between BATTLEFIELD and WAITING_FOR_ACTION | MUST |
| GE-3 | Each character MUST track advance count; attack is legal only when count ≥ lentitud, unless a card/ability overrides | MUST |
| GE-4 | Combat MUST resolve damage: subtract ataque from target vida, apply shield (block any hit), esquive (block normal attacks only), and passives (counter-damage, double attack) | MUST |
| GE-5 | Each card effect MUST resolve correctly: Rage (permanent +1 atk to all allies with rage icon), Nube Kinton (skip lentitud, 1/game per character), ULTIMATE (all characters skip lentitud, 2/game), Báculo Sagrado (1 damage, breaks shield, turn continues), Esquive (normal attacks only), Escudo (blocks any attack) | MUST |
| GE-6 | Ki MUST accumulate from played cards and be consumed for definitivas and abilities that declare a cost | MUST |
| GE-7 | Win condition MUST trigger when a player has 0 characters alive and none can be revived | MUST |
| GE-8 | Game MUST end immediately if BEERUS uses definitiva (10 ki) — infinite damage to single target | MUST |

### Scenario: GE-1 — Out-of-turn draft pick

- GIVEN Player A is picking first
- WHEN Player B sends draft_pick for a character
- THEN engine returns error, state unchanged

### Scenario: GE-2 — Full turn lifecycle

- GIVEN both players have characters in field
- WHEN current player plays a card, then advances all eligible characters, then attacks
- THEN engine computes damage, applies passives, transitions to END_TURN, switches currentTurn

### Scenario: GE-2 — Draft transitions to PRE_BATTLE

- GIVEN both players have placed characters
- WHEN `handlePlaceCharacters` detects `readyToStart`
- THEN a random battlefield is picked
- AND battlefield effect is applied via `FieldEffectEngine`
- AND decks are dealt to both players
- AND state transitions to `PRE_BATTLE` (not `WAITING_FOR_ACTION`)
- AND `startTurn()` is deferred until countdown completes

### Scenario: GE-4 — Counter-damage passive

- GIVEN SSJ3 Gotenks has 7 vida, 2 ataque
- WHEN opponent attacks Gotenks
- THEN attacker takes 1 unescapable counter-damage regardless of shield or esquive

### Scenario: GE-4 — Kid Buu double attack

- GIVEN Kid Buu (6 vida, 0 lentitud, 2 ataque) is eligible
- WHEN Kid Buu attacks
- THEN same target takes 2 ataque, then 2 ataque again (4 total)

### Scenario: GE-5 — Nube Kinton usage limit

- GIVEN character already used Nube Kinton this game
- WHEN player attempts to use it again on same character
- THEN engine rejects with "Nube Kinton already used this game"

### Scenario: GE-7 — Win condition

- GIVEN opponent's last character reaches 0 vida
- WHEN state updates
- THEN phase = GAME_OVER, winnerId = current player

## Requirements (Added by pre-battle-reveal)

| ID | Requirement | Strength |
|----|-------------|----------|
| GE-9 | The engine MUST run a server-authoritative countdown after entering `PRE_BATTLE`. The countdown MUST emit `game:state_update` with `secondsRemaining` each second for 5 ticks. After tick 0, the engine MUST call `startTurn()` to transition to `WAITING_FOR_ACTION` | MUST |
| GE-10 | When entering `PRE_BATTLE`, the engine MUST call `getRandomBattlefield()` and set it on GameState. If a battlefield was already set (from `BATTLEFIELD` phase), it MUST NOT be reselected | MUST |
| GE-11 | If the battlefield effect is `disable_character` (Kame House), the engine MUST enter a ban sub-phase before countdown. Both players MUST submit a `BAN_CHARACTER` action. Countdown starts only after both bans are received (Phase 2) | MUST |

### Scenario: GE-9 — Full countdown lifecycle

- GIVEN engine enters PRE_BATTLE with `secondsRemaining = 5`
- WHEN 1 second elapses
- THEN server emits `game:state_update` with `secondsRemaining = 4`
- AFTER 5 ticks reaching 0
- THEN engine calls `startTurn()`, phase transitions to `WAITING_FOR_ACTION`
- AND both clients receive final `game:state_update` with `phase = 'WAITING_FOR_ACTION'`

### Scenario: GE-9 — Countdown timer source

- GIVEN countdown is active
- WHEN a client disconnects and reconnects
- THEN the server MUST return the current `secondsRemaining` value in `game:state_update`

### Scenario: GE-10 — Single battlefield selection

- GIVEN no battlefield was selected during draft
- WHEN `handlePlaceCharacters` triggers `readyToStart`
- THEN `getRandomBattlefield()` is called once
- AND the selected battlefield is set on `GameState.battlefield`
- AND battlefield effect is applied via `FieldEffectEngine.applyModifiers()`

### Scenario: GE-11 — Kame House ban flow (Phase 2)

- GIVEN battlefield effect = `disable_character`
- WHEN engine enters `PRE_BATTLE`
- THEN both players receive prompt to ban a character
- WHEN Player A sends `BAN_CHARACTER` with `characterId`
- THEN the target character is marked as banned (cannot be used this battle)
- AND engine waits for Player B's ban
- WHEN both bans received
- THEN countdown begins normally

### Scenario: GE-11 — Ban not required for non-Kame battlefields

- GIVEN battlefield effect ≠ `disable_character`
- WHEN engine enters `PRE_BATTLE`
- THEN countdown starts immediately (no ban sub-phase)
- AND `BAN_CHARACTER` actions are rejected with error
