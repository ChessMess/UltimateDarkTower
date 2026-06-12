// Demo composition root. The whole render stage — 2D map + 3D tower, the mode
// switcher (2D / 3D / 2D+3D / PiP) with swap, the movable/resizable PiP inset,
// Pop Out, the Spin/Pan toggle, the N/E/S/W + All kingdom-zoom bar,
// and the dockable palette/inspector — is now ONE component, `BoardStageView`
// (`ultimatedarktowerboard/stage`). This file just mounts it, seeds a board, and
// wires the demo's own page chrome (sidebar, JSON editor, instructions, readout)
// onto the stage's shared controller. The 3D tower is loaded lazily by the stage.
import { BoardStageView } from '../../src/stage/index';
import type { TokenSelection } from '../../src/index';
// Per-token 2D-vs-3D art overrides, authored as per-kind JSON (see ./tokenArt/*.json).
import { tokenArt } from './tokenArt';
import { queryDom } from './dom';
import { seedBoard } from './presets';
import { initInstructionsController } from './instructionsController';
import { initJsonController } from './jsonController';
import { initPanelCollapseController } from './panelCollapseController';
import { initSidebarController } from './sidebarController';

const els = queryDom();

// Pin the stage container to the available viewport height so the 2D/3D views scale
// with the window (the 3D canvas needs a definite box). Suspended while popped out.
let layoutSuspended = false;
function sizeStage(): void {
  if (layoutSuspended) return;
  const top = els.boardStage.getBoundingClientRect().top + window.scrollY;
  const padBottom = parseFloat(getComputedStyle(els.grid).paddingBottom) || 0;
  els.boardStage.style.height = `${Math.max(240, window.innerHeight - top - padBottom)}px`;
}

// The all-in-one render stage. Default first-run layout is PiP (3D big, 2D inset);
// the tower GLB is example-only (example/public/, never bundled).
const stage = new BoardStageView({
  container: els.boardStage,
  assetBaseUrl: './tokens/',
  boardImageUrl: './board.png',
  tokenArt, // shared: the 2D map reads image2d, the 3D tower model3d / image3d
  modelUrl: './tower.glb',
  editingUI: {
    panels: {
      palette: { corner: 'tl' },
      inspector: { corner: 'tr' },
      summary: false, // built but hidden — the docked Board Status readout covers it
    },
  },
  onTokenSelect: (sel: TokenSelection) => {
    // eslint-disable-next-line no-console
    console.log('token selected', sel);
  },
  onFocusChange: () => refresh(),
  onPopOut: (poppedOut) => {
    layoutSuspended = poppedOut;
    if (!poppedOut) {
      els.boardStage.style.height = '';
      sizeStage();
    }
  },
});

// Seed a demo board through the shared controller.
seedBoard(stage.controller);

const jsonCtl = initJsonController(els, stage.view);

function refresh(): void {
  els.readout.textContent = stage.readout.getText();
  jsonCtl.refreshPreview();
}

// Re-sync the readout + JSON whenever the board changes (the 2D map / 3D tower are
// driven by the stage itself).
stage.controller.subscribe((event) => {
  if (event.type === 'change') refresh();
});

// ── Demo page chrome ─────────────────────────────────────────────────────────
initPanelCollapseController();
initInstructionsController(els);
const editingUI = stage.editingUI;
if (editingUI) initSidebarController(els, stage.view, editingUI, jsonCtl);

refresh();

// Size the stage now and whenever the window / sidebar / instructions reflow.
window.addEventListener('resize', sizeStage);
const layoutObserver = new ResizeObserver(sizeStage);
layoutObserver.observe(els.sidebar);
layoutObserver.observe(els.instructions);
sizeStage();
