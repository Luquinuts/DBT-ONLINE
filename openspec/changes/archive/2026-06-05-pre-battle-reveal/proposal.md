# Proposal: Pre-Battle Reveal + Countdown

## Intent

Replace the instant DRAFT→WAITING_FOR_ACTION transition with a fighting-game-style intro: battlefield reveal, character lineup, and countdown — synchronous for both players.

## Scope

### In Scope
- New `PRE_BATTLE` game phase between `DRAFT` and `WAITING_FOR_ACTION`
- Battlefield card reveal with effect description
- 6-character side-by-side lineup (J1 picks 1, J2 picks 2, J1 picks 2, J2 picks 1)
- 5-second countdown with "FIGHT!" at end
- Pre-battle actions (Kame House ban-a-character) before countdown
- Reconnection support: show current PRE_BATTLE state
- Backend countdown timer vs client timer — one side is authoritative

### Out of Scope
- Cinematic animations or particle effects (basic CSS transitions only)
- Sound effects or music
- Draft order change (existing 1-2-2-1 pick order stays)
- Nave Espacial reroll interaction during pre-battle

## Capabilities

### New Capabilities
- `pre-battle-reveal`: Frontend overlay showing battlefield + characters + countdown

### Modified Capabilities
- `game-types`: Add `PRE_BATTLE` to GamePhase union; add `game:pre_battle_state` socket event type; add `BAN_CHARACTER` to GameAction
- `game-engine`: Pre-battle state machine — hold before startTurn(), run pre-battle actions, emit countdown ticks, then transition to WAITING_FOR_ACTION
- `game-socket`: New event types for pre-battle sync (`game:pre_battle_state`, `game:pre_battle_action`, `game:countdown_tick`)

## Approach

**Backend-authoritative countdown.** Server emits `game:pre_battle_state` with battlefield + both player rosters. For Kame House, server emits `pre_battle_action_required` and waits for `BAN_CHARACTER` actions from both players. Once resolved, server runs a 5-tick countdown emitting `game:countdown_tick {secondsRemaining}` each second. After "0 → FIGHT!", calls `startTurn()` to transition to WAITING_FOR_ACTION.

**Frontend** shows a full-screen overlay (reuse pattern from `GameOverOverlay`) during PRE_BATTLE phase. Split into: (1) RevealStage — battlefield card + rosters, (2) BanStage — interactive ban selector (Kame House), (3) CountdownStage — big number overlay.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `shared/types/game.ts` | Modified | Add `PRE_BATTLE` to GamePhase, `BAN_CHARACTER` to GameAction |
| `shared/types/game-helpers.ts` | Modified | Add PRE_BATTLE phase-action mappings |
| `backend/src/game/engine/GameEngine.ts` | Modified | Intercept `readyToStart`, emit pre-battle state, run countdown |
| `backend/src/game/turn/TurnManager.ts` | Modified | Called after countdown, not immediately after draft |
| `frontend/src/app/game/GamePage.tsx` | Modified | Route PRE_BATTLE to new overlay component |
| `frontend/src/components/game/PreBattleReveal.tsx` | New | Full-screen reveal overlay |
| `frontend/src/lib/gameReducer.ts` | Modified | Handle PRE_BATTLE phase and countdown state |
| `frontend/src/lib/useGame.ts` | Modified | Listen for pre-battle socket events |

## Slices

### Phase 1 — Basic reveal + countdown (no ban)
1. Add `PRE_BATTLE` to GamePhase, update game-helpers
2. GameEngine emits pre-battle state instead of calling startTurn()
3. Add server-side countdown timer (setInterval, 5 ticks)
4. Frontend PreBattleReveal component: show battlefield + character lineup + countdown
5. Reconnection: game:request_sync returns full state including pre-battle data

### Phase 2 — Pre-battle actions (Kame House)
1. Add `BAN_CHARACTER` action type
2. Detect battlefield with `disable_character` effect → enter BanStage
3. Accept ban actions from both players, validate, apply using FieldEffectEngine
4. Only start countdown after both bans submitted

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Desync between countdown timers | Low | Server-authoritative timer, emit ticks every 1s |
| Reconnecting during ban phase | Low | Include pending pre-battle actions in sync payload |
| Ban resolves to 0 characters (edge case) | Low | "Cannot target last alive character" rule (already in Kame House desc) |

## Rollback Plan

1. Revert `PRE_BATTLE` phase addition from GamePhase
2. Restore original readyToStart → startTurn() flow in GameEngine
3. Remove PreBattleReveal component import from GamePage

All rollback is file-level revert — no data migration needed since phase is transient server state.

## Dependencies

- Draft placement completion signal (`readyToStart`) — already exists

## Success Criteria

- [ ] Game always shows PRE_BATTLE screen between draft end and first play action
- [ ] Both players see the same battlefield + character lineup simultaneously
- [ ] Countdown reaches 0 and transitions to WAITING_FOR_ACTION on both clients
- [ ] Kame House ban resolves before countdown, applied characters match choice
- [ ] Reconnecting player sees correct pre-battle state (reveal, ban, or countdown stage)
