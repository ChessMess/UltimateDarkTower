// split / join — separate a scenario's image bytes from its authored structure.
//
// WHY: a scenario document carries its images inline as base64 data URLs in
// library.resources.images. Structure is a few KB; images are everything else (a single arted deck
// can be megabytes). The autosave debounce writes on every edit, so persisting the whole document
// each time means writing the entire image payload to disk over and over.
//
// The justification is BYTES TO DISK, not CPU. Measured on a 51.2 MB-budget document:
// JSON.stringify 73ms, structuredClone 23ms — not a stall. The argument is that pushing ~50 MB
// through an IndexedDB transaction every 800ms is an I/O, transaction-latency and disk-endurance
// problem. Anyone who benchmarks the CPU and finds it cheap has not refuted the reason this exists.
//
// The split is a PERSISTENCE-LAYER concern only. The in-memory document keeps images inline, so
// resolveImage, the five ref keys (artRef/backRef/bitmapSlice/masterBitmap/imageRef), the card
// renderer, and export/import all stay unchanged.

/**
 * Structural shape these helpers need — nothing but `library`.
 *
 * Deliberately minimal: the schema types `library` as an untyped bag, and this package must not
 * depend on an app's hand-written ScenarioDoc. No index signature, or a concrete interface like the
 * Creator's ScenarioDoc stops being assignable to it (TS won't widen an interface to one).
 */
export interface ScenarioDocLike {
  library?: unknown;
}

/** library.resources.images — imageId → data URL */
export type ImageMap = Record<string, string>;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Read library.resources.images by reference, or undefined. Never fabricates an object — callers
 *  use the identity of this value as the "images changed" signal, and a fresh {} would break that
 *  (see imagesOf() in the Creator, which fabricates and therefore must NOT be used for the check). */
export function readImages(doc: ScenarioDocLike | null | undefined): ImageMap | undefined {
  const library = asRecord(doc?.library);
  const resources = asRecord(library?.resources);
  return asRecord(resources?.images) as ImageMap | undefined;
}

/**
 * Extract library.resources.images out of `doc`.
 *
 * Returns the images map (by reference — no copy of the payload) and a document with it removed.
 * Empty containers are deleted on the way out, mirroring the Creator's updateResourceImage: an
 * emptied `resources` is dropped, and so is an emptied `library.resources`. Anything else under
 * `resources` (sounds/videos/documents) is left in the document untouched.
 *
 * The input document is not mutated.
 */
export function splitImages<T extends ScenarioDocLike>(doc: T): { doc: T; images: ImageMap } {
  const images = readImages(doc);
  if (!images) return { doc, images: {} };

  const library = { ...(asRecord(doc.library) ?? {}) };
  const resources = { ...(asRecord(library.resources) ?? {}) };
  delete resources.images;

  // Keep resources only if a sibling resource type (sounds/videos/documents) still lives there.
  if (Object.keys(resources).length > 0) library.resources = resources;
  else delete library.resources;

  const next = { ...doc, library } as T;
  // A library that held nothing but resources.images is now empty — drop it so the rejoined
  // document is byte-identical to the original rather than carrying `"library":{}`.
  if (Object.keys(library).length === 0) delete (next as ScenarioDocLike).library;

  return { doc: next, images };
}

/**
 * Reattach an images map onto a document produced by splitImages.
 *
 * MERGES into any existing `resources` rather than replacing it — the schema defines
 * resources.sounds / .videos / .documents alongside images. Nothing writes them today, so a
 * replace would look correct until the day someone does, then silently destroy their data.
 *
 * An empty map is a no-op: reattaching `{}` would resurrect `library.resources = {images:{}}` and
 * break both the "exports stay clean" invariant and byte-identical round-tripping.
 *
 * The input document is not mutated.
 */
export function joinImages<T extends ScenarioDocLike>(doc: T, images: ImageMap | undefined): T {
  if (!images || Object.keys(images).length === 0) return doc;

  const library = { ...(asRecord(doc.library) ?? {}) };
  const resources = { ...(asRecord(library.resources) ?? {}) };
  resources.images = images;
  library.resources = resources;
  return { ...doc, library } as T;
}

/** Size of an images map, in the same unit the Creator's asset meter uses: data-URL characters.
 *  Base64 needs no JSON escaping, so these map ~1:1 to bytes in the exported .json. */
export function measureImages(images: ImageMap | undefined): { bytes: number; count: number } {
  if (!images) return { bytes: 0, count: 0 };
  const ids = Object.keys(images);
  let bytes = 0;
  for (const id of ids) bytes += images[id].length;
  return { bytes, count: ids.length };
}
