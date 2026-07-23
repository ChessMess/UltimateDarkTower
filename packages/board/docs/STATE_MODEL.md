# State Model

The board is a **dumb container**: it stores what it is told, emits events, and enforces **no** game
rules (no skull caps, no "4th skull destroys," no legal-move checks). Hosts own the rules.

> **0.5.0** collapsed the six per-kind buckets (`heroes`/`foes`/`adversary`/`buildings`/
> `spaceMarkers`/`questMarkers`) into one `tokens` collection, and the five reserved anchor
> slots into an open list of **spots** (`packages/game-data`'s `BOARD_SPOTS`). This is a
> non-backward-compatible change — see "Old data: refuse, don't migrate" below.

## `BoardState`

Plain, JSON-serializable data — no class instances, `Map`/`Set`, or functions.

```ts
interface PlacedToken {
  id: string; // instance id, unique on the whole board
  typeId: string; // a ReservedTokenType, or a library.tokenTypes key
  location: string;
  spotId?: string; // explicit target spot; otherwise resolved via the board's spot `accepts` lists
  art?: string; // art id (foe type, hero id, marker/monument/quest name); defaults to typeId
  n?: number; // count for stackable types (skulls); absent means 1
  data?: Record<string, unknown>; // per-type extras: status, owner, destroyed, …
}

interface BoardState {
  tokens: Record<string, PlacedToken>; // every placed token, keyed by instance id
  selections?: { difficulty?; adversary?; allies?; foes?; expansions? };
  meta?: Record<string, unknown>;
}
```

`typeId` is either a **`ReservedTokenType`** — the built-in vocabulary every consumer understands
natively (`hero | foe | adversary | building | skull | monument | marker | quest`, exported as
`RESERVED_TOKEN_TYPES`) — or an author-defined `library.tokenTypes` key. A flat map keyed by
instance id means move/remove stay O(1), but it also means **a hero and a foe (or any two token
kinds) can no longer share an id** — placing overwrites. Deterministic id conventions per reserved
kind (used by the controller's named methods, see below):

| Kind      | Token id                          | `art`                     |
| --------- | --------------------------------- | ------------------------- |
| hero      | the hero id itself                | the hero id               |
| foe       | the caller's instance id          | the foe _type_            |
| adversary | the fixed singleton `'adversary'` | the adversary's identity  |
| building  | the location name                 | —                         |
| skull     | `skull:{location}`                | — (`n` carries the count) |
| monument  | `monument:{location}`             | the monument's identity   |
| marker    | `marker:{location}:{name}`        | the marker name           |
| quest     | `quest:{location}:{name}`         | the quest name            |

`createDefaultBoardState(board?)` seeds a `building` + `skull` token pair (`{destroyed: false}` /
`{n: 0}`) for every building space on `board` (the built-in RtDT board's 16, if omitted) —
mirroring the pre-0.5.0 `buildings` bucket's always-dense shape. Everything else starts empty.
Foe `status` (in `data.status`) is tracked but **not rendered** (lethality is not shown on tokens).

## Selectors

Read helpers over `tokens` — the replacement for the old bucket properties. Import from the
package root.

| Selector                                                   | Returns                                  |
| ---------------------------------------------------------- | ---------------------------------------- |
| `tokensAt(state, location)`                                | Every token at a location.               |
| `tokensOfType(state, typeId)`                              | Every token of a type.                   |
| `heroesOf(state)` / `foesOf(state)`                        | `tokensOfType(state, 'hero' \| 'foe')`.  |
| `adversaryOf(state)`                                       | `{id, location?}` or `undefined`.        |
| `buildingAt(state, location)`                              | `{destroyed}` (`false` if never placed). |
| `skullsAt(state, location)`                                | Skull count (`0` if none).               |
| `monumentAt(state, location)`                              | Monument id, or `undefined`.             |
| `markersAt(state, location)` / `questsAt(state, location)` | Marker/quest names present.              |

## Commands

A discriminated union (`BoardCommand`) — the reducer's only mutation vocabulary. Five generic,
id-keyed ops:

- `placeToken` (`id, typeId, location, spotId?, art?, n?, data?`) — upsert
- `moveToken` (`id, location`)
- `removeToken` (`id`)
- `updateToken` (`id, patch`) — shallow-merges `patch` (including `patch.data`) onto the token
- `setSelections` (`selections`) — shallow-merge

Plus wholesale `replaceState` (`state`) and `reset`.

**The pre-0.5.0 per-kind commands (`placeHero`, `spawnFoe`, `setSpaceMarker`, …) are gone from
this union** — but not from the public API. They survive as `BoardStateController` convenience
methods, reimplemented over the five generic ops with the id conventions above, so callers (and
`@udtc/adapters`'s `BoardCtrl`) need no change. The controller additionally exposes the generic
ops directly as `placeToken(opts)` (mints an instance id if none is given) and
`removeToken(typeId, location)` (removes **every** matching token — there is no instance id to
target one, mirroring the engine's own directive filter semantics).

## Reducer

`applyBoardCommand(state, command): BoardState` — pure, immutable (never mutates the input), no
side effects, **no validation or clamping**. The only arithmetic guard is flooring skull counts at 0. Commands that reference an unknown location/id still apply faithfully; in dev the reducer may
`console.warn`, but it never throws or blocks. A spot's `accepts` list (see
`packages/game-data`'s `BOARD_SPOTS`) is **advisory only** here too — the reducer places a token
regardless of what a spot declares it accepts; only the Creator (author-time warning) and L2
validation (unresolvable type id → error) enforce anything about it.

## Controller

`BoardStateController(options?)` with `options.initial` and `options.mode`:

- **`self`** (default, uncontrolled): `dispatch` / named methods / `reset` run the reducer, replace
  the held state, and emit `change` + the derived specific event.
- **`host`** (controlled): the host owns the truth. `dispatch` computes the projected next state and emits
  it as a `change` _intent_ without mutating held state; `applyState(next)` is the sole commit path (in
  both modes).

Subscribe with `subscribe(listener)` (full firehose) or `on(type, listener)` (one event type). Both return
an unsubscribe function. Ergonomic named methods (`placeHero`, `addSkull`, …) wrap `dispatch`.

### Events (`BoardEvent`)

`change` (fires on every applied command / `applyState`) plus the conveniences `tokenAdded` /
`tokenMoved` / `tokenRemoved` / `tokenChanged` (all carrying `{kind, id, location?}` — `kind` is
now an open `TokenKind = string`, not a closed `hero|foe|adversary` union), and
`selectionChanged`. The pre-0.5.0 `buildingChanged` / `spaceMarkerChanged` events are gone —
buildings and markers are just tokens now, so they report through the same `token*` events as
everything else. The adversary singleton reports its identity (`art`) as `id` in these events, not
its internal `'adversary'` token key.

## Save / load

```ts
saveState(state): string    // JSON envelope: { version: BOARD_STATE_SCHEMA_VERSION, state }
loadState(json): BoardState // validates (zod v4); throws BoardStateLoadError on bad OR unsupported-version input
```

The schema version lives in the **envelope**, not in `BoardState`. `BOARD_STATE_SCHEMA_VERSION`
is `2` (bumped from `1` for the `tokens`-collection shape).

### Old data: refuse, don't migrate

**`loadState` has no migration path.** A v1 envelope (or any version other than
`BOARD_STATE_SCHEMA_VERSION`) throws `BoardStateLoadError` with `foundVersion` set to whatever was
found, rather than upgrading it — `loadState(json: string)` doesn't know what a host wants to do
with an unreadable save (offer a download, discard, …), so it just refuses cleanly and lets the
caller decide. Each app's own deserialization boundary (`apps/digital`'s `gameStore.loadSession`,
`apps/player`'s `checkForResumableSession`) is where the "detect → dialog → offer a download →
clear" interaction actually lives — see those apps' code for the pattern. Note the name collision:
`BoardStateController`'s own `applyState`/`load` calls take a bare, already-parsed `BoardState` —
version-checking only ever happens at `loadState`'s JSON-envelope boundary, so a host committing
bare state (as both apps above do) must run its own check before calling in.
