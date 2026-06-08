// `./plugin` entry (`ultimatedarktowerboard/plugin`) — the 3D board.
//
// This is the ONLY module allowed to depend on `three` / `ultimatedarktowerdisplay`
// (a CI grep enforces it; see .github/workflows/ci.yml). It builds all Object3Ds
// with the CONSUMER's `three` (an externalized peer), never a bundled copy, so the
// geometry shares the host's single `three` instance.
//
// The board renders as image billboards (`THREE.Sprite`s) on Display's ground
// disc, placed via Display 0.9's `anchorToWorld` using the SAME slot/fan/asset
// conventions as the 2D map (`renderers/map2d.ts` + the shared `renderers/assetPaths.ts`).
import * as THREE from 'three';
import { attachScenePlugin, anchorToWorld } from 'ultimatedarktowerdisplay';
import type {
  ScenePlugin,
  ScenePluginContext,
  ScenePluginModelInfo,
  Tower3DView,
  DiscMetrics,
  TowerSide,
  CameraConfig,
} from 'ultimatedarktowerdisplay';
import type { BoardState, LocationName } from '../state/boardState';
import type { AnchorSlot, BoardKingdom } from '../data/udtReexports';
import { BOARD_ANCHORS } from '../data/udtReexports';
import type { BoardFocus, BoardViewAngle } from '../renderers/shared';
import { DEFAULT_FOCUS, focusEquals } from '../renderers/shared';
import { KIND_TINT, defaultTokenImagePath } from '../renderers/assetPaths';
import type { TokenArtRef, TokenSelection } from '../renderers/assetPaths';
import {
  MAX_FANNED_SKULLS,
  fanOffset,
  selectionKey,
  heroEntries,
  foeEntries,
  markerEntries,
} from '../renderers/tokenLayout';
import type { LocatedEntry } from '../renderers/tokenLayout';
// Type-only — the store INSTANCE is supplied by the caller; no runtime UI dependency.
import type { LocationPickStore } from '../ui/stores';

export type { TokenSelection, TokenArtRef } from '../renderers/assetPaths';

/** Token sizes / fan radius, as a fraction of the disc radius (world units). */
const SLOT_FACTOR = 0.05;
const SKULL_FACTOR = 0.03;
const FAN_FACTOR = 0.04;
/** The token pointer target outranks OrbitControls so clicks select before they orbit. */
const POINTER_PRIORITY = 10;
/** The armed space-pick target outranks tokens so a placement click wins over selection. */
const SPACE_POINTER_PRIORITY = 20;
/** Scale bump applied to the selected token. */
const SELECTED_SCALE = 1.35;

/** Context handed to a custom `tokenFactory` so it can build with the consumer's `three`. */
export interface TokenBuildContext {
  selection: TokenSelection;
  /** The art reference (or `null` for a pure programmatic token, e.g. the razed marker). */
  art: TokenArtRef | null;
  /** World position on the disc top surface (token base rests here). */
  position: THREE.Vector3;
  /** Suggested size in world units. */
  size: number;
  /** The live ground-disc metrics. */
  disc: DiscMetrics;
  /** The consumer's `three` namespace — build Object3Ds with THIS, never a bundled copy. */
  three: typeof THREE;
}

export interface Board3DPluginOptions {
  /** Initial board state to render (the plugin reads; the host owns mutations). */
  boardState?: BoardState;
  /** Base URL token images are resolved against (not bundled into JS), e.g. `'./tokens/'`. */
  assetBaseUrl?: string;
  /**
   * The board surface image, e.g. `'./board.png'`. When set, the plugin renders its
   * OWN board on the disc (decoupled from Display's bundled art) and hides Display's
   * placeholder (`setBoardDiscEnabled(false)`). When omitted, Display's board stays
   * visible and tokens are placed on it.
   */
  boardImageUrl?: string;
  /**
   * Which kingdom faces +Z on the disc (0–3). Owned by the board (default `0`),
   * NOT read from Display's lighting config. Passed to `anchorToWorld`.
   */
  northKingdom?: 0 | 1 | 2 | 3;
  /** Override the default `${assetBaseUrl}${group}/${kebab(id)}.png` convention. `null` → fallback. */
  resolveTokenImage?: (ref: TokenArtRef) => string | null;
  /** Fired when a token is clicked. Selection is renderer-local — never written to BoardState. */
  onTokenSelect?: (selection: TokenSelection) => void;
  /** Fired when the camera side (the focus source of truth) changes. */
  onFocusChange?: (focus: BoardFocus) => void;
  /**
   * Drives the armed space-pick (M4 editing). When the store reports armed, a click on an
   * (invisible) on-disc space target reports a location via `store.pick(loc)` and consumes
   * the gesture. Without a store the space-pick is off (token selection only).
   */
  locationPick?: LocationPickStore;
  /** Fired when a space is clicked while armed (in addition to `locationPick.pick`). */
  onLocationPick?: (location: LocationName) => void;
  /** Seam for real 3D models later; default builds a `THREE.Sprite` billboard. Return `null` to skip. */
  tokenFactory?: (ctx: TokenBuildContext) => THREE.Object3D | null;
}

/** Returned by {@link attachBoard3D}; drives the live plugin. */
export interface Board3DHandle {
  /** Replace the rendered board state (re-places tokens). */
  setBoardState(state: BoardState): void;
  /** Drive the shared focus into the 3D camera. */
  setFocus(focus: BoardFocus): void;
  /** Detach and dispose the plugin. */
  dispose(): void;
}

/**
 * Attach the 3D board to a live {@link Tower3DView}. Mirrors Display's own
 * `attachSkullPhysics(view, …)` helper: it closes over the `view` (the plugin needs
 * `getDiscMetrics`/`setBoardDiscEnabled`/camera, which the `ScenePluginContext`
 * does not expose) and returns a small handle.
 */
export function attachBoard3D(view3D: Tower3DView, options: Board3DPluginOptions = {}): Board3DHandle {
  const plugin = new Board3DPlugin(view3D, options);
  const handle = attachScenePlugin(view3D, plugin);
  return {
    setBoardState: (state) => plugin.setBoardState(state),
    setFocus: (focus) => plugin.setFocus(focus),
    dispose: () => handle.detach(),
  };
}

/**
 * The 3D in-scene board, implemented as a Display {@link ScenePlugin}. Prefer
 * {@link attachBoard3D}; construct this directly only for advanced
 * `attachScenePlugin` wiring. All disc-relative geometry is built in
 * `onModelLoaded` (the disc metrics are placeholder until the GLB loads).
 */
export class Board3DPlugin implements ScenePlugin {
  readonly id = 'ultimatedarktowerboard:board3d';

  private ctx: ScenePluginContext | null = null;
  private disc: DiscMetrics | null = null;
  private group: THREE.Group | null = null;
  private board: THREE.Mesh | null = null;
  private tokens: THREE.Object3D[] = [];
  private spaceTargets: THREE.Object3D[] = [];
  private boardState: BoardState | null;
  private selectedKey: string | null = null;
  private currentFocus: BoardFocus = DEFAULT_FOCUS;
  private readonly unsubs: Array<() => void> = [];
  private readonly loader = new THREE.TextureLoader();

  constructor(
    private readonly view3D: Tower3DView,
    private readonly options: Board3DPluginOptions = {}
  ) {
    this.boardState = options.boardState ?? null;
  }

  attach(ctx: ScenePluginContext): void {
    this.ctx = ctx;
    // Raycast selection: registered up-front, hit-tests the live token list, and
    // consumes the gesture (returns true) so OrbitControls/side-select don't fire.
    this.unsubs.push(
      ctx.registerPointerTarget({
        objects: () => this.tokens,
        priority: POINTER_PRIORITY,
        onPointerDown: (hit) => this.handlePointerDown(hit),
      })
    );
    // The 3D camera is the focus source of truth — reflect side changes outward.
    this.unsubs.push(
      ctx.onSideChange((side) => {
        this.currentFocus = { kingdom: sideToKingdom(side), angle: this.currentFocus.angle };
        this.options.onFocusChange?.(this.currentFocus);
      })
    );
    // Armed space-pick: only registered when configured, so the token target stays the
    // sole pointer target for non-editing consumers. Outranks tokens while armed.
    if (this.spacePickEnabled()) {
      this.unsubs.push(
        ctx.registerPointerTarget({
          objects: () => this.armedSpaceTargets(),
          priority: SPACE_POINTER_PRIORITY,
          onPointerDown: (hit) => this.handleSpacePointerDown(hit),
        })
      );
    }
  }

  onModelLoaded(_info: ScenePluginModelInfo): void {
    if (!this.ctx) return;
    this.disc = this.view3D.getDiscMetrics();
    this.group = new THREE.Group();
    this.group.name = 'ultimatedarktowerboard:board';
    this.ctx.scene.add(this.group);
    // With a boardImageUrl, render the board's OWN surface and hide Display's
    // placeholder (the disc mesh + physics floor stay). Without one, leave
    // Display's board visible so tokens still rest on a board.
    if (this.options.boardImageUrl) {
      this.view3D.setBoardDiscEnabled(false);
      this.board = this.buildBoard(this.options.boardImageUrl, this.disc, this.options.northKingdom ?? 0);
      this.group.add(this.board);
    }
    this.renderTokens();
    if (this.spacePickEnabled()) this.buildSpaceTargets();
  }

  /**
   * A flat board surface on the disc top. Its corners are placed through the SAME
   * `anchorToWorld` mapping the tokens use (the mapping is affine in the anchor, so
   * 4 corners + 2 triangles reproduce it exactly) → the printed art is pixel-aligned
   * with token placement, by construction.
   */
  private buildBoard(url: string, disc: DiscMetrics, northKingdom: 0 | 1 | 2 | 3): THREE.Mesh {
    const lift = disc.radius * 0.001; // tiny lift above the disc mesh to avoid z-fighting
    const corner = (x: number, y: number): THREE.Vector3 => {
      const p = anchorToWorld({ x, y }, disc, northKingdom);
      p.y += lift;
      return p;
    };
    const c = [corner(0, 0), corner(1, 0), corner(1, 1), corner(0, 1)];
    const positions = new Float32Array(c.flatMap((p) => [p.x, p.y, p.z]));
    const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals();

    const texture = this.loader.load(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false; // uv (0,0) → image top-left, matching anchorToWorld(ax, ay)
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 1; // beneath tokens (renderOrder 10)
    return mesh;
  }

  /** Replace the board state and re-place tokens (deferred until the disc is ready). */
  setBoardState(state: BoardState): void {
    this.boardState = state;
    if (this.group && this.disc) this.renderTokens();
  }

  /** Drive the shared focus into the camera (kingdom → side, angle → CameraConfig). */
  setFocus(focus: BoardFocus): void {
    if (focusEquals(this.currentFocus, focus)) return;
    this.currentFocus = focus;
    if (focus.kingdom !== 'all') this.view3D.selectSide(kingdomToSide(focus.kingdom));
    this.view3D.applyCameraConfig(angleToCameraConfig(focus.angle));
  }

  dispose(): void {
    for (const unsub of this.unsubs.splice(0)) {
      try {
        unsub();
      } catch {
        // a listener already torn down — ignore
      }
    }
    this.clearTokens();
    this.clearSpaceTargets();
    if (this.board) {
      disposeObject(this.board);
      this.board.removeFromParent();
      this.board = null;
    }
    this.group?.removeFromParent();
    this.group = null;
    this.ctx = null;
    this.disc = null;
  }

  // ── token placement (mirrors BoardMap2D.renderTokens) ───────────────────────

  private renderTokens(): void {
    if (!this.group || !this.disc) return;
    this.clearTokens();
    const state = this.boardState;
    if (!state) return;

    // Heroes (fanned), at the `hero` slot. No hero art exists → fallback.
    this.placeFanned(
      heroEntries(state),
      'hero',
      (e) => ({ kind: 'hero', id: e.id, location: e.location }),
      (e) => ({ kind: 'hero', id: e.id })
    );

    // Foes (fanned), at the `foe` slot. Art id = foe type; selection id = instance id.
    this.placeFanned(
      foeEntries(state),
      'foe',
      (e) => ({ kind: 'foe', id: e.id, location: e.location }),
      (e) => ({ kind: 'foe', id: e.art ?? e.id })
    );

    // Adversary, at its location's `foe` slot (falls back to `building`).
    const adversary = state.adversary;
    if (adversary?.location) {
      const anchor =
        BOARD_ANCHORS[adversary.location]?.foe ?? BOARD_ANCHORS[adversary.location]?.building;
      if (anchor) {
        this.addToken(
          { kind: 'adversary', id: adversary.id, location: adversary.location },
          { kind: 'adversary', id: adversary.id },
          this.worldAt(anchor),
          this.tokenSize()
        );
      }
    }

    // Buildings: skull stacks + monument / razed overlays (a click selects the building).
    for (const [loc, b] of Object.entries(state.buildings)) {
      if (b.skulls > 0) {
        const anchor = BOARD_ANCHORS[loc]?.skull;
        if (anchor) {
          const base = this.worldAt(anchor);
          const count = Math.min(b.skulls, MAX_FANNED_SKULLS);
          const radius = this.fanRadius();
          for (let i = 0; i < count; i++) {
            const pos = base.clone().add(fanVec3(i, count, radius));
            this.addToken({ kind: 'building', id: loc, location: loc }, { kind: 'skull', id: 'skull' }, pos, this.skullSize());
          }
        }
      }
      if (b.monument || b.destroyed) {
        const anchor = BOARD_ANCHORS[loc]?.building;
        if (anchor) {
          const pos = this.worldAt(anchor);
          const selection: TokenSelection = { kind: 'building', id: loc, location: loc };
          if (b.monument) {
            this.addToken(selection, { kind: 'monument', id: b.monument }, pos, this.tokenSize());
          }
          if (b.destroyed) this.addRazed(selection, pos, this.tokenSize());
        }
      }
    }

    // Space markers (fanned), at the `marker` slot.
    this.placeFanned(
      markerEntries(state),
      'marker',
      (e) => ({ kind: 'marker', id: e.id, location: e.location }),
      (e) => ({ kind: 'marker', id: e.art ?? e.id })
    );

    this.applyHighlight();
  }

  /** Place same-location entries at `slot`, fanning when more than one shares the slot. */
  private placeFanned(
    byLocation: Map<LocationName, LocatedEntry[]>,
    slot: AnchorSlot,
    toSelection: (entry: LocatedEntry) => TokenSelection,
    toArt: (entry: LocatedEntry) => TokenArtRef
  ): void {
    const radius = this.fanRadius();
    for (const [loc, entries] of byLocation) {
      const anchor = BOARD_ANCHORS[loc]?.[slot];
      if (!anchor) continue;
      const base = this.worldAt(anchor);
      entries.forEach((entry, i) => {
        const pos = base.clone().add(fanVec3(i, entries.length, radius));
        this.addToken(toSelection(entry), toArt(entry), pos, this.tokenSize());
      });
    }
  }

  private addToken(selection: TokenSelection, art: TokenArtRef, position: THREE.Vector3, size: number): void {
    const node = this.options.tokenFactory
      ? this.options.tokenFactory({ selection, art, position, size, disc: this.disc as DiscMetrics, three: THREE })
      : this.buildSprite(selection, art, position, size);
    if (node) this.register(node, selection);
  }

  /** Programmatic "razed" marker for a destroyed building (no art). */
  private addRazed(selection: TokenSelection, position: THREE.Vector3, size: number): void {
    const sprite = this.makeSprite('#dc2626', size, position);
    sprite.material.opacity = 0.85;
    this.register(sprite, selection);
  }

  private buildSprite(selection: TokenSelection, art: TokenArtRef, position: THREE.Vector3, size: number): THREE.Sprite {
    const url = this.resolveArt(art);
    const sprite = this.makeSprite(url ? '#ffffff' : KIND_TINT[selection.kind], size, position);
    if (url) {
      const texture = this.loader.load(url, undefined, undefined, () => {
        // load error → kind-tinted fallback
        sprite.material.map = null;
        sprite.material.color.set(KIND_TINT[selection.kind]);
        sprite.material.needsUpdate = true;
      });
      texture.colorSpace = THREE.SRGBColorSpace;
      sprite.material.map = texture;
      sprite.material.needsUpdate = true;
    }
    return sprite;
  }

  /** A camera-facing billboard centered above `position` so its base rests on the disc. */
  private makeSprite(color: string, size: number, position: THREE.Vector3): THREE.Sprite {
    const material = new THREE.SpriteMaterial({ color, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size, size, 1);
    sprite.position.set(position.x, position.y + size / 2, position.z);
    sprite.renderOrder = 10;
    return sprite;
  }

  private register(node: THREE.Object3D, selection: TokenSelection): void {
    node.userData.selection = selection;
    node.userData.baseScale = node.scale.clone();
    this.group?.add(node);
    this.tokens.push(node);
  }

  private resolveArt(art: TokenArtRef): string | null {
    return this.options.resolveTokenImage
      ? this.options.resolveTokenImage(art)
      : defaultTokenImagePath(art, this.options.assetBaseUrl);
  }

  private clearTokens(): void {
    for (const node of this.tokens) {
      node.removeFromParent();
      disposeObject(node);
    }
    this.tokens = [];
  }

  private worldAt(anchor: { x: number; y: number }): THREE.Vector3 {
    return anchorToWorld(anchor, this.disc as DiscMetrics, this.options.northKingdom ?? 0);
  }

  private tokenSize(): number {
    return (this.disc?.radius ?? 1) * SLOT_FACTOR;
  }

  private skullSize(): number {
    return (this.disc?.radius ?? 1) * SKULL_FACTOR;
  }

  private fanRadius(): number {
    return (this.disc?.radius ?? 1) * FAN_FACTOR;
  }

  // ── selection ───────────────────────────────────────────────────────────────

  private handlePointerDown(hit: THREE.Intersection): boolean {
    const selection = findSelection(hit.object);
    if (!selection) return false;
    this.selectedKey = selectionKey(selection);
    this.applyHighlight();
    this.options.onTokenSelect?.(selection);
    return true; // consume → no orbit / side-select
  }

  // ── armed space-pick (M4 editing) ────────────────────────────────────────────

  private spacePickEnabled(): boolean {
    return Boolean(this.options.locationPick || this.options.onLocationPick);
  }

  private isArmed(): boolean {
    return this.options.locationPick?.isArmed() ?? false;
  }

  /** The space targets the pointer should hit-test right now (filtered by the pending placement). */
  private armedSpaceTargets(): THREE.Object3D[] {
    if (!this.isArmed()) return [];
    const targets = this.options.locationPick?.getPending()?.targets ?? 'all';
    return targets === 'buildings'
      ? this.spaceTargets.filter((t) => t.userData.isBuilding === true)
      : this.spaceTargets;
  }

  /** Invisible, raycast-only discs at every location anchor (kept off the scene graph). */
  private buildSpaceTargets(): void {
    this.clearSpaceTargets();
    if (!this.disc) return;
    const radius = this.tokenSize();
    for (const [loc, slots] of Object.entries(BOARD_ANCHORS)) {
      const anchor = slots.hero ?? slots.building;
      if (!anchor) continue;
      const geometry = new THREE.SphereGeometry(radius, 6, 4);
      const material = new THREE.MeshBasicMaterial({ visible: false });
      const mesh = new THREE.Mesh(geometry, material);
      const pos = this.worldAt(anchor);
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.userData.location = loc;
      mesh.userData.isBuilding = Boolean(slots.building);
      mesh.updateMatrixWorld(true); // static + detached → compute the world matrix once for raycasting
      this.spaceTargets.push(mesh);
    }
  }

  private clearSpaceTargets(): void {
    for (const mesh of this.spaceTargets) disposeObject(mesh);
    this.spaceTargets = [];
  }

  private handleSpacePointerDown(hit: THREE.Intersection): boolean {
    const location = findLocation(hit.object);
    if (location == null) return false;
    this.options.onLocationPick?.(location);
    this.options.locationPick?.pick(location);
    return true; // consume → no orbit / side-select
  }

  private applyHighlight(): void {
    for (const node of this.tokens) {
      const selection = node.userData.selection as TokenSelection | undefined;
      const base = node.userData.baseScale as THREE.Vector3 | undefined;
      if (!selection || !base) continue;
      const k = this.selectedKey === selectionKey(selection) ? SELECTED_SCALE : 1;
      node.scale.set(base.x * k, base.y * k, base.z);
    }
  }
}

// ── module-local helpers ──────────────────────────────────────────────────────

/** Lift the shared planar fan offset into the disc plane (x/z), matching the 2D map's fan. */
function fanVec3(index: number, count: number, radius: number): THREE.Vector3 {
  const off = fanOffset(index, count, radius);
  return new THREE.Vector3(off.dx, 0, off.dy);
}

/** Walk up from a raycast hit to the owning token's `TokenSelection`. */
function findSelection(object: THREE.Object3D | null): TokenSelection | null {
  let current = object;
  while (current) {
    const selection = current.userData.selection as TokenSelection | undefined;
    if (selection) return selection;
    current = current.parent;
  }
  return null;
}

/** Walk up from a raycast hit to the owning space target's location. */
function findLocation(object: THREE.Object3D | null): LocationName | null {
  let current = object;
  while (current) {
    const location = current.userData.location as LocationName | undefined;
    if (location != null) return location;
    current = current.parent;
  }
  return null;
}

/** `BoardKingdom` and `TowerSide` are the same cardinal union — map by identity. */
function sideToKingdom(side: TowerSide): BoardKingdom {
  return side as BoardKingdom;
}
function kingdomToSide(kingdom: BoardKingdom): TowerSide {
  return kingdom as TowerSide;
}

/** Overhead = high eye / top-down; isometric = Display's default oblique tilt. Tunable. */
function angleToCameraConfig(angle: BoardViewAngle): CameraConfig {
  return angle === 'overhead'
    ? { elevationFactor: 2, targetHeightFactor: -0.15 }
    : { elevationFactor: -0.5, targetHeightFactor: -0.15 };
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.geometry.dispose();
      disposeMaterial(node.material);
    } else if (node instanceof THREE.Sprite) {
      disposeMaterial(node.material);
    }
  });
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  const list = Array.isArray(material) ? material : [material];
  for (const m of list) {
    (m as THREE.Material & { map?: THREE.Texture | null }).map?.dispose();
    m.dispose();
  }
}
