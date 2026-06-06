# Delta for game-engine

## ADDED Requirements

| ID | Requirement | Strength |
|----|-------------|----------|
| GE-12 | After combat resolves and before win condition check, the engine MUST detect when battlefield effect = `revive_on_last`, Kid Buu is not alive on either field, `namekReviveUsed` = false, and any player has exactly 1 alive character with at least 1 dead character. On detection, set `namekRevivePending` to that player's index and skip win check | MUST |
| GE-13 | When `namekRevivePending` is set, the action validator MUST accept `DRAGON_REVIVE` action without requiring Esfera del Dragón in the player's hand | MUST |
| GE-14 | When `handleDragonRevive` is called while `namekRevivePending` is set, the engine MUST invoke `EsferaDragonEffect` directly on the target dead character without searching for the card | MUST |
| GE-15 | After a successful Namek revive, the engine MUST set `namekReviveUsed = true`, clear `namekRevivePending = null`, then run win condition check | MUST |

### Scenario: GE-12 — Happy path detection

- GIVEN battlefield effect = `revive_on_last`, Kid Buu not in play, `namekReviveUsed` = false
- WHEN Player A drops to exactly 1 alive character with at least 1 dead character
- THEN engine sets `namekRevivePending` = Player A's index
- AND phase stays WAITING_FOR_ACTION, game does not end

### Scenario: GE-12 — Kid Buu blocks detection

- GIVEN battlefield effect = `revive_on_last`, Kid Buu alive on either field
- WHEN a player drops to 1 alive character
- THEN engine MUST NOT set `namekRevivePending`
- AND win condition check runs normally

### Scenario: GE-12 — Only triggers once

- GIVEN `namekReviveUsed` = true
- WHEN a player drops to 1 alive character with dead characters
- THEN engine MUST NOT trigger revive detection

### Scenario: GE-13 — Cardless DRAGON_REVIVE accepted

- GIVEN `namekRevivePending` = 0
- WHEN Player 0 sends `DRAGON_REVIVE`
- THEN validator accepts even without Esfera del Dragón in hand

### Scenario: GE-13 — DRAGON_REVIVE rejected when not pending

- GIVEN `namekRevivePending` = null
- WHEN any player sends `DRAGON_REVIVE`
- THEN validator rejects unless Esfera del Dragón is in hand

### Scenario: GE-14 — Revive execution

- GIVEN `namekRevivePending` = 0, Player 0 has dead character "gohan"
- WHEN Player 0 sends `DRAGON_REVIVE` with `{ targetCharacterId: "gohan" }`
- THEN engine calls `EsferaDragonEffect` on "gohan"
- AND Gohan is revived and placed on the field

### Scenario: GE-15 — Post-revive state

- GIVEN a successful Namek revive just completed
- WHEN `EsferaDragonEffect` returns success
- THEN `namekReviveUsed` = true, `namekRevivePending` = null
- AND win condition check runs; player now has 1+ alive so game continues

## MODIFIED Requirements

### Requirement: GE-7 — Win condition

| ID | Requirement | Strength |
|----|-------------|----------|
| GE-7 | Win condition MUST trigger when a player has 0 characters alive and none can be revived. If `namekRevivePending` is set for the player with 0 alive characters, the game MUST NOT end and MUST wait for the revive action | MUST |

(Previously: Win condition did not guard against `namekRevivePending`)

#### Scenario: GE-7 — Standard game over (unchanged)

- GIVEN opponent's last character reaches 0 vida
- WHEN no revive is pending
- THEN phase = GAME_OVER, winnerId = current player

#### Scenario: GE-7 — Revive pending prevents game over

- GIVEN `namekRevivePending` = 0, Player 0 has 0 alive characters, 1 dead character
- WHEN combat resolves and win check runs
- THEN phase MUST NOT transition to GAME_OVER
- AND game continues in WAITING_FOR_ACTION for Player 0 to revive
