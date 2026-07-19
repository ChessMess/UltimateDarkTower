# packages/creator-engine (`@udtc/engine`) — Creator rules engine

The headless reducer for Creator scenarios. Part of the private `@udtc/*` Creator subsystem.

## Why the root `postinstall` builds this first

The repo-root `postinstall` runs `pnpm --filter @udtc/engine build` before anything else.
Reason: **this is the only Creator package still built the traditional way** —
`"main": "dist/index.js"`, no source-fallback `exports`. Every other `@udtc/*` package uses
`"exports": { ".": "./src/index.ts" }` with a no-op build. So consumers (`creator-adapters`,
`apps/creator`, `apps/player`) — and the engine's own tests — can't resolve `@udtc/engine`
until `tsc -b` has run once, and a fresh clone has no `dist/` (it's gitignored). The three
direct consumers also carry `pretest`/`predev` hooks that rebuild it as a backstop.

## Tests are NOT vitest

`test` = `node test/run-all.js`, which spawns each of ~13 suites as a **separate child
process** (`spawnSync`) because each suite calls `process.exit()`. It stops at the first
failure. `build`/`typecheck`/`pretest` are all `tsc -b`.

## Don't "fix" these

- `src/engine/types.ts` is the type-checked source of truth for the public surface and
  **deliberately does not import `@udtc/schema`'s `Scenario` type** — doing so would surface
  a wall of unrelated strictness errors. Leave it decoupled.
- `src/engine.ts` (not `engine/`) is the reducer entry point, relying on Node resolving the
  file ahead of the directory — not obviously refactor-safe.
- Many comments cite external design docs (`RE-Contract §…`, `official-app-analysis v0.3`,
  `deferred-followups.md`) that are **not checked into this repo** — you can't open them.
