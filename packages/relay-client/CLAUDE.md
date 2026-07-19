# packages/relay-client (`ultimatedarktowerrelay-client`) — relay consumer SDK

Framework-agnostic, **isomorphic** relay consumer SDK. Central docs: `docs/relay/` (repo root).

## Conventions

- **Never import `relay-core`.** This is a deliberate architectural rule (see
  `docs/relay/ARCHITECTURE.md`): the client imports only `relay-shared` + `ultimatedarktower`
  types, so it stays BLE-free and browser-safe. Importing core pulls in `@stoprocent/bleno`.
- **Isomorphic WebSocket**: there's no global `WebSocket` in Node, so `RelayClient` takes a
  `webSocketImpl` to inject one; browser callers rely on the global.
- Auto-reconnect uses exponential backoff, but **refuses to reconnect on close code `4000`**
  (`CLOSE_CODE_PROTOCOL_VERSION_MISMATCH`) — a version mismatch is a hard disconnect, by design.
- `PhysicalTowerReplay` mirrors host commands onto a local tower via a structural
  `TowerWriter` interface (no direct BLE/hardware import).

## Tests exist but CI never runs them

Two vitest suites (`relayClient.test.ts` with a hand-rolled `MockWebSocket`,
`physicalTowerReplay.test.ts`) but **no `test` script** and no local `vitest` devDep — same
silent-skip situation as `relay-core`. Run with `npx vitest run` from the package dir.

## Build & coupling

`build` = `tsc --build`. Depends on `ultimatedarktowerrelay-shared` + `ultimatedarktower`
(`workspace:^`); `ws` is a devDep only (for the Node injection pattern, not bundled).
Consumed by `apps/relay-cli` only — `apps/relay-electron` is a host, not a client.
