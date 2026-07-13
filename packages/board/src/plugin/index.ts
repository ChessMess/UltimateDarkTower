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
// Reuse Display's model loader (load-once/cache-per-URL, GLTF+DRACO, normalized to a
// unit-bounding-sphere mesh). Externalized via `vite.config.ts` so its loaders stay in
// Display's chunk, not the board's plugin bundle.
import { loadSkullModel } from 'ultimatedarktowerdisplay/physics';
import type { SkullTemplate } from 'ultimatedarktowerdisplay/physics';
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
import {
  KIND_TINT,
  KIND_Z_3D,
  lookupTokenArt,
  resolveTokenImageFor,
} from '../renderers/assetPaths';
import type {
  TokenArtRef,
  TokenSelection,
  TokenArtConfig,
  TokenModelRef,
  BoardView,
} from '../renderers/assetPaths';
import {
  MAX_FANNED_SKULLS,
  fanOffset,
  selectionKey,
  heroEntries,
  foeEntries,
  markerEntries,
  questEntries,
} from '../renderers/tokenLayout';
import type { LocatedEntry } from '../renderers/tokenLayout';
// Type-only — the store INSTANCE is supplied by the caller; no runtime UI dependency.
import type { LocationPickStore } from '../ui/stores';

export type {
  TokenSelection,
  TokenArtRef,
  TokenArt,
  TokenArtConfig,
  TokenModelRef,
  BoardView,
} from '../renderers/assetPaths';

// The lazily-loaded 3D adapter used by the `./stage` entry's `BoardStageView`.
// Advertised here too for advanced consumers wiring their own 3D shell.
export { createBoardTower3D, STAGE_TOWER_CSS } from './stageTower';
export type { BoardTower3DOptions, BoardTower3DHandle } from './stageTower';

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
  /**
   * Per-token art overrides, keyed by kind → art id. The 3D path renders a per-token `model3d`
   * (GLB), else the token's image as a sprite billboard (`image3d ?? image2d`); pass the SAME
   * object to the 2D map for its `image2d` slot. A per-token `model3d` is preferred over
   * {@link resolveTokenModel}, an `image3d`/`image2d` over {@link resolveTokenImage}. See {@link TokenArtConfig}.
   */
  tokenArt?: TokenArtConfig;
  /**
   * Override the default `${assetBaseUrl}${group}/${kebab(id)}.png` convention for the 3D
   * sprite. `null` → fallback. `view` is `'3d'` here; the same callback shape is reused by
   * the 2D map.
   */
  resolveTokenImage?: (ref: TokenArtRef, view: BoardView) => string | null;
  /**
   * Map a token to a 3D model rendered in place of its 2D sprite. Return `null`/`undefined`
   * to fall back to the sprite. Mirrors {@link resolveTokenImage} for the 3D path and works
   * for ANY token kind (skulls today; foes/monuments as models become available). A per-token
   * `tokenArt.model3d` takes precedence over this, and a consumer `tokenFactory` over both.
   */
  resolveTokenModel?: (art: TokenArtRef) => TokenModelRef | null | undefined;
  /**
   * When set, logs the live camera's `{ elevationFactor, targetHeightFactor, distanceFactor }`
   * (the knobs {@link angleToCameraConfig} produces) to the console whenever the camera moves —
   * tune with orbit + scroll, then paste the values into the presets to lock in a framing. A
   * tuning aid; leave off in production.
   */
  debugCamera?: boolean;
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
export function attachBoard3D(
  view3D: Tower3DView,
  options: Board3DPluginOptions = {},
): Board3DHandle {
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
  /** Bumped on every `clearTokens()` so an async model load can detect its token was cleared. */
  private modelGen = 0;
  /** `debugCamera` state: last-logged camera position + time, to log on move and throttle. */
  private readonly lastLoggedCam = new THREE.Vector3(NaN, NaN, NaN);
  private lastCamLogTime = 0;

  constructor(
    private readonly view3D: Tower3DView,
    private readonly options: Board3DPluginOptions = {},
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
      }),
    );
    // The 3D camera is the focus source of truth — reflect side changes outward.
    this.unsubs.push(
      ctx.onSideChange((side) => {
        this.currentFocus = { kingdom: sideToKingdom(side), angle: this.currentFocus.angle };
        this.options.onFocusChange?.(this.currentFocus);
      }),
    );
    // Armed space-pick: only registered when configured, so the token target stays the
    // sole pointer target for non-editing consumers. Outranks tokens while armed.
    if (this.spacePickEnabled()) {
      this.unsubs.push(
        ctx.registerPointerTarget({
          objects: () => this.armedSpaceTargets(),
          priority: SPACE_POINTER_PRIORITY,
          onPointerDown: (hit) => this.handleSpacePointerDown(hit),
        }),
      );
    }
    // Camera-tuning logger: prints the live `{ elevationFactor, targetHeightFactor }` whenever
    // the camera moves (renders are on-demand, so this is quiet when idle).
    if (this.options.debugCamera) {
      this.unsubs.push(ctx.registerFrameCallback(() => this.logCameraIfMoved()));
    }
    // Pre-seed the camera with the current view angle while the model is still loading: Display's
    // on-load `fitToModel` reads these factors, so the board opens at the default view selection
    // instead of flashing Display's default camera and then switching once tokens are placed.
    this.applyAngleConfig(this.currentFocus.angle);
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
      this.board = this.buildBoard(
        this.options.boardImageUrl,
        this.disc,
        this.options.northKingdom ?? 0,
      );
      this.group.add(this.board);
    }
    this.renderTokens();
    if (this.spacePickEnabled()) this.buildSpaceTargets();
    // (Camera angle is pre-seeded in `attach`, before the model loads, so there's no default-view
    // flash — see `applyAngleConfig`.)
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
    this.applyAngleConfig(focus.angle);
  }

  /**
   * Push a view angle's camera config to Display. Applied from {@link attach} BEFORE the model
   * loads, it pre-seeds the camera factors so Display's on-load `fitToModel` frames the board at
   * the default angle on the very first frame — instead of flashing Display's default camera and
   * then switching.
   */
  private applyAngleConfig(angle: BoardViewAngle): void {
    this.view3D.applyCameraConfig(angleToCameraConfig(angle));
  }

  /**
   * `debugCamera` aid: log the live camera framing as the three preset factors
   * `{ elevationFactor, targetHeightFactor, distanceFactor }` (via Display's `getLiveCameraFactors`,
   * which reads the real orbit target). Orbit + scroll to tune, then paste the values into
   * {@link angleToCameraConfig} — they round-trip exactly. (Azimuth is side-driven, not captured;
   * a horizontal pan moves the look-target off the vertical axis, which the preset can't reproduce.)
   * Logs only on movement, throttled.
   */
  private logCameraIfMoved(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const cam = ctx.camera;
    if (cam.position.distanceToSquared(this.lastLoggedCam) < 1e-6) return; // idle → stay quiet
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastCamLogTime < 200) return; // throttle while dragging
    this.lastCamLogTime = now;
    this.lastLoggedCam.copy(cam.position);

    const f = this.view3D.getLiveCameraFactors();
    const r = (n: number): number => +n.toFixed(2);

    console.log(
      `[board3d] camera → { elevationFactor: ${r(f.elevationFactor)}, targetHeightFactor: ${r(f.targetHeightFactor)}, distanceFactor: ${r(f.distanceFactor)} }`,
    );
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
      // We hid Display's placeholder disc in onModelLoaded (boardImageUrl was set) — restore
      // it so detaching this plugin from a still-live view doesn't leave the disc hidden.
      this.view3D.setBoardDiscEnabled(true);
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
      (e) => ({ kind: 'hero', id: e.id }),
    );

    // Foes (fanned), at the `foe` slot. Art id = foe type; selection id = instance id.
    this.placeFanned(
      foeEntries(state),
      'foe',
      (e) => ({ kind: 'foe', id: e.id, location: e.location }),
      (e) => ({ kind: 'foe', id: e.art ?? e.id }),
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
          this.tokenSize(),
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
            this.addToken(
              { kind: 'building', id: loc, location: loc },
              { kind: 'skull', id: 'skull' },
              pos,
              this.skullSize(),
            );
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
      (e) => ({ kind: 'marker', id: e.art ?? e.id }),
    );

    // Quest markers (own kind, but sharing the `marker` anchor slot — no dedicated board anchor).
    this.placeFanned(
      questEntries(state),
      'marker',
      (e) => ({ kind: 'quest', id: e.id, location: e.location }),
      (e) => ({ kind: 'quest', id: e.art ?? e.id }),
    );

    this.applyHighlight();
  }

  /** Place same-location entries at `slot`, fanning when more than one shares the slot. */
  private placeFanned(
    byLocation: Map<LocationName, LocatedEntry[]>,
    slot: AnchorSlot,
    toSelection: (entry: LocatedEntry) => TokenSelection,
    toArt: (entry: LocatedEntry) => TokenArtRef,
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

  private addToken(
    selection: TokenSelection,
    art: TokenArtRef,
    position: THREE.Vector3,
    size: number,
  ): void {
    let node: THREE.Object3D | null;
    if (this.options.tokenFactory) {
      // Consumer override wins — full control, builds with the consumer's `three`.
      node = this.options.tokenFactory({
        selection,
        art,
        position,
        size,
        disc: this.disc as DiscMetrics,
        three: THREE,
      });
    } else {
      const model = this.resolveModel(art);
      node = model
        ? this.buildModelToken(model, position, size)
        : this.buildSprite(selection, art, position, size);
    }
    if (node) {
      node.renderOrder = KIND_Z_3D[selection.kind];
      this.register(node, selection);
    }
  }

  /**
   * A 3D model token. Returns a `THREE.Group` synchronously (so selection/highlight work
   * immediately), then loads the GLB (cached per-URL by Display) and adds the cloned mesh.
   * If the token is cleared by a re-render before the load resolves, the load is dropped.
   */
  private buildModelToken(ref: TokenModelRef, position: THREE.Vector3, size: number): THREE.Group {
    const model = typeof ref === 'string' ? { url: ref } : ref;
    const group = new THREE.Group();
    group.position.set(position.x, position.y, position.z);
    group.renderOrder = 10;
    const gen = this.modelGen;
    loadSkullModel(model.url, { dracoDecoderPath: model.dracoDecoderPath })
      .then((template) => {
        // Token cleared (re-render) or plugin torn down before the load resolved → drop it.
        if (gen !== this.modelGen || group.parent === null) return;
        group.add(this.cloneModelMesh(template, size, model));
      })
      .catch(() => {
        // Load/Draco error → leave the (empty) group; the token still selects via its anchor.
      });
    return group;
  }

  /**
   * Clone the loaded template per the standard "load once, clone many, share geometry/material"
   * pattern: `Mesh.clone()` shares the template's geometry + material by reference (the memory
   * win). The clone is tagged `shared` so {@link disposeObject} never disposes those singletons
   * (Display's module cache owns them).
   */
  private cloneModelMesh(
    template: SkullTemplate,
    size: number,
    model: { scale?: number; rotation?: { x?: number; y?: number; z?: number } },
  ): THREE.Object3D {
    const mesh = (template.template as THREE.Mesh).clone();
    mesh.userData.shared = true;
    const s = size * (model.scale ?? 1);
    mesh.scale.setScalar(s); // template is normalized to a unit bounding sphere (radius 1)
    mesh.position.y = s; // lift so the sphere's bottom rests on the disc (rotation-invariant)
    if (model.rotation)
      mesh.rotation.set(model.rotation.x ?? 0, model.rotation.y ?? 0, model.rotation.z ?? 0);
    return mesh;
  }

  /** Programmatic "razed" marker for a destroyed building (no art). */
  private addRazed(selection: TokenSelection, position: THREE.Vector3, size: number): void {
    const sprite = this.makeSprite('#dc2626', size, position);
    sprite.material.opacity = 0.85;
    this.register(sprite, selection);
  }

  private buildSprite(
    selection: TokenSelection,
    art: TokenArtRef,
    position: THREE.Vector3,
    size: number,
  ): THREE.Sprite {
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

  /** The 3D model for a token: a per-token `tokenArt.model3d` override, else the callback. */
  private resolveModel(art: TokenArtRef): TokenModelRef | null | undefined {
    const override = lookupTokenArt(this.options.tokenArt, art);
    if (override?.model3d != null) return override.model3d;
    return this.options.resolveTokenModel?.(art);
  }

  private resolveArt(art: TokenArtRef): string | null {
    return resolveTokenImageFor(art, '3d', {
      tokenArt: this.options.tokenArt,
      resolveTokenImage: this.options.resolveTokenImage,
      assetBaseUrl: this.options.assetBaseUrl,
    });
  }

  private clearTokens(): void {
    this.modelGen++; // invalidate in-flight model loads from the previous render
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
      node.scale.set(base.x * k, base.y * k, base.z * k);
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

/**
 * Map the board's view angle to Display's camera config. The camera sits at
 * `(0, modelRadius·elevationFactor, distance)` with `distance ≈ 3·modelRadius`
 * (fov 45°), looking at `modelRadius·targetHeightFactor`, so the angle above the
 * board plane is `atan((elevationFactor − targetHeightFactor) / 3)`.
 *
 * Overhead → a steep ~70° top-down (reads like the 2D map while keeping token
 * height). Isometric → a ~35° oblique 3/4 view. (Display's own default
 * `elevationFactor: -0.5` puts the eye BELOW the board — fine for viewing the
 * tower's sides, wrong for a board, so the board overrides both.) Tunable.
 */
function angleToCameraConfig(angle: BoardViewAngle): CameraConfig {
  // `distanceFactor` (Display ≥ the zoom-knob build) decouples zoom from tilt: raise it to pull
  // the camera back without steepening. `elevationFactor` sets the tilt, `targetHeightFactor` the
  // vertical framing. Hand-tune with `debugCamera` (orbit + scroll) and paste the logged trio here.
  return angle === 'overhead'
    ? { elevationFactor: 9, targetHeightFactor: -0.2, distanceFactor: 1.3 } // steep, near top-down
    : { elevationFactor: 3, targetHeightFactor: -0.3, distanceFactor: 1.7 }; // oblique 3/4, pulled back
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((node) => {
    // Model-token clones share the loader's cached geometry/material (one per URL, owned by
    // Display's module cache and reused across re-renders) — disposing them here would corrupt
    // every other clone, so skip flagged nodes. They're freed by the GC once removed.
    if (node.userData.shared === true) return;
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
