import * as THREE from 'three';
import { getBoardTextureRotation } from './boardTextureRotation';

// The board art is **consumer-supplied** via `TowerDisplayOptions.boardTextureUrl`
// (mirroring `modelUrl` for the tower GLB) — this module no longer imports it.
// The package still ships the PNG at `dist/3d/assets/board.png` via the
// `copyBoardAsset()` plugin in vite.config.ts, exactly as `copyTowerAsset()` does
// for `tower.glb`, so consumers can point their bundler at it.
//
// Why not a static `new URL('./assets/board.png', import.meta.url)`: Vite emits
// assets from the *transform* hook, before tree-shaking, so a static reference
// forced the 22 MB PNG into every downstream app's `dist/` whether it rendered a
// board or not (~90 MB across the deployed site).
//
// No test exercises real image-texture loading (three's TextureLoader is mocked
// and the ground disc falls back to the procedural texture), so this module is
// stubbed in vitest.config.ts's alias list (like the audio modules). The pure
// rotation math it needs lives in ./boardTextureRotation, which stays importable
// by tests directly.

/**
 * Load consumer-supplied board art as a texture for the ground disc. Returns
 * `null` on failure so callers can fall back to the procedural texture from
 * `GameBoardTexture.ts`.
 */
export async function buildBoardTextureFromImage(
  url: string,
  maxAnisotropy: number,
  northKingdom: 0 | 1 | 2 | 3 = 0,
): Promise<THREE.Texture | null> {
  try {
    const loader = new THREE.TextureLoader();
    const texture = await loader.loadAsync(url);
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
