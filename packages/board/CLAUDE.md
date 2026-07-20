# packages/board (`ultimatedarktowerboard`) — game-board renderer

2D board renderer + optional `Board3DPlugin`. Depth in `docs/` (`ARCHITECTURE.md`,
`STATE_MODEL.md`, `STAGE.md`, `DISPLAY_INTEGRATION.md`).

## Invariant: no game rules

The reducer (`applyBoardCommand`) does **no** validation or clamping except flooring skull
counts at 0; it **never throws**, even for unknown location/hero ids (may `console.warn` in
dev). Hosts own the rules. Don't add rule enforcement here.

- **Controlled vs uncontrolled**: `BoardStateController({ mode })` — `'self'` (default,
  controller owns truth) vs `'host'` (host owns truth; `dispatch` emits a `change` intent
  without mutating, and `applyState(next)` is the only commit path).
- `SelectionStore` / `LocationPickStore` are the only channel between renderers (produce
  clicks) and editing UI (consumes them) — neither imports the other.
- `Board3DPlugin` implements display's `ScenePlugin` interface (adapter pattern, one layer
  up from core's `IBluetoothAdapter`).

## Build

- Three Vite library entries, each ESM+CJS: `.` (headless, three-free), `./plugin`
  (`Board3DPlugin`, imports `three` + display), `./stage` (`BoardStageView`; the 3D tower
  is a dynamic `import()`, never bundled into `stage`). Matches the `exports` map.
- **CJS filenames are `.cjs`, deliberately NOT display's broken `.cjs.js`** (see the comment
  in `vite.config.ts`).
- Tests: jest, in `__tests__/` (note: not `tests/`). `plugin.contract.test.ts` asserts
  `Board3DPlugin` satisfies display's `ScenePlugin` at the type level;
  `plugin.integration.test.ts` runs a real `Tower3DView` against display-ported mocks.

## Stale-doc warnings (do not trust these verbatim)

- `docs/TROUBLESHOOTING.md` describes siblings as `file:` devDeps checked out next to the
  repo — **stale**: it's a pnpm monorepo, deps are `workspace:^`/`workspace:*`.

The three-free `.`/`./stage` invariant IS enforced now: `build` runs
`scripts/check-three-free.mjs` after the Vite/tsc build, walking the static import closure of
the `.`/`stage` ESM bundles and failing if either statically imports `three` (a dynamic
`import()`, as `./stage` uses, is allowed).

## Coupling

Depends on `ultimatedarktowerdata` (`workspace:^`) for board/hero/monument data (v6 moved
this out of core). **Does not depend on `ultimatedarktower` at all** — board is
Bluetooth-free by design. Peer-depends on `ultimatedarktowerdisplay` (only for `./plugin`)
and `three`/`gsap`; `three` must be a single instance (pinned to display's exact range).
Consumed by `apps/digital` and `packages/creator-adapters`.
