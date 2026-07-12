import * as THREE from 'three';

type RAPIER_NS = typeof import('@dimforge/rapier3d-compat');
type RapierColliderDesc = import('@dimforge/rapier3d-compat').ColliderDesc;

/**
 * Pure helpers for turning a loaded `SkullTemplate` into per-spawn meshes
 * and Rapier collider descriptions. Rapier is injected as a parameter (not
 * imported) so this module is unit-testable without the WASM runtime.
 */

/**
 * Clone the unit-scale template `Object3D` and scale it to the per-spawn
 * radius. Geometry and material refs are shared by Three.js semantics —
 * the manager only `removeFromParent()`s the clone on despawn.
 */
export function cloneSkullMesh(template: THREE.Object3D, radius: number): THREE.Object3D {
  const clone = template.clone(true);
  clone.scale.setScalar(radius);
  return clone;
}

/**
 * Build a convex-hull `ColliderDesc` sized to `radius` from the loaded
 * template's unit-scale point cloud. Returns `null` if Rapier refused to
 * build a hull (degenerate input — fewer than 4 non-coplanar points). The
 * caller should fall back to a ball collider in that case.
 *
 * Sets friction, restitution, and density on the desc — callers should not
 * post-configure those independently.
 */
export function buildHullColliderDesc(
  RAPIER: RAPIER_NS,
  hullPoints: Float32Array,
  radius: number,
  friction: number,
  restitution: number,
  density: number,
): RapierColliderDesc | null {
  const n = hullPoints.length;
  if (n < 12) return null; // need at least 4 points × 3 components
  const scaled = new Float32Array(n);
  for (let i = 0; i < n; i++) scaled[i] = hullPoints[i] * radius;
  const desc = RAPIER.ColliderDesc.convexHull(scaled);
  if (!desc) return null;
  return desc.setFriction(friction).setRestitution(restitution).setDensity(density);
}
