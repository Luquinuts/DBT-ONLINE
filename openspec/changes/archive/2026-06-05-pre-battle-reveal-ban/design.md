# Design: Kame House Ban Mechanic (Phase 2)

## Technical Approach

Extend `PreBattleManager` to support a `ban` sub-stage between reveal and countdown when the battlefield has `disable_character` effect. Track bans via `bannedCharacters[]` on GameState. Route `BAN_CHARACTER` actions through existing `game:action` socket flow.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Ban representation | `bannedCharacters: string[]` on GameState | `isAlive = false`, `isDisabled` flag | Keeps death system untouched. Banned chars can still be attacked (per Kame House flavor) |
| Ban stage tracking | `preBattle.pendingBan: { playerIndexes: number[] } \| null` | `bans: [string\|null, string\|null]` tuple | Object tracks which players have submitted (by index). Empty array → both need to act. Length 2 → both submitted. More extensible than tuple. |
| Ban target | Player's OWN character | Opponent's character | Spec requirement (GT-10): ban targets owned character, can't ban last alive |
| BAN_CHARACTER validation | New `validateBanCharacter()` in ActionValidator | Inline in GameEngine | Follows existing pattern (every action has validate* method) |

## Data Flow

```
PLACE_CHARACTERS (both)
       │
       ▼
 Check battlefield.effect
       │
       ├── disable_character? ──→ Ban Stage
       │                          Both submit BAN_CHARACTER
       │                          via game:action ─→ engine.handleAction
       │                          │
       │                          └── Both submitted? ──→ Countdown
       │
       └── other effect ──→ Countdown (existing flow)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `shared/types/game.ts` | Modify | Add `'ban'` to PreBattleState.stage, add `bans` field, add `bannedCharacters` to GameState |
| `shared/types/game.ts` | Modify | Add `BAN_CHARACTER` to GameAction union |
| `shared/types/game-helpers.ts` | Modify | Add `PRE_BATTLE` to `validPhasesForAction` for `BAN_CHARACTER` |
| `backend/src/game/pre-battle/PreBattleManager.ts` | Modify | Add `startBanStage()`, `handleBanAction()`, `isBanStageActive()` — ban lifecycle before countdown |
| `backend/src/game/engine/GameEngine.ts` | Modify | Route `BAN_CHARACTER` to PreBattleManager; check ban before countdown in `handlePlaceCharacters` |
| `backend/src/game/validation/ActionValidator.ts` | Modify | Add `validateBanCharacter()` — phase, stage, ownership, >1 alive, not already submitted |
| `backend/src/game/state/GameState.ts` | Modify | Add `bannedCharacters: []` initial state |
| `frontend/src/components/game/PreBattleReveal.tsx` | Modify | Add ban sub-UI: selectable character cards, confirm button, "waiting" state, opponent ban reveal |
| `frontend/src/lib/gameReducer.ts` | Modify | Pass `preBattle.pendingBan`, `bannedCharacters` through state |
| `frontend/src/lib/useGame.ts` | Modify | Add `banCharacter(characterId)` action helper |
| `frontend/src/app/game/GamePage.tsx` | Modify | Pass ban action handler to PreBattleReveal |

## Interfaces / Contracts

```typescript
// shared/types/game.ts

// PreBattleState — add 'ban' stage and pendingBan tracking
export interface PreBattleState {
  stage: 'reveal' | 'ban' | 'countdown' | 'fight';
  pendingBan: { playerIndexes: number[] } | null; // which players have submitted bans
}

// GameState — add bannedCharacters array
export interface GameState {
  // ...existing fields
  bannedCharacters: string[];  // character IDs currently banned
}

// GameAction — add BAN_CHARACTER
export type GameAction =
  // ...existing actions
  | { type: 'BAN_CHARACTER'; characterId: string };
```

## Testing Strategy

No test infrastructure exists (openspec config confirms). Design for manual verification.

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Ban validation rules | `PreBattleManager.test.ts` — stage flow, ban collection, edge cases |
| Manual | Full ban → countdown flow | Play through: Kame House drawn → both ban → countdown starts |
| Manual | Non-Kame-House skip | Verify ban stage is skipped for other battlefields |

## Migration / Rollout

No migration required. This is additive — existing `preBattle.stage` values (`'reveal' | 'countdown' | 'fight'`) remain valid for non-ban battlefields.

## Open Questions

- [ ] Should banned characters show a visual indicator on the game board (grayed out, "BANNED" badge)?
