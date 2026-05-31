/**
 * Asset path resolvers for character / card / battlefield images.
 *
 * Naming convention (kebab-case .webp):
 *   characters/ → {character-id}.webp       e.g. ssj-god-goku.webp
 *   cards/      → {card-base}.webp          e.g. carga-ki.webp, esquive.webp
 *   battlefields/ → {battlefield-id}.webp
 *
 * IMPORTANT: these are publicly served from /images/ (next.config rewrites or
 * static public/ folder). No build step needed — drop the file and it works.
 */

// ─── Card images ──────────────────────────────────────────────────

/**
 * Card IDs in the deck are suffixed with an instance index:
 *   "carga_ki_1", "carga_ki_2", …, "esquive_1", …
 *
 * This strips the suffix and converts snake_case to kebab-case so
 * the file name matches `cards/carga-ki.webp`.
 */
export function getCardImageSrc(cardId: string): string | null {
  // Strip trailing _{digits} — e.g. "carga_ki_1" → "carga_ki"
  const baseId = cardId.replace(/_\d+$/, '');
  if (!baseId) return null;

  const fileName = baseId.replace(/_/g, '-');
  return `/images/cards/${fileName}.webp`;
}

// ─── Character images ─────────────────────────────────────────────

/**
 * Character IDs are already kebab-case (ssj-god-goku, golden-frieza, …).
 */
export function getCharacterImageSrc(characterId: string): string {
  return `/images/characters/${characterId}.webp`;
}

// ─── Battlefield images ───────────────────────────────────────────

export function getBattlefieldImageSrc(battlefieldId: string): string {
  return `/images/battlefields/${battlefieldId}.webp`;
}
