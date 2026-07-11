// View switcher: 2D-only / 3D-only / side-by-side / picture-in-picture (with a
// big↔mini swap). Both panes stay mounted; modes are pure CSS show/hide/resize, so
// the 3D ResizeObserver re-fits on every change. Instance-scoped (operates on the
// stage's own elements) and persisted. Ported from the example's displayModeController.
import type { StageStorage } from './storage';

export type DisplayMode = '2d' | '3d' | '2d3d' | 'pip-2dbig' | 'pip-3dbig';

const MODE_CLASSES = ['bsv-mode-2d', 'bsv-mode-3d', 'bsv-mode-2d3d', 'bsv-mode-pip'];
const VALID: ReadonlySet<string> = new Set<DisplayMode>([
  '2d',
  '3d',
  '2d3d',
  'pip-2dbig',
  'pip-3dbig',
]);
const STORAGE_KEY = 'displayMode';

export interface DisplayModeElements {
  /** `.bsv-panel` — receives the `bsv-mode-*` class. */
  panel: HTMLElement;
  pane2d: HTMLElement;
  pane3d: HTMLElement;
  pills: { d2: HTMLButtonElement; d3: HTMLButtonElement; d2d3: HTMLButtonElement; pip: HTMLButtonElement };
  swap: HTMLButtonElement;
}

export interface DisplayModeOptions {
  initial: DisplayMode;
  storage: StageStorage;
  /** Restore the saved PiP inset onto the current `.is-mini` pane (called on entering/refreshing PiP). */
  applyPipInset(): void;
  /** Fired after a mode change settles. */
  onChange?(mode: DisplayMode): void;
}

export interface DisplayModeController {
  get(): DisplayMode;
  set(mode: DisplayMode): void;
  /** Toggle which pane is big in PiP. No-op outside PiP. */
  swap(): void;
}

export function createDisplayMode(
  els: DisplayModeElements,
  opts: DisplayModeOptions
): DisplayModeController {
  let current: DisplayMode = opts.initial;
  const stored = opts.storage.read(STORAGE_KEY);
  if (stored && VALID.has(stored)) current = stored as DisplayMode;

  const apply = (mode: DisplayMode): void => {
    current = mode;
    els.panel.classList.remove(...MODE_CLASSES);
    els.pane2d.classList.remove('is-big', 'is-mini');
    els.pane3d.classList.remove('is-big', 'is-mini');
    // Clear inline position/size from a previous drag/resize so CSS re-anchors the
    // panes (big = fill); PiP re-applies the saved inset below.
    for (const pane of [els.pane2d, els.pane3d]) {
      pane.style.left = pane.style.top = pane.style.right = pane.style.bottom = '';
      pane.style.width = pane.style.height = '';
    }

    if (mode === '2d') els.panel.classList.add('bsv-mode-2d');
    else if (mode === '3d') els.panel.classList.add('bsv-mode-3d');
    else if (mode === '2d3d') els.panel.classList.add('bsv-mode-2d3d');
    else {
      els.panel.classList.add('bsv-mode-pip');
      const twoBig = mode === 'pip-2dbig';
      els.pane2d.classList.add(twoBig ? 'is-big' : 'is-mini');
      els.pane3d.classList.add(twoBig ? 'is-mini' : 'is-big');
      opts.applyPipInset();
    }

    const isPip = mode.startsWith('pip');
    els.pills.d2.classList.toggle('is-active', mode === '2d');
    els.pills.d3.classList.toggle('is-active', mode === '3d');
    els.pills.d2d3.classList.toggle('is-active', mode === '2d3d');
    els.pills.pip.classList.toggle('is-active', isPip);
    els.swap.hidden = !isPip;

    opts.storage.write(STORAGE_KEY, mode);
    // Let the layout settle, then nudge so the 3D ResizeObserver re-fits the pane.
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    opts.onChange?.(mode);
  };

  const swap = (): void => {
    if (current.startsWith('pip')) apply(current === 'pip-2dbig' ? 'pip-3dbig' : 'pip-2dbig');
  };

  els.pills.d2.addEventListener('click', () => apply('2d'));
  els.pills.d3.addEventListener('click', () => apply('3d'));
  els.pills.d2d3.addEventListener('click', () => apply('2d3d'));
  // Entering PiP keeps the last big/mini choice (default 3D big, matching the demo).
  els.pills.pip.addEventListener('click', () =>
    apply(current === 'pip-2dbig' ? 'pip-2dbig' : 'pip-3dbig')
  );
  els.swap.addEventListener('click', swap);

  apply(current);
  return { get: () => current, set: apply, swap };
}
