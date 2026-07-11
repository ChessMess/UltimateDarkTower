// `./plugin` helper — the lazily-loaded 3D adapter for `BoardStageView`.
//
// `BoardStageView` (the `./stage` entry) is three-free in its static graph; it
// reaches the 3D world ONLY through a dynamic `import('../plugin/stageTower')`,
// so `three`/Display land in a separate chunk that a 2D-only app never loads.
// This module is the single place that builds Display's `TowerRenderView` and
// wires the board's `attachBoard3D` onto it (lifted from the example's old
// `create3D`/`dispose3D`). It lives under `src/plugin/` so the CI three-free
// guard (which excludes `src/plugin/`) is satisfied without changes.
import { TowerRenderView, TOWER_DISPLAY_CSS } from 'ultimatedarktowerdisplay';
import type { Tower3DView } from 'ultimatedarktowerdisplay';
import { attachBoard3D } from './index';
import type { BoardState } from '../state/boardState';
import type { LocationName } from '../state/boardState';
import type { BoardFocus } from '../renderers/shared';
import type {
  BoardView,
  TokenArtConfig,
  TokenArtRef,
  TokenSelection,
} from '../renderers/assetPaths';
import type { LocationPickStore } from '../ui/stores';

/** Options for {@link createBoardTower3D} — a subset of `TowerRenderView` + `attachBoard3D`. */
export interface BoardTower3DOptions {
  /** Element the Display `TowerRenderView` mounts into (the stage's 3D pane). */
  container: HTMLElement;
  /** Tower GLB URL (Display renders the tower model; required for the 3D view). */
  modelUrl: string;
  /** Board state to render on first build (the stage owns mutations afterward). */
  boardState: BoardState;
  /** Token-art root, e.g. `'./tokens/'`. */
  assetBaseUrl?: string;
  /** Board surface image; renders the board's own art on the disc and hides Display's placeholder. */
  boardImageUrl?: string;
  /** Per-token art overrides (the SAME object passed to the 2D map). */
  tokenArt?: TokenArtConfig;
  /** Override the default 3D sprite art path; `null` → fallback. */
  resolveTokenImage?: (ref: TokenArtRef, view: BoardView) => string | null;
  /** Shared armed space-pick channel (lets palette placement work in 3D). */
  locationPick?: LocationPickStore;
  /** Fired when a token is clicked in the 3D scene. */
  onTokenSelect?: (selection: TokenSelection) => void;
  /** Fired when a space is clicked while the placement is armed. */
  onLocationPick?: (location: LocationName) => void;
  /** Fired when the camera side changes (the 3D camera is the focus source of truth). */
  onFocusChange?: (focus: BoardFocus) => void;
}

/** Live handle over a built 3D board (the tower view + its attached board plugin). */
export interface BoardTower3DHandle {
  /** The Display view (escape hatch for camera/lighting/audio tweaks). */
  readonly tower: TowerRenderView;
  /** The live `Tower3DView` the board plugin is attached to. */
  readonly view3D: Tower3DView;
  /** Replace the rendered board state (re-places tokens). */
  setBoardState(state: BoardState): void;
  /** Drive the shared focus into the 3D camera. */
  setFocus(focus: BoardFocus): void;
  /** Tear down the board plugin AND the tower view. */
  dispose(): void;
}

/**
 * Build a Display `TowerRenderView` in `container` and attach the board's 3D plugin
 * to it. Returns `null` if the 3D view is unavailable (e.g. no WebGL), mirroring the
 * example's old guard. Lifted from `example/src/main.ts`'s `create3D`.
 */
export function createBoardTower3D(options: BoardTower3DOptions): BoardTower3DHandle | null {
  const tower = new TowerRenderView({ container: options.container, modelUrl: options.modelUrl });
  const view3D = tower.view3D;
  if (!view3D) {
    tower.dispose();
    return null;
  }
  const handle = attachBoard3D(view3D, {
    assetBaseUrl: options.assetBaseUrl,
    boardImageUrl: options.boardImageUrl,
    boardState: options.boardState,
    tokenArt: options.tokenArt,
    resolveTokenImage: options.resolveTokenImage,
    locationPick: options.locationPick,
    onTokenSelect: options.onTokenSelect,
    onLocationPick: options.onLocationPick,
    onFocusChange: options.onFocusChange,
  });
  return {
    tower,
    view3D,
    setBoardState: (state) => handle.setBoardState(state),
    setFocus: (focus) => handle.setFocus(focus),
    dispose: () => {
      handle.dispose();
      tower.dispose();
    },
  };
}

/**
 * Display's chrome CSS, re-exported so the stage can inject it into a pop-out
 * window (a separate document) without a static Display import on the stage side.
 * Display's `TowerRenderView` already injects this into the MAIN document on
 * construction, so it is only needed for the detached popup.
 */
export const STAGE_TOWER_CSS = TOWER_DISPLAY_CSS;
