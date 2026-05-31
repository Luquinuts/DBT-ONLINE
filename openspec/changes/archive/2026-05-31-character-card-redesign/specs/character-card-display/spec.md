# character-card-display — Specification

## Purpose

Compact field card that shows the character's full art prominently, with HP bar and advance bar below the image, and name/type/stats overlaid on the art. This replaces the current gradient-overlaid design that buries art at 60% opacity.

## Requirements

| ID | Requirement | Strength |
|----|-------------|----------|
| CCD-1 | Card background MUST render the character art at full opacity with no gradient overlay, using the image as the entire card backdrop | MUST |
| CCD-2 | Name and type badge MUST be overlaid at the top of the card, above the art | MUST |
| CCD-3 | Stats row (ATK/LENT) MUST be overlaid near the bottom of the art area, before the HP bar | MUST |
| CCD-4 | HP bar MUST render below the card image, full width of the card | MUST |
| CCD-5 | Advance progress bar MUST render below the HP bar | MUST |
| CCD-6 | CHARACTER_DISPLAY data MUST be extended with `abilities.habilidad.cooldown: number` and `abilities.definitiva.kiCost: number` | MUST |
| CCD-7 | Dead state MUST show a D E R R I B A D O overlay above the art | MUST |
| CCD-8 | Shield equipped, defending status, and battlefield effect indicators MUST remain visible in the compact card | SHOULD |
| CCD-9 | Card MUST NOT render inline HAB or DEF buttons | MUST |

### Scenario: CCD-1 — Full-opacity art renders as backdrop

- GIVEN any alive character with a defined image
- WHEN the CharacterCard renders
- THEN the character image fills the entire card background at 100% opacity
- AND no gradient overlay obscures the image

### Scenario: CCD-4 + CCD-5 — Bars below image

- GIVEN a character with `currentVida < maxVida` and `advanceCounter < currentLentitud`
- WHEN the card renders
- THEN the HP bar is positioned below the image area
- AND the advance progress bar is positioned below the HP bar

### Scenario: CCD-6 — Ability data in display

- GIVEN a character like SSJ Goku with `abilities.habilidad.cooldown: 2`
- WHEN CHARACTER_DISPLAY is accessed
- THEN `abilities.habilidad.cooldown` equals the value from backend characters.ts
- AND `abilities.definitiva.kiCost` is populated for every character

### Scenario: CCD-8 — Dead character

- GIVEN a character with `isAlive = false`
- WHEN the card renders
- THEN a "DERRIBADO" overlay covers the card
- AND the card has reduced opacity

### Scenario: CCD-9 — No inline action buttons

- GIVEN any CharacterCard in any game phase
- WHEN the card renders
- THEN no HAB or DEF button is rendered inside the card
