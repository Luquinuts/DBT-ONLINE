# Delta for game-types

## MODIFIED Requirements

### Requirement: GT-3 — GameState phase lifecycle

GameState MUST track `phase` (DRAFT→BATTLEFIELD→PRE_BATTLE→WAITING_FOR_ACTION→ADVANCE→ATTACK→DEFENDER_RESPONSE→END_TURN→GAME_OVER), both player states (hand, field of characters, ki, remaining deck, discard pile), and `currentTurn`.
(Previously: phase lifecycle was DRAFT→BATTLEFIELD→WAITING_FOR_ACTION… — `PRE_BATTLE` is new between BATTLEFIELD and WAITING_FOR_ACTION)

#### Scenario: GT-3 — Pre-battle inserted in state machine

- GIVEN both players finish drafting and battlefield is selected
- WHEN `handlePlaceCharacters` returns `readyToStart`
- THEN phase transitions to `PRE_BATTLE` (instead of `WAITING_FOR_ACTION`)
- AND countdown timer begins
- AND after countdown ends, phase transitions to `WAITING_FOR_ACTION`

### Requirement: GT-4 — GameAction includes ban action

GameAction MUST be a discriminated union with typed payloads for: `play_card`, `advance`, `attack`, `use_ability`, `use_definitiva`, `pass`, `draft_pick`, `ban_character`.
(Previously: `ban_character` was not included)

#### Scenario: GT-4 — Ban character action

- GIVEN `GameAction.type = "ban_character"`
- WHEN payload includes `targetCharacterId: string` and `targetPlayerIndex: number`
- THEN the action is valid during `PRE_BATTLE` phase when battlefield effect includes `disable_character`

## ADDED Requirements

### Requirement: GT-9 — PreBattleState type

A `PreBattleState` interface MUST define `secondsRemaining: number`, `battlefield: BattlefieldDef`, `rosters: [string[], string[]]` (character IDs per player).

#### Scenario: PreBattleState on sync

- GIVEN a game in `PRE_BATTLE` phase
- WHEN `game:request_sync` is received
- THEN the server includes `PreBattleState` data in the `GameState` response

### Requirement: GT-10 — secondsRemaining field

`GameState` MUST include an optional `secondsRemaining: number` field, present only during `PRE_BATTLE` phase.

#### Scenario: secondsRemaining updates

- GIVEN `phase = 'PRE_BATTLE'`
- WHEN countdown decrements
- THEN `secondsRemaining` is emitted in each `game:state_update`
- AND value is 5, 4, 3, 2, 1, 0 (then phase transitions)
