import type { BoardState, LocationName } from '../state/boardState';
import type { AnchorSlot, BoardKingdom } from '../data/udtReexports';
import { BOARD_ANCHORS, BOARD_IMAGE_INFO, BOARD_LOCATION_BY_NAME } from '../data/udtReexports';
import type { BoardFocus, BoardRenderer } from './shared';
import { DEFAULT_FOCUS, focusEquals } from './shared';
import { KIND_TINT, normalizeAssetBaseUrl, resolveTokenImageFor } from './assetPaths';
import { panRect, rectToViewBox, zoomRect } from './zoom';
import type { Rect } from './zoom';
import { pointerAngleDeg, viewBoxPointToClient } from './rotate';
import type { ClientPoint } from './rotate';
import type { TokenSelection, TokenArtRef, TokenArtConfig, BoardView } from './assetPaths';
import {
  MAX_FANNED_SKULLS,
  fanOffset,
  selectionKey,
  heroEntries,
  foeEntries,
  markerEntries,
} from './tokenLayout';
import type { LocatedEntry } from './tokenLayout';
// Type-only — no runtime dependency on the UI layer (the store instance is supplied by the caller).
import type { LocationPickStore } from '../ui/stores';

// Re-export the shared token-art convention so existing consumers keep importing
// `TokenSelection`/`TokenArtRef`/`kebab` from here (and via the package barrel).
export { kebab, lookupTokenArt, resolveTokenImageFor } from './assetPaths';
export type { TokenSelection, TokenArtRef, TokenArt, TokenArtConfig, TokenModelRef, BoardView } from './assetPaths';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

/** Token box (image-space px) and fan/selection geometry. The board image is 4096². */
const SLOT_SIZE = 150;
const SKULL_SIZE = 90;
const FAN_RADIUS = 55;
const SELECTION_RING_R = 95;
const DIM_OPACITY = 0.22;
const VIEWBOX_PAD = 250;
const SPACE_HIT_R = 130;

/** Mouse-zoom tuning. One wheel notch scales the view by `WHEEL_STEP`; `DEFAULT_MAX_ZOOM`
 *  caps how far in you can go (base width ÷ this). `DRAG_THRESHOLD_PX` is the movement that
 *  turns a click into a pan (and suppresses the trailing token-select click). */
const WHEEL_STEP = 1.15;
const DEFAULT_MAX_ZOOM = 8;
const DRAG_THRESHOLD_PX = 4;

export interface BoardMap2DOptions {
  /** Token-art root, e.g. `'./tokens/'`. Art is loaded at runtime — never bundled. */
  assetBaseUrl?: string;
  /** Base-layer board image, e.g. `'./board.png'`. Omit to draw tokens over a blank board. */
  boardImageUrl?: string;
  /**
   * Per-token art overrides, keyed by kind → art id. Used here for the 2D `image2d` slot;
   * pass the SAME object to the 3D plugin for the `image3d`/`model3d` slots. See {@link TokenArtConfig}.
   */
  tokenArt?: TokenArtConfig;
  /**
   * Override the default `{assetBaseUrl}{group}/{kebab(id)}.png` convention. Return `null` for "no art"
   * (→ fallback). `view` is `'2d'` here; the same callback shape is reused by the 3D plugin.
   */
  resolveTokenImage?: (ref: TokenArtRef, view: BoardView) => string | null;
  /** Fired when a token is clicked. Selection is renderer-local UI state — it is never written to BoardState. */
  onTokenSelect?: (selection: TokenSelection) => void;
  /**
   * Drives the armed space-pick (M4 editing). When the store reports armed, the map renders
   * clickable space targets at the anchors and, on a space click, calls `store.pick(loc)`.
   */
  locationPick?: LocationPickStore;
  /** Fired when a space target is clicked while armed (in addition to `locationPick.pick`). */
  onLocationPick?: (location: LocationName) => void;
  /**
   * Mouse zoom/pan: scroll the wheel to zoom toward the cursor, drag to pan once zoomed in,
   * double-click (or {@link BoardMap2D.resetView}) to return to the focus view. Default `true`.
   * Set `false` for embeds that don't want the wheel to hijack page scroll over the map.
   */
  enableZoom?: boolean;
  /** Max zoom-in factor relative to the current focus view (default `8`). */
  maxZoom?: number;
  /**
   * What a left-drag does on the map. `'rotate'` (default) spins the whole board (image + tokens)
   * about its center — grab a point and it follows the cursor, like a lazy-susan. `'pan'` is the
   * classic "move the image around" once zoomed in. Switch at runtime with {@link BoardMap2D.setDragMode}.
   * Wheel-zoom and double-click-reset work in both modes.
   */
  dragMode?: DragMode;
}

/** Left-drag behavior on the 2D map; see {@link BoardMap2DOptions.dragMode}. */
export type DragMode = 'rotate' | 'pan';

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
  private readonly enableZoom: boolean;
  private readonly maxZoom: number;
  private dragMode: DragMode;
  private readonly unsubPick?: () => void;

  private svg?: SVGSVGElement;
  private rotateLayer?: SVGGElement;
  private selectionLayer?: SVGGElement;
  private selectedKey: string | null = null;
  private lastState?: BoardState;
  private lastFocus: BoardFocus = DEFAULT_FOCUS;
  private readonly onClick = (event: Event): void => this.handleClick(event);

  /** The focus-derived view (recomputed each render); zoom/pan stay inside it. */
  private baseViewBox: Rect = { x: 0, y: 0, w: BOARD_IMAGE_INFO.width, h: BOARD_IMAGE_INFO.height };
  /** Present once the user has zoomed/panned; cleared by focus change or `resetView`. */
  private userViewBox?: Rect;
  /** In-flight drag-pan state (mouse events; jsdom has no PointerEvent). */
  private panStart?: { clientX: number; clientY: number; view: Rect };
  private panMoved = false;
  /** In-flight grab-&-spin state: the on-screen pivot (board center) plus the angle/rotation at grab. */
  private rotateStart?: { pivot: ClientPoint; downX: number; downY: number; startAngle: number; startRotation: number };
  private rotateMoved = false;
  /** Current spin about the board center, in degrees (applied to `rotateLayer`). */
  private rotationDeg = 0;
  /** Set when a pan/rotate drag occurs so the trailing `click` doesn't select a token. */
  private suppressClick = false;
  private readonly onWheel = (event: WheelEvent): void => this.handleWheel(event);
  private readonly onMouseDown = (event: MouseEvent): void => this.handleMouseDown(event);
  private readonly onMouseMove = (event: MouseEvent): void => this.handleMouseMove(event);
  private readonly onMouseUp = (): void => this.handleMouseUp();
  private readonly onDblClick = (): void => this.resetView();

  constructor(
    private readonly container: HTMLElement,
    options: BoardMap2DOptions = {}
  ) {
    this.assetBaseUrl = normalizeAssetBaseUrl(options.assetBaseUrl);
    this.boardImageUrl = options.boardImageUrl;
    this.onTokenSelect = options.onTokenSelect;
    this.locationPick = options.locationPick;
    this.onLocationPick = options.onLocationPick;
    this.enableZoom = options.enableZoom ?? true;
    this.maxZoom = options.maxZoom ?? DEFAULT_MAX_ZOOM;
    this.dragMode = options.dragMode ?? 'rotate';
    this.resolve = (ref) =>
      resolveTokenImageFor(ref, '2d', {
        tokenArt: options.tokenArt,
        resolveTokenImage: options.resolveTokenImage,
        assetBaseUrl: this.assetBaseUrl,
      });
    // Re-render to add/remove the space-pick layer when the armed state changes.
    this.unsubPick = this.locationPick?.subscribe((event) => {
      if (event.type === 'armed' || event.type === 'disarmed') this.rerender();
    });
  }

  render(state: BoardState, focus: BoardFocus = DEFAULT_FOCUS): void {
    if (this.lastState === state && this.svg && focusEquals(this.lastFocus, focus)) return;
    // A focus change re-bases the view, so any manual zoom/pan is dropped; a plain state
    // change (token moved) keeps the current zoom by re-applying `userViewBox` below.
    if (!focusEquals(this.lastFocus, focus)) this.userViewBox = undefined;
    this.lastState = state;
    this.lastFocus = focus;

    const { width, height } = BOARD_IMAGE_INFO;
    this.baseViewBox = this.focusViewBox(focus, width, height);
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', rectToViewBox(this.userViewBox ?? this.baseViewBox));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('class', 'udt-board-map');
    svg.style.width = '100%';
    svg.style.height = 'auto';
    svg.style.display = 'block';
    const interactive = this.isInteractive();
    if (interactive) svg.style.cursor = 'grab';

    // All content lives in a single rotate layer so a drag-spin turns the whole board
    // (image + tokens + selection ring) about its center, like a lazy-susan. The pivot is
    // the fixed board center, so re-renders re-apply the same transform from `rotationDeg`.
    const rotate = document.createElementNS(SVG_NS, 'g');
    rotate.setAttribute('class', 'udt-board-rotate');
    rotate.setAttribute('transform', this.rotateTransform());

    if (this.boardImageUrl) {
      const image = document.createElementNS(SVG_NS, 'image');
      setHref(image, this.boardImageUrl);
      image.setAttribute('x', '0');
      image.setAttribute('y', '0');
      image.setAttribute('width', String(width));
      image.setAttribute('height', String(height));
      rotate.appendChild(image);
    }

    const tokens = document.createElementNS(SVG_NS, 'g');
    tokens.setAttribute('class', 'udt-board-tokens');
    this.renderTokens(tokens, state, focus);
    rotate.appendChild(tokens);

    const selectionLayer = document.createElementNS(SVG_NS, 'g');
    selectionLayer.setAttribute('class', 'udt-board-selection');
    rotate.appendChild(selectionLayer);

    // Armed space-pick: clickable targets at the anchors, drawn on top (M4 editing).
    if (this.locationPick?.isArmed()) {
      const spaces = document.createElementNS(SVG_NS, 'g');
      spaces.setAttribute('class', 'udt-board-spaces');
      this.renderSpaceTargets(spaces, focus);
      rotate.appendChild(spaces);
    }

    svg.appendChild(rotate);

    svg.addEventListener('click', this.onClick);
    if (this.enableZoom) svg.addEventListener('wheel', this.onWheel, { passive: false });
    if (interactive) {
      svg.addEventListener('mousedown', this.onMouseDown);
      svg.addEventListener('dblclick', this.onDblClick);
    }

    this.container.replaceChildren(svg);
    this.svg = svg;
    this.rotateLayer = rotate;
    this.selectionLayer = selectionLayer;
    this.redrawSelection();
  }

  dispose(): void {
    this.svg?.removeEventListener('click', this.onClick);
    this.svg?.removeEventListener('wheel', this.onWheel);
    this.svg?.removeEventListener('mousedown', this.onMouseDown);
    this.svg?.removeEventListener('dblclick', this.onDblClick);
    this.endDrag(); // drop any in-flight drag's document listeners
    this.unsubPick?.();
    this.container.replaceChildren();
    this.svg = undefined;
    this.rotateLayer = undefined;
    this.selectionLayer = undefined;
    this.lastState = undefined;
  }

  /** Return the 2D map to its focus view, dropping any manual zoom/pan and spin. */
  resetView(): void {
    if (!this.userViewBox && this.rotationDeg === 0) return;
    this.userViewBox = undefined;
    this.rotationDeg = 0;
    this.svg?.setAttribute('viewBox', rectToViewBox(this.baseViewBox));
    this.rotateLayer?.setAttribute('transform', this.rotateTransform());
  }

  /**
   * Switch what a left-drag does (`'rotate'` spin vs `'pan'`). Takes effect immediately; any
   * in-flight drag is cancelled. When zoom is off, this also (un)binds the drag listeners so
   * a rotate-only map still responds to the mouse.
   */
  setDragMode(mode: DragMode): void {
    if (this.dragMode === mode) return;
    const wasInteractive = this.isInteractive();
    this.dragMode = mode;
    this.endDrag();
    const nowInteractive = this.isInteractive();
    if (this.svg && wasInteractive !== nowInteractive) {
      if (nowInteractive) {
        this.svg.addEventListener('mousedown', this.onMouseDown);
        this.svg.addEventListener('dblclick', this.onDblClick);
      } else {
        this.svg.removeEventListener('mousedown', this.onMouseDown);
        this.svg.removeEventListener('dblclick', this.onDblClick);
      }
    }
    if (this.svg) this.svg.style.cursor = nowInteractive ? 'grab' : '';
  }

  /** The map responds to the mouse when zoom is on, or whenever drag-spin is enabled. */
  private isInteractive(): boolean {
    return this.enableZoom || this.dragMode === 'rotate';
  }

  /** The `rotate(...)` transform for the content layer — spin about the board center. */
  private rotateTransform(): string {
    return `rotate(${this.rotationDeg} ${BOARD_IMAGE_INFO.width / 2} ${BOARD_IMAGE_INFO.height / 2})`;
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
      heroEntries(state),
      'hero',
      (entry) => ({ kind: 'hero', id: entry.id, location: entry.location }),
      (entry) => ({ kind: 'hero', id: entry.id })
    );

    // Foes (fanned), at the `foe` slot. Art id = foe *type*; selection id = instance id.
    this.renderFannedByLocation(
      root,
      focus,
      foeEntries(state),
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
            this.appendArtOrFallback(
              group,
              { kind: 'skull', id: 'skull' },
              'building',
              SKULL_SIZE,
              fanOffset(i, count, FAN_RADIUS)
            );
          }
          root.appendChild(group);
        }
      }
      if (b.monument || b.destroyed) {
        const px = anchorPx(loc, 'building');
        if (px) {
          const group = this.makeSelectableGroup({ kind: 'building', id: loc, location: loc }, px, opacity);
          if (b.monument) {
            this.appendArtOrFallback(group, { kind: 'monument', id: b.monument }, 'building', SLOT_SIZE);
          }
          if (b.destroyed) group.appendChild(razedOverlay(SLOT_SIZE));
          root.appendChild(group);
        }
      }
    }

    // Space markers (fanned), at the `marker` slot.
    this.renderFannedByLocation(
      root,
      focus,
      markerEntries(state),
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
        const off = fanOffset(i, entries.length, FAN_RADIUS);
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

  /**
   * Append the art image (with an error→fallback handler) or, when there is no art, the fallback
   * disc directly. `off` positions both the image and the fallback within the group, so skull
   * fans (and any future offset art) get the same graceful fallback as centered tokens.
   */
  private appendArtOrFallback(
    group: SVGGElement,
    art: TokenArtRef,
    kind: TokenSelection['kind'],
    size: number,
    off: Offset = { dx: 0, dy: 0 }
  ): void {
    const addFallback = (): void => {
      const disc = fallbackDisc(kind, art.id, size);
      if (off.dx !== 0 || off.dy !== 0) {
        disc.setAttribute('transform', `translate(${off.dx} ${off.dy})`);
      }
      group.appendChild(disc);
    };
    const url = this.resolve(art);
    if (url === null) {
      addFallback();
      return;
    }
    const image = makeImage(url, size, off);
    image.addEventListener(
      'error',
      () => {
        image.remove();
        addFallback();
      },
      { once: true }
    );
    group.appendChild(image);
  }

  // ── focus / selection ──────────────────────────────────────────────────────

  private dim(loc: LocationName, focus: BoardFocus): number {
    if (focus.kingdom === 'all') return 1;
    return BOARD_LOCATION_BY_NAME[loc]?.kingdom === (focus.kingdom as BoardKingdom) ? 1 : DIM_OPACITY;
  }

  private focusViewBox(focus: BoardFocus, width: number, height: number): Rect {
    const full: Rect = { x: 0, y: 0, w: width, h: height };
    if (focus.kingdom === 'all') return full;
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
    if (!Number.isFinite(minX)) return full;
    return {
      x: minX - VIEWBOX_PAD,
      y: minY - VIEWBOX_PAD,
      w: maxX - minX + VIEWBOX_PAD * 2,
      h: maxY - minY + VIEWBOX_PAD * 2,
    };
  }

  // ── mouse zoom / pan ─────────────────────────────────────────────────────────

  /** The view currently applied to the svg (manual zoom/pan if any, else the focus base). */
  private currentViewBox(): Rect {
    return this.userViewBox ?? this.baseViewBox;
  }

  /** Wheel toward the cursor. Reads the cursor's fractional position from the svg rect;
   *  jsdom (and hidden elements) report a zero-size rect, so we fall back to the center. */
  private handleWheel(event: WheelEvent): void {
    if (!this.svg) return;
    event.preventDefault();
    const rect = this.svg.getBoundingClientRect();
    const fx = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0.5;
    const fy = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;
    const factor = event.deltaY < 0 ? 1 / WHEEL_STEP : WHEEL_STEP;
    const next = zoomRect(this.currentViewBox(), this.baseViewBox, fx, fy, factor, this.maxZoom);
    this.applyView(next);
  }

  private handleMouseDown(event: MouseEvent): void {
    const primary = event.button === 0;
    const middle = event.button === 1;
    if (!primary && !middle) return;
    // The middle button runs the OTHER drag action: a quick pan while in spin mode, or a
    // press-and-hold spin while in pan mode (the left button always does the active mode).
    const action: DragMode = middle ? (this.dragMode === 'rotate' ? 'pan' : 'rotate') : this.dragMode;
    if (middle) event.preventDefault(); // suppress the browser's middle-click autoscroll
    if (action === 'rotate') {
      this.beginRotate(event);
      return;
    }
    // Pan: only when zoomed in (panning the base view is a no-op).
    if (!this.userViewBox) return;
    this.panStart = { clientX: event.clientX, clientY: event.clientY, view: this.userViewBox };
    this.panMoved = false;
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    if (this.svg) this.svg.style.cursor = 'grabbing';
  }

  /** Pin the spin pivot (board center on screen) and the grab angle for a grab-&-spin. */
  private beginRotate(event: MouseEvent): void {
    if (!this.svg) return;
    const rect = this.svg.getBoundingClientRect();
    const { width, height } = BOARD_IMAGE_INFO;
    const pivot = viewBoxPointToClient(width / 2, height / 2, this.currentViewBox(), rect);
    this.rotateStart = {
      pivot,
      downX: event.clientX,
      downY: event.clientY,
      startAngle: pointerAngleDeg(pivot, { x: event.clientX, y: event.clientY }),
      startRotation: this.rotationDeg,
    };
    this.rotateMoved = false;
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    this.svg.style.cursor = 'grabbing';
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.rotateStart) {
      this.dragRotate(event);
      return;
    }
    if (!this.panStart || !this.svg) return;
    const dxPx = event.clientX - this.panStart.clientX;
    const dyPx = event.clientY - this.panStart.clientY;
    // Flag a real drag from the pixel delta alone (no layout needed) so the trailing click is
    // suppressed even where `getBoundingClientRect` reports nothing (jsdom / hidden element).
    if (Math.abs(dxPx) > DRAG_THRESHOLD_PX || Math.abs(dyPx) > DRAG_THRESHOLD_PX) this.panMoved = true;
    const rect = this.svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return; // no layout → can't translate the view
    // A drag moves the content under the cursor, so pan the view in the opposite direction.
    const view = this.panStart.view;
    const next = panRect(view, this.baseViewBox, (-dxPx * view.w) / rect.width, (-dyPx * view.h) / rect.height);
    this.applyView(next);
  }

  /** Spin the board so the grabbed point tracks the cursor's angle around the board center. */
  private dragRotate(event: MouseEvent): void {
    const start = this.rotateStart;
    if (!start || !this.rotateLayer) return;
    // Flag a real drag from the pixel delta so the trailing click doesn't select a token.
    if (Math.abs(event.clientX - start.downX) > DRAG_THRESHOLD_PX || Math.abs(event.clientY - start.downY) > DRAG_THRESHOLD_PX) {
      this.rotateMoved = true;
    }
    const angle = pointerAngleDeg(start.pivot, { x: event.clientX, y: event.clientY });
    this.rotationDeg = start.startRotation + (angle - start.startAngle);
    this.rotateLayer.setAttribute('transform', this.rotateTransform());
  }

  private handleMouseUp(): void {
    if (this.panMoved || this.rotateMoved) this.suppressClick = true; // swallow the trailing click
    this.endDrag();
  }

  /** Drop the in-flight drag's document listeners (also called from `dispose`/`setDragMode`). */
  private endDrag(): void {
    if (!this.panStart && !this.rotateStart) return;
    this.panStart = undefined;
    this.rotateStart = undefined;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    if (this.svg) this.svg.style.cursor = this.isInteractive() ? 'grab' : '';
  }

  /** Write a new view to the svg; collapse back to "no manual view" once fully zoomed out
   *  (width reaches the base) so `currentViewBox()` returns the exact base, free of drift. */
  private applyView(next: Rect): void {
    this.userViewBox = next.w >= this.baseViewBox.w ? undefined : next;
    this.svg?.setAttribute('viewBox', rectToViewBox(this.currentViewBox()));
  }

  // ── focus / selection (cont.) ────────────────────────────────────────────────

  private handleClick(event: Event): void {
    if (this.suppressClick) {
      this.suppressClick = false; // this click closed a pan-drag — don't select
      return;
    }
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

function anchorPx(loc: LocationName, slot: AnchorSlot): Point | null {
  const anchor = BOARD_ANCHORS[loc]?.[slot];
  if (!anchor) return null;
  return { x: anchor.x * BOARD_IMAGE_INFO.width, y: anchor.y * BOARD_IMAGE_INFO.height };
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
