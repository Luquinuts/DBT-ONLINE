import type { CharacterDef, AbilityDef, PassiveDef, DefinitivaDef } from '@dbt-online/shared';

// ─── Character Registry ─────────────────────────────────────────
// 16 characters fully defined using the CharacterDef interface.

export const CHARACTERS: CharacterDef[] = [
  // ── 1. SSJ GOD GOKU ────────────────────────────────────────────
  {
    id: 'ssj-god-goku',
    name: 'SSJ God Goku',
    type: 'SUPPORT',
    stats: { vida: 7, lentitud: 0, ataque: 1 },
    abilities: {
      habilidad: {
        name: 'Regeneration',
        description: '+1 de vida a un aliado',
        cooldown: 4,
        effect: 'heal_ally:1',
      },
      definitiva: {
        name: 'Kamehameha',
        description: '2 de Ataque, 2 de ki',
        damage: 2,
        kiCost: 2,
        targets: 'SINGLE',
      },
    },
    icons: {},
  },

  // ── 2. SSJ BLUE VEGETA ─────────────────────────────────────────
  {
    id: 'ssj-blue-vegeta',
    name: 'SSJ Blue Vegeta',
    type: 'DAMAGE',
    stats: { vida: 6, lentitud: 1, ataque: 3 },
    abilities: {
      definitiva: {
        name: 'Bing Bang',
        description: '4 de Ataque, 5 de ki',
        damage: 4,
        kiCost: 5,
        targets: 'SINGLE',
      },
    },
    icons: {},
  },

  // ── 3. GOLDEN FRIEZA ───────────────────────────────────────────
  {
    id: 'golden-frieza',
    name: 'Golden Frieza',
    type: 'DAMAGE',
    stats: { vida: 3, lentitud: 0, ataque: 3 },
    abilities: {
      habilidad: {
        name: 'Salvation',
        description:
          '+1 de Vida por -1 de Ataque. Puede usarse al morir. 1 uso por partida. Revive con esto.',
        cooldown: 0,
        effect: 'salvation_revive',
        usesPerGame: 1,
      },
      definitiva: {
        name: 'Supernova',
        description: '3 de Ataque (a todos los rivales), 6 de ki',
        damage: 3,
        kiCost: 6,
        targets: 'ALL',
      },
    },
    icons: { deathIcon: true },
  },

  // ── 4. SSJ ROSÉ BLACK GOKU (AND ZAMASU) ────────────────────────
  // Dual character with two forms. Starts as SSJ Rosé Black Goku.
  // See ZAMASU_FORM_DATA export for the alternate form.
  {
    id: 'ssj-rose-black-goku',
    name: 'SSJ Rosé Black Goku',
    type: 'DAMAGE',
    stats: { vida: 6, lentitud: 1, ataque: 2 },
    abilities: {
      pasiva: {
        name: 'Zero Mortals',
        description:
          'Al quedar a 1 de vida y recuperarse de eso (pasar a tener más de 1 vida), pasa a tener +1 de ataque',
        type: 'STAT_BOOST',
        condition: 'healed_from_1hp',
      },
    },
    icons: { change: true, rage: true },
  },

  // ── 5. SSJ BROLY ───────────────────────────────────────────────
  {
    id: 'ssj-broly',
    name: 'SSJ Broly',
    type: 'TANQUE',
    stats: { vida: 10, lentitud: 2, ataque: 3 },
    abilities: {
      definitiva: {
        name: 'Gigantic Breath',
        description: '3 de Ataque (a 2 rivales a la vez), 5 de ki',
        damage: 3,
        kiCost: 5,
        targets: 'TWO',
      },
    },
    icons: { rage: true },
  },

  // ── 6. PERFECT CELL ────────────────────────────────────────────
  {
    id: 'perfect-cell',
    name: 'Perfect Cell',
    type: 'DAMAGE',
    stats: { vida: 7, lentitud: 0, ataque: 1 },
    abilities: {
      pasiva: {
        name: 'Androide Synergy',
        description:
          'En el caso de tener en su equipo a A17&A18, suma +1 de Ataque',
        type: 'STAT_BOOST',
        condition: 'ally_a17_a18',
        value: 1,
      },
      definitiva: {
        name: 'Solar Kamehameha',
        description: '5 de Ataque, 5 de ki',
        damage: 5,
        kiCost: 5,
        targets: 'SINGLE',
      },
    },
    icons: {},
  },

  // ── 7. KID BUU ─────────────────────────────────────────────────
  {
    id: 'kid-buu',
    name: 'Kid Buu',
    type: 'DAMAGE',
    stats: { vida: 6, lentitud: 0, ataque: 1 },
    abilities: {
      pasiva: {
        name: 'Battlefield Nullification',
        description: 'Anula los efectos del campo de batalla',
        type: 'BATTLEFIELD_NULLIFY',
      },
    },
    icons: {},
  },

  // ── 8. BEERUS ───────────────────────────────────────────────────
  {
    id: 'beerus',
    name: 'Beerus',
    type: 'TANQUE',
    stats: { vida: 10, lentitud: 4, ataque: 10 },
    abilities: {
      definitiva: {
        name: 'Hakai',
        description: 'Infinito Ataque, 10 de ki',
        damage: 'INFINITE',
        kiCost: 10,
        targets: 'SINGLE',
      },
    },
    icons: {},
  },

  // ── 9. HIT ──────────────────────────────────────────────────────
  {
    id: 'hit',
    name: 'Hit',
    type: 'DAMAGE',
    stats: { vida: 6, lentitud: 0, ataque: 2 },
    abilities: {
      habilidad: {
        name: 'Time-Skip',
        description: 'Tiene dos turnos seguidos. 1 uso por partida (resetea al revivir).',
        cooldown: 0,
        effect: 'extra_turn',
        usesPerGame: 1,
      },
    },
    icons: { rage: true },
  },

  // ── 10. SSJ 2 GOHAN ────────────────────────────────────────────
  {
    id: 'ssj2-gohan',
    name: 'SSJ 2 Gohan',
    type: 'DAMAGE',
    stats: { vida: 7, lentitud: 1, ataque: 2 },
    abilities: {
      habilidad: {
        name: 'Hidden Potential Rush',
        description: 'Puede atacar sin lentitud',
        cooldown: 3,
        effect: 'remove_lentitud_self',
      },
      definitiva: {
        name: 'Kamehameha',
        description:
          '6 de Ataque al quedar a 2 o menos de vida restante',
        damage: 6,
        kiCost: 0,
        targets: 'SINGLE',
      },
    },
    icons: {},
  },

  // ── 11. A17&A18 ─────────────────────────────────────────────────
  // Dual-entity character: two separate HP pools but share attack.
  {
    id: 'a17-a18',
    name: 'A17&A18',
    type: 'SUPPORT',
    stats: { vida: 4, lentitud: 1, ataque: 1 },
    abilities: {
      pasiva: {
        name: 'Twin Ki',
        description: 'Cada turno suma +1 de ki, al inicio del turno',
        type: 'KI_PER_TURN',
        value: 1,
      },
    },
    icons: {},
  },

  // ── 12. SSJ3 GOTENKS ───────────────────────────────────────────
  {
    id: 'ssj3-gotenks',
    name: 'SSJ3 Gotenks',
    type: 'TANQUE',
    stats: { vida: 7, lentitud: 1, ataque: 2 },
    abilities: {
      pasiva: {
        name: 'Super Ghost Kamikaze Attack',
        description:
          'Quien le haga daño recibirá 1 de daño, no es esquivable',
        type: 'COUNTER_DAMAGE',
        value: 1,
      },
    },
    icons: {},
  },

  // ── 13. PICCOLO ─────────────────────────────────────────────────
  {
    id: 'piccolo',
    name: 'Piccolo',
    type: 'SUPPORT',
    stats: { vida: 7, lentitud: 1, ataque: 2 },
    abilities: {
      habilidad: {
        name: 'Dende',
        description:
          'Puede revivir a un aliado al momento de morir, revive con 1 de vida',
        cooldown: 0,
        effect: 'revive_ally:1',
        usesPerGame: 1,
      },
    },
    icons: {},
  },

  // ── 14. JIREN ───────────────────────────────────────────────────
  {
    id: 'jiren',
    name: 'Jiren',
    type: 'TANQUE',
    stats: { vida: 9, lentitud: 1, ataque: 3 },
    abilities: {
      pasiva: {
        name: 'Meditation',
        description:
          'Los primeros 2 turnos de la partida no puede hacer nada',
        type: 'MEDITATION_LOCK',
        value: 2,
      },
      habilidad: {
        name: 'Pride Troopers',
        description:
          'Coloca un escudo que protege de un ataque o definitiva a él y sus aliados',
        cooldown: 0,
        effect: 'shield_all',
        usesPerGame: 1,
      },
    },
    icons: {},
  },

  // ── 15. SSJ FUTURE TRUNKS ──────────────────────────────────────
  {
    id: 'ssj-future-trunks',
    name: 'SSJ Future Trunks',
    type: 'SUPPORT',
    stats: { vida: 8, lentitud: 1, ataque: 1 },
    abilities: {
      habilidad: {
        name: 'Hope of the Future',
        description:
          'Un compañero puede atacar sin el tiempo de lentitud',
        cooldown: 10,
        effect: 'remove_lentitud_ally',
      },
    },
    icons: {},
  },

  // ── 16. SSJ GOKU ───────────────────────────────────────────────
  {
    id: 'ssj-goku',
    name: 'SSJ Goku',
    type: 'DAMAGE',
    stats: { vida: 6, lentitud: 1, ataque: 2 },
    abilities: {
      pasiva: {
        name: '¡Krillin!',
        description: '-1 de lentitud si se muere un aliado',
        type: 'LENTITUD_REDUCTION',
        value: 1,
        condition: 'ally_dies',
      },
      habilidad: {
        name: 'Saiyan Recovery',
        description: 'Recupera 1 de vida',
        cooldown: 3,
        effect: 'heal_self:1',
      },
      definitiva: {
        name: 'Meteor Attack',
        description: '1 de Ataque, 1 de ki',
        damage: 1,
        kiCost: 1,
        targets: 'SINGLE',
      },
    },
    icons: {},
  },
];

// ─── Lookup Helper ───────────────────────────────────────────────

export function getCharacterById(id: string): CharacterDef | undefined {
  return CHARACTERS.find((c) => c.id === id);
}

// ─── Dual-Form Data ──────────────────────────────────────────────
// SSJ Rosé Black Goku can switch to Zamasu form in battle.
// Engine uses this data to apply the alternate form at runtime.

export interface AlternateFormData {
  name: string;
  stats: { vida: number; lentitud: number; ataque: number };
  pasiva?: PassiveDef;
  habilidad?: AbilityDef;
}

export const ZAMASU_FORM_DATA: AlternateFormData = {
  name: 'Zamasu',
  stats: { vida: 4, lentitud: 0, ataque: 1 },
  pasiva: {
    name: 'Immortal Regeneration',
    description:
      'Cada turno recupera 1 de vida, puede recuperar hasta máximo 3, aun sin estar en el campo de batalla',
    type: 'STAT_BOOST',
    value: 1,
  },
  habilidad: {
    name: 'Divine Intervention',
    description: 'Puede recuperar +3 a un PJ',
    cooldown: 0,
    effect: 'heal_ally:3',
    usesPerGame: 1,
  },
};

// ─── Special Character Metadata ──────────────────────────────────

/**
 * Characters with special engine-level behaviors not fully captured
 * by the standard CharacterDef fields:
 *
 * - Kid Buu: attacks twice per action (same target). Handled at combat level.
 * - SSJ2 Gohan: Kamehameha only does 6 damage when vida_remaining ≤ 2.
 * - A17&A18: two separate HP pools (androide17Vida / androide18Vida in CharacterState).
 *   Objects affect one, shield covers both.
 * - SSJ Rosé Black Goku / Zamasu: starts in Rose form, can switch on own turn.
 *   If one dies, both die. Both revive together.
 * - Golden Frieza: Salvation activates at moment of dying (deathIcon).
 * - Jiren: Meditation locks actions for first 2 turns.
 * - Beerus: Hakai does INFINITE damage (single-target kill).
 */
