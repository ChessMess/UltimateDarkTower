# Monorepo Configuration

A single reference for how this pnpm monorepo is wired together: workspace layout, dependency
management, TypeScript/lint/test setup, build tooling, CI/CD, and the gotchas that go with each.
Written for whoever touches tooling/config next — human or AI agent — without having to
reverse-engineer it from 24 `package.json` files.

For narrative/task-oriented docs see [README.md](README.md) (what each package/app is),
[CONTRIBUTING.md](CONTRIBUTING.md) (how to submit a change), and
[docs/local-development.md](docs/local-development.md) (per-app dev commands). This doc is the
configuration reference those point back to.

## Workspace layout

`pnpm-workspace.yaml` globs `packages/*` and `apps/*`. `packages/` is libraries (7 published to
npm, 6 private `@udtc/*` Creator libraries); `apps/` is runnable leaf apps (all private except
`apps/mcp-server`, which publishes since `npx` is how an MCP server is consumed). Publishing is a
per-package `private` flag, not a property of the directory — see [Releasing](#releasing).

**There is no monorepo task-runner** (no Turborepo, Nx, or Lerna) — task ordering across packages
comes purely from pnpm's own recursive commands (`pnpm -r <script>`) respecting `workspace:^`
dependency order, plus explicit `--filter "pkg..."` graphs where a workflow needs one. There is no
build cache beyond each package's own `dist/` and `.tsbuildinfo`.

## Package manager & Node

- **pnpm 11.9.0**, pinned via root `package.json`'s `packageManager` field.
- **Node ≥ 22.13** everywhere (`engines.node` on all 23 workspace packages + root) — pnpm 11 loads
  the `node:sqlite` built-in, which doesn't exist before 22.13; `pnpm install` fails outright on
  Node 20. `.nvmrc` pins `22` and CI reads it via `node-version-file: .nvmrc` (not a hardcoded
  literal) in every workflow except the `relay-native` job, which deliberately matrixes
  `node: [22, 24]`.
- **Published packages declare the same `>=22.13.0` floor** — there is no lower "runtime" claim
  for npm consumers. This was itself a correction: 15 workspaces previously claimed `>=18.0.0`
  while never actually being tested below Node 22, so the stack-alignment pass raised the
  declared floor to match reality rather than leave an unverified claim in place.
- `nodeLinker: hoisted` in `pnpm-workspace.yaml` — a single flat `node_modules`, not pnpm's default
  strict symlink structure.

## Dependency management (pnpm catalog)

Any dependency declared in 3+ workspaces is hoisted into `pnpm-workspace.yaml`'s `catalog:` block
and referenced as `"pkg": "catalog:"`, so the version lives in one place instead of drifting across
package.json files. Currently: `typescript`, `vitest` + `@vitest/coverage-v8`, `vite`, `jsdom`,
`@vitejs/plugin-react`, `@types/node`, `three` + `@types/three`, `gsap`,
`@dimforge/rapier3d-compat`, `react`/`react-dom` + their `@types`, `ws` + `@types/ws`,
`ajv`/`ajv-formats`, `zustand`, `fake-indexeddb`.

- **`three` is the load-bearing entry.** `.npmrc`'s `public-hoist-pattern[]=*three*` force-hoists it
  so `display`/`board`/`creator` share exactly one copy — multiple copies break `instanceof`
  checks. A drifting `three` range across packages is exactly what would defeat that hoist, so
  cataloguing it makes the invariant structural instead of a convention someone has to remember.
- **`typescript` is pinned to `^5.9.3`, not 6.0** — TS 6.0 drops the automatic
  `node_modules/@types` inclusion the packages rely on (vitest globals, `web-bluetooth`, `three`,
  `node` ambient types all come in this way).
- **`peerDependencies` are deliberately NOT catalogued.** A peer range should be _wider_ than the
  version a package builds against (`board`/`display` declare `three: ">=0.185.0"`, narrower than
  `catalog:`'s caret range would allow) — cataloguing would defeat the point of a peer range.
- `.npmrc` also sets `strict-peer-dependencies=false`: UDT packages peer-range each other, and the
  workspace may carry a newer minor than an older peer names — kept non-fatal.
- `overrides` in `pnpm-workspace.yaml` collapse stale transitive `tar`/`tmp` copies (pulled in by
  the electron packaging toolchain) onto already-patched versions, clearing several Dependabot
  alerts on deps nothing in the workspace requires directly.
- **`allowBuilds`** allow-lists which deps may run native `postinstall` scripts (pnpm 11 blocks this
  by default): `esbuild`, `electron`, the `@stoprocent/*` BLE natives, `@serialport/bindings-cpp`,
  `usb`, macOS packaging helpers, and `unrs-resolver` (ESLint's import resolver). Audit with
  `pnpm approve-builds`.

## TypeScript configuration

Every real (non solution-style) `tsconfig.json` in the repo extends one of three root configs,
with one exception (below). None are extended blindly — each leaf keeps only its own path options
(`outDir`/`rootDir`/`composite`/`include`/`exclude`/`references`) plus any options genuinely
specific to that package.

| Root config                 | target / module / moduleResolution        | Who extends it                                                                                                                                                                           | Why it's separate                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsconfig.base.json`        | `ES2022` / `ESNext` / `bundler`           | Vite-bundled apps (`controller`, `game`, `seed`, `relay-electron`, and the `creator`/`digital`/`player`/`sync` app+node pairs) and all six private `@udtc/*` + `scenario-store` packages | The default — browser/Vite-consumed TS, strict + `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch`.                                                                                                                                                                                                                                                        |
| `tsconfig.browser-lib.json` | `ES2020` / `ESNext` / `bundler`, DOM libs | `packages/board`, `packages/display`                                                                                                                                                     | Ships ES2020+DOM for these two renderer libs specifically; **does not extend base** — `display` has pre-existing code that fails base's `noUnusedLocals`/`noUnusedParameters`.                                                                                                                                                                                              |
| `tsconfig.node-lib.json`    | `ES2022` / `Node16` / `Node16`            | `packages/core`, `packages/game-data`, `packages/relay-{shared,core,client}`, `apps/relay-cli`, `apps/mcp-server`                                                                        | These are `require()`-consumed CJS (or, for `mcp-server`, Node16-conditioned ESM under its own `"type": "module"`). Base's `module: "ESNext"` + `moduleResolution: "bundler"` would make `tsc` emit ESM/bundler-only syntax that breaks a `require()` consumer outright (verified directly: Node's loader throws `ERR_MODULE_NOT_FOUND` resolving emitted ESM as CommonJS). |

Two packages override `lib` on top of `tsconfig.node-lib.json` to add `DOM`: `core` (genuinely
dual-platform — `WebBluetoothAdapter`, the optional browser debug logger, `IndexedDBSink` all use
real DOM globals) and `relay-client` (isomorphic — the injectable `WebSocket` type needs it).
Neither is a copy/paste mistake; both say so inline.

Two `@udtc/*`-adjacent packages extend base but aren't source-only like their siblings:
`creator-engine` ships a real `dist/` (the traditional way — see [Build tooling](#build-tooling)),
and `creator-schema` ships its `main` straight from `src/`. Extending `tsconfig.base.json` is about
compiler options, not about whether a package has a real build step — the two are independent.

**Standalone exception:** `packages/board/example/tsconfig.json` (the package's demo site) hand-
duplicates its own compiler options rather than extending `tsconfig.browser-lib.json` like the
package's own `tsconfig.json` does. Not yet unified — low-stakes since it's a demo, not shipped code.

The four apps using the solution-style `tsconfig.json` (references) → `tsconfig.app.json` +
`tsconfig.node.json` split (`creator`, `digital`, `player`, `sync`) all have compilerOptions-free
top-level files — just `{ "files": [], "references": [...] }` — with the real config in the two
leaves, both of which extend `tsconfig.base.json`.

**`packages/core`'s own `tsconfig.json`** is the one file with an unusual comment worth knowing
about up front: `outDir` is set with no `rootDir`, so `tsc` infers `rootDir` from the common root
of `src` + `tests` — which is what puts the build at `dist/src/` (where `main`/`types`/`exports`
and several consumers' Vite configs all point). **Do not exclude `tests` from that config** — it
would collapse the output to `dist/` and silently break every one of those references.

## Linting & formatting

- **One root ESLint 9 flat config** (`eslint.config.js`) covers the entire workspace — global
  ignores, a base TS block, a React-surfaces override (scoped to `apps/creator`, `apps/player`,
  `apps/digital`, and `packages/*/example/**`), a test-files override (vitest globals), and a
  demo/reference-apps override that relaxes `@typescript-eslint/no-explicit-any`.
- **Never add a per-package `eslint`/`@typescript-eslint`/`eslint-plugin-*` devDependency.** A
  nested v8 config shadows the root v9 flat config and crashes lint. This happened once
  (`apps/digital`) under a mistaken belief that local copies were needed to "satisfy the React
  plugins" — they were exact-range duplicates of what the root already declares and imports.
- Every package **may** carry its own `"lint": "eslint ."` script (all 23 now do) so
  `pnpm --filter <pkg> lint` scopes to just that directory — this calls the same root config via
  ESLint's upward config discovery, it does not need its own config file.
- **One root `.prettierrc` + `.prettierignore`** — no per-package Prettier config or devDep exists
  or should exist. `format`/`format:check` run from the root over the whole tree.
- **`.editorconfig`** mirrors Prettier's `indent_size`/`max_line_length` (2 / 100) so an editor's
  default formatting doesn't fight Prettier before it ever runs.

## Testing

**Vitest is the standard test runner** across the workspace, with two deliberate exceptions:
`packages/creator-engine` (`node test/run-all.js`, which spawns each of ~13 suites as a separate
child process because they call `process.exit()`) and `packages/creator-schema`
(`node test/conformance_test.js`, a hand-rolled Ajv conformance check). Neither was ever on Jest —
both predate the workspace's Jest→vitest migration and were out of scope for it.

- Test environment splits `jsdom` (browser-facing: `board`, `display`, `controller`, `creator`,
  `digital`, `player`) vs `node` (`core`, `game-data`, `relay-{shared,core,client}`, `sync`) — no
  `happy-dom` anywhere.
- `globals: true` is set only where suites genuinely use bare `describe`/`it`/`expect` with no
  `vitest` import (`core`, `game-data`, `relay-core`, `relay-client`, `board`, `display`) —
  everywhere else, tests import explicitly from `'vitest'` and the flag is absent.
- A `test` script with **zero test files** (`vitest run --passWithNoTests`) is a deliberate
  placeholder in a handful of packages (`relay-shared`, `creator-card-render`, `creator-theme`,
  and several apps) — it exists so `pnpm -r test` actually picks up a first real test file later,
  instead of relying on someone remembering to add the script then.
- `test:coverage` (`@vitest/coverage-v8`) is wired up only for `core`, `board`, `display`,
  `game-data` — selective by choice; no CI gate enforces a coverage threshold anywhere.

## Build tooling

| Pattern                                   | Packages/apps                                                                 | Notes                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vite app build                            | `controller`, `game`, `seed`, `sync`                                          | Plain `vite build`.                                                                                                                                                                                                                                                                                                                      |
| `tsc --build && vite build`               | `creator`, `digital`, `player`                                                | Typecheck via project references, then bundle.                                                                                                                                                                                                                                                                                           |
| `vite build && tsc --emitDeclarationOnly` | `board`, `display`                                                            | Vite produces the real dual CJS+ESM output; `tsc` only emits `.d.ts`. `board`'s build additionally runs `scripts/check-three-free.mjs` afterward, enforcing that its `.`/`./stage` entries never statically import `three` (dynamic `import()` is fine) — a real check for the three force-hoist invariant above, not just a convention. |
| Plain `tsc --build`                       | `game-data`, `relay-{shared,core,client}`, `apps/relay-cli`, `creator-engine` | CJS library builds via project references.                                                                                                                                                                                                                                                                                               |
| `tsc` + hand-rolled `esbuild`             | `core`                                                                        | The only package combining a `tsc` CJS build with a separate `esbuild --bundle` ESM bundle (`dist/esm/index.mjs`).                                                                                                                                                                                                                       |
| No-op / source-only                       | `creator-adapters`, `creator-card-render`, `creator-theme`, `scenario-store`  | `exports` point straight at `.ts` source; `build` is a placeholder `echo`.                                                                                                                                                                                                                                                               |
| Electron Forge                            | `relay-electron`                                                              | `build` is **`tsc --noEmit`** — typecheck-only, on purpose, so `pnpm -r build` doesn't package a full Electron app with native BLE deps on every CI run. Real packaging is the separate `package`/`make` scripts, exercised only by the `relay-native` CI job.                                                                           |

`packages/creator-engine`'s `dist/` is gitignored and built the traditional way (`"main":
"dist/index.js"`, no source-fallback `exports`), unlike its `@udtc/*` siblings — which is why the
root `postinstall` runs `pnpm --filter @udtc/engine build` before anything else: a fresh clone has
no `dist/` for it, and three direct consumers need it to resolve at all.

## CI/CD

Three workflows, all triggered on `push` to `main` (plus PRs for `ci.yml`):

- **`ci.yml`** — `checks` job runs the full `pnpm run ci` pipeline (see below) on Node 22.
  `relay-native` job (matrix: `ubuntu`/`macos` × Node `22`/`24`) builds the relay packages + CLI
  and smoke-tests `electron-forge package` on the Node 22 leg only — it does **not** re-run
  lint/test, relying on `checks` for that.
- **`deploy-pages.yml`** — builds every package + the GitHub Pages demo bundle, then deploys. Its
  landing page is generated by `node scripts/pages/build-landing.mjs` (the same script the root
  `pages:landing` convenience script runs locally for a preview via `preview:site`).
- **`release.yml`** — Changesets flow (see [Releasing](#releasing)).

**No local pre-commit enforcement exists** — no Husky, no `lint-staged`, no other git hook (checked
directly: `.git/hooks/` has only the default `*.sample` files, and no `husky`/`lint-staged` devDep
exists anywhere in the tree). `pnpm run ci` in the `checks` job is the **only** gate; a commit or
even a push to a non-`main` branch has nothing stopping it locally. Don't assume a pre-commit hook
will catch a lint/format violation before CI does.

**Known gap:** `deploy-pages.yml` and `release.yml` are **not gated** on `ci.yml`'s `checks` job —
they trigger independently off the same `push` event with no `needs:`/`workflow_run` coupling. A
red `main` does not currently block a Pages deploy or an npm publish attempt. This is a known,
accepted tradeoff, not an oversight to silently "fix" — changing it is a release-architecture
decision, not a config alignment.

`pnpm run ci` (the pipeline every gate ultimately calls) is:

```
validate:nodes → lint → format:check → build → typecheck → test
```

**Build runs before typecheck on purpose** — cross-package typechecks resolve workspace imports
against each dependency's _built_ `dist/`, so the dependency graph has to exist first.
`validate:nodes` (`scripts/creator/validate-node-catalog.mjs`) cross-checks the Creator node
catalog across `apps/creator`, `packages/creator-schema`, and `packages/creator-engine` for drift.

## Releasing

[Changesets](.changeset/) drives independent versioning. `pnpm changeset` records a change;
pushing to `main` opens/updates a "Version Packages" PR; merging it bumps versions and publishes
via `release.yml`.

- **Publishing is driven purely by each package's `private` flag** — `.changeset/config.json` has
  an empty `ignore` list, so any package with `private: false` opts into the release flow
  automatically. Currently 8 packages publish: the 7 under `packages/*` in the README's table, plus
  `apps/mcp-server`.
- `updateInternalDependencies: "patch"` in `.changeset/config.json` means a changeset bumping, say,
  `game-data` also patch-bumps every `workspace:^` consumer of it (e.g. `core`) even if nothing in
  the consumer itself changed — expected Changesets behavior, not a bug if you see an
  unrelated-looking package show up in a Version Packages PR.
- `access: "public"` in `.changeset/config.json` is a no-op for today's unscoped package names, but
  becomes load-bearing the moment any scoped `@udtc/*`/`@dark-tower-sync/*` package flips
  `private: false` — scoped packages default to `restricted` without it.
- `changeset:publish` is `pnpm -r build && changeset publish` — the recursive build already builds
  every workspace package in dependency order, so **no package should carry its own
  `prepack`/`prepublishOnly` hook**. Six packages used to; the redundant hooks raced each other and
  broke a real release (2026-07-17). `NPM_CONFIG_IGNORE_SCRIPTS=true` in `release.yml` stays as
  defense-in-depth against this class of bug recurring.

## Gotchas

- **A failed publish reports the wrong error.** Changesets' own error classifier crashes
  (`TypeError: Cannot read properties of undefined (reading 'includes')`) before it can surface
  npm's actual rejection reason. See the root `.claude/CLAUDE.md` "Releasing (Changesets)" section
  for the full triage playbook (packaging vs. token-liveness vs. provenance vs. the npm token's
  package allow-list — the most common real cause).
- **Adding a newly-published package?** Add it to the `NPM_TOKEN` secret's package allow-list on
  npmjs.com **before** merging its first Version Packages PR — the token is a fixed allow-list that
  does not learn about new package names, and the failure mode is the masked-error gotcha above.
- **Dependabot's `minimumReleaseAge` gate**: `pnpm install --frozen-lockfile` in CI rejects package
  versions published within roughly the last 24h. A Dependabot PR that's red on a just-published
  version is not broken — it ages out on its own, or re-run after `@dependabot rebase`.
- **`dependabot.yml` ignores `typescript`** (the deliberate 5.9.x pin) and
  `version-update:semver-major` generally (major bumps are taken by hand). A major-only _security_
  fix therefore won't auto-PR — it still shows in the Security tab for manual handling. Full
  playbook: the `dependabot-triage` skill.
- **pnpm 11 blocks native `postinstall` scripts by default.** If a new native dependency's install
  silently no-ops, it's probably missing from `allowBuilds` in `pnpm-workspace.yaml` — audit with
  `pnpm approve-builds`.
- **`blockExoticSubdeps: false`** is set because `electron-forge`'s `@electron/rebuild` depends on
  a git-hosted `@electron/node-gyp` fork, which pnpm 11 blocks by default otherwise.
- **Bumping `typescript` to 6.0, or `vite` to a new major?** Don't — TS 6.0 drops automatic
  `@types` inclusion (breaks ambient types workspace-wide); a `vite` major has previously broken
  `display`'s CJS `dist` `require()` path. Re-check the `dependabot-triage` skill's
  `references/repo-gotchas.md` before taking either bump.
- **`packages/core`'s `tsconfig.json` build note** — see [TypeScript configuration](#typescript-configuration)
  above; excluding `tests` there silently breaks the package's own output path.
- **`git blame` on an unexpectedly huge range of lines?** Check `.git-blame-ignore-revs` (enable
  locally with `git config blame.ignoreRevsFile .git-blame-ignore-revs`; GitHub applies it
  automatically) — it hides bulk mechanical Prettier-reformat commits from blame so they don't
  bury the real last-touched-by history.
