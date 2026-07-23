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

## `public/assets/board.jpg` — the designer backdrop, not shipped art

The Board Designer canvas draws the RtDT board under a cloned preset's spots. That backdrop is
a **downscaled 1400²/~480 KB JPEG**, not the real board image (4096²/22 MB, which the Player
serves for play from its own `public/assets/board.png`). Spots are normalized `[0,1]` and the
SVG stretches the image to `imageInfo.width/height`, so a smaller backdrop annotates identically.
Regenerate with:

```bash
sips -Z 1400 -s format jpeg -s formatOptions 60 \
  apps/player/public/assets/board.png --out apps/creator/public/assets/board.jpg
```

A cloned board carries `imageRef: BUILTIN_BOARD_IMAGE_REF` (`'builtin:rtdt-board'`, from
`@udtc/adapters`) — a reserved value that is deliberately NOT a `library.resources.images` key.
Each consumer maps it to its own copy of the art (`resolveBoardArt` in `src/boards/shared.ts`
here, `resolveBoardImageUrl` in the Player). Anything counting art bytes must key off **stored**
art (`hasStoredArt`), never `imageRef` alone.

## Schema-version guard on load (refuse, don't migrate)

`store.loadScenario` (the one function every load path funnels through — file import, IndexedDB
open, sample-scenario load, and autosave-draft restore all call it) checks
`isSupportedSchemaVersion(doc.schemaVersion)` (`src/utils/schemaVersion.ts`,
`CURRENT_SCHEMA_VERSION`) **before** loading anything. A stale document sets `staleScenario`
instead of loading, and `App.tsx` shows `StaleScenarioDialog` (OK / Download a copy) rather than
half-loading a document whose shape this build can't read (schema 0.5.0's `spots` replacing
`anchors` is the first schema change this guard exists to catch). There is no migration path —
see `docs/creator/board-designer.md`'s "0.5.0 is not backward compatible" note.

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
