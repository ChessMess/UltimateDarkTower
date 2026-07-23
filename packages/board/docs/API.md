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
  // Selectors — read helpers over the unified `tokens` collection
  tokensAt,
  tokensOfType,
  heroesOf,
  foesOf,
  adversaryOf,
  buildingAt,
  skullsAt,
  monumentAt,
  markersAt,
  questsAt,
  // UDT data re-exports (subset — see "UDT re-exports" below for the full list)
  BOARD_LOCATIONS,
  BOARD_SPOTS,
  RESERVED_TOKEN_TYPES,
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
  PlacedToken,
  FoeStatus,
  ReservedTokenType,
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

> **0.5.0** collapsed the pre-0.5.0 six per-kind buckets (`heroes`/`foes`/`adversary`/`buildings`/
> `spaceMarkers`/`questMarkers`) into one `tokens` collection. This is a non-backward-compatible
> change — see [Save / load](#save--load)'s "Old data: refuse, don't migrate".

```ts
interface BoardState {
  tokens: Record<string, PlacedToken>; // every placed token, keyed by instance id
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

### `PlacedToken`

One placed thing — the whole of `BoardState` is a map of these, keyed by instance id (not by
location, so move/remove stay O(1)):

```ts
interface PlacedToken {
  id: string; // instance id, unique on the whole board
  typeId: string; // a ReservedTokenType, or a library.tokenTypes key
  location: LocationName;
  spotId?: string; // explicit target spot; otherwise resolved via the board's spot `accepts` lists
  art?: string; // art id (foe type, hero id, marker/monument/quest name); defaults to typeId
  n?: number; // count for stackable types (skulls); absent means 1
  data?: Record<string, unknown>; // per-type extras: status, owner, destroyed, …
}
```

`typeId` is either a **`ReservedTokenType`** — the built-in vocabulary every consumer understands
natively, re-exported as `RESERVED_TOKEN_TYPES` (`hero | foe | adversary | building | skull |
monument | marker | quest`) — or an author-defined `library.tokenTypes` key. Reserved kinds use
deterministic instance ids and `art` conventions (a hero's id IS its token id; a foe's token id is
the caller's instance id and `art` is the foe _type_; the adversary is a fixed singleton id with
`art` carrying its identity; skull/monument/marker/quest tokens are keyed off their location) — see
`BoardStateController`'s class doc (linked from [Controller](#controller)) for the full table.

Identity / value types (all `string`-based; the board never validates them):

- **`LocationName`** — a `BOARD_LOCATIONS[n].name`.
- **`FoeStatus`** — `'ready' | 'savage' | 'lethal'`. Re-exported from `ultimatedarktowerdata`.
- **`ReservedTokenType`** — the `RESERVED_TOKEN_TYPES` union, re-exported from
  `ultimatedarktowerdata` (see [UDT re-exports](#udt-re-exports)).

### `createDefaultBoardState(board?)`

`(board?: BoardDefinition): BoardState` — seeds a `building` + `skull` token pair
(`{destroyed: false}` / `{n: 0}`) for every building space on `board` (the built-in RtDT board's 16,
if omitted), mirroring the pre-0.5.0 `buildings` bucket's always-dense shape. Everything else starts
empty; optional keys are omitted so the state round-trips through JSON without `undefined`-vs-absent
mismatches.

```ts
import { createDefaultBoardState } from 'ultimatedarktowerboard';
const state = createDefaultBoardState();
```

## Selectors

Read helpers over `tokens` — the replacement for the pre-0.5.0 bucket properties
(`state.heroes`, `state.buildings`, …), which no longer exist.

| Selector       | Signature                                   | Returns                                        |
| -------------- | ------------------------------------------- | ---------------------------------------------- |
| `tokensAt`     | `(state, location) => PlacedToken[]`        | Every token at a location, in insertion order. |
| `tokensOfType` | `(state, typeId) => PlacedToken[]`          | Every token of a type, in insertion order.     |
| `heroesOf`     | `(state) => PlacedToken[]`                  | `tokensOfType(state, 'hero')`.                 |
| `foesOf`       | `(state) => PlacedToken[]`                  | `tokensOfType(state, 'foe')`.                  |
| `adversaryOf`  | `(state) => {id, location?} \| undefined`   | The selected/placed adversary.                 |
| `buildingAt`   | `(state, location) => {destroyed: boolean}` | `{destroyed: false}` if never placed.          |
| `skullsAt`     | `(state, location) => number`               | Skull count (`0` if none placed).              |
| `monumentAt`   | `(state, location) => string \| undefined`  | The monument id, if any.                       |
| `markersAt`    | `(state, location) => string[]`             | Space-marker names present.                    |
| `questsAt`     | `(state, location) => string[]`             | Quest-marker names present.                    |

```ts
import { heroesOf, buildingAt } from 'ultimatedarktowerboard';

heroesOf(state); // -> PlacedToken[]
buildingAt(state, 'Dayside'); // -> { destroyed: false }
```

## Commands

### `BoardCommand` / `BoardCommandType`

The command vocabulary the reducer understands — the _only_ way state mutates. A discriminated union on
`type`; the reducer applies each command faithfully and enforces no rules. `BoardCommandType` is
`BoardCommand['type']`.

Five generic, id-keyed ops replace the pre-0.5.0 per-kind command set now that `BoardState` is one
`tokens` collection:

| `type`          | Payload                                              | Effect                                                  |
| --------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| `placeToken`    | `{ id, typeId, location, spotId?, art?, n?, data? }` | Upsert a token at `id`                                  |
| `moveToken`     | `{ id, location }`                                   | Move a placed token (no-op if absent)                   |
| `removeToken`   | `{ id }`                                             | Remove a token                                          |
| `updateToken`   | `{ id, patch }`                                      | Shallow-merge `patch` (incl. `patch.data`) onto a token |
| `setSelections` | `{ selections }`                                     | Shallow-merge game-setup selections                     |
| `replaceState`  | `{ state }`                                          | Wholesale-replace the state                             |
| `reset`         | `{}`                                                 | Back to `createDefaultBoardState()`                     |

**The pre-0.5.0 per-kind commands (`placeHero`, `spawnFoe`, `setSpaceMarker`, `addSkull`, …) are
gone from this union** — but not from the public API. They survive as
[`BoardStateController`](#boardstatecontroller) convenience methods, reimplemented over the five
generic ops above with deterministic per-kind ids, so most callers need no change.

### `applyBoardCommand(state, command)`

`(state: BoardState, command: BoardCommand): BoardState` — the pure reducer. Returns the next state and
never mutates the input. Most apps drive it through [`BoardStateController`](#boardstatecontroller) rather
than calling it directly. A spot's `accepts` list is **advisory only** here — the reducer places a
token regardless of what a spot declares it accepts.

```ts
import { applyBoardCommand, createDefaultBoardState } from 'ultimatedarktowerboard';

const next = applyBoardCommand(createDefaultBoardState(), {
  type: 'placeToken',
  id: 'hero-1',
  typeId: 'hero',
  location: 'Broken Lands',
  art: 'hero-1',
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

// Mutate via a named method (or controller.dispatch({ type: 'placeToken', ... })):
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
- **Generic token ops** (also the `@udtc/adapters` `BoardCtrl` target for the engine's
  `board.mutate: placeToken/removeToken` directives): `placeToken(opts): string` — place any token
  (reserved kind or a `library.tokenTypes` id); mints an instance id (`${typeId}-N`) if
  `opts.id` is omitted, and returns whichever id was used. `removeToken(typeId, location): void`
  — removes **every** token of `typeId` at `location` (there's no instance id to target one; this
  mirrors the engine's own directive filter semantics).
- **Named command methods** (thin wrappers over the generic ops, with deterministic per-kind ids —
  see the class doc's id/`art` table): `placeHero(heroId, location, owner?)`,
  `moveHero(heroId, location)`, `removeHero(heroId)`, `spawnFoe(foeId, foe, location, status?)`,
  `moveFoe(foeId, location)`, `setFoeStatus(foeId, status)`, `removeFoe(foeId)`, `selectAdversary(id)`,
  `placeAdversary(location)`, `clearAdversary()`, `addSkull(location, n?)`, `removeSkull(location, n?)`,
  `setSkulls(location, n)`, `destroyBuilding(location)`, `restoreBuilding(location)`,
  `setMonument(location, monumentId)`, `setSpaceMarker(location, marker, on)`,
  `setQuestMarker(location, marker, on)`, `setSelections(selections)`.
- `moveToken(id, location): TokenKind | null` — **resolver convenience** for callers that hold only
  an instance id. Resolves the kind from current state (checks: is `id` a hero token? a foe token?
  does an adversary exist whose identity equals `id`? — in that order) and delegates to the matching
  method above, returning the kind moved or `null` if nothing matches (a no-op — nothing is
  dispatched, no event fires). The adversary check never creates one. `tokens` is one flat,
  globally-id-keyed map, so a hero and a foe (or any two kinds) can no longer occupy the same id —
  the earlier check wins on a collision. Not a `BoardCommand` — reducer-only users dispatch
  `moveHero`/`moveFoe`/`placeAdversary` directly.

### `BoardStateControllerOptions`

`{ initial?: BoardState; mode?: 'self' | 'host' }` — see the constructor table above.

## Events

### `BoardEvent` / `BoardEventType` / `BoardEventListener`

The event surface a controller emits. `change` is the firehose — it fires on every applied command (or
wholesale `applyState`) carrying the resulting state. The rest are conveniences derived from the command so
a consumer can subscribe narrowly. `BoardEventType` is `BoardEvent['type']`; `BoardEventListener` is
`(event: BoardEvent) => void`.

| `type`                                                        | Shape                                | Fires when                                    |
| ------------------------------------------------------------- | ------------------------------------ | --------------------------------------------- |
| `change`                                                      | `{ state, command }`                 | Any command applied or `applyState` committed |
| `tokenAdded` / `tokenMoved` / `tokenRemoved` / `tokenChanged` | `{ kind: TokenKind; id; location? }` | A token is placed / moved / removed / updated |
| `selectionChanged`                                            | `{ selections }`                     | `setSelections` applied                       |

`TokenKind` is `string` — an open type, not the pre-0.5.0 closed `'hero'|'foe'|'adversary'`
union, because these events now fire uniformly for every token kind (buildings and markers
included), not just the three that used to be tracked as named buckets. The pre-0.5.0
`buildingChanged` / `spaceMarkerChanged` events are **gone** — a building/marker change now
reports through `tokenChanged`/`tokenAdded`/`tokenRemoved` like everything else. The adversary
singleton reports its identity (`art`) as `id` in these events, not its internal `'adversary'`
token key.

```ts
// tokenAdded / tokenMoved / tokenRemoved / tokenChanged share one shape, so read them off the
// firehose (`on('tokenAdded', …)` can't narrow the shared union — `e` would be `never`):
controller.subscribe((e) => {
  if (e.type === 'tokenAdded') console.log(`${e.kind} ${e.id} @ ${e.location}`);
});

// Events with a unique `type` narrow through `on(...)`:
controller.on('selectionChanged', (e) => console.log(e.selections));
```

## Save / load

Versioned (de)serialization through a `{ version, state }` envelope validated with zod. **No
migration path**: an envelope whose version doesn't match `BOARD_STATE_SCHEMA_VERSION` is
refused, not upgraded — see [`loadState`](#loadstatejson) below.

### `saveState(state)`

`(state: BoardState): string` — serialize to a JSON string `{ version: BOARD_STATE_SCHEMA_VERSION, state }`.

### `loadState(json)`

`(serialized: string): BoardState` — parse + validate the envelope back into a `BoardState`.
**Throws [`BoardStateLoadError`](#boardstateloaderror)** on malformed input, OR on a version other
than [`BOARD_STATE_SCHEMA_VERSION`](#board_state_schema_version) — **there is no migration path**.
A host that needs to recover an old save (offer a download before discarding it, say) does that at
its own deserialization boundary, using `err.foundVersion` to say which version it found; see
[STATE_MODEL.md](STATE_MODEL.md#old-data-refuse-dont-migrate) for the pattern and the
`loadState`-vs-a-host's-own-`loadState` name collision this implies.

```ts
import { saveState, loadState, BoardStateLoadError } from 'ultimatedarktowerboard';

const json = saveState(controller.getState());
try {
  const restored = loadState(json);
  controller.applyState(restored);
} catch (err) {
  if (err instanceof BoardStateLoadError) {
    console.error('bad save:', err.message, 'found version:', err.foundVersion);
  }
}
```

### `BOARD_STATE_SCHEMA_VERSION`

`2` (a `const`). The schema version written into the save envelope. Bumped from `1` in **0.5.0**
for the `tokens`-collection `BoardState` — a non-backward-compatible change; `loadState` refuses
any other version rather than migrate.

### `BoardStateLoadError`

`extends Error` with an optional `cause` and an optional `foundVersion: number` (set when a
version mismatch is what caused the rejection — lets a host's stale-data dialog say which version
it found). Thrown by `loadState` on invalid JSON, a malformed envelope, a failed schema
validation, or an unsupported version.

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

2D overhead map: inline SVG over the board image, tokens placed via `packages/game-data`'s normalized
`BOARD_SPOTS` (each location's marked spots, resolved by the token's `typeId`/`spotId` — see
[STATE_MODEL.md](STATE_MODEL.md)), with click-to-select. Display-/three-free and jsdom-testable.
Implements `BoardRenderer`. Token art is **never bundled** — it loads at runtime from
`assetBaseUrl` by the `${group}/${kebab(id)}.png` convention, falling back to a programmatic
labeled disc when missing. For **foe/adversary** tokens with a known id, the 2D map defaults to the
official flat RTDT board-token icon (e.g. `foes/Foe-Token-L2-Brigands.png`) instead of the 3D-style
portrait the plain convention resolves to; unknown ids and the 3D view keep the plain convention.
**Hero** tokens in the standard roster (base + all expansions) default to their portrait under
`heros/` when one has shipped, else the disc. **Any other kind — including an author-defined custom
token type** — falls through to `${base}markers/${kebab(art)}.png`, so a new type gets art by
convention with zero code. Override any of this per token with [`tokenArt`](#per-token-art-tokenart).

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

- **`TokenSelection`** — what a click/tap reports: `{ kind: string; id: string; location: LocationName }`.
  `kind` is a `typeId` — a reserved built-in id or a `library.tokenTypes` key (open, not a closed
  enum). `id` is the hero/foe instance id, adversary identity, or the host location
  (building/skull/monument/marker/quest).
- **`TokenArtRef`** — what the art resolver is asked for: `{ kind: string; id: string }`, matching
  `TokenSelection`'s open `kind`. `id` is the _art_ id (foe type, hero id, adversary/monument
  identity, marker/quest name).
- **`kebab(value)`** — `(string) => string`. The id slug used in art paths: `kebab("Utuk'Ku")` → `utuk-ku`.

### Per-token art (`tokenArt`)

`tokenArt` lets one token use **different art in the 2D map vs the 3D view** — and, in 3D, a flat image
or a GLB model. It is a declarative table keyed by token kind → **art id**, passed to **both** the 2D
renderer and the 3D plugin (the same object). Tokens with no entry render exactly as before.

```ts
type TokenArtConfig = Record<string, Record<string, TokenArt>>; // kind -> art id -> art

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

| Parameter      | Type                                                  | Default           | Description                                                                                                                                                                       |
| -------------- | ----------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `controller`   | `BoardStateController`                                | —                 | The controller the UI drives.                                                                                                                                                     |
| `selection`    | `SelectionStore`                                      | —                 | Active-selection source the inspector reads (renderers/palette write).                                                                                                            |
| `locationPick` | `LocationPickStore`                                   | —                 | Enables board-click placement; the location dropdown works without it.                                                                                                            |
| `panels`       | `Partial<Record<PanelId, boolean \| PanelPlacement>>` | all visible       | Which panels render + each one's placement; `false` ⇒ start hidden.                                                                                                               |
| `rosters`      | `Partial<BoardUIRosters>`                             | UDT re-exports    | Palette roster lists.                                                                                                                                                             |
| `generateId`   | `(kind: 'foe', state: BoardState) => string`          | next-free `foe-N` | Mint an instance id for an added foe.                                                                                                                                             |
| `floating`     | `boolean`                                             | `true`            | Draggable floating panels.                                                                                                                                                        |
| `board`        | `BoardDefinition`                                     | built-in RtDT     | The board whose locations the panels offer.                                                                                                                                       |
| `tokenTypes`   | `ReadonlyArray<RosterEntry>`                          | `[]`              | Author-defined `library.tokenTypes` entries offered in the palette alongside the reserved kinds. Selecting one places a plain instance via `placeToken` — no per-kind detail row. |

### `BoardUIHandle` / `PanelId` / `PanelPlacement` / `BoardUIRosters` / `RosterEntry`

- **`BoardUIHandle`** — `{ setPanelVisible(id: PanelId, on: boolean): void; dispose(): void }`.
- **`PanelId`** — `'palette' | 'inspector' | 'summary'`.
- **`PanelPlacement`** — `{ corner?: 'tl' | 'tr' | 'bl' | 'br'; x?: number; y?: number }`. Initial position
  of a floating panel.
- **`BoardUIRosters`** — `{ foes: string[]; adversaries: string[]; allies: string[]; markers: string[];
heroes: ReadonlyArray<RosterEntry>; monuments: ReadonlyArray<RosterEntry>; quests: ReadonlyArray<RosterEntry> }`.
  Defaults from the UDT re-exports (`quests` defaults to the four game pieces — a local roster,
  not a UDT one).
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

Static board data + rosters from `ultimatedarktowerdata` (≥ 1.0.0; a zero-dependency, Bluetooth-free
package split out of `ultimatedarktower` in v6.0.0), re-exported here (never vendored) so
consumers get them from this package too. Documented upstream — see
[`ultimatedarktowerdata`'s docs](https://github.com/ChessMess/UltimateDarkTower/tree/main/packages/game-data/docs).

| Re-export                                                                          | Kind           | Purpose                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BOARD_LOCATIONS`, `BOARD_LOCATION_BY_NAME`, `BOARD_GROUPINGS`                     | data           | The board's locations + lookups                                                                                                                                                                                                                                                                                                                                                      |
| `BOARD_SPOTS`, `RESERVED_TOKEN_TYPES`, `BOARD_IMAGE_INFO`                          | data           | Normalized token-placement spots + built-in reserved type ids + image metadata                                                                                                                                                                                                                                                                                                       |
| `BOARD_ADJACENCY`, `neighborsOf`, `stepDistance`, `shortestPath`                   | data + helpers | Movement graph + pure BFS helpers (move-validation; the board enforces no rules)                                                                                                                                                                                                                                                                                                     |
| `TIER1_FOES` / `TIER2_FOES` / `TIER3_FOES`, `ADVERSARIES`, `ALLIES`                | rosters        | Setup roster lists                                                                                                                                                                                                                                                                                                                                                                   |
| `HEROES`, `HERO_BY_ID`, `MONUMENTS`, `MONUMENT_BY_ID`                              | rosters        | Hero / monument rosters + lookups                                                                                                                                                                                                                                                                                                                                                    |
| `FOE_STATUSES`, `FOES`, `ADVERSARY_ROSTER`, `ALL_FOES`, `FOE_BY_ID`, `FOE_BY_NAME` | rosters        | Foe status + identity metadata                                                                                                                                                                                                                                                                                                                                                       |
| `DIFFICULTIES`, `GAME_SOURCES`                                                     | enums          | Setup enums                                                                                                                                                                                                                                                                                                                                                                          |
| **types**                                                                          | —              | `BoardLocation`, `TerrainType`, `BuildingType`, `BoardKingdom`, `BoardGrouping`, `SpotPoint`, `BoardSpot`, `BoardSpotMap`, `ReservedTokenType`, `BoardImageInfo`, `BoardAdjacency`, `Hero`, `Monument`, `MonumentId`, `Tier1Foe`/`Tier2Foe`/`Tier3Foe`, `Adversary`, `Ally`, `Foe`, `FoeStatus`, `FoeLevel`, `FoeName`, `ContentSource`, `Difficulty`, `GameSource`, `ExpansionType` |

> **Identity vs. instance ids.** UDT's `HeroId` / `FoeId` (roster _identity_ ids) are deliberately **not**
> re-exported. A placed hero/foe's _instance_ id is just `PlacedToken.id: string` (this package no
> longer has dedicated `HeroId`/`FoeId` types of its own — 0.5.0 moved to one flat `tokens`
> collection). Use a `Hero`/`Foe`'s `id` field for the identity.

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
