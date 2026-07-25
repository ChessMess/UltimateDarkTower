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

/** A linear impulse + torque impulse pair, in Rapier's `{x,y,z}` vector shape. */
export interface ShakeImpulse {
  linear: { x: number; y: number; z: number };
  torque: { x: number; y: number; z: number };
}

/**
 * Compute a randomized "shake" impulse for a skull body: an upward-biased
 * linear impulse (so it pops free rather than digging sideways into the
 * geometry it's wedged in) plus a small random spin. Magnitude scales with
 * body mass and model scale so the same `strength` reads as a gentle nudge
 * at any model size — `impulseMag = mass * modelRadius * strength`.
 *
 * Pure — `rng` defaults to `Math.random` but is injectable for deterministic
 * tests. Shared by `PhysicsManager.shakeSkulls()` and `shakeSelectedSkull()`.
 */
export function computeShakeImpulse(
  mass: number,
  modelRadius: number,
  strength: number,
  rng: () => number = Math.random,
): ShakeImpulse {
  const impulseMag = mass * modelRadius * strength;

  // Upward-biased random direction: strong +Y so a wedged skull pops
  // upward/free rather than just grinding sideways against the trimesh it's
  // stuck in, plus a random horizontal component for variety between shakes.
  const angle = rng() * Math.PI * 2;
  const horizontalFrac = 0.5;
  const upFrac = 1.0;

  const linear = {
    x: Math.cos(angle) * impulseMag * horizontalFrac,
    y: impulseMag * upFrac,
    z: Math.sin(angle) * impulseMag * horizontalFrac,
  };

  // Small random spin so a shaken skull doesn't move in perfect lockstep
  // with its neighbors when shakeSkulls() nudges several at once.
  const torqueMag = impulseMag * 0.15;
  const torque = {
    x: (rng() * 2 - 1) * torqueMag,
    y: (rng() * 2 - 1) * torqueMag,
    z: (rng() * 2 - 1) * torqueMag,
  };

  return { linear, torque };
}

/**
 * Walk `obj` up its parent chain looking for the skull id tagged on a live
 * skull's root mesh (`userData.skullId`, set by `PhysicsManager.dropSkull`).
 * Needed because a raycast hit lands on whatever descendant mesh the ray
 * touched — for a GLB-template or factory-supplied skull that's often a
 * child of the tagged root, not the root itself. Returns `null` if `obj`
 * isn't part of any live skull.
 *
 * Pure — only relies on `.userData` and `.parent`, so it's testable with
 * plain stub objects shaped like `THREE.Object3D`, no real three.js needed.
 */
export function findSkullIdForObject(obj: THREE.Object3D): number | null {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    const id = cur.userData?.skullId;
    if (typeof id === 'number') return id;
    cur = cur.parent;
  }
  return null;
}
