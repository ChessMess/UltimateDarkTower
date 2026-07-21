# TypeScript 6.0 / Vite-major upgrade playbook

Both `CLAUDE.md` and `CONFIGURATION.md` carry a standing warning against two
specific major-version bumps. This file is the actual playbook for either one,
if it's ever attempted.

## Why these two are different from normal Dependabot triage

Neither upgrade can ever arrive as an automatic Dependabot PR:
`.github/dependabot.yml` has a dedicated `typescript` ignore entry, and ignores
`version-update:semver-major` globally (which also blocks a Vite major). So
"triaging" either of these never means reacting to an incoming PR — it means:
if the upgrade is ever attempted (a deliberate initiative, or forced because a
major-only security fix surfaces as a Security-tab-only alert with no PR),
do it as its own hand-authored branch/PR. **Never bundle the two together, and
never ride either along with an unrelated dependency bump** — each is its own
changeset and its own PR.

## TypeScript 6.0 playbook

TS 6.0 drops the automatic inclusion of every `node_modules/@types` package
that TypeScript's `types`-less default has always provided. This repo leans on
that default everywhere: none of the three shared root configs
(`tsconfig.base.json`, `tsconfig.browser-lib.json`, `tsconfig.node-lib.json`)
sets a `types`/`typeRoots` array, so ambient types (`@types/node`,
`@types/web-bluetooth`, `@types/three`, `@types/react`/`react-dom`,
`@types/ws`, `@types/express`, `@types/electron-squirrel-startup`, and
`vitest/globals` for the bare `describe`/`it`/`vi` used by six packages)
currently all arrive this way, workspace-wide.

1. Branch off `main` (`chore/typescript-6-upgrade`, or `security/typescript-6-<id>`
   if forced by a Security-tab alert).
2. Bump `catalog.typescript` in `pnpm-workspace.yaml`, `pnpm install`. Expect
   widespread `tsc` failures — this is the ambient-types default disappearing,
   not a real regression in the code.
3. Remediation, in order of preference:
   - **Try first**: add `"types": ["*"]` to the three shared roots
     (`tsconfig.base.json`, `tsconfig.browser-lib.json`,
     `tsconfig.node-lib.json`). This is TS's own documented way to restore the
     pre-6.0 "include every `@types/*` package" behavior — a one-line change,
     minimal churn, no per-package enumeration needed.
   - **Only if that's insufficient** (e.g. some other 6.0 change also needs
     addressing), fall back to explicit per-config `types` arrays. Known
     inventory to enumerate from: `node`, `web-bluetooth` (`packages/core`),
     `three` (`display`/`board`/`digital`), `react`/`react-dom`
     (`creator-card-render`, `creator-theme`, `apps/creator`/`digital`/`player`),
     `ws` (`relay-core`/`relay-client`/`apps/relay-cli`), `express`
     (`apps/mcp-server`), `electron-squirrel-startup` (`apps/relay-electron`),
     plus `vitest/globals` for the six packages with bare ambient test globals
     (`core`, `game-data`, `relay-core`, `relay-client`, `board`, `display`) and
     `vite/client` for the Vite-app entry configs.
   - **Leave alone** — already scope `types` explicitly, unaffected either way:
     `packages/board/example/tsconfig.json`, `packages/creator-schema/tsconfig.json`,
     `packages/display/tsconfig.example.json`, `apps/sync/tsconfig.node.json`.
   - Update or remove `packages/core/tests/vitest-globals.d.ts`'s comment
     documenting the "no `types` array on purpose" invariant — it no longer
     holds once this lands.
4. `pnpm run ci` — build before typecheck matters here too; the ambient-type
   breakage only surfaces at the `typecheck` step, which runs after `build`.
5. Spot-check representative bare-ambient-global files actually typecheck
   clean, not just "CI is green" — e.g. a `packages/core` test using bare
   `describe`/`vi`, and `packages/board/example`'s `vite/client` usage.
6. Update the two comments that currently justify the 5.9.x pin, or they go
   stale immediately: `pnpm-workspace.yaml`'s `catalog.typescript` comment, and
   `dependabot.yml`'s `typescript` ignore-entry comment (remove the ignore
   entry if the bump lands cleanly, or update the pinned floor).

## Vite major playbook

`vite` is one shared pnpm catalog entry (`catalog.vite`) used by nearly every
package in the repo — a major bump is a single one-line catalog edit that
affects the whole workspace at once. There's no way to isolate it to one
package; the isolation that matters is in verification.

The known regression class: a Vite major has previously broken
`packages/display`'s **CJS** lib output at runtime (not compile time) — `build`
succeeding is not sufficient signal that a Vite major is safe.

1. Branch off `main`. Bump `catalog.vite` in `pnpm-workspace.yaml`.
2. `pnpm install`, then `pnpm run ci`. This catches compile-time breakage only.
3. **Mandatory — do not skip**: `pnpm --filter ultimatedarktowerdisplay
test:cjs-smoke` (this is a CI gate now, added specifically to catch this
   class of regression — see `packages/display/package.json`'s
   `test:cjs-smoke` script and the corresponding `.github/workflows/ci.yml`
   step). If it fails, there are two independent failure modes this repo has
   hit before — check both:
   - **`import.meta.url` codegen**: the `renderChunk` hook in
     `packages/display/vite.config.ts` rewrites rolldown's `{}.url` output
     (Vite 6+/rolldown render `import.meta.url` as `{}.url` in CJS lib output,
     which throws `Invalid URL` at `require()` time). A new Vite major could
     change this codegen shape again — inspect the actual emitted
     `dist/index.cjs` around the asset `new URL(...)` call sites before
     assuming the existing patch still applies.
   - **Output filename**: the `fileName` callback in the same `vite.config.ts`
     must keep emitting a bare `.cjs` extension for the CJS format, not
     `.cjs.js` — a `.cjs.js` file under `"type":"module"` is treated as an ES
     module by Node regardless of its actual CommonJS content, and `require()`
     throws `ReferenceError: exports is not defined in ES module scope`. If a
     future Vite major changes how lib mode's `formats`/`fileName` options
     interact, re-verify the output filename didn't regress.
4. Re-run `packages/board`'s tests, **after** a full `pnpm -r build`. Order
   matters: board resolves `ultimatedarktowerdisplay` against its _built_
   `dist` (via the package `exports` map, resolved by vitest), so building out
   of order gives false failures.
   `pnpm --filter ultimatedarktowerboard test`.
5. Sanity-check the `emitAssetsAsFiles` custom Rollup plugin in
   `packages/display/vite.config.ts` still intercepts the asset
   `new URL(...)` pattern rather than silently falling through to
   base64-inlining — a size regression, not a crash, so the smoke test above
   won't catch it:
   - `ls packages/display/dist/audio/assets | wc -l` — expect ~113 files.
   - `ls packages/display/dist/3d/assets/board.png` — must exist as a
     separate file, not inlined into the bundle.

## Combined verification checklist

Whichever upgrade is in flight, run this sequence before opening the PR:

```bash
pnpm install                                              # after the catalog bump
pnpm -r build                                              # topological: core -> display -> board
pnpm --filter ultimatedarktowerdisplay test:cjs-smoke      # only meaningful after a Vite-major bump
pnpm --filter ultimatedarktowerboard test                  # must run after the build above, not standalone
pnpm run ci                                                 # full pipeline: validate:nodes -> lint -> format:check -> build -> typecheck -> test
```

For the TypeScript playbook specifically, also spot-check a bare-ambient-global
file typechecks clean (step 5 above) — `pnpm run ci` alone doesn't prove the
_right_ files were fixed, only that nothing is currently red.
