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

## Tests

Two vitest suites (`relayClient.test.ts` with a hand-rolled `MockWebSocket`,
`physicalTowerReplay.test.ts`). Jest-style globals + `vi` fake timers, enabled via
**`vitest.config.ts`** (`globals: true`) rather than a `--globals` CLI flag — same setup as
`relay-core`; `test` is plain `vitest run`. Runs in CI's `checks` job via `pnpm -r test`.
`tsconfig.json` excludes `*.test.ts` from the composite build.

## Build & coupling

`build` = `tsc --build` (CJS) **+ an esbuild ESM sidecar** (`dist/esm/index.mjs`), exposed as the
`import` export condition with `require` still on the CJS entry — the same dual shape
`packages/game-data` uses. The sidecar exists because browser consumers (`apps/digital`'s PRD-05
bridge) otherwise get CommonJS interop shims; don't drop it, and keep `--packages=external` so
workspace deps resolve through their own export maps. Node consumers are unaffected.

Depends on `ultimatedarktowerrelay-shared` + `ultimatedarktower` (`workspace:^`); `ws` is a devDep
only (for the Node injection pattern, not bundled). Consumed by `apps/relay-cli` and `apps/digital`
— `apps/relay-electron` is a host, not a client.
