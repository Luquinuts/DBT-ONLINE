# game-engine — Specification

## Purpose

Server-authoritative game engine managing draft, turn lifecycle, combat, card effects, ki, and win conditions.

## Requirements

| ID | Requirement | Strength |
|----|-------------|----------|
| GE-1 | Draft MUST alternate picks between players and reject out-of-turn or unavailable characters | MUST |
| GE-2 | Turn lifecycle MUST enforce: WAITING_FOR_ACTION → ADVANCE → ATTACK → END_TURN; each phase validates preconditions before proceeding | MUST |
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
