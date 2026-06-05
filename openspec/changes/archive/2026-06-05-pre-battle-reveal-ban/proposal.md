# Proposal: Pre-Battle Reveal — Phase 2 (Kame House Ban)

## Intent

Kame House's `disable_character` effect exists but never triggers. Players must ban one character before countdown — battlefield constrains roster.

## Scope

| In | Out |
|----|-----|
| BAN_CHARACTER action type | Nave Espacial reroll |
| Ban sub-stage detection | Multiple bans per game |
| Both players must ban | Animations/particles |
| Validation: not last alive | |
| FieldEffectEngine.applyBan() | |
| Frontend BanStage UI | |
| Reconnect: sync pending bans | |

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- **game-types**: `BAN_CHARACTER` in GameAction; `ban` in PreBattleState.stage; `bannedCharacters` field
- **game-engine**: PreBattleManager banStage lifecycle; GameEngine BAN_CHARACTER routing; FieldEffectEngine.applyBan(); ActionValidator.validateBanCharacter()
- **game-socket**: Route BAN_CHARACTER during PRE_BATTLE + disable_character
- **pre-battle-reveal**: BanStage sub-component in overlay

## Approach

**PreBattleManager**: On `startCountdown()`, if `battlefield.effect === 'disable_character'`, set `subStage='ban'`, wait for both `BAN_CHARACTER` actions. Track `preBattle.bans: [string|null, string|null]`. Once both received, `FieldEffectEngine.applyBan()` sets `isBanned=true`, then start countdown.

**Frontend**: BanStage renders clickable portraits when `stage='ban'`. Each player bans from own roster. Emit `game:action { type:'BAN_CHARACTER', targetCharacterId, targetPlayerIndex }`. Lock on submit, transition to countdown after both done.

## Affected Areas

| Area | Change |
|------|--------|
| `shared/types/game.ts` | Add BAN_CHARACTER to GameAction; `ban` to stage; `bannedCharacters` field |
| `shared/types/game-helpers.ts` | Map BAN_CHARACTER → PRE_BATTLE |
| `PreBattleManager.ts` | `awaitBanStage()` before countdown |
| `GameEngine.ts` | Route BAN_CHARACTER in handleAction |
| `ActionValidator.ts` | `validateBanCharacter()`: phase, effect, target, not last |
| `FieldEffectEngine.ts` | `applyBan()`: set isBanned |
| `gameSocketHandlers.ts` | Broadcast bans during PRE_BATTLE |
| `PreBattleReveal.tsx` | BanStage sub-component |
| `gameReducer.ts` | Track bans in UI state |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Simultaneous ban | Low | Server serializes |
| Ban leaves 0 alive | Low | Reject if ≤1 alive |

## Rollback

1. Revert BAN_CHARACTER from GameAction + helpers
2. Remove ban branching in PreBattleManager
3. Remove BanStage JSX — file revert only

## Dependencies

- Phase 1 PreBattleManager countdown (exists)
- FieldEffectEngine `disable_character` flag (exists)

## Success Criteria

- [ ] Kame House shows BanStage; non-Kame skip to countdown
- [ ] Ban on last alive returns error, state unchanged
- [ ] After both bans, countdown starts, banned char unusable
- [ ] Reconnect shows ban stage with pending selections
