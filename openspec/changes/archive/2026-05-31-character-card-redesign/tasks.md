# Tasks: Character Card Redesign

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~385 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR |
|------|------|-----------|
| 1 | Full change: data + card redesign + modal + wiring | PR 1 |

## Phase 1: Foundation — Ability Data

- [x] 1.1 Add `abilities` type (`habilidad?.cooldown`, `definitiva?.kiCost/damage/targets`) to CHARACTER_DISPLAY in `frontend/src/data/character-display.ts`
- [x] 1.2 Populate `abilities.definitiva` for all characters from `backend/src/data/characters.ts`
- [x] 1.3 Populate `abilities.habilidad.cooldown` for the 9 habilitiy characters (ssj-god-goku, golden-frieza, hit, ssj2-gohan, piccolo, jiren, ssj-future-trunks, ssj-goku, ssj-rose-black-goku)
- [x] 1.4 Export `CHARACTERS_WITH_HABILIDAD: Set<string>` for HAB button conditional rendering

## Phase 2: Core — CharacterCard Redesign

- [x] 2.1 Remove inline HAB/DEF buttons from `frontend/src/components/game/CharacterCard.tsx`
- [x] 2.2 Replace gradient overlay with full-opacity art (`100%`, no gradient) as card background
- [x] 2.3 Overlay name + type badge at top, stats (ATK/LENT) near bottom of art area
- [x] 2.4 Move HP bar and advance bar below the image div (outside art container)
- [x] 2.5 Keep DERRIBADO overlay, shield/defending/status indicators

## Phase 3: New — CharacterModal

- [x] 3.1 Create `frontend/src/components/game/CharacterModal.tsx` with `CharacterModalProps` (character, playerKi, phase, isMyTurn, action callbacks)
- [x] 3.2 Render fixed portal overlay with full-screen backdrop, disable body scroll
- [x] 3.3 Avanzar: visible when `advanceCounter < currentLentitud` && phase ADVANCE; hidden otherwise
- [x] 3.4 DEF: disabled when `playerKi < definitiva.kiCost`
- [x] 3.5 HAB: hidden when no `abilities.habilidad`; disabled when `abilityCooldownRemaining > 0`
- [x] 3.6 Close on backdrop click, Escape keydown, and all action callbacks

## Phase 4: Wiring — FieldArea + GameBoard

- [x] 4.1 Add `playerKi` prop to `frontend/src/components/game/FieldArea.tsx`; remove `onAbility`/`onDefinitiva` from CharacterCard
- [x] 4.2 Add `modalCharacterId: string | null` + open/close handlers in `frontend/src/components/game/GameBoard.tsx`
- [x] 4.3 Player-field character click opens modal instead of dispatching directly
- [x] 4.4 Render `<CharacterModal>` when `modalCharacterId` is set, passing all required props
- [x] 4.5 Forward `playerKi` from GameBoard through FieldArea for modal disabled-state computation

## Phase 5: Verification

- [x] 5.1 `tsc --noEmit` — TypeScript compile passes with zero errors
- [ ] 5.2 Visual: CharacterCard shows full art at 100% opacity, HP/advance bars below image, no inline buttons
- [ ] 5.3 Visual: own-field character click opens modal with correct button states (CAM-1 through CAM-6)
- [ ] 5.4 Visual: modal closes on backdrop click, Escape key, action execution (CAM-7)
- [ ] 5.5 Visual: opponent click targets directly (no modal), attack flow unchanged
