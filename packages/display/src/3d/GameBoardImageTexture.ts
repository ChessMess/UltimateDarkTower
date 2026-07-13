import * as THREE from 'three';
import { getBoardTextureRotation } from './boardTextureRotation';

// Resolve the board art via `new URL(..., import.meta.url)` rather than a default
// asset import: Vite's library mode base64-inlines default imports (and any
// `new URL` asset) regardless of `assetsInlineLimit`, which would bloat both JS
// bundles by ~28 MB. The library build intercepts this exact expression and emits
// the PNG as a separate file instead (see vite.config.ts → `emitAssetsAsFiles`,
// the same mechanism used for the bundled `.ogg` audio). esbuild, webpack 5+,
// Rollup, and Parcel each detect this `new URL` shape and emit the asset on the
// consumer side, so the default board texture still loads out of the box.
//
// `import.meta` can't be parsed by Jest's CommonJS transform, so this module is
// stubbed in jest.config.cjs (like the audio modules). The pure rotation math it
// needs lives in ./boardTextureRotation, which stays importable by tests.
const boardImageUrl = new URL('./assets/board.png', import.meta.url).href;

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
