# Contributing

Thanks for helping improve Ultimate Dark Tower! This is a pnpm monorepo — see the
[README](README.md) for the package/app map.

## Setup

Requires **Node ≥ 20** and **pnpm ≥ 10**.

```bash
pnpm install
pnpm run ci   # validate:nodes → build → typecheck → test
```

On Linux, the relay BLE native deps need system headers:
`sudo apt-get install -y libbluetooth-dev libudev-dev`.

## Workflow

1. Branch off `main`.
2. Make your change in the relevant `packages/*` or `apps/*` workspace.
3. Keep changes green: `pnpm run ci` (or `pnpm --filter <pkg> {build,test,typecheck}` while iterating).
4. Format: `pnpm run format`.
5. If you changed a **published** package (`ultimatedarktower`, `ultimatedarktowerdisplay`,
   `ultimatedarktowerboard`, `ultimatedarktowerrelay-{shared,core,client}`), add a changeset:
   `pnpm changeset` — pick the packages, bump type, and a summary. Commit the generated file.
6. Open a PR against `main`. CI runs `pnpm run ci` plus the relay-native matrix.

## Conventions

- **One TypeScript version** for the whole workspace via the `catalog:` entry in
  `pnpm-workspace.yaml`. Reference it as `"typescript": "catalog:"`.
- **Cross-package deps** use the `workspace:^` protocol; `peerDependencies` stay as semver ranges.
- **Formatting/lint:** single root `.prettierrc` and `eslint.config.js`. (Lint has known
  pre-existing debt and is not yet a CI gate — don't add new violations.)
- **Don't commit build output** (`dist/`) — it is gitignored and built in CI.
- **History:** pre-merge repo history is preserved under `docs/history/` — don't edit it.

## Merging

The monorepo `main` is append-only. Merges that import history **must** be merge commits or
fast-forwards — never squash (squash flattens imported history).
