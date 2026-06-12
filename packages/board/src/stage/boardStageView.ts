// `BoardStageView` — the batteries-included render stage. One `new BoardStageView({
// container })` gives a consumer everything the demo shows: 2D map + readout, the
// 2D/3D/2D+3D/PiP mode switcher with swap, a movable/resizable PiP inset, pop-out,
// the Spin/Pan drag toggle, the All/N/E/S/W (+ Overhead/Isometric) focus bar, the
// dockable palette/inspector, and a lazily-loaded 3D tower that can be turned on/off.
//
// It is three-free in its STATIC graph: the 3D tower (Display + `three`) is reached
// only through a dynamic `import('../plugin/stageTower')`, so a 2D-only app never
// loads `three`. The class orchestrates pieces that already exist — `BoardRenderView`
// (2D + readout + state), `mountFocusControls` (focus bar), `mountBoardUI` (editing
// UI), `attachBoard3D` (3D tokens) — adding only the new render-stage chrome.
import { BoardRenderView } from '../view/boardRenderView';
import { mountBoardUI } from '../ui';
import type { BoardUIHandle, BoardUIOptions } from '../ui';
import type { BoardState } from '../state/boardState';
import type { BoardKingdom } from '../data/udtReexports';
import type { BoardFocus } from '../renderers/shared';
import type {
  BoardView,
  DragMode,
  TokenArtConfig,
  TokenArtRef,
  TokenSelection,
} from '../renderers/map2d';
import { createStageStorage, noopStorage } from './storage';
import type { StageStorage } from './storage';
import { createDisplayMode } from './displayMode';
import type { DisplayMode, DisplayModeController } from './displayMode';
import { applyPipInset, enablePipInteractions } from './pip';
import { createPopOut } from './popOut';
import type { PopOutController } from './popOut';
import { createSegmented } from './segmented';
import type { Segmented } from './segmented';
import { BOARD_STAGE_CSS, injectStageStyles } from './styles';
// Type-only + relative path → invisible to the three-free CI guard and erased at
// runtime. The VALUE side is loaded lazily via `import('../plugin/stageTower')`.
import type { BoardTower3DHandle } from '../plugin/stageTower';

export type { DisplayMode } from './displayMode';

type StageTowerModule = typeof import('../plugin/stageTower');

export interface BoardStageViewOptions {
  /** Element the stage mounts into (it fills this container; you size the container). */
  container: HTMLElement;
  /** Initial board state (defaults to an empty board). The stage owns the controller. */
  initialState?: BoardState;
  /** Token-art root for both renderers, e.g. `'./tokens/'`. */
  assetBaseUrl?: string;
  /** Board surface image, e.g. `'./board.png'`. */
  boardImageUrl?: string;
  /** Per-token art overrides shared by the 2D map and the 3D tower. */
  tokenArt?: TokenArtConfig;
  /** Override the default token-art path; `null` → fallback. */
  resolveTokenImage?: (ref: TokenArtRef, view: BoardView) => string | null;
  /** Tower GLB URL — required to enable the 3D tower. */
  modelUrl?: string;
  /**
   * Whether the 3D tower is on. `'auto'` (default) enables it iff `modelUrl` is set; `true`
   * forces it on (no-op + warning without `modelUrl`); `false` starts 2D-only. Toggle later
   * with {@link BoardStageView.setTowerEnabled}. The 3D module is loaded lazily on first enable.
   */
  tower3D?: 'auto' | boolean;
  /** Show the built-in tower on/off button (default: shown when `modelUrl` is set). */
  towerToggle?: boolean;
  /** Initial display mode (default `pip-3dbig` when the tower is on, else `2d`). A stored pref wins. */
  defaultMode?: DisplayMode;
  /** Mount the dockable palette/inspector editing UI (default `true`). Pass a config object to tune it. */
  editingUI?: boolean | Omit<BoardUIOptions, 'controller' | 'selection' | 'locationPick'>;
  /** Wheel-zoom on the 2D map (default `true`). */
  enableZoom?: boolean;
  /** Max 2D-map zoom factor (default `8`). */
  maxZoom?: number;
  /** Initial 2D-map left-drag behaviour (`'rotate'` spin, default; `'pan'`). */
  dragMode?: DragMode;
  /** Persist layout prefs (mode, drag mode, PiP inset). `true`/object enables; `false` disables. Default `true`. */
  persist?: boolean | { prefix?: string };
  /** Inject {@link BOARD_STAGE_CSS} on construction (default `true`). */
  injectStyles?: boolean;
  /** Fired when a token is clicked in either renderer (selection is also updated). */
  onTokenSelect?: (selection: TokenSelection) => void;
  /** Fired when the shared focus changes. */
  onFocusChange?: (focus: BoardFocus) => void;
  /** Fired after a display-mode change. */
  onModeChange?: (mode: DisplayMode) => void;
  /** Fired when the 3D tower is enabled/disabled. */
  onTowerToggle?: (enabled: boolean) => void;
  /** Fired when the panel is popped out (`true`) / popped back in (`false`) — for host layout to react. */
  onPopOut?: (poppedOut: boolean) => void;
}

interface StageElements {
  root: HTMLDivElement;
  panel: HTMLDivElement;
  overlay: HTMLDivElement;
  pane2d: HTMLDivElement;
  pane3d: HTMLDivElement;
  mapHost: HTMLDivElement;
  dragHost: HTMLDivElement;
  kingdomHost: HTMLDivElement;
  allHost: HTMLDivElement;
  pills: { d2: HTMLButtonElement; d3: HTMLButtonElement; d2d3: HTMLButtonElement; pip: HTMLButtonElement };
  swap: HTMLButtonElement;
  popOut: HTMLButtonElement;
  towerBtn: HTMLButtonElement;
}

const DEFAULT_PREFIX = 'udtb.stage';

export class BoardStageView {
  /** The inner 2D facade (state controller + 2D map + readout + selection stores). */
  readonly view: BoardRenderView;

  private readonly options: BoardStageViewOptions;
  private readonly els: StageElements;
  private readonly storage: StageStorage;
  private readonly displayMode: DisplayModeController;
  private readonly dragModeBar: Segmented<DragMode>;
  private readonly kingdomBar: Segmented<BoardKingdom>;
  private readonly allBar: Segmented<'all'>;
  private readonly popOutCtl: PopOutController;
  private readonly ui?: BoardUIHandle;
  private readonly unsubscribe: () => void;

  private tower: BoardTower3DHandle | null = null;
  private towerModule: StageTowerModule | null = null;
  private towerEnabled = false;
  private currentDrag: DragMode;

  constructor(options: BoardStageViewOptions) {
    this.options = options;
    if (options.injectStyles !== false) injectStageStyles();

    const prefix =
      options.persist === false
        ? null
        : (typeof options.persist === 'object' && options.persist.prefix) || DEFAULT_PREFIX;
    this.storage = prefix ? createStageStorage(prefix) : noopStorage();

    this.els = buildDom(options.container);

    // 2D map + readout + state, via the existing facade. Its focus fan-out drives the
    // focus bar + the 3D camera + the user callback.
    this.view = new BoardRenderView({
      initialState: options.initialState,
      mapContainer: this.els.mapHost,
      assetBaseUrl: options.assetBaseUrl,
      boardImageUrl: options.boardImageUrl,
      tokenArt: options.tokenArt,
      resolveTokenImage: options.resolveTokenImage,
      enableZoom: options.enableZoom,
      maxZoom: options.maxZoom,
      dragMode: options.dragMode,
      onTokenSelect: (sel) => options.onTokenSelect?.(sel),
      onFocusChange: (focus) => {
        this.reflectKingdom(focus.kingdom);
        this.tower?.setFocus(focus);
        options.onFocusChange?.(focus);
      },
    });

    // On-map control bars, all built with the shared `createSegmented` helper so they
    // share one look and fill the toolbar row: Spin/Pan, then N/E/S/W, then All in its
    // own trailing group (the angle/Overhead-Isometric toggle is a 3D-camera concept and
    // deliberately not shown on the 2D-anchored bar).
    this.currentDrag = (this.storage.read('dragMode') as DragMode | null) ?? options.dragMode ?? 'rotate';
    this.dragModeBar = createSegmented<DragMode>(
      this.els.dragHost,
      [
        { key: 'rotate', label: 'Spin' },
        { key: 'pan', label: 'Pan' },
      ],
      (mode) => this.setDragMode(mode)
    );
    this.kingdomBar = createSegmented<BoardKingdom>(
      this.els.kingdomHost,
      [
        { key: 'north', label: 'N' },
        { key: 'east', label: 'E' },
        { key: 'south', label: 'S' },
        { key: 'west', label: 'W' },
      ],
      (kingdom) => this.focusKingdom(kingdom)
    );
    this.allBar = createSegmented<'all'>(
      this.els.allHost,
      [{ key: 'all', label: 'All' }],
      () => this.focusKingdom('all')
    );
    this.reflectKingdom(this.view.focus.kingdom);

    // Editing UI (palette / inspector) docked into the overlay.
    if (options.editingUI !== false) {
      const uiConfig = typeof options.editingUI === 'object' ? options.editingUI : undefined;
      this.ui = mountBoardUI(this.els.overlay, {
        controller: this.view.controller,
        selection: this.view.selection,
        locationPick: this.view.locationPick,
        ...uiConfig,
      });
    }

    // Display-mode switcher.
    const wantTower = options.tower3D === true || (options.tower3D !== false && Boolean(options.modelUrl));
    const initialMode: DisplayMode = options.defaultMode ?? (wantTower ? 'pip-3dbig' : '2d');
    this.displayMode = createDisplayMode(this.els, {
      initial: initialMode,
      storage: this.storage,
      applyPipInset: () => applyPipInset([this.els.pane2d, this.els.pane3d], this.els.panel, this.storage),
      onChange: (mode) => options.onModeChange?.(mode),
    });
    enablePipInteractions([this.els.pane2d, this.els.pane3d], this.els.panel, this.storage);

    // Pop-out (works 2D-only too; rebuilds the 3D tower in the popup when active).
    this.popOutCtl = createPopOut({
      panel: this.els.panel,
      pane3d: this.els.pane3d,
      toggleButton: this.els.popOut,
      create3D: (container) => this.buildTower(container),
      dispose3D: () => this.disposeTowerHandle(),
      setLayoutSuspended: (v) => options.onPopOut?.(v),
      stageCss: BOARD_STAGE_CSS,
      towerCss: () => this.towerModule?.STAGE_TOWER_CSS ?? null,
      onError: (msg) => console.warn(`[BoardStageView] ${msg}`),
    });

    // Optional tower on/off button (off by default — the mode pills already cover
    // showing/hiding the 3D view; this is an opt-in for apps that want to unload it).
    this.els.towerBtn.hidden = !(options.towerToggle ?? false);
    this.els.towerBtn.addEventListener('click', () => void this.setTowerEnabled(!this.towerEnabled));

    // Push controller changes into the 3D tower (the 2D map + readout are handled by
    // the inner BoardRenderView). The host drives its own readout/JSON off `.controller`.
    this.unsubscribe = this.view.controller.subscribe((event) => {
      if (event.type === 'change') this.tower?.setBoardState(event.state);
    });

    // Apply the persisted drag mode + reflect it, then clamp the mode if 2D-only.
    this.applyDragMode(this.currentDrag);
    if (!wantTower && this.displayMode.get() !== '2d') this.displayMode.set('2d');

    // Kick off the (lazy) 3D tower if wanted. Fire-and-forget — the 3D pane fills in
    // once the chunk + GLB load; the 2D side is already live. Mark `bsv-tower-on`
    // optimistically so the mode pills / angle group don't flash while the chunk loads
    // (reflectTowerUi corrects it if the 3D view turns out unavailable).
    if (wantTower) {
      this.els.root.classList.add('bsv-tower-on');
      void this.setTowerEnabled(true);
    } else {
      this.reflectTowerUi();
    }
  }

  // ── getters ─────────────────────────────────────────────────────────────────
  get controller() {
    return this.view.controller;
  }
  get readout() {
    return this.view.readout;
  }
  get selection() {
    return this.view.selection;
  }
  get locationPick() {
    return this.view.locationPick;
  }
  get focus(): BoardFocus {
    return this.view.focus;
  }
  get map2d() {
    return this.view.map2d;
  }
  /** The Display 3D view when the tower is active, else `null` (escape hatch for camera/lighting). */
  get tower3D() {
    return this.tower?.tower ?? null;
  }
  get root(): HTMLElement {
    return this.els.root;
  }
  get mode(): DisplayMode {
    return this.displayMode.get();
  }
  /** The dockable editing-UI handle when mounted (escape hatch for panel-visibility toggles). */
  get editingUI(): BoardUIHandle | undefined {
    return this.ui;
  }

  // ── methods ───────────────────────────────────────────────────────────────
  setDisplayMode(mode: DisplayMode): void {
    this.displayMode.set(mode);
  }

  /** Swap which pane is big in PiP. No-op outside PiP. */
  swap(): void {
    this.displayMode.swap();
  }

  setDragMode(mode: DragMode): void {
    this.storage.write('dragMode', mode);
    this.applyDragMode(mode);
  }

  setFocus(focus: BoardFocus): void {
    this.view.setFocus(focus);
  }

  /** Open the panel in a separate window (no-op if already popped out). */
  popOut(): void {
    if (!this.popOutCtl.isOpen()) this.popOutCtl.toggle();
  }

  /** Return the panel to the main window. */
  popIn(): void {
    this.popOutCtl.popIn();
  }

  /**
   * Turn the 3D tower on or off. Enabling lazily loads the 3D module (`three` + Display)
   * the first time; disabling tears it down and drops to 2D. No-op enabling without a `modelUrl`.
   */
  async setTowerEnabled(on: boolean): Promise<void> {
    if (on) {
      if (!this.options.modelUrl) {
        console.warn('[BoardStageView] tower3D requested but no modelUrl was provided.');
        return;
      }
      if (!this.towerModule) this.towerModule = await import('../plugin/stageTower');
      this.buildTower(this.els.pane3d);
      this.towerEnabled = Boolean(this.tower);
    } else {
      this.disposeTowerHandle();
      this.towerEnabled = false;
      if (this.displayMode.get() !== '2d') this.displayMode.set('2d');
    }
    this.reflectTowerUi();
    this.options.onTowerToggle?.(this.towerEnabled);
  }

  /** Clear this instance's persisted layout prefs and reset to defaults. */
  resetLayout(): void {
    this.storage.clear();
    this.setDragMode('rotate');
    const wantTower = this.towerEnabled;
    this.displayMode.set(this.options.defaultMode ?? (wantTower ? 'pip-3dbig' : '2d'));
  }

  dispose(): void {
    this.unsubscribe();
    this.popOutCtl.dispose();
    this.disposeTowerHandle();
    this.ui?.dispose();
    this.view.dispose();
    this.els.root.remove();
  }

  // ── internals ───────────────────────────────────────────────────────────────
  private applyDragMode(mode: DragMode): void {
    this.currentDrag = mode;
    this.view.setDragMode(mode);
    this.dragModeBar.setActive(mode);
  }

  /** Zoom the shared focus to a kingdom (or the whole board) and clear any manual map zoom. */
  private focusKingdom(kingdom: BoardKingdom | 'all'): void {
    if (kingdom !== this.view.focus.kingdom) this.view.map2d?.resetView();
    this.view.setFocus({ ...this.view.focus, kingdom });
  }

  /** Reflect the active kingdom across the N/E/S/W bar and the separate All button. */
  private reflectKingdom(kingdom: BoardKingdom | 'all'): void {
    this.kingdomBar.setActive(kingdom === 'all' ? null : kingdom);
    this.allBar.setActive(kingdom === 'all' ? 'all' : null);
  }

  /** (Re)build the 3D tower into `container` (the 3D pane, or the popup's pane). */
  private buildTower(container: HTMLElement): void {
    if (!this.towerModule || !this.options.modelUrl) return;
    this.disposeTowerHandle();
    this.tower = this.towerModule.createBoardTower3D({
      container,
      modelUrl: this.options.modelUrl,
      boardState: this.view.controller.getState(),
      assetBaseUrl: this.options.assetBaseUrl,
      boardImageUrl: this.options.boardImageUrl,
      tokenArt: this.options.tokenArt,
      resolveTokenImage: this.options.resolveTokenImage,
      locationPick: this.view.locationPick,
      onTokenSelect: (sel) => {
        this.view.selection.set(sel);
        this.options.onTokenSelect?.(sel);
      },
    });
    this.tower?.setFocus(this.view.focus);
  }

  private disposeTowerHandle(): void {
    this.tower?.dispose();
    this.tower = null;
    this.els.pane3d.replaceChildren();
  }

  /** Reflect tower on/off in the UI: show/hide the 3D-mode pills + the toggle button's active state. */
  private reflectTowerUi(): void {
    this.els.root.classList.toggle('bsv-tower-on', this.towerEnabled);
    this.els.towerBtn.classList.toggle('is-active', this.towerEnabled);
  }
}

/** Build the stage DOM skeleton into `container` and return typed element refs. */
function buildDom(container: HTMLElement): StageElements {
  const div = (className: string): HTMLDivElement => {
    const el = document.createElement('div');
    el.className = className;
    return el;
  };
  const pill = (label: string, mode: string): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bsv-pill';
    b.dataset.mode = mode;
    b.textContent = label;
    return b;
  };
  const action = (label: string, title: string): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bsv-action';
    b.title = title;
    b.textContent = label;
    return b;
  };

  const root = div('bsv-root');

  const toolbar = div('bsv-toolbar');
  const pills = div('bsv-pills');
  const d2 = pill('2D', '2d');
  const d3 = pill('3D', '3d');
  const d2d3 = pill('2D + 3D', '2d3d');
  const pip = pill('PiP', 'pip');
  pills.append(d2, d3, d2d3, pip);
  const right = div('bsv-toolbar-right');
  const towerBtn = action('Tower 3D', 'Show or hide the 3D tower');
  const swap = action('Swap ⇄', 'Swap which view is large');
  swap.hidden = true;
  const popOut = action('Pop Out ⤴', 'Open the board in a separate resizable window');
  right.append(towerBtn, swap, popOut);
  toolbar.append(pills, right);

  const panel = div('bsv-panel');
  const overlay = div('bsv-overlay');
  const pane2d = div('bsv-pane bsv-pane-2d');
  const paneToolbar = div('bsv-pane-toolbar');
  const dragHost = div('bsv-dragmode');
  const kingdomHost = div('bsv-kingdom');
  const allHost = div('bsv-all');
  paneToolbar.append(dragHost, kingdomHost, allHost);
  const mapHost = div('bsv-map-host');
  pane2d.append(paneToolbar, mapHost);
  const pane3d = div('bsv-pane bsv-pane-3d');
  panel.append(overlay, pane2d, pane3d);

  root.append(toolbar, panel);
  container.appendChild(root);

  return {
    root,
    panel,
    overlay,
    pane2d,
    pane3d,
    mapHost,
    dragHost,
    kingdomHost,
    allHost,
    pills: { d2, d3, d2d3, pip },
    swap,
    popOut,
    towerBtn,
  };
}
