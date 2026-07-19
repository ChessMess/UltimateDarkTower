# packages/scenario-store (`@udtc/scenario-store`) — Creator persistence

The Creator subsystem's **only** persistence layer (IndexedDB). Product-level behavior is
documented in `docs/creator/save-load.md` (repo root).

## Design invariants

- **Persistence must never throw and break authoring.** `openDb()` resolves `null` on _any_
  failure and every call is guarded. Keep it that way.
- **Three IndexedDB object stores** in DB `udt-scenarios` (v1), split by write cost:
  `meta` (cheap list-row data, so the library list is O(list length), not O(bytes)),
  `docs` (document sans images, written every autosave), `images` (megabytes, written only
  when images actually changed). Split logic is in `split.ts`; raw IndexedDB in `scenarioDb.ts`.
- **`SNAPSHOT_VERSION = 1` (`src/scenarioDb.ts`): a version mismatch is _discarded_, not
  migrated.** There is no migration machinery anywhere in the repo — don't assume one exists.

## Creator→Player handoff caveat

The store is the Creator→Player handoff channel. **Same-origin in production** (`/creator/`,
`/player/` under one deploy) but **different origins in local dev** (`:5173` vs `:5174`), so
the two dev servers do **not** share the DB. Run `pnpm preview:site` to test handoff faithfully.
(The same caveat is repeated in `apps/player/src/game/handoff.ts`.)

## Build & test

`build` is a no-op; `typecheck` = `tsc --noEmit`; `test` = `vitest run` with
`fake-indexeddb/auto` (jsdom has no IndexedDB). Zero `workspace:*` deps — a pure leaf,
consumed by `apps/creator` and `apps/player`.
