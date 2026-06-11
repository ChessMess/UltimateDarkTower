// Gives the PiP inset OS-window ergonomics: a grab strip at the top to move it and
// four corner handles to resize it (the opposite corner stays anchored). Handles
// are shown only while a pane is the inset (`.is-mini`); both panes get them so it
// works whichever view is the inset (pip-2dbig vs pip-3dbig). Position + size are
// persisted via ./positions so they survive a refresh and a PiP swap.
import type { DomElements } from './dom';
import { MIN_INSET, savePipInset } from './positions';

/** Which edges a corner drags (-1 = left/top edge, +1 = right/bottom edge). */
interface Corner {
  cls: string;
  dx: -1 | 1;
  dy: -1 | 1;
}
const CORNERS: Corner[] = [
  { cls: 'pip-corner-nw', dx: -1, dy: -1 },
  { cls: 'pip-corner-ne', dx: 1, dy: -1 },
  { cls: 'pip-corner-sw', dx: -1, dy: 1 },
  { cls: 'pip-corner-se', dx: 1, dy: 1 },
];

export function initPipController(els: DomElements): void {
  for (const pane of [els.scene2d, els.scene3d]) {
    const handle = document.createElement('div');
    handle.className = 'pip-handle';
    handle.title = 'Drag to move the inset';
    handle.setAttribute('aria-hidden', 'true');
    handle.appendChild(makeEl('span', 'pip-grip'));
    pane.appendChild(handle);
    makeMovable(pane, handle, els.renderedPanel);

    for (const corner of CORNERS) {
      const grip = makeEl('div', `pip-corner ${corner.cls}`);
      grip.title = 'Drag to resize the inset';
      grip.setAttribute('aria-hidden', 'true');
      pane.appendChild(grip);
      makeResizable(pane, grip, corner, els.renderedPanel);
    }
  }
}

function makeEl(tag: string, className: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  return el;
}

/** Drag the top strip to move the inset (clamped within the stage). */
function makeMovable(pane: HTMLElement, handle: HTMLElement, bounds: HTMLElement): void {
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
    onDrag(move, () => savePipInset({ left, top }));
  });
}

/** Drag a corner to resize the inset; the opposite corner stays pinned (OS-window style). */
function makeResizable(
  pane: HTMLElement,
  grip: HTMLElement,
  corner: Corner,
  bounds: HTMLElement
): void {
  grip.addEventListener('mousedown', (down: MouseEvent) => {
    if (!pane.classList.contains('is-mini')) return;
    down.preventDefault();
    down.stopPropagation();
    const start = anchorToLeftTop(pane, bounds);
    const startX = down.clientX;
    const startY = down.clientY;
    const w0 = pane.offsetWidth;
    const h0 = pane.offsetHeight;
    const right0 = start.left + w0; // pinned edge for a left-dragging corner
    const bottom0 = start.top + h0;

    let box = { left: start.left, top: start.top, width: w0, height: h0 };
    const move = (e: MouseEvent): void => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let { left, top } = start;
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
    onDrag(move, () => savePipInset(box));
  });
}

/** Convert the pane from its CSS corner anchor to explicit left/top; return that origin. */
function anchorToLeftTop(
  pane: HTMLElement,
  bounds: HTMLElement
): { left: number; top: number } {
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
