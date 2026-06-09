import type { TowerState, SealIdentifier, TowerSide } from 'ultimatedarktower';
import type { LightingConfig, ResolvedLightingConfig, CameraConfig, ApplyCameraConfigOptions, AudioConfig } from './3d/types';
import type { TowerDisplayOptions, ITowerDisplay, RendererType, AppliedTowerState } from './types';
import type { SoundPack } from './audio/soundPack';
import { TowerStateReadout } from './TowerStateReadout';
import { TowerSideView } from './2d/TowerSideView';
import { Tower3DView } from './3d/Tower3DView';
import type { PerfReport } from './3d/Tower3DView';
import { TowerStateController } from './state/TowerStateController';
import { injectStyles, suppressStyleInjection } from './styles';
import { TOWER_COMMANDS, TOWER_MESSAGES, createDefaultTowerState } from 'ultimatedarktower';

/** Build the post-calibration tower state: every drum calibrated, at position 0 (north). */
function buildCalibratedState(): TowerState {
  const state = createDefaultTowerState();
  for (const drum of state.drum) {
    drum.calibrated = true;
    drum.position = 0;
  }
  return state;
}

function normalizeRenderers(input?: RendererType | RendererType[]): RendererType[] {
  if (!input) return ['readout', 'side-view'];
  return Array.isArray(input) ? input : [input];
}

function createRenderer(type: RendererType, container: HTMLElement, options: TowerDisplayOptions): ITowerDisplay {
  switch (type) {
    case 'readout':
      return new TowerStateReadout(container);
    case 'side-view':
      return new TowerSideView(container);
    case '3d-view':
      if (!options.modelUrl) {
        throw new Error(
          "TowerDisplay: `modelUrl` is required when using the '3d-view' renderer. " +
          "The package ships the model at `dist/3d/assets/tower.glb` — import it through " +
          "your bundler or copy it to a static asset path and pass the URL via `modelUrl`."
        );
      }
      return new Tower3DView(container, {
        modelUrl: options.modelUrl,
        dracoDecoderPath: options.dracoDecoderPath,
        debug3D: options.debug3D,
        showGroundDisc: options.showGroundDisc,
        lighting: options.lighting,
        camera: options.camera,
        audio: options.audio,
      });
    default:
      throw new Error(`Unknown renderer type: ${type}`);
  }
}

/**
 * TowerDisplay renders decoded tower state into a DOM container.
 *
 * @example
 * ```ts
 * const display = new TowerDisplay({
 *   container: document.getElementById('tower')!,
 *   renderers: ['readout', 'side-view'],
 * });
 * display.applyState(state);
 * ```
 */
export class TowerDisplay implements ITowerDisplay {
  private readonly renderers: ITowerDisplay[] = [];
  private readonly root: HTMLDivElement;
  private view3d: Tower3DView | null = null;

  private readonly onSealClickCallback?: (seal: SealIdentifier) => void;
  private readonly onSideChangeCallback?: (side: TowerSide) => void;
  private readonly onCalibrationCompleteCallback?: (finalState: TowerState) => void;
  private readonly state: TowerStateController;
  /** True while a calibration sequence is running; guards against re-entrant commands. */
  private calibrating = false;

  constructor(options: TowerDisplayOptions) {
    this.onSealClickCallback = options.onSealClick;
    this.onSideChangeCallback = options.onSideChange;
    this.onCalibrationCompleteCallback = options.onCalibrationComplete;
    this.state = new TowerStateController({
      togglesEnabled: options.clickToToggleSeals !== false,
    });

    if (options.injectStyles === false) {
      suppressStyleInjection();
    } else {
      injectStyles();
    }

    const types = normalizeRenderers(options.renderers);

    this.root = document.createElement('div');
    this.root.className = types.length > 1 ? 'td-layout td-multi' : 'td-layout';
    options.container.appendChild(this.root);

    for (const type of types) {
      const slot = document.createElement('div');
      slot.className = `td-slot td-slot-${type}`;
      this.root.appendChild(slot);
      const r = createRenderer(type, slot, options);
      this.renderers.push(r);
      if (r instanceof Tower3DView) this.view3d = r;
      if (r instanceof TowerSideView) {
        // Parent owns click-toggle state so 2D clicks fan out to every renderer.
        r.clickToToggleSeals = false;
        r.onSealClick = (seal) => this.handleSealClick(seal);
        r.onSideChange = (side) => this.handleSideChange(side);
      }
      if (r instanceof Tower3DView) {
        r.onSideChange = (side) => this.handleSideChange(side);
        if (options.onLoadError) r.onLoadError = options.onLoadError;
      }
      if (r instanceof TowerStateReadout) {
        // Enable clickable seal buttons in the readout grid; route clicks
        // through TowerDisplay so they participate in the same merge/fan-out
        // path as 2D seal clicks.
        r.clickToToggleSeals = true;
        r.onSealClick = (seal) => this.handleSealClick(seal);
        // Enable clickable LED circles; route changes through TowerDisplay so
        // all renderers (3D + 2D) receive the overridden state.
        r.clickToToggleLeds = true;
        r.onLedClick = (layer, light, effect) => this.handleLedClick(layer, light, effect);
      }
    }
  }

  /**
   * Return the underlying Tower3DView instance if the display includes a 3D
   * renderer, or `null` otherwise. Useful for external add-ons (e.g. a physics
   * companion package) that need to call `view3d.getPhysicsHooks()`.
   */
  get view3D(): Tower3DView | null {
    return this.view3d;
  }

  /**
   * Update the display with a new decoded tower state. Pass `force = true`
   * to replay tower-sample audio even when the sample/loop match the
   * previous state — useful for explicit user triggers. The default
   * `false` preserves dedup for BLE state-mirror callers.
   */
  applyState(state: AppliedTowerState, force = false): void {
    if (state.command === TOWER_COMMANDS.calibration) {
      // Render the baseline state the command rode in on, then run the sequence.
      this.renderBaseState(state, force);
      void this.runCalibration();
      return;
    }
    this.renderBaseState(state, force);
  }

  /** Apply a state to all renderers. The transient `command` field (if any) is ignored by renderers. */
  private renderBaseState(state: AppliedTowerState, force: boolean): void {
    const resolved = this.state.applyState(state);
    for (const r of this.renderers) r.applyState(resolved, force);
  }

  /**
   * Run the calibration sequence in response to a calibration command. The 3D
   * drum sweep + calibration audio + Game Start sound are layered in by the 3D
   * view in a later step; the no-3D path completes immediately. Re-entrant
   * calls while a calibration is in flight are ignored.
   *
   * On completion the display resolves to the fully-calibrated state and fires
   * `onCalibrationComplete` with that state stamped `CALIBRATION_FINISHED`
   * (0x08) — the display's representation of the tower's completion reply.
   */
  private async runCalibration(): Promise<void> {
    if (this.calibrating) return;
    this.calibrating = true;
    try {
      // When a 3D view is present, run the visible drum sweep + audio and wait
      // for it; other renderers (readout/side-view) just settle on the result.
      if (this.view3d) {
        await this.view3d.runCalibrationSequence();
      }
      const finalState = buildCalibratedState();
      this.renderBaseState(finalState, true);
      const completed: AppliedTowerState = {
        ...finalState,
        command: TOWER_MESSAGES.CALIBRATION_FINISHED.value,
      };
      this.onCalibrationCompleteCallback?.(completed);
    } finally {
      this.calibrating = false;
    }
  }

  /**
   * Programmatically override a single LED effect on all active renderers.
   * Useful when the readout is used standalone (outside `TowerDisplay`) and
   * LED-click callbacks need to propagate to the 3D / 2D views owned by this
   * instance.  Equivalent to the user clicking the LED in the readout.
   */
  setLedOverride(layer: number, light: number, effect: number): void {
    this.handleLedClick(layer, light, effect);
  }

  /**
   * Clear every per-LED effect override and re-render with the raw last state.
   * Forwards to any internally-owned `TowerStateReadout` renderers so their
   * own override map clears in sync.
   */
  clearLedOverrides(): void {
    this.state.clearLedOverrides();
    for (const r of this.renderers) {
      if (r instanceof TowerStateReadout) r.clearLedOverrides();
    }
    const resolved = this.state.getResolvedState();
    if (resolved) {
      for (const r of this.renderers) r.applyState(resolved);
    }
  }

  /** Update seal visibility — pass the current list of broken seals. */
  applySeals(brokenSeals: SealIdentifier[]): void {
    const list = this.state.applySeals(brokenSeals);
    for (const r of this.renderers) r.applySeals(list);
  }

  private handleLedClick(layer: number, light: number, newEffect: number): void {
    const resolved = this.state.setLedOverride(layer, light, newEffect);
    if (resolved) {
      for (const r of this.renderers) r.applyState(resolved);
    }
  }

  private handleSealClick(seal: SealIdentifier): void {
    const list = this.state.toggleSeal(seal);
    for (const r of this.renderers) r.applySeals(list);
    this.onSealClickCallback?.(seal);
  }

  /** Select the facing side on every side-aware renderer (2D SVG + 3D camera). */
  selectSide(side: TowerSide): void {
    for (const r of this.renderers) r.selectSide?.(side);
  }

  private handleSideChange(side: TowerSide): void {
    // Fan out so a click in one view mirrors to the others. Each view's
    // selectSide early-returns when already on the requested side, so there is
    // no loop — the originating renderer no-ops on reentry.
    for (const r of this.renderers) r.selectSide?.(side);
    this.onSideChangeCallback?.(side);
  }

  /** Reset the display to its idle/waiting state. */
  showIdle(): void {
    for (const r of this.renderers) r.showIdle();
  }

  /** Current GLB load state. Returns undefined when no 3D view is active. */
  get loadState(): 'pending' | 'ready' | 'error' | undefined {
    return this.view3d?.loadState;
  }

  /** Live-update scene light intensities. Only affects the 3D view; no-op otherwise. */
  setSceneLights(opts: {
    hemi?: number;
    key?: number;
    fill?: number;
    fillY?: number;
    exposure?: number;
    keyX?: number;
    keyY?: number;
    keyZ?: number;
  }): void {
    this.view3d?.setSceneLights(opts);
  }

  /** Get the full resolved 3D lighting config. Returns undefined when no 3D view is active. */
  getLightingConfig(): ResolvedLightingConfig | undefined {
    return this.view3d?.getLightingConfig();
  }

  /** Apply a 3D lighting config. No-op when no 3D view is active. */
  applyLightingConfig(config: LightingConfig): void {
    this.view3d?.applyLightingConfig(config);
  }

  /** Toggle the noir ground disc in the 3D view. No-op otherwise. */
  setGroundDiscVisible(visible: boolean): void {
    this.view3d?.setGroundDiscVisible(visible);
  }

  /** Toggle the canvas-generated game board texture on the ground disc. No-op when no 3D view is active. */
  setBoardDiscEnabled(enabled: boolean): void {
    this.view3d?.setBoardDiscEnabled(enabled);
  }

  /** Orient the game board so its north section faces the given cardinal direction. No-op when no 3D view is active. */
  setGameBoardKingdom(side: TowerSide): void {
    this.view3d?.setGameBoardKingdom(side);
  }

  /** Set an equirectangular skybox image or .hdr URL on the 3D view. Pass null to clear. No-op otherwise. */
  setSkyboxUrl(url: string | null): void {
    this.view3d?.setSkyboxUrl(url);
  }

  /** Play the cinematic entrance fade-in + breathing on the 3D view. No-op otherwise. */
  playEntrance(): void {
    this.view3d?.playEntrance();
  }

  /**
   * Collect a perf snapshot from the 3D view. See {@link Tower3DView.collectPerfReport}.
   * Returns `null` when no 3D view is active.
   */
  collectPerfReport(durationMs?: number): Promise<PerfReport> | null {
    return this.view3d?.collectPerfReport(durationMs) ?? null;
  }

  /** Get the current camera config for the 3D view. Returns undefined when no 3D view is active. */
  getCameraConfig(): Required<CameraConfig> | undefined {
    return this.view3d?.getCameraConfig();
  }

  /** Apply a new camera config to the 3D view. No-op when no 3D view is active. */
  applyCameraConfig(config: CameraConfig, options?: ApplyCameraConfigOptions): void {
    this.view3d?.applyCameraConfig(config, options);
  }

  /**
   * Read the live camera framing back as the three preset factors
   * (`elevationFactor`, `targetHeightFactor`, `distanceFactor`). Returns
   * undefined when no 3D view is active.
   */
  getLiveCameraFactors(): Pick<Required<CameraConfig>, 'elevationFactor' | 'targetHeightFactor' | 'distanceFactor'> | undefined {
    return this.view3d?.getLiveCameraFactors();
  }

  /** Enable or disable zoom-toward-cursor on scroll-wheel zoom-in. No-op when no 3D view is active. */
  setZoomToCursor(enabled: boolean): void {
    this.view3d?.setZoomToCursor(enabled);
  }

  /** Preserve the current 3D view when selecting a side instead of resetting to the default fit. */
  setPreserveViewOnSideSelect(enabled: boolean): void {
    this.view3d?.setPreserveViewOnSideSelect(enabled);
  }

  /**
   * Set the URL of the audio asset played while drums rotate in the 3D view.
   * Pass null to fall back to the procedural placeholder tone. Decode runs in
   * the background; rotations that fire mid-decode use the placeholder.
   * No-op when no 3D renderer is active.
   */
  setDrumRotationSoundUrl(url: string | null): void {
    this.view3d?.setDrumRotationSoundUrl(url);
  }

  /**
   * Enable or disable drum rotation audio. Disabled by default — consumers
   * must opt in (which also satisfies browser autoplay-policy gestures).
   * No-op when no 3D renderer is active.
   */
  setDrumRotationSoundEnabled(enabled: boolean): void {
    this.view3d?.setDrumRotationSoundEnabled(enabled);
  }

  /**
   * Provide the sound pack (or raw sample-id → URL map) used to play decoded
   * tower audio (`state.audio.sample`). Sparse maps are fine — unmapped ids
   * warn-once and skip playback. Pass no argument to install the bundled
   * default pack. No-op when no 3D renderer is active.
   */
  setTowerAudioLibrary(library?: Record<number, string> | SoundPack): void {
    this.view3d?.setTowerAudioLibrary(library);
  }

  /**
   * Enable or disable tower-sample audio. Disabled by default — consumers
   * must opt in (which also satisfies browser autoplay-policy gestures).
   * No-op when no 3D renderer is active.
   */
  setTowerAudioEnabled(enabled: boolean): void {
    this.view3d?.setTowerAudioEnabled(enabled);
  }

  /**
   * Get the fully-resolved audio configuration for the 3D view. Returns
   * `undefined` when no 3D view is active. Mirrors `getLightingConfig`.
   */
  getAudioConfig(): Required<AudioConfig> | undefined {
    return this.view3d?.getAudioConfig();
  }

  /**
   * Apply a sparse audio config to the 3D view. Only fields that are not
   * `undefined` overwrite the current state. No-op when no 3D view is active.
   */
  applyAudioConfig(config: AudioConfig): void {
    this.view3d?.applyAudioConfig(config);
  }

  /**
   * Play a tower sample as a one-shot, transient event — independent of the
   * state-driven `applyState` audio path. Use for fire-and-forget audio
   * commands (e.g. emulator/BLE mirrors). Forwards to
   * {@link Tower3DView.playSample}. No-op (returns an inert handle) when the
   * display has no 3D renderer — audio only lives on the 3D view.
   */
  playSample(
    sample: number,
    opts?: { loop?: boolean; volume?: number },
  ): { stop: () => void } {
    return this.view3d?.playSample(sample, opts) ?? { stop: () => { /* no-op */ } };
  }

  /**
   * Play an LED light sequence as a transient, one-shot event — independent
   * of the state-driven `applyState` path. Forwards to
   * {@link Tower3DView.playSequence}. No-op (returns `false`) when the
   * display has no 3D renderer.
   */
  playSequence(sequenceId: number, opts?: { onComplete?: () => void }): boolean {
    return this.view3d?.playSequence(sequenceId, opts) ?? false;
  }

  /** Remove all rendered DOM content and reset internal state. */
  dispose(): void {
    for (const r of this.renderers) r.dispose();
    this.renderers.length = 0;
    this.state.reset();
    this.root.remove();
  }
}
