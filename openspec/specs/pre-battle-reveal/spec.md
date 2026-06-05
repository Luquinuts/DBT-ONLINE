# pre-battle-reveal — Specification

## Purpose

Full-screen overlay shown during `PRE_BATTLE` phase that reveals the battlefield card, both player rosters, and a countdown. Provides the fighting-game-style intro between draft and first play action.

## Requirements

### Requirement: PBR-1 — Overlay renders during PRE_BATTLE

The system MUST render the `PreBattleReveal` overlay when `GameState.phase === 'PRE_BATTLE'`, replacing `GameBoard`.

#### Scenario: Normal reveal

- GIVEN `phase = 'PRE_BATTLE'`
- WHEN the component mounts
- THEN a full-screen overlay is displayed with battlefield card centered, J1 rosters on left, J2 rosters on right

### Requirement: PBR-2 — Display battlefield card

The battlefield card MUST be displayed at center using the `HoloCard` component, showing its name, effect, and description.

#### Scenario: Battlefield renders

- GIVEN the game has selected a `BattlefieldDef` (e.g. Kame House)
- WHEN `PRE_BATTLE` phase starts
- THEN the overlay shows the battlefield card with its name, effect text, and description

### Requirement: PBR-3 — Display character rosters

Each player's drafted characters MUST be shown as small portraits/avatars: J1 (currentPlayerIndex=0) on the left column, J2 (1) on the right.

#### Scenario: Rosters render from draft picks

- GIVEN both players completed draft placement (3 characters each in `players[].field`)
- WHEN `PRE_BATTLE` phase starts
- THEN left column shows J1's 3 characters, right column shows J2's 3 characters

### Requirement: PBR-4 — Countdown overlay

A large countdown number MUST be displayed: 5, 4, 3, 2, 1, then "FIGHT!" text on the final tick. The countdown MUST be driven by `secondsRemaining` from server state.

#### Scenario: Countdown sequence

- GIVEN `secondsRemaining = 5`
- WHEN each `game:state_update` arrives with decremented `secondsRemaining`
- THEN the overlay shows the current number (5, 4, 3, 2, 1, FIGHT!)

#### Scenario: FIGHT! transition

- GIVEN countdown reaches 0
- WHEN server transitions phase to `WAITING_FOR_ACTION`
- THEN `PreBattleReveal` unmounts and `GameBoard` renders

### Requirement: PBR-5 — Reconnection

A reconnecting player MUST see the current pre-battle state: battlefield card, rosters, and remaining countdown seconds.

#### Scenario: Reconnect during countdown

- GIVEN a player disconnects during `PRE_BATTLE` countdown
- WHEN they reconnect and request sync
- THEN `game:state_update` returns current `secondsRemaining` and the overlay displays remaining time
