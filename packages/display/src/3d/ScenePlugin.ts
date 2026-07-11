import type * as THREE from 'three';
import type { TowerState, TowerSide, SealIdentifier } from '../types';
import type { Tower3DView } from './Tower3DView';

/**
 * Generalized scene-plugin seam for {@link Tower3DView}.
 *
 * A `ScenePlugin` is an external object that owns 3D content inside the live
 * Three.js scene with a clean lifecycle and access to the scene, camera,
 * renderer, model bounds, the render loop, side changes, and pointer hit-tests.
 * It generalizes the one-off `getPhysicsHooks()` seam the skull-physics add-on
 * uses; in fact skull physics is now implemented on top of this seam (see
 * `src/physics/index.ts`).
 *
 * Attach with {@link attachScenePlugin}; detach with the returned handle.
 */

/** Bounds + root handed to plugins once the GLB model is in the scene. */
export interface ScenePluginModelInfo {
  /** The loaded model root Object3D. */
  root: THREE.Object3D;
  /** Bounding-sphere radius of the loaded GLB. */
  modelRadius: number;
  /** World-space Y of the model's bottom edge (after centering). */
  modelBottomY: number;
  /** World-space Y of the model's top edge (after centering). */
  modelTopY: number;
}

/**
 * A hit-testable pointer target a plugin can register so clicks on its objects
 * are consumed before the camera controller orbits. Hit-testing is wired through
 * `Tower3DView.registerPointerTarget` / the capture-phase pointer listener.
 */
export interface PointerTarget {
  /** Objects to raycast against (array, or a getter for dynamic sets). */
  objects: THREE.Object3D[] | (() => THREE.Object3D[]);
  /** Higher priority is tested first. Plugin targets should outrank camera controls. Default 0. */
  priority?: number;
  /** Return `true` to consume the event so camera controls do not act on it. */
  onPointerDown?(hit: THREE.Intersection, ev: PointerEvent): boolean | void;
  onPointerMove?(hit: THREE.Intersection | null, ev: PointerEvent): void;
  onPointerUp?(hit: THREE.Intersection | null, ev: PointerEvent): boolean | void;
}

/** Context handed to a scene plugin on attach. All references are live. */
export interface ScenePluginContext {
  /** The active Three.js scene; add your Object3Ds here. */
  scene: THREE.Scene;
  /** The active perspective camera the view renders with. */
  camera: THREE.PerspectiveCamera;
  /** The active WebGL renderer. */
  renderer: THREE.WebGLRenderer;
  /** Bounding-sphere radius of the loaded GLB. Defaults to 1 before load; updates live after load. */
  readonly modelRadius: number;
  /** World-space Y of the model's bottom edge. Updates live after load. */
  readonly modelBottomY: number;
  /** World-space Y of the model's top edge. Updates live after load. */
  readonly modelTopY: number;
  /** Returns the registered Object3D for a drum level, or `null` if absent. */
  drumNode(level: 'top' | 'middle' | 'bottom'): THREE.Object3D | null;
  /**
   * Register a per-frame callback invoked once per render tick (before render),
   * with `dt` in seconds. Shares the view's single per-frame clock read.
   * Returns an unsubscribe function.
   */
  registerFrameCallback(cb: (dtSeconds: number) => void): () => void;
  /** Fires after every `Tower3DView.applyState`, after the view's own update. Returns unsubscribe. */
  onStateApplied(cb: (state: TowerState) => void): () => void;
  /** Fires after every `Tower3DView.applySeals` with the broken-seal list. Returns unsubscribe. */
  onSealsApplied(cb: (broken: SealIdentifier[]) => void): () => void;
  /**
   * Fires once the GLB model has loaded and is in the scene. If the model is
   * already loaded when called, fires synchronously. Returns unsubscribe.
   */
  onModelLoaded(cb: (info: ScenePluginModelInfo) => void): () => void;
  /** Register a hit-testable pointer target (see {@link PointerTarget}). Returns unsubscribe. */
  registerPointerTarget(target: PointerTarget): () => void;
  /** Current cardinal side/focus. Returns `'north'` before the camera is ready. */
  getSide(): TowerSide;
  /** Side-change subscription mirroring `Tower3DView.onSideChange`. Returns unsubscribe. */
  onSideChange(cb: (side: TowerSide) => void): () => void;
  /** True once the GLB model has loaded. */
  isModelLoaded(): boolean;
}

export interface ScenePlugin {
  /** Stable identifier, used for diagnostics and de-duplication. */
  readonly id: string;
  /** Called once when attached. Build your Object3Ds and add them to `ctx.scene` here. */
  attach(ctx: ScenePluginContext): void;
  /** Optional: called on every `Tower3DView.applyState`, after the view's own update. */
  onStateApplied?(state: TowerState): void;
  /** Optional: called whenever broken seals change. */
  onSealsApplied?(brokenSeals: SealIdentifier[]): void;
  /** Optional: called once the GLB model has loaded (synchronously if already loaded). */
  onModelLoaded?(info: ScenePluginModelInfo): void;
  /** Optional per-frame update (alternative to `ctx.registerFrameCallback`); `dt` in seconds. */
  update?(dtSeconds: number): void;
  /** Remove everything you added; free geometries/materials/textures. */
  dispose(): void;
}

export interface ScenePluginHandle {
  readonly plugin: ScenePlugin;
  /** Detaches and disposes the plugin. Idempotent. */
  detach(): void;
}

/**
 * Attach a {@link ScenePlugin} to a {@link Tower3DView}. Calls `plugin.attach(ctx)`
 * once with a live context, fans out state/seal/model-load/side/frame events, and
 * returns a handle whose `detach()` removes the plugin and frees its subscriptions.
 *
 * Implementable from outside using only the public `Tower3DView`; it is a thin
 * wrapper over `view.registerScenePlugin(plugin)`.
 */
export function attachScenePlugin(view: Tower3DView, plugin: ScenePlugin): ScenePluginHandle {
  return view.registerScenePlugin(plugin);
}
