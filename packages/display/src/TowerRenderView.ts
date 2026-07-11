import type { TowerState, TowerSide, SealIdentifier } from 'ultimatedarktower';
import type { LightingConfig, CameraConfig, ApplyCameraConfigOptions, AudioConfig } from './3d/types';
import type { ITowerDisplay, RendererType, TowerDisplayOptions, AppliedTowerState } from './types';
import { TowerDisplay } from './TowerDisplay';
import type { Tower3DView, PerfReport } from './3d/Tower3DView';

export type TowerRenderViewBadgeTone = 'neutral' | 'accent' | 'warn' | 'good';

export interface TowerRenderViewBadge {
  /** Handle for {@link TowerRenderView.updateBadge}. */
  id?: string;
  label: string;
  value?: string;
  tone?: TowerRenderViewBadgeTone;
}

export interface TowerRenderViewOptions {
  /** DOM element to render into. */
  container: HTMLElement;

  /** Which renderer(s) to show. Defaults to `'3d-view'` (the headline render). */
  renderers?: RendererType | RendererType[];
  /** URL of the GLB model for the 3D view. Required when `renderers` includes `'3d-view'`. */
  modelUrl?: string;
  dracoDecoderPath?: string;
  debug3D?: boolean;
  showGroundDisc?: boolean;
  lighting?: LightingConfig;
  camera?: CameraConfig;
  audio?: AudioConfig;
  clickToToggleSeals?: boolean;
  injectStyles?: boolean;

  onSealClick?: (seal: SealIdentifier) => void;
  onSideChange?: (side: TowerSide) => void;
  onLoadError?: (details: unknown) => void;
  /** Called when a calibration command finishes its sequence. See {@link TowerDisplayOptions.onCalibrationComplete}. */
  onCalibrationComplete?: (finalState: TowerState) => void;

  /** Optional polished chrome — omit for a bare renderer. */
  title?: string;
  subtitle?: string;
  badges?: TowerRenderViewBadge[];
  actions?: HTMLElement[];
  /** Extra class on `.trv-root` for theming hooks. */
  className?: string;
  /**
   * Eagerly create an absolutely-positioned overlay layer above the canvas (a HUD
   * docking spot). Equivalent to calling {@link TowerRenderView.getOverlayContainer}.
   * Default false.
   */
  overlay?: boolean;
}

/** A docking region around the canvas, created on demand by {@link TowerRenderView.getPanelSlot}. */
export type TowerRenderViewPanelPosition = 'left' | 'right' | 'top' | 'bottom';

/**
 * All-in-one render view facade. Wraps a {@link TowerDisplay} with optional
 * header chrome (title, subtitle, status badges, action row) and exposes the
 * common state + 3D config API. Recommended entry point for new consumers —
 * advanced 3D config is reached via the `display` / `view3D` escape hatches.
 *
 * @example Minimal one-liner
 * ```ts
 * import { TowerRenderView } from 'ultimatedarktowerdisplay';
 * import towerModelUrl from 'ultimatedarktowerdisplay/dist/3d/assets/tower.glb';
 *
 * const view = new TowerRenderView({
 *   container: document.getElementById('tower')!,
 *   modelUrl: towerModelUrl,
 * });
 * view.applyState(state);
 * ```
 *
 * @example With chrome
 * ```ts
 * const view = new TowerRenderView({
 *   container,
 *   modelUrl: towerModelUrl,
 *   title: 'Render',
 *   badges: [{ id: 'conn', label: 'BLE', value: 'connected', tone: 'good' }],
 * });
 * view.updateBadge('conn', { value: 'disconnected', tone: 'warn' });
 * ```
 */
export class TowerRenderView implements ITowerDisplay {
  private readonly rootEl: HTMLDivElement;
  private readonly bodyEl: HTMLDivElement;
  private headerEl: HTMLDivElement | null = null;
  private titleEl: HTMLHeadingElement | null = null;
  private subtitleEl: HTMLParagraphElement | null = null;
  private badgesEl: HTMLDivElement | null = null;
  private actionsEl: HTMLDivElement | null = null;
  private badgeIndex = new Map<string, HTMLSpanElement>();
  private currentBadges: TowerRenderViewBadge[] = [];

  /** Overlay HUD layer (lazy). */
  private overlayEl: HTMLDivElement | null = null;
  /** Docking grid wrapping the body (lazy; created on first panel slot). */
  private dockEl: HTMLDivElement | null = null;
  private panelSlots = new Map<TowerRenderViewPanelPosition, HTMLDivElement>();

  private readonly innerDisplay: TowerDisplay;

  constructor(options: TowerRenderViewOptions) {
    this.rootEl = document.createElement('div');
    this.rootEl.className = options.className ? `trv-root ${options.className}` : 'trv-root';

    this.bodyEl = document.createElement('div');
    this.bodyEl.className = 'trv-body';
    this.rootEl.appendChild(this.bodyEl);
    options.container.appendChild(this.rootEl);

    if (options.title !== undefined) this.setTitle(options.title);
    if (options.subtitle !== undefined) this.setSubtitle(options.subtitle);
    if (options.badges && options.badges.length > 0) this.setBadges(options.badges);
    if (options.actions && options.actions.length > 0) this.setActions(options.actions);

    const displayOptions: TowerDisplayOptions = {
      container: this.bodyEl,
      renderers: options.renderers ?? '3d-view',
      modelUrl: options.modelUrl,
      dracoDecoderPath: options.dracoDecoderPath,
      debug3D: options.debug3D,
      showGroundDisc: options.showGroundDisc,
      lighting: options.lighting,
      camera: options.camera,
      audio: options.audio,
      clickToToggleSeals: options.clickToToggleSeals,
      injectStyles: options.injectStyles,
      onSealClick: options.onSealClick,
      onSideChange: options.onSideChange,
      onLoadError: options.onLoadError,
      onCalibrationComplete: options.onCalibrationComplete,
    };

    this.innerDisplay = new TowerDisplay(displayOptions);

    if (options.overlay) this.getOverlayContainer();
  }

  // ── State methods (ITowerDisplay) ───────────────────────────────────────

  applyState(state: AppliedTowerState, force = false): void {
    this.innerDisplay.applyState(state, force);
  }

  applySeals(brokenSeals: SealIdentifier[]): void {
    this.innerDisplay.applySeals(brokenSeals);
  }

  selectSide(side: TowerSide): void {
    this.innerDisplay.selectSide(side);
  }

  setLedOverride(layer: number, light: number, effect: number): void {
    this.innerDisplay.setLedOverride(layer, light, effect);
  }

  clearLedOverrides(): void {
    this.innerDisplay.clearLedOverrides();
  }

  showIdle(): void {
    this.innerDisplay.showIdle();
  }

  // ── 3D config forwarders ────────────────────────────────────────────────

  applyLightingConfig(config: LightingConfig): void {
    this.innerDisplay.applyLightingConfig(config);
  }

  applyCameraConfig(config: CameraConfig, options?: ApplyCameraConfigOptions): void {
    this.innerDisplay.applyCameraConfig(config, options);
  }

  applyAudioConfig(config: AudioConfig): void {
    this.innerDisplay.applyAudioConfig(config);
  }

  /**
   * Play a tower sample as a one-shot, transient event — independent of the
   * state-driven `applyState` audio path. See {@link TowerDisplay.playSample}.
   */
  playSample(
    sample: number,
    opts?: { loop?: boolean; volume?: number },
  ): { stop: () => void } {
    return this.innerDisplay.playSample(sample, opts);
  }

  /**
   * Play an LED light sequence as a transient, one-shot event — independent
   * of the state-driven `applyState` path. See {@link TowerDisplay.playSequence}.
   */
  playSequence(sequenceId: number, opts?: { onComplete?: () => void }): boolean {
    return this.innerDisplay.playSequence(sequenceId, opts);
  }

  setSceneLights(opts: Parameters<TowerDisplay['setSceneLights']>[0]): void {
    this.innerDisplay.setSceneLights(opts);
  }

  playEntrance(): void {
    this.innerDisplay.playEntrance();
  }

  /**
   * Collect a perf snapshot from the 3D view. See {@link Tower3DView.collectPerfReport}.
   * Returns `null` when no 3D view is active.
   */
  collectPerfReport(durationMs?: number): Promise<PerfReport> | null {
    return this.innerDisplay.collectPerfReport(durationMs);
  }

  // ── Chrome mutators ─────────────────────────────────────────────────────

  setTitle(title: string | null): void {
    if (title === null || title === '') {
      if (this.titleEl) {
        this.titleEl.remove();
        this.titleEl = null;
      }
      this.maybeCollapseHeader();
      return;
    }
    this.ensureHeader();
    if (!this.titleEl) {
      this.titleEl = document.createElement('h2');
      this.titleEl.className = 'trv-title';
      this.getHeaderLeft().insertBefore(this.titleEl, this.subtitleEl ?? null);
    }
    this.titleEl.textContent = title;
  }

  setSubtitle(subtitle: string | null): void {
    if (subtitle === null || subtitle === '') {
      if (this.subtitleEl) {
        this.subtitleEl.remove();
        this.subtitleEl = null;
      }
      this.maybeCollapseHeader();
      return;
    }
    this.ensureHeader();
    if (!this.subtitleEl) {
      this.subtitleEl = document.createElement('p');
      this.subtitleEl.className = 'trv-subtitle';
      this.getHeaderLeft().appendChild(this.subtitleEl);
    }
    this.subtitleEl.textContent = subtitle;
  }

  setBadges(badges: TowerRenderViewBadge[]): void {
    if (badges.length === 0) {
      if (this.badgesEl) {
        this.badgesEl.remove();
        this.badgesEl = null;
      }
      this.badgeIndex.clear();
      this.currentBadges = [];
      this.maybeCollapseHeader();
      return;
    }
    this.ensureHeader();
    if (!this.badgesEl) {
      this.badgesEl = document.createElement('div');
      this.badgesEl.className = 'trv-badges';
      this.headerEl!.insertBefore(this.badgesEl, this.actionsEl ?? null);
    } else {
      this.badgesEl.replaceChildren();
    }
    this.badgeIndex.clear();
    this.currentBadges = badges.map((b) => ({ ...b }));
    for (const badge of this.currentBadges) {
      const el = this.buildBadgeEl(badge);
      this.badgesEl.appendChild(el);
      if (badge.id) this.badgeIndex.set(badge.id, el);
    }
  }

  updateBadge(id: string, patch: Partial<TowerRenderViewBadge>): void {
    const existing = this.badgeIndex.get(id);
    if (!existing) return;
    const idx = this.currentBadges.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const merged: TowerRenderViewBadge = { ...this.currentBadges[idx], ...patch, id };
    this.currentBadges[idx] = merged;
    const replacement = this.buildBadgeEl(merged);
    existing.replaceWith(replacement);
    this.badgeIndex.set(id, replacement);
  }

  setActions(actions: HTMLElement[]): void {
    if (actions.length === 0) {
      if (this.actionsEl) {
        this.actionsEl.remove();
        this.actionsEl = null;
      }
      this.maybeCollapseHeader();
      return;
    }
    this.ensureHeader();
    if (!this.actionsEl) {
      this.actionsEl = document.createElement('div');
      this.actionsEl.className = 'trv-actions';
      this.headerEl!.appendChild(this.actionsEl);
    } else {
      this.actionsEl.replaceChildren();
    }
    for (const a of actions) this.actionsEl.appendChild(a);
  }

  // ── Escape hatches ──────────────────────────────────────────────────────

  /** The wrapped {@link TowerDisplay}. Use for advanced 3D config not forwarded directly. */
  get display(): TowerDisplay {
    return this.innerDisplay;
  }

  /** Shortcut for `display.view3D`. */
  get view3D(): Tower3DView | null {
    return this.innerDisplay.view3D;
  }

  /** The outer `.trv-root` element. */
  get root(): HTMLElement {
    return this.rootEl;
  }

  /** The `.trv-body` element where the inner `TowerDisplay` mounts. */
  get body(): HTMLElement {
    return this.bodyEl;
  }

  get loadState(): 'pending' | 'ready' | 'error' | undefined {
    return this.innerDisplay.loadState;
  }

  // ── UI docking ──────────────────────────────────────────────────────────

  /**
   * The overlay layer above the canvas (a HUD docking spot). Created on demand.
   * The layer has `pointer-events: none` so empty areas still orbit/zoom; mounted
   * children opt back in (the bundled CSS sets `pointer-events: auto` on direct
   * children). Mount floating/movable panels here.
   */
  getOverlayContainer(): HTMLElement {
    if (!this.overlayEl) {
      this.overlayEl = document.createElement('div');
      this.overlayEl.className = 'trv-overlay';
      this.bodyEl.appendChild(this.overlayEl);
    }
    return this.overlayEl;
  }

  /**
   * A fixed docking region in the chrome around the canvas (an editor docking
   * spot). Created on demand; reflows the canvas without overlapping it. Mount
   * fixed side/top/bottom panels here.
   */
  getPanelSlot(position: TowerRenderViewPanelPosition): HTMLElement {
    this.ensureDock();
    let slot = this.panelSlots.get(position);
    if (!slot) {
      slot = document.createElement('div');
      slot.className = `trv-panel trv-panel-${position}`;
      this.dockEl!.appendChild(slot);
      this.panelSlots.set(position, slot);
    }
    return slot;
  }

  dispose(): void {
    this.innerDisplay.dispose();
    this.rootEl.remove();
    this.headerEl = null;
    this.titleEl = null;
    this.subtitleEl = null;
    this.badgesEl = null;
    this.actionsEl = null;
    this.badgeIndex.clear();
    this.currentBadges = [];
    this.overlayEl = null;
    this.dockEl = null;
    this.panelSlots.clear();
  }

  // ── Internals ───────────────────────────────────────────────────────────

  /** Lazily wrap `.trv-body` in a `.trv-dock` grid so panel slots can reflow it. */
  private ensureDock(): void {
    if (this.dockEl) return;
    this.dockEl = document.createElement('div');
    this.dockEl.className = 'trv-dock';
    // Insert the dock where the body sits, then move the body (and its mounted
    // display + any overlay) into the dock's center cell.
    this.rootEl.insertBefore(this.dockEl, this.bodyEl);
    this.dockEl.appendChild(this.bodyEl);
  }

  private ensureHeader(): void {
    if (this.headerEl) return;
    this.headerEl = document.createElement('div');
    this.headerEl.className = 'trv-header';
    const left = document.createElement('div');
    left.className = 'trv-header-left';
    this.headerEl.appendChild(left);
    this.rootEl.insertBefore(this.headerEl, this.bodyEl);
  }

  private getHeaderLeft(): HTMLDivElement {
    return this.headerEl!.querySelector('.trv-header-left') as HTMLDivElement;
  }

  private maybeCollapseHeader(): void {
    if (!this.headerEl) return;
    if (this.titleEl || this.subtitleEl || this.badgesEl || this.actionsEl) return;
    this.headerEl.remove();
    this.headerEl = null;
  }

  private buildBadgeEl(badge: TowerRenderViewBadge): HTMLSpanElement {
    const el = document.createElement('span');
    el.className = 'trv-badge';
    el.dataset.tone = badge.tone ?? 'neutral';
    const labelNode = document.createElement('span');
    labelNode.className = 'trv-badge-label';
    labelNode.textContent = badge.label;
    el.appendChild(labelNode);
    if (badge.value !== undefined) {
      const valueNode = document.createElement('span');
      valueNode.className = 'trv-badge-value';
      valueNode.textContent = badge.value;
      el.appendChild(valueNode);
    }
    return el;
  }
}
