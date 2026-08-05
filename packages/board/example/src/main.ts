// Demo composition root. The whole render stage — 2D map + 3D tower, the mode
// switcher (2D / 3D / 2D+3D / PiP) with swap, the movable/resizable PiP inset,
// Pop Out, the Spin/Pan toggle, the N/E/S/W + All kingdom-zoom bar,
// and the dockable palette/inspector — is now ONE component, `BoardStageView`
// (`ultimatedarktowerboard/stage`). This file just mounts it, seeds a board, and
// wires the demo's own page chrome (sidebar, JSON editor, instructions, readout)
// onto the stage's shared controller. The 3D tower is loaded lazily by the stage.
import { BoardStageView } from '../../src/stage/index';
import { makeTokenImageResolver } from '../../src/index';
import type { TokenSelection, TokenArtConfig } from '../../src/index';
// Art comes from @udtc/assets and is emitted by this example's own Vite build.
import { tokenUrls, tokenArt as assetTokenArt } from '@udtc/assets/tokens';
import { boardFullPng } from '@udtc/assets/board';
import { towerGlb } from '@udtc/assets/models';
// Per-token 2D-vs-3D art overrides, authored as per-kind JSON (see ./tokenArt/*.json).
import { tokenArt } from './tokenArt';
import { queryDom } from './dom';
import { seedBoard } from './presets';
import { initConfigColumnController } from './configColumnController';
import { initInstructionsController } from './instructionsController';
import { initJsonController } from './jsonController';
import { initPanelCollapseController } from './panelCollapseController';
import { initSidebarController } from './sidebarController';

/** Two-level merge of `kind → id → TokenArt`; `over` wins per token id. */
function mergeTokenArt(base: TokenArtConfig, over: TokenArtConfig): TokenArtConfig {
  const out: TokenArtConfig = { ...base };
  for (const [kind, entries] of Object.entries(over)) {
    out[kind] = { ...(out[kind] ?? {}), ...entries };
  }
  return out;
}

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

// The all-in-one render stage. Default first-run layout is PiP (3D big, 2D inset).
const stage = new BoardStageView({
  container: els.boardStage,
  // `resolveTokenImage` replaces `assetBaseUrl`: the art is bundler-hashed now, so the
  // `${base}${group}/${id}.png` convention can't build a working URL. The resolver runs the
  // library's own tables against a sentinel base and maps the result onto the bundled URLs.
  resolveTokenImage: makeTokenImageResolver(tokenUrls),
  boardImageUrl: boardFullPng,
  // Demo overrides layered on the package's own (which carries the skull's 3D model — models
  // are NOT covered by `resolveTokenImage`). Merged per KIND, not per top-level key: a shallow
  // spread would let `skull: {...}` from the demo drop the package's skull model entirely.
  tokenArt: mergeTokenArt(assetTokenArt, tokenArt),
  modelUrl: towerGlb,
  editingUI: {
    panels: {
      palette: { corner: 'tl' },
      inspector: { corner: 'tr' },
      summary: false, // built but hidden — the docked Board Status readout covers it
    },
  },
  onTokenSelect: (sel: TokenSelection) => {
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
initConfigColumnController(els);
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
