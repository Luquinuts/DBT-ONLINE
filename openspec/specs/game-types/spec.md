# game-types — Specification

## Purpose

Define shared types for character, card, game state, actions, socket events, and battlefield — consumed by both backend engine and any future frontend.

## Requirements

| ID | Requirement | Strength |
|----|-------------|----------|
| GT-1 | Characters MUST define `id`, `name`, `type` (TANQUE/DAMAGE/SUPPORT), `stats` (vida, lentitud, ataque), `abilities` (pasiva, habilidad, definitiva with costs), and icon flags (rage, mejora, change, equippable) | MUST |
| GT-2 | Cards MUST define `id`, `name`, `type` (ACCION/ITEM), `effect` descriptor, `cost` (ki), and `usageLimits` (per-game or per-turn) | MUST |
| GT-3 | GameState MUST track `phase` (DRAFT→BATTLEFIELD→WAITING_FOR_ACTION→ADVANCE→ATTACK→END_TURN→GAME_OVER), both player states (hand, field of characters, ki, remaining deck, discard pile), and `currentTurn` | MUST |
| GT-4 | GameAction MUST be a discriminated union with typed payloads for: `play_card`, `advance`, `attack`, `use_ability`, `use_definitiva`, `pass`, `draft_pick` | MUST |
| GT-5 | Socket events MUST define typed payloads for `game:state_update`, `game:action`, `game:error`, `game:draft_state`, `game:draft_pick` | MUST |
| GT-6 | PlayerGameState MUST expose `id`, `hand` (own cards only), `field` (characters in play), `ki` pool, `deckCount`, `discardPileSize` | MUST |

### Scenario: GT-3 — State machine transitions

- GIVEN GameState phase = DRAFT
- WHEN both players finish drafting
- THEN phase transitions to BATTLEFIELD
- AND engine begins turn lifecycle

### Scenario: GT-4 — Invalid action type rejected

- GIVEN GameAction type = "attack"
- WHEN GameState phase = WAITING_FOR_ACTION (no characters advanced yet)
- THEN type checker MUST reject at compile time if payload mismatches

### Scenario: GT-1 — Character definition

- GIVEN SSJ BROLY is defined
- WHEN stats are set
- THEN vida = 10, lentitud = 2, ataque = 3, rage icon = true
- AND definitiva targets 2 enemies
