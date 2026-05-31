import type { GameStateManager } from '../../state/GameState';
import type { EffectResult } from '../EffectTypes';
import { handleCargaKi } from './CargaKiEffect';
import { handleEsquive } from './EsquiveEffect';
import { handleEscudo } from './EscudoEffect';
import { handleSemillaSenzu } from './SemillaSenzuEffect';
import { handlePlusVida } from './PlusVidaEffect';
import { handleBaculoSagrado } from './BaculoSagradoEffect';
import { handleNubeKinton } from './NubeKintonEffect';
import { handleUltimate } from './UltimateEffect';
import { handleMaquinaDelTiempo } from './MaquinaDelTiempoEffect';
import { handleRage } from './RageEffect';
import { handleNaveEspacial } from './NaveEspacialEffect';
import { handleEsferaDragon } from './EsferaDragonEffect';

// ─── Effect Handler Type ──────────────────────────────────────────

export type EffectHandler = (
  state: GameStateManager,
  playerIndex: number,
  cardEffect: string,
  targetCharacterId?: string
) => EffectResult;

// ─── Composite Handlers ──────────────────────────────────────────

/**
 * Composite handler for the `defense` effect key.
 * Dispatches to the correct sub-handler based on the effect suffix:
 * - `defense:esquive` → EsquiveEffect
 * - `defense:escudo`  → EscudoEffect
 */
function handleDefense(
  state: GameStateManager,
  playerIndex: number,
  cardEffect: string,
  targetCharacterId?: string
): EffectResult {
  const defType = cardEffect.split(':')[1] || 'esquive';

  if (defType === 'escudo') {
    // Equip shield to the target character
    return handleEscudo(state, playerIndex, cardEffect, targetCharacterId);
  }

  // Default: esquive — just log the prep
  return handleEsquive(state, playerIndex, cardEffect, targetCharacterId);
}

// ─── Composite handler for `heal` key ─────────────────────────────
// Semilla Senzu is the only heal card currently (heal:3).
// Future heal effects can be dispatched similarly.

function handleHeal(
  state: GameStateManager,
  playerIndex: number,
  cardEffect: string,
  targetCharacterId?: string
): EffectResult {
  return handleSemillaSenzu(state, playerIndex, cardEffect, targetCharacterId);
}

// ─── Build Registry ──────────────────────────────────────────────

/**
 * Build the complete effect handler registry.
 *
 * Map key: the base effect key (before the colon in CardDef.effect).
 * Each key maps to a handler function.
 *
 * Common effect keys:
 *   ki                → Carga de Ki (+1 ki) / Super Carga (+2 ki)
 *   defense           → Esquive / Escudo (dispatched by suffix)
 *   heal              → Semilla Senzu (+3 HP)
 *   hp                → +1 Vida (equipable)
 *   direct_damage     → Báculo Sagrado (1 damage, breaks shield)
 *   attack_no_lentitud→ Nube Kinton (skip lentitud)
 *   ultimate_attack   → ULTIMATE (all attack without lentitud)
 *   extra_turn        → Máquina del Tiempo (extra turn)
 *   rage_boost        → Rage (+1 atk to rage-icon allies)
 *   reroll_battlefield→ Nave Espacial (reroll battlefield)
 *   revive            → Esfera del Dragón (full revive)
 */
export function buildEffectRegistry(): Map<string, EffectHandler> {
  const registry = new Map<string, EffectHandler>();

  registry.set('ki', handleCargaKi);
  registry.set('defense', handleDefense);
  registry.set('heal', handleHeal);
  registry.set('hp', handlePlusVida);
  registry.set('direct_damage', handleBaculoSagrado);
  registry.set('attack_no_lentitud', handleNubeKinton);
  registry.set('ultimate_attack', handleUltimate);
  registry.set('extra_turn', handleMaquinaDelTiempo);
  registry.set('rage_boost', handleRage);
  registry.set('reroll_battlefield', handleNaveEspacial);
  registry.set('revive', handleEsferaDragon);

  return registry;
}
