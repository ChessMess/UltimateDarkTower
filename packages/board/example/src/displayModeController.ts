// View switcher: 2D-only / 3D-only / side-by-side / picture-in-picture (with a
// big↔mini swap). Both renderers stay mounted; modes are pure CSS show/hide/
// resize, so the 3D ResizeObserver re-fits the canvas on every change. Persisted.
import type { DomElements } from './dom';
import { applyPipInset } from './positions';
import { readLocal, writeLocal } from './utils';

export type DisplayMode = '2d' | '3d' | '2d3d' | 'pip-2dbig' | 'pip-3dbig';

const STORAGE_KEY = 'udtb.displayMode';
const MODE_CLASSES = ['mode-2d', 'mode-3d', 'mode-2d3d', 'mode-pip'];
const VALID: ReadonlySet<string> = new Set<DisplayMode>([
  '2d',
  '3d',
  '2d3d',
  'pip-2dbig',
  'pip-3dbig',
]);

export function initDisplayModeController(els: DomElements): void {
  // Default first-run layout: picture-in-picture with the 3D board as the main
  // view and the 2D map as the inset. A stored preference overrides this.
  let current: DisplayMode = 'pip-3dbig';
  const stored = readLocal(STORAGE_KEY);
  if (stored && VALID.has(stored)) current = stored as DisplayMode;

  const apply = (mode: DisplayMode): void => {
    current = mode;
    els.renderedPanel.classList.remove(...MODE_CLASSES);
    els.scene2d.classList.remove('is-big', 'is-mini');
    els.scene3d.classList.remove('is-big', 'is-mini');
    // Clear any inline position/size from a previous drag or resize so CSS
    // re-anchors the panes (big = fill); for PiP we re-apply the saved inset below.
    for (const pane of [els.scene2d, els.scene3d]) {
      pane.style.left = pane.style.top = pane.style.right = pane.style.bottom = '';
      pane.style.width = pane.style.height = '';
    }

    if (mode === '2d') els.renderedPanel.classList.add('mode-2d');
    else if (mode === '3d') els.renderedPanel.classList.add('mode-3d');
    else if (mode === '2d3d') els.renderedPanel.classList.add('mode-2d3d');
    else {
      els.renderedPanel.classList.add('mode-pip');
      const twoBig = mode === 'pip-2dbig';
      els.scene2d.classList.add(twoBig ? 'is-big' : 'is-mini');
      els.scene3d.classList.add(twoBig ? 'is-mini' : 'is-big');
      // Restore the spot the user last dragged the inset to (refresh + swap).
      applyPipInset(els);
    }

    const isPip = mode.startsWith('pip');
    els.btnView2d.classList.toggle('active', mode === '2d');
    els.btnView3d.classList.toggle('active', mode === '3d');
    els.btnView2d3d.classList.toggle('active', mode === '2d3d');
    els.btnViewPip.classList.toggle('active', isPip);
    els.btnPipSwap.hidden = !isPip;

    writeLocal(STORAGE_KEY, mode);
    // Let the new layout settle, then nudge so the layout manager re-clamps and
    // the 3D ResizeObserver re-fits to the resized pane.
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  };

  els.btnView2d.addEventListener('click', () => apply('2d'));
  els.btnView3d.addEventListener('click', () => apply('3d'));
  els.btnView2d3d.addEventListener('click', () => apply('2d3d'));
  els.btnViewPip.addEventListener('click', () =>
    apply(current === 'pip-3dbig' ? 'pip-3dbig' : 'pip-2dbig')
  );
  els.btnPipSwap.addEventListener('click', () =>
    apply(current === 'pip-2dbig' ? 'pip-3dbig' : 'pip-2dbig')
  );

  apply(current);
}
