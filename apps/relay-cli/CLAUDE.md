# apps/relay-cli (`ultimatedarktowerrelay-cli`) — relay CLI (private)

The relay composition root — wires a selected `TowerSource` into a `RelayServer`. This is
where `relay-core` + `relay-client` + `relay-shared` are exercised together at runtime.
Central docs: `docs/relay/` (repo root).

## Runtime env vars

- **`TOWER_SOURCE`** — `emulator` | `mock` | `real` | `bridge` (picks the `TowerSource` impl).
- **`RELAY_PORT`** — WebSocket port (default `8765`).
- **`TOWER_DIS_*`** — Device Information Service overrides (e.g. `TOWER_DIS_FIRMWARE_REVISION`).
- **`LOGGING=0`** — disable JSONL file logging.

Extra entrypoints beyond `start`: `replay` (`node dist/replayEvents.js`) and `analyze`
(`node dist/analyzeLogs.js`).

## CI build gotcha

The `relay-native` CI job builds via `pnpm --filter "./packages/relay-*..." --filter
"./apps/relay-cli..."` — but the `...` path-glob selector does **not** expand to workspace
deps of deps, so the job must **also** `--filter` in `ultimatedarktower` and
`ultimatedarktowerdata` by name, or the build fails with "Cannot find module 'ultimatedarktower'".

`test` = `vitest run --passWithNoTests` (currently 0 test files). Depends on all three relay
packages + `ultimatedarktower` (`workspace:^`) + `ws`.
