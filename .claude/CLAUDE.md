# CLAUDE.md — Working in the UltimateDarkTower monorepo

## What this repo is

A **pnpm monorepo** for the Ultimate Dark Tower (UDT) ecosystem — a TypeScript
library, renderers, and companion apps for Restoration Games' _Return to Dark
Tower_. It was consolidated in July 2026 from three standalone repos
(`UltimateDarkTower`, `UltimateDarkTowerDisplay`, `UltimateDarkTowerRelay`,
now archived) into `packages/*` + `apps/*`.

- Package manager: **pnpm** (`packageManager: pnpm@11.9.0`). Toolchain requires
  **Node >= 22.13** (pnpm 11 loads `node:sqlite`). Published libraries target a
  **Node >= 18** runtime.
- Workspace config: `pnpm-workspace.yaml` (globs `packages/*`, `apps/*`).
- Live demos: https://chessmess.github.io/UltimateDarkTower/

## Layout

### `packages/` — libraries

**Published to npm (7):**

| Dir                     | npm name                        | What it is                                                                    |
| ----------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `packages/core`         | `ultimatedarktower`             | BLE driver + core library for the physical tower                              |
| `packages/display`      | `ultimatedarktowerdisplay`      | Text / 2D / 3D renderers for tower state                                      |
| `packages/board`        | `ultimatedarktowerboard`        | 2D game-board renderer + Board3D plugin                                       |
| `packages/game-data`    | `ultimatedarktowerdata`         | RtDT reference data (locations/foes/heroes/monuments/seed parsing), zero deps |
| `packages/relay-shared` | `ultimatedarktowerrelay-shared` | Shared relay protocol types/factories                                         |
| `packages/relay-core`   | `ultimatedarktowerrelay-core`   | Headless relay engine (BLE emulator + WebSocket)                              |
| `packages/relay-client` | `ultimatedarktowerrelay-client` | Framework-agnostic relay consumer SDK                                         |

**Private Creator libraries (`@udtc/*`):** `creator-schema` (`@udtc/schema`),
`creator-engine` (`@udtc/engine`), `creator-adapters` (`@udtc/adapters`),
`creator-card-render` (`@udtc/card-render`), `creator-theme` (`@udtc/theme`),
`scenario-store` (`@udtc/scenario-store`).

### `apps/` — runnable apps (leaf consumers; nothing depends on them)

`controller` (`ultimatedarktowercontroller`), `creator` (`@udtc/creator`),
`digital` (`ultimatedarktowerdigital`), `game` (`ultimatedarktowergame`),
`player` (`@udtc/player`), `seed` (`ultimatedarktowerseed`), `sync`
(`@dark-tower-sync/client`), `relay-cli` (`ultimatedarktowerrelay-cli`),
`relay-electron` (`ultimatedarktowerrelay-electron`), `mcp-server`
(`mcp-server-return-to-dark-tower`).

**All are `private: true` except `mcp-server`**, which publishes to npm because
`npx` is how an MCP server gets consumed. Publishing is a **per-package flag**,
not a property of the directory — `apps/` means "runnable leaf", not
"unpublished". Changesets is driven purely by that flag (`.changeset/config.json`
has an empty `ignore` list), so a `private: false` app joins the release flow
automatically. Corollary: an app that publishes must not keep `prepack`/
`prepublishOnly` scripts that call devDeps the monorepo strips (see
`apps/mcp-server` — `changeset publish` runs `prepack`).

## Commands

Run from the **repo root** unless noted. `-r` = across every workspace.

- `pnpm install` — installs all workspaces (a `postinstall` builds `@udtc/engine`
  first, since some packages depend on its `dist`).
- `pnpm build` / `pnpm test` / `pnpm typecheck` / `pnpm lint` — the `-r` fan-outs.
- `pnpm format` / `pnpm format:check` — Prettier over the whole tree.
- `pnpm run ci` — the gating pipeline (validate:nodes → lint → format:check →
  build → typecheck → test). **Build runs before typecheck on purpose:**
  cross-package typechecks resolve workspace imports against each dependency's
  built `dist/`, so the graph must be built first.
- `pnpm --filter <pkgname> <script>` — one package, e.g.
  `pnpm --filter ultimatedarktowerdisplay build`. Use the **npm name**, or a path
  glob like `pnpm --filter './packages/relay-*...' build` (the `...` pulls in
  workspace deps).
- `pnpm validate:nodes` — validates the Creator node catalog
  (`scripts/creator/validate-node-catalog.mjs`).

### Releasing (Changesets)

`pnpm changeset` to record a change → push to `main` opens/updates a "Version
Packages" PR → merging it bumps versions and publishes changed libraries to npm
with provenance (`.github/workflows/release.yml`). Config in `.changeset/`.

Publication is driven **purely by each package's `private` flag** —
`.changeset/config.json` has an empty `ignore` list. So `private: false` opts a
package in automatically (`apps/mcp-server` is the only app that does).

#### A failed publish reports the wrong error — read this before debugging one

**Changesets masks npm's rejection with a TypeError.** When `npm publish` fails,
Changesets' own error classifier crashes on the way to reporting it:

```
🦋  error TypeError: Cannot read properties of undefined (reading 'includes')
    at isAlreadyPublishedError (.../@changesets/cli/dist/changesets-cli.cjs.js:873)
    at internalPublish
```

It reads `error.message.includes(...)` on an error that has no `.message`, so
**npm's actual reason never reaches the log** — not in `--log-failed`, not
anywhere. The TypeError is a red herring; it says nothing about the cause. Seen
first on `mcp-server-return-to-dark-tower@1.0.1` (Jul 2026, run 29450345234).

How to find the real cause, since the log won't tell you:

- **Which workflow failed?** A publish failure is **Release**, not CI. CI going
  green while "the build failed" means look at Release.
- **Rule out packaging:** `pnpm --filter <pkg> build && cd <dir> && npm publish
--dry-run`. If that prints a sane tarball, the package is fine.
- **Rule out a dead token:** check whether _any_ package published recently — a
  successful publish from CI in the last few days means the token is alive.
  **`npm info` succeeding proves nothing** — public reads need no auth at all.
  ```bash
  # note the https:// — without it curl gets a redirect it won't follow, and
  # you get a silent empty result that looks like a broken query
  curl -s "https://registry.npmjs.org/<pkg>" |
    jq -r '.["dist-tags"].latest as $v | "\($v)  \(.time[$v][:10])"'
  ```
- **Rule out provenance:** a version published from this repo with provenance
  working has `dist.attestations` in its registry metadata:
  ```bash
  curl -s "https://registry.npmjs.org/<pkg>" |
    jq '.versions[.["dist-tags"].latest].dist | has("attestations")'
  ```
- **Timing is a tell:** a rejection in ~2s is auth; a slow failure is upload.

If packaging, token liveness, and provenance all check out, it's **write
permission on that specific package name**, and the cause is almost certainly:

**`NPM_TOKEN` is a granular token scoped to "Only select packages"** — and the
new package isn't on the list. Confirmed root cause of the Jul 2026 failure: the
token carried read+write for exactly the 6 `ultimatedarktower*` packages that
existed when it was created. Nothing about the token was broken; it had published
`ultimatedarktowerboard` from CI two days earlier.

**This fires every time a new published package joins the monorepo** — the token
is a fixed allow-list that does not learn about new names. Fix on npmjs.com
(Access Tokens → the CI token → add the package; if the list isn't editable,
regenerate and update the `NPM_TOKEN` repo secret), then
`gh run rerun <id> --failed`. **Add the package to the token _before_ merging the
Version Packages PR** and you skip the whole thing.

Also worth a look if the scope is fine: a package that was only ever published by
hand may still be set to "Require two-factor authentication" under its npm
Publishing access, which blocks automation tokens. CI-published packages need
"two-factor authentication **or** automation tokens". (Not the cause in Jul 2026,
but `mcp-server-return-to-dark-tower` had exactly that history, so it was the
other live suspect.)

Retrying needs no code change: the version bump and consumed changeset are
already on `main`, and a rejected publish uploads nothing, so Changesets picks
the pending version straight back up.

## Conventions & gotchas

- **TypeScript is pinned once** via the pnpm catalog: packages declare
  `"typescript": "catalog:"`; the version lives in `pnpm-workspace.yaml`
  (`catalog.typescript`). Pinned to 5.9.x — do not bump to 6.0 (it drops the
  automatic `@types` inclusion the packages rely on).
- **One root ESLint 9 flat config** (`eslint.config.js`) covers the whole
  workspace. Do **not** add per-package `eslint`/`@typescript-eslint` devDeps —
  a nested v8 copy shadows the root v9 config and crashes lint. Root `lint` runs
  a single `eslint .`.
- **Native build allow-list**: pnpm 11 blocks install scripts by default. The
  allowed ones (esbuild, electron, `@stoprocent/*` BLE, serialport, usb, …) are
  enumerated under `allowBuilds` in `pnpm-workspace.yaml`; audit with
  `pnpm approve-builds`. `blockExoticSubdeps: false` is set for electron-forge's
  git-hosted subdep.
- **three.js is force-hoisted** (`.npmrc` `public-hoist-pattern[]=*three*`) so
  display/board/creator share one copy — multiple copies break `instanceof`.
- **`CLAUDE.md` files are committed** — the root `.claude/CLAUDE.md` plus a
  per-package `CLAUDE.md` in most `packages/*` and `apps/*` (loaded on demand when
  you open a file there). Only **`.claude/settings.local.json`** and
  **`.claude/worktrees/`** stay local. Still gitignored: `planning/`,
  `manual-testing/`, `.obsidian/`, and `dist/` (CI builds it).
- Per-package `dist/` layouts differ (some CJS+ESM, some CJS-only); check a
  package's own `package.json` `main`/`module`/`exports` before assuming.

## Related docs

- **`AGENTS.md`** (repo root) — consumer-facing reference: the two GitHub Copilot
  agents in `.github/agents/`, and the tower layout tables (side/level/corner/glyph
  enums, `setLED` layer index, light-effect and volume values). It is **not** a copy
  of this file — different audience; link to it for tower protocol constants rather
  than duplicating them.
- **`docs/local-development.md`** — how to run each app and library demo locally
  (every command from the repo root via `pnpm --filter`).

## Protocol-specific knowledge

Most tower-control detail now lives in the packages that own it, as per-package
`CLAUDE.md` files (loaded on demand) plus each package's `docs/`:

- **BLE driver** — `packages/core/CLAUDE.md`; deep docs in `packages/core/docs/`
  (`ARCHITECTURE.md`, `API_REFERENCE.md`, `TOWER_TECH_NOTES.md`, `BLE_DIAGNOSTICS.md`).
- **Reference data / seed format** — `packages/game-data/CLAUDE.md`; seed encoding in
  `packages/game-data/docs/SEED_FORMAT.md` (also mirrored at `apps/seed/SEED_FORMAT.md`).
- **Renderers** — `packages/display/docs/`. **Relay protocol** — `docs/relay/`.

## Dependency security / Dependabot

For any Dependabot alert/PR work, use the **`dependabot-triage`** skill
(`.claude/skills/dependabot-triage/`) — it has the full playbook. Durable facts:

- **`minimumReleaseAge` gate:** `pnpm install --frozen-lockfile` (CI) rejects
  package versions published within ~24h (`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`).
  So Dependabot version-update PRs proposing a just-published release are red
  until it ages — not a breakage. Re-run after it ages / `@dependabot rebase`.
- **`dependabot.yml` policy:** `typescript` is ignored (it's a `catalog:` dep
  Dependabot can't resolve, and pinned at 5.9.x); `version-update:semver-major`
  is ignored (major bumps taken manually). A major-only _security_ fix therefore
  won't auto-PR — it still shows as a Security-tab alert to handle by hand.
- **Verify a `tar`/electron override with** `pnpm --filter
ultimatedarktowerrelay-electron rebuild` — `pnpm run ci` skips it (no `build`
  script). Bumping the `vite` major? re-check display's CJS `dist` still
  `require()`s (see the skill's `references/repo-gotchas.md`).

## Before committing

Run `pnpm run ci` from the root. Add a changeset (`pnpm changeset`) for any
change to a published package. This project drives hardware — cover edge cases
and prefer the mock adapter for automated tests.
