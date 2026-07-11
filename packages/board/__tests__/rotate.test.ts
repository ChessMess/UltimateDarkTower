import { pointerAngleDeg, viewBoxPointToClient } from '../src/renderers/rotate';
import type { Rect } from '../src/renderers/zoom';

const BASE: Rect = { x: 0, y: 0, w: 4096, h: 4096 };
const CENTER = { bx: 2048, by: 2048 };

describe('rotate math', () => {
  describe('pointerAngleDeg', () => {
    const O = { x: 0, y: 0 };

    it('measures angles with atan2 (+x = 0°, +y = 90°)', () => {
      expect(pointerAngleDeg(O, { x: 1, y: 0 })).toBeCloseTo(0);
      expect(pointerAngleDeg(O, { x: 0, y: 1 })).toBeCloseTo(90);
      expect(pointerAngleDeg(O, { x: -1, y: 0 })).toBeCloseTo(180);
      expect(pointerAngleDeg(O, { x: 0, y: -1 })).toBeCloseTo(-90);
    });

    it('is relative to the pivot, not the origin', () => {
      const pivot = { x: 100, y: 100 };
      expect(pointerAngleDeg(pivot, { x: 150, y: 100 })).toBeCloseTo(0);
      expect(pointerAngleDeg(pivot, { x: 100, y: 150 })).toBeCloseTo(90);
    });

    it('a quarter-turn drag is a 90° delta (the grab-&-spin increment)', () => {
      const pivot = { x: 0, y: 0 };
      const start = pointerAngleDeg(pivot, { x: 10, y: 0 }); // 0°
      const end = pointerAngleDeg(pivot, { x: 0, y: 10 }); // 90°
      expect(end - start).toBeCloseTo(90);
    });
  });

  describe('viewBoxPointToClient', () => {
    it('maps the board center to the element center (square rect, base view)', () => {
      const rect = { left: 0, top: 0, width: 400, height: 400 };
      const p = viewBoxPointToClient(CENTER.bx, CENTER.by, BASE, rect);
      expect(p.x).toBeCloseTo(200);
      expect(p.y).toBeCloseTo(200);
    });

    it('keeps the board center at the element center for a non-square rect (letterboxed)', () => {
      const rect = { left: 0, top: 0, width: 400, height: 200 };
      const p = viewBoxPointToClient(CENTER.bx, CENTER.by, BASE, rect);
      expect(p.x).toBeCloseTo(200); // 400 / 2
      expect(p.y).toBeCloseTo(100); // 200 / 2
    });

    it('tracks the board center as the view zooms (still centered)', () => {
      const zoomed: Rect = { x: 1024, y: 1024, w: 2048, h: 2048 }; // zoomed into the middle
      const rect = { left: 0, top: 0, width: 400, height: 400 };
      const p = viewBoxPointToClient(CENTER.bx, CENTER.by, zoomed, rect);
      expect(p.x).toBeCloseTo(200);
      expect(p.y).toBeCloseTo(200);
    });

    it('places the board center off-element-center when panned away from it', () => {
      const topLeftQuadrant: Rect = { x: 0, y: 0, w: 2048, h: 2048 };
      const rect = { left: 0, top: 0, width: 400, height: 400 };
      const p = viewBoxPointToClient(CENTER.bx, CENTER.by, topLeftQuadrant, rect);
      // The board center sits at the bottom-right of this quadrant view.
      expect(p.x).toBeCloseTo(400);
      expect(p.y).toBeCloseTo(400);
    });

    it('falls back to the rect origin for a zero-size rect (jsdom / hidden)', () => {
      const p = viewBoxPointToClient(CENTER.bx, CENTER.by, BASE, { left: 5, top: 7, width: 0, height: 0 });
      expect(p).toEqual({ x: 5, y: 7 });
    });
  });
});
