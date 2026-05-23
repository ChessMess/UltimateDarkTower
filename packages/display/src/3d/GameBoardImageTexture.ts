import * as THREE from 'three';
import boardImageUrl from './assets/board.png';

/**
 * Base texture rotation (radians) that puts kingdom-0 at the +Z (camera-forward)
 * direction. Calibrated against the specific `board.png` shipped in `assets/`;
 * if the image is re-exported with a different orientation, retune this value.
 */
const BASE_NORTH_OFFSET = Math.PI / 1.35;

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
