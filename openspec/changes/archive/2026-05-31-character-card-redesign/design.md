# Design: Character Card Redesign

## Technical Approach

Replace inline HAB/DEF buttons with a fixed-overlay CharacterModal, elevate card art to full opacity, and move HP/advance bars below the image. Player field click opens the modal instead of dispatching actions directly; the modal shows Avanzar/HAB/DEF with disabled states computed from `playerKi`, `abilityCooldownRemaining`, and enriched CHARACTER_DISPLAY ability data.

## Architecture Decisions

| Option | Tradeoffs | Decision |
|--------|-----------|----------|
| **Fixed overlay modal** vs inline expand vs new route | Inline expand breaks card layout; route loses game state context. Fixed overlay is self-contained, matches existing DefenderResponseModal pattern | **Fixed overlay (portal)** — spec requires prevent-body-scroll |
| **Prop-drill playerKi** through FieldArea vs context/selector | Only one consumer (CharacterModal), prop drilling is simplest for a single-level pass-through | **Prop-drill** through FieldArea |
| **w-48 card size** vs enlarge | Enlarging needs layout rework across all 3 fields × 6 characters. Current w-48 fits grid layout and has enough room for full-art display | **Keep w-48**, add fixed image area (h-36) |
| **CharacterCard click opens modal** vs direct advance | Direct advance is faster but loses HAB/DEF access on field; modal unifies all actions in one place | **Click opens modal** — interacts with existing selectedCharacter for ATTACK phase |

## Data Flow

```
GameBoard (modalCharacterId state)
  │
  ├─► FieldArea (receives playerKi, onCharacterClick opens modal)
  │     │
  │     ├─► CharacterCard (stripped: no onAbility/onDefinitiva, full-art backdrop)
  │     │
  │     └─► passes playerKi + modal handlers via FieldArea props
  │
  └─► CharacterModal (portal overlay)
        │
        ├─ uses CHARACTER_DISPLAY.abilities for kiCost/cooldown metadata
        ├─ uses CharacterState.abilityCooldownRemaining for HAB disable
        ├─ uses PlayerGameState.ki (from playerKi prop) for DEF disable
        └─ calls onAbility/onDefinitiva/onClick → GameBoard handlers
```

**CharacterCard new layout:**
```
┌─────────────────────┐
│  Name       [TYPE]  │  ← overlaid on art
│                     │
│   art (100% fill)   │  ← h-36, full opacity, no gradient
│                     │
│  ATK 3   LENT 1     │  ← overlaid at bottom of image
├─────────────────────┤  ← image area ends here
│  HP bar             │  ← full width below image
│  Advance bar        │
│  🛡️ status texts    │
└─────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/components/game/CharacterModal.tsx` | Create | Portal overlay with Avanzar/HAB/DEF, large art, disabled states |
| `frontend/src/components/game/CharacterCard.tsx` | Modify | Full-opacity art, no gradient, HP/advance bars below image, remove inline buttons |
| `frontend/src/components/game/FieldArea.tsx` | Modify | Add `playerKi` prop, remove `onAbility`/`onDefinitiva` from CharacterCard |
| `frontend/src/components/game/GameBoard.tsx` | Modify | Add `modalCharacterId` state, render CharacterModal, change player-click to open modal |
| `frontend/src/data/character-display.ts` | Modify | Add `abilities: { habilidad?: { cooldown }; definitiva?: { kiCost, damage, targets } }` |

## Interfaces / Contracts

### CharacterModal Props (new)

```typescript
interface CharacterModalProps {
  character: CharacterState;
  playerKi: number;
  phase: GamePhase;
  isMyTurn: boolean;
  onAdvance: () => void;
  onAbility: () => void;
  onDefinitiva: () => void;
  onClose: () => void;
}
```

### CHARACTER_DISPLAY enrichment

```typescript
// Add to each entry:
abilities?: {
  habilidad?: { cooldown: number };
  definitiva?: { kiCost: number; damage: number | 'INFINITE'; targets: string };
}
// Source: backend/src/data/characters.ts — sync when backend adds characters
```

### FieldArea prop changes

```typescript
// Add: playerKi: number
// Remove: onAbility, onDefinitiva (moved to GameBoard → CharacterModal)
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Render | CharacterCard renders full-art at 100% opacity | Visual check + no gradient overlay in DOM |
| Render | Modal opens on player character click | Trigger click, assert modal element in portal |
| State | DEF disabled when ki < kiCost | Mock playerKi=3, kiCost=5, assert button disabled |
| State | HAB disabled when cooldown > 0 | Set abilityCooldownRemaining=2, assert disabled |
| State | Avanzar hidden when advanceCounter >= lentitud | Modal renders without Avanzar button |
| Behavior | Modal closes on backdrop click | Click overlay area, assert modal removed |
| Behavior | Modal closes after action fires | Spy on callback, assert onClose called |
| Behavior | Opponent field click still targets directly | Click opponent character, verify existing attack logic |

No test infrastructure exists — testing is manual/visual until test runner is added.

## Migration / Rollout

No migration required. CharacterCard and modal co-exist: old inline HAB/DEF buttons removed on deploy, modal activated on player field click. Opponent field and all other interactions unchanged.

## Open Questions

- [ ] In ATTACK phase, clicking a player character sets `selectedCharacter` for attack targeting — should the modal also open simultaneously or only when the character is the attack target?
- [ ] Does the HAB button in the modal need a target selector (e.g., for heal_ally effects) or is the current single-click dispatch sufficient?
