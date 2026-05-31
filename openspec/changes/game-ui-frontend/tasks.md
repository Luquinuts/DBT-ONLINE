# Tasks: Game UI Frontend

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-always |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation + Draft UI — reducer, hook, page router, draft components | PR 1 | Base = feature/game-ui-frontend; ~500 lines |
| 2 | Core Game Board — board, cards, hand, action bar, battlefield | PR 2 | Base = PR 1 branch; ~600 lines |
| 3 | Interactions + Polish — defender modal, log, game over, animations, wiring | PR 3 | Base = PR 2 branch; ~400 lines |

## Phase 1: Foundation

- [x] 1.1 Create `frontend/src/lib/gameReducer.ts` — useReducer with actions: SET_STATE, SELECT_CHARACTER, SHOW_DEFENDER, CLEAR_DEFENDER, SET_ERROR, CLEAR_ERROR
- [x] 1.2 Create `frontend/src/lib/useGame.ts` — socket hook connecting game:state_update, game:defender_window, game:error, game:over via dispatch; expose actions object for game:action emits
- [x] 1.3 Create `frontend/src/app/game/GamePage.tsx` — phase router renders DraftPhase, GameBoard, or GameOverOverlay based on gameState.phase; owns useGame lifecycle
- [x] 1.4 Create `frontend/src/components/game/draft/DraftPhase.tsx` — draft flow container: pick grid + place order
- [x] 1.5 Create `frontend/src/components/game/draft/CharacterPickCard.tsx` — clickable character card in draft grid
- [x] 1.6 Create `frontend/src/components/game/draft/DraftStatus.tsx` — current picker, sequence progress, remaining picks
- [x] 1.7 Create `frontend/src/components/game/draft/PlaceOrderArea.tsx` — slot-based order arrangement for 3 chosen chars

## Phase 2: Core Game Board

- [x] 2.1 Create `frontend/src/components/game/CharacterCard.tsx` — char display: name, HP bar, stats, advance counter, ability buttons, click-to-select attacker
- [x] 2.2 Create `frontend/src/components/game/HpBar.tsx` — color-coded HP bar (green/yellow/red) with damage flash animation
- [x] 2.3 Create `frontend/src/components/game/FieldArea.tsx` — renders 3 CharacterCards per side; Ki/Deck/Discard counts, onCharacterClick/onAbility/onDefinitiva callbacks
- [x] 2.4 Create `frontend/src/components/game/HandArea.tsx` — fanned card display with tap-to-play + playability graying
- [x] 2.5 Create `frontend/src/components/game/CardInHand.tsx` — single hand card: type icon, name, effect text
- [x] 2.6 Create `frontend/src/components/game/ActionBar.tsx` — phase-conditional buttons: PASS, SALTAR, END_TURN; phase indicator, ki/deck counter, ultimate uses
- [x] 2.7 Create `frontend/src/components/game/BattlefieldDisplay.tsx` — active battlefield card with effect description and nullified overlay
- [x] 2.8 Create `frontend/src/components/game/GameBoard.tsx` — composes FieldArea (×2), HandArea, ActionBar, BattlefieldDisplay, game log, error display; handles click → target attack flow

## Phase 3: Interactions & Polish

- [x] 3.1 Create `frontend/src/components/game/DefenderResponseModal.tsx` — overlay: pending attack info + Esquive/Escudo/Use Ability/None buttons with countdown timer
- [x] 3.2 Create `frontend/src/components/game/GameLog.tsx` — scrollable log of TurnLogEntry actions with color-coded entries, toggle shortcut (L key)
- [x] 3.3 Create `frontend/src/components/game/GameOverOverlay.tsx` — winner announcement + return to lobby button with fade-in
- [x] 3.4 Create `frontend/src/components/game/card-effects.css` — CSS holographic foil shimmer + gradient animations
- [x] 3.5 Add flying card animation — hand→field via CSS keyframes triggered on card play; projectile animation for attacks; floating damage numbers
- [x] 3.6 Update `frontend/src/app/game/GamePage.tsx` — integrate all new components (DefenderResponseModal, GameOverOverlay, ErrorToast, GameLog); handle room:leave on exit
