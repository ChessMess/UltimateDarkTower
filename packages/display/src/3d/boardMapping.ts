import * as THREE from 'three';
import { getBoardTextureRotation } from './boardTextureRotation';
import type { Tower3DView } from './Tower3DView';

/**
 * A normalized `[0,1]` anchor on the board image, as authored by the
 * location-marker tool. Image-y grows **downward** (top-left origin).
 */
export interface BoardAnchor {
  x: number;
  y: number;
}

/**
 * Ground-disc geometry — the exact shape returned by
 * {@link Tower3DView.getDiscMetrics}. `topY` is the top surface (where on-disc
 * content rests); `center` is the disc's geometric center on the Y axis.
 */
export interface DiscMetrics {
  center: THREE.Vector3;
  radius: number;
  topY: number;
}

function isView(target: DiscMetrics | Tower3DView): target is Tower3DView {
  return typeof (target as Tower3DView).getDiscMetrics === 'function';
}

/**
 * Map a normalized board-image anchor to its world position on the ground
 * disc's top surface, so a scene plugin can place a token/marker exactly where
 * the printed board art shows it.
 *
 * The mapping is derived to be faithful to how the board texture is actually
 * rendered: the full board image is mapped onto the disc's cylinder **top cap**,
 * centered at image-`(0.5, 0.5)` and rotated by
 * {@link getBoardTextureRotation `getBoardTextureRotation(northKingdom)`}
 * (`texture.flipY` is `true`, so texture-v = `1 - imageY`). Inverting that
 * rotation gives the cap UV, which THREE lays out as `vertex.x = r·sinθ`,
 * `vertex.z = r·cosθ` — hence the `gv → x`, `gu → z` mapping below and the
 * `2·radius` world scale. Because the texture is the *full* image, placement
 * depends only on the absolute anchor coords, not the board-circle calibration.
 *
 * `northKingdom` must match the disc's current setting (it shifts the texture
 * rotation by `nk·π/2`); the live-view overload reads it for you.
 */
export function anchorToWorld(
  anchor: BoardAnchor,
  discMetrics: DiscMetrics,
  northKingdom?: 0 | 1 | 2 | 3,
): THREE.Vector3;
export function anchorToWorld(anchor: BoardAnchor, view: Tower3DView): THREE.Vector3;
export function anchorToWorld(
  anchor: BoardAnchor,
  target: DiscMetrics | Tower3DView,
  northKingdom: 0 | 1 | 2 | 3 = 0,
): THREE.Vector3 {
  let disc: DiscMetrics;
  let nk: 0 | 1 | 2 | 3;
  if (isView(target)) {
    disc = target.getDiscMetrics();
    nk = target.getLightingConfig().boardDisc.northKingdom;
  } else {
    disc = target;
    nk = northKingdom;
  }

  const { center, radius: discR, topY } = disc;
  const R = getBoardTextureRotation(nk);
  const c = Math.cos(R);
  const s = Math.sin(R);

  const tu = anchor.x - 0.5;
  const tv = 1 - anchor.y - 0.5;
  const gu = c * tu - s * tv;
  const gv = s * tu + c * tv;
  const x = center.x + 2 * discR * gv;
  const z = center.z + 2 * discR * gu;
  return new THREE.Vector3(x, topY, z);
}
