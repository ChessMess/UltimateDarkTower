import {
  clampWithin,
  panRect,
  rectToViewBox,
  viewBoxToRect,
  zoomRect,
  type Rect,
} from '../src/renderers/zoom';

const BASE: Rect = { x: 0, y: 0, w: 4096, h: 4096 };

describe('zoom math', () => {
  it('round-trips a viewBox string', () => {
    expect(rectToViewBox({ x: 1, y: 2, w: 3, h: 4 })).toBe('1 2 3 4');
    expect(viewBoxToRect('1 2 3 4')).toEqual({ x: 1, y: 2, w: 3, h: 4 });
  });

  it('zooms in and keeps the point under the cursor fixed', () => {
    const fx = 0.25;
    const fy = 0.75;
    const before = BASE.x + fx * BASE.w; // user-space point under the cursor
    const beforeY = BASE.y + fy * BASE.h;
    const next = zoomRect(BASE, BASE, fx, fy, 0.5, 8);
    expect(next.w).toBeCloseTo(BASE.w * 0.5);
    expect(next.h).toBeCloseTo(BASE.h * 0.5); // base aspect preserved
    expect(next.x + fx * next.w).toBeCloseTo(before); // cursor point unmoved
    expect(next.y + fy * next.h).toBeCloseTo(beforeY);
  });

  it('clamps zoom-in to maxZoom (width never below base.w / maxZoom)', () => {
    let r = BASE;
    for (let i = 0; i < 50; i++) r = zoomRect(r, BASE, 0.5, 0.5, 0.5, 8);
    expect(r.w).toBeCloseTo(BASE.w / 8);
    expect(r.h).toBeCloseTo(BASE.h / 8);
  });

  it('never zooms out past the base view', () => {
    const zoomedIn = zoomRect(BASE, BASE, 0.5, 0.5, 0.25, 8);
    const wayOut = zoomRect(zoomedIn, BASE, 0.5, 0.5, 100, 8);
    expect(wayOut).toEqual(BASE);
  });

  it('keeps a non-square (focused) base aspect when zooming', () => {
    const focus: Rect = { x: 1000, y: 500, w: 1200, h: 800 };
    const next = zoomRect(focus, focus, 0.5, 0.5, 0.5, 8);
    expect(next.w / next.h).toBeCloseTo(focus.w / focus.h);
  });

  it('clampWithin slides a rect back inside its bounds', () => {
    const r: Rect = { x: 4000, y: -100, w: 512, h: 512 };
    const c = clampWithin(r, BASE);
    expect(c.x).toBe(BASE.w - 512); // pushed left to fit
    expect(c.y).toBe(0); // pushed down to fit
  });

  it('pans within the base and clamps at the edges', () => {
    const zoomed: Rect = { x: 1000, y: 1000, w: 1024, h: 1024 };
    const moved = panRect(zoomed, BASE, 200, -300);
    expect(moved).toEqual({ x: 1200, y: 700, w: 1024, h: 1024 });
    // Pan hard left/up — clamps to the base origin, not negative.
    const clamped = panRect(zoomed, BASE, -5000, -5000);
    expect(clamped.x).toBe(0);
    expect(clamped.y).toBe(0);
  });
});
