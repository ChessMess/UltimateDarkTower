# API reference

_Docs: [Index](README.md) > Integrator > API_

**Before reading:** [GETTING_STARTED](GETTING_STARTED.md) covers install and your first render;
[ARCHITECTURE](ARCHITECTURE.md) is the mental model (unidirectional state → renderers);
[RENDERERS](RENDERERS.md) compares the readout / 2D map / 3D board at a glance. This page is for lookup.
**Changelog:** [../CHANGELOG.md](../CHANGELOG.md).

`ultimatedarktowerboard` has **three entry points**:

| Import                          | What you get                                                                                                                                                         | Heavy deps                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `ultimatedarktowerboard` (`.`)  | headless `BoardState` + controller/reducer/commands/events/save-load, the **readout** and **2D map** renderers, the dockable **editing UI**, and UDT data re-exports | **none** (no `three`, no Display)                     |
| `ultimatedarktowerboard/stage`  | `BoardStageView` — the all-in-one render stage (2D + 3D + every control)                                                                                             | **none statically** — the 3D tower is **lazy-loaded** |
| `ultimatedarktowerboard/plugin` | `Board3DPlugin` / `attachBoard3D` — the 3D board, a Display `ScenePlugin`                                                                                            | `three` + `ultimatedarktowerdisplay`                  |

## Exports

```ts
// `.` — headless core, readout + 2D renderers, editing UI, UDT data re-exports (three-free)
import {
  createDefaultBoardState,
  applyBoardCommand,
  BoardStateController,
  saveState,
  loadState,
  BOARD_STATE_SCHEMA_VERSION,
  BoardStateLoadError,
  BoardReadout,
  BoardMap2D,
  kebab,
  DEFAULT_FOCUS,
  focusEquals,
  mountFocusControls,
  BoardRenderView,
  mountBoardUI,
  createSelectionStore,
  createLocationPickStore,
  // UDT data re-exports (subset — see "UDT re-exports" below for the full list)
  BOARD_LOCATIONS,
  BOARD_ANCHORS,
  BOARD_ADJACENCY,
  neighborsOf,
  stepDistance,
  shortestPath,
  HEROES,
  MONUMENTS,
  TIER1_FOES,
  ADVERSARIES,
  FOE_STATUSES,
} from 'ultimatedarktowerboard';
import type {
  BoardState,
  HeroToken,
  FoeToken,
  BuildingState,
  FoeStatus,
  SpaceMarker,
  HeroId,
  FoeId,
  LocationName,
  BoardCommand,
  BoardCommandType,
  BoardEvent,
  BoardEventType,
  BoardEventListener,
  BoardStateControllerOptions,
  BoardRenderer,
  BoardMap2DOptions,
  TokenSelection,
  TokenArtRef,
  BoardFocus,
  BoardViewAngle,
  FocusControlsOptions,
  FocusControlsHandle,
  BoardRenderViewOptions,
  BoardUIOptions,
  BoardUIHandle,
  PanelId,
  PanelPlacement,
  BoardUIRosters,
  RosterEntry,
  SelectionStore,
  LocationPickStore,
  PendingPlacement,
  LocationPickEvent,
} from 'ultimatedarktowerboard';

// `./stage` — the all-in-one render stage (three-free statically; lazy-loads the 3D tower)
import { BoardStageView, BOARD_STAGE_CSS, injectStageStyles } from 'ultimatedarktowerboard/stage';
import type { BoardStageViewOptions, DisplayMode } from 'ultimatedarktowerboard/stage';

// `./plugin` — the 3D board (imports three + ultimatedarktowerdisplay)
import { attachBoard3D, Board3DPlugin } from 'ultimatedarktowerboard/plugin';
import type {
  Board3DPluginOptions,
  Board3DHandle,
  TokenBuildContext,
} from 'ultimatedarktowerboard/plugin';
```

---

# `ultimatedarktowerboard` (the `.` entry)

## State

### `BoardState`

The full board state — a _dumb container_. It stores what it's told and enforces no game rules; renderers
read it, hosts own the rules. All values are plain JSON-serializable data (no class instances, no
`Map`/`Set`, no functions), so state round-trips through JSON cleanly. The schema version is not stored
here — it lives in the save envelope (see [Save / load](#save--load)).

```ts
interface BoardState {
  heroes: Record<HeroId, HeroToken>; // placed heroes, keyed by instance id
  foes: Record<FoeId, FoeToken>; // placed foes, keyed by instance id
  adversary?: { id: string; location?: LocationName };
  buildings: Record<LocationName, BuildingState>; // the 16 building spaces
  spaceMarkers: Record<LocationName, SpaceMarker[]>; // a key is present only while it has markers
  selections?: {
    difficulty?: string;
    adversary?: string;
    allies?: string[];
    foes?: string[];
    expansions?: string[];
  };
  meta?: Record<string, unknown>; // host-specific escape hatch
}
```

Token shapes:

- **`HeroToken`** — `{ location: LocationName; owner?: BoardKingdom; meta? }`. A hero pawn on the board.
- **`FoeToken`** — `{ foe: string; location: LocationName; status: FoeStatus; meta? }`. `foe` is the foe
  _type_ id (from UDT's tiered rosters); `status` is the in-play power progression (tracked, not rendered).
- **`BuildingState`** — `{ skulls: number; destroyed: boolean; monument?: string | null }`. One building space.

Identity / value types (all `string`-based; the board never validates them):

- **`LocationName`** — a `BOARD_LOCATIONS[n].name`.
- **`HeroId`** / **`FoeId`** — caller-assigned _instance_ ids for a placed hero/foe (distinct from a UDT
  roster _identity_ id; see the note in [UDT re-exports](#udt-re-exports)).
- **`SpaceMarker`** — a per-space overlay; an open set across expansions (`'wasteland'`, `'power-skull'`,
  …). The literal members are documentation; the type is `string`.
- **`FoeStatus`** — `'ready' | 'savage' | 'lethal'`. Re-exported from `ultimatedarktower`.

### `createDefaultBoardState()`

`(): BoardState` — an empty board: no heroes/foes/adversary/markers, with all 16 building spaces present at
`{ skulls: 0, destroyed: false }`. Optional keys are omitted so the state round-trips through JSON without
`undefined`-vs-absent mismatches.

```ts
import { createDefaultBoardState } from 'ultimatedarktowerboard';
const state = createDefaultBoardState();
```

## Commands

### `BoardCommand` / `BoardCommandType`

The command vocabulary the reducer understands — the _only_ way state mutates. A discriminated union on
`type`; the reducer applies each command faithfully and enforces no rules. `BoardCommandType` is
`BoardCommand['type']`.

| `type`            | Payload                             | Effect                                            |
| ----------------- | ----------------------------------- | ------------------------------------------------- |
| `placeHero`       | `{ heroId, location, owner? }`      | Place a hero (its instance id) at a location      |
| `moveHero`        | `{ heroId, location }`              | Move a placed hero (no-op if absent)              |
| `removeHero`      | `{ heroId }`                        | Remove a hero                                     |
| `spawnFoe`        | `{ foeId, foe, location, status? }` | Add a foe instance of type `foe`                  |
| `moveFoe`         | `{ foeId, location }`               | Move a placed foe (no-op if absent)               |
| `setFoeStatus`    | `{ foeId, status }`                 | Set a foe's `ready`/`savage`/`lethal` status      |
| `removeFoe`       | `{ foeId }`                         | Remove a foe                                      |
| `selectAdversary` | `{ id }`                            | Set the adversary identity (no location yet)      |
| `placeAdversary`  | `{ location }`                      | Set/move the adversary's location                 |
| `clearAdversary`  | `{}`                                | Remove the adversary                              |
| `addSkull`        | `{ location, n? }`                  | Add `n` skulls to a building (default `1`)        |
| `removeSkull`     | `{ location, n? }`                  | Remove `n` skulls (default `1`)                   |
| `setSkulls`       | `{ location, n }`                   | Set the absolute skull count                      |
| `destroyBuilding` | `{ location }`                      | Mark a building razed                             |
| `restoreBuilding` | `{ location }`                      | Un-raze a building                                |
| `setMonument`     | `{ location, monumentId }`          | Place a monument on a building (`null` clears it) |
| `setSpaceMarker`  | `{ location, marker, on }`          | Add (`on: true`) or remove a per-space overlay    |
| `setSelections`   | `{ selections }`                    | Shallow-merge game-setup selections               |
| `replaceState`    | `{ state }`                         | Wholesale-replace the state                       |
| `reset`           | `{}`                                | Back to `createDefaultBoardState()`               |

### `applyBoardCommand(state, command)`

`(state: BoardState, command: BoardCommand): BoardState` — the pure reducer. Returns the next state and
never mutates the input. Most apps drive it through [`BoardStateController`](#boardstatecontroller) rather
than calling it directly.

```ts
import { applyBoardCommand, createDefaultBoardState } from 'ultimatedarktowerboard';

const next = applyBoardCommand(createDefaultBoardState(), {
  type: 'placeHero',
  heroId: 'hero-1',
  location: 'Broken Lands',
});
```

## Controller

### `BoardStateController`

Holds the current `BoardState`, runs the pure reducer on each dispatch, and emits events. DOM-free, so it's
instantiable in tests with no environment. Use it as the single source of truth in a host app; for a
controller already wired to the renderers, use [`BoardRenderView`](#boardrenderview) instead.

```ts
import { BoardStateController } from 'ultimatedarktowerboard';

const controller = new BoardStateController();

// Subscribe to the firehose, or a single event type:
controller.on('change', ({ state }) => console.log(state));

// Mutate via a named method (or controller.dispatch({ type: 'placeHero', ... })):
controller.placeHero('hero-1', 'Broken Lands');
```

#### Constructor

`new BoardStateController(options?: BoardStateControllerOptions)`

| Parameter         | Type               | Default                     | Description             |
| ----------------- | ------------------ | --------------------------- | ----------------------- |
| `options.initial` | `BoardState`       | `createDefaultBoardState()` | Starting state.         |
| `options.mode`    | `'self' \| 'host'` | `'self'`                    | Ownership mode (below). |

**Mode semantics** — `self` (uncontrolled, default): `dispatch`/named methods/`reset` run the reducer,
replace the held state, then emit `change` plus the derived specific event(s). `host` (controlled): the
host owns the truth; `dispatch` computes the projected next state and emits it as a `change` _intent_
without mutating held state — only `applyState(next)` commits. `applyState` is the commit path in both modes.

#### Methods

- `getState(): BoardState` — the current held state.
- `dispatch(command: BoardCommand): BoardState` — apply a command; returns the resulting (or, in `host`
  mode, projected) state.
- `applyState(next: BoardState): void` — wholesale-set the held state (bypasses the reducer) and emit
  `change`. The commit path in both modes.
- `reset(): void` — dispatch `{ type: 'reset' }`.
- `subscribe(listener: BoardEventListener): () => void` — subscribe to the full event firehose; returns an
  unsubscribe.
- `on<T>(type: T, listener): () => void` — subscribe to a single event type; returns an unsubscribe.
- **Named command methods** (thin wrappers over `dispatch`): `placeHero(heroId, location, owner?)`,
  `moveHero(heroId, location)`, `removeHero(heroId)`, `spawnFoe(foeId, foe, location, status?)`,
  `moveFoe(foeId, location)`, `setFoeStatus(foeId, status)`, `removeFoe(foeId)`, `selectAdversary(id)`,
  `placeAdversary(location)`, `clearAdversary()`, `addSkull(location, n?)`, `removeSkull(location, n?)`,
  `setSkulls(location, n)`, `destroyBuilding(location)`, `restoreBuilding(location)`,
  `setMonument(location, monumentId)`, `setSpaceMarker(location, marker, on)`, `setSelections(selections)`.
- `moveToken(id, location): 'hero' | 'foe' | 'adversary' | null` — **resolver convenience** for callers
  that hold only an instance id. Resolves the kind from current state (order: heroes → foes → adversary;
  on a cross-kind id collision the earlier kind wins) and delegates to the matching command above,
  returning the kind moved or `null` if nothing matches (a no-op). The adversary matches only when one
  exists with a non-empty id; it is never created. Not a `BoardCommand` — reducer-only users dispatch
  `moveHero`/`moveFoe` directly.

### `BoardStateControllerOptions`

`{ initial?: BoardState; mode?: 'self' | 'host' }` — see the constructor table above.

## Events

### `BoardEvent` / `BoardEventType` / `BoardEventListener`

The event surface a controller emits. `change` is the firehose — it fires on every applied command (or
wholesale `applyState`) carrying the resulting state. The rest are conveniences derived from the command so
a consumer can subscribe narrowly. `BoardEventType` is `BoardEvent['type']`; `BoardEventListener` is
`(event: BoardEvent) => void`.

| `type`                                       | Shape                                                 | Fires when                                    |
| -------------------------------------------- | ----------------------------------------------------- | --------------------------------------------- |
| `change`                                     | `{ state, command }`                                  | Any command applied or `applyState` committed |
| `tokenAdded` / `tokenMoved` / `tokenRemoved` | `{ kind: 'hero'\|'foe'\|'adversary'; id; location? }` | A token is placed / moved / removed           |
| `buildingChanged`                            | `{ location; building: BuildingState }`               | Skulls / destroy / monument change            |
| `spaceMarkerChanged`                         | `{ location; markers: SpaceMarker[] }`                | A space marker toggles                        |
| `selectionChanged`                           | `{ selections }`                                      | `setSelections` applied                       |

```ts
// Events with a unique `type` narrow through `on(...)`:
controller.on('buildingChanged', (e) => console.log(e.location, e.building.skulls));

// `tokenAdded` / `tokenMoved` / `tokenRemoved` share one shape, so read them off the
// firehose (`on('tokenAdded', …)` can't narrow the shared union — `e` would be `never`):
controller.subscribe((e) => {
  if (e.type === 'tokenAdded') console.log(`${e.kind} ${e.id} @ ${e.location}`);
});
```

## Save / load

Versioned (de)serialization through a `{ version, state }` envelope validated with zod.

### `saveState(state)`

`(state: BoardState): string` — serialize to a JSON string `{ version: BOARD_STATE_SCHEMA_VERSION, state }`.

### `loadState(json)`

`(serialized: string): BoardState` — parse + validate the envelope back into a `BoardState`, running version
migrations on the way. **Throws [`BoardStateLoadError`](#boardstateloaderror)** on any malformed input (the
one place an exception is appropriate).

```ts
import { saveState, loadState, BoardStateLoadError } from 'ultimatedarktowerboard';

const json = saveState(controller.getState());
try {
  const restored = loadState(json);
  controller.applyState(restored);
} catch (err) {
  if (err instanceof BoardStateLoadError) console.error('bad save:', err.message, err.cause);
}
```

### `BOARD_STATE_SCHEMA_VERSION`

`1` (a `const`). The schema version written into the save envelope; bump it when the shape changes and add
a migration step.

### `BoardStateLoadError`

`extends Error` with an optional `cause`. Thrown by `loadState` on invalid JSON, a malformed envelope, a
failed schema validation, or an unsupported version.

## Renderers

All visual renderers implement [`BoardRenderer`](#boardrenderer). For a guided comparison see
[RENDERERS.md](RENDERERS.md).

### `BoardRenderer`

`{ render(state: BoardState, focus?: BoardFocus): void; dispose?(): void }` — the common renderer contract.

### `BoardReadout`

Deterministic text readout of a `BoardState` — the snapshot-test target. Sorting makes output stable
regardless of insertion order. Optional per-kingdom narrowing via `focus.kingdom` (`focus.angle` is inert
for text). Implements `BoardRenderer`.

```ts
import { BoardReadout, createDefaultBoardState } from 'ultimatedarktowerboard';

const readout = new BoardReadout();
readout.render(createDefaultBoardState());
console.log(readout.getText());
// Or one-shot, no instance: BoardReadout.toText(state, focus?)
```

- `render(state, focus?)` — recompute and cache the text.
- `getText(): string` — the last rendered text.
- `static toText(state, focus?): string` — pure one-shot.

### `BoardMap2D`

2D overhead map: inline SVG over the board image, tokens placed via UDT's normalized `BOARD_ANCHORS`, with
click-to-select. Display-/three-free and jsdom-testable. Implements `BoardRenderer`. Token art is **never
bundled** — it loads at runtime from `assetBaseUrl` by the `${group}/${kebab(id)}.png` convention, falling
back to a programmatic labeled disc when missing. For **foe/adversary** tokens with a known id, the 2D
map defaults to the official flat RTDT board-token icon (e.g. `foes/Foe-Token-L2-Brigands.png`) instead of
the 3D-style portrait the plain convention resolves to; unknown ids and the 3D view keep the plain
convention. **Hero** tokens in the standard roster (base + all expansions) default to their portrait under
`heros/` when one has shipped, else the disc. Override any of this per token with
[`tokenArt`](#per-token-art-tokenart).

**Mouse interaction** is on by default. Scroll the wheel to zoom toward the cursor, and double-click
(or call [`resetView()`](#methods)) to return to the focus view — dropping zoom **and** spin. What a
**left-drag** does is set by [`dragMode`](#boardmap2doptions): `'rotate'` (the default) **spins** the
whole board about its center — grab a point and it follows the cursor, like a lazy-susan — while `'pan'`
moves the zoomed-in view. Switch at runtime with [`setDragMode()`](#methods). The **middle mouse button**
always runs the _other_ action — a quick pan while in spin mode, or a press-and-hold spin while in pan
mode. Zoom/pan/spin stay inside the current focus region and never touch `BoardState`. Pass
`enableZoom: false` to drop wheel-zoom (e.g. when the map lives in a scroll container); drag-spin still
works in that case.

```ts
import { BoardMap2D } from 'ultimatedarktowerboard';

const map = new BoardMap2D(document.getElementById('map')!, {
  assetBaseUrl: './tokens/',
  boardImageUrl: './board.png',
  onTokenSelect: (sel) => console.log(sel), // { kind, id, location }
});
map.render(controller.getState());
```

#### Constructor

`new BoardMap2D(container: HTMLElement, options?: BoardMap2DOptions)`

### `BoardMap2DOptions`

| Parameter           | Type                                                       | Default    | Description                                                                                                         |
| ------------------- | ---------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| `assetBaseUrl`      | `string`                                                   | `''`       | Token-art root, e.g. `'./tokens/'`. Empty → all tokens use the fallback.                                            |
| `boardImageUrl`     | `string`                                                   | —          | Base-layer board image. Omit to draw tokens over a blank board.                                                     |
| `tokenArt`          | `TokenArtConfig`                                           | —          | Per-token art overrides. The 2D map uses each entry's `image2d`. See [Per-token art](#per-token-art-tokenart).      |
| `resolveTokenImage` | `(ref: TokenArtRef, view: '2d' \| '3d') => string \| null` | convention | Override the default art path; `null` → fallback. `view` is `'2d'` here.                                            |
| `onTokenSelect`     | `(sel: TokenSelection) => void`                            | —          | Fired on a token click. Selection is renderer-local — never written to `BoardState`.                                |
| `locationPick`      | `LocationPickStore`                                        | —          | Drives the armed space-pick (the editing add flow); see [Stores](#stores-ui-seams).                                 |
| `onLocationPick`    | `(location: LocationName) => void`                         | —          | Fired when a space is clicked while armed.                                                                          |
| `enableZoom`        | `boolean`                                                  | `true`     | Wheel-zoom toward the cursor + double-click-reset. `false` opts out (drag-spin still works).                        |
| `maxZoom`           | `number`                                                   | `8`        | Max zoom-in factor relative to the focus view.                                                                      |
| `dragMode`          | `'rotate' \| 'pan'`                                        | `'rotate'` | What a left-drag does: `'rotate'` spins the board about its center (grab & spin); `'pan'` moves the zoomed-in view. |

#### Methods

`render(state, focus?)` / `dispose()` (the `BoardRenderer` contract), plus:

- `resetView()` — returns the map to its focus view, dropping any manual zoom/pan **and spin** (also bound to double-click).
- `setDragMode('rotate' | 'pan')` — switches the left-drag behavior at runtime (spin vs pan).

### `TokenSelection` / `TokenArtRef` / `kebab()`

- **`TokenSelection`** — what a click/tap reports: `{ kind: 'hero' | 'foe' | 'adversary' | 'building' |
'marker'; id: string; location: LocationName }`. `id` is the hero/foe instance id, adversary id, or the
  host location (building/marker).
- **`TokenArtRef`** — what the art resolver is asked for: `{ kind; id }` where `kind` is `'hero' | 'foe' |
'adversary' | 'monument' | 'marker' | 'skull'` and `id` is the _art_ id (foe type, adversary id, monument
  id, marker name; `'skull'` for skulls).
- **`kebab(value)`** — `(string) => string`. The id slug used in art paths: `kebab("Utuk'Ku")` → `utuk-ku`.

### Per-token art (`tokenArt`)

`tokenArt` lets one token use **different art in the 2D map vs the 3D view** — and, in 3D, a flat image
or a GLB model. It is a declarative table keyed by token kind → **art id**, passed to **both** the 2D
renderer and the 3D plugin (the same object). Tokens with no entry render exactly as before.

```ts
type TokenArtConfig = Partial<Record<TokenArtRef['kind'], Record<string, TokenArt>>>;

interface TokenArt {
  image2d?: string; // image for the 2D map, and the 3D billboard when image3d is unset
  image3d?: string; // 3D billboard image when it should differ from image2d (defaults to image2d)
  model3d?: TokenModelRef; // GLB model rendered in place of the 3D sprite (preferred over image3d/image2d)
}

// A `.glb` URL with optional placement (also accepted by `resolveTokenModel`):
type TokenModelRef =
  | string
  | { url: string; scale?: number; rotation?: { x?; y?; z? }; dracoDecoderPath?: string | null };
```

```ts
const tokenArt: TokenArtConfig = {
  foe: {
    Dragons: { image2d: './tokens/foes/dragons.png', model3d: { url: './dragon.glb', scale: 0.8 } },
  },
  hero: { 'brutal-warlord': { image2d: './heroes/warlord.png' } }, // override the built-in roster portrait
};
new BoardMap2D(el, { tokenArt, assetBaseUrl: './tokens/' }); // 2D reads image2d
attachBoard3D(view, { tokenArt, assetBaseUrl: './tokens/' }); // 3D reads model3d, else image3d ?? image2d
```

- **Art id key** — for `foe` this is the foe **type** (e.g. `"Brigands"`), so all instances of a type share
  one entry; for `hero`/`adversary`/`monument`/`marker` it is the id/name; for `skull` it is `"skull"`. There
  is no `building` key (a building's overlay is configured under `monument`). Keys are kebab-insensitive
  (`"Brigands"` and `"brigands"` both match).
- **Precedence (image, per view)** — 2D: `image2d` → `resolveTokenImage(ref, '2d')` → convention → `null`.
  3D billboard: `image3d ?? image2d` → `resolveTokenImage(ref, '3d')` → convention → `null` (so a single
  `image2d` drives both views). The convention fallback is `${assetBaseUrl}${group}/${kebab(id)}.png`, with
  two built-in refinements: in the **2D** view a known **foe/adversary** id resolves to its official flat
  board-token icon under `foes/` (e.g. `foes/Foe-Token-L2-Brigands.png`) rather than the 3D-style portrait;
  and a **hero** id in the standard roster (base + all expansions) resolves to its portrait under `heros/`
  in both views (heroes without a shipped portrait yet, or non-roster instance ids, fall back to `null`).
- **Precedence (3D model)** — `tokenFactory` → `tokenArt.model3d` → `resolveTokenModel(ref)`; if a model
  results it renders in place of the sprite, otherwise the sprite uses the image precedence above.

## Focus & view controls

### `BoardFocus` / `BoardViewAngle` / `DEFAULT_FOCUS` / `focusEquals()`

The focus/view selector shared by all renderers.

```ts
type BoardViewAngle = 'overhead' | 'isometric';
type BoardFocus = { kingdom: BoardKingdom | 'all'; angle: BoardViewAngle };
const DEFAULT_FOCUS: BoardFocus = { kingdom: 'all', angle: 'overhead' };
```

- **`kingdom`** (`all` | `north` | `east` | `south` | `west`) — narrows the readout and zooms/dims the 2D
  map; maps to Display's `selectSide` in 3D.
- **`angle`** — a 3D-camera concept. **Inert** for the readout and 2D map; the 3D plugin maps it to a
  `CameraConfig` (overhead vs isometric).
- **`focusEquals(a, b): boolean`** — structural equality; the early-return / fan-out guard.

### `mountFocusControls(host, options)`

Renders the shared **All / N / E / S / W** kingdom selector + the **Overhead / Isometric** toggle into
`host`. Vanilla TS + DOM (three-free). `BoardRenderView` wires it for you.

```ts
import { mountFocusControls, DEFAULT_FOCUS } from 'ultimatedarktowerboard';

const controls = mountFocusControls(document.getElementById('controls')!, {
  focus: DEFAULT_FOCUS,
  onChange: (next) => view.setFocus(next),
});
controls.setFocus({ kingdom: 'north', angle: 'overhead' }); // reflect an external change
controls.unmount();
```

- **`FocusControlsOptions`** — `{ focus: BoardFocus; onChange: (next: BoardFocus) => void }`.
- **`FocusControlsHandle`** — `{ setFocus(focus): void; unmount(): void }`. Call `setFocus` to reflect a
  focus change made elsewhere into the already-mounted controls.

## View facade

### `BoardRenderView`

Ties a controller to the (three-free) renderers and the shared focus controls: it re-renders the readout +
2D map on every state change and fans focus changes out to all focus-aware renderers + the controls. The
recommended entry point for a 2D/readout app — reach the controller and renderers through its fields.

```ts
import { BoardRenderView } from 'ultimatedarktowerboard';

const view = new BoardRenderView({
  mapContainer: document.getElementById('map')!,
  controlsContainer: document.getElementById('controls')!,
  uiContainer: document.getElementById('ui')!, // optional editing UI
});

view.controller.placeHero('hero-1', 'Broken Lands');
console.log(view.readout.getText());
view.setFocus({ kingdom: 'north', angle: 'overhead' });
view.dispose();
```

#### Constructor

`new BoardRenderView(options?: BoardRenderViewOptions)`

#### Fields & methods

`controller`, `readout`, `map2d?` (built only with `mapContainer`), `selection` (`SelectionStore`),
`locationPick` (`LocationPickStore`), `focus` (getter), `setFocus(focus)`,
`setDragMode('rotate' | 'pan')` (forwarded to the 2D map), `dispose()`.

### `BoardRenderViewOptions`

| Parameter           | Type                                                              | Default                     | Description                                                                                                                             |
| ------------------- | ----------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `initialState`      | `BoardState`                                                      | `createDefaultBoardState()` | Seed state.                                                                                                                             |
| `mode`              | `'self' \| 'host'`                                                | `'self'`                    | Controller ownership mode.                                                                                                              |
| `mapContainer`      | `HTMLElement`                                                     | —                           | When set, a `BoardMap2D` is built and rendered here.                                                                                    |
| `controlsContainer` | `HTMLElement`                                                     | —                           | When set, focus controls are mounted here.                                                                                              |
| `uiContainer`       | `HTMLElement`                                                     | —                           | When set, the editing UI is mounted here.                                                                                               |
| `ui`                | `Omit<BoardUIOptions, 'controller'\|'selection'\|'locationPick'>` | —                           | Editing-UI config (panels/rosters/…); the view supplies the controller + stores.                                                        |
| `assetBaseUrl`      | `string`                                                          | —                           | Token-art root for the 2D map.                                                                                                          |
| `boardImageUrl`     | `string`                                                          | —                           | Base-layer board image for the 2D map.                                                                                                  |
| `tokenArt`          | `TokenArtConfig`                                                  | —                           | Per-token art for the 2D map (the `image2d` slot); pass the same object to the 3D plugin. See [Per-token art](#per-token-art-tokenart). |
| `resolveTokenImage` | `(ref: TokenArtRef, view: '2d' \| '3d') => string \| null`        | convention                  | Override the 2D-map art path; `null` → fallback.                                                                                        |
| `enableZoom`        | `boolean`                                                         | `true`                      | 2D-map wheel-zoom + double-click-reset (forwarded to `BoardMap2D`).                                                                     |
| `maxZoom`           | `number`                                                          | `8`                         | Max 2D-map zoom-in factor (forwarded to `BoardMap2D`).                                                                                  |
| `dragMode`          | `'rotate' \| 'pan'`                                               | `'rotate'`                  | 2D-map left-drag behavior: spin about center vs pan (forwarded to `BoardMap2D`).                                                        |
| `onTokenSelect`     | `(sel: TokenSelection) => void`                                   | —                           | Forwarded from the 2D map (also updates `selection`).                                                                                   |
| `onFocusChange`     | `(focus: BoardFocus) => void`                                     | —                           | Fired whenever the focus changes.                                                                                                       |

## Editing UI

The optional, framework-agnostic editing UI. A _dumb-container client_: it calls **only** the controller's
public command methods — strip it out and the host keeps every endpoint. Part of the `.` entry
(three-free / Display-free). See [RENDERERS.md](RENDERERS.md#dockable-editing-ui) for the panel tour.

### `mountBoardUI(host, options)`

Mounts the **palette** / **inspector** / **summary** panels into `host` (any element — pass Display's
`getOverlayContainer()` / `getPanelSlot()` to dock it into the 3D scene). Returns a handle.

```ts
import {
  BoardStateController,
  createSelectionStore,
  createLocationPickStore,
  mountBoardUI,
} from 'ultimatedarktowerboard';

const controller = new BoardStateController();
const ui = mountBoardUI(document.getElementById('ui')!, {
  controller,
  selection: createSelectionStore(), // active token → the inspector
  locationPick: createLocationPickStore(), // armed add-placement channel
});
ui.setPanelVisible('summary', false);
ui.dispose();
```

### `BoardUIOptions`

| Parameter      | Type                                                  | Default           | Description                                                            |
| -------------- | ----------------------------------------------------- | ----------------- | ---------------------------------------------------------------------- |
| `controller`   | `BoardStateController`                                | —                 | The controller the UI drives.                                          |
| `selection`    | `SelectionStore`                                      | —                 | Active-selection source the inspector reads (renderers/palette write). |
| `locationPick` | `LocationPickStore`                                   | —                 | Enables board-click placement; the location dropdown works without it. |
| `panels`       | `Partial<Record<PanelId, boolean \| PanelPlacement>>` | all visible       | Which panels render + each one's placement; `false` ⇒ start hidden.    |
| `rosters`      | `Partial<BoardUIRosters>`                             | UDT re-exports    | Palette roster lists.                                                  |
| `generateId`   | `(kind: 'foe', state: BoardState) => string`          | next-free `foe-N` | Mint an instance id for an added foe.                                  |
| `floating`     | `boolean`                                             | `true`            | Draggable floating panels.                                             |

### `BoardUIHandle` / `PanelId` / `PanelPlacement` / `BoardUIRosters` / `RosterEntry`

- **`BoardUIHandle`** — `{ setPanelVisible(id: PanelId, on: boolean): void; dispose(): void }`.
- **`PanelId`** — `'palette' | 'inspector' | 'summary'`.
- **`PanelPlacement`** — `{ corner?: 'tl' | 'tr' | 'bl' | 'br'; x?: number; y?: number }`. Initial position
  of a floating panel.
- **`BoardUIRosters`** — `{ foes: string[]; adversaries: string[]; allies: string[]; markers: string[];
heroes: ReadonlyArray<RosterEntry>; monuments: ReadonlyArray<RosterEntry> }`. Defaults from the UDT
  re-exports.
- **`RosterEntry`** — `{ id: string; name: string }`.

## Stores (UI seams)

Shared observables that decouple the renderers (which _produce_ selections + location picks) from the
editing UI (which _consumes_ them). Plain subscribe/notify, no dependencies. `BoardRenderView` creates and
shares these for you; create them by hand only when wiring `mountBoardUI` standalone.

### `createSelectionStore()` → `SelectionStore`

`SelectionStore` is `{ get(): TokenSelection | null; set(selection): void; subscribe(listener): () => void }`
— the single active-selection slot the inspector reads and the renderers/palette write.

### `createLocationPickStore()` → `LocationPickStore`

Coordinates the click-a-space-then-confirm add flow. `LocationPickStore` is `{ arm(request:
PendingPlacement): void; disarm(): void; isArmed(): boolean; getPending(): PendingPlacement | null;
pick(location): void; subscribe(listener): () => void }`.

### `PendingPlacement` / `LocationPickEvent`

- **`PendingPlacement`** — `{ kind: TokenSelection['kind']; label: string; targets: 'all' | 'buildings' }`.
  What the palette is waiting to place (`buildings` for skulls/monuments).
- **`LocationPickEvent`** — `{ type: 'armed'; pending } | { type: 'disarmed' } | { type: 'picked';
location }`.

## UDT re-exports

Static board data + rosters from `ultimatedarktower` (≥ 4.1.0), re-exported here (never vendored) so
consumers get them from this package too. Documented upstream — see the
[`ultimatedarktower` API docs](https://github.com/ChessMess/UltimateDarkTower/tree/main/docs/api).

| Re-export                                                                          | Kind           | Purpose                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BOARD_LOCATIONS`, `BOARD_LOCATION_BY_NAME`, `BOARD_GROUPINGS`                     | data           | The board's locations + lookups                                                                                                                                                                                                                                                                                                                                                    |
| `BOARD_ANCHORS`, `BOARD_IMAGE_INFO`                                                | data           | Normalized token-placement anchors + image metadata                                                                                                                                                                                                                                                                                                                                |
| `BOARD_ADJACENCY`, `neighborsOf`, `stepDistance`, `shortestPath`                   | data + helpers | Movement graph + pure BFS helpers (move-validation; the board enforces no rules)                                                                                                                                                                                                                                                                                                   |
| `TIER1_FOES` / `TIER2_FOES` / `TIER3_FOES`, `ADVERSARIES`, `ALLIES`                | rosters        | Setup roster lists                                                                                                                                                                                                                                                                                                                                                                 |
| `HEROES`, `HERO_BY_ID`, `MONUMENTS`, `MONUMENT_BY_ID`                              | rosters        | Hero / monument rosters + lookups                                                                                                                                                                                                                                                                                                                                                  |
| `FOE_STATUSES`, `FOES`, `ADVERSARY_ROSTER`, `ALL_FOES`, `FOE_BY_ID`, `FOE_BY_NAME` | rosters        | Foe status + identity metadata                                                                                                                                                                                                                                                                                                                                                     |
| `DIFFICULTIES`, `GAME_SOURCES`                                                     | enums          | Setup enums                                                                                                                                                                                                                                                                                                                                                                        |
| **types**                                                                          | —              | `BoardLocation`, `TerrainType`, `BuildingType`, `BoardKingdom`, `BoardGrouping`, `Anchor`, `AnchorSlot`, `LocationAnchors`, `BoardAnchorMap`, `BoardImageInfo`, `BoardAdjacency`, `Hero`, `Monument`, `MonumentId`, `Tier1Foe`/`Tier2Foe`/`Tier3Foe`, `Adversary`, `Ally`, `Foe`, `FoeStatus`, `FoeLevel`, `FoeName`, `ContentSource`, `Difficulty`, `GameSource`, `ExpansionType` |

> **Identity vs. instance ids.** UDT's `HeroId` / `FoeId` (roster _identity_ ids) are deliberately **not**
> re-exported — this package's own `HeroId` / `FoeId` (caller-assigned _instance_ ids) own those names. Use
> a `Hero`/`Foe`'s `id` field for the identity.

---

# `ultimatedarktowerboard/plugin` (the 3D board)

> Imports `three` + `ultimatedarktowerdisplay` (optional peers). The `.` entry never does — keep a single
> `three` instance (dedupe it in your bundler). See [DISPLAY_INTEGRATION.md](DISPLAY_INTEGRATION.md) for the
> full wiring recipe, orientation, and focus/camera notes.

### `attachBoard3D(view3D, options?)`

`(view3D: Tower3DView, options?: Board3DPluginOptions): Board3DHandle` — the primary entry. Attaches the 3D
board to a live Display `Tower3DView` (wrapping `attachScenePlugin`, mirroring Display's own
`attachSkullPhysics`) and returns a small handle. The plugin places the **same** tokens as the 2D map — as
image billboards on Display's ground disc — and emits the same `TokenSelection` on click.

```ts
import { TowerRenderView } from 'ultimatedarktowerdisplay';
import { attachBoard3D } from 'ultimatedarktowerboard/plugin';

const view = new TowerRenderView({ container, modelUrl }); // a tower GLB
const board =
  view.view3D &&
  attachBoard3D(view.view3D, {
    boardState, // initial BoardState (the plugin reads; the host owns mutations)
    assetBaseUrl: './tokens/', // token art, loaded at runtime (never bundled)
    boardImageUrl: './board.png', // render OUR board on the disc + hide Display's (omit to keep Display's)
    onTokenSelect: (sel) => {}, // { kind, id, location } — same shape as the 2D map
  });

// Push board-state updates from your controller:
controller.subscribe((e) => {
  if (e.type === 'change') board?.setBoardState(e.state);
});
```

### `Board3DPluginOptions`

| Parameter           | Type                                                       | Default    | Description                                                                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `boardState`        | `BoardState`                                               | —          | Initial state to render (the plugin reads; the host owns mutations).                                                                                                                                        |
| `assetBaseUrl`      | `string`                                                   | —          | Token-art root, loaded at runtime (never bundled).                                                                                                                                                          |
| `boardImageUrl`     | `string`                                                   | —          | When set, the plugin renders its **own** board on the disc and hides Display's; without it, Display's board stays.                                                                                          |
| `northKingdom`      | `0 \| 1 \| 2 \| 3`                                         | `0`        | Which kingdom faces +Z on the disc. Board-owned, not read from Display's lighting config.                                                                                                                   |
| `tokenArt`          | `TokenArtConfig`                                           | —          | Per-token art. The 3D path uses each entry's `model3d` (preferred), else its image as a billboard (`image3d ?? image2d`); pass the same object to the 2D map. See [Per-token art](#per-token-art-tokenart). |
| `resolveTokenImage` | `(ref: TokenArtRef, view: '2d' \| '3d') => string \| null` | convention | Override the default sprite-art path; `null` → fallback. `view` is `'3d'` here.                                                                                                                             |
| `resolveTokenModel` | `(ref: TokenArtRef) => TokenModelRef \| null \| undefined` | —          | Map a token to a GLB model rendered in place of its sprite. A per-token `tokenArt.model3d` is preferred over this; `tokenFactory` over both.                                                                |
| `onTokenSelect`     | `(sel: TokenSelection) => void`                            | —          | Fired on a token click. Renderer-local — never written to `BoardState`.                                                                                                                                     |
| `onFocusChange`     | `(focus: BoardFocus) => void`                              | —          | Fired when the camera side (the focus source of truth) changes.                                                                                                                                             |
| `debugCamera`       | `boolean`                                                  | `false`    | Logs the live camera's `{ elevationFactor, targetHeightFactor, distanceFactor }` on move — a preset-tuning aid; leave off in production.                                                                    |
| `locationPick`      | `LocationPickStore`                                        | —          | Enables the armed in-scene space-pick (the editing add flow), mirroring the 2D map.                                                                                                                         |
| `onLocationPick`    | `(location: LocationName) => void`                         | —          | Fired when a space is clicked while armed.                                                                                                                                                                  |
| `tokenFactory`      | `(ctx: TokenBuildContext) => THREE.Object3D \| null`       | sprite     | Seam for real 3D models; default builds a `THREE.Sprite` billboard. `null` skips the token.                                                                                                                 |

### `Board3DPlugin`

`class Board3DPlugin implements ScenePlugin` — construct directly (`new Board3DPlugin(view3D, options?)`)
only for advanced `attachScenePlugin` wiring; prefer `attachBoard3D`. Exposes `setBoardState(state)` /
`setFocus(focus)` plus the `ScenePlugin` lifecycle (`attach`, `onModelLoaded`, `dispose`).

### `Board3DHandle`

`{ setBoardState(state: BoardState): void; setFocus(focus: BoardFocus): void; dispose(): void }` — returned
by `attachBoard3D`; drives the live plugin.

### `TokenBuildContext`

Handed to a custom `tokenFactory` so it can build with the consumer's `three`: `{ selection:
TokenSelection; art: TokenArtRef | null; position: THREE.Vector3; size: number; disc: DiscMetrics; three:
typeof THREE }`. Build `Object3D`s with `ctx.three`, never a bundled copy.

`TokenSelection` and `TokenArtRef` are also re-exported from this subpath for convenience.

---

# `ultimatedarktowerboard/stage` (the all-in-one stage)

> Three-free in its **static** graph: the 3D tower (Display + `three`) is reached only via a dynamic
> `import()`, so a 2D-only app never loads `three`. The 3D chunk is fetched on first enable. Full guide:
> [STAGE.md](STAGE.md).

### `BoardStageView`

`class BoardStageView` — a plain, framework-agnostic component that composes the 2D map + readout
([`BoardRenderView`](#boardrenderview)), the focus bar ([`mountFocusControls`](#mountfocuscontrolshost-options)),
the editing UI ([`mountBoardUI`](#mountboarduihost-options)), and a lazily-loaded 3D tower, plus the render-stage
chrome (mode switch / swap / PiP / pop-out / Spin-Pan). Mounts into and fills `container`.

```ts
import { BoardStageView } from 'ultimatedarktowerboard/stage';

const stage = new BoardStageView({
  container: document.getElementById('board')!,
  assetBaseUrl: './tokens/',
  boardImageUrl: './board.png',
  modelUrl: './tower.glb', // omit for a 2D-only stage (no `three` is loaded)
});
stage.controller.spawnFoe('foe-1', 'Brigands', 'Dayside'); // mutate via the shared controller
await stage.setTowerEnabled(false); // turn the 3D tower off at runtime (drops to 2D)
```

**Getters:** `controller`, `view` (inner `BoardRenderView`), `readout`, `selection`, `locationPick`,
`focus`, `map2d`, `tower3D` (Display view or `null`), `editingUI`, `root`, `mode`.

**Methods:** `setDisplayMode(mode)`, `swap()`, `setDragMode('rotate' | 'pan')`, `setFocus(focus)`,
`setTowerEnabled(on): Promise<void>`, `popOut()` / `popIn()`, `resetLayout()`, `dispose()`.

### `BoardStageViewOptions`

| Parameter                                                                         | Type                            | Default                   | Description                                                                             |
| --------------------------------------------------------------------------------- | ------------------------------- | ------------------------- | --------------------------------------------------------------------------------------- |
| `container`                                                                       | `HTMLElement`                   | —                         | **Required.** The stage fills this element (you size it).                               |
| `initialState`                                                                    | `BoardState`                    | empty board               | Seeds the shared controller.                                                            |
| `assetBaseUrl` / `boardImageUrl` / `tokenArt`                                     | —                               | —                         | Token art + board image, shared by both renderers.                                      |
| `resolveTokenImage`                                                               | `(ref, view) => string \| null` | convention                | Override the token-art path.                                                            |
| `modelUrl`                                                                        | `string`                        | —                         | Tower GLB; required to enable the 3D tower.                                             |
| `tower3D`                                                                         | `'auto' \| boolean`             | `'auto'`                  | `'auto'` = on iff `modelUrl` set; `true` forces on; `false` 2D-only.                    |
| `towerToggle`                                                                     | `boolean`                       | `false`                   | Add a built-in Tower 3D on/off button (the mode pills already cover showing/hiding 3D). |
| `defaultMode`                                                                     | `DisplayMode`                   | `pip-3dbig` / `2d`        | Initial mode (a stored preference wins).                                                |
| `editingUI`                                                                       | `boolean \| BoardUIOptions`     | `true`                    | Mount the palette/inspector; `false` to skip; object to configure.                      |
| `enableZoom` / `maxZoom` / `dragMode`                                             | —                               | `true` / `8` / `'rotate'` | Forwarded to the 2D map.                                                                |
| `persist`                                                                         | `boolean \| { prefix }`         | `true`                    | Persist mode/drag/PiP inset (default prefix `udtb.stage`).                              |
| `injectStyles`                                                                    | `boolean`                       | `true`                    | Inject `BOARD_STAGE_CSS`.                                                               |
| `onTokenSelect` / `onFocusChange` / `onModeChange` / `onTowerToggle` / `onPopOut` | callbacks                       | —                         | —                                                                                       |

`DisplayMode = '2d' | '3d' | '2d3d' | 'pip-2dbig' | 'pip-3dbig'`.

### `BOARD_STAGE_CSS` / `injectStageStyles(doc?)`

The stage's CSS as a string, and an idempotent injector (called automatically unless `injectStyles: false`).
Scoped under `.bsv-root`; themeable via `--bsv-*` variables that fall back to the host's theme tokens.

---

## See also

- [GETTING_STARTED.md](GETTING_STARTED.md) — install + first render
- [ARCHITECTURE.md](ARCHITECTURE.md) — the unidirectional state → renderers mental model
- [STATE_MODEL.md](STATE_MODEL.md) — state, commands, events, save/load in depth
- [RENDERERS.md](RENDERERS.md) — readout / 2D map / 3D board + focus controls
- [DISPLAY_INTEGRATION.md](DISPLAY_INTEGRATION.md) — wiring the 3D board into Display
- [EXAMPLE.md](EXAMPLE.md) — the runnable demo app
- [../CHANGELOG.md](../CHANGELOG.md) — release history
