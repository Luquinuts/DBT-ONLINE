# Tasks: Core Game Engine

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1800-2400 |
| 800-line budget risk | High |
| Chained PRs recommended | Yes |
| Delivery strategy | ask-always |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes (resolved)
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Lines |
|------|------|-----------|-------|
| 1 | Shared types + character/card data | PR 1 | ~700 |
| 2 | Engine core modules (no card effects) | PR 2 | ~800 |
| 3 | Card effects (13 handlers) | PR 3 | ~500 |
| 4 | Socket bridge + tests | PR 4 | ~400 |

## Phase 1: Shared Types Foundation

- [x] 1.1 Rewrite `shared/types/game.ts` with CharacterDef, CardDef, GamePhase, PlayerGameState, GameState, GameAction (discriminated union)
- [x] 1.2 Rewrite `shared/types/card.ts` — CardDef types, 52-card deck composition (types only; Phase 2 adds deck data)
- [x] 1.3 Update `shared/types/socket.ts` — add game:state_update, game:action, game:error, game:over, game:defender_window, game:defender_response
- [x] 1.4 Update `shared/types/index.ts` — export new types and game-helpers

## Phase 2: Game Data

- [x] 2.1 Create `backend/src/data/characters.ts` — 16 characters with stats/abilities/icons (located at `backend/src/data/`, not `backend/src/game/` per orchestrator instruction)
- [x] 2.2 Create `backend/src/data/deck.ts` — 52-card deck factory with shuffle/deal utilities
- [x] 2.3 Create `backend/src/data/index.ts` — re-export index for characters and deck

## Phase 3: Engine Core

- [x] 3.1 Create `DraftManager.ts` — alternating pick, enforce order
- [x] 3.2 Create `TurnManager.ts` — WAITING→ADVANCE→ATTACK→END lifecycle
- [x] 3.3 Create `CombatResolver.ts` — damage, shield/evade, counter-damage
- [x] 3.4 Create `KiManager.ts` — accumulate/spend
- [x] 3.5 Create `WinConditionChecker.ts` — death detection, Beerus insta-kill
- [x] 3.6 Create `EventBus.ts` — pre/post-damage, pre/post-turn hooks
- [x] 3.7 Create `ActionValidator.ts` — phase/ownership/ki/usage validation
- [x] 3.8 Create `CardEffectEngine.ts` — registry dispatch by effect ID
- [x] 3.9 Create `GameEngine.ts` — orchestrator: validate→resolve→check→emit

## Phase 4: Card Effects

- [x] 4.1 `RageEffect.ts` — permanent +1 atk to rage-icon allies
- [x] 4.2 `NubeKintonEffect.ts` — skip lentitud, 1/game cap
- [x] 4.3 `EsquiveEffect.ts` — block normal attack (defender response)
- [x] 4.4 `EscudoEffect.ts` — block any attack (equipable shield)
- [x] 4.5 `BaculoSagradoEffect.ts` — 1 dmg, breaks shield, no turn end
- [x] 4.6 `UltimateEffect.ts` — all skip lentitud, 2/game
- [x] 4.7 `MaquinaDelTiempoEffect.ts` — extra turn (Máquina del Tiempo)
- [x] 4.8 `SemillaSenzuEffect.ts` — heal +3 HP
- [x] 4.9 `CargaKiEffect.ts` — +1 ki
- [x] 4.10 `SuperCargaKiEffect.ts` — +2 ki (handled by CargaKiEffect, parses ki:N)
- [x] 4.11 `EsferaDragonEffect.ts` — full revive, 1/game
- [x] 4.12 `NaveEspacialEffect.ts` — battlefield reroll
- [x] 4.13 `PlusVidaEffect.ts` — +1 max vida

### Phase 4: Additional Deliverables

- [x] 4.14 `cards/index.ts` — effect registry builder, composite defense handler
- [x] 4.15 `EffectTypes.ts` — shared EffectResult type (avoids circular deps)
- [x] 4.16 `CardEffectEngine.ts` — refactored to use separate handler files
- [x] 4.17 `battlefields.ts` — 10 battlefield definitions
- [x] 4.18 `FieldEffectEngine.ts` — apply/remove battlefield modifier system
- [x] 4.19 `CombatResolver.ts` — battlefield restrictions & attack modifier checks
- [x] 4.20 `ActionValidator.ts` — no_definitivas validation
- [x] 4.21 `GameEngine.ts` — no_equipables check in handlePlayCard

## Phase 5: Socket Bridge

- [x] 5.1 Handle `room:start_game` — create game, deal deck, emit game:state_update (DRAFT phase → battlefield → turn start)
- [x] 5.2 Handle `game:action` — validate→resolve→broadcast game:state_update (includes defender window, extra turn, game over)
- [x] 5.3 Handle disconnect during game — cleanup, emit game:over to remaining player

## Phase 6: Testing

- [ ] 6.1 Unit: draft pick flow, out-of-turn rejection (GE-1)
- [ ] 6.2 Unit: full turn lifecycle (GE-2)
- [ ] 6.3 Unit: combat damage, shield/evade, counter-damage (GE-3, GE-4)
- [ ] 6.4 Unit: passives — Gotenks counter, Kid Buu double hit (GE-4)
- [ ] 6.5 Unit: card effects — Nube Kinton cap, Rage stacking (GE-5)
- [ ] 6.6 Unit: win — last char dies, Beerus hakai (GE-7, GE-8)
- [ ] 6.7 Integration: full game via socket bridge (GS-1→GS-5)
