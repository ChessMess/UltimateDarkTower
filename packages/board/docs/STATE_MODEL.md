# State Model

The board is a **dumb container**: it stores what it is told, emits events, and enforces **no** game
rules (no skull caps, no "4th skull destroys," no legal-move checks). Hosts own the rules.

## `BoardState`

Plain, JSON-serializable data — no class instances, `Map`/`Set`, or functions.

```ts
interface BoardState {
  heroes: Record<HeroId, { location; owner?; meta? }>;
  foes: Record<FoeId, { foe; location; status; meta? }>;     // status: 'ready' | 'savage' | 'lethal'
  adversary?: { id; location? };
  buildings: Record<LocationName, { skulls; destroyed; monument? }>;  // the 16 building spaces
  spaceMarkers: Record<LocationName, SpaceMarker[]>;          // open set; key present only while non-empty
  selections?: { difficulty?; adversary?; allies?; foes?; expansions? };
  meta?: Record<string, unknown>;
}
```

`createDefaultBoardState()` seeds the 16 building spaces (from `BOARD_LOCATIONS`) at
`{ skulls: 0, destroyed: false }`; everything else is empty and optional keys are omitted. Foe `status`
is tracked but **not rendered** (lethality is not shown on tokens).

## Commands

A discriminated union (`BoardCommand`) — the only mutations:

- Heroes — `placeHero` · `moveHero` · `removeHero`
- Foes — `spawnFoe` · `moveFoe` · `setFoeStatus` · `removeFoe`
- Adversary — `selectAdversary` · `placeAdversary` · `clearAdversary`
- Buildings — `addSkull` · `removeSkull` · `setSkulls` · `destroyBuilding` · `restoreBuilding` · `setMonument`
- Spaces — `setSpaceMarker`
- Setup — `setSelections`
- Wholesale — `replaceState` · `reset`

## Reducer

`applyBoardCommand(state, command): BoardState` — pure, immutable (never mutates the input), no side
effects, **no validation or clamping**. The only arithmetic guard is flooring skull counts at 0
(`addSkull` can take a building from 3 → 4; `setSkulls` writes exactly what it's given). Commands that
reference an unknown location/id still apply faithfully; in dev the reducer may `console.warn`, but it
never throws or blocks.

## Controller

`BoardStateController(options?)` with `options.initial` and `options.mode`:

- **`self`** (default, uncontrolled): `dispatch` / named methods / `reset` run the reducer, replace the
  held state, and emit `change` + the derived specific event.
- **`host`** (controlled): the host owns the truth. `dispatch` computes the projected next state and emits
  it as a `change` *intent* without mutating held state; `applyState(next)` is the sole commit path (in
  both modes).

Subscribe with `subscribe(listener)` (full firehose) or `on(type, listener)` (one event type). Both return
an unsubscribe function. Ergonomic named methods (`placeHero`, `addSkull`, …) wrap `dispatch`.

### Events (`BoardEvent`)

`change` (fires on every applied command / `applyState`) plus the conveniences `tokenAdded` /
`tokenMoved` / `tokenRemoved` (kind `hero | foe | adversary`), `buildingChanged`, `spaceMarkerChanged`,
and `selectionChanged`.

## Save / load

```ts
saveState(state): string         // JSON envelope: { version: BOARD_STATE_SCHEMA_VERSION, state }
loadState(json): BoardState      // validates (zod v4) + migrates; throws BoardStateLoadError on bad input
```

The schema version lives in the **envelope**, not in `BoardState`. `loadState` runs a `migrate(version,
state)` hook (no-op at v1) and validates with a zod schema; round-trip identity holds
(`loadState(saveState(s))` deep-equals `s`).
