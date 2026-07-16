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
 * THE UNIT IS EXPORT SIZE, not storage. Measured: base64 needs no JSON escaping, so data-URL
 * characters map ~1:1 to bytes in the exported .json (a 50 MB budget produces a ~50 MB file, of
 * which ~37 MB is decoded artwork). That is the number an author actually cares about — how big
 * the thing they share becomes.
 *
 * It was 5 MB because that was the localStorage quota the whole draft had to fit inside; the repo's
 * own docs called the ceiling at "roughly three arted boards". Scenarios now live in IndexedDB
 * (quota in the hundreds of MB), so storage no longer sets the limit.
 *
 * 50 MB is a portability judgement, not a technical one. Going much higher makes a scenario
 * impractical to share as one file — which is the point at which bundling the assets into a zip
 * (~33% smaller, base64→binary) starts being worth its cost.
 */
export const IMAGE_BUDGET_BYTES = 50_000_000;
