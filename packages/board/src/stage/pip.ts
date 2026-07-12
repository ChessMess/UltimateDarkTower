// Gives the PiP inset OS-window ergonomics: a grab strip at the top to move it and
// four corner handles to resize it (the opposite corner stays anchored). Handles
// show only while a pane is the inset (`.is-mini`); both panes get them so it works
// whichever view is the inset. Position + size persist (so they survive a refresh
// and a PiP swap). Ported from the example's pipController + positions (PiP half).
import type { StageStorage } from './storage';

/** Smallest the inset may be dragged/resized to (px). */
const MIN_INSET = 150;
const PIP_KEY = 'pip.inset';

/** Which edges a corner drags (-1 = left/top edge, +1 = right/bottom edge). */
interface Corner {
  cls: string;
  dx: -1 | 1;
  dy: -1 | 1;
}
const CORNERS: Corner[] = [
  { cls: 'bsv-pip-corner-nw', dx: -1, dy: -1 },
  { cls: 'bsv-pip-corner-ne', dx: 1, dy: -1 },
  { cls: 'bsv-pip-corner-sw', dx: -1, dy: 1 },
  { cls: 'bsv-pip-corner-se', dx: 1, dy: 1 },
];

/** One shared inset box (position + size); any field may be absent. */
interface InsetBox {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function readInset(storage: StageStorage): InsetBox | null {
  const raw = storage.read(PIP_KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as InsetBox;
    const out: InsetBox = {};
    if (isNum(v?.left)) out.left = v.left;
    if (isNum(v?.top)) out.top = v.top;
    if (isNum(v?.width)) out.width = v.width;
    if (isNum(v?.height)) out.height = v.height;
    return out;
  } catch {
    return null;
  }
}

/** Merge a partial box (position from a move, size from a resize) into the saved slot. */
function saveInset(storage: StageStorage, patch: InsetBox): void {
  const next = { ...(readInset(storage) ?? {}), ...patch };
  storage.write(PIP_KEY, JSON.stringify(next));
}

function makeEl(tag: string, className: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  return el;
}

/** Add the move strip + resize corners to each pane and wire the drags. */
export function enablePipInteractions(
  panes: HTMLElement[],
  bounds: HTMLElement,
  storage: StageStorage,
): void {
  for (const pane of panes) {
    const handle = makeEl('div', 'bsv-pip-handle');
    handle.title = 'Drag to move the inset';
    handle.setAttribute('aria-hidden', 'true');
    handle.appendChild(makeEl('span', 'bsv-pip-grip'));
    pane.appendChild(handle);
    makeMovable(pane, handle, bounds, storage);

    for (const corner of CORNERS) {
      const grip = makeEl('div', `bsv-pip-corner ${corner.cls}`);
      grip.title = 'Drag to resize the inset';
      grip.setAttribute('aria-hidden', 'true');
      pane.appendChild(grip);
      makeResizable(pane, grip, corner, bounds, storage);
    }
  }
}

/**
 * Apply the saved inset box (size then position, both clamped to the stage) onto the
 * current `.is-mini` pane. No-op when nothing is saved or no pane is the inset, so the
 * CSS default corner + size stand until the user drags or resizes it.
 */
export function applyPipInset(
  panes: HTMLElement[],
  bounds: HTMLElement,
  storage: StageStorage,
): void {
  const pane = panes.find((p) => p.classList.contains('is-mini'));
  if (!pane) return;
  const saved = readInset(storage);
  if (!saved) return;

  if (isNum(saved.width))
    pane.style.width = `${clamp(saved.width, MIN_INSET, bounds.clientWidth)}px`;
  if (isNum(saved.height))
    pane.style.height = `${clamp(saved.height, MIN_INSET, bounds.clientHeight)}px`;
  if (isNum(saved.left) && isNum(saved.top)) {
    const maxLeft = Math.max(0, bounds.clientWidth - pane.offsetWidth);
    const maxTop = Math.max(0, bounds.clientHeight - pane.offsetHeight);
    pane.style.right = 'auto';
    pane.style.bottom = 'auto';
    pane.style.left = `${clamp(saved.left, 0, maxLeft)}px`;
    pane.style.top = `${clamp(saved.top, 0, maxTop)}px`;
  }
}

/** Drag the top strip to move the inset (clamped within the stage). */
function makeMovable(
  pane: HTMLElement,
  handle: HTMLElement,
  bounds: HTMLElement,
  storage: StageStorage,
): void {
  handle.addEventListener('mousedown', (down: MouseEvent) => {
    if (!pane.classList.contains('is-mini')) return; // only while the inset
    down.preventDefault();
    const start = anchorToLeftTop(pane, bounds);
    const startX = down.clientX;
    const startY = down.clientY;

    let left = start.left;
    let top = start.top;
    const move = (e: MouseEvent): void => {
      const maxLeft = Math.max(0, bounds.clientWidth - pane.offsetWidth);
      const maxTop = Math.max(0, bounds.clientHeight - pane.offsetHeight);
      left = clamp(start.left + (e.clientX - startX), 0, maxLeft);
      top = clamp(start.top + (e.clientY - startY), 0, maxTop);
      pane.style.left = `${left}px`;
      pane.style.top = `${top}px`;
    };
    onDrag(move, () => saveInset(storage, { left, top }));
  });
}

/** Drag a corner to resize the inset; the opposite corner stays pinned (OS-window style). */
function makeResizable(
  pane: HTMLElement,
  grip: HTMLElement,
  corner: Corner,
  bounds: HTMLElement,
  storage: StageStorage,
): void {
  grip.addEventListener('mousedown', (down: MouseEvent) => {
    if (!pane.classList.contains('is-mini')) return;
    down.preventDefault();
    down.stopPropagation();
    const start = anchorToLeftTop(pane, bounds);
    const w0 = pane.offsetWidth;
    const h0 = pane.offsetHeight;
    const right0 = start.left + w0; // pinned edge for a left-dragging corner
    const bottom0 = start.top + h0;
    const startX = down.clientX;
    const startY = down.clientY;

    let box: InsetBox = { left: start.left, top: start.top, width: w0, height: h0 };
    const move = (e: MouseEvent): void => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let left = start.left;
      let top = start.top;
      let width: number;
      let height: number;
      if (corner.dx === 1) {
        width = clamp(w0 + dx, MIN_INSET, bounds.clientWidth - start.left);
      } else {
        left = clamp(start.left + dx, 0, right0 - MIN_INSET);
        width = right0 - left;
      }
      if (corner.dy === 1) {
        height = clamp(h0 + dy, MIN_INSET, bounds.clientHeight - start.top);
      } else {
        top = clamp(start.top + dy, 0, bottom0 - MIN_INSET);
        height = bottom0 - top;
      }
      box = { left, top, width, height };
      pane.style.left = `${left}px`;
      pane.style.top = `${top}px`;
      pane.style.width = `${width}px`;
      pane.style.height = `${height}px`;
    };
    onDrag(move, () => saveInset(storage, box));
  });
}

/** Convert the pane from its CSS corner anchor to explicit left/top; return that origin. */
function anchorToLeftTop(pane: HTMLElement, bounds: HTMLElement): { left: number; top: number } {
  const paneRect = pane.getBoundingClientRect();
  const boundsRect = bounds.getBoundingClientRect();
  const left = paneRect.left - boundsRect.left;
  const top = paneRect.top - boundsRect.top;
  pane.style.right = 'auto';
  pane.style.bottom = 'auto';
  pane.style.left = `${left}px`;
  pane.style.top = `${top}px`;
  return { left, top };
}

/** Wire a document-level drag (live move + commit-on-mouseup). */
function onDrag(move: (e: MouseEvent) => void, commit: () => void): void {
  const up = (): void => {
    commit();
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
  };
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
}
