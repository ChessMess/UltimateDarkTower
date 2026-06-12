/**
 * Pure geometry for the 2D map's mouse "spin on axis" (grab & spin). DOM-free on
 * purpose, so it is unit-testable under jsdom (which has no layout). The DOM glue
 * lives in `map2d.ts`. Angles are in degrees; the rotation pivot is the board center.
 *
 * A `Rect` is an SVG `viewBox` `{x, y, w, h}` in board image-space (the board is 4096²) —
 * the same type the zoom math uses.
 */

import type { Rect } from './zoom';

/** A point in client (CSS-pixel) space. */
export interface ClientPoint {
  x: number;
  y: number;
}

/** The element's on-screen box (the subset of `DOMRect` we need). */
export interface ClientRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const RAD_TO_DEG = 180 / Math.PI;

/**
 * Angle (degrees) of the vector from the pivot to the point, measured with `atan2`
 * (so +x is 0°, +y is 90°). The grab & spin delta is the difference between two of
 * these as the cursor moves around the pivot.
 */
export function pointerAngleDeg(pivot: ClientPoint, point: ClientPoint): number {
  return Math.atan2(point.y - pivot.y, point.x - pivot.x) * RAD_TO_DEG;
}

/**
 * Map a point in board image-space (e.g. the board center) to client pixels, given the
 * current `viewBox` and the element's on-screen rect. With `preserveAspectRatio:
 * xMidYMid meet` the viewBox is centered and uniformly scaled inside the element, so the
 * board center lands exactly under the cursor's pivot at any zoom/pan. A zero-size rect
 * (jsdom / hidden element) collapses to the rect origin — degenerate but never `NaN`.
 */
export function viewBoxPointToClient(bx: number, by: number, view: Rect, rect: ClientRect): ClientPoint {
  if (rect.width === 0 || rect.height === 0 || view.w === 0 || view.h === 0) {
    return { x: rect.left, y: rect.top };
  }
  // `meet` fits the whole viewBox: the smaller axis scale wins and the other is centered.
  const scale = Math.min(rect.width / view.w, rect.height / view.h);
  const drawnW = view.w * scale;
  const drawnH = view.h * scale;
  const offsetX = rect.left + (rect.width - drawnW) / 2;
  const offsetY = rect.top + (rect.height - drawnH) / 2;
  return {
    x: offsetX + (bx - view.x) * scale,
    y: offsetY + (by - view.y) * scale,
  };
}
