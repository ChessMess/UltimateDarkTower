// Demo composition root. Builds the two persistent renderers (2D map via
// BoardRenderView, 3D board via TowerRenderView + attachBoard3D) once, mounts the
// dockable editing UI directly so we own its handle, seeds a board, then wires the
// shell controllers. Everything shares ONE controller / selection / focus.
import { BoardRenderView, mountBoardUI } from '../../src/index';
import type { BoardFocus, BoardUIHandle, TokenSelection } from '../../src/index';
import { TowerRenderView } from 'ultimatedarktowerdisplay';
import { attachBoard3D } from '../../src/plugin/index';
import type { Board3DHandle } from '../../src/plugin/index';
// Per-token 2D-vs-3D art overrides, authored as per-kind JSON (see ./tokenArt/*.json).
import { tokenArt } from './tokenArt';
import { queryDom } from './dom';
import { seedBoard } from './presets';
import { initDisplayModeController } from './displayModeController';
import { initDragModeController } from './dragModeController';
import { initInstructionsController } from './instructionsController';
import { initJsonController } from './jsonController';
import { initLayoutManager } from './layoutManager';
import { initMapControls } from './mapControlsController';
import { initPanelCollapseController } from './panelCollapseController';
import { initPipController } from './pipController';
import { initPanelPositions } from './positions';
import { initPopOutController } from './popOutController';
import { initSidebarController } from './sidebarController';

const els = queryDom();

// The live 3D board (tower + plugin handle). Declared up front because the
// controller subscribe loop below references it, and seeding fires that loop
// before `create3D` runs.
interface Board3D {
  tower: TowerRenderView;
  handle: Board3DHandle;
}
let current3D: Board3D | undefined;
// Set once the 2D map control bar is mounted (declared up front for the focus
// handler below); a no-op until then.
let reflectMapFocus: (focus: BoardFocus) => void = () => {};

const logSelection = (sel: TokenSelection): void => {
  // eslint-disable-next-line no-console
  console.log('token selected', sel);
};

// 2D map + readout. The map has wheel-zoom / drag-spin / double-click-reset on by
// default (drag flips to pan via the Spin/Pan toggle); the kingdom focus is driven
// by the on-map N/E/S/W/All bar below.
const view = new BoardRenderView({
  mapContainer: els.mapHost,
  assetBaseUrl: './tokens/',
  boardImageUrl: './board.png',
  tokenArt, // 2D map reads each token's `image2d`
  onTokenSelect: logSelection,
  // Fan a focus change out to the 3D camera + the 2D map's control bar, then refresh.
  onFocusChange: (focus) => {
    current3D?.handle.setFocus(focus);
    reflectMapFocus(focus);
    refresh();
  },
});

// N/E/S/W/All bar stacked above the 2D map (drives the shared focus).
reflectMapFocus = initMapControls(els, view).reflect;

// Spin / Pan toggle for the 2D map's left-drag (default Spin = rotate about center).
initDragModeController(els, view);

// The dockable editing UI (palette + inspector). Mounted DIRECTLY (not via
// BoardRenderView's `ui` option) so we keep the handle and can toggle each
// panel's visibility from the sidebar. The host overlays the whole hero, so the
// floating panels work in every display mode (including 2D-only). The per-kingdom
// summary panel is omitted here — the docked Board Status readout covers it.
const ui: BoardUIHandle = mountBoardUI(els.heroOverlay, {
  controller: view.controller,
  selection: view.selection,
  locationPick: view.locationPick,
  panels: {
    palette: { corner: 'tl' },
    inspector: { corner: 'tr' },
    summary: false, // built but hidden — not shown in this demo
  },
});

// The library cascades each floating panel down 16px; align the Inspector's top
// (and inset) with the Palette's so the two top panels sit on the same line.
alignPanelTops(els.heroOverlay);
// Then restore any positions the user previously dragged the panels to (overrides
// the alignment above) and keep persisting them after each drag.
initPanelPositions(els.heroOverlay);

const jsonCtl = initJsonController(els, view);

function refresh(): void {
  els.readout.textContent = view.readout.getText();
  jsonCtl.refreshPreview();
}

// Push controller changes into the 3D plugin + refresh the readout/JSON. (The 2D
// map + readout text are re-rendered by BoardRenderView itself on every change;
// here we also drive the 3D board and the example's own panels.)
view.controller.subscribe((event) => {
  if (event.type !== 'change') return;
  refresh();
  current3D?.handle.setBoardState(event.state);
});

// Seed before building the 3D so it attaches with the populated state.
seedBoard(view.controller);

// ── 3D board factory (re-used by the pop-out controller) ────────────────────
function create3D(container: HTMLElement): void {
  // The tower GLB is example-only (example/public/, never bundled).
  const tower = new TowerRenderView({ container, modelUrl: './tower.glb' });
  if (!tower.view3D) {
    current3D = undefined;
    return;
  }
  const handle = attachBoard3D(tower.view3D, {
    assetBaseUrl: './tokens/',
    boardImageUrl: './board.png', // render our own board (hides Display's placeholder)
    boardState: view.controller.getState(),
    tokenArt, // shared table: 3D renders `model3d`, else the image as a billboard
    locationPick: view.locationPick, // armed space-pick from the palette works in 3D too
    onTokenSelect: (sel) => {
      view.selection.set(sel); // shared selection → the inspector
      logSelection(sel);
    },
  });
  current3D = { tower, handle };
}

function dispose3D(): void {
  current3D?.handle.dispose();
  current3D?.tower.dispose();
  current3D = undefined;
}

create3D(els.scene3d);

// ── Shell controllers ───────────────────────────────────────────────────────
initPanelCollapseController();
initLayoutManager(els);
initInstructionsController(els);
initSidebarController(els, view, ui, jsonCtl);
initPipController(els);
initDisplayModeController(els);
initPopOutController(els, { create3D, dispose3D });

refresh();

/** Put the Inspector panel on the same line as the Palette (defeat the 16px cascade). */
function alignPanelTops(host: HTMLElement): void {
  const panels = Array.from(host.querySelectorAll<HTMLElement>('.udt-panel'));
  const find = (title: string): HTMLElement | undefined =>
    panels.find((p) => p.querySelector('.udt-panel-title-text')?.textContent === title);
  const palette = find('Palette');
  const inspector = find('Inspector');
  if (!palette || !inspector) return;
  inspector.style.top = palette.style.top; // same horizontal line
  inspector.style.right = palette.style.left; // mirror the palette's inset
}
