# apps/relay-cli (`ultimatedarktowerrelay-cli`) — relay CLI (**published**)

The relay composition root — wires a selected `TowerSource` into a `RelayServer`. This is
where `relay-core` + `relay-client` + `relay-shared` are exercised together at runtime.
Central docs: `docs/relay/` (repo root).

## It publishes to npm — `npx ultimatedarktowerrelay-cli` is the user-facing entry point

This is the **second** app with `private: false` (after `apps/mcp-server`), because `npx` is
how a player is meant to run the relay: no clone, no `pnpm install`, no build. It works
because `@stoprocent/bleno` + `@stoprocent/noble` ship N-API `prebuilds/` (win32-x64/ia32,
darwin-x64+arm64, linux-x64/arm/arm64) resolved by `node-gyp-build` — **no compiler needed**,
except on Windows-on-ARM, which has no prebuild.

Consequences to keep in mind when editing this package:

- **Two `bin` entries**, one matching the package name exactly. npx's "single bin" fallback is
  where `could not determine executable to run` comes from — don't collapse them to one.
- **`src/index.ts` starts with a shebang.** tsc preserves it into `dist/index.js`; don't let a
  formatter or a header rewrite drop it.
- **`sourceMap`/`declarationMap` are off** in `tsconfig.json` on purpose — `files` ships `dist`
  but not `src`, so maps would point at files that aren't in the tarball.
- **No `prepack`/`prepublishOnly`.** `changeset publish` runs them, and the monorepo strips
  devDeps at that point (the trap documented in the root CLAUDE.md for `apps/mcp-server`).
- **Adding it to npm was a token change too** — the granular `NPM_TOKEN` is a fixed package
  allow-list; see the root CLAUDE.md's release section.

## Runtime env vars

- **`TOWER_SOURCE`** — `emulator` | `mock` | `real` | `bridge` (picks the `TowerSource` impl).
- **`RELAY_PORT`** — WebSocket port (default `8765`).
- **`TOWER_DIS_*`** — Device Information Service overrides (e.g. `TOWER_DIS_FIRMWARE_REVISION`).
- **`LOGGING=0`** — disable JSONL file logging.
- **`RELAY_LOG_DIR`** — log directory (default `./logs`, **cwd-relative** — under `npx` that's
  wherever the user ran the command, not the package dir).

Extra entrypoints beyond `start`: `replay` (`node dist/replayEvents.js`) and `analyze`
(`node dist/analyzeLogs.js`).

## CI build gotcha

The `relay-native` CI job builds via `pnpm --filter "./packages/relay-*..." --filter
"./apps/relay-cli..."` — but the `...` path-glob selector does **not** expand to workspace
deps of deps, so the job must **also** `--filter` in `ultimatedarktower` and
`ultimatedarktowerdata` by name, or the build fails with "Cannot find module 'ultimatedarktower'".

`test` = `vitest run --passWithNoTests` (currently 0 test files). Depends on all three relay
packages + `ultimatedarktower` (`workspace:^`) + `ws`.
