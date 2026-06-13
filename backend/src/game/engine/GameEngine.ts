import type { GameState, GameAction, GameError, PlayerGameState, CardDef } from '@dbt-online/shared';
import { getCharacterById, createDefaultDeck, shuffleDeck, dealCards } from '../../data';
import { GameStateManager } from '../state/GameState';
import { DraftManager } from '../draft/DraftManager';
import { TurnManager } from '../turn/TurnManager';
import type { TurnActionResult } from '../turn/TurnManager';
import { CombatResolver } from '../combat/CombatResolver';
import type { CombatResult } from '../combat/CombatResolver';
import { KiManager } from '../effects/KiManager';
import { CardEffectEngine } from '../effects/CardEffectEngine';
import type { EffectResult } from '../effects/CardEffectEngine';
import { FieldEffectEngine } from '../effects/FieldEffectEngine';
import { WinConditionChecker } from '../conditions/WinConditionChecker';
import type { WinCheckResult } from '../conditions/WinConditionChecker';
import { EventBus, registerPassives } from '../hooks/EventBus';
import { ActionValidator } from '../validation/ActionValidator';
import type { ValidationResult } from '../validation/ActionValidator';
import { getRandomBattlefield } from '../../data';
import { PreBattleManager } from '../pre-battle/PreBattleManager';

export interface EngineResult {
  success: boolean;
  state?: GameState;           // Updated game state (for broadcasting)
  sanitizedState?: GameState;   // For the acting player (hides opponent hand)
  error?: GameError;
  gameOver?: boolean;
  defenderWindow?: boolean;     // True if defender needs to respond
  pendingAttackId?: string;     // Pending attack identifier
  extraTurn?: boolean;          // Máquina del Tiempo flag
}

const ALL_CHARACTER_IDS = [
  'ssj-god-goku', 'ssj-blue-vegeta', 'golden-frieza', 'ssj-rose-black-goku',
  'ssj-broly', 'perfect-cell', 'kid-buu', 'beerus', 'hit', 'ssj2-gohan',
  'a17-a18', 'ssj3-gotenks', 'piccolo', 'jiren', 'ssj-future-trunks', 'ssj-goku',
];

/**
 * The main game engine orchestrator.
 * Ties together all subsystems: state, draft, turn, combat, cards, ki, win condition, event bus, validation.
 *
 * handleAction() is the primary entry point — validate → route → execute → check win → return.
 */
export class GameEngine {
  private state: GameStateManager;
  private draft: DraftManager;
  private turn: TurnManager;
  private combat: CombatResolver;
  private cards: CardEffectEngine;
  private ki: KiManager;
  private field: FieldEffectEngine;
  private winCheck: WinConditionChecker;
  private events: EventBus;
  private preBattleManager: PreBattleManager | null = null;
  private broadcastFn: ((state: GameState) => void) | null = null;

  constructor(roomCode: string, player1Id: string, player2Id: string) {
    // ── Create the event bus and register passives ──────────
    this.events = new EventBus();
    registerPassives(this.events);

    // ── Initialize subsystems ──────────────────────────────
    this.ki = new KiManager();
    this.winCheck = new WinConditionChecker();
    this.field = new FieldEffectEngine();
    this.cards = new CardEffectEngine(this.ki, this.events, this.winCheck);
    this.combat = new CombatResolver(this.events);
    this.turn = new TurnManager(this.events);
    this.draft = new DraftManager();

    // ── Create game state with all character IDs available ──
    this.state = new GameStateManager(roomCode, player1Id, player2Id, ALL_CHARACTER_IDS);
  }

  /**
   * Set an external broadcast callback for pushing state updates
   * outside the normal handleAction flow (e.g., pre-battle countdown ticks).
   * Called by the socket handler when the game engine is created.
   */
  setBroadcastCallback(fn: (state: GameState) => void): void {
    this.broadcastFn = fn;
  }

  /**
   * Handle any game action from a player.
   * This is the primary entry point.
   *
   * Flow: validate → route → execute → check win → return
   */
  handleAction(playerId: string, action: GameAction): EngineResult {
    // ── Find player index ─────────────────────────────────
    const gs = this.state.getState();
    let playerIndex = gs.players.findIndex((p) => p.playerId === playerId);
    if (playerIndex === -1) {
      return {
        success: false,
        error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found in this game.' },
      };
    }

    // ── Validate action ──────────────────────────────────
    const validation = ActionValidator.validate(this.state, playerIndex, action);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        state: this.state.toSanitizedJSON(playerIndex),
      };
    }

    // ── Route based on action type ───────────────────────
    let result: EngineResult;

    switch (action.type) {
      case 'DRAFT_SELECT':
        result = this.handleDraftSelect(playerIndex, action.characterId);
        break;

      case 'PLACE_CHARACTERS':
        result = this.handlePlaceCharacters(playerIndex, action.order);
        break;

      case 'PLAY_CARD':
        result = this.handlePlayCard(playerIndex, action.cardId, action.targetCharacterId, gs);
        break;

      case 'ADVANCE':
        result = this.handleAdvance(playerIndex, action.characterId);
        break;

      case 'ATTACK':
        result = this.handleAttack(playerIndex, action);
        break;

      case 'USE_HABILIDAD':
        result = this.handleUseHabilidad(playerIndex, action.characterId, action.targetCharacterId);
        break;

      case 'DEFENDER_RESPONSE':
        result = this.handleDefenderResponse(playerIndex, action);
        break;

      case 'PASS':
        result = this.handlePass(playerIndex);
        break;

      case 'END_TURN':
        result = this.handleEndTurn(playerIndex);
        break;

      case 'SWITCH_FORM':
        result = this.handleSwitchForm(playerIndex, action.characterId, action.targetForm);
        break;

      case 'DRAGON_REVIVE':
        result = this.handleDragonRevive(playerIndex, action.targetCharacterId);
        break;

      case 'REDRAW':
        result = this.handleRedraw(playerIndex);
        break;

      case 'BAN_CHARACTER':
        result = this.handleBanCharacter(playerId, action.characterId);
        break;

      default:
        result = {
          success: false,
          error: { code: 'UNKNOWN_ACTION', message: `Unknown action type.` },
        };
    }

    // ── Define current phase for guards below ────────
    const currentPhase = this.state.getPhase();

    // ── Check revive trigger after action ──────────────
    // Before win condition check, detect if the Namek battlefield revive
    // should activate. Only relevant after combat/card effects resolve.
    if (
      result.success &&
      !result.gameOver &&
      currentPhase !== 'DRAFT' &&
      currentPhase !== 'PRE_BATTLE'
    ) {
      this.checkReviveTrigger();
    }

    // ── Check win condition after every action ──────────
    // Skip during setup phases (DRAFT, BATTLEFIELD, PRE_BATTLE) because
    // characters haven't been placed on the field yet or reveal is playing.
    if (
      result.success &&
      !result.gameOver &&
      currentPhase !== 'DRAFT' &&
      currentPhase !== 'PRE_BATTLE'
    ) {
      const winResult = this.winCheck.check(this.state);
      if (winResult.gameOver) {
        this.state.setWinner(winResult.winner);
        this.state.transitionTo('GAME_OVER');
        this.state.addLog('GAME_OVER', winResult.reason);
        result.gameOver = true;
        result.state = this.state.toJSON();
      }
    }

    // ── Build response ──────────────────────────────────
    if (result.success && !result.state) {
      result.state = this.state.toJSON();
    }

    if (result.gameOver) {
      result.state = this.state.toJSON();
    }

    return result;
  }

  // ─── Action Handlers ───────────────────────────────────────

  private handleDraftSelect(playerIndex: number, characterId: string): EngineResult {
    const pickResult = this.draft.handleDraftSelect(this.state, characterId, playerIndex);

    if (!pickResult.success) {
      return {
        success: false,
        error: { code: 'DRAFT_ERROR', message: pickResult.error! },
      };
    }

    return { success: true };
  }

  private handlePlaceCharacters(playerIndex: number, order: string[]): EngineResult {
    const placeResult = this.draft.handlePlaceCharacters(this.state, order, playerIndex);

    if (!placeResult.success) {
      return {
        success: false,
        error: { code: 'PLACE_ERROR', message: placeResult.error! },
      };
    }

    if (placeResult.readyToStart) {
      // Both players placed — pick a battlefield, apply its effects,
      // deal decks, then start the pre-battle reveal + countdown
      const battlefield = getRandomBattlefield();
      this.state.setBattlefield(battlefield);
      this.field.applyModifiers(this.state, battlefield);
      this.state.addLog(
        'BATTLEFIELD',
        `Battlefield '${battlefield.name}' selected: ${battlefield.description}`
      );
      this.dealDecks();

      // ── Start pre-battle countdown ──────────────────────
      // The PRE_BATTLE phase was set by DraftManager.transitionTo('PRE_BATTLE')
      this.preBattleManager = new PreBattleManager();

      const broadcast = this.broadcastFn;
      this.preBattleManager.startCountdown(
        this.state,
        (state) => {
          // Broadcast each tick via the external callback
          if (broadcast) {
            broadcast(state);
          }
        },
        () => {
          // Countdown complete — start the actual turn
          this.preBattleManager = null;
          this.state.setPreBattle(null);
          this.state.setSecondsRemaining(null);
          this.turn.startTurn(this.state);
          // Broadcast the post-pre-battle state (WAITING_FOR_ACTION)
          if (broadcast) {
            broadcast(this.state.toJSON());
          }
        },
      );
    }

    return { success: true };
  }

  private handlePlayCard(
    playerIndex: number,
    cardId: string,
    targetCharacterId: string | undefined,
    gs: GameState
  ): EngineResult {
    const player = this.state.getPlayer(playerIndex);

    // Card must be in hand
    if (!player.hand.includes(cardId)) {
      return {
        success: false,
        error: { code: 'CARD_NOT_IN_HAND', message: `Card '${cardId}' not in hand.` },
      };
    }

    // Find the card definition from the decks (search all cards, or use a cache)
    // For now, search through player's full deck (which we have as an array of IDs)
    // We need the actual CardDef — reconstruct from data
    const allCards = createDefaultDeck();
    const cardDef = allCards.find((c) => c.id === cardId);

    if (!cardDef) {
      return {
        success: false,
        error: { code: 'CARD_NOT_FOUND', message: `Card '${cardId}' not found in game data.` },
      };
    }

    // Check battlefield: no_equipables (Power Tournament)
    if (gs.battlefield?.effect === 'no_equipables' && cardDef.isEquipable) {
      return {
        success: false,
        error: {
          code: 'BATTLEFIELD_BLOCKED',
          message: 'Equipable cards are forbidden by the current battlefield (Power Tournament).',
        },
      };
    }

    // Check equipable limit
    if (cardDef.isEquipable && player.hasPlayedEquipableThisTurn) {
      return {
        success: false,
        error: { code: 'EQUIPABLE_LIMIT', message: 'Maximum 1 equipable card per turn.' },
      };
    }

    // Check ULTIMATE usage limit
    if (cardDef.effect === 'ultimate_attack' && player.ultimateUsesRemaining <= 0) {
      return {
        success: false,
        error: { code: 'ULTIMATE_LIMIT', message: 'ULTIMATE can only be used 2 times per game.' },
      };
    }

    // Check ki cost
    if (cardDef.kiCost && cardDef.kiCost > 0) {
      if (!this.ki.canAfford(this.state, playerIndex, cardDef.kiCost)) {
        return {
          success: false,
          error: { code: 'INSUFFICIENT_KI', message: `Not enough ki. Need ${cardDef.kiCost}, have ${player.ki}.` },
        };
      }
      this.ki.spendKi(this.state, playerIndex, cardDef.kiCost);
    }

    // Check Nube Kinton per-character limit
    if (cardDef.effect === 'attack_no_lentitud' && targetCharacterId) {
      const char = this.state.getCharacter(playerIndex, targetCharacterId);
      if (char && char.nubeKintonUsed) {
        return {
          success: false,
          error: { code: 'NUBE_KINTON_USED', message: `Nube Kinton already used on ${targetCharacterId} this game.` },
        };
      }
    }

    // Resolve card effect
    const effectResult = this.cards.resolve(
      this.state,
      playerIndex,
      cardDef.effect,
      targetCharacterId
    );

    if (!effectResult.success) {
      return {
        success: false,
        error: { code: 'EFFECT_FAILED', message: effectResult.error || 'Card effect failed.' },
      };
    }

    // Remove card from hand, add to discard
    const cardIdx = player.hand.indexOf(cardId);
    if (cardIdx !== -1) {
      player.hand.splice(cardIdx, 1);
      player.discardPile.push(cardId);
    }

    // Track equipable use
    if (cardDef.isEquipable) {
      player.hasPlayedEquipableThisTurn = true;
    }

    // Apply special effect flags
    if (effectResult.isExtraTurn) {
      this.state.addLog('EXTRA_TURN', 'Máquina del Tiempo used — player gets extra turn.');
    }

    this.state.addLog('PLAY_CARD', `Player ${playerIndex} played ${cardDef.name} (${cardDef.effect})`);

    return { success: true, extraTurn: effectResult.isExtraTurn ?? false };
  }

  private handleAdvance(playerIndex: number, characterId: string): EngineResult {
    const advResult = this.turn.handleAdvance(this.state, characterId);

    if (!advResult.success) {
      return {
        success: false,
        error: { code: 'ADVANCE_ERROR', message: advResult.error! },
      };
    }

    // After advancing, check if any characters are now eligible to attack
    const eligible = this.turn.getEligibleAttackers(this.state);
    if (eligible.length === 0) {
      this.state.addLog('NO_ELIGIBLE', 'No eligible attackers. Auto-advancing to END_TURN.');
      this.turn.endTurn(this.state);
    }

    return { success: true };
  }

  private handleAttack(
    playerIndex: number,
    action: GameAction & { type: 'ATTACK' }
  ): EngineResult {
    const opponentIndex = playerIndex === 0 ? 1 : 0;

    // Calculate pending attack info
    const attacker = this.state.getCharacter(playerIndex, action.attackerId);
    const target = this.state.getCharacter(opponentIndex, action.targetId);

    if (!attacker || !target) {
      return {
        success: false,
        error: { code: 'INVALID_ATTACK', message: 'Attacker or target not found.' },
      };
    }

    // Mark attacker and player as having attacked this turn (one attack per turn)
    attacker.hasAttackedThisTurn = true;
    this.state.getCurrentPlayer().hasAttackedThisTurn = true;

    // Check if definitiva has sufficient ki — the attacker has the ability
    if (action.attackType === 'DEFINITIVA') {
      const charDef = this.state.getCharacterDef(action.attackerId);
      if (charDef?.abilities?.definitiva) {
        const kiCost = charDef.abilities.definitiva.kiCost;
        if (!this.ki.canAfford(this.state, playerIndex, kiCost)) {
          return {
            success: false,
            error: { code: 'INSUFFICIENT_KI', message: `Not enough ki for definitiva. Need ${kiCost}.` },
          };
        }
        this.ki.spendKi(this.state, playerIndex, kiCost);
      }
    }

    // Check ULTIMATE card usage for NORMAL attacks that might be ultimate
    // (ULTIMATE card flag handled in GameEngine via handlePlayCard)

    // Check if target has shield
    const hasShield = target.shieldEquipped;

    // Set up pending attack for defender response window
    const baseDamage = action.attackType === 'DEFINITIVA'
      ? (this.state.getCharacterDef(action.attackerId)?.abilities?.definitiva?.damage as number) ?? attacker.currentAtaque
      : attacker.currentAtaque;

    const pendingAttack = {
      attackerId: action.attackerId,
      attackerPlayerIndex: playerIndex,
      targetId: action.targetId,
      targetPlayerIndex: opponentIndex,
      attackType: action.attackType as 'NORMAL' | 'DEFINITIVA',
      damage: baseDamage,
      isUltimate: false, // set to true if ULTIMATE was played
    };

    // Set pending attack and transition to defender response
    this.state.setPendingAttack(pendingAttack);
    this.state.transitionTo('DEFENDER_RESPONSE');

    this.state.addLog(
      'ATTACK_INITIATED',
      `Player ${playerIndex}'s ${action.attackerId} attacks ${action.targetId} (${action.attackType})`
    );

    return {
      success: true,
      defenderWindow: true,
    };
  }

  private handleDefenderResponse(
    playerIndex: number,
    action: GameAction & { type: 'DEFENDER_RESPONSE' }
  ): EngineResult {
    const pending = this.state.getPendingAttack();
    if (!pending) {
      return {
        success: false,
        error: { code: 'NO_PENDING_ATTACK', message: 'No pending attack to respond to.' },
      };
    }

    const defenderChoice = action.action;
    const esquive = defenderChoice === 'ESQUIVE';
    const shield = defenderChoice === 'ESCUDO';

    // If using esquive or escudo card, remove from hand and add to discard
    if (action.cardId) {
      const player = this.state.getPlayer(playerIndex);
      const cardIdx = player.hand.indexOf(action.cardId);
      if (cardIdx !== -1) {
        player.hand.splice(cardIdx, 1);
        player.discardPile.push(action.cardId);
      }
    }

    // If shield is used, equip it to the target
    if (shield) {
      const target = this.state.getCharacter(pending.targetPlayerIndex, pending.targetId);
      if (target) {
        target.shieldEquipped = true;
      }
    }

    // Resolve the combat
    const combatResult = this.combat.resolveAttack(
      this.state,
      pending.attackerPlayerIndex,
      pending.attackerId,
      pending.targetPlayerIndex,
      pending.targetId,
      pending.attackType,
      pending.isUltimate,
      shield,
      esquive
    );

    if (!combatResult.success) {
      return {
        success: false,
        error: { code: 'COMBAT_FAILED', message: combatResult.error || 'Combat resolution failed.' },
      };
    }

    // Handle Kid Buu double-hit
    if (combatResult.success && !combatResult.targetKilled) {
      this.combat.applyKidBuuDoubleHit(
        this.state,
        pending.attackerPlayerIndex,
        pending.attackerId,
        pending.targetPlayerIndex,
        pending.targetId,
        pending.attackType,
        pending.isUltimate
      );
    }

    // Clear pending attack
    this.state.setPendingAttack(null);

    // Return to ATTACK phase (or WAITING_FOR_ACTION if the player is done)
    const eligible = this.turn.getEligibleAttackers(this.state);
    if (eligible.length === 0) {
      // No more eligible attackers — end the turn
      this.state.addLog('ATTACK_DONE', 'All eligible attackers have acted.');
      this.turn.endTurn(this.state);
    } else {
      this.state.transitionTo('ATTACK');
    }

    return { success: true };
  }

  private handlePass(playerIndex: number): EngineResult {
    const passResult = this.turn.handlePass(this.state);

    if (!passResult.success) {
      return {
        success: false,
        error: { code: 'PASS_ERROR', message: passResult.error! },
      };
    }

    // After passing in WAITING_FOR_ACTION → ADVANCE, check if there are no advanced characters yet
    if (passResult.newPhase === 'ADVANCE') {
      // Player enters advance phase — they must advance
      this.state.addLog('ENTER_ADVANCE', 'Player must advance a character.');
    }

    // After passing in ADVANCE → ATTACK, check eligible attackers
    if (passResult.newPhase === 'ATTACK') {
      const eligible = this.turn.getEligibleAttackers(this.state);
      if (eligible.length === 0) {
        // No eligible attackers — auto end turn
        this.state.addLog('NO_ELIGIBLE', 'No eligible attackers. Automatically ending turn.');
        this.turn.endTurn(this.state);
      }
    }

    return { success: true };
  }

  private handleEndTurn(playerIndex: number): EngineResult {
    if (this.state.getPhase() !== 'END_TURN') {
      this.state.transitionTo('END_TURN');
    }
    this.turn.endTurn(this.state);
    return { success: true };
  }

  private handleUseHabilidad(
    playerIndex: number,
    characterId: string,
    targetCharacterId?: string
  ): EngineResult {
    const char = this.state.getCharacter(playerIndex, characterId);
    if (!char) {
      return {
        success: false,
        error: { code: 'CHARACTER_NOT_FOUND', message: `Character '${characterId}' not found.` },
      };
    }

    const charDef = this.state.getCharacterDef(characterId);
    if (!charDef) {
      return {
        success: false,
        error: { code: 'CHARACTER_NOT_FOUND', message: `Character '${characterId}' not found.` },
      };
    }

    // Determine which form's habilidad to use (primary or switch)
    const useSwitchAbility =
      charDef.switchForm &&
      char.currentForm === charDef.switchForm.id &&
      charDef.switchForm.abilities?.habilidad;

    const abilityDef = useSwitchAbility
      ? charDef.switchForm!.abilities!.habilidad!
      : charDef.abilities?.habilidad;

    if (!abilityDef) {
      return {
        success: false,
        error: { code: 'NO_HABILIDAD', message: `'${characterId}' has no habilidad in current form.` },
      };
    }

    // Track usage: switch forms use formAbilityUsedThisGame
    if (useSwitchAbility) {
      if (char.formAbilityUsedThisGame) {
        return {
          success: false,
          error: { code: 'ABILITY_ALREADY_USED', message: 'Zamasu already used Divine Intervention this game.' },
        };
      }
    }

    const result = this.turn.handleUseHabilidad(this.state, characterId);
    if (!result.success) {
      return {
        success: false,
        error: { code: 'HABILIDAD_ERROR', message: result.error! },
      };
    }

    // Route the ability's effect through CardEffectEngine
    const habEffect = abilityDef.effect;
    const effectResult = this.cards.resolve(
      this.state,
      playerIndex,
      habEffect,
      targetCharacterId
    );

    if (!effectResult.success) {
      return {
        success: false,
        error: { code: 'ABILITY_EFFECT_FAILED', message: effectResult.error || 'Ability effect failed.' },
      };
    }

    // Mark usage
    if (useSwitchAbility) {
      char.formAbilityUsedThisGame = true;
    }

    return { success: true };
  }

  private handleSwitchForm(playerIndex: number, characterId: string, targetForm: string): EngineResult {
    const char = this.state.getCharacter(playerIndex, characterId);
    if (!char) {
      return {
        success: false,
        error: { code: 'CHARACTER_NOT_FOUND', message: `Character '${characterId}' not found.` },
      };
    }

    const def = this.state.getCharacterDef(characterId);
    if (!def || !def.switchForm) {
      return {
        success: false,
        error: { code: 'CANNOT_SWITCH', message: 'This character cannot switch forms.' },
      };
    }

    // Validate targetForm is valid
    const isPrimary = char.currentForm === def.id;
    if (targetForm !== def.id && targetForm !== def.switchForm.id) {
      return {
        success: false,
        error: { code: 'INVALID_FORM', message: `Unknown form '${targetForm}'.` },
      };
    }

    // Can't switch to the form already active
    if (char.currentForm === targetForm) {
      return {
        success: false,
        error: { code: 'ALREADY_IN_FORM', message: `Already in ${targetForm} form.` },
      };
    }

    // ─── Swap active ↔ benched ──────────────────────────────────
    // Save current active state → benched
    const prevVida = char.currentVida;
    const prevMaxVida = char.maxVida;
    const prevLentitud = char.currentLentitud;
    const prevAdvance = char.advanceCounter;

    // Load benched state → active
    char.currentVida = char.benchedVida ?? def.switchForm.stats.vida;
    char.maxVida = char.benchedMaxVida ?? def.switchForm.stats.vida;

    // Set lentitud based on target form
    const isGoingToSwitch = targetForm === def.switchForm.id;
    char.currentLentitud = isGoingToSwitch ? def.switchForm.stats.lentitud : def.stats.lentitud;

    // Set ataque: base form stat + permanent Zero Mortals bonus if triggered
    const baseAtk = isGoingToSwitch ? def.switchForm.stats.ataque : def.stats.ataque;
    const zeroMortalsBonus = char.blackGokuPassiveTriggered ? 1 : 0;
    char.currentAtaque = baseAtk + zeroMortalsBonus;

    char.advanceCounter = char.benchedAdvanceCounter ?? 0;

    // Save to benched
    char.benchedVida = prevVida;
    char.benchedMaxVida = prevMaxVida;
    char.benchedAdvanceCounter = prevAdvance;

    char.currentForm = targetForm;
    char.hasSwitchedThisTurn = true;

    this.state.addLog('SWITCH_FORM', `${characterId} switched to ${targetForm}`);
    return { success: true };
  }

  private handleDragonRevive(playerIndex: number, targetCharacterId: string): EngineResult {
    // ── Namek battlefield revive (no card needed) ────────────
    if (this.state.isNamekRevivePending(playerIndex)) {
      const effectResult = this.cards.resolve(
        this.state,
        playerIndex,
        'revive:full',
        targetCharacterId
      );

      if (!effectResult.success) {
        return {
          success: false,
          error: { code: 'REVIVE_FAILED', message: effectResult.error || 'Namek revive failed.' },
        };
      }

      // Mark revive as used and clear pending state
      this.state.setNamekReviveUsed(true);
      this.state.setNamekRevivePending(null);
      this.state.addLog(
        'NAMEEK_REVIVE',
        `Player ${playerIndex} revived ${targetCharacterId} via Namek battlefield effect.`
      );

      // After revive, run win condition check
      const winResult = this.winCheck.check(this.state);
      if (winResult.gameOver) {
        this.state.setWinner(winResult.winner);
        this.state.transitionTo('GAME_OVER');
        this.state.addLog('GAME_OVER', winResult.reason);
        return {
          success: true,
          gameOver: true,
          state: this.state.toJSON(),
        };
      }

      return { success: true };
    }

    // ── Standard Dragon Revive (card required) ─────────────
    const player = this.state.getPlayer(playerIndex);
    const dragonBallCard = player.hand.find((cardId) =>
      cardId.startsWith('esfera_dragon_')
    );

    if (!dragonBallCard) {
      return {
        success: false,
        error: { code: 'NO_DRAGON_BALL', message: 'Esfera del Dragón not in hand.' },
      };
    }

    return this.handlePlayCard(playerIndex, dragonBallCard, targetCharacterId, this.state.getState());
  }

  private handleRedraw(playerIndex: number): EngineResult {
    const result = this.turn.handleRedraw(this.state);

    if (!result.success) {
      return {
        success: false,
        error: { code: 'REDRAW_ERROR', message: result.error! },
      };
    }

    return { success: true };
  }

  private handleBanCharacter(playerId: string, characterId: string): EngineResult {
    if (!this.preBattleManager || !this.preBattleManager.isBanStageActive()) {
      return {
        success: false,
        error: { code: 'BAN_NOT_ACTIVE', message: 'Ban stage is not active.' },
      };
    }

    const result = this.preBattleManager.handleBanAction(playerId, characterId);

    if (!result.success) {
      return {
        success: false,
        error: { code: 'BAN_ERROR', message: result.error || 'Failed to ban character.' },
      };
    }

    return { success: true };
  }

  // ─── Decks ───────────────────────────────────────────────────

  private dealDecks(): void {
    const deck = shuffleDeck(createDefaultDeck());
    const { hand: p1Hand, remainingDeck: afterP1 } = dealCards(deck, 5);
    const { hand: p2Hand, remainingDeck: afterP2 } = dealCards(afterP1, 5);

    const gs = this.state.getState();
    gs.players[0].hand = p1Hand.map((c) => c.id);
    gs.players[0].deck = afterP2.map((c) => c.id);

    // Player 2 gets their own deck (same composition, shuffled independently)
    const deck2 = shuffleDeck(createDefaultDeck());
    const { hand: p2Hand2, remainingDeck: p2Remaining } = dealCards(deck2, 5);
    gs.players[1].hand = p2Hand2.map((c) => c.id);
    gs.players[1].deck = p2Remaining.map((c) => c.id);
  }

  // ─── State Access ─────────────────────────────────────────────

  getState(): GameState {
    return this.state.toJSON();
  }

  getSanitizedState(playerIndex: number): GameState {
    return this.state.toSanitizedJSON(playerIndex);
  }

  isGameOver(): boolean {
    return this.state.getPhase() === 'GAME_OVER';
  }

  getWinner(): string | null {
    return this.state.getState().winner;
  }

  getRoomCode(): string {
    return this.state.getState().roomCode;
  }

  // ─── Namek Revive ────────────────────────────────────────────

  /**
   * Check if Kid Buu is alive on either player's field.
   * Kid Buu nullifies the Namek revive trigger.
   */
  private isKidBuuAlive(): boolean {
    const gs = this.state.getState();
    for (let i = 0; i < 2; i++) {
      const char = this.state.getCharacter(i, 'kid-buu');
      if (char && char.isAlive) return true;
    }
    return false;
  }

  /**
   * After combat or card effects resolve, detect whether the Namek
   * battlefield revive trigger should activate.
   *
   * Conditions (all must be true):
   * 1. Battlefield effect base is `revive_on_last`
   * 2. Kid Buu is NOT alive on either field
   * 3. namekReviveUsed is false (still available)
   * 4. Any player has exactly 1 alive character AND at least 1 dead character
   *
   * On trigger: sets namekRevivePending = playerIndex
   */
  private checkReviveTrigger(): void {
    const gs = this.state.getState();

    // 1. Check battlefield effect
    const bfBase = gs.battlefield?.effect?.split(':')[0];
    if (bfBase !== 'revive_on_last') return;

    // 2. Kid Buu blocks revive
    if (this.isKidBuuAlive()) return;

    // 3. Already used this game
    if (this.state.isNamekReviveUsed()) return;

    // 4. Check each player: exactly 1 alive + at least 1 dead
    for (let i = 0; i < 2; i++) {
      const aliveCount = this.state.getAliveCharacters(i).length;
      const totalChars = gs.players[i].characters.length;
      const deadCount = totalChars - aliveCount;

      if (aliveCount === 1 && deadCount >= 1) {
        // Trigger revive for this player
        this.state.setNamekRevivePending(i);
        this.state.addLog(
          'NAMEEK_REVIVE_TRIGGER',
          `Player ${i} has 1 alive character and qualifies for Namek battlefield revive.`
        );
        return; // Only trigger once per check
      }
    }
  }

  /**
   * Clean up any running timers (pre-battle countdown, etc.).
   * Called when a game is removed from the registry.
   */
  /**
   * Clean up any running timers (pre-battle countdown, etc.).
   * Called when a game is removed from the registry.
   */
  destroy(): void {
    if (this.preBattleManager) {
      this.preBattleManager.cleanup();
      this.preBattleManager = null;
    }
  }

  /**
   * Immediately complete the pre-battle phase (for testing).
   * Stops the countdown timer and transitions to WAITING_FOR_ACTION.
   */
  completePreBattle(): void {
    if (this.preBattleManager) {
      this.preBattleManager.cleanup();
      this.preBattleManager = null;
    }
    if (this.state.getState().phase === 'PRE_BATTLE') {
      this.state.setPreBattle(null);
      this.state.setSecondsRemaining(null);
      this.turn.startTurn(this.state);
    }
  }
}
