import type * as THREE from 'three';
import type { DeepRequired } from '../3d/types';
import type { SkullCounts, SkullSealBuckets, SkullZone } from './skullCounts';
export type { DeepRequired };

/** Object form of `PhysicsConfig.seal.shakeSkullsOnSealRemoval`. */
export interface SealAutoShakeConfig {
  /**
   * Which skulls to shake when a seal breaks. `'nearest'` — only the skulls
   * `getSkullsBySeal()` reports behind that one seal. `'all'` — every
   * currently `inTower` skull, same as `shakeSkulls()`. Default `'nearest'`.
   */
  mode?: 'nearest' | 'all';
  /**
   * Shake-shaping override for this auto-shake. Any omitted field falls
   * back to the ambient `skull.*` config, read live at the moment the delay
   * (`seal.shakeSkullsOnSealRemovalDelaySeconds`) elapses.
   */
  shake?: { strength?: number };
}

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
    /**
     * When `false`, `bodyDesc.setCanSleep(false)` keeps the skull body
     * integrating forever instead of letting Rapier auto-sleep it once its
     * velocity drops near zero. A skull wedged in the tower's trimesh
     * interior can otherwise sleep permanently with nothing to wake it —
     * this trades a small perf cost (skulls never sleep) for fewer stuck
     * skulls. Default `true` (Rapier's normal auto-sleep behavior).
     *
     * Applies on next `dropSkull()`.
     */
    canSleep?: boolean;
    /**
     * Extra Rapier solver iterations for the skull body
     * (`bodyDesc.setAdditionalSolverIterations`), for firmer contact
     * resolution in tight trimesh gaps (funnel seams, drum/seal pinch
     * points) where a skull is prone to wedging. Default `0` (Rapier's
     * default iteration count).
     *
     * Applies on next `dropSkull()`.
     */
    additionalSolverIterations?: number;
    /**
     * Impulse-strength multiplier used by `shakeSkulls()` and
     * `shakeSelectedSkull()` when no per-call `options.strength` override is
     * given. Scales with body mass and model radius — see the handle's
     * JSDoc for the exact formula. Default `3`.
     */
    shakeStrength?: number;
    /**
     * Horizontal-push fraction of a shake's impulse, applied in the direction
     * radially outward from the tower's central axis through the skull's
     * current position — so a shake always nudges it away from the axis,
     * never a random direction. Shared by `shakeSkulls()` and
     * `shakeSelectedSkull()`. Default `0.5`. Live.
     */
    shakeHorizontalFactor?: number;
    /**
     * Upward-lift fraction of a shake's impulse. Combined with
     * `shakeHorizontalFactor` to shape the impulse direction — keep this
     * below `shakeHorizontalFactor` so the outward push dominates rather
     * than launching the skull straight up. Default `0.45`. Live.
     */
    shakeUpwardFactor?: number;
    /**
     * When true, clicking a live skull in the 3D view calls
     * `shakeSelectedSkull(id)` for the clicked skull — a "click a stuck
     * skull to nudge it free" interaction. Uses the view's pointer-target
     * seam internally; no camera/raycaster is exposed to the consumer.
     * Default `false`.
     *
     * Live — toggling registers/unregisters the pointer target immediately.
     */
    clickToShake?: boolean;
    /**
     * Called on a skull click before `clickToShake`. Return `true` to consume
     * the click (the skull is *not* shaken); `false`/`undefined` falls
     * through to shake-or-orbit. Uses the same pointer-target seam as
     * `clickToShake` — setting either one registers it.
     *
     * Live — toggling registers/unregisters the pointer target immediately.
     */
    onSkullClick?: (id: number, zone: SkullZone) => boolean | void;
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
    /**
     * Nearest-seal fallback for `getSkullsBySeal()`, used only when the
     * model doesn't supply all 12 authored `pocket_<side>_<level>` volumes
     * (ignored otherwise). Max distance from a seal node's center, as a
     * fraction of `modelRadius`, for an in-tower skull to count as behind
     * that seal — beyond it, the skull is `unattributed`. Live. Default
     * `0.25` (roughly half the stock model's inter-seal spacing).
     */
    attributionRadiusFactor?: number;
    /**
     * Auto-shake behavior when a seal transitions from intact to broken
     * (a host-driven `onSealsApplied` update, e.g. the example app's seal
     * toggle grid or a real game event). `false` disables it entirely.
     * `true` enables it with defaults (`mode: 'nearest'`, ambient
     * `skull.shakeStrength`). An object form overrides either independently.
     *
     * Waits `shakeSkullsOnSealRemovalDelaySeconds` after the seal breaks —
     * giving gravity a chance to clear the opening on its own — then
     * re-checks which skulls are still there and shakes only those:
     *
     * - `mode: 'nearest'` (default) shakes only the skulls
     *   {@link SkullPhysicsHandle.getSkullsBySeal} reports behind the seal
     *   that just broke, evaluated fresh after the delay — equivalent to
     *   `shakeSelectedSkull(bucket.ids)` for that one bucket.
     * - `mode: 'all'` shakes every currently `inTower` skull — equivalent to
     *   calling `shakeSkulls()`.
     * - `shake.strength`, when omitted, falls back to the current
     *   `skull.shakeStrength` (read live when the delay elapses, so it
     *   always matches whatever that leaf currently resolves to).
     *
     * Default `true`. Live.
     */
    shakeSkullsOnSealRemoval?: boolean | SealAutoShakeConfig;
    /**
     * Seconds to wait after a seal breaks before
     * `seal.shakeSkullsOnSealRemoval` checks which of its skulls actually
     * fell, and shakes only the ones that didn't. Measured in simulation
     * time (the same per-frame `dt` the physics step runs on), not a
     * wall-clock timer. Ignored when `shakeSkullsOnSealRemoval` is `false`.
     * Live. Default `0.25`.
     */
    shakeSkullsOnSealRemovalDelaySeconds?: number;
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
 * `DeepRequired`, but a handful of optional references (e.g. `skull.meshFactory`,
 * `seal.shakeSkullsOnSealRemoval`'s inner `shake.strength`) intentionally
 * remain nullable so "unset" (defer to another leaf's live value) is a
 * first-class state.
 */
export type ResolvedPhysicsConfig = Omit<DeepRequired<PhysicsConfig>, 'skull' | 'seal'> & {
  skull: Omit<
    DeepRequired<PhysicsConfig>['skull'],
    'meshFactory' | 'modelUrl' | 'density' | 'onSkullClick'
  > & {
    meshFactory: ((radius: number) => THREE.Object3D) | undefined;
    modelUrl: string | undefined;
    density: number | undefined;
    onSkullClick: ((id: number, zone: SkullZone) => boolean | void) | undefined;
  };
  seal: Omit<DeepRequired<PhysicsConfig>['seal'], 'shakeSkullsOnSealRemoval'> & {
    shakeSkullsOnSealRemoval: boolean | SealAutoShakeConfig;
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
   *
   * Returns the new skull's stable id (usable with `shakeSelectedSkull` /
   * `getSkullIdForObject`), or `null` when the drop was queued (init not
   * yet resolved, or a skull model still loading) or refused at
   * `skull.maxCount`.
   */
  dropSkull(): number | null;
  /**
   * Remove every active skull from the world immediately. Also cancels
   * any drops queued before init resolved. Safe to call at any time.
   */
  clearSkulls(): void;
  /**
   * Impulse-nudge every skull **currently classified `inTower`** (see
   * {@link getSkullCounts}) — the zone a wedged skull sits in. Skulls
   * `onBoard` or `inTransit` are untouched. Wakes sleeping bodies. Use this
   * to dislodge a skull stuck in the tower's interior geometry (funnel
   * seam, drum/seal pinch point) without touching the tower model itself.
   *
   * Impulse magnitude is `body.mass() * modelRadius * strength`, where
   * `strength` defaults to `skull.shakeStrength` (override via
   * `options.strength`). No-op before init resolves, after `dispose()`, or
   * when no skull is currently `inTower`.
   */
  shakeSkulls(options?: { strength?: number }): void;
  /**
   * Impulse-nudge one skull, or a batch of them, regardless of which zone
   * they're currently in — unlike `shakeSkulls()`, there is no `inTower`
   * filter, since skulls picked by id were selected deliberately (e.g. via
   * `skull.clickToShake`, or a {@link getSkullsBySeal} bucket's `ids`). Ids
   * not matching a live skull are silently skipped; an empty array is a
   * no-op. No-op before init resolves or after `dispose()`.
   */
  shakeSelectedSkull(id: number | number[], options?: { strength?: number }): void;
  /**
   * Walk `obj` up its parent chain looking for a live skull's root mesh
   * (matched via internal `userData` tagging) and return its id, or `null`
   * if `obj` isn't part of any live skull. Useful for wiring your own
   * picking/raycasting to `shakeSelectedSkull` instead of using the
   * built-in `skull.clickToShake` flag.
   */
  getSkullIdForObject(obj: THREE.Object3D): number | null;
  /**
   * Ids of every live skull currently classified in `zone` (see
   * {@link getSkullCounts}), ascending — oldest (lowest id) first. Cheap
   * (O(live skulls)); safe to poll every frame.
   */
  getSkullIds(zone: SkullZone): number[];
  /**
   * Despawn the skulls named in `ids` — same removal path as the OOB safety
   * net (mesh + collider freed, `ownsAssets` geometry disposed). Ids not
   * matching a live skull are silently skipped. Returns how many were
   * actually despawned. No-op (returns `0`) before init resolves or after
   * `dispose()`.
   */
  removeSkulls(ids: number[]): number;
  /**
   * Snapshot of where every live skull currently is. `total` always equals
   * `inTower + onBoard + inTransit`. `inTower` uses the radial signal
   * (center within the tower's measured shell/base outline); `onBoard`
   * uses the independent height signal (center resting at board level,
   * outside the base outline); anything ambiguous or in motion (falling
   * in, sliding down the base exterior, below-board pending despawn)
   * lands in `inTransit`, which is 0 whenever the sim is settled — so
   * `total - onBoard === inTower` exactly when the two signals agree.
   * `pending` (drops queued before init resolved) is reported separately
   * and excluded from `total`. Cheap (O(live skulls)); safe to poll every
   * frame.
   */
  getSkullCounts(): SkullCounts;
  /**
   * Breakdown of in-tower skulls by which seal opening they're behind, plus
   * an `unattributed` bucket for ones not near any opening (funnel, central
   * axis). `total` always equals `getSkullCounts().inTower`.
   *
   * Uses the model's authored `pocket_<side>_<level>` volumes when all 12 are
   * present (`mode: 'pocket'` — an exact point-in-box test); otherwise falls
   * back to nearest-seal-anchor attribution within
   * `seal.attributionRadiusFactor` (`mode: 'nearest'`, a heuristic). See
   * PHYSICS.md's "Counting skulls" section for the full picture.
   *
   * Pairs with `shakeSelectedSkull` to unstick exactly the skulls behind an
   * already-broken seal:
   * ```ts
   * const stuck = physics.getSkullsBySeal();
   * physics.shakeSelectedSkull(stuck.bySeal.filter((b) => b.broken).flatMap((b) => b.ids));
   * ```
   *
   * Returns `{ bySeal: [], unattributed: [], total: 0, mode: 'nearest' }`
   * before init resolves. Cheap (O(skulls × 12)); safe to poll every frame.
   */
  getSkullsBySeal(): SkullSealBuckets;
  /**
   * Get a deep-cloned snapshot of the current fully-resolved physics
   * config. Safe to mutate the result.
   */
  getPhysicsConfig(): ResolvedPhysicsConfig;
  /**
   * Apply a partial config on top of the current one. Live-tunable leaves
   * (frictions, damping, debug overlays, board radius, oob depth,
   * `seal.attributionRadiusFactor`, `seal.shakeSkullsOnSealRemoval`,
   * `seal.shakeSkullsOnSealRemovalDelaySeconds`, `skull.shakeStrength`,
   * `skull.shakeHorizontalFactor`, `skull.shakeUpwardFactor`) take effect
   * immediately; skull-body leaves (radius, friction, restitution, collider
   * shape, model URL, mesh factory) take effect on the next `dropSkull()`;
   * geometry leaves (drum half-height/inner radius, board thickness) are
   * only honored at attach time and are silently ignored otherwise.
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
