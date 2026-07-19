# packages/creator-adapters (`@udtc/adapters`) — Creator ↔ UDT hub

The integration seam binding the Creator subsystem to the base `ultimatedarktower*`
ecosystem. The **only** `@udtc/*` package with workspace deps reaching outside the Creator
scope (core, game-data, display, board) plus `@udtc/engine` + `@udtc/schema`.

## What lives here

- **The L2 and L3 validation tiers** (L1 is in `@udtc/schema`): `validate-refs.ts` (L2 —
  id/reference resolution against the pinned UDT roster) and `validate-graph.ts` (L3 — graph
  reachability, annotation-node exemptions, dungeon structural rules).
- `resolver.ts` (id→entity lookups injected into `engine.init()`), `udt.ts` (reference-data
  layer, sourced from `ultimatedarktowerdata` post-v6), `display.ts`, and `relay-client.ts`
  (Player↔Relay WS client, modes `'stub'`/`'ws'`).
- `board.ts` lazily `import()`s `ultimatedarktowerboard` because board needs
  `ultimatedarktower >= 5.0.0` at module init.

## Gotcha: two different `PROTOCOL_VERSION` constants

`relay-client.ts`'s `PROTOCOL_VERSION` is the **source protocol version (`'0.1'`)** — do not
confuse it with `ultimatedarktowerrelay-shared`'s `PROTOCOL_VERSION` (the wire version). Same
name, adjacent packages, different meaning.

## Build & test

`build` is a no-op; `typecheck` = `tsc -b` (project reference to `../creator-engine`).
`test` = `vitest run`; `pretest` rebuilds `@udtc/engine` first (see its build-order note).
