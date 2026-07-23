// AnchorGlyph — the shape that encodes what a SPOT accepts, shared by the map canvas and the
// spot-list chips so the two can never drift apart.
//
// A spot accepting exactly one of the traditional reserved types keeps that type's shape (the
// pre-0.5.0 five, plus the three that used to piggyback on them: adversary shared `foe`'s spot,
// monument shared `building`'s, quest shared `marker`'s — so they inherit those shapes here too).
// Anything else — a custom type, or a spot accepting more than one type — draws a hexagon, with
// a small badge for the accept count when it's more than one. FILL still means kingdom (the
// colour language the Locations and Adjacency modes rely on) — every shape is fillable for that
// reason, so the button variant can reuse the same component with `fill="none"` to mean "this
// spot isn't placed yet".
//
// Props are declared explicitly rather than spreading `SVGProps<…>`: <circle>, <rect> and
// <polygon> take mutually incompatible prop types, and one spread across all three does not
// typecheck under the repo's `strict`.

import type { CSSProperties, MouseEvent } from 'react';

/** The reserved types that keep a dedicated shape — a spot accepting exactly one of these draws
 *  it; everything else (custom types, multi-type spots) draws the hexagon fallback. */
const SHAPED_TYPES = new Set([
  'hero',
  'building',
  'foe',
  'adversary',
  'marker',
  'quest',
  'skull',
  'monument',
]);

/** The shape a spot's `accepts` list resolves to — a single shaped reserved type, or the fallback. */
function shapeFor(accepts: string[]): string {
  if (accepts.length === 1 && SHAPED_TYPES.has(accepts[0])) return accepts[0];
  return 'hexagon';
}

export interface AnchorGlyphProps {
  /** The spot's `accepts` list — determines the shape (see {@link shapeFor}). */
  accepts: string[];
  cx: number;
  cy: number;
  /** Radius of the shape's circumscribed circle, so every spot reads at the same visual weight. */
  r: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  style?: CSSProperties;
  onClick?: (e: MouseEvent) => void;
}

/** `points` for the polygon shapes — an n-gon inscribed in radius `r`, `rot` degrees from up. */
function ngon(cx: number, cy: number, r: number, n: number, rot: number): string {
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((rot + (360 / n) * i - 90) * Math.PI) / 180;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(' ');
}

export function AnchorGlyph({ accepts, cx, cy, r, ...rest }: AnchorGlyphProps) {
  switch (shapeFor(accepts)) {
    case 'hero':
      return <circle cx={cx} cy={cy} r={r} {...rest} />;
    case 'building':
    case 'monument':
      // Inscribed square: half-side r/√2 keeps its area comparable to the circle's.
      return (
        <rect x={cx - r * 0.72} y={cy - r * 0.72} width={r * 1.44} height={r * 1.44} {...rest} />
      );
    case 'foe':
    case 'adversary':
      return <polygon points={ngon(cx, cy, r * 1.15, 3, 0)} {...rest} />;
    case 'marker':
    case 'quest':
      return <polygon points={ngon(cx, cy, r * 1.15, 3, 180)} {...rest} />;
    case 'skull':
      return <polygon points={ngon(cx, cy, r * 1.2, 4, 0)} {...rest} />;
    default:
      return <polygon points={ngon(cx, cy, r * 1.1, 6, 0)} {...rest} />;
  }
}

/** The button-sized variant: one glyph in its own 12×12 box, filled when the spot is placed. */
export function AnchorGlyphChip({ accepts, filled }: { accepts: string[]; filled: boolean }) {
  return (
    <svg width={12} height={12} viewBox="-6 -6 12 12" style={{ flexShrink: 0 }} aria-hidden>
      <AnchorGlyph
        accepts={accepts}
        cx={0}
        cy={0}
        r={4.2}
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.2}
      />
    </svg>
  );
}
