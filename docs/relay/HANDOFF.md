# Handoff — UltimateDarkTowerRelay

A working handoff for continuing this repo in a fresh session. Canonical specs:
[docs/prd/prd-relay.md](prd/prd-relay.md) (the spec) and [docs/tasks/tasks-prd-relay.md](tasks/tasks-prd-relay.md)
(the roadmap — one parent task per PRD §12 phase).

**Done so far:** Phase 1 (scaffold/relay parity), Phase 2 (NotificationSynthesizer), Phase 3 (client SDK +
configurable DIS), and Phase 4 **FR-5.1** (real-tower source — hardware-validated live). **Next: FR-5.2 —
the physical-tower-replay consumer.**

## What this is

A Node/Electron app that connects to the official *Return to Dark Tower* companion app **as a fake BLE
tower** and relays tower traffic to digital consumers over WebSocket on the LAN, plus a published client
SDK. It can also connect to a **real** tower (central) and relay its state. It is a disciplined
extraction/port from the sibling repo `UltimateDarkTowerSync`, built on the published `ultimatedarktower`
core lib, and is the shared bridge Sync will later consume.

## Read first

- `docs/prd/prd-relay.md` — goals, FR-1..FR-8, architecture, state model, constraints, phasing (§12),
  open questions (§11 — Q4 resolved), reuse map (§14).
- `docs/tasks/tasks-prd-relay.md` — the roadmap (2.x/3.x done; 4.3 partial = FR-5.1 done).
- `docs/SETUP.md` — per-platform run guide (macOS / Raspberry Pi / Windows; fake/mock/**real** modes).
- `docs/MACOS_BLE_PERIPHERAL_LIMITATION.md` — why macOS can't expose the DIS ("checking firmware").
- Sibling repos to lift/evolve from (**do not modify** Sync/UDT/UTDD without explicit approval):
  - `../UltimateDarkTowerSync/packages/{shared,host,client,electron}` — origin of most ported code;
    `packages/client/src/{towerRelay.ts,app.ts}` is the basis for the SDK + (for FR-5.2) the replay logic.
  - `../UltimateDarkTower/src` — UDT core: `rtdt_pack_state`/`rtdt_unpack_state`, `udtConstants.ts`,
    `udtBleConnection.ts`; adapters `WebBluetoothAdapter` (browser) / `NodeBluetoothAdapter` (node) +
    `BluetoothAdapterFactory`; the high-level `UltimateDarkTower` class (connect + sendTowerState/command).
  - `../UltimateDarkTowerDigital/src/sources/types.ts` — the `TowerStateSource` seam a future UTDD
    `BridgeSource` (task 3.3) wraps; the relay's `RelayClient` is designed to map onto it.

## Current state (verified — `npm run ci` green, 71 tests)

npm-workspaces monorepo; unscoped package names like the UDT family (root private `ultimatedarktowerrelay`).
`main` contains Phases 1→4(FR-5.1) as four commits.

| Package | Name | Contents |
|---|---|---|
| `packages/shared` | `ultimatedarktowerrelay-shared` | protocol envelope/`MessageType`/factories (+`client:action`), `LogEntry`, **`RelayEvent` union** (`relayEvents.ts`), `PROTOCOL_VERSION='0.1.0'` |
| `packages/core` | `ultimatedarktowerrelay-core` | `fakeTower` (configurable **DIS** via `deviceInfo`), `relayServer` (+`onClientAction`), `connectionManager`, `commandParser`, `logger`, `observerDisplay`, `towerSource` seam, `mockTower`, **`notificationSynthesizer`**, **`deviceInfo`**, **`realTower`** (FR-5.1); `index.ts` barrel |
| `packages/client` | `ultimatedarktowerrelay-client` | **`RelayClient`** SDK (`relayClient.ts`): handshake, decoded-`state` + event subscriptions, participant `dropSkull()`, backoff reconnect, version-mismatch, isomorphic WebSocket (injectable for Node). Publish-ready (not published) |
| `packages/cli` | `ultimatedarktowerrelay-cli` | headless daemon: `TOWER_SOURCE=fake\|mock\|real`, `TOWER_DIS_*` env, SIGINT/SIGTERM; `mockConsumer.ts` (SDK-backed, `MOCK_ROLE=participant`) |

Tooling: TS strict + composite refs, ESLint(`.eslintrc.js`, legacy)/Prettier, Jest(ts-jest→CJS),
`.github/workflows/ci.yml` (lint→type-check→test→build, Node 18/20, macOS+Ubuntu).

Demos: `npm run start:mock` + `MOCK_ROLE=participant npm run mock:consumer` (BLE-free, exercises the SDK +
synthesizer). `TOWER_SOURCE=real npm start` connects to a physical tower and relays its state — **validated
live** (a real skull drop relayed end-to-end with correct decoded count).

## Locked decisions / resolved facts — do not re-litigate

- **Real-tower mode (FR-5.1) is done + hardware-validated.** `RealTower` connects as a BLE **central** via
  UDT's `NodeBluetoothAdapter`, **read-only** (relays the tower's 20-byte state; battery beats filtered);
  must be the **sole** connection (official app disconnected). `@stoprocent/noble` is an **optional**
  dependency (lazy-loaded; injectable mock adapter keeps it out of tests).
- **No `TOWER_ADDRESS` selector.** All towers advertise as `ReturnToDarkTower`; name-based scan is the
  deliberate choice (single tower is the common case; the owner powers multiple towers on sequentially).
- **DIS / "checking firmware" (resolves §11 Q4):** the official app needs the DIS firmware revision;
  macOS can't expose the DIS, so a **non-macOS host (Pi/Windows)** is the standalone fake-tower path.
  DIS identity is configurable (`FakeTower({ deviceInfo })` / `TOWER_DIS_*`).
- **Calibration synthesis:** default reply is a tower-state response with all drums calibrated (pos 0),
  built via `rtdt_pack_state`; reply-type byte is configurable (0x00 default, 0x08 = `CALIBRATION_FINISHED`).
  Exact bytes capture-pending. **No periodic heartbeat** (initial + echoes suffice; opt-in fallback exists).
  Seal break is app-command-driven, NOT synthesized; only `dropSkull()` is synthesized.
- Sync is NOT retired — this repo is the bridge Sync consumes. LAN-only v1. Hybrid state model
  (last-command snapshot + append-only `RelayEvent` log; EventLog persistence is a later Phase-4 slice).
- Naming: unscoped `ultimatedarktowerrelay-*`; wire protocol kept a **superset** of Sync's for a low-churn
  cutover (only additive messages like `client:action`).

## Conventions / gotchas

- **ts-jest type-checks cross-package imports against built `dist/*.d.ts`** (jest's `moduleNameMapper` only
  affects runtime). After changing a `shared`/`core`/`client` public API, run `npm run type-check`
  (`tsc --build`) **before** `jest` in isolation, or you get phantom `TS2305` errors. `npm run ci` already
  orders it correctly.
- **Native BLE deps load lazily / stay out of tests:** `FakeTower` imports `@stoprocent/bleno` at top level
  (verbatim port — do NOT lazy-load); `RealTower` reaches noble only via `BluetoothAdapterFactory.create(NODE)`
  at connect time. Tests stay BLE-free by importing the **specific** module (never the `core` barrel) and
  injecting mocks (mock `IBluetoothAdapter` for RealTower, mock `WebSocket` for RelayClient).
- The `TowerSource` seam (`startAdvertising`/`stopAdvertising` + `on('command'|'state-change'|
  'companion-connected'|'companion-disconnected')`) is satisfied by `FakeTower`, `MockTower`, `RealTower`.
  fake/mock also implement `NotificationSink`; the CLI wires the synthesizer only for sink-capable sources.
- Client SDK is **isomorphic**: browser global `WebSocket`, or inject `webSocketImpl` (e.g. `ws`) in Node.
- Keep `core` headless/library-style. Don't commit/push unless asked. `package-lock.json` committed for CI.

## Next: FR-5.2 — physical-tower-replay consumer (PRD §12.4 / tasks 4.3 remainder)

Add a consumer mode where the client SDK **writes relayed commands to a local real tower via Web Bluetooth**
— the consumer type Sync's remote players use (each remote player's tower mirrors the relayed/master state).

1. Study how Sync's browser client replays (`../UltimateDarkTowerSync/packages/client/src/app.ts`) and UDT's
   `WebBluetoothAdapter` + `UltimateDarkTower` class (connect via Web Bluetooth; `sendTowerState`/command
   writes a 20-byte packet to the tower's write characteristic).
2. Design where replay lives: keep `RelayClient` transport-only; add a thin **`PhysicalTowerReplay`** consumer
   in `packages/client` that subscribes to `RelayClient` (`'tower:command'`/`'state'`) and writes each
   relayed 20-byte packet to a local tower via a UDT tower driver. Keep it framework-agnostic; Web Bluetooth
   is browser-only, so the tower driver is injected (don't hard-couple the SDK to a browser global).
3. Resilience touches (FR-5.3) that pair naturally: replay the last command on local-tower reconnect;
   gate on tower-ready (`client:ready`).
4. **Unit-test** the replay decision/write logic with a mock tower-writer (no browser/hardware). Real
   end-to-end needs a browser + a physical tower (owner's hardware step) — call that out; don't guess byte
   shapes beyond the validated 20-byte state.

Out of scope for this slice: Electron GUI (4.1), EventLog persistence/replay (4.2), analyzeLogs CLI (4.4),
Sync migration (4.5), UTDD `BridgeSource` (3.3).

## Workflow

Follow the `../ai-dev-tasks` PRD→tasks workflow. **Use plan mode**: explore the relevant code (Sync's
replay path + UDT Web Bluetooth driver), verify assumptions against the actual code/exports, propose a
plan, get approval before writing code. Keep CI green (lint→type-check→test→build) and tests BLE/browser-free
(mock the tower driver). STOP for review before the next slice.
