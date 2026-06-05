// ─── Tipos de personajes ─────────────────────────────────────────

export type CharacterType = 'TANQUE' | 'DAMAGE' | 'SUPPORT';

export interface CharacterDef {
  id: string;
  name: string;
  type: CharacterType;
  stats: {
    vida: number;        // max HP
    lentitud: number;    // turns to advance before attacking
    ataque: number;      // base damage
  };
  abilities: {
    pasiva?: PassiveDef;
    habilidad?: AbilityDef;
    definitiva?: DefinitivaDef;
  };
  icons: {
    rage?: boolean;
    mejora?: boolean;
    change?: boolean;       // for Rose Black Goku / Zamasu
    equippableKi?: boolean; // for UI Goku (needs ki to equip)
    deathIcon?: boolean;    // for Golden Frieza's Salvation
  };
}

export interface PassiveDef {
  name: string;
  description: string;
  type: 'BATTLEFIELD_NULLIFY' | 'COUNTER_DAMAGE' | 'STAT_BOOST' | 'AUTO_DODGE' | 'KI_PER_TURN' | 'LENTITUD_REDUCTION' | string;
  value?: number;
  condition?: string;
}

export interface AbilityDef {
  name: string;
  description: string;
  cooldown: number;        // turns between uses, 0 = once per game
  effect: string;
  usesPerGame?: number;    // undefined = unlimited (with cooldown)
}

export interface DefinitivaDef {
  name: string;
  description: string;
  damage: number | 'INFINITE';
  kiCost: number;
  targets: 'SINGLE' | 'ALL' | 'TWO';
}

// ─── Tipos de cartas ────────────────────────────────────────────

export type CardCategory = 'ACCION' | 'ITEM' | 'BATTLEFIELD';

export interface CardDef {
  id: string;
  name: string;
  category: CardCategory;
  effect: string;
  description: string;
  usageLimit?: number;      // per game (ULTIMATE=2, NubeKinton=1 per character, etc.)
  isEquipable?: boolean;    // max 1 equipable per turn
  isDefense?: boolean;       // esquive/escudo - used in defender window
  kiCost?: number;           // if card costs ki to play
}

// ─── Battlefields ───────────────────────────────────────────────

export interface BattlefieldDef {
  id: string;
  name: string;
  effect: string;
  description: string;
  icon?: string;
}

// ─── Game phases ────────────────────────────────────────────────

export type GamePhase =
  | 'DRAFT'
  | 'BATTLEFIELD'
  | 'PRE_BATTLE'
  | 'WAITING_FOR_ACTION'
  | 'ADVANCE'
  | 'ATTACK'
  | 'DEFENDER_RESPONSE'  // defender's window to respond
  | 'END_TURN'
  | 'GAME_OVER';

// ─── Runtime character state (on the field) ─────────────────────

export interface CharacterState {
  characterId: string;
  currentVida: number;
  maxVida: number;
  advanceCounter: number;
  isAlive: boolean;
  hasAttackedThisTurn: boolean;
  shieldEquipped: boolean;
  nubeKintonUsed: boolean;     // track per-character usage
  currentAtaque: number;       // base + modifiers (rage, etc.)
  currentLentitud: number;     // base + modifiers
  abilityCooldownRemaining: number;
  abilityUsedThisGame: boolean;
  hasSwitchedThisTurn?: boolean; // for change characters
  currentForm?: string;         // for multi-form characters
  // For A17&A18
  androide17Vida?: number;
  androide18Vida?: number;
}

// ─── Player game state ──────────────────────────────────────────

export interface PlayerGameState {
  playerId: string;
  characters: CharacterState[];
  hand: string[];             // card IDs in hand
  deck: string[];             // remaining deck
  discardPile: string[];
  ki: number;
  ultimateUsesRemaining: number;
  canRedrawThisTurn: boolean;  // once per end phase
  hasAdvancedThisTurn: boolean;
  hasPlayedEquipableThisTurn: boolean;
  hasAttackedThisTurn: boolean;
  turnActionsRemaining: number;
}

// ─── Pre-battle state ───────────────────────────────────────────

export interface PreBattleState {
  stage: 'reveal' | 'countdown' | 'fight';
}

// ─── Full game state ────────────────────────────────────────────

export interface GameState {
  id: string;
  roomCode: string;
  phase: GamePhase;
  players: [PlayerGameState, PlayerGameState];
  battlefield: BattlefieldDef | null;
  turnNumber: number;
  currentPlayerIndex: number;
  winner: string | null;
  draftState: DraftState | null;
  pendingAttack: PendingAttack | null;  // for defender response window
  rageActive: boolean;
  turnLog: TurnLogEntry[];
  secondsRemaining: number | null;
  preBattle: PreBattleState | null;
}

export interface DraftState {
  phase: 'PICKING' | 'PLACING' | 'DONE';
  currentPicker: number;     // player index
  pickSequence: number;       // 0-3
  availableCharacters: string[];  // character IDs available to pick
  picks: [string[], string[]];    // picked character IDs per player
}

export interface PendingAttack {
  attackerId: string;
  attackerPlayerIndex: number;
  targetId: string;
  targetPlayerIndex: number;
  attackType: 'NORMAL' | 'DEFINITIVA';
  damage: number;
  isUltimate: boolean;     // from ULTIMATE card
}

export interface TurnLogEntry {
  turnNumber: number;
  playerIndex: number;
  action: string;
  details: string;
}

// ─── Game actions (discriminated union) ─────────────────────────

export type GameAction =
  | { type: 'DRAFT_SELECT'; characterId: string }
  | { type: 'PLACE_CHARACTERS'; order: string[] }
  | { type: 'PLAY_CARD'; cardId: string; targetCharacterId?: string }
  | { type: 'ADVANCE'; characterId: string }
  | { type: 'ATTACK'; attackerId: string; targetId: string; attackType: 'NORMAL' | 'DEFINITIVA' }
  | { type: 'USE_HABILIDAD'; characterId: string; targetCharacterId?: string }
  | { type: 'DEFENDER_RESPONSE'; action: 'ESQUIVE' | 'ESCUDO' | 'NONE'; cardId?: string; characterId: string }
  | { type: 'PASS' }
  | { type: 'SWITCH_FORM'; characterId: string; targetForm: string }
  | { type: 'DRAGON_REVIVE'; targetCharacterId: string }
  | { type: 'END_TURN' }
  | { type: 'REDRAW' };

// ─── Game error ─────────────────────────────────────────────────

export interface GameError {
  code: string;
  message: string;
  details?: string;
}
