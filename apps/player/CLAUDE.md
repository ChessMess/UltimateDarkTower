# apps/player (`@udtc/player`) — the play/consume app (private)

The Creator **playing** app — runs a scenario against the engine and drives real hardware
via the relay. No graph editor (no `@xyflow/react`/`@dagrejs/dagre`). Product docs:
`docs/creator/` (repo root).

## What it does

- `src/game/index.ts` drives the reducer loop — imports `init`/`step`/`deserialize`/
  `ENGINE_VERSION` from `@udtc/engine` directly.
- `src/relay/index.ts` re-exports `RelayClient` from `@udtc/adapters` for hardware/relay.
- Author-vs-play split is clean: Player owns engine execution + relay + a **read** path into
  the shared `scenario-store` DB; it has no editing capability.

## Creator→Player handoff caveat

`src/game/handoff.ts` reads the scenario from `@udtc/scenario-store`. That store is
**same-origin in production** but **different origins in local dev** (`:5173` creator vs
`:5174` player), so the DB isn't shared in dev — run `pnpm preview:site` to test the handoff
faithfully. (Mirror of the note in `packages/scenario-store/CLAUDE.md`.)

`src/game/index.ts` has a manual mount/unmount race guard (`view.dispose()` when a newer
mount superseded this one) — preserve it if you touch that code.

## Saved-session version guard (refuse, don't migrate)

`SavedSession.version` (`src/game/persistence.ts`) is bumped whenever the shape of what's
snapshotted to IndexedDB changes in a way this build can't read back (currently `2`, for
`ultimatedarktowerboard`'s 0.5.0 `tokens`-collection `BoardState`). `checkForResumableSession`
(`src/game/index.ts`) treats a version mismatch — **or a stamp-less record** — as stale: it sets
`staleSave` on the store instead of silently discarding it, and `LoadPanel` offers Download a
copy / Discard / Cancel. There is no migration path. Bump the literal (and update the doc comment
on `SavedSession.version`) the next time the snapshotted shape changes again.

## Build & test

Same shape as `apps/creator`: `predev`/`pretest` rebuild `@udtc/engine`; `test` =
`vitest run --passWithNoTests`. Same six `@udtc/*` deps as `apps/creator`.
