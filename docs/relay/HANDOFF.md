# Handoff — UltimateDarkTowerRelay

A working handoff for continuing this repo in a fresh session. Canonical specs:
[docs/prd/prd-relay.md](prd/prd-relay.md) (the spec) and [docs/tasks/tasks-prd-relay.md](tasks/tasks-prd-relay.md)
(the roadmap — one parent task per PRD §12 phase).

**Done so far:** Phase 1 (scaffold/relay parity), Phase 2 (NotificationSynthesizer), Phase 3 (client SDK +
configurable DIS), Phase 4 **FR-5.1** (real-tower source — hardware-validated live), and **FR-5.2** (the
physical-tower-replay consumer `PhysicalTowerReplay` — unit-tested **and hardware-validated live**: a
physical tower mirrored relayed rotations end-to-end in Chrome), and **FR-5.3** (real-tower resilience —
`RealTower` rebuilt on UDT's high-level class for monitored reconnect + initial-retry, **hardware-validated
clean reconnect**, via a new UDT `onTowerResponse` hook consumed by npm link; plus the app→real-tower bridge
write-back `TOWER_SOURCE=bridge`, code-complete, hardware-validation pending). **Next: EventLog (4.2) / Electron
GUI (4.1) / Sync migration (4.5).**

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
| `packages/client` | `ultimatedarktowerrelay-client` | **`RelayClient`** SDK (`relayClient.ts`): handshake, decoded-`state` + event subscriptions, participant `dropSkull()`, backoff reconnect, version-mismatch, isomorphic WebSocket (injectable for Node). **`PhysicalTowerReplay`** (`physicalTowerReplay.ts`, FR-5.2): writes relayed 20-byte commands to a local tower via an injected `TowerWriter`. Publish-ready (not published) |
| `packages/cli` | `ultimatedarktowerrelay-cli` | headless daemon: `TOWER_SOURCE=fake\|mock\|real`, `TOWER_DIS_*` env, SIGINT/SIGTERM; `mockConsumer.ts` (SDK-backed, `MOCK_ROLE=participant`) |

Tooling: TS strict + composite refs, ESLint(`.eslintrc.js`, legacy)/Prettier, Jest(ts-jest→CJS),
`.github/workflows/ci.yml` (lint→type-check→test→build, Node 18/20, macOS+Ubuntu).

Demos: `npm run start:mock` + `MOCK_ROLE=participant npm run mock:consumer` (BLE-free, exercises the SDK +
synthesizer). `TOWER_SOURCE=real npm start` connects to a physical tower and relays its state — **validated
live** (a real skull drop relayed end-to-end with correct decoded count).

## Locked decisions / resolved facts — do not re-litigate

- **Real-tower mode (FR-5.1/FR-5.3) drives the tower via UDT's high-level `UltimateDarkTower` class**
  (not the raw `NodeBluetoothAdapter`). The class runs the connection monitoring (GATT health + verified
  battery-heartbeat) and fires `onTowerDisconnect`; `RealTower` wraps an injected `TowerDriver` (the class
  satisfies it structurally), relays the tower's raw 20-byte state via the new public **`onTowerResponse`**
  hook, and must be the **sole** connection to the tower. `@stoprocent/noble` is an **optional** dependency
  (the driver is constructed lazily at connect; tests inject a mock `TowerDriver`, so no noble).
- **Real-tower resilience (FR-5.3) is done + hardware-validated (2026-06-17).** `RealTower` reconnects on
  drop with capped exponential backoff (`1→2→4→8→16→30s`; re-emits `companion-disconnected`/`-connected`
  → relay pause/resume) and retries the initial connect in the background (`reconnect: true`, default —
  start the relay before the tower is on). Reconnect uses UDT's **documented pattern**: on
  `onTowerDisconnect`, call `connect()` again (not `cleanup()`, which disposes the instance). Drop
  *detection* is the library's job (don't hand-roll it). **Confirmed live:** initial-retry connected on
  power-up; a power-cycle produced a clean **1 disconnect → 1 reconnect → resume**, no listener cascade.
  The test helper sets `reconnect: false` to keep plain tests timer-free.
- **No hand-rolled stall detection.** An earlier custom notification-silence "stall" timer was wrong (the
  tower actually streams ~1–2 notifications/sec; it false-positived) and reusing the raw adapter leaked
  noble listeners → a `bluetooth-unavailable` cascade. Both are gone — the high-level class's monitoring
  replaces them.
- **`onTowerResponse` hook added to UDT (sibling repo).** New public assignable callback delivering the
  raw verbatim notification bytes (the public `onTowerStateUpdate` is decoded). The relay consumes the
  modified UDT via **`npm link`** to the local repo for now; **before the relay's GitHub CI / ship works,
  UDT must publish the hook and the relay must bump its `ultimatedarktower` dep** (published 4.0.1 lacks it).
- **Write-back / bridge mode (resolves §11 Q5).** `RealTower.sendToTower(data)` writes verbatim via the
  driver (`sendTowerCommandDirect`). `TOWER_SOURCE=bridge` runs FakeTower (app connects) **+** RealTower
  (relay drives a real master tower), forwarding every app command onto the real tower while broadcasting
  to consumers. **Caveat:** needs the host BLE stack to be peripheral (bleno) *and* central (noble) at once
  — may need a 2nd dongle; hardware-validation pending.
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

## FR-5.2 — physical-tower-replay consumer (DONE)

`PhysicalTowerReplay` (`packages/client/src/physicalTowerReplay.ts`) is the "remote mirror" consumer Sync's
remote players use: each remote player runs a `RelayClient` **and** a `PhysicalTowerReplay` that writes every
relayed 20-byte command to their own physical tower so it mirrors the host's master tower. (Digital,
screen-only consumers like UTDD render `RelayClient`'s decoded `state` events instead and don't use it.)

Design decisions (locked):
- **Composition, not a new subscriber API.** `RelayClient` stays transport-only (its single `onEvent` is
  unchanged). The app fans `onEvent` out to both its own UI handler and `replay.handleEvent(event)` — the
  same shape Sync's `app.ts` uses (render *and* replay in one switch). It replays the raw-bearing events
  `tower:command` / non-null `sync:state` / `host:resend` (not `state`, which would double-write).
- **Injected `TowerWriter`, browser-free SDK.** The local tower is an injected `TowerWriter`
  (`{ isConnected; isCalibrated; sendTowerCommandDirect(Uint8Array) }`) — UDT's `UltimateDarkTower`
  satisfies it structurally. `physicalTowerReplay.ts` has **zero runtime imports** (no `ultimatedarktower`
  value, no browser global), so it is unit-tested with a mock writer (no browser/BLE/hardware).
- **Lifecycle stays in the app.** Web Bluetooth connect/calibrate needs a user gesture, so the browser app
  owns it and calls `replay.setTower(tower)` / `replay.replayLast()` / `client.sendReady(...)` on the
  tower's `onCalibrationComplete` / `onTowerDisconnect`. Writes are **tower-ready-gated**
  (`isConnected && isCalibrated`) and **serialized** through a promise queue so concurrent commands can't
  interleave BLE writes; `replayLast()` self-heals a tower that reconnects mid-session (FR-5.3 touch).

Browser wiring (the owner's app / future Sync client) — callbacks assigned **before** connect/calibrate:
```ts
const replay = new PhysicalTowerReplay({ onLog });
const client = new RelayClient({ label, observer: false,
  onEvent: (e) => { replay.handleEvent(e); appUiHandler(e); } });
const tower = new UltimateDarkTower();        // auto Web Bluetooth on connect()
tower.onTowerDisconnect    = () => { replay.setTower(null);  client.sendReady(false); };
tower.onCalibrationComplete = () => { replay.setTower(tower); client.sendReady(true); void replay.replayLast(); };
await tower.connect(); await tower.calibrate();
```

**Hardware-validated live (2026-06-17).** Real end-to-end in Chrome: a physical tower mirrored relayed
rotation commands from a running host relay. Tower-ready gate held writes until calibration; `replayLast()`
self-heal fired on calibration-complete; steady-state per-command writes rotated the drums; no write errors.
Re-validate with the throwaway harness in `examples/replay-e2e/` (host injector + browser page; see its
`README.md`). VSCode's embedded browser can't show the Web Bluetooth chooser — use real Chrome/Edge.

## FR-5.3 — real-tower resilience + app→real-tower bridge (DONE)

Generic resilience (paused/resumed, WS reconnect+backoff, ping/pong keepalive, handshake timeout,
dead-client, observer) was already ported in Phases 1–3 (`connectionManager.ts`, `relayServer.ts`,
`relayClient.ts`). This slice closed the real-tower gaps and added write-back:
- **`RealTower` rebuilt onto the high-level `UltimateDarkTower` class** (via an injected `TowerDriver`).
  The library does the disconnect *detection* (GATT health + verified battery-heartbeat → `onTowerDisconnect`);
  `RealTower` adds the reconnect *policy* — reconnect-on-drop (capped backoff) + initial-connect retry,
  per UDT's documented `onTowerDisconnect → connect()` pattern. Relays the raw 20-byte state via UDT's new
  public `onTowerResponse` hook. Options: `reconnect`/`reconnectBaseMs`/`reconnectMaxMs`.
- **Bridge write-back:** `RealTower.sendToTower(data)` (→ `sendTowerCommandDirect`) + `TOWER_SOURCE=bridge`
  (FakeTower forwards every app command verbatim onto a real master tower). See locked-decisions for the
  dual-role BLE caveat.
- **Tests:** `realTower.test.ts` rewritten with a mock `TowerDriver` (reconnect/initial-retry via Jest fake
  timers; verbatim write; no-op-when-disconnected). Bridge CLI wiring is hardware-validated (can't be
  unit-tested without bleno). Drop *detection* is covered by the UDT repo's own tests.

**Hardware validation (2026-06-17, `TOWER_SOURCE=real` on macOS):**
- ✅ initial-connect retry — started with the tower off, retried `1→2→4→8→16→30s`, connected on power-up.
- ✅ reconnect-on-drop — power-cycle produced a clean **1 disconnect → 1 reconnect attempt → resume**, with
  **no `bluetooth-unavailable` cascade and no `MaxListeners` leak** (the failure mode of the earlier
  hand-rolled raw-adapter version, now removed).
- ⏳ pending: bridge mode (app → FakeTower → real tower) on a non-macOS host; concurrent central+peripheral
  BLE caveat. And the **UDT publish + relay dep-bump** so GitHub CI passes without the npm link.

## Next: EventLog (4.2) / Electron GUI (4.1) / Sync migration (4.5)

Out of scope here / future slices: EventLog persistence/replay (4.2), Electron operator GUI (4.1),
analyzeLogs CLI (4.4), Sync migration (4.5), UTDD `BridgeSource` (3.3).

## Workflow

Follow the `../ai-dev-tasks` PRD→tasks workflow. **Use plan mode**: explore the relevant code (Sync's
replay path + UDT Web Bluetooth driver), verify assumptions against the actual code/exports, propose a
plan, get approval before writing code. Keep CI green (lint→type-check→test→build) and tests BLE/browser-free
(mock the tower driver). STOP for review before the next slice.
