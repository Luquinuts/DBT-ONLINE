# Delta for game-types

## ADDED Requirements

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
