# CLAUDE.md — Working in the UltimateDarkTower monorepo

## What this repo is

A **pnpm monorepo** for the Ultimate Dark Tower (UDT) ecosystem — a TypeScript
library, renderers, and companion apps for Restoration Games' _Return to Dark
Tower_. It was consolidated in July 2026 from three standalone repos
(`UltimateDarkTower`, `UltimateDarkTowerDisplay`, `UltimateDarkTowerRelay`,
now archived) into `packages/*` + `apps/*`.

- Package manager: **pnpm** (`packageManager: pnpm@11.9.0`). Toolchain requires
  **Node >= 22.13** (pnpm 11 loads `node:sqlite`) — published packages declare the
  same floor (`engines.node: >=22.13.0`), unified in the July 2026 stack-alignment
  pass after the previous `>=18.0.0` claim on 15 workspaces turned out to have
  never actually been verified.
- Live demos: https://chessmess.github.io/UltimateDarkTower/

## Layout

`packages/*` are libraries, `apps/*` are runnable leaf consumers (nothing
depends on them). Each directory's npm name and one-line purpose live in its own
`package.json`; the `@udtc/*` scope marks private, unpublished libraries — mostly the Creator
stack, plus `@udtc/theme` and `@udtc/assets`.

**All apps are `private: true` except `mcp-server` and `relay-cli`**, which publish to npm because
`npx` is how an MCP server gets consumed. Publishing is a **per-package flag**,
not a property of the directory — `apps/` means "runnable leaf", not
"unpublished". Changesets is driven purely by that flag (`.changeset/config.json`
has an empty `ignore` list), so a `private: false` app joins the release flow
automatically. Corollary: an app that publishes must not keep `prepack`/
`prepublishOnly` scripts that call devDeps the monorepo strips (see
`apps/mcp-server` — `changeset publish` runs `prepack`).

## Commands

Run from the **repo root** unless noted. `-r` = across every workspace.

- `pnpm install` — a `postinstall` builds `@udtc/engine` first, since some
  packages depend on its `dist`.
- `pnpm run ci` — the gating pipeline. **Build runs before typecheck on
  purpose:** cross-package typechecks resolve workspace imports against each
  dependency's built `dist/`, so the graph must be built first.
- `pnpm --filter` takes the **npm name**, not the directory — or a path glob
  like `pnpm --filter './packages/relay-*...' build` (the `...` pulls in
  workspace deps).

### Releasing

Use the **`releasing`** skill (`.claude/skills/releasing/`) — the Changesets
flow, what `private: true` does and doesn't change, and the failed-publish
playbook (Changesets masks npm's real error with a TypeError).

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
- **Game art and audio live in `@udtc/assets` and arrive as bundler-emitted URLs.**
  Never copy art into an app's `public/` or build a path with
  `` `${import.meta.env.BASE_URL}assets/…` `` — `import` the URL instead. Two traps
  worth knowing before you touch it: **there is no asset tree-shaking** (`emitFile`
  runs in `transform`, before it), so the module split _is_ the granularity and
  importing the wrong subpath silently ships megabytes; and the package must never
  reach `optimizeDeps.include`, which breaks `import.meta.glob` in dev only.
  `packages/assets/CLAUDE.md` has the full list. Browse the collection in the
  Tower Codex under **Graphics** (`pnpm dev:codex`, then `#/art`).
- **`CLAUDE.md` files are committed** — the root `.claude/CLAUDE.md` plus a
  per-package `CLAUDE.md` in most `packages/*` and `apps/*` (loaded on demand when
  you open a file there). Only **`.claude/settings.local.json`** and
  **`.claude/worktrees/`** stay local. Still gitignored: `planning/`,
  `manual-testing/`, `.obsidian/`, and `dist/` (CI builds it).
- Per-package `dist/` layouts differ (some CJS+ESM, some CJS-only); check a
  package's own `package.json` `main`/`module`/`exports` before assuming.

## Related docs

- **`CONFIGURATION.md`** (repo root) — the monorepo configuration reference:
  the three `tsconfig*.json` families and who extends which, the pnpm catalog,
  lint/test conventions, build tooling per package, CI/CD architecture, and a
  gotchas list. This CLAUDE.md file is about _working_ in the repo; that one is
  about how the repo's tooling is _wired_ — link to it for configuration detail
  rather than duplicating it here.
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
(`.claude/skills/dependabot-triage/`) — it has the full playbook and this repo's
durable traps (the `minimumReleaseAge` age gate, the `dependabot.yml` ignore
policy, the electron `rebuild:native` verification step).

## Before committing

Run `pnpm run ci` from the root. Add a changeset (`pnpm changeset`) for any
user-facing change to **any** workspace package — private apps included (see the
`releasing` skill); "published" only decides whether the
change also reaches npm, not whether it gets a changeset. This project drives
hardware — cover edge cases and prefer the mock adapter for automated tests.
