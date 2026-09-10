# Dependabot triage — repo-specific gotchas

Read this when a triage or a Dependabot PR does something surprising. These are
the traps this monorepo has that a generic "bump the dep" instinct will miss.
Each entry says how to recognize it and what to actually do.

## Table of contents

1. `minimumReleaseAge` supply-chain gate (fresh versions are rejected)
2. `typescript` is held at 5.9.x on purpose
3. Build-before-test: the monorepo CI order, and why an isolated test run lies
4. Attributing a failure: clean-`main` worktree comparison
5. `pnpm overrides` for transitive deps + the electron/tar verification
6. Transient GitHub Actions "Set up job / Service Unavailable" flakes
7. `concurrency: cancel-in-progress` makes a superseded run read as "cancelled"
8. Known past regressions to sanity-check (not re-derive)
9. Dev/build-time vs production-runtime reachability in this repo
10. TypeScript 6.0 / Vite-major upgrades — see `major-version-upgrades.md`
11. `extract-zip` / `image-size` — the two permanently unfixable alerts
12. Stale lockfiles, not bad ranges — run `pnpm update` before editing anything

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

## 2. `typescript` is held at 5.9.x on purpose

TypeScript is pinned once via the pnpm catalog (`pnpm-workspace.yaml` →
`catalog.typescript`), and packages reference it as `"typescript": "catalog:"`.
TS is deliberately held at 5.9.x — 6.0 drops automatic `@types` inclusion,
which the whole workspace relies on for ambient types (see CLAUDE.md and, for
the full upgrade playbook if this is ever attempted, `major-version-upgrades.md`
§TypeScript 6.0).

_(An earlier version of this entry claimed Dependabot "can't resolve the
`catalog:` protocol and errors the whole run" — that's no longer true; pnpm
workspace catalogs went GA in Dependabot in Feb 2025, so catalogued deps
resolve and get proposed normally now. `typescript`'s `ignore` entry exists
purely for the version pin below, not a resolver limitation — see
`dependabot.yml`'s own comment for the same correction.)_

**What to do:** `dependabot.yml` already lists `typescript` under `ignore`. If a
new catalog entry appears, ignore it too. Never let Dependabot bump `typescript`.

## 3. Build-before-test (and why an isolated test run lies)

`pnpm run ci` runs `... build → typecheck → test` **in that order on purpose**:
cross-package tests resolve workspace imports against each dependency's built
`dist/`. Notably, `packages/board`'s vitest config resolves
`ultimatedarktowerdisplay` through display's package `exports` map (to the ESM
build), and `plugin.integration.test.ts` runs a real `Tower3DView` against it,
so **board's tests require display's dist to exist and be current.** (Board
used to pin this explicitly via a jest `moduleNameMapper` to
`dist/index.cjs.js`/`dist/physics.cjs.js` — that alias is gone now that board
runs vitest, which resolves the `exports` map on its own; see
`packages/board/CLAUDE.md`.)

**Trap:** running `pnpm --filter board test` _without_ building the graph first
makes board resolve display to _source_, which fails on `import.meta.url` asset
modules — a false failure that looks pre-existing. Always mirror CI:
`pnpm -r build` (topological — builds `core → display → board`) then test, or
just run the full `pnpm run ci`.

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
pnpm --filter ultimatedarktowerrelay-electron rebuild:native
```

`relay-electron` has **no `build` script**, so `pnpm run ci` does NOT exercise
this path — you must run `rebuild:native` (or `electron-forge package`)
explicitly. The CI `relay-native` matrix job covers it on ubuntu+macOS × Node
22/24.

**The `:native` suffix is load-bearing.** `rebuild` alone is a **pnpm builtin**
(`pnpm rebuild`, alias `rb`), so `pnpm --filter <pkg> rebuild` runs pnpm's own
command and never reaches the package script. It then fails for an unrelated
reason:

```
[ERR_PNPM_MISSING_HOISTED_LOCATIONS] update-browserslist-db@1.2.3(browserslist@4.28.5)
is not found in hoistedLocations inside node_modules/.modules.yaml
```

That error is a **red herring — nothing is missing and nothing needs
reinstalling.** Under `nodeLinker: hoisted` the builtin looks each package up by
exact peer-suffixed depPath, but the hoisted linker writes only **one
`hoistedLocations` key per physical directory**. A package with two peer
variants sharing one directory therefore has one key, and the other lookup
throws. Here `update-browserslist-db` resolves against both `browserslist@4.28.5`
(webpack, via `@electron-forge/cli`) and `4.28.6` (`@babel/helper-compilation-targets`).
`vite`, `vitest`, `@vitejs/plugin-react` and `@vitest/mocker` collide the same
way via `@types/node`, so the builtin `pnpm rebuild` is broken repo-wide — and
nothing in the repo or CI uses it. Don't chase it, and don't `rm -rf
node_modules` over it.

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
  step in `packages/display/vite.config.ts` (documented there).
- **Display's CJS entry point shipped as `.cjs.js`, not `.cjs`, and was
  therefore _always_ broken independent of any Vite bump** (`.js` under
  `"type":"module"` is treated as ESM regardless of content — `require()`
  threw `ReferenceError: exports is not defined in ES module scope`). Fixed by
  renaming the emitted files to `dist/index.cjs` / `dist/physics.cjs`, matching
  `packages/board`'s existing convention.

Both of the above are now guarded by a **CI gate**, not just a manual check:
`pnpm --filter ultimatedarktowerdisplay test:cjs-smoke` (wired into
`.github/workflows/ci.yml`'s `checks` job, right after the main `pnpm run ci`
step). If you touch a Vite major again and this fails, see
`major-version-upgrades.md` §Vite major playbook for both known failure modes
to check.

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

## 10. TypeScript 6.0 / Vite-major upgrades

Both are ignored by `dependabot.yml` (see §2 for `typescript`; a global
`semver-major` ignore blocks a Vite major too), so neither can ever arrive as
an automatic Dependabot PR — any attempt is hand-driven. The full step-by-step
playbook for either lives in a dedicated file, not here — see
[`major-version-upgrades.md`](./major-version-upgrades.md).

## 11. `extract-zip` / `image-size` — the two permanently unfixable alerts

**If a triage shows exactly these two packages and nothing else, you are done —
the repo is clean. Do not re-investigate.** Fully chased on 2026-09-10; all
three fix routes are closed, with evidence. Re-deriving this costs an hour.

| Alert | Package | In tree | Patched version |
| --- | --- | --- | --- |
| GHSA-jmr9-qjv8-65gv (CVE-2026-56876) | `extract-zip` | 2.0.1 | **none, ever** |
| GHSA-7pqw-9j4j-h8q3 (CVE-2026-19693) | `extract-zip` | 2.0.1 | **none, ever** |
| GHSA-5p2g-fcmc-qvqq (CVE-2025-71329) | `image-size` | 0.7.5 | **none, ever** |
| GHSA-w3rx-r6r6-pgpr (CVE-2025-71330) | `image-size` | 0.7.5 | **none, ever** |

Paths, both build-time only, both via electron-forge:

- `extract-zip` ← `@electron/packager@18.4.4` ← `@electron-forge/core` ← `apps/relay-electron` (devDeps)
- `image-size` ← `appdmg` ← `electron-installer-dmg` ← `@electron-forge/maker-dmg` (devDeps)

### The three closed routes

1. **Upgrade the package.** `extract-zip@2.0.1` is the newest release and npm's
   `time.modified` is 2023-03-04 — unmaintained for three years.
   `first_patched_version` is genuinely `null`.

2. **Alias-override to Electron's fork.** Tempting and wrong. `@electron/packager@20`
   replaced `extract-zip` with `@electron-internal/extract-zip`, which is already
   in the tree (pulled by `electron` itself) and carries no advisories. But it is a
   **complete rewrite**: ~23 lines delegating to a native binding, and
   `"type": "module"`. Packager 18 does `require("extract-zip")` in
   `dist/unzip.js` and the original is CommonJS, so the alias throws
   `ERR_REQUIRE_ESM`. Not a drop-in.

3. **Force `@electron/packager: ^20.3.0`.** This *does* remove `extract-zip` from
   the tree entirely — and then breaks packaging:

   ```
   electron-forge package
     TypeError: done is not a function
       at @electron-forge/core/dist/api/package.js:76:13
   ```

   Forge 7.11.2 declares `@electron/packager: ^18.3.5` and calls it with an API
   that 20 changed. Verified by attribution: packaging exits 0 on 18.4.4 and
   fails on 20.3.0, same command, same tree.

### What actually fixes it

**electron-forge 8.** `@electron-forge/core@8.0.0-alpha.10` already depends on
`@electron/packager ^20.0.1`, which is the version that dropped `extract-zip`.
Only alphas exist as of 2026-09-10; 7.11.2 is the newest stable. When forge 8
ships stable, these alerts disappear for free — and note `dependabot.yml`
ignores `version-update:semver-major`, so **nobody will tell you it shipped**.
Check by hand: `npm view @electron-forge/cli version`.

### Why they are safe to sit on

`extract-zip` is called from exactly one place — `Packager.extractElectronZip()`
— on the Electron distribution zip that `@electron/get` has just downloaded and
**SHA256-verified against the official `SHASUMS256.txt`**. Exploiting the symlink
traversal would mean compromising Electron's release artifacts *and* their
checksums. Both packages are devDependencies, run at build time, and ship to no
consumer. The CVSS scores (8.6 for `extract-zip`) assume attacker-controlled zip
input, which this repo does not have.

Recommend dismissing as `tolerable_risk` with that rationale written in — but
dismissal is a **user decision**, per the guardrails at the top of `SKILL.md`.

## 12. Stale lockfiles, not bad ranges — run `pnpm update` first

**The single highest-yield triage step, and it is not in Dependabot's job
description.** Dependabot opens PRs against *manifest* entries. It does not
refresh a lockfile that has drifted below the ranges `package.json` already
declares. So an advisory can sit open against a tree that is one `pnpm update`
from clean, with no version floor anywhere at fault.

Measured on 2026-09-09/10, before touching a single override:

| Repo | Alerts fixed by `pnpm update` alone |
| --- | --- |
| UltimateDarkTower | 4 of 7 |
| metal-and-cleats | 3 of 4 |
| board-game-creator | 2 of 4 criticals, plus most of the other 86 |

Concretely here: `fast-uri` had an override of `^3.1.5` while 3.1.6 was the
patch — the range already permitted it. Same for `js-yaml@3` (`^3.15.1` →
3.15.2), `js-yaml@4` (`^4.3.1` → 4.3.2) and `hono` (`^4.12.34` → 4.13.5). Four
HIGH/MEDIUM advisories, zero range problems.

**So: run `pnpm update` and re-check the alerts BEFORE adding or raising any
override.** Only what survives that needs a manifest edit.

⚠ **`pnpm update` also rewrites `package.json` ranges to new floors** (pnpm 11
behaviour). That is scope creep in a security PR and it manufactures exactly the
maintenance treadmill overrides are criticised for. Revert `package.json`, then
re-run `pnpm install` to re-derive the lockfile against the original ranges — if
the patched versions still resolve (they usually do), ship the lockfile alone and
leave the manifest untouched.
