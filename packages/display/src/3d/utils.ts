import * as THREE from 'three';
import {
  LED_LAYOUT,
  LEDGE_LED_LAYOUT,
  BASE1_LED_LAYOUT,
  BASE2_LED_LAYOUT,
  RED_LIGHT_LAYOUT,
  RING_AZIMUTH,
  CORNER_AZIMUTH,
  HDR_PROXY_SCALE,
} from './constants';

/**
 * Write the HDR-scaled version of `hex` into `target`. `hex` is treated
 * as sRGB and converted to linear by THREE.Color, then each linear channel is
 * multiplied by {@link HDR_PROXY_SCALE} so the result reads above the
 * UnrealBloomPass threshold (1.0). The proxy/halo materials are
 * `toneMapped: false` so the HDR value reaches the bloom selector as-is.
 */
export function applyHdrColor(target: THREE.Color, hex: number): void {
  const base = new THREE.Color(hex);
  target.setRGB(base.r * HDR_PROXY_SCALE, base.g * HDR_PROXY_SCALE, base.b * HDR_PROXY_SCALE);
}

const LED_Y_FRACTIONS = [
  LED_LAYOUT.topY,
  LED_LAYOUT.middleY,
  LED_LAYOUT.bottomY,
  LEDGE_LED_LAYOUT.y,
  BASE1_LED_LAYOUT.y,
  BASE2_LED_LAYOUT.y,
] as const;

export function polarToXZ(azimuth: number, r: number): { x: number; z: number } {
  return {
    x: Math.sin(azimuth) * r,
    z: Math.cos(azimuth) * r,
  };
}

export function computeRedLightPosition(
  layer: number,
  light: number,
  radius: number
): { x: number; y: number; z: number } {
  const isRing = layer < 3;
  const isLedge = layer === 3;
  const isBase1 = layer === 4;
  const r = radius * (isRing
    ? RED_LIGHT_LAYOUT.ringInsetRadius
    : isLedge
      ? LEDGE_LED_LAYOUT.radius
      : isBase1
        ? BASE1_LED_LAYOUT.radius
        : BASE2_LED_LAYOUT.radius);
  const baseAzimuth = isRing ? RING_AZIMUTH[light] : CORNER_AZIMUTH[light];
  const azimuthOffset = isLedge
    ? LEDGE_LED_LAYOUT.azimuthOffset
    : isBase1
      ? BASE1_LED_LAYOUT.azimuthOffset
      : !isRing
        ? BASE2_LED_LAYOUT.azimuthOffset
        : 0;
  const azimuth = baseAzimuth + azimuthOffset;
  const xzPos = polarToXZ(azimuth, r);
  return {
    x: xzPos.x,
    z: xzPos.z,
    y: radius * LED_Y_FRACTIONS[layer],
  };
}

/**
 * Compute the world position for a seal LED proxy — a point inside the drum at
 * the cardinal azimuth, between the central axis and the drum's inner wall.
 * Light shines from here through the drum surface (glyph/chute) then the seal.
 */
export function computeSealLedPose(
  layer: number,
  light: number,
  radius: number,
  radiusFactor: number,
): { position: { x: number; y: number; z: number } } {
  const y = radius * LED_Y_FRACTIONS[layer];
  const azimuth = RING_AZIMUTH[light];
  const inside = polarToXZ(azimuth, radius * radiusFactor);
  return {
    position: { x: inside.x, y, z: inside.z },
  };
}

export function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) {
        for (const m of mat) m.dispose();
      } else if (mat) {
        mat.dispose();
      }
    }
  });
  obj.removeFromParent();
}