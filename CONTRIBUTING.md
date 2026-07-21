# Contributing

Thanks for helping improve Ultimate Dark Tower! This is a pnpm monorepo — see the
[README](README.md) for the package/app map and [CONFIGURATION.md](CONFIGURATION.md) for how the
workspace tooling is set up (TypeScript config families, lint/test conventions, CI/CD, gotchas).

## Setup

Requires **Node ≥ 22.13** and **pnpm ≥ 11** (`packageManager` pins pnpm 11.9.0 — pnpm 11 loads the
built-in `node:sqlite`, so install fails outright on Node 20).

```bash
pnpm install
pnpm run ci   # validate:nodes → lint → format:check → build → typecheck → test
```

On Linux, the relay BLE native deps need system headers:
`sudo apt-get install -y libbluetooth-dev libudev-dev`.

## Workflow

1. Branch off `main`.
2. Make your change in the relevant `packages/*` or `apps/*` workspace.
3. Keep changes green: `pnpm run ci` (or `pnpm --filter <pkg> {build,test,typecheck}` while iterating).
4. Format: `pnpm run format`.
5. If you changed a **published** package (`ultimatedarktower`, `ultimatedarktowerdisplay`,
   `ultimatedarktowerboard`, `ultimatedarktowerdata`, `ultimatedarktowerrelay-{shared,core,client}`,
   or `apps/mcp-server`), add a changeset: `pnpm changeset` — pick the packages, bump type, and a
   summary. Commit the generated file. (Publishing is driven by each package's `private` flag, not
   this list — see CONFIGURATION.md if a package's status is unclear.)
6. Open a PR against `main`. CI runs `pnpm run ci` plus the relay-native matrix.

## Conventions

- **One TypeScript version** for the whole workspace via the `catalog:` entry in
  `pnpm-workspace.yaml`. Reference it as `"typescript": "catalog:"`.
- **Cross-package deps** use the `workspace:^` protocol; `peerDependencies` stay as semver ranges.
- **Formatting/lint:** single root `.prettierrc` and `eslint.config.js`. Both `lint` and
  `format:check` are `pnpm run ci` gates — don't add per-package `eslint`/Prettier devDeps or
  configs (see CONFIGURATION.md for why that breaks lint workspace-wide).
- **Don't commit build output** (`dist/`) — it is gitignored and built in CI.

## Merging

The monorepo `main` is append-only. Merges that import history **must** be merge commits or
fast-forwards — never squash (squash flattens imported history).
