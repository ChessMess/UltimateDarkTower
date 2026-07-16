// budget — the single source of truth for the scenario image budget.
//
// This lived in BOTH decks/shared.ts and dungeons/shared.ts as independent copies, with
// boards/shared.ts re-exporting the dungeons one and AssetManagerDialog importing the decks one.
// Raising one and not the other silently desynced the deck meter from the board meter, so the
// constant now lives here and every shared.ts re-exports it. Neither decks nor dungeons owned it.

/** rough byte size of a stored string (data URLs are ASCII, so length ≈ bytes) */
export const byteLen = (s: string): number => s.length;

/**
 * Soft budget for all images in one scenario (library.resources.images), metered by the asset
 * manager. Not enforced anywhere — exceeding it degrades the experience, it doesn't break.
 *
 * The unit is data-URL characters. Base64 needs no JSON escaping, so those characters map ~1:1 to
 * bytes in the exported .json.
 *
 * Tracks the ~5 MB localStorage draft slot this number was chosen for. Raising it is gated on
 * drafts moving to IndexedDB *and* a durability story (storage.persist + export nudges): a large
 * scenario whose only copy sits in evictable browser storage is a data-loss risk that the small
 * budget currently masks.
 */
export const IMAGE_BUDGET_BYTES = 5_000_000;
