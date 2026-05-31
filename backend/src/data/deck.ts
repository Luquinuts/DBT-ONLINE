import type { CardDef } from '@dbt-online/shared';

// ─── 52-Card Deck Factory ────────────────────────────────────────
// Card composition based on game rules (Phase 2 spec).

/**
 * Creates the default 52-card deck with all card types and correct quantities.
 * Cards are generated in a deterministic order; call shuffleDeck() to randomize.
 */
export function createDefaultDeck(): CardDef[] {
  const deck: CardDef[] = [];

  // ── 1. Carga de Ki ×15 ──────────────────────────────────────────
  for (let i = 1; i <= 15; i++) {
    deck.push({
      id: `carga_ki_${i}`,
      name: 'Carga de Ki',
      category: 'ACCION',
      effect: 'ki:1',
      description: 'Suma 1 ki al equipo',
    });
  }

  // ── 2. Esquive ×4 ───────────────────────────────────────────────
  for (let i = 1; i <= 4; i++) {
    deck.push({
      id: `esquive_${i}`,
      name: 'Esquive',
      category: 'ACCION',
      effect: 'defense:esquive',
      description: 'Esquiva un ataque normal',
      isDefense: true,
    });
  }

  // ── 3. Semilla Senzu ×2 ─────────────────────────────────────────
  for (let i = 1; i <= 2; i++) {
    deck.push({
      id: `semilla_senzu_${i}`,
      name: 'Semilla Senzu',
      category: 'ACCION',
      effect: 'heal:3',
      description: 'Recupera +3 de vida (máximo inicial)',
    });
  }

  // ── 4. +1 Vida ×10 ──────────────────────────────────────────────
  for (let i = 1; i <= 10; i++) {
    deck.push({
      id: `plus_vida_${i}`,
      name: '+1 de Vida',
      category: 'ACCION',
      effect: 'hp:1',
      description: 'Agrega +1 de vida a un personaje',
      isEquipable: true,
    });
  }

  // ── 5. Máquina del Tiempo ×2 ────────────────────────────────────
  for (let i = 1; i <= 2; i++) {
    deck.push({
      id: `maquina_tiempo_${i}`,
      name: 'Máquina del Tiempo',
      category: 'ACCION',
      effect: 'extra_turn:2',
      description:
        'Realizas 2 turnos seguidos. Al terminar cada turno agarras una carta.',
    });
  }

  // ── 6. ULTIMATE ×2 ──────────────────────────────────────────────
  for (let i = 1; i <= 2; i++) {
    deck.push({
      id: `ultimate_${i}`,
      name: 'ULTIMATE',
      category: 'ACCION',
      effect: 'ultimate_attack',
      description: 'Todos atacan sin lentitud. 2 usos por partida.',
      usageLimit: 2,
    });
  }

  // ── 7. Escudo ×4 ────────────────────────────────────────────────
  for (let i = 1; i <= 4; i++) {
    deck.push({
      id: `escudo_${i}`,
      name: 'Escudo',
      category: 'ACCION',
      effect: 'defense:escudo',
      description:
        'Cubre cualquier tipo de ataque (común, habilidad o definitiva)',
      isDefense: true,
      isEquipable: true,
    });
  }

  // ── 8. Nube Kinton ×2 ───────────────────────────────────────────
  for (let i = 1; i <= 2; i++) {
    deck.push({
      id: `nube_kinton_${i}`,
      name: 'Nube Kinton',
      category: 'ITEM',
      effect: 'attack_no_lentitud',
      description:
        'Atacas con un personaje sin lentitud. 1 uso por personaje.',
    });
  }

  // ── 9. Nave Espacial ×2 ─────────────────────────────────────────
  for (let i = 1; i <= 2; i++) {
    deck.push({
      id: `nave_espacial_${i}`,
      name: 'Nave Espacial',
      category: 'ITEM',
      effect: 'reroll_battlefield',
      description: 'Cambia aleatoriamente el campo de batalla.',
    });
  }

  // ── 10. Báculo Sagrado ×4 ──────────────────────────────────────
  for (let i = 1; i <= 4; i++) {
    deck.push({
      id: `baculo_sagrado_${i}`,
      name: 'Báculo Sagrado',
      category: 'ITEM',
      effect: 'direct_damage:1',
      description:
        'Quita 1 de daño a un personaje. No termina el turno. Rompe escudos.',
    });
  }

  // ── 11. Rage ×2 ─────────────────────────────────────────────────
  for (let i = 1; i <= 2; i++) {
    deck.push({
      id: `rage_${i}`,
      name: 'Rage',
      category: 'ITEM',
      effect: 'rage_boost',
      description:
        '+1 de Ataque a personajes con símbolo de mejora. Efecto permanente.',
    });
  }

  // ── 12. Super Carga de Ki ×2 ────────────────────────────────────
  for (let i = 1; i <= 2; i++) {
    deck.push({
      id: `super_carga_ki_${i}`,
      name: 'Super Carga de Ki',
      category: 'ACCION',
      effect: 'ki:2',
      description: 'Suma 2 ki al equipo',
    });
  }

  // ── 13. Esfera del Dragón ×1 ────────────────────────────────────
  deck.push({
    id: 'esfera_dragon_1',
    name: 'Esferas del Dragón',
    category: 'ITEM',
    effect: 'revive:full',
    description:
      'Revive un personaje a su estado inicial. 1 uso por partida.',
    usageLimit: 1,
  });

  return deck;
}

// ─── Shuffle (Fisher-Yates) ──────────────────────────────────────

/**
 * Shuffles a deck in place using the Fisher-Yates algorithm.
 * Returns the same array reference for chaining.
 */
export function shuffleDeck(deck: CardDef[]): CardDef[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// ─── Deal ─────────────────────────────────────────────────────────

/**
 * Deals `count` cards from the top of the deck.
 * Returns the drawn hand and the remaining deck.
 * The original deck array is mutated (spliced).
 */
export function dealCards(
  deck: CardDef[],
  count: number
): { hand: CardDef[]; remainingDeck: CardDef[] } {
  const hand = deck.splice(0, count);
  return { hand, remainingDeck: deck };
}

// ─── Deck Validation ─────────────────────────────────────────────

/**
 * Validates that a deck has the expected 52-card composition.
 * Returns `true` if valid, or a string describing the mismatch.
 */
export function validateDeckComposition(
  deck: CardDef[]
): true | string {
  if (deck.length !== 52) {
    return `Expected 52 cards, got ${deck.length}`;
  }

  const counts: Record<string, number> = {};
  for (const card of deck) {
    const key = card.effect.split(':')[0]; // group by effect base
    counts[key] = (counts[key] || 0) + 1;
  }

  const expected: Record<string, number> = {
    ki: 15 + 2, // Carga de Ki (15) + Super Carga de Ki (2)
    defense: 4 + 4, // Esquive (4) + Escudo (4)
    heal: 2, // Semilla Senzu (2)
    hp: 10, // +1 Vida (10)
    extra_turn: 2, // Máquina del Tiempo (2)
    ultimate_attack: 2, // ULTIMATE (2)
    attack_no_lentitud: 2, // Nube Kinton (2)
    reroll_battlefield: 2, // Nave Espacial (2)
    direct_damage: 4, // Báculo Sagrado (4)
    rage_boost: 2, // Rage (2)
    revive: 1, // Esfera del Dragón (1)
  };

  for (const [effectBase, expectedCount] of Object.entries(expected)) {
    const actual = counts[effectBase] || 0;
    if (actual !== expectedCount) {
      return `Expected ${expectedCount} cards with effect "${effectBase}", got ${actual}`;
    }
  }

  return true;
}
