# packages/relay-core (`ultimatedarktowerrelay-core`) — headless relay engine

BLE-emulator + WebSocket relay engine. Central docs: `docs/relay/` (repo root).

## Tests exist but CI never runs them

There are **8 real vitest suites** here (`commandParser.test.ts`, `relayServer.integration.test.ts`,
`towerState.roundtrip.test.ts`, …) but **no `test` script** and no local `vitest` devDep, so
`pnpm -r test` and `pnpm run ci` **silently skip this package**. (CI's `relay-native` job
comment "the relay packages currently have no unit tests" is stale/wrong.) To run them, use
the hoisted binary from the package dir: `npx vitest run`. `tsconfig.json` excludes
`*.test.ts` from the composite build, so `tsc --build` stays clean regardless.

## Test discipline (keep it BLE-free)

Import the **specific module under test**, never the `src/index.ts` barrel — the barrel
re-exports `TowerEmulator`, which pulls in `@stoprocent/bleno`. Inject mocks (mock BLE
adapter for `RealTower`, mock `WebSocket` for client-adjacent code).
`relayServer.integration.test.ts` spins up a real `RelayServer` + `ws` clients on an
OS-assigned free port, no BLE.

## Architecture

- **`TowerSource` (`src/towerSource.ts`) is the seam** — `TowerEmulator`, `MockTower`, and
  `RealTower` all implement it; the CLI picks one via the `TOWER_SOURCE` env var.
- `@stoprocent/noble` is lazily constructed only at connect time (`optionalDependencies`),
  so emulator/mock paths never load it.
- **macOS can't expose the BLE Device Information Service in peripheral mode** — CoreBluetooth
  blocks standard SIG UUIDs, so the emulator can only pass the companion app's firmware gate
  on Linux/Windows. See `docs/relay/MACOS_BLE_PERIPHERAL_LIMITATION.md`.

## Build & coupling

`build` = `tsc --build`. Depends on `ultimatedarktowerrelay-shared`, `ultimatedarktower`
(`workspace:^`), `ultimatedarktowerdata` (`workspace:*`), plus `@stoprocent/bleno` + `ws`.
Consumed by `apps/relay-cli` and `apps/relay-electron` (not by `relay-client`).
Two `// TODO`s in `src/commandParser.ts` (fuller packet inspection, checksum validation).
