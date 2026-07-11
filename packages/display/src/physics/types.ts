import type * as THREE from 'three';
import type { DeepRequired } from '../3d/types';
export type { DeepRequired };

/**
 * Nested, fully-optional physics configuration. Pass any subset to
 * `attachSkullPhysics` or `applyPhysicsConfig`; missing leaves fall back to
 * `DEFAULT_PHYSICS`. Grouped by domain (skull, drum, seal, static, board,
 * oob) to mirror how the lighting config is structured.
 */
export interface PhysicsConfig {
  /** Wireframe overlays for tuning. Live. */
  debug?: {
    /** Draw every active Rapier collider (world-wide overlay). */
    colliders?: boolean;
    /** Draw only the 12 kinematic seal/door colliders, colored by intact/broken. */
    sealColliders?: boolean;
  };
  /** The dynamic ball that gets dropped. */
  skull?: {
    /** Skull mesh radius as a fraction of `modelRadius`. Applies on next `dropSkull()`. */
    radiusFactor?: number;
    /** Friction on the skull body's collider. Applies on next `dropSkull()`. */
    friction?: number;
    /** Restitution (bounciness) on the skull body. Applies on next `dropSkull()`. */
    restitution?: number;
    /** Per-second exponential decay on angular velocity. Live. */
    angularDamping?: number;
    /** Per-second exponential decay on linear velocity. Live. */
    linearDamping?: number;
    /**
     * Maximum number of simultaneous skulls on the board. `dropSkull()` is a
     * no-op once this many skulls are live; existing skulls remain when this
     * is lowered (they're not retroactively despawned). Live.
     */
    maxCount?: number;
    /**
     * URL of a `.glb` model used as the skull's visual mesh. When set,
     * dropped skulls render as this model instead of the default sphere.
     * `.stl` URLs are accepted with a `console.warn` recommending re-export
     * to a Draco-compressed `.glb` for a much smaller download. A convex-hull
     * collider can be sourced from an optional `<basename>.hull.json` sidecar
     * (see `loadSkullModel`), falling back to a stride-sampled point cloud.
     *
     * Loading is async; setting/changing this defers subsequent
     * `dropSkull()` calls until the new model resolves. A subsequent
     * change cancels the previous in-flight load. The library caches
     * resolved templates module-globally — repeated attach/detach cycles
     * do not re-fetch.
     *
     * Ignored when `meshFactory` is also set.
     *
     * Applies on next `dropSkull()` (async — drops queued during load).
     */
    modelUrl?: string;
    /**
     * Physics collider shape. `'hull'` (default) derives a convex hull from
     * `modelUrl`'s point cloud; falls back to `'sphere'` with a `console.warn`
     * when `modelUrl` is unset or the hull is degenerate. `'sphere'` uses a
     * Rapier ball collider — preserves the existing physics tuning regardless
     * of the visual mesh.
     *
     * Hull dynamics may need re-tuning of friction/restitution.
     *
     * Applies on next `dropSkull()`.
     */
    colliderShape?: 'sphere' | 'hull';
    /**
     * Density override for the dynamic body. Only meaningful when
     * `colliderShape === 'hull'`: the loaded template carries an
     * auto-computed density that normalizes hull-skull mass to the
     * equivalent unit sphere, and this overrides it. Ignored for sphere
     * colliders (which use Rapier's default density of 1.0).
     *
     * Applies on next `dropSkull()`.
     */
    density?: number;
    /**
     * Per-spawn visual override. Receives the physics radius (world units)
     * and must return an `Object3D` whose local origin matches the body's
     * center of mass; it is position+quaternion-synced each frame. The
     * manager only calls `removeFromParent()` on despawn — the factory
     * owns geometry/material lifecycle and is expected to cache shared
     * assets across spawns.
     *
     * When set, the physics collider stays a sphere regardless of the
     * mesh's true shape — use `modelUrl` + `colliderShape: 'hull'` if you
     * need a derived hull collider.
     *
     * Note: a function value is silently dropped by `JSON.stringify`, so
     * `meshFactory` never roundtrips through JSON-paste flows — set it
     * programmatically via `attachSkullPhysics` or `applyPhysicsConfig`.
     *
     * Applies on next `dropSkull()`.
     */
    meshFactory?: (radius: number) => THREE.Object3D;
    /**
     * When true, the manager auto-calls `dropSkull()` once each time the
     * tower's `state.beam.count` increases between two consecutive
     * `applyState` calls. Matches the readout's "💀 Skull Drop!"
     * highlight trigger. Default `false` — host-driven drops via
     * `dropSkull()` are unaffected.
     *
     * Subscribes via `TowerPhysicsHooks.onStateApplied` and uses strict
     * `>` for the delta check, so re-feeding the same state does not
     * trigger a drop. Honors `skull.maxCount` like manual drops.
     *
     * Live — toggling takes effect on the next `applyState` callback.
     */
    autoDropOnSkullCountIncrease?: boolean;
  };
  /** The three rotating drums (kinematic trimesh per level). */
  drum?: {
    /** Drum interior radius as a fraction of `modelRadius`. Used for drop-jitter heuristics at drop time. */
    innerRadiusFactor?: number;
    /**
     * Drum interior half-height as a fraction of `modelRadius`. Currently unused —
     * reserved for future parametric drum walls; feeds only the discarded drum-wall
     * spec and has no runtime effect.
     */
    halfHeightFactor?: number;
    /** Friction on the kinematic drum trimesh (Min combine rule). Live. */
    friction?: number;
  };
  /** The 12 cardinal seal panels (kinematic trimesh per seal). */
  seal?: {
    /** Friction on the kinematic seal trimeshes (Min combine rule). Live. */
    friction?: number;
  };
  /** Non-drum, non-seal GLB mesh trimeshes (cone funnel, base, outer shell). */
  static?: {
    /** Friction on every static GLB trimesh (Min combine rule). Live. */
    friction?: number;
  };
  /** The game-board floor + hollow rim the skull lands on after exiting the tower. */
  board?: {
    /** Board floor cylinder radius as a fraction of `modelRadius`. Live. */
    radiusFactor?: number;
    /** Board floor thickness as a fraction of `modelRadius`. World-rebuild only. */
    thicknessFactor?: number;
    /** Friction on the game-board floor collider (Average combine rule). Live. */
    friction?: number;
  };
  /** Out-of-bounds safety sensor that despawns escaped skulls. */
  oob?: {
    /** Distance below `modelBottomY` as a fraction of `modelRadius`. Read every frame — live. */
    depthFactor?: number;
  };
}

/**
 * Fully-resolved physics config — every leaf has a value, returned from
 * `getPhysicsConfig()`. Most leaves drop `undefined` from their type via
 * `DeepRequired`, but a handful of optional references (e.g. `skull.meshFactory`)
 * intentionally remain nullable so "unset" is a first-class state.
 */
export type ResolvedPhysicsConfig = Omit<DeepRequired<PhysicsConfig>, 'skull'> & {
  skull: Omit<DeepRequired<PhysicsConfig>['skull'], 'meshFactory' | 'modelUrl' | 'density'> & {
    meshFactory: ((radius: number) => THREE.Object3D) | undefined;
    modelUrl: string | undefined;
    density: number | undefined;
  };
};

/**
 * Handle returned by `attachSkullPhysics`. Use `dropSkull` to spawn skulls (up
 * to `skull.maxCount`), `clearSkulls` to remove them all, and `dispose` to tear
 * down the physics world and remove all subscriptions.
 */
export interface SkullPhysicsHandle {
  /**
   * Add one skull above the top opening. Calls past the current
   * `skull.maxCount` are no-ops. Calls made before init resolves are
   * queued and replayed once it does.
   */
  dropSkull(): void;
  /**
   * Remove every active skull from the world immediately. Also cancels
   * any drops queued before init resolved. Safe to call at any time.
   */
  clearSkulls(): void;
  /**
   * Get a deep-cloned snapshot of the current fully-resolved physics
   * config. Safe to mutate the result.
   */
  getPhysicsConfig(): ResolvedPhysicsConfig;
  /**
   * Apply a partial config on top of the current one. Live-tunable leaves
   * (frictions, damping, debug overlays, board radius, oob depth) take effect
   * immediately; skull-body leaves (radius, friction, restitution,
   * collider shape, model URL, mesh factory) take effect on the next
   * `dropSkull()`; geometry leaves (drum half-height/inner radius, board
   * thickness) are only honored at attach time and are silently ignored
   * otherwise.
   *
   * `skull.modelUrl` changes are async — drops queued during a load are
   * replayed once the new model resolves. A second change cancels the
   * previous in-flight load.
   */
  applyPhysicsConfig(partial: PhysicsConfig): void;
  /**
   * Tear down the Rapier world, remove the skull, and unsubscribe from
   * frame and seal-state callbacks. Safe to call multiple times.
   */
  dispose(): void;
}
