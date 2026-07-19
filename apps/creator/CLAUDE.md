# apps/creator (`@udtc/creator`) — the authoring app (private)

The Creator **authoring** app (visual node-graph editor, board designer, dungeon builder,
3D simulator). Product docs: `docs/creator/` (repo root:
`node-catalog.md`, `board-designer.md`, `save-load.md`).

## Canonical node catalog

**`src/types/index.ts` exports `NODE_KINDS` (the array literal) and `NodeKind`** — this is
the canonical node-catalog source that `scripts/creator/validate-node-catalog.mjs` parses
(run by root `pnpm validate:nodes`, part of `pnpm run ci`). That script cross-checks kind-set
equality against `packages/creator-schema`'s schema enum and `packages/creator-engine`'s
`EngineNode`, and checks `docs/creator/node-catalog.md` for drift. Edit `NODE_KINDS` and you
likely need to update the schema, the engine, and the catalog doc in lockstep.

The editor reads its vocabulary via `@udtc/adapters`' `getUDTReferenceLayer` (not direct
`ultimatedarktower*` imports) so "what the editor offers is exactly what validates."

## Vite boot gotcha (`os.platform is not a function`)

`vite.config.ts` must both **alias `ultimatedarktower` to its CJS entry** AND list
`@udtc/engine`/`@udtc/schema`/`@udtc/adapters`/`ultimatedarktower` in `optimizeDeps.include`.
Without the pre-bundle, Vite's ESM pipeline hoists UDT's guarded `require('@stoprocent/noble')`
into an eager import → noble runs `os.platform()` at module init → the app crashes at boot on
a cold `.vite` cache. (Same pattern as `apps/digital`; see the repo memory
`vite-apps-must-prebundle-udt`.)

## Build & test

`predev`/`pretest` rebuild `@udtc/engine` first (build-order). App-local `ci` =
`lint && typecheck && test && build` (narrower than root `pnpm ci`). `test` =
`vitest run --passWithNoTests` (jsdom). Same six `@udtc/*` deps as `apps/player` — the
author/play split is purely in `src/`, not the dependency graph.
