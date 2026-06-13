import type { GameStateManager } from '../state/GameState';
import type { GameAction, GamePhase, GameError, CharacterState } from '@dbt-online/shared';
import { isActionValidForPhase, validPhasesForAction } from '@dbt-online/shared';

export interface ValidationResult {
  valid: boolean;
  error?: GameError;
}

/**
 * Validates every player action before the engine processes it.
 * Checks phase, ownership, character state, ki costs, and usage limits.
 */
export class ActionValidator {
  /**
   * Validate a game action for a specific player.
   */
  static validate(
    state: GameStateManager,
    playerIndex: number,
    action: GameAction
  ): ValidationResult {
    const gs = state.getState();
    const player = state.getPlayer(playerIndex);

    // ── Basic checks ──────────────────────────────────────────

    // Check game is not over
    if (gs.phase === 'GAME_OVER') {
      return {
        valid: false,
        error: { code: 'GAME_OVER', message: 'The game has already ended.' },
      };
    }

    // Check it's the player's turn (except for defender response, draft, and ban)
    if (
      action.type !== 'DEFENDER_RESPONSE' &&
      action.type !== 'DRAFT_SELECT' &&
      action.type !== 'PLACE_CHARACTERS' &&
      action.type !== 'BAN_CHARACTER' &&
      gs.currentPlayerIndex !== playerIndex
    ) {
      return {
        valid: false,
        error: {
          code: 'NOT_YOUR_TURN',
          message: 'It is not your turn.',
        },
      };
    }

    // ── Phase validation ──────────────────────────────────────
    const validPhases = validPhasesForAction(action.type);

    if (validPhases.length > 0 && !isActionValidForPhase(action.type, gs.phase)) {
      return {
        valid: false,
        error: {
          code: 'INVALID_PHASE',
          message: `Action '${action.type}' is not valid in phase '${gs.phase}'. Valid phases: ${validPhases.join(', ')}`,
        },
      };
    }

    // ── Battlefield restrictions (Phase 4) ─────────────────────
    const battlefieldEffect = gs.battlefield?.effect;
    const bfBase = battlefieldEffect?.split(':')[0];

    // If battlefield has no_definitivas, reject definitiva attacks
    if (
      bfBase === 'no_definitivas' &&
      action.type === 'ATTACK' &&
      action.attackType === 'DEFINITIVA'
    ) {
      return {
        valid: false,
        error: {
          code: 'BATTLEFIELD_BLOCKED',
          message: 'Definitivas are forbidden by the current battlefield (Tenkaichi Budokai).',
        },
      };
    }

    // If battlefield has no_equipables, reject equipable card plays
    if (bfBase === 'no_equipables' && action.type === 'PLAY_CARD') {
      // We need the card def to check isEquipable — check after basic phase validation
      // This is done in validatePlayCard below
    }

    // ── Action-specific validation ────────────────────────────

    switch (action.type) {
      case 'DRAFT_SELECT':
        return ActionValidator.validateDraftSelect(state, playerIndex, action);

      case 'PLACE_CHARACTERS':
        return ActionValidator.validatePlaceCharacters(state, playerIndex, action);

      case 'PLAY_CARD':
        return ActionValidator.validatePlayCard(state, playerIndex, action);

      case 'ADVANCE':
        return ActionValidator.validateAdvance(state, playerIndex, action);

      case 'ATTACK':
        return ActionValidator.validateAttack(state, playerIndex, action);

      case 'USE_HABILIDAD':
        return ActionValidator.validateUseHabilidad(state, playerIndex, action);

      case 'DEFENDER_RESPONSE':
        return ActionValidator.validateDefenderResponse(state, playerIndex, action);

      case 'PASS':
        return { valid: true };

      case 'END_TURN':
        return ActionValidator.validateEndTurn(state, playerIndex);

      case 'SWITCH_FORM':
        return ActionValidator.validateSwitchForm(state, playerIndex, action);

      case 'DRAGON_REVIVE':
        return ActionValidator.validateDragonRevive(state, action);

        case 'BAN_CHARACTER':
        return ActionValidator.validateBanCharacter(state, playerIndex, action);

      // No specific validation needed for these
      default:
        return { valid: true };
    }
  }

  // ─── Draft validation ─────────────────────────────────────────

  private static validateDraftSelect(
    state: GameStateManager,
    playerIndex: number,
    action: GameAction & { type: 'DRAFT_SELECT' }
  ): ValidationResult {
    const draft = state.getDraftState();
    if (!draft || draft.phase !== 'PICKING') {
      return {
        valid: false,
        error: { code: 'DRAFT_NOT_PICKING', message: 'Draft is not in pick phase.' },
      };
    }

    if (draft.currentPicker !== playerIndex) {
      return {
        valid: false,
        error: { code: 'NOT_YOUR_PICK', message: 'It is not your turn to pick.' },
      };
    }

    if (!draft.availableCharacters.includes(action.characterId)) {
      return {
        valid: false,
        error: {
          code: 'CHARACTER_UNAVAILABLE',
          message: `Character '${action.characterId}' is not available.`,
        },
      };
    }

    return { valid: true };
  }

  private static validatePlaceCharacters(
    state: GameStateManager,
    playerIndex: number,
    action: GameAction & { type: 'PLACE_CHARACTERS' }
  ): ValidationResult {
    const draft = state.getDraftState();
    if (!draft || draft.phase !== 'PLACING') {
      return {
        valid: false,
        error: { code: 'NOT_PLACING', message: 'Draft is not in placing phase.' },
      };
    }

    const playerPicks = draft.picks[playerIndex];
    if (playerPicks.length !== 3) {
      return {
        valid: false,
        error: {
          code: 'INVALID_PICK_COUNT',
          message: `Expected 3 picks, got ${playerPicks.length}.`,
        },
      };
    }

    for (const charId of action.order) {
      if (!playerPicks.includes(charId)) {
        return {
          valid: false,
          error: {
            code: 'CHARACTER_NOT_PICKED',
            message: `Character '${charId}' was not picked by you.`,
          },
        };
      }
    }

    const uniqueIds = new Set(action.order);
    if (uniqueIds.size !== action.order.length || action.order.length !== 3) {
      return {
        valid: false,
        error: {
          code: 'INVALID_ORDER',
          message: 'Must provide exactly 3 unique character IDs.',
        },
      };
    }

    return { valid: true };
  }

  // ─── Card play validation ─────────────────────────────────────

  private static validatePlayCard(
    state: GameStateManager,
    playerIndex: number,
    action: GameAction & { type: 'PLAY_CARD' }
  ): ValidationResult {
    const player = state.getPlayer(playerIndex);

    // Card must be in hand
    if (!player.hand.includes(action.cardId)) {
      return {
        valid: false,
        error: { code: 'CARD_NOT_IN_HAND', message: `Card '${action.cardId}' not in hand.` },
      };
    }

    // If target character specified, must be on player's field or opponent's field (if applicable)
    if (action.targetCharacterId) {
      const ownChar = state.getCharacter(playerIndex, action.targetCharacterId);
      const oppChar = state.getCharacter(playerIndex === 0 ? 1 : 0, action.targetCharacterId);
      if (!ownChar && !oppChar) {
        return {
          valid: false,
          error: {
            code: 'INVALID_TARGET',
            message: `Target character '${action.targetCharacterId}' not found.`,
          },
        };
      }
    }

    // Equipable limit check
    // Check if it's an equipable card (from deck data)
    // We check the card in the hand — need card def lookup
    // For now, defer this to GameEngine which has access to deck data
    // The GameEngine will check equipable limits

    // Battlefield: no_equipables — reject equipable card plays
    const bfEffect = state.getState().battlefield?.effect;
    if (bfEffect === 'no_equipables') {
      // We can't check isEquipable here without the CardDef,
      // so defer to GameEngine which has the deck data.
      // The GameEngine will check this before resolving the effect.
    }

    return { valid: true };
  }

  // ─── Advance validation ───────────────────────────────────────

  private static validateAdvance(
    state: GameStateManager,
    playerIndex: number,
    action: GameAction & { type: 'ADVANCE' }
  ): ValidationResult {
    const character = state.getCharacter(playerIndex, action.characterId);
    if (!character) {
      return {
        valid: false,
        error: { code: 'CHARACTER_NOT_FOUND', message: `Character '${action.characterId}' not found.` },
      };
    }

    if (!character.isAlive) {
      return {
        valid: false,
        error: { code: 'CHARACTER_DEAD', message: 'Cannot advance a dead character.' },
      };
    }

    // Player must not have already advanced this turn
    if (state.getPlayer(playerIndex).hasAdvancedThisTurn) {
      return {
        valid: false,
        error: { code: 'ALREADY_ADVANCED', message: 'You have already advanced a character this turn.' },
      };
    }

    // Jiren meditation lock: Jiren cannot do anything for the first 2 turns
    const charDef = state.getCharacterDef(action.characterId);
    if (charDef?.id === 'jiren' && state.getState().turnNumber <= 2) {
      return {
        valid: false,
        error: {
          code: 'JIREN_MEDITATION',
          message: 'Jiren is meditating and cannot act for the first 2 turns.',
        },
      };
    }

    return { valid: true };
  }

  // ─── Attack validation ────────────────────────────────────────

  private static validateAttack(
    state: GameStateManager,
    playerIndex: number,
    action: GameAction & { type: 'ATTACK' }
  ): ValidationResult {
    const attacker = state.getCharacter(playerIndex, action.attackerId);
    if (!attacker) {
      return {
        valid: false,
        error: { code: 'ATTACKER_NOT_FOUND', message: `Attacker '${action.attackerId}' not found.` },
      };
    }

    if (!attacker.isAlive) {
      return {
        valid: false,
        error: { code: 'ATTACKER_DEAD', message: 'Attacker is dead.' },
      };
    }

    if (attacker.hasAttackedThisTurn) {
      return {
        valid: false,
        error: {
          code: 'ALREADY_ATTACKED',
          message: `'${action.attackerId}' has already attacked this turn.`,
        },
      };
    }

    // Player-level gate: only one attack per turn
    const currentPlayer = state.getPlayer(playerIndex);
    if (currentPlayer.hasAttackedThisTurn) {
      return {
        valid: false,
        error: {
          code: 'ALREADY_ATTACKED',
          message: 'You have already attacked this turn.',
        },
      };
    }

    // Check advanceCounter >= lentitud (unless it's ultimate/special)
    // For NORMAL attacks, check advance
    if (action.attackType === 'NORMAL') {
      // ULTIMATE card skips lentitud check (handled in GameEngine)
      // Regular attacks need advanceCounter >= lentitud
      if (attacker.advanceCounter < attacker.currentLentitud) {
        return {
          valid: false,
          error: {
            code: 'NOT_ADVANCED_ENOUGH',
            message: `'${action.attackerId}' needs ${attacker.currentLentitud} advances but has ${attacker.advanceCounter}.`,
          },
        };
      }
    }

    // For DEFINITIVA, check ki cost and character has definitiva
    if (action.attackType === 'DEFINITIVA') {
      const charDef = state.getCharacterDef(action.attackerId);
      if (!charDef?.abilities?.definitiva) {
        return {
          valid: false,
          error: {
            code: 'NO_DEFINITIVA',
            message: `'${action.attackerId}' has no definitiva attack.`,
          },
        };
      }
      // Actually ki cost is checked in the engine (CardEffectEngine handles ki)
    }

    // Check target exists and is alive
    const targetPlayerIndex = playerIndex === 0 ? 1 : 0;
    const target = state.getCharacter(targetPlayerIndex, action.targetId);
    if (!target) {
      return {
        valid: false,
        error: { code: 'TARGET_NOT_FOUND', message: `Target '${action.targetId}' not found.` },
      };
    }

    if (!target.isAlive) {
      return {
        valid: false,
        error: { code: 'TARGET_DEAD', message: `Target '${action.targetId}' is already dead.` },
      };
    }

    // Jiren meditation lock
    const attackerDef = state.getCharacterDef(action.attackerId);
    if (attackerDef?.id === 'jiren' && state.getState().turnNumber <= 2) {
      return {
        valid: false,
        error: {
          code: 'JIREN_MEDITATION',
          message: 'Jiren is meditating and cannot act for the first 2 turns.',
        },
      };
    }

    // ── Battlefield: attack_front_only (Cell Games) ───────────
    const gs = state.getState();
    if (gs.battlefield?.effect === 'attack_front_only') {
      const attackerIdx = state.getPlayer(playerIndex).characters.indexOf(attacker);
      const targetIdx = state.getPlayer(targetPlayerIndex).characters.indexOf(target);
      if (attackerIdx !== targetIdx) {
        return {
          valid: false,
          error: {
            code: 'BATTLEFIELD_BLOCKED',
            message: `Cell Games: ${action.attackerId} can only attack the character in front (position ${attackerIdx}).`,
          },
        };
      }
    }

    return { valid: true };
  }

  // ─── Use habilidad validation ──────────────────────────────────

  private static validateUseHabilidad(
    state: GameStateManager,
    playerIndex: number,
    action: GameAction & { type: 'USE_HABILIDAD' }
  ): ValidationResult {
    const character = state.getCharacter(playerIndex, action.characterId);
    if (!character) {
      return {
        valid: false,
        error: { code: 'CHARACTER_NOT_FOUND', message: `Character '${action.characterId}' not found.` },
      };
    }

    if (!character.isAlive) {
      return {
        valid: false,
        error: { code: 'CHARACTER_DEAD', message: 'Dead character cannot use abilities.' },
      };
    }

    const charDef = state.getCharacterDef(action.characterId);
    if (!charDef?.abilities?.habilidad) {
      return {
        valid: false,
        error: {
          code: 'NO_HABILIDAD',
          message: `'${action.characterId}' has no habilidad.`,
        },
      };
    }

    if (character.abilityUsedThisGame && charDef.abilities.habilidad.usesPerGame !== undefined) {
      // Already used if usesPerGame is defined and already used
      if (character.abilityUsedThisGame) {
        return {
          valid: false,
          error: { code: 'ABILITY_USED', message: 'Habilidad already used this game.' },
        };
      }
    }

    // Jiren meditation lock
    if (charDef.id === 'jiren' && state.getState().turnNumber <= 2) {
      return {
        valid: false,
        error: {
          code: 'JIREN_MEDITATION',
          message: 'Jiren is meditating and cannot act for the first 2 turns.',
        },
      };
    }

    return { valid: true };
  }

  // ─── Defender response validation ──────────────────────────────

  private static validateDefenderResponse(
    state: GameStateManager,
    playerIndex: number,
    action: GameAction & { type: 'DEFENDER_RESPONSE' }
  ): ValidationResult {
    const pending = state.getPendingAttack();
    if (!pending) {
      return {
        valid: false,
        error: {
          code: 'NO_PENDING_ATTACK',
          message: 'There is no pending attack to respond to.',
        },
      };
    }

    // The responding player must be the target's owner
    if (pending.targetPlayerIndex !== playerIndex) {
      return {
        valid: false,
        error: { code: 'NOT_YOUR_DEFENSE', message: 'The pending attack is not targeting your character.' },
      };
    }

    // The defending character must be the one being attacked
    if (action.characterId !== pending.targetId) {
      return {
        valid: false,
        error: {
          code: 'WRONG_CHARACTER',
          message: `Defense must be for ${pending.targetId}.`,
        },
      };
    }

    // Validate esquive/escudo cards if specified
    if (action.action === 'ESQUIVE' && action.cardId) {
      const player = state.getPlayer(playerIndex);
      if (!player.hand.includes(action.cardId)) {
        return {
          valid: false,
          error: { code: 'CARD_NOT_IN_HAND', message: 'Esquive card not in hand.' },
        };
      }
      // Esquive only blocks NORMAL attacks
      if (pending.attackType !== 'NORMAL') {
        return {
          valid: false,
          error: {
            code: 'ESQUIVE_INVALID',
            message: 'Esquive can only block NORMAL attacks.',
          },
        };
      }
    }

    if (action.action === 'ESCUDO' && action.cardId) {
      const player = state.getPlayer(playerIndex);
      if (!player.hand.includes(action.cardId)) {
        return {
          valid: false,
          error: { code: 'CARD_NOT_IN_HAND', message: 'Escudo card not in hand.' },
        };
      }
    }

    return { valid: true };
  }

  // ─── End turn validation ───────────────────────────────────────

  private static validateEndTurn(
    state: GameStateManager,
    playerIndex: number
  ): ValidationResult {
    // END_TURN should only be valid when no other actions are possible
    // For Phase 3, we always allow END_TURN in the END_TURN phase
    return { valid: true };
  }

  // ─── Switch form validation ────────────────────────────────────

  private static validateSwitchForm(
    state: GameStateManager,
    playerIndex: number,
    action: GameAction & { type: 'SWITCH_FORM' }
  ): ValidationResult {
    const gs = state.getState();

    // Must be in the right phase (own turn, before attacking or ending)
    if (gs.phase !== 'WAITING_FOR_ACTION') {
      return {
        valid: false,
        error: { code: 'WRONG_PHASE', message: 'Can only switch forms during your action phase.' },
      };
    }

    // Must be the player's turn
    if (gs.currentPlayerIndex !== playerIndex) {
      return {
        valid: false,
        error: { code: 'WRONG_TURN', message: 'It is not your turn.' },
      };
    }

    const character = state.getCharacter(playerIndex, action.characterId);
    if (!character) {
      return {
        valid: false,
        error: { code: 'CHARACTER_NOT_FOUND', message: `Character '${action.characterId}' not found.` },
      };
    }

    // Character must be alive
    if (!character.isAlive) {
      return {
        valid: false,
        error: { code: 'CHARACTER_DEAD', message: 'Character is dead and cannot switch.' },
      };
    }

    // Check character has switchForm
    const def = state.getCharacterDef(action.characterId);
    if (!def || !def.switchForm) {
      return {
        valid: false,
        error: { code: 'CANNOT_SWITCH', message: 'This character cannot switch forms.' },
      };
    }

    // Validate targetForm is one of the two forms
    if (action.targetForm !== def.id && action.targetForm !== def.switchForm.id) {
      return {
        valid: false,
        error: { code: 'INVALID_FORM', message: `'${action.targetForm}' is not a valid form.` },
      };
    }

    // Can't switch to the form already active
    if (character.currentForm === action.targetForm) {
      return {
        valid: false,
        error: { code: 'ALREADY_IN_FORM', message: `Already in ${action.targetForm} form.` },
      };
    }

    // Can only switch once per turn
    if (character.hasSwitchedThisTurn) {
      return {
        valid: false,
        error: { code: 'ALREADY_SWITCHED', message: 'Already switched forms this turn.' },
      };
    }

    // Can't switch after attacking
    if (character.hasAttackedThisTurn) {
      return {
        valid: false,
        error: { code: 'ALREADY_ATTACKED', message: 'Cannot switch after attacking.' },
      };
    }

    return { valid: true };
  }

  // ─── Ban character validation (Kame House) ─────────────────────

  private static validateBanCharacter(
    state: GameStateManager,
    playerIndex: number,
    action: GameAction & { type: 'BAN_CHARACTER' }
  ): ValidationResult {
    const gs = state.getState();

    // Must be in PRE_BATTLE phase
    if (gs.phase !== 'PRE_BATTLE') {
      return {
        valid: false,
        error: { code: 'INVALID_PHASE', message: 'Can only ban characters during pre-battle.' },
      };
    }

    // Must be in ban stage
    if (!gs.preBattle || gs.preBattle.stage !== 'ban') {
      return {
        valid: false,
        error: { code: 'NOT_BAN_STAGE', message: 'Ban stage is not active.' },
      };
    }

    // Player must own the character (belongs to their roster)
    const character = state.getCharacter(playerIndex, action.characterId);
    if (!character) {
      return {
        valid: false,
        error: { code: 'CHARACTER_NOT_FOUND', message: `Character '${action.characterId}' not found in your roster.` },
      };
    }

    // Character must be alive
    if (!character.isAlive) {
      return {
        valid: false,
        error: { code: 'CHARACTER_DEAD', message: 'Character is already dead or banned.' },
      };
    }

    // Must not be the last alive character for that player
    const aliveCount = state.getAliveCharacters(playerIndex).length;
    if (aliveCount <= 1) {
      return {
        valid: false,
        error: { code: 'LAST_CHARACTER', message: 'Cannot ban the last alive character.' },
      };
    }

    // Player must not have already submitted a ban
    if (gs.preBattle.pendingBan?.playerIndexes.includes(playerIndex)) {
      return {
        valid: false,
        error: { code: 'ALREADY_BANNED', message: 'You have already submitted a ban.' },
      };
    }

    return { valid: true };
  }

  // ─── Dragon revive validation ──────────────────────────────────

  private static validateDragonRevive(
    state: GameStateManager,
    action: GameAction & { type: 'DRAGON_REVIVE' }
  ): ValidationResult {
    const gs = state.getState();
    const playerIndex = gs.currentPlayerIndex;
    const isPending = gs.namekRevivePending === playerIndex;

    // Check target exists and is dead
    let found = false;
    let foundOnPlayerIndex = -1;
    for (let i = 0; i < 2; i++) {
      const char = state.getCharacter(i, action.targetCharacterId);
      if (char) {
        if (char.isAlive) {
          return {
            valid: false,
            error: {
              code: 'CHARACTER_ALIVE',
              message: `'${action.targetCharacterId}' is already alive.`,
            },
          };
        }
        found = true;
        foundOnPlayerIndex = i;
        break;
      }
    }

    if (!found) {
      return {
        valid: false,
        error: { code: 'CHARACTER_NOT_FOUND', message: `Character '${action.targetCharacterId}' not found.` },
      };
    }

    // If Namek revive is pending for this player, validate ownership
    if (isPending) {
      if (foundOnPlayerIndex !== playerIndex) {
        return {
          valid: false,
          error: {
            code: 'INVALID_TARGET',
            message: 'Namek revive can only target your own dead characters.',
          },
        };
      }
    }

    return { valid: true };
  }
}
