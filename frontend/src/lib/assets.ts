/**
 * Asset path resolvers for character / card / battlefield images.
 *
 * Naming convention (kebab-case .webp):
 *   characters/ → {character-id}.webp       e.g. ssj-god-goku.webp
 *   cards/      → {card-base}.png            e.g. carga-ki.png, esquive.png
 *   battlefields/ → {battlefield-id}.webp
 *
 * Images are served as WebP (converted from PNG originals) for ~99% size reduction.
 * Run `node scripts/convert-images.mjs` after adding new images.
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
  return `/images/characters/${characterId}.webp`;
}

/** Full-body character images for preview panels (fighting-game style). */
export function getCharacterFullImageSrc(characterId: string): string {
  return `/images/characters-full-image/${characterId}.webp`;
}

// ─── Character icon images ────────────────────────────────────────

/**
 * Character IDs match the icon filenames directly.
 * Drop a {character-id}.png in /public/images/icons/characters/ and it works.
 */
const characterIconFixes: Record<string, string> = {
  'ssj-rose-black-goku': 'black-goku',
};

export function getCharacterIconSrc(characterId: string): string {
  return `/images/icons/characters/${characterIconFixes[characterId] || characterId}.webp`;
}

// ─── Background images ────────────────────────────────────────────

export function getBackgroundSrc(name: string): string {
  return `/images/background/${name}.png`;
}

// ─── Battlefield images ───────────────────────────────────────────

export function getBattlefieldImageSrc(battlefieldId: string): string {
  return `/images/battlefields/${battlefieldId}.webp`;
}
