# Dependabot triage — repo-specific gotchas

Read this when a triage or a Dependabot PR does something surprising. These are
the traps this monorepo has that a generic "bump the dep" instinct will miss.
Each entry says how to recognize it and what to actually do.

## Table of contents

1. `minimumReleaseAge` supply-chain gate (fresh versions are rejected)
2. `typescript` is a pnpm `catalog:` dep Dependabot can't resolve
3. Build-before-test: the monorepo CI order, and why isolated `jest` lies
4. Attributing a failure: clean-`main` worktree comparison
5. `pnpm overrides` for transitive deps + the electron/tar verification
6. Transient GitHub Actions "Set up job / Service Unavailable" flakes
7. `concurrency: cancel-in-progress` makes a superseded run read as "cancelled"
8. Known past regressions to sanity-check (not re-derive)
9. Dev/build-time vs production-runtime reachability in this repo

---

## 1. `minimumReleaseAge` supply-chain gate

CI runs `pnpm install --frozen-lockfile`, and pnpm enforces a supply-chain
policy that **rejects any package version published within the last ~24 hours**
(a defense against freshly-published malicious releases). It surfaces as:

```
[ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION] N lockfile entries failed verification:
  <pkg>@<ver> was published at <ts>, within the minimumReleaseAge cutoff (<ts-24h>)
```

**Why it matters for triage:** Dependabot always proposes the _newest_ version,
so a Dependabot version-update PR that bumps to a just-published release will be
**red until that version ages past ~24h** — this is not a real breakage. It's
also why we set `dependabot.yml` to ignore `version-update:semver-major` and keep
proactive bumps modest. The policy isn't in the committed config (it's a
pnpm-level/global default), so you can't grep for it — recognize it by the error.

**What to do:** wait for the version to age, then re-run the PR's failed checks
(`gh run rerun <run-id> --failed`, or comment `@dependabot rebase`). Never "fix"
it by relaxing the lockfile.

## 2. `typescript` is a `catalog:` dep

TypeScript is pinned once via the pnpm catalog (`pnpm-workspace.yaml` →
`catalog.typescript`), and packages reference it as `"typescript": "catalog:"`.
Dependabot **cannot resolve the `catalog:` protocol** and errors the whole
`npm_and_yarn` update run when it tries (`typescript | unknown_error | null`),
even though it opened the other PRs fine. TS is also deliberately held at 5.9.x
(6.0 drops automatic `@types` inclusion — see CLAUDE.md).

**What to do:** `dependabot.yml` already lists `typescript` under `ignore`. If a
new catalog entry appears, ignore it too. Never let Dependabot bump `typescript`.

## 3. Build-before-test (and why isolated `jest` lies)

`pnpm run ci` runs `... build → typecheck → test` **in that order on purpose**:
cross-package tests resolve workspace imports against each dependency's built
`dist/`. Notably, `packages/board`'s jest `moduleNameMapper` pins
`ultimatedarktowerdisplay` → `dist/index.cjs.js` / `dist/physics.cjs.js`, so
**board's tests require display's dist to exist and be current.**

**Trap:** running `npx jest <file>` or `pnpm --filter board test` _without_
building the graph first makes board resolve display to _source_, which fails on
`import.meta.url` asset modules — a false failure that looks pre-existing. Always
mirror CI: `pnpm -r build` (topological — builds `core → display → board`) then
test, or just run the full `pnpm run ci`.

## 4. Attributing a failure: clean-`main` worktree comparison

Before concluding "this test was already broken" (or "my bump broke it"), prove
it against untouched `main` in the _correct_ build order:

```bash
git worktree add --force /tmp/wt-main main
cd /tmp/wt-main && pnpm install --frozen-lockfile && pnpm -r build
pnpm --filter <pkg> test        # green here + red on your branch => your change regressed it
git worktree remove /tmp/wt-main --force
```

Doing this in the wrong order (skipping `pnpm -r build`) is what produced a false
"pre-existing failure" read during the July 2026 triage — don't repeat it.

## 5. `pnpm overrides` for transitive deps + electron/tar verification

For a vulnerable **transitive** dep, don't chase the parent — add a
`pnpm-workspace.yaml` `overrides:` entry forcing the patched version (this repo
keeps pnpm config there alongside `catalog`/`allowBuilds`). Prefer a version that
**already resolves elsewhere in the tree** so the override is a de-dupe, not a
risky new upgrade. Then reinstall and confirm the stale copy is gone:

```
grep -E "<pkg>@<old-version>" pnpm-lock.yaml   # expect no output
```

**`tar` specifically** is pulled only by the electron packaging toolchain
(`@electron/rebuild`, `@electron/node-gyp`, `cacache`) — build-time, never
shipped. Forcing `tar` 6→7 risks that toolchain, so verify it:

```
pnpm --filter ultimatedarktowerrelay-electron rebuild
```

`relay-electron` has **no `build` script**, so `pnpm run ci` does NOT exercise
this path — you must run `rebuild` (or `electron-forge package`) explicitly. The
CI `relay-native` matrix job covers it on ubuntu+macOS × Node 22/24.

## 6. Transient Actions "Set up job / Service Unavailable"

A job failing at the **"Set up job"** step with `Failed to resolve action
download info. Error: Service Unavailable` is GitHub Actions infra flaking while
downloading action definitions — it runs before any repo code. Not your change.

**What to do:** `gh run rerun <run-id> --failed`. Don't investigate it as a code
failure. Note `gh run watch --exit-status` can misreport 0 during these; confirm
the real result with `gh run view <id> --json conclusion`.

## 7. `concurrency: cancel-in-progress` → "cancelled"

`ci.yml` sets `concurrency: { group: ci-CI-<ref>, cancel-in-progress: true }`.
Merging a second PR to `main` right after a first **cancels the first's still-
running `main` CI** (same group). The cancelled run is not a failure — the later
run covers the combined tip. Confirm main is green by the _latest_ run, not the
cancelled one.

## 8. Known past regressions to sanity-check (don't re-derive)

- **vite 6+/rolldown CJS `import.meta.url` → `{}.url` (undefined).** Bumping
  display/board off vite 5 made display's **CJS** lib build emit
  `new URL('audio/assets/x.ogg', {}.url)`, throwing `Invalid URL` at `require()`
  — broke every CJS consumer, surfaced by board's tests. Fixed by a `renderChunk`
  step in `packages/display/vite.config.ts` (documented there). If you touch the
  vite major again, re-check that display's `dist/index.cjs.js` still `require()`s
  clean: `node -e "require('./packages/display/dist/index.cjs.js')"` and that
  board's tests pass after a full build.

## 9. Reachability in this repo

Classify each vulnerable dep before deciding severity-of-action:

- **Production runtime** (shipped in a published package's `dist`, executed by
  consumers) → highest priority; fix properly.
- **Dev/build-time** (bundlers, test tooling, electron packaging, CLI prompts) →
  not in any published runtime; a "runtime" scope label from Dependabot reflects
  the dep's own manifest, not this project's use. Fix by de-dupe/override if
  cheap; otherwise dismiss with rationale.

Concrete build-time-only sources seen here: `vite`/`esbuild` (build + dev server),
`tar`/`@electron/*`/`cacache` (electron packaging), `tmp`/`external-editor` (CLI
prompts).
