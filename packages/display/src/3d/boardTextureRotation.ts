/**
 * Pure board-texture rotation math, kept free of any asset (`board.png`) import
 * so it can be unit-tested and imported without pulling in the `import.meta.url`
 * asset URL that lives in {@link ./GameBoardImageTexture}. Jest's CommonJS
 * transform can't parse `import.meta`, so isolating this math here lets tests
 * exercise the real rotation values while the loader module is stubbed.
 */

/**
 * Base texture rotation (radians) that puts the board's north section (kingdom-0)
 * at the +Z (camera-forward / tower-north) direction, so the board's north aligns
 * with the tower's north face. The `Math.PI / 1.35` term is the fine angular
 * calibration of the shipped `board.png` (its north isn't axis-aligned); the
 * `- Math.PI / 2` corrects a one-cardinal-step (90°) offset that previously left
 * the board's north pointing east. Retune if the image is re-exported.
 */
const BASE_NORTH_OFFSET = Math.PI / 1.35 - Math.PI / 2;

/** Returns the `texture.rotation` value for the chosen north-kingdom anchor. */
export function getBoardTextureRotation(northKingdom: 0 | 1 | 2 | 3): number {
  return BASE_NORTH_OFFSET + northKingdom * (Math.PI / 2);
}
