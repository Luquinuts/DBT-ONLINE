import type { BattlefieldDef } from '@dbt-online/shared';

/**
 * Complete list of battlefield cards.
 *
 * Each battlefield has a unique id, display name, effect key (for FieldEffectEngine),
 * and a description of what it does.
 *
 * See FieldEffectEngine.applyModifiers() for the implementation of each effect.
 */
export const BATTLEFIELDS: BattlefieldDef[] = [
  {
    id: 'hyperbolic-time-chamber',
    name: 'Hyperbolic Time Chamber',
    effect: 'none',
    description: 'No tiene ningún efecto.',
  },
  {
    id: 'namek',
    name: 'Namek',
    effect: 'revive_on_last:1',
    description:
      'El primer jugador en quedarse con un solo personaje, puede revivir a un jugador.',
  },
  {
    id: 'tenkaichi-budokai',
    name: 'Tenkaichi Budokai',
    effect: 'no_definitivas',
    description: 'No se pueden utilizar definitivas.',
  },
  {
    id: 'power-tournament',
    name: 'Power Tournament',
    effect: 'no_equipables',
    description: 'No se pueden utilizar equipables (+1 vida, +2 vida, Escudo, Semilla Senzu).',
  },
  {
    id: 'north-kaio-planet',
    name: 'North Kaio Planet',
    effect: 'lentitud:1',
    description: 'Todos los personajes +1 de lentitud.',
  },
  {
    id: 'capsule-corp',
    name: 'Capsule Corp',
    effect: 'hp:1',
    description: 'Todos los personajes +1 de vida.',
  },
  {
    id: 'cell-games',
    name: 'Cell Games',
    effect: 'attack_front_only',
    description: 'Los personajes solo pueden atacar a quien tengan enfrente.',
  },
  {
    id: 'beerus-planet',
    name: 'Beerus Planet',
    effect: 'attack:2',
    description: 'Todos los personajes +2 de Ataque.',
  },
  {
    id: 'kamehouse',
    name: 'Kamehouse',
    effect: 'disable_character',
    description:
      'Cada jugador elige a un personaje rival para que no pueda atacar ni avanzar. Puede ser atacado y recibir daño. No afecta al último personaje vivo.',
  },
  {
    id: 'destroyed-namek',
    name: 'Destroyed Namek',
    effect: 'turn_limit:5',
    description:
      'Tras 5 turnos cada jugador, termina la partida. Gana el que tenga más personajes o más vida total.',
  },
];

/**
 * Get a random battlefield, optionally excluding specific IDs.
 * Used by Nave Espacial (reroll_battlefield) and initial battlefield setup.
 *
 * @param excludeIds - Battlefield IDs to exclude from selection
 * @returns A random BattlefieldDef from the pool
 */
export function getRandomBattlefield(excludeIds: string[] = []): BattlefieldDef {
  const available = BATTLEFIELDS.filter((b) => !excludeIds.includes(b.id));
  // If all are excluded, return any (full pool)
  if (available.length === 0) {
    return BATTLEFIELDS[Math.floor(Math.random() * BATTLEFIELDS.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Get a battlefield definition by its ID.
 */
export function getBattlefieldById(id: string): BattlefieldDef | undefined {
  return BATTLEFIELDS.find((b) => b.id === id);
}
