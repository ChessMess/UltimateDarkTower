/**
 * Pure viewBox math for the 2D map's mouse zoom/pan. DOM-free on purpose, so it is
 * unit-testable under jsdom (which has no layout). The DOM glue lives in `map2d.ts`.
 *
 * A `Rect` is an SVG `viewBox` `{x, y, w, h}` in board image-space (the board is 4096²).
 * `base` is the focus-derived view (whole board or a kingdom box); zoom/pan always stay
 * within it — you can never zoom out past the focus region or pan off its edges.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function rectToViewBox(r: Rect): string {
  return `${r.x} ${r.y} ${r.w} ${r.h}`;
}

export function viewBoxToRect(s: string): Rect {
  const [x, y, w, h] = s
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  return { x, y, w, h };
}

/** Clamp `v` into `[min, max]`. */
function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Slide `r` so it sits fully inside `bounds` (assumes `r` is no larger than `bounds`). */
export function clampWithin(r: Rect, bounds: Rect): Rect {
  return {
    w: r.w,
    h: r.h,
    x: clamp(r.x, bounds.x, bounds.x + bounds.w - r.w),
    y: clamp(r.y, bounds.y, bounds.y + bounds.h - r.h),
  };
}

/**
 * Cursor-anchored zoom. `fx`/`fy` ∈ [0,1] are the cursor's fractional position within the
 * element. `factor` < 1 zooms in, > 1 out. Width is clamped to `[base.w / maxZoom, base.w]`;
 * height scales by the SAME applied factor so the base aspect is preserved; the point under
 * the cursor stays fixed; the result is clamped inside `base`.
 */
export function zoomRect(
  current: Rect,
  base: Rect,
  fx: number,
  fy: number,
  factor: number,
  maxZoom: number,
): Rect {
  const px = current.x + fx * current.w;
  const py = current.y + fy * current.h;
  const w = clamp(current.w * factor, base.w / maxZoom, base.w);
  const applied = w / current.w; // the factor actually used after clamping
  const h = current.h * applied;
  return clampWithin({ x: px - fx * w, y: py - fy * h, w, h }, base);
}

/** Translate `current` by `(dx, dy)` in user-space units, clamped inside `base`. */
export function panRect(current: Rect, base: Rect, dx: number, dy: number): Rect {
  return clampWithin({ ...current, x: current.x + dx, y: current.y + dy }, base);
}
