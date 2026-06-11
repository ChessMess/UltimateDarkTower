// Persists the positions the user drags things to so they survive a refresh and a
// PiP swap: (1) the PiP inset — one shared slot, whichever pane is the inset uses
// it; (2) the library's floating Palette / Inspector panels, keyed by title.
import type { DomElements } from './dom';
import { readLocal, writeLocal } from './utils';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ── PiP inset (single slot shared by whichever pane is `.is-mini`) ─────────────

const PIP_KEY = 'udtb.pip.inset';

/** One shared inset box (position + size); any field may be absent. */
export interface InsetBox {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function readPipInset(): InsetBox | null {
  const raw = readLocal(PIP_KEY);
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
export function savePipInset(patch: InsetBox): void {
  const next = { ...(readPipInset() ?? {}), ...patch };
  writeLocal(PIP_KEY, JSON.stringify(next));
}

/** The pane currently acting as the PiP inset (or null). */
function insetPane(els: DomElements): HTMLElement | null {
  if (els.scene2d.classList.contains('is-mini')) return els.scene2d;
  if (els.scene3d.classList.contains('is-mini')) return els.scene3d;
  return null;
}

/**
 * Apply the saved inset box (size then position, both clamped to the stage) onto
 * the current `.is-mini` pane. No-op when nothing is saved or no pane is the inset,
 * so the CSS default corner + size stand until the user drags or resizes it.
 */
export function applyPipInset(els: DomElements): void {
  const pane = insetPane(els);
  if (!pane) return;
  const saved = readPipInset();
  if (!saved) return;

  const bounds = els.renderedPanel;
  // Size first so the position clamp measures the final box.
  if (isNum(saved.width)) {
    pane.style.width = `${clamp(saved.width, MIN_INSET, bounds.clientWidth)}px`;
  }
  if (isNum(saved.height)) {
    pane.style.height = `${clamp(saved.height, MIN_INSET, bounds.clientHeight)}px`;
  }
  if (isNum(saved.left) && isNum(saved.top)) {
    const maxLeft = Math.max(0, bounds.clientWidth - pane.offsetWidth);
    const maxTop = Math.max(0, bounds.clientHeight - pane.offsetHeight);
    pane.style.right = 'auto';
    pane.style.bottom = 'auto';
    pane.style.left = `${clamp(saved.left, 0, maxLeft)}px`;
    pane.style.top = `${clamp(saved.top, 0, maxTop)}px`;
  }
}

/** Smallest the inset may be dragged/resized to (px). */
export const MIN_INSET = 150;

// ── Floating panels (Palette / Inspector), keyed by title text ────────────────

const PANELS_KEY = 'udtb.panels.pos';

interface PanelPos {
  left?: string;
  top?: string;
  right?: string;
  bottom?: string;
}
type PanelPosMap = Record<string, PanelPos>;

function readPanelPositions(): PanelPosMap {
  const raw = readLocal(PANELS_KEY);
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? (v as PanelPosMap) : {};
  } catch {
    return {};
  }
}

function titleOf(panel: HTMLElement): string {
  return panel.querySelector('.udt-panel-title-text')?.textContent ?? '';
}

/**
 * Restore any saved panel positions onto the mounted panels (overriding the
 * library's cascade defaults and `alignPanelTops`), then persist every panel's
 * position whenever a title-bar drag ends. Call AFTER the panels are mounted and
 * default-aligned.
 */
export function initPanelPositions(host: HTMLElement): void {
  const panels = (): HTMLElement[] =>
    Array.from(host.querySelectorAll<HTMLElement>('.udt-panel'));

  const saved = readPanelPositions();
  for (const panel of panels()) {
    const pos = saved[titleOf(panel)];
    if (!pos) continue;
    panel.style.left = pos.left ?? '';
    panel.style.top = pos.top ?? '';
    panel.style.right = pos.right ?? '';
    panel.style.bottom = pos.bottom ?? '';
  }

  // The library drags a panel by its title bar via a document-level mouseup; save
  // once that drag concludes (not on every stray click elsewhere).
  host.addEventListener('mousedown', (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target?.closest('.udt-panel-title')) return;
    if (target.tagName === 'BUTTON') return; // collapse / close, not a drag
    document.addEventListener('mouseup', saveAll, { once: true });
  });

  function saveAll(): void {
    const map = readPanelPositions();
    for (const panel of panels()) {
      const title = titleOf(panel);
      if (!title) continue;
      map[title] = {
        left: panel.style.left || undefined,
        top: panel.style.top || undefined,
        right: panel.style.right || undefined,
        bottom: panel.style.bottom || undefined,
      };
    }
    writeLocal(PANELS_KEY, JSON.stringify(map));
  }
}
