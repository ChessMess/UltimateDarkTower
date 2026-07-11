import * as THREE from 'three';
import boardImageUrl from './assets/board.png';

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

/**
 * Load the real Return to Dark Tower board art (`assets/board.png`) as a
 * texture for the ground disc. Returns `null` on failure so callers can fall
 * back to the procedural texture from `GameBoardTexture.ts`.
 */
export async function buildBoardTextureFromImage(
  maxAnisotropy: number,
  northKingdom: 0 | 1 | 2 | 3 = 0,
): Promise<THREE.Texture | null> {
  try {
    const loader = new THREE.TextureLoader();
    const texture = await loader.loadAsync(boardImageUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.max(1, maxAnisotropy);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.center.set(0.5, 0.5);
    texture.rotation = getBoardTextureRotation(northKingdom);
    texture.needsUpdate = true;
    return texture;
  } catch (err) {
    console.warn('[GameBoardImageTexture] failed to load board.png', err);
    return null;
  }
}
