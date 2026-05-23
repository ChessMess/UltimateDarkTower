/**
 * Mulberry32 — small, fast, seedable PRNG. Returns a function compatible with
 * `Math.random` (a `() => number` in `[0, 1)`).
 *
 * Used by sequence snapshot recording / parity tests so flicker / sparkle
 * sequences produce deterministic output: identical seed → identical draws.
 *
 * Reference: https://stackoverflow.com/a/47593316
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
