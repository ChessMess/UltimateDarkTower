// Left-sidebar controls: presets, quick-edit shortcuts, and the floating-panel
// visibility toggles. Everything funnels through the one shared controller, so
// the 2D map, 3D board, floating panels, readout, and JSON all stay in sync.
import type { BoardRenderView, BoardUIHandle, PanelId } from '../../src/index';
import type { DomElements } from './dom';
import type { JsonController } from './jsonController';
import {
  ALL_FOES,
  nextFoeId,
  randomBuilding,
  randomizeBoard,
  randomLocation,
  seedBoard,
} from './presets';
import { clearStoredState, readLocal, writeLocal } from './utils';

const PANELS_KEY = 'udtb.panels.visible';

type TogglePanel = Exclude<PanelId, 'summary'>;
type PanelVis = Record<TogglePanel, boolean>;

function readPanelVis(): PanelVis {
  const fallback: PanelVis = { palette: true, inspector: true };
  const raw = readLocal(PANELS_KEY);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<PanelVis>;
    return {
      palette: parsed.palette ?? true,
      inspector: parsed.inspector ?? true,
    };
  } catch {
    return fallback;
  }
}

export function initSidebarController(
  els: DomElements,
  view: BoardRenderView,
  ui: BoardUIHandle,
  json: JsonController,
): void {
  const c = view.controller;

  // Board-resetting actions are a deliberate "new board" intent, so they also
  // discard any unsaved JSON edits + clear a stale error and re-sync the view.
  const resetBoard = (mutate: () => void): void => {
    mutate();
    json.forceRefresh();
  };

  // ── Presets ──────────────────────────────────────────────────────────────
  els.btnSeed.addEventListener('click', () =>
    resetBoard(() => {
      c.reset();
      seedBoard(c);
    }),
  );
  els.btnRandom.addEventListener('click', () => resetBoard(() => randomizeBoard(c)));
  els.btnClear.addEventListener('click', () => resetBoard(() => c.reset()));

  // ── Quick edit ───────────────────────────────────────────────────────────
  for (const foe of ALL_FOES) {
    const opt = document.createElement('option');
    opt.value = foe;
    opt.textContent = foe;
    els.selQuickFoe.appendChild(opt);
  }

  els.btnAddFoe.addEventListener('click', () => {
    c.spawnFoe(nextFoeId(c), els.selQuickFoe.value, randomLocation());
  });

  const targetBuilding = (): string => {
    const sel = view.selection.get();
    if (sel && sel.kind === 'building') return sel.location || sel.id;
    return randomBuilding();
  };
  els.btnAddSkull.addEventListener('click', () => c.addSkull(targetBuilding(), 1));
  els.btnRemoveSkull.addEventListener('click', () => c.removeSkull(targetBuilding(), 1));

  // ── Settings ─────────────────────────────────────────────────────────────
  // Full reset: discard every persisted preference (PiP position/size, panel
  // positions + visibility, display mode, collapse + instructions state) and
  // reload so the page comes back exactly as a first visit (seeded demo board,
  // default layout). A reload is the only way to re-run every controller from
  // defaults without piecemeal teardown.
  els.btnResetBoard.addEventListener('click', () => {
    clearStoredState();
    window.location.reload();
  });

  // ── Floating-panel visibility ───────────────────────────────────────────
  const vis = readPanelVis();
  const bind = (id: TogglePanel, chk: HTMLInputElement): void => {
    chk.checked = vis[id];
    ui.setPanelVisible(id, vis[id]);
    chk.addEventListener('change', () => {
      vis[id] = chk.checked;
      ui.setPanelVisible(id, chk.checked);
      writeLocal(PANELS_KEY, JSON.stringify(vis));
    });
  };
  bind('palette', els.chkPalette);
  bind('inspector', els.chkInspector);
}
