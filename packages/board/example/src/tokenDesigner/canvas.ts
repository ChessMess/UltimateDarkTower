// The interactive SVG stage for the Token Designer. Renders the background + text fields into a
// viewBox-256×222 SVG (matches map2d.ts's inline-SVG approach) and hosts direct manipulation:
// drag a field to MOVE, drag the corner handle to RESIZE (font size), drag the top handle to
// ROTATE. It owns no state — main.ts holds the TokenDesign and passes it in; drags mutate that
// object in place (by reference) and report back via callbacks so the inspector + dirty flag stay
// in sync without a full re-render mid-drag.
import type { TokenDesign, TextField, Background } from './types';
import { CANVAS_W, CANVAS_H } from './types';

const SVGNS = 'http://www.w3.org/2000/svg';

export interface CanvasCallbacks {
  /** The current design (single source of truth, owned by main.ts). */
  getDesign: () => TokenDesign;
  getSelectedId: () => string | null;
  /** A field was clicked (or the empty canvas → null). */
  onSelect: (id: string | null) => void;
  /** A field's geometry changed via a drag. `commit` = the gesture ended (good time to snapshot). */
  onFieldChange: (commit: boolean) => void;
  /** The background was panned via a drag. `commit` = the gesture ended. */
  onBackgroundChange: (commit: boolean) => void;
}

type Mode = 'move' | 'resize' | 'rotate';

export interface DesignCanvas {
  root: HTMLElement;
  /** Rebuild the SVG from the current design + selection. */
  refresh: () => void;
  /** The live <svg> (used by the PNG exporter to clone a handle-free copy). */
  svg: SVGSVGElement;
}

export function createCanvas(cb: CanvasCallbacks): DesignCanvas {
  const root = document.createElement('div');
  root.className = 'td-stage';

  const svg = document.createElementNS(SVGNS, 'svg') as SVGSVGElement;
  svg.setAttribute('viewBox', `0 0 ${CANVAS_W} ${CANVAS_H}`);
  svg.setAttribute('class', 'td-canvas');
  root.appendChild(svg);

  const bgLayer = document.createElementNS(SVGNS, 'g');
  const fieldLayer = document.createElementNS(SVGNS, 'g');
  svg.append(bgLayer, fieldLayer);

  // Click on empty canvas → deselect. (Field clicks stopPropagation.)
  svg.addEventListener('pointerdown', (e) => {
    if (e.target === svg || e.target === bgLayer || (e.target as Element).classList.contains('td-bg')) {
      cb.onSelect(null);
    }
  });

  function clientToToken(clientX: number, clientY: number): { x: number; y: number } {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const loc = pt.matrixTransform(ctm.inverse());
    return { x: loc.x, y: loc.y };
  }

  function refresh(): void {
    const design = cb.getDesign();
    const selectedId = cb.getSelectedId();
    const w = design.canvas.width;
    const h = design.canvas.height;
    // The token's pixel size is user-editable, so keep the viewBox in sync each render.
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    // ── background ──
    bgLayer.replaceChildren();
    const bg = design.background;
    if (bg) {
      // The image sits in a transform group so scale (zoom) + offset (pan) compose cleanly on top of
      // the fit; the outer <svg> viewport clips anything past the token bounds.
      const group = document.createElementNS(SVGNS, 'g');
      group.setAttribute('class', 'td-bg-group');
      group.setAttribute('transform', bgTransform(bg, w, h));

      const img = document.createElementNS(SVGNS, 'image');
      img.setAttribute('class', 'td-bg');
      img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', bg.src);
      img.setAttribute('href', bg.src);
      img.setAttribute('x', '0');
      img.setAttribute('y', '0');
      img.setAttribute('width', String(w));
      img.setAttribute('height', String(h));
      img.setAttribute('preserveAspectRatio', bg.fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice');
      // Drag the background to pan it within the token.
      img.addEventListener('pointerdown', (e) => startBgPan(e));
      group.appendChild(img);
      bgLayer.appendChild(group);
    }

    // ── fields ──
    fieldLayer.replaceChildren();
    for (const f of design.fields) {
      fieldLayer.appendChild(buildField(f, f.id === selectedId));
    }
  }

  function buildField(f: TextField, selected: boolean): SVGGElement {
    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', `td-field${selected ? ' is-selected' : ''}`);
    g.setAttribute('data-id', f.id);
    g.setAttribute('transform', `translate(${f.x} ${f.y}) rotate(${f.rotation})`);

    const text = document.createElementNS(SVGNS, 'text');
    text.setAttribute('text-anchor', f.align);
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('font-size', String(f.fontSize));
    text.setAttribute('font-family', f.fontFamily);
    text.setAttribute('font-weight', f.bold ? '700' : '400');
    text.setAttribute('fill', f.color);
    text.textContent = f.text || ' ';
    g.appendChild(text);

    // Move: pointerdown anywhere on the field body.
    text.addEventListener('pointerdown', (e) => startDrag(e, f, 'move'));

    if (selected) {
      // Bounding box + handles are laid out in the field's LOCAL space, so they rotate with it.
      const bb = measure(text);
      const box = document.createElementNS(SVGNS, 'rect');
      box.setAttribute('class', 'td-bbox');
      box.setAttribute('x', String(bb.x - 2));
      box.setAttribute('y', String(bb.y - 2));
      box.setAttribute('width', String(bb.width + 4));
      box.setAttribute('height', String(bb.height + 4));
      g.appendChild(box);

      const resize = handle('td-resize', bb.x + bb.width + 2, bb.y + bb.height + 2);
      resize.addEventListener('pointerdown', (e) => startDrag(e, f, 'resize'));
      g.appendChild(resize);

      const rotate = handle('td-rotate', bb.x + bb.width / 2, bb.y - 12);
      rotate.addEventListener('pointerdown', (e) => startDrag(e, f, 'rotate'));
      const stem = document.createElementNS(SVGNS, 'line');
      stem.setAttribute('class', 'td-stem');
      stem.setAttribute('x1', String(bb.x + bb.width / 2));
      stem.setAttribute('y1', String(bb.y - 2));
      stem.setAttribute('x2', String(bb.x + bb.width / 2));
      stem.setAttribute('y2', String(bb.y - 12));
      g.append(stem, rotate);
    }

    return g;
  }

  function handle(cls: string, cx: number, cy: number): SVGCircleElement {
    const c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('class', `td-handle ${cls}`);
    c.setAttribute('cx', String(cx));
    c.setAttribute('cy', String(cy));
    c.setAttribute('r', '4');
    return c;
  }

  // getBBox works once the node is in the DOM; the field layer is live so this is safe.
  function measure(text: SVGTextElement): { x: number; y: number; width: number; height: number } {
    try {
      const b = text.getBBox();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    } catch {
      return { x: -10, y: -8, width: 20, height: 16 };
    }
  }

  function startDrag(e: PointerEvent, f: TextField, mode: Mode): void {
    e.preventDefault();
    e.stopPropagation();
    if (cb.getSelectedId() !== f.id) {
      cb.onSelect(f.id);
      // onSelect triggers a refresh in main; re-fetch the field node handles on next frame is
      // avoided by continuing the drag against the model object `f` directly (same reference).
    }
    const startPtr = clientToToken(e.clientX, e.clientY);
    const start = { x: f.x, y: f.y, fontSize: f.fontSize, rotation: f.rotation };
    const startDist = Math.hypot(startPtr.x - f.x, startPtr.y - f.y) || 1;

    // Capture on the <svg> root, not the target node: selecting the field triggers a refresh that
    // replaces the field nodes, but the svg/fieldLayer elements themselves persist. Guarded because
    // setPointerCapture throws for an inactive pointer id (e.g. synthetic events).
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety, not required — window listeners below still drive the drag */
    }

    const move = (ev: PointerEvent): void => {
      const p = clientToToken(ev.clientX, ev.clientY);
      if (mode === 'move') {
        f.x = start.x + (p.x - startPtr.x);
        f.y = start.y + (p.y - startPtr.y);
      } else if (mode === 'resize') {
        const dist = Math.hypot(p.x - f.x, p.y - f.y);
        f.fontSize = clamp(start.fontSize * (dist / startDist), 4, 200);
      } else {
        const raw = (Math.atan2(p.y - f.y, p.x - f.x) * 180) / Math.PI + 90;
        // Snap ("stick") to the nearest 15° increment (0/15/30/45/60/90…) when close, so common
        // orientations are easy to hit; hold Shift while dragging for free, unsnapped rotation.
        f.rotation = ev.shiftKey ? Math.round(raw) : snapAngle(raw);
      }
      applyLive(f);
      cb.onFieldChange(false);
    };

    const up = (ev: PointerEvent): void => {
      try {
        svg.releasePointerCapture(ev.pointerId);
      } catch {
        /* nothing captured */
      }
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      cb.onFieldChange(true);
      refresh(); // rebuild so handle geometry (bbox) tracks the new size/rotation
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // Update the live DOM node for a field without a full rebuild (keeps pointer capture stable).
  function applyLive(f: TextField): void {
    const g = fieldLayer.querySelector<SVGGElement>(`.td-field[data-id="${f.id}"]`);
    if (!g) return;
    g.setAttribute('transform', `translate(${f.x} ${f.y}) rotate(${f.rotation})`);
    const text = g.querySelector('text');
    if (text) text.setAttribute('font-size', String(f.fontSize));
  }

  // Drag the background image to pan it (updates offsetX/offsetY). Mirrors startDrag: capture on the
  // <svg> and drive via window listeners so a refresh (which replaces the bg node) can't drop the
  // gesture; grabbing the background also deselects any field, matching the click-to-deselect rule.
  function startBgPan(e: PointerEvent): void {
    const bg = cb.getDesign().background;
    if (!bg) return;
    e.preventDefault();
    e.stopPropagation();
    if (cb.getSelectedId() !== null) cb.onSelect(null);
    const startPtr = clientToToken(e.clientX, e.clientY);
    const start = { x: bg.offsetX, y: bg.offsetY };
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety; window listeners still drive the pan */
    }

    const move = (ev: PointerEvent): void => {
      const p = clientToToken(ev.clientX, ev.clientY);
      // Offset is applied outside the scale, so pointer delta maps 1:1 to token-space pan.
      bg.offsetX = start.x + (p.x - startPtr.x);
      bg.offsetY = start.y + (p.y - startPtr.y);
      applyBgLive(bg);
      cb.onBackgroundChange(false);
    };
    const up = (ev: PointerEvent): void => {
      try {
        svg.releasePointerCapture(ev.pointerId);
      } catch {
        /* nothing captured */
      }
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      cb.onBackgroundChange(true);
      refresh();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // Re-query the (possibly rebuilt) bg group each frame and update just its transform.
  function applyBgLive(bg: Background): void {
    const { width, height } = cb.getDesign().canvas;
    const group = bgLayer.querySelector<SVGGElement>('.td-bg-group');
    if (group) group.setAttribute('transform', bgTransform(bg, width, height));
  }

  refresh();
  return { root, refresh, svg };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// Zoom about the canvas centre, then pan: translate(centre+offset) · scale · translate(-centre).
// Offset lives outside the scale so it reads as plain token-space pixels regardless of zoom.
function bgTransform(bg: Background, w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2;
  return `translate(${cx + bg.offsetX} ${cy + bg.offsetY}) scale(${bg.scale}) translate(${-cx} ${-cy})`;
}

const SNAP_STEP = 15; // degrees between the "main" angles rotation sticks to (0/15/30/45/60/90…)
const SNAP_TOLERANCE = 7; // how close (deg) the pointer must be before it snaps

// Nearest SNAP_STEP multiple when within tolerance, else the raw (rounded) angle. Works across the
// full -90…270 range atan2 produces, since rounding to a multiple is range-agnostic.
function snapAngle(deg: number): number {
  const nearest = Math.round(deg / SNAP_STEP) * SNAP_STEP;
  return Math.abs(deg - nearest) <= SNAP_TOLERANCE ? nearest : Math.round(deg);
}
