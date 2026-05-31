/**
 * Asset path resolvers for character / card / battlefield images.
 *
 * Naming convention (kebab-case .png):
 *   characters/ → {character-id}.png       e.g. ssj-god-goku.png
 *   cards/      → {card-base}.png          e.g. carga-ki.png, esquive.png
 *   battlefields/ → {battlefield-id}.png
 *
 * IMPORTANT: these are publicly served from /images/. No build step needed —
 * drop the file and it works.
 */

// ─── Card images ──────────────────────────────────────────────────

/**
 * Card IDs in the deck are suffixed with an instance index:
 *   "carga_ki_1", "carga_ki_2", …, "esquive_1", …
 *
 * This strips the suffix and converts snake_case to kebab-case so
 * the file name matches `cards/carga-ki.png`.
 */
export function getCardImageSrc(cardId: string): string | null {
  // Strip trailing _{digits} — e.g. "carga_ki_1" → "carga_ki"
  const baseId = cardId.replace(/_\d+$/, '');
  if (!baseId) return null;

  const fileName = baseId.replace(/_/g, '-');
  return `/images/cards/${fileName}.png`;
}

// ─── Character images ─────────────────────────────────────────────

/**
 * Character IDs are already kebab-case (ssj-god-goku, golden-frieza, …).
 */
export function getCharacterImageSrc(characterId: string): string {
  return `/images/characters/${characterId}.png`;
}

// ─── Battlefield images ───────────────────────────────────────────

export function getBattlefieldImageSrc(battlefieldId: string): string {
  return `/images/battlefields/${battlefieldId}.png`;
}
