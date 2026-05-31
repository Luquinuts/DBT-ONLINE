# Design: Core Game Engine

## Technical Approach

Three-layer architecture: **shared types** → **pure-logic engine** → **socket bridge**. Engine is stateless where possible (functions receive `GameState`, return mutated copy or error). Server-authoritative — client never trusts its own state.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| State mutation | Immutable vs mutable | **Mutable in-place** | Single-threaded Node.js, no rollback needed. Simpler than immutable for game loops. |
| Card effects | Direct calls vs registry | **Registry pattern** | `CardEffectEngine` maps effect ID to handler. Avoids circular deps across effect files. |
| Passive hooks | Pull (check each turn) vs push (event bus) | **Event bus** | `EventBus.ts` emits hooks (`pre_damage`, `post_damage`, `on_kill`, `on_turn_start`). Passives subscribe once at game init. |
| Draft authority | Client-honest vs server-auth | **Server-authoritative** | Reject out-of-turn picks at socket level. No trust path. |
| Per-character counters | On CharacterState vs separate map | **On CharacterState** | `advanceCount`, `nubeKintonUsed`, `hasAttackedThisTurn` live on each character's runtime state. |

## Data Flow

### Draft sequence

```
Host clicks start
  → room:start_game → GameEngine.create()
  → assign firstPicker randomly
  → deal 52-card deck to each player
  → emit game:draft_state to both (available pool, whose pick)
  → Players alternate: game:action({type:'draft_pick', characterId})
  → After 8 picks (4 each): phase → BATTLEFIELD
  → emit game:draft_state (both teams revealed) → game:state_update
```

### Turn sequence

```
WAITING_FOR_ACTION
  │ player plays cards (game:action → play_card/use_ability)
  │ player can pass (game:action → pass)
  ▼
ADVANCE
  │ player advances characters (game:action → advance)
  │ each advance: character.advanceCount++
  │ player done → phase = ATTACK
  ▼
ATTACK
  │ for each eligible character (advanceCount >= lentitud):
  │   player selects target → attack → defender responds → resolve
  │ after all eligible characters used → phase = END_TURN
  ▼
END_TURN
  → reset per-turn flags → draw cards → switch currentPlayer
  → if win condition → GAME_OVER
  → else → WAITING_FOR_ACTION (next)
```

### Combat resolution

```
Attacker → game:action({type:'attack', attackerId, targetId, attackType})
  → ActionValidator: is it attacker's turn? character eligible? target alive?
  → Defender response window (esquive/escudo/habilidad via game:action)
  → EventBus.emit('pre_damage', {attacker, target, attackType, damage})
  → CombatResolver: base damage = ataque, apply esquive (normal only), escudo (blocks)
  → EventBus.emit('post_damage', ...)
  → If target vida ≤ 0 → mark dead, check win condition
  → emit game:state_update
```

### Card play flow

```
game:action({type:'play_card', cardId, target?})
  → ActionValidator: correct phase? card in hand? enough ki? target valid?
  → CardEffectEngine.resolve(card.effect, state, target)
  → EventBus.emit('post_effect', {card, target})
  → deduct cost (ki), discard card
  → emit game:state_update
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `shared/types/card.ts` | Rewrite | Replace poker placeholder with DBZ card types (ACCION/ITEM) |
| `shared/types/game.ts` | Rewrite | GameState, GameAction (discriminated union), GamePhase, CharacterDef |
| `shared/types/socket.ts` | Modify | Retype game events: `game:action`, `game:state_update`, `game:error` |
| `shared/types/index.ts` | Modify | Add new exports |
| `backend/src/game/` | Create | Full engine directory (see module tree below) |
| `backend/src/index.ts` | Modify | Add `game:action` handler + `room:start_game` → engine bridge |

## Shared Types (key contracts)

```typescript
// Character definition — declarative, shipped to both client and engine
interface CharacterDef {
  id: string;
  name: string;
  type: 'TANQUE' | 'DAMAGE' | 'SUPPORT';
  baseStats: { vida: number; lentitud: number; ataque: number };
  abilities: {
    pasiva: AbilityDef;
    habilidad: AbilityDef; // has cost (ki)
    definitiva: AbilityDef; // has cost (ki), may have targetCount
  };
  icons: { rage: boolean; mejora: boolean; change: boolean; equippable: boolean };
}

// Card in hand/deck — lightweight reference
interface CardDef {
  id: string;
  name: string;
  type: 'ACCION' | 'ITEM';
  effect: string; // maps to effect handler ID
  cost: number;   // ki
  usageLimit?: { perGame?: number; perTurn?: number };
}

// Game phase — state machine
type GamePhase = 'DRAFT' | 'BATTLEFIELD' | 'WAITING_FOR_ACTION'
  | 'ADVANCE' | 'ATTACK' | 'END_TURN' | 'GAME_OVER';

// Server-emitted state (no opponent hand)
interface PlayerGameState {
  playerId: string;
  hand: CardDef[];        // own cards only
  field: CharacterState[]; // characters in play
  ki: number;
  deckCount: number;
  discardCount: number;
  advanceCounters: Record<string, number>; // characterId → advances
}

// Full game state — emitted to all after mutations
interface GameState {
  id: string;
  phase: GamePhase;
  players: [PlayerGameState, PlayerGameState];
  battlefield: string[]; // card IDs
  turnNumber: number;
  currentPlayerId: string;
  winnerId?: string;
  draftQueue?: string[]; // ordered pick history
  firstPicker?: string;
}

// Discriminated union — every client action
type GameAction =
  | { type: 'draft_pick'; characterId: string }
  | { type: 'play_card'; cardId: string; targetId?: string }
  | { type: 'advance'; characterId: string }
  | { type: 'attack'; attackerId: string; targetId: string; attackType: 'NORMAL' | 'DEFINITIVA' }
  | { type: 'use_ability'; characterId: string; abilitySlot: 'habilidad' | 'definitiva'; targetId?: string }
  | { type: 'defend'; ability: 'esquive' | 'escudo' | 'none' }
  | { type: 'pass' };
```

## Socket Event Schema

| Event | Direction | Payload | Trigger |
|-------|-----------|---------|---------|
| `room:start_game` | C→S | `void` | Host clicks start |
| `game:draft_state` | S→C | `{phase, availableChars, picks, currentPicker}` | After start_game |
| `game:action` | C→S | `GameAction` | Any player action |
| `game:state_update` | S→C | `GameState` | After every valid mutation |
| `game:error` | S→C | `{code: string; message: string}` | Invalid action |
| `game:over` | S→C | `GameState & {winnerId: string}` | Win condition met |

## Socket bridge pattern (backend/src/index.ts)

```typescript
// New handler added to io.on('connection'):
socket.on('game:action', (action: GameAction) => {
  const roomId = socket.data.roomId;
  if (!roomId) return socket.emit('game:error', { code: 'not_in_room', message: '...' });

  const game = gameRegistry.get(roomId);
  if (!game) return socket.emit('game:error', { code: 'no_game', message: '...' });

  const result = GameEngine.handleAction(game, action, socket.data.playerId!);
  if (result.error) {
    socket.emit('game:error', { code: result.code, message: result.message });
  } else {
    io.to(roomId).emit('game:state_update', result.state);
    if (result.state.phase === 'GAME_OVER') {
      io.to(roomId).emit('game:over', { winnerId: result.state.winnerId! });
      gameRegistry.delete(roomId);
    }
  }
});
```

## Character Data Model

All 16 characters follow the `CharacterDef` shape. Example for Broly:

```typescript
{
  id: 'ssj-broly',
  name: 'SSJ Broly',
  type: 'TANQUE',
  baseStats: { vida: 10, lentitud: 2, ataque: 3 },
  abilities: {
    pasiva: {
      id: 'rage-stacking',
      name: 'Legendary SSJ',
      description: '+1 ataque for each damage taken this game',
      effect: 'rage_stack',
    },
    habilidad: {
      id: 'gigantic-rage',
      name: 'Gigantic Rage',
      cost: 3,
      description: '+2 ataque this turn',
      effect: 'buff_attack_self',
    },
    definitiva: {
      id: 'omega-blaster',
      name: 'Omega Blaster',
      cost: 7,
      description: '3 damage to 2 enemies',
      effect: 'multi_target_damage',
      targetCount: 2,
    },
  },
  icons: { rage: true, mejora: false, change: false, equippable: false },
}
```

Full stat table for all 16 characters:

| Character | Type | Vida | Lentitud | Ataque | Passive | Definitiva (cost) | Icons |
|-----------|------|------|----------|--------|---------|-------------------|-------|
| SSJ Broly | TANQUE | 10 | 2 | 3 | Rage stack (+1 atk per hit taken) | Omega Blaster (7): 2 targets × 3 dmg | rage |
| Jiren | DAMAGE | 8 | 1 | 4 | Unkillable (immune to 1-hit KO) | Full Power (8): 5 dmg single | — |
| SSJ Blue Vegeta | DAMAGE | 7 | 1 | 3 | SSJ Pride: +1 atk when <50% HP | Final Flash (8): 4 dmg, ignores shield | mejora |
| Beerus | SUPPORT | 8 | 2 | 2 | God of Destruction: -1 lentitud to allies | Hakai (10): instant kill | change |
| Golden Frieza | DAMAGE | 7 | 1 | 3 | Resurrection: +2 atk first attack | Death Ball (9): 4 dmg all enemies | rage |
| A17&A18 | SUPPORT | 8 | 2 | 2 | Twin Link: surviving twin +2 atk | Double Crusher (7): 3 dmg × 2 | equippable |
| SSJ Rose Black | DAMAGE | 8 | 1 | 3 | Zero Mortals: heal 1 on kill | Holy Wrath (9): 5 dmg + heal 2 | change |
| SSJ2 Gohan | DAMAGE | 8 | 1 | 3 | Hidden Potential: +1 atk after turn 3 | Father-Son Kamehameha (9): 6 dmg single | mejora |
| SSJ3 Gotenks | DAMAGE | 7 | 1 | 2 | Cocky: counter-damage 1 on hit | Ghost Kamikaze (8): 4 dmg × 2 | — |
| Hit | DAMAGE | 7 | 0 | 3 | Time Skip: first attack unblockable | Time Lag (8): 3 dmg + skip target turn | — |
| Kid Buu | DAMAGE | 6 | 0 | 2 | Madness: attacks hit twice | Planet Burst (8): 3 dmg all enemies | rage |
| SSJ Goku | DAMAGE | 8 | 1 | 3 | Saiyan Growth: +1 atk per turn | Spirit Bomb (9): 4 dmg all enemies | mejora |
| SSJ God Goku | SUPPORT | 8 | 2 | 3 | God Ki: +1 max ki per turn | Divine Kamehameha (9): 4 dmg + heal 2 | change |
| Perfect Cell | SUPPORT | 9 | 2 | 2 | Regeneration: heal 1 per turn | Solar Kamehameha (10): 5 dmg single | — |
| Future Trunks | TANQUE | 9 | 2 | 3 | Hope: revive once with 2 HP | Burning Attack (7): 4 dmg single | equippable |
| Piccolo | SUPPORT | 9 | 2 | 2 | Namekian: heal 2/turn if <50% HP | Hellzone Grenade (7): 3 dmg × 2 | — |

## Turn State Machine

```
                    ┌─────────────────────────────────────┐
                    │              DRAFT                   │
                    │  (alternating picks, 4 per player)   │
                    └──────────┬──────────────────────────┘
                               │ both drafted
                               ▼
                    ┌──────────────────────┐
                    │    BATTLEFIELD        │
                    │ (teams revealed)      │
                    └──────────┬────────────┘
                               │ turn starts
                               ▼
   ┌─────────────── WAITING_FOR_ACTION ───────────────┐
   │  Actions: play_card, use_ability, pass            │
   │  Stay in phase after each card. Pass → ADVANCE   │
   └──────────────────────┬───────────────────────────┘
                          │ pass
                          ▼
   ┌───────────────────── ADVANCE ────────────────────┐
   │  Action: advance(characterId)                     │
   │  Each call: char.advanceCount++                    │
   │  No more advances → ATTACK                        │
   └──────────────────────┬───────────────────────────┘
                          │ done advancing
                          ▼
   ┌───────────────────── ATTACK ─────────────────────┐
   │  Action: attack(attacker, target, type)            │
   │  Eligible: advanceCount >= lentitud, not used yet  │
   │  After each attack, defender responds, resolve     │
   │  All eligible used → END_TURN                      │
   └──────────────────────┬───────────────────────────┘
                          │ all attacked
                          ▼
   ┌──────────────────── END_TURN ────────────────────┐
   │  Reset per-turn flags, draw cards, switch player   │
   │  Check win → GAME_OVER or back to WAITING_FOR_ACTION│
   └──────────────────────┬───────────────────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
        WAITING_FOR_ACTION        GAME_OVER
        (next player)             (winner set)
```

**Phase validation matrix** — what's checked per action:

| Action | Valid Phases | Preconditions |
|--------|-------------|---------------|
| `draft_pick` | DRAFT | Correct picker, character available |
| `play_card` | WAITING_FOR_ACTION | Card in hand, enough ki, correct phase |
| `advance` | ADVANCE | Current turn, character alive |
| `attack` | ATTACK | Character eligible (advanceCount ≥ lentitud), hasn't attacked, target alive |
| `use_ability` | WAITING_FOR_ACTION, ATTACK (defensa) | Enough ki, character alive, not on cooldown |
| `pass` | WAITING_FOR_ACTION, ADVANCE | Current turn |

## Card Effects (52-card deck)

| Card | Type | Cost | Effect |
|------|------|------|--------|
| Rage | ACCION | 2 | +1 permanent atk to all allies with rage icon |
| Nube Kinton | ITEM | 1 | Skip lentitud for one character (1/game per character) |
| ULTIMATE | ACCION | 4 | All characters skip lentitud this turn (2/game) |
| Báculo Sagrado | ITEM | 1 | 1 damage, breaks shield, does NOT end turn |
| Esquive | ITEM | 0 | Block normal attack against one character (must be in hand) |
| Escudo | ITEM | 1 | Block any attack against one character |
| Máquina del Tiempo | ITEM | 2 | Revive a dead character with 2 vida (1/game) |
| Semilla Senzu | ITEM | 1 | Heal 3 vida to one character |
| Carga de Ki | ACCION | 0 | Gain 2 ki |
| Super Carga de Ki | ACCION | 0 | Gain 5 ki (1/game) |
| Esfera de Dragón | ITEM | 3 | Revive a dead character with full vida (1/game) |
| Nave Espacial | ITEM | 2 | Switch a character with a bench character |
| Plus Vida | ITEM | 2 | +2 max vida to one character |

## Engine Module Dependencies

```
GameEngine (orchestrator)
  ├── TurnManager         ← GameEngine calls for lifecycle
  ├── CombatResolver      ← TurnManager calls on attack
  ├── CardEffectEngine    ← GameEngine calls on play_card
  │    └── effects/cards/*  ← registered by ID
  ├── DraftManager        ← GameEngine calls in DRAFT phase
  ├── KiManager           ← called after card resolution
  ├── WinConditionChecker ← called after every state mutation
  ├── EventBus            ← passive hooks hook into lifecycle
  └── ActionValidator     ← validates before any action
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Each effect, combat formula, state transition | Pure-function tests — supply GameState, assert output |
| Integration | Full turn lifecycle, draft flow | Chain actions through GameEngine, assert state after sequence |
| Scenario | Spec scenarios (GE-1 through GE-8) | Write one test per scenario from spec |

## Migration / Rollout

No migration required — game state is in-memory only. The engine is entirely new code with zero existing game data to migrate.

## Open Questions

- [ ] Exact ki economy balancing — base starting ki, ki per turn, card distribution in 52-card deck
- [ ] Defender response window — timeout or instant? Specifying a 5-second window per reaction
- [ ] Multiple attacks per character — can a character with 0 lentitud attack multiple times? Kid Buu passive suggests it's per-attack, not per-character action
