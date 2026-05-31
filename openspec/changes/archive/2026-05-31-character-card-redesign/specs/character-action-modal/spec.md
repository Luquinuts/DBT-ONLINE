# character-action-modal — Specification

## Purpose

Modal overlay that presents Avanzar, HAB, and DEF action buttons when a player taps their own-field character. The modal replaces the inline HAB/DEF buttons that were previously on the CharacterCard, with disabled states driven by game state (ki cost and cooldown).

## Requirements

| ID | Requirement | Strength |
|----|-------------|----------|
| CAM-1 | Clicking a player's own alive character MUST open a modal overlay with Avanzar, HAB, and DEF buttons | MUST |
| CAM-2 | Avanzar button MUST be shown when `advanceCounter < currentLentitud` and phase is ADVANCE | MUST |
| CAM-3 | Avanzar button MUST NOT be shown when the character has already reached advance limit | MUST |
| CAM-4 | DEF button MUST be disabled when `playerKi < definitiva.kiCost` for that character | MUST |
| CAM-5 | HAB button MUST be disabled when `abilityCooldownRemaining > 0` for that character | MUST |
| CAM-6 | HAB button MUST be hidden when the character has no habilidad defined (no `abilities.habilidad` in display data) | MUST |
| CAM-7 | Modal MUST close when the user clicks the backdrop, presses Escape, or any action executes successfully | MUST |
| CAM-8 | Modal MUST render via a portal overlay (fixed position, full-screen) that prevents body scroll | MUST |
| CAM-9 | GameBoard MUST manage `selectedCharacterId` and modal visibility state; only one modal open at a time | MUST |
| CAM-10 | FieldArea MUST receive and forward `playerKi` from GameBoard so the modal can compute disabled states | MUST |
| CAM-11 | Executing Avanzar via the modal MUST call the same `actions.advance()` handler as the current click-to-advance flow | MUST |

### Scenario: CAM-1 + CAM-4 + CAM-5 — Modal opens with correct disabled states

- GIVEN a player character with `abilityCooldownRemaining: 2` and `definitiva.kiCost: 5`, and `playerKi: 3`
- WHEN the player clicks the character
- THEN a modal opens with HAB button disabled (cooldown > 0)
- AND DEF button disabled (ki < kiCost)

### Scenario: CAM-2 — Avanzar shown in advance phase

- GIVEN a character with `advanceCounter: 0`, `currentLentitud: 2`, phase = ADVANCE
- WHEN the modal opens
- THEN the Avanzar button is visible and enabled
- AND clicking it calls `actions.advance(characterId)`

### Scenario: CAM-3 — Avanzar hidden when fully advanced

- GIVEN a character with `advanceCounter >= currentLentitud`
- WHEN the modal opens
- THEN the Avanzar button is NOT shown

### Scenario: CAM-7 — Modal closes on backdrop click

- GIVEN a modal is open
- WHEN the user clicks the darkened backdrop area outside the modal content
- THEN the modal closes immediately
- AND no action is dispatched

### Scenario: CAM-9 — Only one modal at a time

- GIVEN a modal is already open for character A
- WHEN the user clicks character B
- THEN the modal for character A closes
- AND a new modal opens for character B

### Scenario: CAM-6 — HAB hidden for characters without habilidad

- GIVEN a character with no `abilities.habilidad` in display data (e.g. SSJ Broly)
- WHEN the modal opens
- THEN the HAB button is not rendered
