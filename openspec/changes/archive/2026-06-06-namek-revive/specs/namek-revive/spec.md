# namek-revive — Specification

## Purpose

Define the Namek battlefield revive mechanic (`revive_on_last`). When a player drops from 2 to 1 alive characters on Namek, they may revive one dead character via `DRAGON_REVIVE` without the Esfera del Dragón card. Triggers once per game, blocked while Kid Buu is alive on either field.

## Requirements

| ID | Requirement | Strength |
|----|-------------|----------|
| NR-1 | The revive MUST trigger when battlefield = `revive_on_last`, Kid Buu is alive on neither field, `namekReviveUsed` = false, and a player has exactly 1 alive character with at least 1 dead character | MUST |
| NR-2 | On trigger, the engine MUST set `namekRevivePending` to the player's index and MUST NOT end the game | MUST |
| NR-3 | While pending, the triggering player MUST be allowed to play `DRAGON_REVIVE` without Esfera del Dragón in hand | MUST |
| NR-4 | The player MUST select exactly one of their own dead characters as revive target. Reviving an opponent's character MUST be rejected | MUST |
| NR-5 | After revive resolves, `namekReviveUsed` MUST be `true`, `namekRevivePending` MUST be `null`, and win condition check MUST run | MUST |
| NR-6 | The revive MUST trigger at most once per game. When `namekReviveUsed` = true, detection is skipped | MUST |
| NR-7 | If Kid Buu is alive on either field when the trigger condition is checked, the revive MUST NOT trigger | MUST |

### Scenario: NR-1 — Happy path trigger

- GIVEN battlefield = Namek (`revive_on_last`), Kid Buu not in play, `namekReviveUsed` = false
- WHEN Player A's second alive character is defeated in combat
- THEN engine sets `namekRevivePending` = Player A's index
- AND game remains in WAITING_FOR_ACTION

### Scenario: NR-3 — Cardless revive

- GIVEN `namekRevivePending` = Player A's index
- WHEN Player A plays `DRAGON_REVIVE` with `targetCharacterId` = a dead character they own
- THEN action is accepted without Esfera del Dragón in hand
- AND the dead character is revived on the field

### Scenario: NR-4 — Own character only

- GIVEN `namekRevivePending` = 0
- WHEN Player 0 sends `DRAGON_REVIVE` targeting opponent's dead character
- THEN engine MUST reject with error

### Scenario: NR-6 — Once per game

- GIVEN `namekReviveUsed` = true
- WHEN a player drops to 1 alive character on Namek
- THEN no revive prompt appears, win check runs normally

### Scenario: NR-7 — Kid Buu blocks

- GIVEN battlefield = Namek (`revive_on_last`), Kid Buu alive on opponent's field
- WHEN a player drops to 1 alive character
- THEN engine MUST NOT set `namekRevivePending`
- AND win condition check runs, game may end normally

### Scenario: NR-2 — No premature game over

- GIVEN `namekRevivePending` = 0, Player 0 has 0 alive characters
- WHEN win condition check runs
- THEN phase stays WAITING_FOR_ACTION, game continues

### Scenario: NR-5 — Post-revive cleanup

- GIVEN revive just completed successfully
- WHEN `EsferaDragonEffect` returns
- THEN `namekReviveUsed` = true, `namekRevivePending` = null
- AND win check runs: if Player 0 has 1+ alive, play continues; if 0, game ends
