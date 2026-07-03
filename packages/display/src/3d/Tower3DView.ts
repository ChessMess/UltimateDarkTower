import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { LIGHT_EFFECTS, TOWER_AUDIO_LIBRARY } from 'ultimatedarktower';
import type { TowerState, SealIdentifier, TowerSide } from 'ultimatedarktower';

import type { ITowerDisplay, TowerPhysicsHooks } from '../types';
import type {
  ScenePlugin,
  ScenePluginContext,
  ScenePluginHandle,
  ScenePluginModelInfo,
  PointerTarget,
} from './ScenePlugin';
import { injectStyles } from '../styles';
import { SideButtons } from '../shared/SideButtons';
import { DrumRotationAudio } from '../audio/DrumRotationAudio';
import { TowerSampleAudio } from '../audio/TowerSampleAudio';
import { CALIBRATION_SOUND_URL } from '../audio/calibrationAudio';
import { DRUM_ROTATION_SOUND_URL } from '../audio/drumRotationSound';
import { DEFAULT_TOWER_SOUND_PACK } from '../audio/audioLibrary';
import { DEFAULT_SEQUENCE_AUDIO_MAP } from '../audio/sequenceAudio';
import type { SoundPack } from '../audio/soundPack';

import type { LightingConfig, ResolvedLightingConfig, CameraConfig, ApplyCameraConfigOptions, AudioConfig } from './types';
import {
  TOWER_LAYER_COUNT, LIGHTS_PER_LAYER,
  RING_AZIMUTH, CORNER_AZIMUTH,
  LED_LAYOUT, RED_LIGHT_LAYOUT, LEDGE_LED_LAYOUT, BASE1_LED_LAYOUT, BASE2_LED_LAYOUT,
  BLOOM_LAYER, DRUM_CALIBRATION_BEEP_PAUSE_S, SIDES,
} from './constants';
import { computeRedLightPosition, computeSealLedPose, disposeObject, applyHdrColor } from './utils';
import { DEFAULT_LIGHTING, resolveLighting } from './LightingResolver';
import { LedEffectAnimator } from './LedEffectAnimator';
import type { LedRef } from './LedEffectAnimator';
import { SequenceAnimator } from '../sequences/SequenceAnimator';
import { CameraController } from './CameraController';
import { SceneLighting } from './SceneLighting';
import type { SceneLightsPartial } from './SceneLighting';
import { BloomManager } from './BloomManager';
import type { BloomFrameMetrics } from './BloomManager';
import { EntranceAnimator } from './EntranceAnimator';
import { GroundDiscManager } from './GroundDiscManager';
import { SkyboxManager } from './SkyboxManager';
import { SealManager } from './SealManager';
import type { SealBacklightRef } from './SealManager';
import { DrumManager } from './DrumManager';
import { loadTowerModel } from './ModelLoader';

// Re-exported for consumers that import directly from Tower3DView rather than the package root.
export { DEFAULT_LIGHTING, resolveLighting };
export type { SealBacklightRef };

const DEFAULT_DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

type Logger = { log(label: string, data?: Record<string, unknown>): void };

const NULL_LOGGER: Logger = { log: () => { } };
const CONSOLE_LOGGER: Logger = {
  log(label, data) {
    // eslint-disable-next-line no-console
    console.log(`[Tower3DView] ${label}`, data);
  },
};

type Tower3DViewInternals = {
  ledRefs: Map<string, LedRef>;
  sealManager: SealManager;
};
const internals = (view: Tower3DView): Tower3DViewInternals =>
  view as unknown as Tower3DViewInternals;

/** @internal — exported for unit tests only. */
export const __testables = {
  get LED_LAYOUT(): typeof LED_LAYOUT {
    return LED_LAYOUT;
  },
  get LEDGE_LED_LAYOUT(): typeof LEDGE_LED_LAYOUT {
    return LEDGE_LED_LAYOUT;
  },
  get BASE1_LED_LAYOUT(): typeof BASE1_LED_LAYOUT {
    return BASE1_LED_LAYOUT;
  },
  get BASE2_LED_LAYOUT(): typeof BASE2_LED_LAYOUT {
    return BASE2_LED_LAYOUT;
  },
  get RING_AZIMUTH(): readonly number[] {
    return RING_AZIMUTH;
  },
  get CORNER_AZIMUTH(): readonly number[] {
    return CORNER_AZIMUTH;
  },
  get RED_LIGHT_LAYOUT(): typeof RED_LIGHT_LAYOUT {
    return RED_LIGHT_LAYOUT;
  },
  computeRedLightPosition: (layer: number, light: number, radius: number) =>
    computeRedLightPosition(layer, light, radius),
  computeSealLedPose: (layer: number, light: number, radius: number, radiusFactor: number) =>
    computeSealLedPose(layer, light, radius, radiusFactor),
  getLedRef: (view: Tower3DView, layer: number, light: number): LedRef | undefined =>
    internals(view).ledRefs.get(`${layer}:${light}`),
  getSealNode: (view: Tower3DView, side: string, level: string): THREE.Object3D | undefined =>
    internals(view).sealManager.sealNodes.get(`${side}:${level}`),
  getSealNodeCount: (view: Tower3DView): number =>
    internals(view).sealManager.sealNodes.size,
  getSealBacklight: (view: Tower3DView, side: string, level: string): SealBacklightRef | undefined =>
    internals(view).sealManager.sealBacklights.get(`${side}:${level}`),
  getSealBacklightCount: (view: Tower3DView): number =>
    internals(view).sealManager.sealBacklights.size,
};

function isSoundPack(v: Record<number, string> | SoundPack): v is SoundPack {
  return typeof (v as SoundPack).name === 'string' && typeof (v as SoundPack).samples === 'object';
}

/** Sorted-array stats (median / p95 / max) rounded to 2 decimals. */
function stat(arr: number[]): PerfStat {
  if (arr.length === 0) return { median: 0, p95: 0, max: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  return {
    median: +sorted[Math.floor(sorted.length / 2)].toFixed(2),
    p95: +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))].toFixed(2),
    max: +sorted[sorted.length - 1].toFixed(2),
  };
}

/** Integer-stats helper for counts (no decimals). Avoids `Math.max(...arr)` for safety on large samples. */
function countStat(arr: number[]): { median: number; max: number } {
  if (arr.length === 0) return { median: 0, max: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  return { median: sorted[Math.floor(sorted.length / 2)], max: sorted[sorted.length - 1] };
}

/** Aggregate statistics for one perf-report metric, in ms (or counts where noted). */
export interface PerfStat {
  median: number;
  p95: number;
  max: number;
}

/**
 * Structured perf snapshot returned by {@link Tower3DView.collectPerfReport}.
 * Diagnostic-only. See `docs/framerate-issue.md` §16 for usage and interpretation.
 */
export interface PerfReport {
  /** Frames per second measured over the report window. */
  fps: number;
  /** Number of rAF callbacks observed. */
  frames: number;
  /** Actual measured duration in ms (may slightly differ from the requested duration). */
  durationMs: number;
  /** Whether the bloom pipeline was active during the report. */
  bloomEnabled: boolean;
  /** Wall-clock interval between consecutive rAF callbacks. The canonical ground truth for frame time. */
  frameMs: PerfStat;
  /** Sum of bloom sub-steps per frame. Only present when bloom is enabled. */
  bloomTotalMs?: PerfStat;
  /** `scene.traverse` to swap non-bloom meshes to black. Only present when bloom is enabled. */
  darkenMs?: PerfStat;
  /** `bloomComposer.render()`: scene render at bloom-target res + UnrealBloomPass blurs. Only present when bloom is enabled. */
  bloomComposerMs?: PerfStat;
  /** `scene.traverse` to restore original materials. Only present when bloom is enabled. */
  restoreMs?: PerfStat;
  /** `finalComposer.render()`: full-res scene render + composite + OutputPass. Only present when bloom is enabled. */
  finalComposerMs?: PerfStat;
  /** Draw calls per frame from `renderer.info.render`. Sums across all renderer.render() calls in the frame. */
  drawCalls: { median: number; max: number };
  /** Triangles per frame from `renderer.info.render`. Sums across all renderer.render() calls in the frame. */
  triangles: { median: number; max: number };
  /** Number of compiled shader programs (snapshot at end of report). Stable count = no recompiles. */
  programs: number;
  /** Visible-object counts snapshotted at end of report. */
  scene: {
    visibleBloomMeshes: number;
    visibleNonBloomMeshes: number;
    visiblePointLights: number;
    visibleSprites: number;
    totalMeshes: number;
  };
  /** LED state snapshotted at end of report. */
  drivers: { ledsActive: number };
  /** Canvas dimensions at end of report. */
  canvas: { cssW: number; cssH: number; bufW: number; bufH: number; pixelRatio: number };
}

export interface Tower3DViewOptions {
  /**
   * URL of the tower GLB model. The package ships the model file at
   * `dist/3d/assets/tower.glb` — consumers must reference it via their bundler
   * (e.g. `import towerModelUrl from 'ultimatedarktowerdisplay/dist/3d/assets/tower.glb'`)
   * or copy it to a static asset path and pass that URL here.
   */
  modelUrl: string;
  /** Override the URL path used to fetch Draco decoders (wasm/js). */
  dracoDecoderPath?: string;
  /** Enable verbose 3D diagnostics (logs + axes helper). */
  debug3D?: boolean;
  /** Show the noir ground disc that catches the key-light shadow. Defaults to true. */
  showGroundDisc?: boolean;
  /** Light intensities for the three-point rig. */
  lighting?: LightingConfig;
  /** Initial camera eye and look-target defaults. */
  camera?: CameraConfig;
  /** Initial audio configuration (sound pack, enable, sequence binding, etc.). */
  audio?: AudioConfig;
}

/**
 * A three.js-based 3D renderer for the Dark Tower model.
 *
 * Loads a GLB model, lets the user orbit / zoom / pan with mouse, and provides
 * N/E/S/W side-snap buttons. `applyState` drives the 24 LED proxies (per-light
 * effect animation) and rotates the three named drum meshes to match the state.
 * `applySeals` hides/shows seal meshes by name (`seal_<side>_<level>`).
 */
export class Tower3DView implements ITowerDisplay {
  private readonly container: HTMLElement;
  private readonly modelUrl: string;
  private readonly dracoDecoderPath: string;
  private readonly debug3D: boolean;
  private readonly logger: Logger;
  private lighting: ResolvedLightingConfig;
  private readonly showGroundDisc: boolean;
  private readonly cameraConfig: CameraConfig;

  private sceneLighting: SceneLighting | null = null;
  private entranceAnimator: EntranceAnimator = new EntranceAnimator();
  private groundDiscManager: GroundDiscManager | null = null;
  private skyboxManager: SkyboxManager | null = null;
  private sealManager: SealManager = new SealManager();
  /**
   * Subscribers registered via `TowerPhysicsHooks.onStateApplied`. Fired
   * after every `applyState` call.
   */
  private stateAppliedListeners: Array<(state: TowerState) => void> = [];
  // Plays the bundled drum-rotation recording (DRUM_ROTATION_SOUND_URL) while a
  // drum is turning. The recording is a finite, complete-rotation clip, so:
  //   - No loop: it plays once from the start; the start/end refcount + short
  //     fade cuts it the moment the drum settles, so it never plays longer than
  //     the rotation (single- or multi-position moves alike).
  //   - No fallback tone: a missing/failed load degrades to silence rather than
  //     buzzing. Loaded lazily on first enable (see `drumSoundLoaded` below).
  private drumAudio: DrumRotationAudio = new DrumRotationAudio({ fallbackTone: false, loop: false });
  private drumSoundLoaded = false;
  // Dedicated player for the calibration command's bundled sweep recording, kept
  // separate from `drumAudio` so the recording never plays during normal rotations.
  // No fallback tone: it always has a real recording, so a missing/failed load
  // degrades to silence (+ the visual sweep and Game Start) rather than a buzz.
  // No loop: it's a finite recording of the whole sweep, so it plays once instead
  // of restarting (replaying its opening rotation sound) if the visible sweep runs long.
  private calibrationAudio: DrumRotationAudio = new DrumRotationAudio({ fallbackTone: false, loop: false });
  private calibrationSoundLoaded = false;
  private towerSampleAudio: TowerSampleAudio = new TowerSampleAudio();
  // Resolved audio state. `sequenceMapOverride` holds the user-supplied
  // override; `activeSequenceMap()` resolves it against the pack/default at
  // read time so getAudioConfig().sequenceMap always reflects what is in use.
  private audioState: {
    pack: SoundPack;
    enabled: boolean;
    bindSequenceToSample: boolean;
    sequenceMapOverride: Record<number, number> | undefined;
    drumRotationUrl: string | null;
  } = {
      pack: DEFAULT_TOWER_SOUND_PACK,
      enabled: false,
      bindSequenceToSample: false,
      sequenceMapOverride: undefined,
      drumRotationUrl: DRUM_ROTATION_SOUND_URL,
    };
  private drumManager: DrumManager;

  private wrapper: HTMLDivElement | null = null;
  private canvasContainer: HTMLDivElement | null = null;
  private sideButtons: SideButtons | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private bloomManager: BloomManager | null = null;
  private controls: OrbitControls | null = null;
  private model: THREE.Group | null = null;
  private axesHelper: THREE.AxesHelper | null = null;
  private modelRadius = 1;
  private modelBottomY = -1;
  private modelTopY = 1;

  /** Timer for deriving `dt` for registered physics frame callbacks. */
  private readonly physicsTimer = new THREE.Timer();
  private physicsFrameListeners: Set<(dt: number) => void> = new Set();
  private physicsModelLoadListeners: Set<(info: ScenePluginModelInfo) => void> = new Set();

  /** Attached scene plugins (see {@link ScenePlugin}). */
  private scenePlugins: Set<{ plugin: ScenePlugin; detach: () => void }> = new Set();
  /** Side-change subscribers fanned out alongside `onSideChange`. */
  private sideChangeListeners: Set<(side: TowerSide) => void> = new Set();
  /** Pointer hit-test targets registered by scene plugins. */
  private pointerTargets: PointerTarget[] = [];
  /** Shared raycaster for pointer hit-testing (lazy; absent in WebGL-less test envs). */
  private pointerRaycaster: THREE.Raycaster | null = null;
  private readonly pointerNdc = new THREE.Vector2();
  /** The target that consumed the active pointer-down gesture, until pointer-up. */
  private activePointerTarget: PointerTarget | null = null;
  private pointerListenerCleanup: (() => void) | null = null;

  private cameraController: CameraController | null = null;

  private rafId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private frameCount = 0;

  private latestState: TowerState | null = null;
  private latestBrokenSeals: SealIdentifier[] = [];
  private pendingSide: TowerSide | null = null;
  private _loadState: 'pending' | 'ready' | 'error' = 'pending';

  private ledRefs: Map<string, LedRef> = new Map();
  private ledAnimator: LedEffectAnimator | null = null;
  private sequenceAnimator: SequenceAnimator | null = null;

  /** Optional callback fired when the selected side changes (user click or programmatic). */
  onSideChange?: (side: TowerSide) => void;

  /** Optional callback fired when the GLB model fails to load. */
  onLoadError?: (details: unknown) => void;

  /** Current load state of the GLB model. */
  get loadState(): 'pending' | 'ready' | 'error' {
    return this._loadState;
  }

  constructor(container: HTMLElement, options: Tower3DViewOptions) {
    this.container = container;
    this.modelUrl = options.modelUrl;
    this.dracoDecoderPath = options.dracoDecoderPath ?? DEFAULT_DRACO_DECODER_PATH;
    this.debug3D = options.debug3D ?? false;
    this.logger = this.debug3D ? CONSOLE_LOGGER : NULL_LOGGER;
    this.lighting = resolveLighting(options.lighting);
    this.showGroundDisc = options.showGroundDisc ?? true;
    this.cameraConfig = options.camera ?? {};
    this.drumManager = new DrumManager(this.drumAudio);
    // Seed audio state. Pack defaults to the bundled official pack so audio
    // works without any consumer setup beyond enabling from a user gesture.
    // Push the default pack to TowerSampleAudio first so the empty options.audio
    // case still gets sample URLs; applyAudioConfig then layers any overrides.
    this.towerSampleAudio.setLibrary(this.audioState.pack.samples);
    this.applyAudioConfig(options.audio ?? {});
    injectStyles();
    this.build();
    this.initScene();
    this.loadModel(this.modelUrl);
    this.startRenderLoop();
  }

  /**
   * Update the 3D view with a new decoded tower state, replaying all LED
   * effects and drum positions. Pass `force = true` to replay tower-sample
   * audio even when `state.audio.sample`/`loop` match the previous state
   * (e.g. the example app's "Trigger Sequence" button needs this).
   */
  applyState(state: TowerState, force = false): void {
    this.latestState = state;
    if (this.wrapper) this.wrapper.style.display = '';

    // When a sequence completes naturally, leave the LEDs at whatever value
    // the timeline last wrote. On the real tower, the firmware ends the
    // sequence body (defeat saturated; victory cut to black at phase 8) and
    // the app delivers a fresh state in response to the completion
    // notification. We don't simulate that follow-up state here, so a
    // post-completion replay of the base state would falsely restore
    // user-set "on" effects that the real tower would never show.
    const sequenceActive = this.sequenceAnimator?.apply(state.led_sequence, () => {
      // intentionally empty — see comment above
    });

    if (!sequenceActive) {
      this.ledAnimator?.replayAll(state);
    }

    this.drumManager.applyDrums(state.drum);

    // Sequence → sample auto-binding: when the consumer opted in and the state
    // carries a known sequence but no explicit sample, substitute the mapped
    // sample. The default (decoupled) behaviour leaves state.audio.sample as-is.
    let effectiveSample = state.audio.sample;
    if (
      effectiveSample === 0 &&
      this.audioState.bindSequenceToSample &&
      state.led_sequence
    ) {
      const mapped = this.activeSequenceMap()[state.led_sequence];
      if (mapped !== undefined) effectiveSample = mapped;
    }
    this.towerSampleAudio.sync(effectiveSample, state.audio.loop, state.audio.volume, force);

    // Fire `onStateApplied` subscribers (physics auto-drop, etc.) after every
    // state-driven write. Listeners see the post-apply view.
    for (const cb of this.stateAppliedListeners) cb(state);
  }

  private activeSequenceMap(): Record<number, number> {
    return (
      this.audioState.sequenceMapOverride ??
      this.audioState.pack.sequenceMap ??
      DEFAULT_SEQUENCE_AUDIO_MAP
    );
  }

  /** Update seal backlight visibility — pass the current list of broken seals. */
  applySeals(brokenSeals: SealIdentifier[]): void {
    this.latestBrokenSeals = brokenSeals;
    this.sealManager.applySeals(brokenSeals, this.lighting);
  }

  /**
   * Expose a narrow integration surface for external add-ons (e.g. a physics
   * companion package). Returns hooks for: the Three.js scene, per-drum-level
   * Object3D access, a per-frame callback registry, a seal-state listener, and
   * the current model bounds. All callbacks return an unsubscribe function.
   * Bounds (`modelRadius`, `modelBottomY`, `modelTopY`) are snapshotted at call
   * time — call after the GLB has loaded for non-default values.
   */
  getPhysicsHooks(): TowerPhysicsHooks {
    return {
      scene: this.scene as THREE.Scene,
      drumNode: (level) => this.drumManager.getDrumNode(level),
      onFrame: (cb) => this.subscribeFrame(cb),
      onSealsApplied: (cb) => this.sealManager.onSealsApplied(cb),
      onStateApplied: (cb) => this.subscribeStateApplied(cb),
      onModelLoaded: (cb) => this.subscribeModelLoaded(cb),
      modelRadius: this.modelRadius,
      modelBottomY: this.modelBottomY,
      modelTopY: this.modelTopY,
    };
  }

  // --- Shared subscription internals (used by getPhysicsHooks + scene plugins) ---

  private subscribeFrame(cb: (dt: number) => void): () => void {
    this.physicsFrameListeners.add(cb);
    return () => { this.physicsFrameListeners.delete(cb); };
  }

  private subscribeStateApplied(cb: (state: TowerState) => void): () => void {
    this.stateAppliedListeners.push(cb);
    return () => {
      const i = this.stateAppliedListeners.indexOf(cb);
      if (i >= 0) this.stateAppliedListeners.splice(i, 1);
    };
  }

  private subscribeModelLoaded(cb: (info: ScenePluginModelInfo) => void): () => void {
    this.physicsModelLoadListeners.add(cb);
    // Fire immediately if the model is already loaded.
    if (this.model) {
      try {
        cb({
          root: this.model,
          modelRadius: this.modelRadius,
          modelBottomY: this.modelBottomY,
          modelTopY: this.modelTopY,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[Tower3DView] onModelLoaded listener threw', err);
      }
    }
    return () => { this.physicsModelLoadListeners.delete(cb); };
  }

  /** @internal — exposed for tests; equals `physicsFrameListeners.size`. */
  get physicsFrameListenerCount(): number {
    return this.physicsFrameListeners.size;
  }

  /** @internal — exposed for tests; number of attached scene plugins. */
  get scenePluginCount(): number {
    return this.scenePlugins.size;
  }

  /** @internal — exposed for tests; number of registered pointer targets. */
  get pointerTargetCount(): number {
    return this.pointerTargets.length;
  }

  // --- Scene-plugin seam (see ScenePlugin.ts / attachScenePlugin) ---

  /**
   * Attach a {@link ScenePlugin}. Prefer the standalone `attachScenePlugin(view, plugin)`
   * helper; this method is the public seam it wraps. Calls `plugin.attach(ctx)` once with
   * a live context, wires its optional lifecycle methods, and returns a handle whose
   * `detach()` removes the plugin and frees its subscriptions (idempotent).
   */
  registerScenePlugin(plugin: ScenePlugin): ScenePluginHandle {
    const unsubs: Array<() => void> = [];
    const ctx = this.createScenePluginContext(unsubs);

    let detached = false;
    const entry = {
      plugin,
      detach: () => {
        if (detached) return;
        detached = true;
        this.scenePlugins.delete(entry);
        for (const unsub of unsubs.splice(0)) {
          try {
            unsub();
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[Tower3DView] scene plugin unsubscribe threw', err);
          }
        }
        try {
          plugin.dispose();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[Tower3DView] scene plugin dispose threw', err);
        }
      },
    };
    this.scenePlugins.add(entry);

    try {
      plugin.attach(ctx);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Tower3DView] scene plugin attach threw', err);
    }

    // Wire optional lifecycle methods AFTER attach so an immediate model-load
    // fire (when the GLB is already loaded) reaches a fully-built plugin.
    if (plugin.update) unsubs.push(this.subscribeFrame(plugin.update.bind(plugin)));
    if (plugin.onStateApplied) unsubs.push(this.subscribeStateApplied(plugin.onStateApplied.bind(plugin)));
    if (plugin.onSealsApplied) unsubs.push(this.sealManager.onSealsApplied(plugin.onSealsApplied.bind(plugin)));
    if (plugin.onModelLoaded) unsubs.push(this.subscribeModelLoaded(plugin.onModelLoaded.bind(plugin)));

    return { plugin, detach: entry.detach };
  }

  /** Register a pointer hit-test target. Returns an unsubscribe function. */
  registerPointerTarget(target: PointerTarget): () => void {
    this.pointerTargets.push(target);
    return () => {
      const i = this.pointerTargets.indexOf(target);
      if (i >= 0) this.pointerTargets.splice(i, 1);
      if (this.activePointerTarget === target) this.activePointerTarget = null;
    };
  }

  /**
   * Bind a capture-phase pointer interception layer on the canvas's parent so
   * registered {@link PointerTarget}s can hit-test and consume pointer gestures
   * before OrbitControls (which listens on the canvas itself) acts. Capture on the
   * ancestor runs before the event reaches the canvas target, so a consumed
   * pointer-down is stopped via `stopPropagation` and never starts an orbit drag.
   * Side-select is azimuth-derived (not pointer-driven), so suppressing the drag
   * also suppresses any spurious side change.
   */
  private bindPointerTargets(): void {
    if (this.pointerListenerCleanup) this.pointerListenerCleanup();
    const parent = this.canvasContainer;
    // No Raycaster in WebGL-less environments (e.g. jsdom without the mock) → skip.
    if (!parent || typeof THREE.Raycaster !== 'function') {
      this.pointerListenerCleanup = null;
      return;
    }
    const doc = parent.ownerDocument;

    const onDown = (ev: PointerEvent): void => {
      if (this.pointerTargets.length === 0) return;
      const ray = this.updatePointerRay(ev);
      if (!ray) return;
      // Highest priority first; the first target that consumes (returns true) wins.
      const sorted = [...this.pointerTargets].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      for (const target of sorted) {
        const objects = typeof target.objects === 'function' ? target.objects() : target.objects;
        if (!objects || objects.length === 0) continue;
        const hits = ray.intersectObjects(objects, true);
        if (hits.length === 0) continue;
        const consumed = target.onPointerDown?.(hits[0], ev) === true;
        if (consumed) {
          this.activePointerTarget = target;
          ev.stopPropagation();
          return;
        }
      }
    };

    const onMove = (ev: PointerEvent): void => {
      const target = this.activePointerTarget;
      if (!target?.onPointerMove) return;
      target.onPointerMove(this.pickPointerHit(target, ev), ev);
    };

    const onUp = (ev: PointerEvent): void => {
      const target = this.activePointerTarget;
      if (!target) return;
      this.activePointerTarget = null;
      if (!target.onPointerUp) return;
      const consumed = target.onPointerUp(this.pickPointerHit(target, ev), ev) === true;
      if (consumed) ev.stopPropagation();
    };

    parent.addEventListener('pointerdown', onDown, { capture: true });
    doc.addEventListener('pointermove', onMove, { capture: true });
    doc.addEventListener('pointerup', onUp, { capture: true });
    doc.addEventListener('pointercancel', onUp, { capture: true });

    this.pointerListenerCleanup = () => {
      parent.removeEventListener('pointerdown', onDown, { capture: true });
      doc.removeEventListener('pointermove', onMove, { capture: true });
      doc.removeEventListener('pointerup', onUp, { capture: true });
      doc.removeEventListener('pointercancel', onUp, { capture: true });
      this.activePointerTarget = null;
    };
  }

  /** Update the shared raycaster from a pointer event's canvas-relative NDC. */
  private updatePointerRay(ev: PointerEvent): THREE.Raycaster | null {
    if (!this.camera || !this.renderer) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    this.pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    if (!this.pointerRaycaster) this.pointerRaycaster = new THREE.Raycaster();
    this.pointerRaycaster.setFromCamera(this.pointerNdc, this.camera);
    return this.pointerRaycaster;
  }

  /** Raycast a single target's objects; return the nearest hit or null. */
  private pickPointerHit(target: PointerTarget, ev: PointerEvent): THREE.Intersection | null {
    const ray = this.updatePointerRay(ev);
    if (!ray) return null;
    const objects = typeof target.objects === 'function' ? target.objects() : target.objects;
    if (!objects || objects.length === 0) return null;
    const hits = ray.intersectObjects(objects, true);
    return hits.length > 0 ? hits[0] : null;
  }

  private createScenePluginContext(unsubs: Array<() => void>): ScenePluginContext {
    const track = (unsub: () => void): (() => void) => {
      unsubs.push(unsub);
      return unsub;
    };
    const ctx: ScenePluginContext = {
      scene: this.scene as THREE.Scene,
      camera: this.camera as THREE.PerspectiveCamera,
      renderer: this.renderer as THREE.WebGLRenderer,
      // Snapshot values; replaced below with live getters reflecting post-load bounds.
      modelRadius: this.modelRadius,
      modelBottomY: this.modelBottomY,
      modelTopY: this.modelTopY,
      drumNode: (level) => this.drumManager.getDrumNode(level),
      registerFrameCallback: (cb) => track(this.subscribeFrame(cb)),
      onStateApplied: (cb) => track(this.subscribeStateApplied(cb)),
      onSealsApplied: (cb) => track(this.sealManager.onSealsApplied(cb)),
      onModelLoaded: (cb) => track(this.subscribeModelLoaded(cb)),
      registerPointerTarget: (target) => track(this.registerPointerTarget(target)),
      getSide: () => this.cameraController?.getCurrentSide() ?? 'north',
      onSideChange: (cb) => {
        this.sideChangeListeners.add(cb);
        return track(() => this.sideChangeListeners.delete(cb));
      },
      isModelLoaded: () => this._loadState === 'ready',
    };
    // Make bounds live (reflect post-load updates) without aliasing `this`.
    Object.defineProperties(ctx, {
      modelRadius: { get: () => this.modelRadius, enumerable: true },
      modelBottomY: { get: () => this.modelBottomY, enumerable: true },
      modelTopY: { get: () => this.modelTopY, enumerable: true },
    });
    return ctx;
  }

  /** Fire a side change to the view-level callback and all scene-plugin subscribers. */
  private emitSideChange(side: TowerSide): void {
    this.onSideChange?.(side);
    for (const cb of this.sideChangeListeners) {
      try {
        cb(side);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[Tower3DView] side-change listener threw', err);
      }
    }
  }

  private tickPhysicsListeners(): void {
    if (this.physicsFrameListeners.size === 0) return;
    // Advance the timer only while listeners are attached, matching the
    // previous Clock.getDelta() cadence (dt spans from the last ticked frame).
    this.physicsTimer.update();
    const dt = this.physicsTimer.getDelta();
    for (const cb of this.physicsFrameListeners) {
      try {
        cb(dt);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[Tower3DView] physics frame listener threw', err);
      }
    }
  }

  /** Tween the camera to face the given tower side. No-op if the camera is already on that side. */
  selectSide(side: TowerSide): void {
    if (this.cameraController?.getCurrentSide() === side) return;
    this.snapSide(side);
  }

  /** Always snaps the camera to `side`, even if already on that side. Used by side buttons. */
  private snapSide(side: TowerSide): void {
    this.cameraController?.snapToSide(side);
    // Stash the pending side so loadModel can replay the tween once the camera
    // is ready (snapToSide skips the tween before the model loads).
    this.pendingSide = this.model ? null : side;
    this.emitSideChange(side);
  }

  /** Turn all LEDs off, stop drum audio, and hide the canvas wrapper until the next `applyState` call. */
  showIdle(): void {
    if (this.ledAnimator) {
      for (let layer = 0; layer < TOWER_LAYER_COUNT; layer++) {
        for (let light = 0; light < LIGHTS_PER_LAYER; light++) {
          this.ledAnimator.setEffect(layer, light, LIGHT_EFFECTS.off);
        }
      }
    }
    this.drumManager.stopAll();
    this.towerSampleAudio.stop();
    if (this.wrapper) this.wrapper.style.display = 'none';
  }

  /**
   * Set the URL of the audio asset played while drums rotate.
   * Pass null to disable drum-rotation audio (silence — there is no procedural
   * fallback tone). Decode runs in the background; rotations that fire
   * mid-decode stay silent until the buffer is ready.
   */
  setDrumRotationSoundUrl(url: string | null): void {
    this.applyAudioConfig({ drumRotationUrl: url });
  }

  /**
   * Enable or disable drum rotation audio. Disabled by default — consumers
   * must opt in (which also satisfies browser autoplay-policy gestures).
   *
   * @deprecated The `enabled` field of `AudioConfig` is a single master toggle
   *   covering both drum-rotation and tower-sample audio. Prefer
   *   `applyAudioConfig({ enabled })`.
   */
  setDrumRotationSoundEnabled(enabled: boolean): void {
    this.applyAudioConfig({ enabled });
  }

  /**
   * Provide the sample-id → URL map used to play decoded tower audio
   * (`state.audio.sample`). Sparse maps are fine — unmapped ids warn-once
   * and skip playback. Sample id 0 always means silence.
   *
   * Pass no argument (or `undefined`) to install the bundled default pack.
   * Pass a `SoundPack` to install a full pack with metadata + optional
   * sequence map. Pass a `Record<number, string>` for the legacy one-shot
   * "just the URLs" path; the library wraps it as an unnamed pack.
   */
  setTowerAudioLibrary(library?: Record<number, string> | SoundPack): void {
    const pack: SoundPack =
      library === undefined
        ? DEFAULT_TOWER_SOUND_PACK
        : isSoundPack(library)
          ? library
          : { name: 'custom', samples: library };
    this.applyAudioConfig({ pack });
  }

  /**
   * Enable or disable tower-sample audio. Disabled by default — consumers
   * must opt in (which also satisfies browser autoplay-policy gestures).
   * If a non-silent sample was the most recent state, enabling re-triggers
   * playback so users hear active loops without waiting for the next state.
   */
  setTowerAudioEnabled(enabled: boolean): void {
    this.applyAudioConfig({ enabled });
  }

  /**
   * Play a tower sample as a one-shot, transient event — independent of the
   * state-driven audio path. Use this when echoing a fire-and-forget audio
   * command (e.g. emulator/BLE mirrors where the protocol does not persist
   * audio in tower state, so a subsequent `applyState` with `audio.sample = 0`
   * would otherwise immediately stop sync-initiated playback). For
   * state-mirror playback, keep using `applyState(state)` instead.
   *
   * Side effects: polyphony — calling twice in quick succession plays both
   * samples in parallel. Looped one-shots (`opts.loop = true`) require
   * retaining the returned handle and calling `stop()` to end them; for
   * unbounded loops prefer the state-driven path.
   *
   * Requires `applyAudioConfig({ enabled: true })` from a user gesture.
   */
  playSample(
    sample: number,
    opts: { loop?: boolean; volume?: number } = {},
  ): { stop: () => void } {
    return this.towerSampleAudio.playSampleOneShot(
      sample,
      opts.loop ?? false,
      opts.volume ?? 0,
    );
  }

  /**
   * Play an LED light sequence as a transient, one-shot event — independent
   * of the state-driven `applyState` path. Use this when echoing a
   * fire-and-forget light-override command (e.g. emulator/BLE mirrors where
   * the framework strips `led_sequence` from state, so a subsequent
   * `applyState` with `led_sequence === 0` would otherwise call
   * `SequenceAnimator.apply(0)` and kill the sequence mid-playback).
   *
   * While the transient sequence is playing, the internal `apply(0)` calls
   * issued by `applyState` become no-ops on the sequence animator (state
   * still drives drums, individual LEDs, etc.). When the sequence completes,
   * normal state-driven sequence apply resumes.
   *
   * If `bindSequenceToSample` is enabled in the audio config and the sequence
   * has a mapped sample (in the sequence map), the bound sample also fires
   * via `playSampleOneShot` — matching the state-driven `applyState` behavior
   * and the real tower's firmware (which plays the bound sound automatically
   * on every light-override command).
   *
   * Returns `true` if the sequence started (or was already running), `false`
   * for an unknown sequence id.
   */
  playSequence(sequenceId: number, opts: { onComplete?: () => void } = {}): boolean {
    if (!this.sequenceAnimator) return false;
    const started = this.sequenceAnimator.applyTransient(sequenceId, opts.onComplete);
    if (started && this.audioState.bindSequenceToSample) {
      const mapped = this.activeSequenceMap()[sequenceId];
      if (mapped !== undefined && mapped !== 0) {
        this.towerSampleAudio.playSampleOneShot(mapped, false, 0);
      }
    }
    return started;
  }

  /**
   * Run the hardware calibration sequence: spin each drum to its home position
   * one level at a time (top → middle → bottom), then play the Game Start
   * sound. Resolves when the sequence finishes. Resolves immediately if the
   * model has not loaded yet.
   *
   * Audio only sounds when audio is enabled (after a user gesture). The sweep
   * plays a bundled calibration recording via a dedicated audio handle
   * ({@link calibrationAudio}) — distinct from the normal drum-rotation audio, so
   * it is heard only during calibration, never on ordinary drum rotations. A
   * {@link DRUM_CALIBRATION_BEEP_PAUSE_S} pause after each drum keeps the visible
   * sweep aligned with the recording's post-rotation beeps.
   */
  async runCalibrationSequence(): Promise<void> {
    if (!this.model) return;
    // Wait out the background decode so the very first calibration plays the real
    // recording instead of racing the fetch and falling back to the placeholder
    // tone. Resolves immediately once decoded (or if audio is disabled / unset).
    await this.calibrationAudio.whenLoaded();
    // Hold the calibration audio active across the whole sweep so the recording
    // plays continuously rather than gapping between levels (each calibrateDrum
    // also ref-counts the handle it's passed). No-op when audio is disabled.
    this.calibrationAudio.startRotation();
    try {
      for (const level of ['top', 'middle', 'bottom'] as const) {
        await this.drumManager.calibrateDrum(level, this.calibrationAudio);
        // Hold between rotations so the recording's beep plays while the drums
        // are still — keeps the visible sweep in sync with the audio.
        if (DRUM_CALIBRATION_BEEP_PAUSE_S > 0) {
          await new Promise<void>((resolve) =>
            setTimeout(resolve, DRUM_CALIBRATION_BEEP_PAUSE_S * 1000));
        }
      }
    } finally {
      this.calibrationAudio.endRotation();
    }
    this.playSample(TOWER_AUDIO_LIBRARY.GameStart.value);
  }

  /**
   * Return the fully-resolved audio configuration. Every field is populated:
   * `pack`, `enabled`, `bindSequenceToSample`, `sequenceMap` (the effective
   * map after fallback resolution), and `drumRotationUrl`.
   */
  getAudioConfig(): Required<AudioConfig> {
    return {
      pack: this.audioState.pack,
      enabled: this.audioState.enabled,
      bindSequenceToSample: this.audioState.bindSequenceToSample,
      sequenceMap: this.activeSequenceMap(),
      drumRotationUrl: this.audioState.drumRotationUrl,
    };
  }

  /**
   * Sparse-merge an audio configuration: only fields explicitly provided
   * (i.e., not `undefined`) overwrite the current state. Mirrors
   * `applyLightingConfig` / `applyCameraConfig`.
   */
  applyAudioConfig(config: AudioConfig): void {
    if (config.pack !== undefined) {
      this.audioState.pack = config.pack;
      this.towerSampleAudio.setLibrary(config.pack.samples);
    }
    if (config.enabled !== undefined) {
      this.audioState.enabled = config.enabled;
      this.towerSampleAudio.setEnabled(config.enabled);
      this.drumAudio.setEnabled(config.enabled);
      this.calibrationAudio.setEnabled(config.enabled);
      // Load the calibration recording on first enable rather than at construction:
      // setUrl creates an AudioContext, and enable is the user-gesture moment, so
      // this preserves the lazy creation that avoids the autoplay-policy warning.
      if (config.enabled && !this.calibrationSoundLoaded) {
        this.calibrationSoundLoaded = true;
        this.calibrationAudio.setUrl(CALIBRATION_SOUND_URL);
      }
      // Likewise load the drum-rotation recording lazily on first enable, unless
      // a consumer already supplied an explicit drumRotationUrl (drumSoundLoaded
      // set in the branch below) or cleared it to null.
      if (config.enabled && !this.drumSoundLoaded && this.audioState.drumRotationUrl !== null) {
        this.drumSoundLoaded = true;
        this.drumAudio.setUrl(this.audioState.drumRotationUrl);
      }
    }
    if (config.bindSequenceToSample !== undefined) {
      this.audioState.bindSequenceToSample = config.bindSequenceToSample;
    }
    if (config.sequenceMap !== undefined) {
      this.audioState.sequenceMapOverride = config.sequenceMap;
    }
    if (config.drumRotationUrl !== undefined) {
      // An explicit URL (or null to force silence) wins over the bundled default
      // and suppresses the first-enable default load above.
      this.drumSoundLoaded = true;
      this.audioState.drumRotationUrl = config.drumRotationUrl;
      this.drumAudio.setUrl(config.drumRotationUrl);
    }
  }

  /** When enabled, preserve the current camera orbit instead of resetting to the default fit on side selection. */
  setPreserveViewOnSideSelect(enabled: boolean): void {
    this.cameraController?.setPreserveViewOnSideSelect(enabled);
  }

  /**
   * Live-update individual scene light intensities and key-light position.
   * Stops any active entrance or breathing animation so manual values take precedence.
   */
  setSceneLights(opts: SceneLightsPartial): void {
    // Manual lighting edits should always win over the cinematic timeline.
    this.entranceAnimator.stop();
    this.sceneLighting?.applyPartial(opts, this.lighting);
    this.absorbSceneLights(opts);
  }

  private absorbSceneLights(opts: SceneLightsPartial): void {
    const scene = this.lighting.scene;
    if (opts.hemi !== undefined) scene.hemisphere.intensity = opts.hemi;
    if (opts.key !== undefined) scene.key.intensity = opts.key;
    if (opts.fill !== undefined) scene.fill.intensity = opts.fill;
    if (opts.fillY !== undefined) {
      const [x, y, z] = scene.fill.position;
      scene.fill.position = [x, opts.fillY ?? y, z];
    }
    if (opts.exposure !== undefined) scene.exposure = opts.exposure;
    if (opts.keyX !== undefined || opts.keyY !== undefined || opts.keyZ !== undefined) {
      const [x, y, z] = scene.key.position;
      scene.key.position = [opts.keyX ?? x, opts.keyY ?? y, opts.keyZ ?? z];
    }
  }

  /** Return a deep-cloned snapshot of the full resolved lighting configuration. */
  getLightingConfig(): ResolvedLightingConfig {
    return structuredClone(this.lighting);
  }

  /** Resolve and apply a new lighting configuration at runtime. */
  applyLightingConfig(config: LightingConfig): void {
    this.lighting = resolveLighting(config, this.lighting);
    this.applyLightingToScene();
    if (this.latestState) this.ledAnimator?.replayAll(this.latestState);
  }

  /**
   * Return the current camera config (elevation + target-height factors).
   * @remarks After `dispose()`, `cameraController` is null and this returns synthetic
   * defaults derived from the construction-time `camera` option. Behavior post-dispose
   * is undefined — do not rely on these values.
   */
  getCameraConfig(): Required<CameraConfig> {
    return this.cameraController?.getCameraConfig() ?? {
      elevationFactor: this.cameraConfig.elevationFactor ?? -0.5,
      targetHeightFactor: this.cameraConfig.targetHeightFactor ?? -0.15,
      distanceFactor: this.cameraConfig.distanceFactor ?? 1,
      zoomToCursor: this.cameraConfig.zoomToCursor ?? true,
      preserveViewOnSideSelect: false,
    };
  }

  /**
   * Update the camera elevation and/or look-target height and refit immediately.
   * Pass `{ preserveView: true }` to apply the change to the current live view
   * (keeping the orbit angle/zoom) instead of snapping to the north fit.
   */
  applyCameraConfig(config: CameraConfig, options?: ApplyCameraConfigOptions): void {
    this.cameraController?.applyCameraConfig(config, options);
  }

  /**
   * Read the live camera framing back as the three preset factors
   * (`elevationFactor`, `targetHeightFactor`, `distanceFactor`). Useful for
   * tuning by eye, then copying the numbers into a `CameraConfig`. Falls back to
   * the stored config when no camera controller is active (e.g. post-dispose).
   */
  getLiveCameraFactors(): Pick<Required<CameraConfig>, 'elevationFactor' | 'targetHeightFactor' | 'distanceFactor'> {
    return this.cameraController?.getLiveCameraFactors() ?? this.getCameraConfig();
  }

  /** Enable or disable zoom-toward-cursor on scroll-wheel zoom-in. */
  setZoomToCursor(enabled: boolean): void {
    this.cameraController?.setZoomToCursor(enabled);
  }

  /**
   * Dramatic noir entrance: a silhouette emerges from black, the key light
   * sweeps in from a grazing angle and punches past its target (flash), then
   * settles while fill fades into the shadow side. Starts the breathing
   * pulse on complete. Safe to call repeatedly; any in-flight entrance or
   * breathing tween is killed before a new run.
   */
  playEntrance(): void {
    if (!this.sceneLighting || !this.renderer) return;
    this.entranceAnimator.play(this.sceneLighting, this.renderer, this.lighting);
  }

  /**
   * Collect a structured perf snapshot over `durationMs` of wall clock time.
   * Counts rAF intervals, records BloomManager sub-step timings (via its
   * `collectMetrics` flag), reads `renderer.info.render` per frame (with
   * `autoReset` temporarily disabled so totals reflect the WHOLE frame, not
   * just the last `renderer.render()` call), and snapshots scene state at
   * the end.
   *
   * Diagnostic-only. Enable, capture, share the JSON. See
   * `docs/framerate-issue.md` §16 for the recipe and interpretation guide.
   *
   * @param durationMs how long to sample. Defaults to 3000 (3 s).
   */
  async collectPerfReport(durationMs = 3000): Promise<PerfReport> {
    const bloom = this.bloomManager;
    if (bloom) bloom.collectMetrics = true;

    const renderer = this.renderer;
    const prevAutoReset = renderer ? renderer.info.autoReset : true;
    if (renderer) {
      // We'll reset manually once per frame so info totals cover the whole frame
      // (RenderPasses inside the bloom composers each call renderer.render and
      // would otherwise clobber the counters mid-frame).
      renderer.info.autoReset = false;
      renderer.info.reset();
    }

    const frameMs: number[] = [];
    const bloomTotalMs: number[] = [];
    const darkenMs: number[] = [];
    const bloomComposerMs: number[] = [];
    const restoreMs: number[] = [];
    const finalComposerMs: number[] = [];
    const drawCalls: number[] = [];
    const triangles: number[] = [];

    await new Promise<void>((resolve) => {
      const start = performance.now();
      let lastTs = start;
      const tick = (ts: number): void => {
        frameMs.push(ts - lastTs);
        lastTs = ts;

        // Read prior-frame bloom metrics (render runs before rAF for the next frame).
        if (bloom?.lastMetrics) {
          const m: BloomFrameMetrics = bloom.lastMetrics;
          bloomTotalMs.push(m.bloomTotalMs);
          darkenMs.push(m.darkenMs);
          bloomComposerMs.push(m.bloomComposerMs);
          restoreMs.push(m.restoreMs);
          finalComposerMs.push(m.finalComposerMs);
        }
        // Read frame totals, then reset so the next frame starts fresh.
        if (renderer) {
          drawCalls.push(renderer.info.render.calls);
          triangles.push(renderer.info.render.triangles);
          renderer.info.reset();
        }

        if (ts - start < durationMs) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });

    if (bloom) bloom.collectMetrics = false;
    if (renderer) renderer.info.autoReset = prevAutoReset;

    // Drop the first sample for each series — frame[0] frameMs is the gap
    // between the report-start call and the first rAF (often a partial frame
    // duration which skews the median). Same for prior-frame bloom metrics
    // which may reflect a frame outside the window.
    const trim = <T>(a: T[]): T[] => (a.length > 1 ? a.slice(1) : a);

    // Snapshot scene state
    const bloomLayerInst = new THREE.Layers();
    bloomLayerInst.set(BLOOM_LAYER);
    let visibleBloomMeshes = 0;
    let visibleNonBloomMeshes = 0;
    let visibleSprites = 0;
    let visiblePointLights = 0;
    let totalMeshes = 0;
    if (this.scene) {
      this.scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          totalMeshes++;
          if (!obj.visible) return;
          if (bloomLayerInst.test(obj.layers)) visibleBloomMeshes++;
          else visibleNonBloomMeshes++;
          return;
        }
        if ((obj as THREE.Sprite).isSprite && obj.visible) {
          visibleSprites++;
          return;
        }
        if ((obj as THREE.PointLight).isPointLight && obj.visible) {
          visiblePointLights++;
        }
      });
    }

    let ledsActive = 0;
    for (const ref of this.ledRefs.values()) {
      if (ref.driver.v > 0.001) ledsActive++;
    }

    const canvas = renderer?.domElement;
    const measuredMs = frameMs.reduce((s, x) => s + x, 0);
    const trimmedFrameMs = trim(frameMs);
    const fps = trimmedFrameMs.length > 0
      ? (trimmedFrameMs.length * 1000) / trimmedFrameMs.reduce((s, x) => s + x, 0)
      : 0;

    return {
      fps: +fps.toFixed(1),
      frames: trimmedFrameMs.length,
      durationMs: +measuredMs.toFixed(1),
      bloomEnabled: !!bloom,
      frameMs: stat(trimmedFrameMs),
      ...(bloomTotalMs.length > 1
        ? {
          bloomTotalMs: stat(trim(bloomTotalMs)),
          darkenMs: stat(trim(darkenMs)),
          bloomComposerMs: stat(trim(bloomComposerMs)),
          restoreMs: stat(trim(restoreMs)),
          finalComposerMs: stat(trim(finalComposerMs)),
        }
        : {}),
      drawCalls: countStat(trim(drawCalls)),
      triangles: countStat(trim(triangles)),
      programs: renderer?.info.programs?.length ?? 0,
      scene: { visibleBloomMeshes, visibleNonBloomMeshes, visiblePointLights, visibleSprites, totalMeshes },
      drivers: { ledsActive },
      canvas: canvas
        ? {
          cssW: canvas.clientWidth,
          cssH: canvas.clientHeight,
          bufW: canvas.width,
          bufH: canvas.height,
          pixelRatio: renderer.getPixelRatio?.() ?? 1,
        }
        : { cssW: 0, cssH: 0, bufW: 0, bufH: 0, pixelRatio: 0 },
    };
  }

  /**
   * Pre-compile the LED proxy/halo bloom-layer shader programs (plus the
   * BloomManager's `darkMaterial` and the `UnrealBloomPass` blur materials) at
   * scene init, so the first sequence start doesn't pay a synchronous
   * shader-compile stall. Called once from the model-load callback after
   * `buildLeds` and `buildSealBacklights`. Uses Three.js's
   * `WebGLRenderer.compileAsync`, which leverages the
   * `KHR_parallel_shader_compile` extension when available.
   */
  private async prewarmBloomPrograms(): Promise<void> {
    if (!this.scene || !this.camera || !this.renderer) return;

    // LED proxy meshes and halo sprites are created `visible: false` and only
    // become visible per-LED when a sequence runs. Force them visible for the
    // prewarm pass so their bloom-layer program variants compile now instead of
    // on the first sequence start, then restore the resting (invisible) state
    // so the rendered idle scene is identical to pre-prewarm. (Prewarm runs
    // right after buildLeds + buildSealBacklights, before any state replay.)
    const setMeshesVisible = (visible: boolean): void => {
      for (const ref of this.ledRefs.values()) {
        if (ref.proxyMesh) ref.proxyMesh.visible = visible;
        if (ref.haloSprite) ref.haloSprite.visible = visible;
      }
      for (const r of this.sealManager.sealBacklights.values()) {
        r.proxyMesh.visible = visible;
        r.haloSprite.visible = visible;
      }
    };

    // compileAsync covers materials in the scene graph; the follow-up render
    // covers the BloomManager's darkMaterial swap (not in the scene graph) and
    // the UnrealBloomPass's internal blur materials.
    setMeshesVisible(true);
    await this.renderer.compileAsync(this.scene, this.camera);
    if (!this.scene || !this.camera || !this.renderer) return;
    this.renderOnce();
    setMeshesVisible(false);
  }

  /** One-shot render mirroring the render loop's path. Used by prewarm. */
  private renderOnce(): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    if (this.bloomManager) this.bloomManager.render();
    else this.renderer.render(this.scene, this.camera);
  }

  /** Toggle the shadow-catching ground disc. Builds lazily on first enable. */
  setGroundDiscVisible(visible: boolean): void {
    this.groundDiscManager?.setVisible(visible, this.modelRadius, this.modelBottomY, this.lighting);
  }

  /**
   * Show/hide the placeholder game-board image on the ground disc's top surface.
   * This is the **board-surface stand-down** switch: pass `false` to suppress the
   * built-in board image (the top cap reverts to a plain colored material) so an
   * external plugin can own the disc surface — the disc **mesh** stays (toggle that
   * with {@link setGroundDiscVisible}) and nothing physics depends on is removed
   * (skull physics rests on its own board collider, not the visual disc).
   * Defaults to visible.
   */
  setBoardDiscEnabled(enabled: boolean): void {
    this.lighting.boardDisc.enabled = enabled;
    this.groundDiscManager?.setBoardDiscEnabled(enabled, this.lighting);
  }

  /**
   * Orient the game board so its north section faces the given cardinal
   * direction. The default board orientation already puts the board's north on
   * the tower's north face (`'north'`); pass `'east'`/`'south'`/`'west'` to
   * rotate the board in 90° steps. Mirrors the on-disc `anchorToWorld` mapping,
   * so token placements rotate with the art.
   */
  setGameBoardKingdom(side: TowerSide): void {
    this.lighting.boardDisc.northKingdom = SIDES.indexOf(side) as 0 | 1 | 2 | 3;
    this.groundDiscManager?.refreshBoardOrientation(this.lighting);
  }

  /**
   * Report the ground-disc geometry so an external plugin can align content on it.
   * Derived from the current model bounds + lighting config; valid even before the
   * disc mesh is lazily built. `topY` is the top surface (where on-disc content
   * rests); `center` is the disc's geometric center on the Y axis.
   */
  getDiscMetrics(): { center: THREE.Vector3; radius: number; topY: number } {
    if (this.groundDiscManager) {
      return this.groundDiscManager.getMetrics(this.modelRadius, this.modelBottomY, this.lighting);
    }
    // Post-dispose fallback.
    return { center: new THREE.Vector3(0, this.modelBottomY, 0), radius: this.modelRadius, topY: this.modelBottomY };
  }

  /** Load an equirectangular image or .hdr file as the scene skybox. Pass null to clear. */
  setSkyboxUrl(url: string | null): void {
    this.lighting.scene.skyboxUrl = url ?? '';
    this.skyboxManager?.apply(url ?? '', this.lighting.scene.background);
  }

  /** Cancel the render loop, release all three.js resources, and remove the canvas from the DOM. */
  dispose(): void {
    // Detach scene plugins first, while the scene/camera/renderer are still live
    // so plugin.dispose() can clean up its own Object3Ds.
    for (const entry of [...this.scenePlugins]) entry.detach();
    this.scenePlugins.clear();
    this.sideChangeListeners.clear();
    this.pointerListenerCleanup?.();
    this.pointerListenerCleanup = null;
    this.pointerTargets = [];
    this.pointerRaycaster = null;
    this.activePointerTarget = null;
    this.cameraController?.dispose();
    this.cameraController = null;
    this.entranceAnimator.dispose();
    this.sceneLighting?.dispose();
    this.sceneLighting = null;
    this.groundDiscManager?.dispose();
    this.groundDiscManager = null;
    this.skyboxManager?.dispose();
    this.skyboxManager = null;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
    this.sequenceAnimator?.dispose();
    this.sequenceAnimator = null;
    this.ledAnimator?.dispose();
    this.ledAnimator = null;
    this.ledRefs.clear();
    this.sealManager.dispose();
    this.drumManager.dispose();
    this.physicsFrameListeners.clear();
    this.physicsModelLoadListeners.clear();
    this.stateAppliedListeners = [];
    this.drumAudio.dispose();
    this.calibrationAudio.dispose();
    this.towerSampleAudio.dispose();
    if (this.model) {
      disposeObject(this.model);
      this.model = null;
    }
    if (this.axesHelper) {
      this.axesHelper.removeFromParent();
      this.axesHelper = null;
    }
    this.bloomManager?.dispose();
    this.bloomManager = null;
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer.domElement.remove();
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
    if (this.wrapper) {
      this.wrapper.remove();
      this.wrapper = null;
    }
    this.sideButtons = null;
    this.canvasContainer = null;
    this.latestState = null;
    this.latestBrokenSeals = [];
    this.pendingSide = null;
  }

  private build(): void {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 't3v-wrapper';

    const controls = document.createElement('div');
    controls.className = 't3v-controls';

    this.sideButtons = new SideButtons((side) => this.snapSide(side));
    // Reflect the post-load default camera side ('north') up front so the N button
    // is highlighted before the GLB finishes loading, matching the 2D view.
    this.sideButtons.setActive('north');
    for (const btn of this.sideButtons.buttons) controls.appendChild(btn);

    const centerBtn = document.createElement('button');
    centerBtn.className = 't3v-center-btn';
    centerBtn.textContent = 'Center';
    centerBtn.title = 'Center the tower in the view (keeps your current angle and zoom)';
    centerBtn.addEventListener('click', () => this.cameraController?.centerView());
    controls.appendChild(centerBtn);

    const resetBtn = document.createElement('button');
    resetBtn.className = 't3v-reset-btn';
    resetBtn.textContent = 'Reset';
    resetBtn.addEventListener('click', () => this.cameraController?.resetView());
    controls.appendChild(resetBtn);

    this.wrapper.appendChild(controls);

    this.canvasContainer = document.createElement('div');
    this.canvasContainer.className = 't3v-canvas';
    this.wrapper.appendChild(this.canvasContainer);

    this.container.appendChild(this.wrapper);
  }

  private initScene(): void {
    if (!this.canvasContainer) return;

    const { width, height } = this.getCanvasSize();

    const lighting = this.lighting;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(lighting.scene.background);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0.5, 5);
    this.scene.add(this.camera); // required so camera-parented lights are found during scene traversal

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = lighting.scene.exposure;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.canvasContainer.appendChild(this.renderer.domElement);

    if (lighting.scene.bloom.enabled) {
      this.bloomManager = new BloomManager(
        this.scene,
        this.camera,
        this.renderer,
        lighting,
        width,
        height,
      );
    }

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0, 0);
    this.controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;

    this.sceneLighting = new SceneLighting(this.scene, this.camera, this.renderer, lighting);
    this.groundDiscManager = new GroundDiscManager(
      this.scene,
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    this.skyboxManager = new SkyboxManager(this.scene);

    if (this.debug3D) {
      this.axesHelper = new THREE.AxesHelper(1);
      this.scene.add(this.axesHelper);
    }

    this.logger.log('initScene', {
      width,
      height,
      camera: {
        fov: this.camera.fov,
        near: this.camera.near,
        far: this.camera.far,
        position: this.camera.position.toArray(),
      },
    });

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.canvasContainer);

    this.cameraController = new CameraController(this.camera, this.controls, this.sideButtons!, this.cameraConfig);
    this.cameraController.onSideChange = (side) => this.emitSideChange(side);
    this.cameraController.bindZoomTowardCursor(this.renderer.domElement);
    this.bindPointerTargets();

    if (this.lighting.scene.skyboxUrl) {
      this.skyboxManager.apply(this.lighting.scene.skyboxUrl, this.lighting.scene.background);
    }
  }

  private loadModel(url: string): void {
    loadTowerModel(
      url,
      this.dracoDecoderPath,
      async ({ root, modelRadius, modelBottomY, modelTopY }) => {
        if (!this.scene) return;

        this.modelRadius = modelRadius;
        this.modelBottomY = modelBottomY;
        this.modelTopY = modelTopY;

        this.logger.log('modelLoaded', {
          url,
          radius: modelRadius,
          rootPosition: root.position.toArray(),
        });

        if (this.axesHelper) {
          this.axesHelper.scale.setScalar(Math.max(1, modelRadius * 0.35));
          this.axesHelper.visible = true;
        }

        this.sealManager.buildSealNodes(root);
        this.drumManager.buildDrumNodes(root);
        this.scene.add(root);
        this.model = root;

        this.sceneLighting?.applyLights(this.lighting, modelRadius);
        if (this.showGroundDisc) this.groundDiscManager?.build(modelRadius, modelBottomY, this.lighting);
        this.buildLeds();
        this.sealManager.buildSealBacklights(root, modelRadius, this.lighting);
        this.sealManager.setDebug(this.debug3D, root);
        this.sealManager.warnOnMissing();
        this.drumManager.warnOnMissing();
        if (this.latestBrokenSeals.length > 0) this.applySeals(this.latestBrokenSeals);
        if (this.latestState) this.drumManager.applyDrums(this.latestState.drum, { animate: false });
        this.cameraController?.fitToModel(modelRadius, (l, d) => this.logger.log(l, d));
        if (this.pendingSide !== null) {
          const pending = this.pendingSide;
          this.pendingSide = null;
          this.cameraController?.snapToSide(pending);
        }

        // Pre-compile the LED proxy/halo + bloom shader programs so the first
        // sequence never triggers a synchronous shader-compile stall. Must
        // complete before any state-replay (`applyState` below could turn LEDs
        // on and need the program already cached).
        await this.prewarmBloomPrograms();
        // dispose() may have been called during the await.
        if (!this.scene) return;

        // Replay state AFTER all visuals are built (seals + LEDs)
        this._loadState = 'ready';
        if (this.latestState) this.applyState(this.latestState);

        // Notify physics integration listeners (e.g. the companion physics
        // package) that the model is now in the scene with finalized bounds.
        for (const cb of this.physicsModelLoadListeners) {
          try {
            cb({ root, modelRadius, modelBottomY, modelTopY });
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[Tower3DView] onModelLoaded listener threw', err);
          }
        }
      },
      (details) => {
        // eslint-disable-next-line no-console
        console.error('[Tower3DView] Failed to load GLB model:', details);
        this._loadState = 'error';
        this.onLoadError?.(details);
      },
    );
  }

  /** Apply current `this.lighting` values onto live three.js scene resources. */
  private applyLightingToScene(): void {
    const lighting = this.lighting;
    this.skyboxManager?.apply(lighting.scene.skyboxUrl, lighting.scene.background);

    this.sceneLighting?.applyLights(lighting, this.modelRadius);
    this.groundDiscManager?.updateLighting(lighting, this.modelRadius, this.modelBottomY);

    for (const [key, ref] of this.ledRefs.entries()) {
      const layer = parseInt(key.split(':')[0], 10);
      const ledHex = layer >= 4 ? lighting.leds.baseLeds.color : lighting.leds.ledgeLeds.color;
      if (ref.proxyMesh) {
        applyHdrColor((ref.proxyMesh.material as THREE.MeshBasicMaterial).color, ledHex);
      }
      if (ref.haloSprite) {
        applyHdrColor((ref.haloSprite.material as THREE.SpriteMaterial).color, ledHex);
      }
    }

    this.sealManager.updateLighting(lighting, this.modelRadius);

    this.bloomManager?.applyConfig(lighting);
  }

  /**
   * Populate `ledRefs` with the LED visuals for 24 LEDs (6 layers × 4 lights).
   * Ring layers (0–2) get bare refs — their glow comes from the SealManager
   * proxies — while ledge (layer 3) and base (layers 4–5) get an HDR-bright
   * proxy sphere + additive halo sprite. There are no per-LED PointLights; the
   * proxy/halo materials cross the raised bloom threshold to read as bright.
   */
  private buildLeds(): void {
    if (!this.model) return;

    const { ledgeLeds, baseLeds } = this.lighting.leds;

    // Radial gradient texture shared by ledge and base halo sprites.
    const gradTex = this.createLedgeGradientTexture();

    for (let layer = 0; layer < TOWER_LAYER_COUNT; layer++) {
      for (let light = 0; light < LIGHTS_PER_LAYER; light++) {
        const redPos = computeRedLightPosition(layer, light, this.modelRadius);

        // Ledge (layer 3) + base (layers 4–5) render an HDR-bright proxy sphere
        // + halo at this position; ring layers (0–2) render through the seal
        // proxies. There are no per-LED PointLights.
        const ref: LedRef = { driver: { v: 0 }, tween: null };

        // Layer 3 = LEDGE — add ball-type LED visuals (proxy sphere + halo sprite).
        if (layer === 3) {
          const { x, y, z } = redPos;

          const proxyRadius = this.modelRadius * ledgeLeds.proxy.sizeFactor;
          const proxyGeo = new THREE.SphereGeometry(proxyRadius, 8, 6);
          const proxyMat = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
            toneMapped: false,
          });
          applyHdrColor(proxyMat.color, ledgeLeds.color);
          const proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);
          proxyMesh.position.set(x, y, z);
          proxyMesh.layers.enable(BLOOM_LAYER);
          proxyMesh.renderOrder = 2;
          proxyMesh.castShadow = false;
          proxyMesh.receiveShadow = false;
          proxyMesh.visible = false;
          this.model.add(proxyMesh);
          ref.proxyMesh = proxyMesh;

          const haloMat = new THREE.SpriteMaterial({
            map: gradTex,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          });
          applyHdrColor(haloMat.color, ledgeLeds.color);
          const haloSprite = new THREE.Sprite(haloMat);
          const haloScale = this.modelRadius * ledgeLeds.halo.sizeFactor;
          haloSprite.scale.setScalar(haloScale);
          haloSprite.position.set(x, y, z);
          haloSprite.layers.enable(BLOOM_LAYER);
          haloSprite.renderOrder = 3;
          haloSprite.visible = false;
          this.model.add(haloSprite);
          ref.haloSprite = haloSprite;
        }

        // Layers 4–5 = BASE1/BASE2 — same ball-type LED visuals.
        if (layer >= 4) {
          const { x, y, z } = redPos;

          const proxyRadius = this.modelRadius * baseLeds.proxy.sizeFactor;
          const proxyGeo = new THREE.SphereGeometry(proxyRadius, 8, 6);
          const proxyMat = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
            toneMapped: false,
          });
          applyHdrColor(proxyMat.color, baseLeds.color);
          const proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);
          proxyMesh.position.set(x, y, z);
          proxyMesh.layers.enable(BLOOM_LAYER);
          proxyMesh.renderOrder = 2;
          proxyMesh.castShadow = false;
          proxyMesh.receiveShadow = false;
          proxyMesh.visible = false;
          this.model.add(proxyMesh);
          ref.proxyMesh = proxyMesh;

          const haloMat = new THREE.SpriteMaterial({
            map: gradTex,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          });
          applyHdrColor(haloMat.color, baseLeds.color);
          const haloSprite = new THREE.Sprite(haloMat);
          const haloScale = this.modelRadius * baseLeds.halo.sizeFactor;
          haloSprite.scale.setScalar(haloScale);
          haloSprite.position.set(x, y, z);
          haloSprite.layers.enable(BLOOM_LAYER);
          haloSprite.renderOrder = 3;
          haloSprite.visible = false;
          this.model.add(haloSprite);
          ref.haloSprite = haloSprite;
        }

        this.ledRefs.set(`${layer}:${light}`, ref);
      }
    }

    this.logger.log('buildLeds', { count: this.ledRefs.size, radius: this.modelRadius });

    this.ledAnimator = new LedEffectAnimator(this.ledRefs, () => this.lighting, this.sealManager);
    this.sequenceAnimator = new SequenceAnimator({ ledAnimator: this.ledAnimator });
  }

  /** Create a radial-gradient canvas texture for ledge LED halo sprites. */
  private createLedgeGradientTexture(): THREE.CanvasTexture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const center = size / 2;
      const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.4, 'rgba(255,255,255,0.6)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    }
    return new THREE.CanvasTexture(canvas);
  }

  private startRenderLoop(): void {
    this.physicsTimer.reset();
    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      this.controls?.update();
      this.cameraController?.tickDerivedSide();
      this.tickPhysicsListeners();
      this.sceneLighting?.tick();
      if (this.renderer && this.scene && this.camera) {
        if (this.bloomManager) {
          this.bloomManager.render();
        } else {
          this.renderer.render(this.scene, this.camera);
        }
        if (this.debug3D) {
          this.frameCount += 1;
          if (this.frameCount % 120 === 0) {
            this.logger.log('renderHeartbeat', {
              frame: this.frameCount,
              camera: this.camera.position.toArray(),
              target: this.controls?.target.toArray() ?? null,
            });
          }
        }
      }
    };
    tick();
  }

  private handleResize(): void {
    if (!this.renderer || !this.camera) return;
    const { width, height } = this.getCanvasSize();
    this.renderer.setSize(width, height, false);
    this.bloomManager?.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.logger.log('resize', {
      width,
      height,
      aspect: this.camera.aspect,
      near: this.camera.near,
      far: this.camera.far,
    });
  }

  private getCanvasSize(): { width: number; height: number } {
    if (!this.canvasContainer) return { width: 1, height: 1 };
    const rect = this.canvasContainer.getBoundingClientRect();
    return {
      width: Math.max(1, Math.floor(rect.width)),
      height: Math.max(1, Math.floor(rect.height)),
    };
  }

}
