import * as THREE from 'three';
import type { SealIdentifier, TowerPhysicsHooks, TowerState } from '../types';
import type { PointerTarget } from '../3d/ScenePlugin';
import type { PhysicsConfig, ResolvedPhysicsConfig } from './types';
import { resolvePhysics } from './PhysicsResolver';
import { buildStaticColliderSpecs } from './buildColliders';
import { loadSkullModel, type SkullTemplate } from './SkullModelLoader';
import {
  cloneSkullMesh,
  buildHullColliderDesc,
  computeShakeImpulse,
  findSkullIdForObject,
} from './SkullSpawner';
import {
  aggregateSkullCounts,
  classifySkull,
  bucketSkullsByPocket,
  bucketSkullsByNearestSeal,
  resolveSealRemovalShake,
  type SkullClassifyParams,
  type SkullCounts,
  type SealAnchor,
  type SealPocket,
  type SkullSealBuckets,
} from './skullCounts';

// Rapier is dynamic-imported inside init() so the WASM init runs once.
type RAPIER_NS = typeof import('@dimforge/rapier3d-compat');
type RapierWorld = import('@dimforge/rapier3d-compat').World;
type RapierRigidBody = import('@dimforge/rapier3d-compat').RigidBody;
type RapierCollider = import('@dimforge/rapier3d-compat').Collider;
type RapierColliderDesc = import('@dimforge/rapier3d-compat').ColliderDesc;

/**
 * Per-call scratch for `getSkullsBySeal()`'s seal-anchor position reads.
 * `invMatrix` isn't included here (unlike `drumStepScratch`'s `pos`/`quat`):
 * `getSkullsBySeal()` isn't a per-frame path, so its `Matrix4` is allocated
 * fresh per call instead, in `getSkullsBySeal()` itself.
 */
const sealBucketScratch = {
  pos: new THREE.Vector3(),
};

/** Per-frame scratch for sync'ing kinematic drum trimesh poses without alloc. */
const drumStepScratch = {
  pos: new THREE.Vector3(),
  quat: new THREE.Quaternion(),
};

/** Seal-wireframe color for intact (green) and broken (red) states. */
const SEAL_WIRE_COLOR_INTACT = 0x2dff52;
const SEAL_WIRE_COLOR_BROKEN = 0xff2e2e;

const SEAL_NAME_PREFIX = 'seal_';
const SEAL_SIDES = ['north', 'east', 'south', 'west'] as const;
const SEAL_LEVELS = ['top', 'middle', 'bottom'] as const;
type SealSide = (typeof SEAL_SIDES)[number];
type SealLevel = (typeof SEAL_LEVELS)[number];

function parseSealNode(name: string): { side: SealSide; level: SealLevel } | null {
  if (!name.startsWith(SEAL_NAME_PREFIX)) return null;
  const rest = name.slice(SEAL_NAME_PREFIX.length);
  const underscore = rest.indexOf('_');
  if (underscore < 0) return null;
  const side = rest.slice(0, underscore);
  const level = rest.slice(underscore + 1);
  if (!SEAL_SIDES.includes(side as SealSide)) return null;
  if (!SEAL_LEVELS.includes(level as SealLevel)) return null;
  return { side: side as SealSide, level: level as SealLevel };
}

const POCKET_NAME_PREFIX = 'pocket_';

/** Same `<side>_<level>` naming as `parseSealNode`, under the `pocket_` prefix. */
function parsePocketNode(name: string): { side: SealSide; level: SealLevel } | null {
  if (!name.startsWith(POCKET_NAME_PREFIX)) return null;
  const rest = name.slice(POCKET_NAME_PREFIX.length);
  const underscore = rest.indexOf('_');
  if (underscore < 0) return null;
  const side = rest.slice(0, underscore);
  const level = rest.slice(underscore + 1);
  if (!SEAL_SIDES.includes(side as SealSide)) return null;
  if (!SEAL_LEVELS.includes(level as SealLevel)) return null;
  return { side: side as SealSide, level: level as SealLevel };
}

interface DrumColliderRef {
  body: RapierRigidBody;
  collider: RapierCollider;
  node: THREE.Object3D;
}

interface SealColliderRef {
  body: RapierRigidBody;
  collider: RapierCollider;
  /** Visual seal node — its world transform drives the body each frame. */
  node: THREE.Object3D;
  /** Wireframe overlay for the seal-debug checkbox (visible toggled separately). */
  wireframe: THREE.LineSegments;
  /** Currently-applied material so we can swap it when broken state flips. */
  wireMat: THREE.LineBasicMaterial;
}

/** One authored `pocket_<side>_<level>` volume, for `getSkullsBySeal()`'s pocket mode. */
interface PocketRef {
  side: SealSide;
  level: SealLevel;
  /** Visual pocket node — its world matrix (inverted) maps a skull into local space. */
  node: THREE.Object3D;
  /** Local-space AABB of the pocket geometry. */
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

interface SkullRef {
  /** Stable id, monotonic and never reused — assigned at drop time, tagged onto `mesh.userData.skullId`. */
  id: number;
  body: RapierRigidBody;
  /** Widened from Mesh to Object3D so factory- and template-supplied meshes (Groups, hierarchies) work. */
  mesh: THREE.Object3D;
  /**
   * When true, the geometry and material are exclusively owned by this skull
   * and are disposed on despawn. Only set for the internal default-sphere
   * path; factory- or template-supplied meshes share assets with other
   * spawns, so the manager only calls `removeFromParent()` for those.
   */
  ownsAssets: boolean;
}

function sealKey(level: SealLevel, side: SealSide): string {
  return `${level}:${side}`;
}

/**
 * Owns the Rapier physics world and ties it to the Tower3DView via the hooks
 * surface. Public lifecycle: `init()` (async), `dropSkull()`, `dispose()`.
 */
export class PhysicsManager {
  private rapier: RAPIER_NS | null = null;
  private world: RapierWorld | null = null;
  /** Single source of truth for every tunable. Live-updated by applyPhysicsConfig. */
  private config: ResolvedPhysicsConfig;
  private readonly hooks: TowerPhysicsHooks;

  private unsubFrame: () => void = () => {};
  private unsubSeal: () => void = () => {};
  private unsubModel: () => void = () => {};
  private unsubState: () => void = () => {};
  /** Last seen `state.beam.count` — used to detect increases for auto-drop. */
  private prevBeamCount: number | null = null;

  private brokenSet: Set<string> = new Set();
  /** Running clock (seconds), advanced by `step(dt)` — drives the delayed recheck below. */
  private simClock = 0;
  /**
   * `seal.shakeSkullsOnSealRemoval`'s delayed recheck queue. `applyBrokenSeals`
   * pushes one entry per update that contains newly-broken seals; `step()`
   * removes and fires whichever entries are due each frame. Not assumed
   * sorted by `dueAt` — `delaySeconds` can change between two seal breaks
   * (it's a Live config leaf), so a later entry can come due before an
   * earlier one.
   */
  private pendingSealChecks: Array<{ dueAt: number; keys: Set<string> }> = [];
  private trimeshCount = 0;
  /** Kinematic drum trimesh bodies, keyed by drum level. */
  private drumColliders: Map<'top' | 'middle' | 'bottom', DrumColliderRef> = new Map();
  /** Kinematic seal trimesh bodies, keyed by `${level}:${side}`. */
  private sealColliders: Map<string, SealColliderRef> = new Map();
  /** Authored `pocket_<side>_<level>` volumes, keyed by `${level}:${side}`. Empty unless the model supplies them. */
  private pocketNodes: Map<string, PocketRef> = new Map();
  /** `'pocket'` once all 12 pocket nodes are found; `'nearest'` otherwise. Resolved once at model-ready. */
  private attributionMode: 'pocket' | 'nearest' = 'nearest';
  /** Fixed-body trimesh colliders for non-drum/non-seal GLB meshes. */
  private staticGlbColliders: RapierCollider[] = [];
  /** The game-board floor collider, set in buildStaticColliders. */
  private boardCollider: RapierCollider | null = null;
  /** The hollow-cylinder lip around the board's edge (trimesh of N segments). */
  private boardLipBody: RapierRigidBody | null = null;
  private boardLipCollider: RapierCollider | null = null;

  private skulls: SkullRef[] = [];
  /** Monotonic skull-id counter; ids are never reused, so a stale id simply no-ops. */
  private nextSkullId = 1;
  /** Unsubscribe for the `skull.clickToShake` pointer target, when registered. */
  private pointerTargetUnsub: (() => void) | null = null;
  /** Number of dropSkull() calls received before colliders were built. Drained on ready. */
  private pendingDrops = 0;
  /** Loaded skull-model template (null until first `modelUrl` resolves, or stays null if unset). */
  private skullTemplate: SkullTemplate | null = null;
  /** The URL the current `skullTemplate` came from, used to short-circuit no-op config updates. */
  private skullTemplateUrl: string | null = null;
  /** Increments on every `modelUrl` change; stale loads check this before assigning. */
  private skullLoadGen = 0;
  /** Aborts an in-flight `loadSkullModel` when the URL changes mid-load. */
  private skullLoadAbort: AbortController | null = null;
  private disposed = false;
  /** True once `onModelLoaded` has fired and colliders are built. */
  private ready = false;

  /** Snapshot of model bounds captured at model-load time. */
  private bounds: { modelRadius: number; modelBottomY: number; modelTopY: number } = {
    modelRadius: 1,
    modelBottomY: -1,
    modelTopY: 1,
  };
  /** Max radial extent of the 12 seal meshes — the shell at drum levels. Set once at model-ready. */
  private shellRadius: number | null = null;
  /** Min-over-azimuth radial extent of static geometry near board level — the base's narrowest outline. */
  private baseRadiusAtBoard: number | null = null;

  /** Debug-visualization line segments overlay (opt-in via config.debug.colliders). */
  private debugLines: THREE.LineSegments | null = null;

  constructor(hooks: TowerPhysicsHooks, config?: PhysicsConfig) {
    this.hooks = hooks;
    this.config = resolvePhysics(config);
  }

  /**
   * Lazy-init Rapier WASM, create the world, and subscribe to the view's
   * hooks. Collider construction is deferred until the GLB has loaded —
   * `onModelLoaded` then drives the actual build using real model bounds.
   */
  async init(): Promise<void> {
    if (this.disposed) return;
    const RAPIER = await import('@dimforge/rapier3d-compat');
    await RAPIER.init();
    if (this.disposed) return;
    this.rapier = RAPIER;

    // Default gravity scaled to a unit-radius model; rescaled on model-load.
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

    this.unsubFrame = this.hooks.onFrame((dt) => this.step(dt));
    this.unsubSeal = this.hooks.onSealsApplied((broken) => this.applyBrokenSeals(broken));
    this.unsubModel = this.hooks.onModelLoaded((info) => this.onModelReady(info));
    this.unsubState = this.hooks.onStateApplied((state) => this.handleStateApplied(state));

    // If the user supplied a skull modelUrl at attach time, kick the load off
    // now in parallel with the tower's GLB load. Drops queued before either
    // resolves stay in pendingDrops and drain when both are ready.
    if (this.config.skull.modelUrl) {
      this.startSkullModelLoad(this.config.skull.modelUrl);
    }

    this.updateClickToShakeRegistration();
  }

  /**
   * Kick off (or restart) a skull-model load. Each call bumps the generation
   * counter so any in-flight load resolving after a URL change is dropped on
   * the floor. Drains `pendingDrops` once the template is ready.
   */
  private startSkullModelLoad(url: string): void {
    const gen = ++this.skullLoadGen;
    this.skullLoadAbort?.abort();
    const abort = new AbortController();
    this.skullLoadAbort = abort;

    loadSkullModel(url, abort.signal).then(
      (template) => {
        if (this.disposed || gen !== this.skullLoadGen) return;
        this.skullTemplate = template;
        this.skullTemplateUrl = url;
        this.drainPendingDropsIfReady();
      },
      (err) => {
        if (gen !== this.skullLoadGen) return;
        if ((err as { name?: string })?.name === 'AbortError') return;

        console.error('[ultimatedarktowerdisplay/physics] skull model load failed', err);
      },
    );
  }

  /** Drain queued drops when both the GLB tower and (if configured) the skull template are ready. */
  private drainPendingDropsIfReady(): void {
    if (!this.ready) return;
    if (this.config.skull.modelUrl && !this.config.skull.meshFactory && !this.skullTemplate) return;
    while (this.pendingDrops > 0) {
      this.pendingDrops--;
      this.dropSkull();
    }
  }

  /**
   * Called once the host view's GLB model is loaded — at this point model
   * bounds and named drum/seal nodes are stable. Builds every static and
   * kinematic collider with correct dimensions, then drains any queued drop.
   */
  private onModelReady(info: {
    root: THREE.Object3D;
    modelRadius: number;
    modelBottomY: number;
    modelTopY: number;
  }): void {
    if (this.disposed || !this.rapier || !this.world) return;
    if (this.ready) return;
    this.ready = true;

    this.bounds = {
      modelRadius: info.modelRadius,
      modelBottomY: info.modelBottomY,
      modelTopY: info.modelTopY,
    };

    // Rescale gravity to the real model radius. Rapier's World ctor took the
    // placeholder; mutate `gravity` to match the now-known scale.
    this.world.gravity = { x: 0, y: -info.modelRadius * 9.81, z: 0 };

    this.buildStaticColliders();
    this.buildGlbTrimeshColliders(info.root);
    if (this.config.debug.colliders) this.buildDebugOverlay();
    // Apply seal-debug overlay visibility if it was set before colliders existed.
    this.applySealDebugVisibility();

    this.drainPendingDropsIfReady();
  }

  /**
   * Spawn one skull just above the top of the tower. No-op once
   * `skull.maxCount` is reached. If init() hasn't resolved yet, the drop
   * is queued until it does.
   *
   * Returns the new skull's stable id, or `null` when the drop was queued
   * or refused at `maxCount`.
   */
  dropSkull(): number | null {
    if (this.disposed) return null;
    if (!this.rapier || !this.world || !this.ready) {
      this.pendingDrops++;
      return null;
    }
    // Defer when a model URL is set but the template hasn't resolved yet.
    // `meshFactory` short-circuits this (it doesn't need a template).
    if (this.config.skull.modelUrl && !this.config.skull.meshFactory && !this.skullTemplate) {
      this.pendingDrops++;
      return null;
    }
    if (this.skulls.length >= this.config.skull.maxCount) return null;

    const id = this.nextSkullId++;
    const RAPIER = this.rapier;
    const R = this.bounds.modelRadius;
    const r = R * this.config.skull.radiusFactor;
    const spawnY = this.bounds.modelTopY + R * 0.02;

    // Drop somewhere over the top opening, not straight down the axis. The
    // opening is roughly the drum's inner radius wide; jitter within a disc
    // sized as a fraction of it, minus the skull's own radius, so the whole
    // skull (not just its center) clears the rim instead of skimming the edge.
    const openingRadius = R * this.config.drum.innerRadiusFactor;
    const jitterMax = Math.max(0, openingRadius * 0.35 - r);
    const jitterAngle = Math.random() * Math.PI * 2;
    const jitterRadius = Math.sqrt(Math.random()) * jitterMax;
    const spawnX = Math.cos(jitterAngle) * jitterRadius;
    const spawnZ = Math.sin(jitterAngle) * jitterRadius;

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(spawnX, spawnY, spawnZ)
      .setCcdEnabled(true)
      .setAngularDamping(this.config.skull.angularDamping)
      .setLinearDamping(this.config.skull.linearDamping)
      .setCanSleep(this.config.skull.canSleep)
      .setAdditionalSolverIterations(this.config.skull.additionalSolverIterations);
    const body = this.world.createRigidBody(bodyDesc);

    // Collider dispatch: hull only when we have a loaded template AND the
    // user asked for it. Factory mode forces sphere — no model data to hull.
    let colliderDesc: RapierColliderDesc | null = null;
    if (
      !this.config.skull.meshFactory &&
      this.skullTemplate &&
      this.config.skull.colliderShape === 'hull'
    ) {
      const density = this.config.skull.density ?? this.skullTemplate.density;
      colliderDesc = buildHullColliderDesc(
        RAPIER,
        this.skullTemplate.hullPoints,
        r,
        this.config.skull.friction,
        this.config.skull.restitution,
        density,
      );
      if (!colliderDesc) {
        console.warn(
          '[ultimatedarktowerdisplay/physics] convex hull degenerate, falling back to ball',
        );
      }
    }
    if (!colliderDesc) {
      colliderDesc = RAPIER.ColliderDesc.ball(r)
        .setFriction(this.config.skull.friction)
        .setRestitution(this.config.skull.restitution);
      if (this.config.skull.density !== undefined) {
        colliderDesc.setDensity(this.config.skull.density);
      }
    }
    this.world.createCollider(colliderDesc, body);

    let mesh: THREE.Object3D;
    let ownsAssets = false;
    if (this.config.skull.meshFactory) {
      mesh = this.config.skull.meshFactory(r);
    } else if (this.skullTemplate) {
      mesh = cloneSkullMesh(this.skullTemplate.template, r);
    } else {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6, metalness: 0.1 }),
      );
      sphere.castShadow = true;
      ownsAssets = true;
      mesh = sphere;
    }
    mesh.position.set(spawnX, spawnY, spawnZ);
    mesh.userData.skullId = id;
    this.hooks.scene.add(mesh);

    this.skulls.push({ id, body, mesh, ownsAssets });
    return id;
  }

  /**
   * Remove every active skull from the world and cancel any queued drops.
   * Safe to call before init resolves.
   */
  clearSkulls(): void {
    if (this.disposed) return;
    this.pendingDrops = 0;
    this.despawnAllSkulls();
  }

  /** Tear down the Rapier world and release all references. Safe to re-call. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.unsubFrame();
    this.unsubSeal();
    this.unsubModel();
    this.unsubState();
    this.unsubFrame = () => {};
    this.unsubSeal = () => {};
    this.unsubModel = () => {};
    this.unsubState = () => {};
    this.skullLoadAbort?.abort();
    this.skullLoadAbort = null;
    this.pointerTargetUnsub?.();
    this.pointerTargetUnsub = null;

    this.despawnAllSkulls();

    if (this.debugLines) {
      this.debugLines.removeFromParent();
      this.debugLines.geometry.dispose();
      (this.debugLines.material as THREE.Material).dispose();
      this.debugLines = null;
    }

    for (const [, ref] of this.sealColliders) {
      ref.wireframe.removeFromParent();
      ref.wireframe.geometry.dispose();
      ref.wireMat.dispose();
    }
    this.sealColliders.clear();

    // Rapier's World owns all rigid bodies and colliders; calling free()
    // releases the WASM memory in one go.
    this.world?.free();
    this.world = null;
    this.rapier = null;
    this.brokenSet.clear();
    this.pendingSealChecks.length = 0;
    this.drumColliders.clear();
    this.staticGlbColliders.length = 0;
    this.boardCollider = null;
    this.boardLipBody = null;
    this.boardLipCollider = null;
    this.shellRadius = null;
    this.baseRadiusAtBoard = null;
    this.pocketNodes.clear();
    this.attributionMode = 'nearest';
  }

  /**
   * Snapshot of where every live skull currently is. `total` always equals
   * `inTower + onBoard + inTransit`. `inTower` uses the radial signal (center
   * within the tower's measured shell/base outline); `onBoard` uses the
   * independent height signal (center resting at board level, outside the
   * base outline); anything ambiguous or in motion (falling in, sliding down
   * the base exterior, below-board pending despawn) lands in `inTransit`,
   * which is 0 whenever the sim is settled — so `total - onBoard ===
   * inTower` exactly when the two signals agree. `pending` (drops queued
   * before init resolved) is reported separately and excluded from `total`,
   * since those skulls haven't spawned yet. Cheap (O(live skulls)); safe to
   * poll every frame.
   */
  getSkullCounts(): SkullCounts {
    const pending = this.pendingDrops;
    const total = this.skulls.length;
    if (!this.world || !this.ready || total === 0) {
      return { total, inTower: 0, onBoard: 0, inTransit: total, pending };
    }
    return aggregateSkullCounts(
      this.skulls.map((s) => s.body.translation()),
      this.classifyParams(),
      pending,
    );
  }

  /**
   * Breakdown of in-tower skulls by which seal opening they're behind, plus
   * an `unattributed` bucket for ones that aren't near any opening (funnel,
   * central axis). `total` always equals `getSkullCounts().inTower`.
   *
   * Uses the model's authored `pocket_<side>_<level>` volumes when all 12 are
   * present (`mode: 'pocket'` — an exact point-in-box test, correct under
   * drum rotation whether or not the pocket is drum-parented); otherwise
   * falls back to nearest-seal-anchor attribution within
   * `seal.attributionRadiusFactor` (`mode: 'nearest'`), a heuristic. See
   * PHYSICS.md's "Counting skulls" section for the full picture.
   *
   * Pair with `shakeSelectedSkull` to unstick exactly the skulls behind an
   * already-broken seal:
   * ```ts
   * const stuck = physics.getSkullsBySeal();
   * physics.shakeSelectedSkull(stuck.bySeal.filter((b) => b.broken).flatMap((b) => b.ids));
   * ```
   *
   * No-op-shaped before init resolves or with no live skulls: returns
   * `{ bySeal: [], unattributed: [], total: 0, mode: 'nearest' }`. Cheap
   * (O(skulls × 12)); safe to poll every frame.
   */
  getSkullsBySeal(): SkullSealBuckets {
    if (!this.world || !this.ready) {
      return { bySeal: [], unattributed: [], total: 0, mode: 'nearest' };
    }

    const skulls = this.skulls.map((s) => {
      const t = s.body.translation();
      return { id: s.id, x: t.x, y: t.y, z: t.z };
    });
    const params = this.classifyParams();

    if (this.attributionMode === 'pocket') {
      // Not a per-frame path (unlike drumStepScratch) — allocating one
      // Matrix4 per call, reused across all 12 pockets, is fine.
      const invMatrix = new THREE.Matrix4();
      const pockets: SealPocket[] = [];
      for (const level of SEAL_LEVELS) {
        for (const side of SEAL_SIDES) {
          const ref = this.pocketNodes.get(sealKey(level, side));
          if (!ref) continue;
          invMatrix.copy(ref.node.matrixWorld).invert();
          pockets.push({
            side,
            level,
            broken: this.brokenSet.has(sealKey(level, side)),
            inverseWorld: invMatrix.toArray(),
            min: ref.min,
            max: ref.max,
          });
        }
      }
      return bucketSkullsByPocket(skulls, pockets, params);
    }

    const anchors: SealAnchor[] = [];
    for (const level of SEAL_LEVELS) {
      for (const side of SEAL_SIDES) {
        const ref = this.sealColliders.get(sealKey(level, side));
        if (!ref) continue;
        ref.node.getWorldPosition(sealBucketScratch.pos);
        anchors.push({
          side,
          level,
          broken: this.brokenSet.has(sealKey(level, side)),
          x: sealBucketScratch.pos.x,
          y: sealBucketScratch.pos.y,
          z: sealBucketScratch.pos.z,
        });
      }
    }
    const maxDistance = this.bounds.modelRadius * this.config.seal.attributionRadiusFactor;
    return bucketSkullsByNearestSeal(skulls, anchors, params, maxDistance);
  }

  /**
   * Impulse-nudge every skull currently classified `inTower` (see
   * `classifySkull` in skullCounts.ts) — the zone a skull wedged in the
   * tower's interior geometry (funnel seam, drum/seal pinch point) sits in.
   * Skulls `onBoard` or `inTransit` are left untouched. No-op before init
   * resolves, after `dispose()`, or when no skull is currently `inTower`.
   */
  shakeSkulls(options?: { strength?: number }): void {
    if (this.disposed || !this.world || !this.ready || this.skulls.length === 0) return;
    const strength = options?.strength ?? this.config.skull.shakeStrength;
    const params = this.classifyParams();
    for (const s of this.skulls) {
      if (classifySkull(s.body.translation(), params) !== 'inTower') continue;
      this.applyShakeImpulse(s.body, strength);
    }
  }

  /**
   * Impulse-nudge one skull, or a batch of them, regardless of their current
   * zone — unlike `shakeSkulls()`, there is no `inTower` filter, since a
   * deliberately-selected skull (e.g. via `skull.clickToShake`, or a
   * `getSkullsBySeal()` bucket's `ids`) should shake wherever it is. Ids not
   * matching a live skull are silently skipped; an empty array is a no-op.
   * No-op before init resolves or after `dispose()`.
   */
  shakeSelectedSkull(id: number | number[], options?: { strength?: number }): void {
    if (this.disposed || !this.world || !this.ready) return;
    const wanted = new Set(Array.isArray(id) ? id : [id]);
    if (wanted.size === 0) return;
    const strength = options?.strength ?? this.config.skull.shakeStrength;
    for (const s of this.skulls) {
      if (wanted.has(s.id)) this.applyShakeImpulse(s.body, strength);
    }
  }

  /** Walk `obj` up its parent chain to find a live skull's tagged id, or `null`. */
  getSkullIdForObject(obj: THREE.Object3D): number | null {
    return findSkullIdForObject(obj);
  }

  private applyShakeImpulse(body: RapierRigidBody, strength: number): void {
    const { linear, torque } = computeShakeImpulse(
      body.mass(),
      this.bounds.modelRadius,
      strength,
      body.translation(),
      this.config.skull.shakeHorizontalFactor,
      this.config.skull.shakeUpwardFactor,
    );
    body.applyImpulse(linear, true);
    body.applyTorqueImpulse(torque, true);
  }

  /** Shared zone-classification bounds, consumed by `getSkullCounts` and `shakeSkulls`. */
  private classifyParams(): SkullClassifyParams {
    const fallbackRadius = this.bounds.modelRadius * 0.33;
    return {
      shellRadius: this.shellRadius ?? fallbackRadius,
      baseRadiusAtBoard: this.baseRadiusAtBoard ?? this.shellRadius ?? fallbackRadius,
      boardTopY: this.bounds.modelBottomY,
      modelTopY: this.bounds.modelTopY,
      skullRadius: this.bounds.modelRadius * this.config.skull.radiusFactor,
    };
  }

  /**
   * Register or unregister the `skull.clickToShake` pointer target to match
   * the current config. Registering twice, or unregistering when not
   * registered, is a safe no-op.
   */
  private updateClickToShakeRegistration(): void {
    if (this.config.skull.clickToShake) {
      if (this.pointerTargetUnsub) return;
      const target: PointerTarget = {
        objects: () => this.skulls.map((s) => s.mesh),
        // Outrank the camera's orbit controls (priority 0) so a skull click
        // shakes it instead of starting an orbit drag.
        priority: 10,
        onPointerDown: (hit) => {
          const id = this.getSkullIdForObject(hit.object);
          if (id === null) return false;
          this.shakeSelectedSkull(id);
          return true;
        },
      };
      this.pointerTargetUnsub = this.hooks.registerPointerTarget(target);
    } else {
      this.pointerTargetUnsub?.();
      this.pointerTargetUnsub = null;
    }
  }

  // ── internals ──────────────────────────────────────────────────────────

  private buildStaticColliders(): void {
    if (!this.rapier || !this.world) return;
    const RAPIER = this.rapier;
    const world = this.world;

    const specs = buildStaticColliderSpecs({
      modelRadius: this.bounds.modelRadius,
      modelBottomY: this.bounds.modelBottomY,
      modelTopY: this.bounds.modelTopY,
      config: this.config,
    });

    // Board floor: a thin cylinder collider matching the visual disc's
    // shape (round, axis-aligned to Y). Radius comes directly from the
    // resolved config (synced to the host app's visual board-size slider).
    {
      const halfThick = specs.boardFloor.thickness / 2;
      const desc = RAPIER.RigidBodyDesc.fixed().setTranslation(
        0,
        specs.boardFloor.y - halfThick,
        0,
      );
      const body = world.createRigidBody(desc);
      const cd = RAPIER.ColliderDesc.cylinder(halfThick, specs.boardFloor.radius)
        .setFriction(this.config.board.friction)
        .setRestitution(this.config.skull.restitution);
      this.boardCollider = world.createCollider(cd, body);
    }

    // OOB safety net: a Y-coordinate check in `step()` despawns skulls that
    // fall below the board (e.g. through a physics glitch). No collider is
    // built for it — `step()` reads `config.oob.depthFactor` directly for the
    // threshold, so the precomputed `specs.oobSensor` is currently unused.
    void specs.oobSensor;

    // Drum inner walls are no longer authored parametrically — the trimesh
    // colliders built from the GLB body (in buildGlbTrimeshColliders) provide
    // the real outer shell with cutouts at cardinal slot positions. Doors
    // (built separately as kinematic bodies) close those cutouts when sealed.
    void specs.drumWalls;

    // Board lip: a hollow vertical ring (trimesh) around the board edge that
    // prevents skulls from rolling off. Initial radius matches the floor.
    this.rebuildBoardLip();
  }

  /**
   * (Re)build the board-edge lip — a trimesh of `N` quads around the perimeter
   * of the board floor, like a short cylindrical rim. Called at world build
   * time and whenever the board radius changes via `applyPhysicsConfig`.
   */
  private rebuildBoardLip(): void {
    if (!this.rapier || !this.world) return;
    const RAPIER = this.rapier;
    const world = this.world;

    if (this.boardLipBody) {
      world.removeRigidBody(this.boardLipBody);
      this.boardLipBody = null;
      this.boardLipCollider = null;
    }

    const R = this.bounds.modelRadius;
    const radius = R * this.config.board.radiusFactor;
    const lipHeight = R * 0.06;
    const y0 = this.bounds.modelBottomY;
    const y1 = y0 + lipHeight;
    const N = 48;

    // 2N ring vertices: (bottom_i, top_i) alternating around the circle.
    const verts = new Float32Array(2 * N * 3);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      const o = i * 6;
      verts[o + 0] = x;
      verts[o + 1] = y0;
      verts[o + 2] = z;
      verts[o + 3] = x;
      verts[o + 4] = y1;
      verts[o + 5] = z;
    }
    // 2N triangles (two per segment) → 6N index entries.
    const indices = new Uint32Array(N * 6);
    for (let i = 0; i < N; i++) {
      const bot_i = i * 2;
      const top_i = i * 2 + 1;
      const bot_n = ((i + 1) % N) * 2;
      const top_n = ((i + 1) % N) * 2 + 1;
      const o = i * 6;
      indices[o + 0] = bot_i;
      indices[o + 1] = top_i;
      indices[o + 2] = bot_n;
      indices[o + 3] = top_i;
      indices[o + 4] = top_n;
      indices[o + 5] = bot_n;
    }

    const bodyDesc = RAPIER.RigidBodyDesc.fixed();
    const body = world.createRigidBody(bodyDesc);
    const cd = RAPIER.ColliderDesc.trimesh(verts, indices)
      .setFriction(this.config.board.friction)
      .setRestitution(this.config.skull.restitution);
    const collider = world.createCollider(cd, body);
    this.boardLipBody = body;
    this.boardLipCollider = collider;
  }

  /**
   * Walk the loaded GLB root and create one Rapier trimesh collider per
   * THREE.Mesh:
   *   - Static meshes (non-drum, non-seal): fixed body, vertices baked into
   *     world space.
   *   - Drums (`drum_*`): kinematic-position-based body that tracks the
   *     visual drum's transform each frame, with vertices in the drum's
   *     local frame (scale baked in via worldScale at build time).
   *   - Seals (`seal_*`): skipped — handled by the kinematic door colliders
   *     and the seal-state listener.
   *
   * Also measures `shellRadius`/`baseRadiusAtBoard` from the same vertex
   * data, for `getSkullCounts()`'s zone classification.
   */
  private buildGlbTrimeshColliders(root: THREE.Object3D): void {
    if (!this.rapier || !this.world) return;
    const RAPIER = this.rapier;
    const world = this.world;

    // Make sure every transform is current before we read matrixWorld.
    root.updateMatrixWorld(true);

    // Measured alongside collider construction, for getSkullCounts()'s zone
    // classification: the seal-mesh extent gives the shell radius at drum
    // levels; the static-mesh extent in the bottom band gives the base's
    // narrowest outline at board height (binned by azimuth since the base
    // skirt is not rotationally symmetric — see skullCounts.ts).
    const measureScratch = new THREE.Vector3();
    let maxSealRadial = -1;
    const BASE_BAND_AZIMUTH_BINS = 16;
    const baseBandMaxByBin = new Float32Array(BASE_BAND_AZIMUTH_BINS).fill(-1);
    const baseBandCutoffY =
      this.bounds.modelBottomY + 0.05 * (this.bounds.modelTopY - this.bounds.modelBottomY);

    let staticBuilt = 0;
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;

      const name = mesh.name ?? '';
      const geom = mesh.geometry;
      if (!geom) return;
      const posAttr = geom.getAttribute('position') as THREE.BufferAttribute | undefined;
      if (!posAttr || posAttr.count === 0) return;

      const drumLevel = parseDrumLevel(name);
      if (drumLevel) {
        this.buildDrumTrimesh(mesh, drumLevel, posAttr, geom);
        return;
      }

      const sealId = parseSealNode(name);
      if (sealId) {
        for (let i = 0; i < posAttr.count; i++) {
          measureScratch.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
          measureScratch.applyMatrix4(mesh.matrixWorld);
          const radial = Math.hypot(measureScratch.x, measureScratch.z);
          if (radial > maxSealRadial) maxSealRadial = radial;
        }
        this.buildSealTrimesh(mesh, sealId, posAttr, geom);
        return;
      }

      // Authored seal-attribution marker (see /physics's getSkullsBySeal): never
      // collides and never feeds the shell/base measurement below — just record
      // its local AABB and world-tracking node for a later point-in-box test.
      const pocketId = parsePocketNode(name);
      if (pocketId) {
        geom.computeBoundingBox();
        const box = geom.boundingBox;
        if (box) {
          this.pocketNodes.set(sealKey(pocketId.level, pocketId.side), {
            side: pocketId.side,
            level: pocketId.level,
            node: mesh,
            min: { x: box.min.x, y: box.min.y, z: box.min.z },
            max: { x: box.max.x, y: box.max.y, z: box.max.z },
          });
        }
        return;
      }

      // Static mesh: bake matrixWorld into the vertices and create a fixed
      // body at world origin.
      const v = new THREE.Vector3();
      const verts = new Float32Array(posAttr.count * 3);
      for (let i = 0; i < posAttr.count; i++) {
        v.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        v.applyMatrix4(mesh.matrixWorld);
        verts[i * 3 + 0] = v.x;
        verts[i * 3 + 1] = v.y;
        verts[i * 3 + 2] = v.z;

        if (v.y <= baseBandCutoffY) {
          const radial = Math.hypot(v.x, v.z);
          const azimuth = Math.atan2(v.z, v.x); // (-PI, PI]
          const bin = Math.min(
            BASE_BAND_AZIMUTH_BINS - 1,
            Math.floor(((azimuth + Math.PI) / (2 * Math.PI)) * BASE_BAND_AZIMUTH_BINS),
          );
          if (radial > baseBandMaxByBin[bin]) baseBandMaxByBin[bin] = radial;
        }
      }
      const indices = extractIndices(geom, posAttr.count);

      const bodyDesc = RAPIER.RigidBodyDesc.fixed();
      const body = world.createRigidBody(bodyDesc);
      const cd = RAPIER.ColliderDesc.trimesh(verts, indices)
        .setFriction(this.config.static.friction)
        .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
        .setRestitution(this.config.skull.restitution);
      const collider = world.createCollider(cd, body);
      this.staticGlbColliders.push(collider);
      staticBuilt++;
    });

    this.trimeshCount = staticBuilt;

    if (maxSealRadial >= 0) this.shellRadius = maxSealRadial;
    let minBaseRadial = -1;
    for (const binMax of baseBandMaxByBin) {
      if (binMax >= 0 && (minBaseRadial < 0 || binMax < minBaseRadial)) minBaseRadial = binMax;
    }
    if (minBaseRadial >= 0) this.baseRadiusAtBoard = minBaseRadial;

    this.resolveAttributionMode();
  }

  /**
   * Decide `getSkullsBySeal()`'s attribution mode from what the GLB actually
   * supplied: `'pocket'` only when all 12 `pocket_<side>_<level>` volumes were
   * found, `'nearest'` otherwise. A partial set (some but not all 12) warns
   * with the missing names, mirroring `SealManager.warnOnMissing()`; zero
   * pockets is the ordinary case for a model that hasn't authored any and
   * warrants no warning.
   */
  private resolveAttributionMode(): void {
    if (this.pocketNodes.size === 12) {
      this.attributionMode = 'pocket';
    } else {
      this.attributionMode = 'nearest';
      if (this.pocketNodes.size > 0) {
        const missing: string[] = [];
        for (const level of SEAL_LEVELS) {
          for (const side of SEAL_SIDES) {
            if (!this.pocketNodes.has(sealKey(level, side))) {
              missing.push(`${POCKET_NAME_PREFIX}${side}_${level}`);
            }
          }
        }
        console.warn(
          `[ultimatedarktowerdisplay/physics] ${missing.length} pocket node(s) missing from the ` +
            `loaded model; falling back to nearest-seal attribution for getSkullsBySeal(). ` +
            `Missing: ${missing.join(', ')}.`,
        );
      }
    }
    console.info(
      `[ultimatedarktowerdisplay/physics] seal attribution mode: ${this.attributionMode}`,
    );
  }

  /**
   * Build one kinematic-position-based trimesh for a drum mesh. Vertices are
   * extracted in the drum's local frame so the kinematic body's pose (synced
   * to the visual drum each frame in `step`) carries them with it. Static
   * world scale is baked in here since scale doesn't animate.
   */
  private buildDrumTrimesh(
    mesh: THREE.Mesh,
    level: 'top' | 'middle' | 'bottom',
    posAttr: THREE.BufferAttribute,
    geom: THREE.BufferGeometry,
  ): void {
    if (!this.rapier || !this.world) return;
    const RAPIER = this.rapier;
    const world = this.world;

    const worldScale = new THREE.Vector3();
    mesh.getWorldScale(worldScale);

    const verts = new Float32Array(posAttr.count * 3);
    for (let i = 0; i < posAttr.count; i++) {
      verts[i * 3 + 0] = posAttr.getX(i) * worldScale.x;
      verts[i * 3 + 1] = posAttr.getY(i) * worldScale.y;
      verts[i * 3 + 2] = posAttr.getZ(i) * worldScale.z;
    }
    const indices = extractIndices(geom, posAttr.count);

    const wp = new THREE.Vector3();
    const wq = new THREE.Quaternion();
    mesh.getWorldPosition(wp);
    mesh.getWorldQuaternion(wq);

    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(wp.x, wp.y, wp.z)
      .setRotation({ x: wq.x, y: wq.y, z: wq.z, w: wq.w });
    const body = world.createRigidBody(bodyDesc);
    const cd = RAPIER.ColliderDesc.trimesh(verts, indices)
      .setFriction(this.config.drum.friction)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
      .setRestitution(this.config.skull.restitution);
    const collider = world.createCollider(cd, body);

    this.drumColliders.set(level, { body, collider, node: mesh });
  }

  /**
   * Build a kinematic trimesh collider for a single seal mesh. The body's pose
   * tracks the visual seal node's world transform every frame (so it rotates
   * with its drum if the GLB has it parented to one, or stays put if not).
   * The collider is enabled/disabled by `applyBrokenSeals`.
   */
  private buildSealTrimesh(
    mesh: THREE.Mesh,
    id: { side: 'north' | 'east' | 'south' | 'west'; level: 'top' | 'middle' | 'bottom' },
    posAttr: THREE.BufferAttribute,
    geom: THREE.BufferGeometry,
  ): void {
    if (!this.rapier || !this.world) return;
    const RAPIER = this.rapier;
    const world = this.world;

    const worldScale = new THREE.Vector3();
    mesh.getWorldScale(worldScale);

    const verts = new Float32Array(posAttr.count * 3);
    for (let i = 0; i < posAttr.count; i++) {
      verts[i * 3 + 0] = posAttr.getX(i) * worldScale.x;
      verts[i * 3 + 1] = posAttr.getY(i) * worldScale.y;
      verts[i * 3 + 2] = posAttr.getZ(i) * worldScale.z;
    }
    const indices = extractIndices(geom, posAttr.count);

    const wp = new THREE.Vector3();
    const wq = new THREE.Quaternion();
    mesh.getWorldPosition(wp);
    mesh.getWorldQuaternion(wq);

    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(wp.x, wp.y, wp.z)
      .setRotation({ x: wq.x, y: wq.y, z: wq.z, w: wq.w });
    const body = world.createRigidBody(bodyDesc);
    const cd = RAPIER.ColliderDesc.trimesh(verts, indices)
      .setFriction(this.config.seal.friction)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
      .setRestitution(this.config.skull.restitution);
    const collider = world.createCollider(cd, body);

    // Wireframe overlay for the seal-debug checkbox. Built once; the seal
    // body's pose drives its transform each frame so it follows the visual
    // seal even when broken (and thus invisible) and when the drum rotates.
    const wireGeom = new THREE.WireframeGeometry(geom);
    const wireMat = new THREE.LineBasicMaterial({
      color: SEAL_WIRE_COLOR_INTACT,
      depthTest: false,
      transparent: true,
      opacity: 0.95,
    });
    const wireframe = new THREE.LineSegments(wireGeom, wireMat);
    wireframe.renderOrder = 1000;
    wireframe.visible = false;
    // Apply the same scale once so the wireframe matches the seal mesh.
    wireframe.scale.copy(worldScale);
    this.hooks.scene.add(wireframe);

    this.sealColliders.set(sealKey(id.level, id.side), {
      body,
      collider,
      node: mesh,
      wireframe,
      wireMat,
    });
  }

  /** Per-frame: update kinematic poses, step world, sync skull mesh. */
  private step(dt: number): void {
    if (!this.world || !this.ready) return;
    const R = this.bounds.modelRadius;

    this.simClock += dt;
    if (this.pendingSealChecks.length > 0) {
      const due: Array<{ keys: Set<string> }> = [];
      this.pendingSealChecks = this.pendingSealChecks.filter((entry) => {
        if (entry.dueAt > this.simClock) return true;
        due.push(entry);
        return false;
      });
      for (const entry of due) this.autoShakeOnSealRemoval(entry.keys);
    }

    // Drums (kinematic trimesh): mirror the visual drum node's world transform.
    const wp = drumStepScratch.pos;
    const wq = drumStepScratch.quat;
    for (const [, ref] of this.drumColliders) {
      ref.node.getWorldPosition(wp);
      ref.node.getWorldQuaternion(wq);
      ref.body.setNextKinematicTranslation({ x: wp.x, y: wp.y, z: wp.z });
      ref.body.setNextKinematicRotation({ x: wq.x, y: wq.y, z: wq.z, w: wq.w });
    }

    // Seals (kinematic trimesh): also track the visual seal node's world
    // transform. Whether the seal rotates with the drum depends on the GLB
    // hierarchy; either way, the body matches what the user sees.
    for (const [, ref] of this.sealColliders) {
      ref.node.getWorldPosition(wp);
      ref.node.getWorldQuaternion(wq);
      ref.body.setNextKinematicTranslation({ x: wp.x, y: wp.y, z: wp.z });
      ref.body.setNextKinematicRotation({ x: wq.x, y: wq.y, z: wq.z, w: wq.w });
      if (this.config.debug.sealColliders) {
        ref.wireframe.position.set(wp.x, wp.y, wp.z);
        ref.wireframe.quaternion.set(wq.x, wq.y, wq.z, wq.w);
      }
    }

    // Rapier's step uses its own fixed timestep internally; `dt` is unused for
    // numerical integration but is reserved for future variable-step modes.
    void dt;
    this.world.step();

    // Reverse iteration so OOB-driven splices don't perturb the walk.
    const oobY = this.bounds.modelBottomY - R * this.config.oob.depthFactor;
    for (let i = this.skulls.length - 1; i >= 0; i--) {
      const s = this.skulls[i];
      const t = s.body.translation();
      s.mesh.position.set(t.x, t.y, t.z);
      const r = s.body.rotation();
      s.mesh.quaternion.set(r.x, r.y, r.z, r.w);
      if (t.y < oobY) this.despawnSkullAt(i);
    }

    if (this.debugLines) this.updateDebugOverlay();
  }

  /**
   * Build a `THREE.LineSegments` overlay backed by Rapier's `world.debugRender`
   * output. Useful for verifying collider placement against the visual model
   * during tuning.
   */
  private buildDebugOverlay(): void {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(0), 4));
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const lines = new THREE.LineSegments(geom, mat);
    lines.renderOrder = 999;
    (lines.material as THREE.LineBasicMaterial).depthTest = false;
    this.hooks.scene.add(lines);
    this.debugLines = lines;
  }

  private updateDebugOverlay(): void {
    if (!this.world || !this.debugLines) return;
    const buf = this.world.debugRender();
    // Rapier returns interleaved (x, y, z) vertex pairs and (r, g, b, a) colors.
    const posAttr = this.debugLines.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.debugLines.geometry.getAttribute('color') as THREE.BufferAttribute;
    if (posAttr.array.length !== buf.vertices.length) {
      this.debugLines.geometry.setAttribute('position', new THREE.BufferAttribute(buf.vertices, 3));
      this.debugLines.geometry.setAttribute('color', new THREE.BufferAttribute(buf.colors, 4));
    } else {
      (posAttr.array as Float32Array).set(buf.vertices);
      (colAttr.array as Float32Array).set(buf.colors);
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }
    this.debugLines.geometry.computeBoundingSphere();
  }

  /**
   * Return a deep-cloned snapshot of the fully-resolved physics config.
   * Safe to mutate the result.
   */
  getPhysicsConfig(): ResolvedPhysicsConfig {
    return structuredClone(this.config);
  }

  /**
   * Apply a partial physics config on top of the current one. Live-tunable
   * leaves (debug overlays, frictions, damping, board radius/friction, oob
   * depth) take effect immediately; skull-body leaves (radius, friction,
   * restitution) take effect on the next `dropSkull()`; geometry leaves
   * (drum sizes, board thickness) only matter at world-build time and are
   * silently ignored after that.
   */
  applyPhysicsConfig(partial: PhysicsConfig): void {
    if (this.disposed) return;
    const prev = this.config;
    this.config = resolvePhysics(partial, prev);

    // Apply live-tunable changes. We compare against `prev` so we only do
    // work when a value actually changed — most ticks of a slider only
    // touch one leaf.
    if (this.config.drum.friction !== prev.drum.friction) {
      for (const [, ref] of this.drumColliders) ref.collider.setFriction(this.config.drum.friction);
    }
    if (this.config.seal.friction !== prev.seal.friction) {
      for (const [, ref] of this.sealColliders) ref.collider.setFriction(this.config.seal.friction);
    }
    if (this.config.static.friction !== prev.static.friction) {
      for (const c of this.staticGlbColliders) c.setFriction(this.config.static.friction);
    }
    if (this.config.board.friction !== prev.board.friction) {
      this.boardCollider?.setFriction(this.config.board.friction);
      this.boardLipCollider?.setFriction(this.config.board.friction);
    }
    if (this.config.board.radiusFactor !== prev.board.radiusFactor) {
      if (this.boardCollider) {
        this.boardCollider.setRadius(this.bounds.modelRadius * this.config.board.radiusFactor);
      }
      if (this.boardLipBody) {
        // Trimesh radius isn't mutable; rebuild from scratch.
        this.rebuildBoardLip();
      }
    }
    if (this.config.skull.angularDamping !== prev.skull.angularDamping) {
      for (const s of this.skulls) s.body.setAngularDamping(this.config.skull.angularDamping);
    }
    if (this.config.skull.linearDamping !== prev.skull.linearDamping) {
      for (const s of this.skulls) s.body.setLinearDamping(this.config.skull.linearDamping);
    }
    if (this.config.debug.sealColliders !== prev.debug.sealColliders) {
      this.applySealDebugVisibility();
    }
    if (this.config.skull.clickToShake !== prev.skull.clickToShake) {
      this.updateClickToShakeRegistration();
    }
    if (this.config.skull.modelUrl !== prev.skull.modelUrl) {
      // URL changed: cancel any in-flight load, drop the old template, and
      // either start a new load or leave the manager in sphere-default mode.
      this.skullLoadAbort?.abort();
      this.skullLoadAbort = null;
      this.skullTemplate = null;
      this.skullTemplateUrl = null;
      if (this.config.skull.modelUrl) {
        this.startSkullModelLoad(this.config.skull.modelUrl);
      }
    }
    if (
      this.config.skull.colliderShape === 'hull' &&
      !this.config.skull.modelUrl &&
      prev.skull.colliderShape !== 'hull'
    ) {
      console.warn(
        '[ultimatedarktowerdisplay/physics] colliderShape: "hull" requires a modelUrl — ' +
          'next drop will fall back to a ball collider.',
      );
    }
    // Note: `debug.colliders` toggles the full Rapier debug overlay. We
    // build it lazily at attach time only — flipping it on later would
    // require allocating the overlay mesh mid-flight, which we don't
    // currently support. Document it as attach-time only.
  }

  private applySealDebugVisibility(): void {
    const visible = this.config.debug.sealColliders;
    for (const [, ref] of this.sealColliders) {
      ref.wireframe.visible = visible;
    }
  }

  /**
   * Fires on every host `applyState`. When `skull.autoDropOnSkullCountIncrease`
   * is enabled, a strict increase in `state.beam.count` triggers one
   * `dropSkull()`. Tracks `prevBeamCount` even when the flag is off so a
   * stale delta doesn't fire spuriously after re-enabling.
   */
  private handleStateApplied(state: TowerState): void {
    const count = state.beam.count;
    if (
      this.config.skull.autoDropOnSkullCountIncrease &&
      this.prevBeamCount !== null &&
      count > this.prevBeamCount
    ) {
      this.dropSkull();
    }
    this.prevBeamCount = count;
  }

  /** Apply broken-seal updates by toggling seal collider enablement. */
  private applyBrokenSeals(broken: SealIdentifier[]): void {
    if (!this.world) return;
    const newBroken = new Set<string>(broken.map((b) => sealKey(b.level, b.side)));
    const newlyBroken = new Set<string>();

    for (const [key, ref] of this.sealColliders) {
      const isBroken = newBroken.has(key);
      const wasBroken = this.brokenSet.has(key);
      if (isBroken !== wasBroken) {
        ref.collider.setEnabled(!isBroken);
        ref.wireMat.color.setHex(isBroken ? SEAL_WIRE_COLOR_BROKEN : SEAL_WIRE_COLOR_INTACT);
        if (isBroken) newlyBroken.add(key);
      }
    }
    this.brokenSet = newBroken;

    if (newlyBroken.size === 0) return;
    if (this.config.seal.shakeSkullsOnSealRemoval === false) return;
    const dueAt = this.simClock + this.config.seal.shakeSkullsOnSealRemovalDelaySeconds;
    this.pendingSealChecks.push({ dueAt, keys: newlyBroken });
  }

  /**
   * `seal.shakeSkullsOnSealRemoval` — fires once per queued
   * `pendingSealChecks` entry, `delaySeconds` after the seals in `keys`
   * transitioned from intact to broken. Re-evaluates `getSkullsBySeal()` at
   * fire time (not at break time), so it shakes only whichever of those
   * skulls are still there — the ones that didn't fall on their own during
   * the wait. `keys` are `sealKey(level, side)` strings.
   */
  private autoShakeOnSealRemoval(keys: Set<string>): void {
    const decision = resolveSealRemovalShake(
      this.config.seal.shakeSkullsOnSealRemoval,
      (seal) => keys.has(sealKey(seal.level, seal.side)),
      () => this.getSkullsBySeal().bySeal,
      this.config.skull.shakeStrength,
    );
    if (!decision) return;
    if (decision.mode === 'all') {
      this.shakeSkulls({ strength: decision.strength });
    } else {
      this.shakeSelectedSkull(decision.ids, { strength: decision.strength });
    }
  }

  private despawnSkullAt(index: number): void {
    if (!this.world) return;
    const skull = this.skulls[index];
    if (!skull) return;
    this.world.removeRigidBody(skull.body);
    skull.mesh.removeFromParent();
    if (skull.ownsAssets) {
      skull.mesh.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (!m.isMesh) return;
        m.geometry.dispose();
        const mat = m.material;
        if (Array.isArray(mat)) {
          for (const x of mat) x.dispose();
        } else {
          mat.dispose();
        }
      });
    }
    this.skulls.splice(index, 1);
  }

  private despawnAllSkulls(): void {
    for (let i = this.skulls.length - 1; i >= 0; i--) {
      this.despawnSkullAt(i);
    }
  }
}

const DRUM_NAME_PREFIX = 'drum_';

function parseDrumLevel(name: string): 'top' | 'middle' | 'bottom' | null {
  if (!name.startsWith(DRUM_NAME_PREFIX)) return null;
  const rest = name.slice(DRUM_NAME_PREFIX.length);
  if (rest === 'top' || rest === 'middle' || rest === 'bottom') return rest;
  return null;
}

function extractIndices(geom: THREE.BufferGeometry, vertexCount: number): Uint32Array {
  const idx = geom.getIndex();
  if (idx) {
    const out = new Uint32Array(idx.count);
    for (let i = 0; i < idx.count; i++) out[i] = idx.getX(i);
    return out;
  }
  // Non-indexed: vertices are already laid out as sequential triangles.
  const out = new Uint32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) out[i] = i;
  return out;
}
