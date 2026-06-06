# game-types — Specification

## Purpose

Define shared types for character, card, game state, actions, socket events, and battlefield — consumed by both backend engine and any future frontend.

## Requirements

| ID | Requirement | Strength |
|----|-------------|----------|
| GT-1 | Characters MUST define `id`, `name`, `type` (TANQUE/DAMAGE/SUPPORT), `stats` (vida, lentitud, ataque), `abilities` (pasiva, habilidad, definitiva with costs), and icon flags (rage, mejora, change, equippable) | MUST |
| GT-2 | Cards MUST define `id`, `name`, `type` (ACCION/ITEM), `effect` descriptor, `cost` (ki), and `usageLimits` (per-game or per-turn) | MUST |
| GT-3 | GameState MUST track `phase` (DRAFT→BATTLEFIELD→PRE_BATTLE→WAITING_FOR_ACTION→ADVANCE→ATTACK→DEFENDER_RESPONSE→END_TURN→GAME_OVER), both player states (hand, field of characters, ki, remaining deck, discard pile), and `currentTurn` | MUST |
| GT-4 | GameAction MUST be a discriminated union with typed payloads for: `play_card`, `advance`, `attack`, `use_ability`, `use_definitiva`, `pass`, `draft_pick`, `BAN_CHARACTER` | MUST |
| GT-5 | Socket events MUST define typed payloads for `game:state_update`, `game:action`, `game:error`, `game:draft_state`, `game:draft_pick` | MUST |
| GT-6 | PlayerGameState MUST expose `id`, `hand` (own cards only), `field` (characters in play), `ki` pool, `deckCount`, `discardPileSize` | MUST |

### Scenario: GT-3 — State machine transitions

- GIVEN GameState phase = DRAFT
- WHEN both players finish drafting
- THEN phase transitions to BATTLEFIELD
- AND engine begins turn lifecycle

### Scenario: GT-3 — Pre-battle inserted in state machine

- GIVEN both players finish drafting and battlefield is selected
- WHEN `handlePlaceCharacters` returns `readyToStart`
- THEN phase transitions to `PRE_BATTLE` (instead of `WAITING_FOR_ACTION`)
- AND countdown timer begins
- AND after countdown ends, phase transitions to `WAITING_FOR_ACTION`

### Scenario: GT-4 — Invalid action type rejected

- GIVEN GameAction type = "attack"
- WHEN GameState phase = WAITING_FOR_ACTION (no characters advanced yet)
- THEN type checker MUST reject at compile time if payload mismatches

### Scenario: GT-4 — Ban character action

- GIVEN `GameAction.type = "BAN_CHARACTER"`
- WHEN payload includes `characterId: string`
- THEN the action is valid during `PRE_BATTLE` phase when battlefield effect includes `disable_character`

### Scenario: GT-1 — Character definition

- GIVEN SSJ BROLY is defined
- WHEN stats are set
- THEN vida = 10, lentitud = 2, ataque = 3, rage icon = true
- AND definitiva targets 2 enemies

## Requirements (Added by pre-battle-reveal)

| ID | Requirement | Strength |
|----|-------------|----------|
| GT-9 | A `PreBattleState` interface MUST define `stage: 'reveal' \| 'ban' \| 'countdown' \| 'fight'`, and optionally `pendingBan: { playerIndexes: number[] } \| null` | MUST |
| GT-10 | `GameState` MUST include a `secondsRemaining: number | null` field, present during `PRE_BATTLE` phase | MUST |
| GT-11 | `GameState` MUST include a `bannedCharacters: string[]` field for tracking bans during PRE_BATTLE ban stage | MUST |

### Scenario: GT-9 — PreBattleState on sync

- GIVEN a game in `PRE_BATTLE` phase
- WHEN `game:request_sync` is received
- THEN the server includes `PreBattleState` data in the `GameState` response
- AND `preBattle.stage` reflects the current sub-stage (`reveal`, `ban`, `countdown`, or `fight`)

### Scenario: GT-10 — secondsRemaining updates

- GIVEN `phase = 'PRE_BATTLE'`
- WHEN countdown decrements
- THEN `secondsRemaining` is emitted in each `game:state_update`
- AND value is 5, 4, 3, 2, 1, 0 (then phase transitions)

### Scenario: GT-11 — Ban stage state

- GIVEN battlefield effect = `disable_character`
- WHEN PRE_BATTLE starts
- THEN `preBattle.stage = 'ban'` and `pendingBan = { playerIndexes: [] }`
- WHEN a player submits a valid BAN_CHARACTER
- THEN `bannedCharacters` includes the banned character's ID
- AND `pendingBan.playerIndexes` includes that player's index
- WHEN both players have banned (`playerIndexes.length === 2`)
- THEN bans are applied, `pendingBan` is cleared, and countdown begins

## Requirements (Added by namek-revive)

| ID | Requirement | Strength |
|----|-------------|----------|
| GT-12 | `GameState` MUST include `namekReviveUsed: boolean` initialized to `false` | MUST |
| GT-13 | `GameState` MUST include `namekRevivePending: number \| null` initialized to `null` | MUST |

### Scenario: GT-12 — Revive used flag persists

- GIVEN `namekReviveUsed` = false
- WHEN a Namek revive completes successfully
- THEN `namekReviveUsed` MUST be true for the rest of the game

### Scenario: GT-13 — Pending set to triggering player

- GIVEN a player on Namek battlefield drops from 2 to 1 alive characters
- WHEN engine detects the revive trigger
- THEN `namekRevivePending` MUST be set to that player's index
- AND it MUST be null for any non-triggering player

### Scenario: GT-13 — Pending cleared after revive

- GIVEN `namekRevivePending` = 0
- WHEN `DRAGON_REVIVE` action resolves successfully
- THEN `namekRevivePending` MUST be reset to `null`

### Scenario: GT-13 — No pending in non-Namek contexts

- GIVEN battlefield effect is NOT `revive_on_last`
- WHEN a player drops to 1 alive character
- THEN `namekRevivePending` MUST remain `null`
