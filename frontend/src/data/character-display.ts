export interface CharacterDisplayEntry {
  displayName: string;
  type: 'TANQUE' | 'DAMAGE' | 'SUPPORT';
  stats: { vida: number; lentitud: number; ataque: number };
  color: string;
  description?: string;
  abilities?: {
    habilidad?: { cooldown: number };
    definitiva?: { kiCost: number; damage: number | 'INFINITE'; targets: string };
  };
}

export const CHARACTER_DISPLAY: Record<string, CharacterDisplayEntry> = {
  'ssj-broly': {
    displayName: 'SSJ Broly',
    type: 'TANQUE',
    stats: { vida: 10, lentitud: 2, ataque: 3 },
    color: '#7c3aed',
    abilities: {
      definitiva: { kiCost: 5, damage: 3, targets: 'TWO' },
    },
  },
  jiren: {
    displayName: 'Jiren',
    type: 'TANQUE',
    stats: { vida: 9, lentitud: 1, ataque: 3 },
    color: '#7c3aed',
    abilities: {
      habilidad: { cooldown: 0 },
    },
  },
  'ssj-blue-vegeta': {
    displayName: 'SSJ Blue Vegeta',
    type: 'DAMAGE',
    stats: { vida: 6, lentitud: 1, ataque: 3 },
    color: '#dc2626',
    abilities: {
      definitiva: { kiCost: 5, damage: 4, targets: 'SINGLE' },
    },
  },
  beerus: {
    displayName: 'Beerus',
    type: 'DAMAGE',
    stats: { vida: 10, lentitud: 4, ataque: 10 },
    color: '#dc2626',
    abilities: {
      definitiva: { kiCost: 10, damage: 'INFINITE', targets: 'SINGLE' },
    },
  },
  'golden-frieza': {
    displayName: 'Golden Frieza',
    type: 'DAMAGE',
    stats: { vida: 3, lentitud: 0, ataque: 3 },
    color: '#dc2626',
    abilities: {
      habilidad: { cooldown: 0 },
      definitiva: { kiCost: 6, damage: 3, targets: 'ALL' },
    },
  },
  'a17-a18': {
    displayName: 'A17 & A18',
    type: 'DAMAGE',
    stats: { vida: 4, lentitud: 1, ataque: 1 },
    color: '#dc2626',
  },
  'ssj-rose-black-goku': {
    displayName: 'SSJ Rosé Black Goku',
    type: 'DAMAGE',
    stats: { vida: 6, lentitud: 1, ataque: 2 },
    color: '#dc2626',
  },
  zamasu: {
    displayName: 'Zamasu',
    type: 'SUPPORT',
    stats: { vida: 4, lentitud: 0, ataque: 1 },
    color: '#38bdf8',
    abilities: {
      habilidad: { cooldown: 0 },
    },
  },
  'ssj2-gohan': {
    displayName: 'SSJ2 Gohan',
    type: 'DAMAGE',
    stats: { vida: 7, lentitud: 1, ataque: 2 },
    color: '#dc2626',
    abilities: {
      habilidad: { cooldown: 3 },
      definitiva: { kiCost: 0, damage: 6, targets: 'SINGLE' },
    },
  },
  'ssj3-gotenks': {
    displayName: 'SSJ3 Gotenks',
    type: 'DAMAGE',
    stats: { vida: 7, lentitud: 1, ataque: 2 },
    color: '#dc2626',
  },
  hit: {
    displayName: 'Hit',
    type: 'DAMAGE',
    stats: { vida: 6, lentitud: 0, ataque: 2 },
    color: '#dc2626',
    abilities: {
      habilidad: { cooldown: 0 },
    },
  },
  'kid-buu': {
    displayName: 'Kid Buu',
    type: 'DAMAGE',
    stats: { vida: 6, lentitud: 0, ataque: 1 },
    color: '#dc2626',
  },
  'ssj-goku': {
    displayName: 'SSJ Goku',
    type: 'DAMAGE',
    stats: { vida: 6, lentitud: 1, ataque: 2 },
    color: '#dc2626',
    abilities: {
      habilidad: { cooldown: 3 },
      definitiva: { kiCost: 1, damage: 1, targets: 'SINGLE' },
    },
  },
  'ssj-god-goku': {
    displayName: 'SSJ God Goku',
    type: 'DAMAGE',
    stats: { vida: 7, lentitud: 0, ataque: 1 },
    color: '#dc2626',
    abilities: {
      habilidad: { cooldown: 4 },
      definitiva: { kiCost: 2, damage: 2, targets: 'SINGLE' },
    },
  },
  'perfect-cell': {
    displayName: 'Perfect Cell',
    type: 'DAMAGE',
    stats: { vida: 7, lentitud: 0, ataque: 1 },
    color: '#dc2626',
    abilities: {
      definitiva: { kiCost: 5, damage: 5, targets: 'SINGLE' },
    },
  },
  'ssj-future-trunks': {
    displayName: 'SSJ Future Trunks',
    type: 'SUPPORT',
    stats: { vida: 8, lentitud: 1, ataque: 1 },
    color: '#38bdf8',
    abilities: {
      habilidad: { cooldown: 10 },
    },
  },
  piccolo: {
    displayName: 'Piccolo',
    type: 'SUPPORT',
    stats: { vida: 7, lentitud: 1, ataque: 2 },
    color: '#38bdf8',
    abilities: {
      habilidad: { cooldown: 0 },
    },
  },
};

/**
 * Character IDs that have a habilidad defined.
 * Used for conditional HAB button rendering in CharacterModal.
 * Source: backend/src/data/characters.ts — sync when backend adds abilities.
 */
/**
 * Characters whose BASE FORM has a `habilidad` ability.
 * SSJ Rosé Black Goku is excluded — only Zamasu has a habilidad.
 * When form-aware ability checks are implemented, this set should be replaced
 * with per-form data from the backend.
 */
export const CHARACTERS_WITH_HABILIDAD = new Set([
  'ssj-god-goku', 'golden-frieza', 'hit', 'ssj2-gohan',
  'piccolo', 'jiren', 'ssj-future-trunks', 'ssj-goku',
  'zamasu',
]);
