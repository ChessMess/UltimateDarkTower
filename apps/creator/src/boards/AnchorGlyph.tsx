// AnchorGlyph — the shape that encodes an anchor SLOT, shared by the map canvas and the
// Anchor-slot buttons so the two can never drift apart.
//
// Slot is the shape; FILL still means kingdom (the colour language the Locations and Adjacency
// modes rely on). All five shapes are fillable for exactly that reason — nothing here needs the
// fill to be `none` to stay legible, so the button variant can reuse the same component with
// `fill="none"` to mean "this slot isn't placed yet".
//
// Props are declared explicitly rather than spreading `SVGProps<…>`: <circle>, <rect> and
// <polygon> take mutually incompatible prop types, and one spread across all three does not
// typecheck under the repo's `strict`.

import type { CSSProperties, MouseEvent } from 'react';
import type { AnchorSlot } from './shared';

export interface AnchorGlyphProps {
  slot: AnchorSlot;
  cx: number;
  cy: number;
  /** Radius of the shape's circumscribed circle, so every slot reads at the same visual weight. */
  r: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  style?: CSSProperties;
  onClick?: (e: MouseEvent) => void;
}

/** `points` for the polygon slots — an n-gon inscribed in radius `r`, `rot` degrees from up. */
function ngon(cx: number, cy: number, r: number, n: number, rot: number): string {
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((rot + (360 / n) * i - 90) * Math.PI) / 180;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(' ');
}

export function AnchorGlyph({ slot, cx, cy, r, ...rest }: AnchorGlyphProps) {
  switch (slot) {
    case 'hero':
      return <circle cx={cx} cy={cy} r={r} {...rest} />;
    case 'building':
      // Inscribed square: half-side r/√2 keeps its area comparable to the circle's.
      return (
        <rect x={cx - r * 0.72} y={cy - r * 0.72} width={r * 1.44} height={r * 1.44} {...rest} />
      );
    case 'foe':
      return <polygon points={ngon(cx, cy, r * 1.15, 3, 0)} {...rest} />;
    case 'marker':
      return <polygon points={ngon(cx, cy, r * 1.15, 3, 180)} {...rest} />;
    case 'skull':
      return <polygon points={ngon(cx, cy, r * 1.2, 4, 0)} {...rest} />;
  }
}

/** The button-sized variant: one glyph in its own 12×12 box, filled when the slot is placed. */
export function AnchorGlyphChip({ slot, filled }: { slot: AnchorSlot; filled: boolean }) {
  return (
    <svg width={12} height={12} viewBox="-6 -6 12 12" style={{ flexShrink: 0 }} aria-hidden>
      <AnchorGlyph
        slot={slot}
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
