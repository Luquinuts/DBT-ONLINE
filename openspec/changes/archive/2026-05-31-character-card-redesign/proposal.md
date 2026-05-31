# Proposal: Character Card Redesign

## Intent

Character cards bury full art at 60% opacity under gradients, while inline HAB/DEF buttons clutter the compact card. Need to separate display (compact card on field) from interaction (action modal) for better visual hierarchy.

## Scope

### In Scope
1. Redesign CharacterCard compact view — full-art prominent, HP/advance bars below, name/type/stats overlaid
2. Create CharacterModal with Avanzar/Habilidad/Definitiva buttons + disabled states (ki < kiCost, cooldown > 0)
3. Add ability data (kiCost, cooldown) to frontend CHARACTER_DISPLAY
4. Wire modal open/close + disabled logic in GameBoard
5. Remove inline HAB/DEF buttons from CharacterCard

### Out of Scope
1. Backend game logic or shared types
2. Animation system or sound effects
3. Drag-and-drop interactions
4. Spectator/observer view

## Capabilities

### New Capabilities
- `character-card-display`: Compact field card — full art at full opacity, HP bar + advance bar below, name/type/stats overlaid
- `character-action-modal`: Modal overlay with Avanzar/HAB/DEF buttons, disabled states based on ki and cooldown

### Modified Capabilities
None — no existing spec covers UI display behavior

## Approach

1. Extend CHARACTER_DISPLAY with `abilities.habilidad.cooldown`, `abilities.definitiva.kiCost`
2. Strip CharacterCard: remove inline buttons, elevate art to full opacity, move HP+advance bars below image
3. Create CharacterModal (portal overlay) reusing existing `onAbility`/`onDefinitiva`/`onClick` handlers
4. GameBoard manages `selectedCharacterId` + modal visibility; renders CharacterModal when character selected
5. Modal checks `playerKi >= definitiva.kiCost` for DEF disabled, `abilityCooldownRemaining > 0` for HAB disabled
6. FieldArea passes `playerKi` through component chain

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/src/data/character-display.ts` | Modified | Add ability data |
| `frontend/src/components/game/CharacterCard.tsx` | Modified | Compact layout, remove inline actions |
| `frontend/src/components/game/FieldArea.tsx` | Modified | Pass playerKi |
| `frontend/src/components/game/GameBoard.tsx` | Modified | Modal state, ki/cooldown logic |
| `frontend/src/components/game/CharacterModal.tsx` | New | Action modal |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Modal stays open after action | Low | Close on every action callback |
| Ability data drifts from backend | Med | Source from backend characters.ts, add sync comment |
| Layout shift opening modal | Low | Fixed-position overlay, body scroll prevented |

## Rollback Plan

1. Revert CharacterCard.tsx, FieldArea.tsx, GameBoard.tsx to current state
2. Delete frontend/src/components/game/CharacterModal.tsx
3. Remove ability data additions from character-display.ts

## Dependencies

- `CharacterState.abilityCooldownRemaining` and `PlayerGameState.ki` already in frontend game state via Socket.IO — no backend changes needed

## Success Criteria

- [ ] Compact card shows full art at full opacity, HP bar + advance bar below the image
- [ ] Clicking own-field character opens modal with Avanzar/HAB/DEF buttons
- [ ] Definitiva button disabled when player KI < character's kiCost
- [ ] Habilidad button disabled when `abilityCooldownRemaining > 0`
- [ ] Modal closes after executing an action or clicking backdrop
