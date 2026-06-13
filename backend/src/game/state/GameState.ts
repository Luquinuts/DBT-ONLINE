import { v4 as uuid } from 'uuid';
import type {
  GameState,
  GamePhase,
  PlayerGameState,
  BattlefieldDef,
  CharacterState,
  DraftState,
  PendingAttack,
  PreBattleState,
  TurnLogEntry,
} from '@dbt-online/shared';
import { createInitialPlayerState, createEmptyDraftState } from '@dbt-online/shared';
import type { CharacterDef } from '@dbt-online/shared';
import { CHARACTERS, getCharacterById } from '../../data/characters';

// ─── Create CharacterState from CharacterDef ─────────────────────

export function createCharacterState(def: CharacterDef): CharacterState {
  const result: CharacterState = {
    characterId: def.id,
    currentVida: def.stats.vida,
    maxVida: def.stats.vida,
    advanceCounter: 0,
    isAlive: true,
    hasAttackedThisTurn: false,
    shieldEquipped: false,
    nubeKintonUsed: false,
    currentAtaque: def.stats.ataque,
    currentLentitud: def.stats.lentitud,
    abilityCooldownRemaining: 0,
    abilityUsedThisGame: false,
  };

  // Special handling for A17&A18: dual-HP pools
  if (def.id === 'a17-a18') {
    // Each androide gets half the base vida (rounded)
    const halfVida = Math.floor(def.stats.vida / 2);
    result.androide17Vida = halfVida;
    result.androide18Vida = def.stats.vida - halfVida;
  }

  // Initialize benched state for dual-form (switch) characters
  if (def.switchForm) {
    result.currentForm = def.id; // starts in primary form
    result.benchedVida = def.switchForm.stats.vida;
    result.benchedMaxVida = def.switchForm.stats.vida;
    result.benchedAdvanceCounter = 0;
    result.formAbilityUsedThisGame = false;
    result.formPassiveHealTotal = 0;
    result.blackGokuPassiveTriggered = false;
  }

  return result;
}

// ─── Game State Manager ──────────────────────────────────────────

export class GameStateManager {
  private state: GameState;

  constructor(
    roomCode: string,
    player1Id: string,
    player2Id: string,
    availableCharacterIds: string[]
  ) {
    // Create initial draft state
    const draftState: DraftState = {
      ...createEmptyDraftState(),
      availableCharacters: [...availableCharacterIds],
    };
    draftState.currentPicker = 0; // Player 0 picks first (J1)
    draftState.pickSequence = 0;
    draftState.phase = 'PICKING';

    this.state = {
      id: uuid(),
      roomCode,
      phase: 'DRAFT',
      players: [
        createInitialPlayerState(player1Id),
        createInitialPlayerState(player2Id),
      ],
      battlefield: null,
      turnNumber: 1,
      currentPlayerIndex: 0,
      winner: null,
      draftState,
      pendingAttack: null,
      rageActive: false,
      turnLog: [],
      secondsRemaining: null,
      preBattle: null,
      bannedCharacters: [],
      namekReviveUsed: false,
      namekRevivePending: null,
    };
  }

  // ─── Getters ─────────────────────────────────────────────────

  getState(): GameState {
    return this.state;
  }

  getPhase(): GamePhase {
    return this.state.phase;
  }

  getCurrentPlayer(): PlayerGameState {
    return this.state.players[this.state.currentPlayerIndex];
  }

  getOpponent(): PlayerGameState {
    const opponentIndex = this.state.currentPlayerIndex === 0 ? 1 : 0;
    return this.state.players[opponentIndex];
  }

  getPlayer(index: number): PlayerGameState {
    return this.state.players[index];
  }

  getCurrentPlayerIndex(): number {
    return this.state.currentPlayerIndex;
  }

  getCharacter(playerIndex: number, characterId: string): CharacterState | undefined {
    return this.state.players[playerIndex].characters.find(
      (c) => c.characterId === characterId
    );
  }

  getAliveCharacters(playerIndex: number): CharacterState[] {
    return this.state.players[playerIndex].characters.filter((c) => c.isAlive);
  }

  /**
   * Find a character state by player index and character ID.
   */
  findCharacterState(playerIndex: number, characterId: string): CharacterState | undefined {
    return this.state.players[playerIndex]?.characters.find(
      (c) => c.characterId === characterId
    );
  }

  /**
   * Get the CharacterDef for a given character ID.
   */
  getCharacterDef(characterId: string): CharacterDef | undefined {
    return getCharacterById(characterId);
  }

  /**
   * Get all character definitions.
   */
  getAllCharacterDefs(): CharacterDef[] {
    return CHARACTERS;
  }

  // ─── Draft State ─────────────────────────────────────────────

  getDraftState(): DraftState | null {
    return this.state.draftState;
  }

  // ─── Mutators ────────────────────────────────────────────────

  transitionTo(phase: GamePhase): void {
    this.state.phase = phase;
  }

  setCurrentPlayerIndex(index: number): void {
    this.state.currentPlayerIndex = index;
  }

  setBattlefield(battlefield: BattlefieldDef | null): void {
    this.state.battlefield = battlefield;
  }

  setPendingAttack(pending: PendingAttack | null): void {
    this.state.pendingAttack = pending;
  }

  getPendingAttack(): PendingAttack | null {
    return this.state.pendingAttack;
  }

  setWinner(winner: string | null): void {
    this.state.winner = winner;
  }

  setRageActive(active: boolean): void {
    this.state.rageActive = active;
  }

  isRageActive(): boolean {
    return this.state.rageActive;
  }

  setSecondsRemaining(seconds: number | null): void {
    this.state.secondsRemaining = seconds;
  }

  setPreBattle(preBattle: PreBattleState | null): void {
    this.state.preBattle = preBattle;
  }

  // ─── Namek Revive ─────────────────────────────────────────

  isNamekRevivePending(playerIndex: number): boolean {
    return this.state.namekRevivePending === playerIndex;
  }

  setNamekRevivePending(index: number | null): void {
    this.state.namekRevivePending = index;
  }

  setNamekReviveUsed(used: boolean): void {
    this.state.namekReviveUsed = used;
  }

  isNamekReviveUsed(): boolean {
    return this.state.namekReviveUsed;
  }

  /**
   * Advance to the next turn.
   * Resets per-turn flags and switches player.
   */
  nextTurn(): void {
    for (const player of this.state.players) {
      // Reset per-turn flags
      for (const char of player.characters) {
        char.hasAttackedThisTurn = false;
      }
      player.hasAdvancedThisTurn = false;
      player.hasPlayedEquipableThisTurn = false;
      player.hasAttackedThisTurn = false;
      player.canRedrawThisTurn = true;
      player.turnActionsRemaining = 1; // Reset for new turn
    }

    // Switch player
    this.state.currentPlayerIndex =
      this.state.currentPlayerIndex === 0 ? 1 : 0;
    this.state.turnNumber++;
    this.state.phase = 'WAITING_FOR_ACTION';
  }

  /**
   * Add a log entry to the turn log.
   */
  addLog(action: string, details: string): void {
    this.state.turnLog.push({
      turnNumber: this.state.turnNumber,
      playerIndex: this.state.currentPlayerIndex,
      action,
      details,
    });
  }

  /**
   * Build a deep-cloned GameState safe for broadcasting to clients.
   * Removes opponent's deck and full hand details for each player's perspective.
   */
  toJSON(): GameState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Handle death for a switch-form character (e.g. SSJ Rosé Black Goku / Zamasu).
   * If one form dies, both forms die together.
   */
  killCharacter(playerIndex: number, characterId: string): void {
    const char = this.getCharacter(playerIndex, characterId);
    if (!char) return;
    char.isAlive = false;

    const def = getCharacterById(characterId);
    if (def?.switchForm) {
      // Both forms die
      char.currentVida = 0;
      char.benchedVida = 0;
    }
  }

  /**
   * Handle revive for a switch-form character.
   * Both forms revive together at full HP.
   */
  reviveCharacter(playerIndex: number, characterId: string, vidaOverride?: number): void {
    const char = this.getCharacter(playerIndex, characterId);
    if (!char) return;
    char.isAlive = true;

    const def = getCharacterById(characterId);
    if (def?.switchForm) {
      // Revive both forms at full (or override)
      char.currentVida = vidaOverride ?? def.stats.vida;
      char.maxVida = def.stats.vida;
      char.benchedVida = vidaOverride ?? def.switchForm.stats.vida;
      char.benchedMaxVida = def.switchForm.stats.vida;
    } else {
      char.currentVida = vidaOverride ?? def?.stats.vida ?? char.maxVida;
      char.maxVida = def?.stats.vida ?? char.maxVida;
    }
  }

  /**
   * Build a sanitized view for a specific player.
   * Removes the opponent's hand and deck details.
   */
  toSanitizedJSON(playerIndex: number): GameState {
    const clone = this.toJSON();
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    // Hide opponent hand and deck (keep counts only)
    clone.players[opponentIndex].hand = [];
    clone.players[opponentIndex].deck = [];
    return clone;
  }
}
