import type { BoardState, LocationName } from '../state/boardState';
import type { AnchorSlot, BoardKingdom } from '../data/udtReexports';
import { BOARD_ANCHORS, BOARD_IMAGE_INFO, BOARD_LOCATION_BY_NAME } from '../data/udtReexports';
import type { BoardFocus, BoardRenderer } from './shared';
import { DEFAULT_FOCUS, focusEquals } from './shared';
import { KIND_TINT, defaultTokenImagePath, normalizeAssetBaseUrl } from './assetPaths';
import type { TokenSelection, TokenArtRef } from './assetPaths';
// Type-only — no runtime dependency on the UI layer (the store instance is supplied by the caller).
import type { LocationPickStore } from '../ui/stores';

// Re-export the shared token-art convention so existing consumers keep importing
// `TokenSelection`/`TokenArtRef`/`kebab` from here (and via the package barrel).
export { kebab } from './assetPaths';
export type { TokenSelection, TokenArtRef } from './assetPaths';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

/** Token box (image-space px) and fan/selection geometry. The board image is 4096². */
const SLOT_SIZE = 150;
const SKULL_SIZE = 90;
const FAN_RADIUS = 55;
const SELECTION_RING_R = 95;
const DIM_OPACITY = 0.22;
const VIEWBOX_PAD = 250;
const MAX_FANNED_SKULLS = 3;
const SPACE_HIT_R = 130;

export interface BoardMap2DOptions {
  /** Token-art root, e.g. `'./tokens/'`. Art is loaded at runtime — never bundled. */
  assetBaseUrl?: string;
  /** Base-layer board image, e.g. `'./board.png'`. Omit to draw tokens over a blank board. */
  boardImageUrl?: string;
  /** Override the default `{assetBaseUrl}{group}/{kebab(id)}.png` convention. Return `null` for "no art" (→ fallback). */
  resolveTokenImage?: (ref: TokenArtRef) => string | null;
  /** Fired when a token is clicked. Selection is renderer-local UI state — it is never written to BoardState. */
  onTokenSelect?: (selection: TokenSelection) => void;
  /**
   * Drives the armed space-pick (M4 editing). When the store reports armed, the map renders
   * clickable space targets at the anchors and, on a space click, calls `store.pick(loc)`.
   */
  locationPick?: LocationPickStore;
  /** Fired when a space target is clicked while armed (in addition to `locationPick.pick`). */
  onLocationPick?: (location: LocationName) => void;
}

/**
 * 2D overhead map renderer. Draws the board image and places tokens via UDT's
 * normalized `BOARD_ANCHORS` (resolution-independent, authored upright against the
 * same `board.png` Display textures — so `northHeadingDegrees` is NOT applied here).
 * Inline SVG: jsdom-testable, DOM hit-testing for click-to-select, crisp scaling.
 * Display-/three-free.
 */
export class BoardMap2D implements BoardRenderer {
  private readonly assetBaseUrl: string;
  private readonly boardImageUrl?: string;
  private readonly resolve: (ref: TokenArtRef) => string | null;
  private readonly onTokenSelect?: (selection: TokenSelection) => void;
  private readonly locationPick?: LocationPickStore;
  private readonly onLocationPick?: (location: LocationName) => void;
  private readonly unsubPick?: () => void;

  private svg?: SVGSVGElement;
  private selectionLayer?: SVGGElement;
  private selectedKey: string | null = null;
  private lastState?: BoardState;
  private lastFocus: BoardFocus = DEFAULT_FOCUS;
  private readonly onClick = (event: Event): void => this.handleClick(event);

  constructor(
    private readonly container: HTMLElement,
    options: BoardMap2DOptions = {}
  ) {
    this.assetBaseUrl = normalizeAssetBaseUrl(options.assetBaseUrl);
    this.boardImageUrl = options.boardImageUrl;
    this.onTokenSelect = options.onTokenSelect;
    this.locationPick = options.locationPick;
    this.onLocationPick = options.onLocationPick;
    this.resolve = options.resolveTokenImage ?? ((ref) => defaultTokenImagePath(ref, this.assetBaseUrl));
    // Re-render to add/remove the space-pick layer when the armed state changes.
    this.unsubPick = this.locationPick?.subscribe((event) => {
      if (event.type === 'armed' || event.type === 'disarmed') this.rerender();
    });
  }

  render(state: BoardState, focus: BoardFocus = DEFAULT_FOCUS): void {
    if (this.lastState === state && this.svg && focusEquals(this.lastFocus, focus)) return;
    this.lastState = state;
    this.lastFocus = focus;

    const { width, height } = BOARD_IMAGE_INFO;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', this.focusViewBox(focus, width, height));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('class', 'udt-board-map');
    svg.style.width = '100%';
    svg.style.height = 'auto';
    svg.style.display = 'block';

    if (this.boardImageUrl) {
      const image = document.createElementNS(SVG_NS, 'image');
      setHref(image, this.boardImageUrl);
      image.setAttribute('x', '0');
      image.setAttribute('y', '0');
      image.setAttribute('width', String(width));
      image.setAttribute('height', String(height));
      svg.appendChild(image);
    }

    const tokens = document.createElementNS(SVG_NS, 'g');
    tokens.setAttribute('class', 'udt-board-tokens');
    this.renderTokens(tokens, state, focus);
    svg.appendChild(tokens);

    const selectionLayer = document.createElementNS(SVG_NS, 'g');
    selectionLayer.setAttribute('class', 'udt-board-selection');
    svg.appendChild(selectionLayer);

    // Armed space-pick: clickable targets at the anchors, drawn on top (M4 editing).
    if (this.locationPick?.isArmed()) {
      const spaces = document.createElementNS(SVG_NS, 'g');
      spaces.setAttribute('class', 'udt-board-spaces');
      this.renderSpaceTargets(spaces, focus);
      svg.appendChild(spaces);
    }

    svg.addEventListener('click', this.onClick);

    this.container.replaceChildren(svg);
    this.svg = svg;
    this.selectionLayer = selectionLayer;
    this.redrawSelection();
  }

  dispose(): void {
    this.svg?.removeEventListener('click', this.onClick);
    this.unsubPick?.();
    this.container.replaceChildren();
    this.svg = undefined;
    this.selectionLayer = undefined;
    this.lastState = undefined;
  }

  /** Force a full re-render at the last state/focus (used when the armed state toggles). */
  private rerender(): void {
    const state = this.lastState;
    if (!state) return;
    this.lastState = undefined; // bypass the identity early-return
    this.render(state, this.lastFocus);
  }

  /** Invisible-but-clickable space targets at the anchors (filtered by the pending placement). */
  private renderSpaceTargets(root: SVGGElement, focus: BoardFocus): void {
    const { width, height } = BOARD_IMAGE_INFO;
    const targets = this.locationPick?.getPending()?.targets ?? 'all';
    const slot: AnchorSlot = targets === 'buildings' ? 'building' : 'hero';
    for (const [loc, slots] of Object.entries(BOARD_ANCHORS)) {
      const anchor = slots[slot];
      if (!anchor) continue;
      if (focus.kingdom !== 'all' && BOARD_LOCATION_BY_NAME[loc]?.kingdom !== focus.kingdom) continue;
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('class', 'udt-space');
      circle.setAttribute('data-location', loc);
      circle.setAttribute('cx', String(anchor.x * width));
      circle.setAttribute('cy', String(anchor.y * height));
      circle.setAttribute('r', String(SPACE_HIT_R));
      circle.setAttribute('fill', 'rgba(251, 191, 36, 0.18)');
      circle.setAttribute('stroke', '#fbbf24');
      circle.setAttribute('stroke-width', '6');
      circle.style.cursor = 'crosshair';
      circle.style.pointerEvents = 'all';
      root.appendChild(circle);
    }
  }

  // ── token placement ───────────────────────────────────────────────────────

  private renderTokens(root: SVGGElement, state: BoardState, focus: BoardFocus): void {
    // Heroes (fanned by shared location), at the `hero` slot. No hero art exists → always the fallback.
    this.renderFannedByLocation(
      root,
      focus,
      groupByLocation(Object.entries(state.heroes).map(([id, h]) => ({ id, location: h.location }))),
      'hero',
      (entry) => ({ kind: 'hero', id: entry.id, location: entry.location }),
      (entry) => ({ kind: 'hero', id: entry.id })
    );

    // Foes (fanned), at the `foe` slot. Art id = foe *type*; selection id = instance id.
    this.renderFannedByLocation(
      root,
      focus,
      groupByLocation(
        Object.entries(state.foes).map(([id, f]) => ({ id, location: f.location, art: f.foe }))
      ),
      'foe',
      (entry) => ({ kind: 'foe', id: entry.id, location: entry.location }),
      (entry) => ({ kind: 'foe', id: entry.art ?? entry.id })
    );

    // Adversary, placed at its location's `foe` slot (falls back to `building`).
    const adversary = state.adversary;
    if (adversary?.location) {
      const px = anchorPx(adversary.location, 'foe') ?? anchorPx(adversary.location, 'building');
      if (px) {
        root.appendChild(
          this.makeToken(
            { kind: 'adversary', id: adversary.id, location: adversary.location },
            { kind: 'adversary', id: adversary.id },
            px,
            SLOT_SIZE,
            this.dim(adversary.location, focus)
          )
        );
      }
    }

    // Buildings: skull stacks + monument/razed overlays.
    for (const [loc, b] of Object.entries(state.buildings)) {
      const opacity = this.dim(loc, focus);
      if (b.skulls > 0) {
        const px = anchorPx(loc, 'skull');
        if (px) {
          const count = Math.min(b.skulls, MAX_FANNED_SKULLS);
          const group = this.makeSelectableGroup({ kind: 'building', id: loc, location: loc }, px, opacity);
          for (let i = 0; i < count; i++) {
            this.appendArt(group, { kind: 'skull', id: 'skull' }, SKULL_SIZE, fanOffset(i, count));
          }
          root.appendChild(group);
        }
      }
      if (b.monument || b.destroyed) {
        const px = anchorPx(loc, 'building');
        if (px) {
          const group = this.makeSelectableGroup({ kind: 'building', id: loc, location: loc }, px, opacity);
          if (b.monument) {
            this.appendArt(group, { kind: 'monument', id: b.monument }, SLOT_SIZE, { dx: 0, dy: 0 });
          }
          if (b.destroyed) group.appendChild(razedOverlay(SLOT_SIZE));
          root.appendChild(group);
        }
      }
    }

    // Space markers (fanned), at the `marker` slot.
    const markerEntries: LocatedEntry[] = [];
    for (const [loc, markers] of Object.entries(state.spaceMarkers)) {
      for (const m of markers) markerEntries.push({ id: m, location: loc, art: m });
    }
    this.renderFannedByLocation(
      root,
      focus,
      groupByLocation(markerEntries),
      'marker',
      (entry) => ({ kind: 'marker', id: entry.id, location: entry.location }),
      (entry) => ({ kind: 'marker', id: entry.art ?? entry.id })
    );
  }

  /** Place a group of same-location entries at `slot`, fanning when more than one shares the slot. */
  private renderFannedByLocation(
    root: SVGGElement,
    focus: BoardFocus,
    byLocation: Map<LocationName, LocatedEntry[]>,
    slot: AnchorSlot,
    toSelection: (entry: LocatedEntry) => TokenSelection,
    toArt: (entry: LocatedEntry) => TokenArtRef
  ): void {
    for (const [loc, entries] of byLocation) {
      const px = anchorPx(loc, slot);
      if (!px) continue;
      const opacity = this.dim(loc, focus);
      entries.forEach((entry, i) => {
        const off = fanOffset(i, entries.length);
        const center = { x: px.x + off.dx, y: px.y + off.dy };
        const selection = toSelection(entry);
        const group = this.makeSelectableGroup(selection, center, opacity);
        this.appendArtOrFallback(group, toArt(entry), selection.kind, SLOT_SIZE);
        root.appendChild(group);
      });
    }
  }

  /** A single token already centered on `px` (no fan) — art with fallback. */
  private makeToken(
    selection: TokenSelection,
    art: TokenArtRef,
    px: Point,
    size: number,
    opacity: number
  ): SVGGElement {
    const group = this.makeSelectableGroup(selection, px, opacity);
    this.appendArtOrFallback(group, art, selection.kind, size);
    return group;
  }

  private makeSelectableGroup(selection: TokenSelection, center: Point, opacity: number): SVGGElement {
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'udt-token');
    group.setAttribute('data-kind', selection.kind);
    group.setAttribute('data-id', selection.id);
    group.setAttribute('data-location', selection.location);
    group.setAttribute('data-cx', String(center.x));
    group.setAttribute('data-cy', String(center.y));
    group.setAttribute('transform', `translate(${center.x} ${center.y})`);
    if (opacity < 1) group.setAttribute('opacity', String(opacity));
    group.style.cursor = 'pointer';
    return group;
  }

  /** Append the art image (with an error→fallback handler) or, when there is no art, the fallback directly. */
  private appendArtOrFallback(
    group: SVGGElement,
    art: TokenArtRef,
    kind: TokenSelection['kind'],
    size: number
  ): void {
    const url = this.resolve(art);
    if (url === null) {
      group.appendChild(fallbackDisc(kind, art.id, size));
      return;
    }
    const image = makeImage(url, size, { dx: 0, dy: 0 });
    image.addEventListener(
      'error',
      () => {
        image.remove();
        group.appendChild(fallbackDisc(kind, art.id, size));
      },
      { once: true }
    );
    group.appendChild(image);
  }

  /** Append art at an offset (used for skull fans inside one selectable group). */
  private appendArt(group: SVGGElement, art: TokenArtRef, size: number, off: Offset): void {
    const url = this.resolve(art);
    if (url === null) {
      const disc = fallbackDisc('building', art.id, size);
      disc.setAttribute('transform', `translate(${off.dx} ${off.dy})`);
      group.appendChild(disc);
      return;
    }
    group.appendChild(makeImage(url, size, off));
  }

  // ── focus / selection ──────────────────────────────────────────────────────

  private dim(loc: LocationName, focus: BoardFocus): number {
    if (focus.kingdom === 'all') return 1;
    return BOARD_LOCATION_BY_NAME[loc]?.kingdom === (focus.kingdom as BoardKingdom) ? 1 : DIM_OPACITY;
  }

  private focusViewBox(focus: BoardFocus, width: number, height: number): string {
    if (focus.kingdom === 'all') return `0 0 ${width} ${height}`;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [loc, slots] of Object.entries(BOARD_ANCHORS)) {
      if (BOARD_LOCATION_BY_NAME[loc]?.kingdom !== (focus.kingdom as BoardKingdom)) continue;
      for (const anchor of Object.values(slots)) {
        if (!anchor) continue;
        minX = Math.min(minX, anchor.x * width);
        minY = Math.min(minY, anchor.y * height);
        maxX = Math.max(maxX, anchor.x * width);
        maxY = Math.max(maxY, anchor.y * height);
      }
    }
    if (!Number.isFinite(minX)) return `0 0 ${width} ${height}`;
    const x = minX - VIEWBOX_PAD;
    const y = minY - VIEWBOX_PAD;
    const w = maxX - minX + VIEWBOX_PAD * 2;
    const h = maxY - minY + VIEWBOX_PAD * 2;
    return `${x} ${y} ${w} ${h}`;
  }

  private handleClick(event: Event): void {
    const target = event.target as Element | null;

    // Armed: a click on a space target reports a location; other clicks are ignored.
    if (this.locationPick?.isArmed()) {
      const space = target?.closest('.udt-space') as SVGElement | null;
      if (space) {
        const location = space.getAttribute('data-location') ?? '';
        this.onLocationPick?.(location);
        this.locationPick.pick(location);
      }
      return;
    }

    const group = target?.closest('.udt-token') as SVGGElement | null;
    if (!group) return;
    const selection: TokenSelection = {
      kind: group.getAttribute('data-kind') as TokenSelection['kind'],
      id: group.getAttribute('data-id') ?? '',
      location: group.getAttribute('data-location') ?? '',
    };
    this.selectedKey = selectionKey(selection);
    this.redrawSelection();
    this.onTokenSelect?.(selection);
  }

  private redrawSelection(): void {
    if (!this.svg || !this.selectionLayer) return;
    this.selectionLayer.replaceChildren();
    if (!this.selectedKey) return;
    // Match on the full key (kind/id/location) so the ring lands on the right token.
    const ringHost = Array.from(this.svg.querySelectorAll<SVGGElement>('.udt-token')).find(
      (g) =>
        selectionKey({
          kind: g.getAttribute('data-kind') as TokenSelection['kind'],
          id: g.getAttribute('data-id') ?? '',
          location: g.getAttribute('data-location') ?? '',
        }) === this.selectedKey
    );
    if (!ringHost) return;
    const ring = document.createElementNS(SVG_NS, 'circle');
    ring.setAttribute('cx', ringHost.getAttribute('data-cx') ?? '0');
    ring.setAttribute('cy', ringHost.getAttribute('data-cy') ?? '0');
    ring.setAttribute('r', String(SELECTION_RING_R));
    ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke', '#fbbf24');
    ring.setAttribute('stroke-width', '10');
    ring.setAttribute('class', 'udt-selection-ring');
    this.selectionLayer.appendChild(ring);
  }
}

// ── module-local helpers ──────────────────────────────────────────────────────

interface Point {
  x: number;
  y: number;
}
interface Offset {
  dx: number;
  dy: number;
}
interface LocatedEntry {
  id: string;
  location: LocationName;
  art?: string;
}

function groupByLocation(entries: LocatedEntry[]): Map<LocationName, LocatedEntry[]> {
  const map = new Map<LocationName, LocatedEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.location);
    if (list) list.push(entry);
    else map.set(entry.location, [entry]);
  }
  return map;
}

function anchorPx(loc: LocationName, slot: AnchorSlot): Point | null {
  const anchor = BOARD_ANCHORS[loc]?.[slot];
  if (!anchor) return null;
  return { x: anchor.x * BOARD_IMAGE_INFO.width, y: anchor.y * BOARD_IMAGE_INFO.height };
}

function fanOffset(index: number, count: number): Offset {
  if (count <= 1) return { dx: 0, dy: 0 };
  const angle = (2 * Math.PI * index) / count;
  return { dx: Math.cos(angle) * FAN_RADIUS, dy: Math.sin(angle) * FAN_RADIUS };
}

function makeImage(url: string, size: number, off: Offset): SVGImageElement {
  const image = document.createElementNS(SVG_NS, 'image');
  setHref(image, url);
  image.setAttribute('x', String(off.dx - size / 2));
  image.setAttribute('y', String(off.dy - size / 2));
  image.setAttribute('width', String(size));
  image.setAttribute('height', String(size));
  image.setAttribute('preserveAspectRatio', 'xMidYMid meet'); // portrait art fits, centered
  return image;
}

function fallbackDisc(kind: TokenSelection['kind'], label: string, size: number): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'udt-token-fallback');
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', '0');
  circle.setAttribute('cy', '0');
  circle.setAttribute('r', String(size * 0.42));
  circle.setAttribute('fill', KIND_TINT[kind]);
  circle.setAttribute('stroke', '#0b0b0b');
  circle.setAttribute('stroke-width', '4');
  group.appendChild(circle);
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', '0');
  text.setAttribute('y', '0');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  text.setAttribute('font-size', String(size * 0.22));
  text.setAttribute('fill', '#ffffff');
  text.textContent = label.slice(0, 6);
  group.appendChild(text);
  return group;
}

function razedOverlay(size: number): SVGGElement {
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'udt-razed');
  const r = size * 0.4;
  for (const [x1, y1, x2, y2] of [
    [-r, -r, r, r],
    [-r, r, r, -r],
  ]) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2));
    line.setAttribute('stroke', '#dc2626');
    line.setAttribute('stroke-width', '12');
    group.appendChild(line);
  }
  return group;
}

function setHref(element: SVGImageElement, url: string): void {
  element.setAttribute('href', url);
  element.setAttributeNS(XLINK_NS, 'xlink:href', url); // legacy fallback for older renderers
}

function selectionKey(selection: TokenSelection): string {
  return `${selection.kind} ${selection.id} ${selection.location}`;
}
