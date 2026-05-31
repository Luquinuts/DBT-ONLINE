export const CHARACTER_DISPLAY: Record<
  string,
  {
    displayName: string;
    type: 'TANQUE' | 'DAMAGE' | 'SUPPORT';
    stats: { vida: number; lentitud: number; ataque: number };
    color: string;
    description?: string;
  }
> = {
  'ssj-broly': {
    displayName: 'SSJ Broly',
    type: 'TANQUE',
    stats: { vida: 10, lentitud: 2, ataque: 3 },
    color: '#7c3aed',
  },
  jiren: {
    displayName: 'Jiren',
    type: 'TANQUE',
    stats: { vida: 9, lentitud: 1, ataque: 3 },
    color: '#7c3aed',
  },
  'ssj-blue-vegeta': {
    displayName: 'SSJ Blue Vegeta',
    type: 'DAMAGE',
    stats: { vida: 6, lentitud: 1, ataque: 3 },
    color: '#dc2626',
  },
  beerus: {
    displayName: 'Beerus',
    type: 'DAMAGE',
    stats: { vida: 10, lentitud: 4, ataque: 10 },
    color: '#dc2626',
  },
  'golden-frieza': {
    displayName: 'Golden Frieza',
    type: 'DAMAGE',
    stats: { vida: 3, lentitud: 0, ataque: 3 },
    color: '#dc2626',
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
  'ssj2-gohan': {
    displayName: 'SSJ2 Gohan',
    type: 'DAMAGE',
    stats: { vida: 7, lentitud: 1, ataque: 2 },
    color: '#dc2626',
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
  },
  'ssj-god-goku': {
    displayName: 'SSJ God Goku',
    type: 'DAMAGE',
    stats: { vida: 7, lentitud: 0, ataque: 1 },
    color: '#dc2626',
  },
  'perfect-cell': {
    displayName: 'Perfect Cell',
    type: 'DAMAGE',
    stats: { vida: 7, lentitud: 0, ataque: 1 },
    color: '#dc2626',
  },
  'ssj-future-trunks': {
    displayName: 'SSJ Future Trunks',
    type: 'SUPPORT',
    stats: { vida: 8, lentitud: 1, ataque: 1 },
    color: '#38bdf8',
  },
  piccolo: {
    displayName: 'Piccolo',
    type: 'SUPPORT',
    stats: { vida: 7, lentitud: 1, ataque: 2 },
    color: '#38bdf8',
  },
};
