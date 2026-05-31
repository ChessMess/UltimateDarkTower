import type { TowerState, TowerSide, SealIdentifier } from 'ultimatedarktower';
import type * as THREE from 'three';
import type { LightingConfig, CameraConfig, AudioConfig } from './3d/types';
import type { SoundPack } from './audio/soundPack';

export type { TowerState, TowerSide, SealIdentifier };
export type { LightingConfig };
export type { CameraConfig };
export type { AudioConfig };
export type { SoundPack };

/**
 * A decoded tower state that may also carry a tower *command* — a
 * `TOWER_COMMANDS.*` value mirroring byte 0 of the wire packet. When `command`
 * is present, a host can feed a command through the same `applyState` ingestion
 * the display uses for plain state: e.g. `TOWER_COMMANDS.calibration` triggers
 * the calibration sequence. Absent or `0` means a normal state render.
 */
export type AppliedTowerState = TowerState & { command?: number };

/**
 * Narrow integration surface returned by `Tower3DView.getPhysicsHooks()`.
 * External add-ons (e.g. a physics companion package) use these to plug into
 * the render loop, observe drum/seal state, and read model bounds. The shape
 * is intentionally minimal so add-ons stay decoupled from view internals.
 */
export interface TowerPhysicsHooks {
  /** The active Three.js scene; add-ons may add meshes/objects to it. */
  scene: THREE.Scene;
  /** Returns the registered Object3D for a drum level, or `null` if absent. */
  drumNode: (level: 'top' | 'middle' | 'bottom') => THREE.Object3D | null;
  /**
   * Register a per-frame callback invoked once per render tick (before render
   * and lighting tick), with `dt` in seconds. Returns an unsubscribe function.
   */
  onFrame: (cb: (dt: number) => void) => () => void;
  /**
   * Register a callback that fires after every `applySeals` call with the
   * broken-seals list. Returns an unsubscribe function.
   */
  onSealsApplied: (cb: (broken: SealIdentifier[]) => void) => () => void;
  /**
   * Register a callback that fires after every `applyState` call with the
   * decoded state. Useful for add-ons that need to react to game-state
   * deltas (skull-count increases, broken-seal counts, etc.). Returns an
   * unsubscribe function.
   */
  onStateApplied: (cb: (state: TowerState) => void) => () => void;
  /**
   * Register a callback that fires once the GLB model has been loaded and
   * added to the scene. If the model is already loaded when this is called,
   * the callback fires synchronously. Receives the model root Object3D and
   * the latest `modelRadius` / `modelBottomY` / `modelTopY`. Returns an
   * unsubscribe function.
   */
  onModelLoaded: (
    cb: (info: {
      root: THREE.Object3D;
      modelRadius: number;
      modelBottomY: number;
      modelTopY: number;
    }) => void,
  ) => () => void;
  /** Bounding-sphere radius of the loaded GLB. Defaults to 1 before load. */
  modelRadius: number;
  /** World-space Y of the model's bottom edge (after centering). */
  modelBottomY: number;
  /** World-space Y of the model's top edge (after centering). */
  modelTopY: number;
}

/** Identifies which renderer implementation to use. */
export type RendererType = 'readout' | 'side-view' | '3d-view';

/** Configuration options for TowerDisplay. */
export interface TowerDisplayOptions {
  /** DOM element to render into. */
  container: HTMLElement;
  /** Which renderer(s) to show. Defaults to ['readout', 'side-view']. */
  renderers?: RendererType | RendererType[];
  /** Called when the user clicks a seal overlay in the side view. */
  onSealClick?: (seal: SealIdentifier) => void;
  /**
   * When true (the default), clicking a seal toggles its visibility independently
   * of game state. Set to false to disable the built-in toggle and rely solely on
   * {@link ITowerDisplay.applySeals} for seal visibility.
   */
  clickToToggleSeals?: boolean;
  /** Called when any side-aware renderer changes its selected side. */
  onSideChange?: (side: TowerSide) => void;
  /** Called if the 3D GLB model fails to load. Only fires when `renderers` includes `'3d-view'`. */
  onLoadError?: (details: unknown) => void;
  /**
   * Called when a calibration command (carried as `command` on an applied
   * state, e.g. `TOWER_COMMANDS.calibration`) finishes its sequence. Receives
   * the final calibrated state (all drums calibrated at position 0). This is the
   * display's representation of the tower's CALIBRATION_FINISHED (0x08) reply,
   * which a BLE/emulator host can forward.
   */
  onCalibrationComplete?: (finalState: TowerState) => void;
  /**
   * URL of the GLB model for the 3D view. **Required** when `renderers` includes `'3d-view'`.
   * The package ships the model at `dist/3d/assets/tower.glb` — reference it through your
   * bundler (e.g. `import towerModelUrl from 'ultimatedarktowerdisplay/dist/3d/assets/tower.glb'`)
   * or copy it to a static asset path and pass that URL here.
   */
  modelUrl?: string;
  /** Optional override for where Draco decoder wasm/js files are loaded from. */
  dracoDecoderPath?: string;
  /** Enable verbose 3D diagnostics (logs, render heartbeats, axes helpers). Forwarded to Tower3DView. */
  debug3D?: boolean;
  /** Show the noir ground disc that catches the key-light shadow. Defaults to true. */
  showGroundDisc?: boolean;
  /** Light intensities for the 3D view. Forwarded to Tower3DView. */
  lighting?: LightingConfig;
  /** Initial camera eye and look-target defaults for the 3D view. Forwarded to Tower3DView. */
  camera?: CameraConfig;
  /**
   * Initial audio configuration for the 3D view (sound pack, enable, sequence
   * binding, etc.). Forwarded to Tower3DView. Audio is silent until enabled
   * from a user gesture — `enabled: true` here without a click/keydown
   * elsewhere will not unmute the AudioContext.
   */
  audio?: AudioConfig;
  /**
   * When false, skips injecting the built-in `<style>` tag into `document.head`.
   * Use this in environments with a strict Content Security Policy (e.g. Electron)
   * where `'unsafe-inline'` is not allowed for `style-src`. You must then include
   * the exported {@link TOWER_DISPLAY_CSS} string via your own bundler or stylesheet.
   * Defaults to true.
   */
  injectStyles?: boolean;
}

/** Public interface for all display implementations. */
export interface ITowerDisplay {
  /**
   * Update the display with a new decoded tower state.
   *
   * Pass `force = true` to treat this as a fresh user-initiated trigger:
   * audio-capable renderers will replay the current sample even when it
   * matches the previously-synced one. The default (`false`) is correct
   * for BLE state-mirror callers, where identical successive packets must
   * not restart playback.
   */
  applyState(state: TowerState, force?: boolean): void;
  /** Update seal visibility — pass the current list of broken seals. */
  applySeals(brokenSeals: SealIdentifier[]): void;
  /** Reset the display to its idle/waiting state. */
  showIdle(): void;
  /** Remove all rendered DOM content and reset internal state. */
  dispose(): void;
  /** Optional — select which side of the tower is facing. Only implemented by side-aware views. */
  selectSide?(side: TowerSide): void;
  /**
   * Optional — fire a one-shot tower sample independent of the state-driven
   * audio path. Implemented by audio-capable renderers (Tower3DView and the
   * facades that wrap it); not implemented by the 2D side-view or text
   * readout. See {@link Tower3DView.playSample}.
   */
  playSample?(
    sample: number,
    opts?: { loop?: boolean; volume?: number },
  ): { stop: () => void };
  /**
   * Optional — fire an LED light sequence as a transient, one-shot event
   * independent of the state-driven path. Implemented by 3D-capable renderers
   * (Tower3DView and the facades that wrap it); not implemented by the 2D
   * side-view or text readout. See {@link Tower3DView.playSequence}.
   */
  playSequence?(
    sequenceId: number,
    opts?: { onComplete?: () => void },
  ): boolean;
}
