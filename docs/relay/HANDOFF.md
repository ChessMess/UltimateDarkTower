# Handoff — UltimateDarkTowerRelay

A working handoff for continuing this repo in a fresh session. Canonical specs:
[docs/prd/prd-relay.md](prd/prd-relay.md) (the spec) and [docs/tasks/tasks-prd-relay.md](tasks/tasks-prd-relay.md)
(the roadmap — one parent task per PRD §12 phase).

**Done so far:** Phase 1 (scaffold/relay parity), Phase 2 (NotificationSynthesizer), Phase 3 (client SDK +
configurable DIS), Phase 4 **FR-5.1** (real-tower source — hardware-validated live), and **FR-5.2** (the
physical-tower-replay consumer `PhysicalTowerReplay` — unit-tested **and hardware-validated live**: a
physical tower mirrored relayed rotations end-to-end in Chrome), and **FR-5.3** (real-tower resilience —
`RealTower` rebuilt on UDT's high-level class for monitored reconnect + initial-retry, **hardware-validated
clean reconnect**, via a new UDT `onTowerResponse` hook (published in `ultimatedarktower@4.1.0`, consumed
from the registry — link removed); plus the app→real-tower bridge
write-back `TOWER_SOURCE=bridge`, code-complete, hardware-validation pending), and **FR-6 / task 4.2 EventLog**
(append-only JSONL semantic-event log with its own monotonic `seq` + replay/export + thin `replayEvents` CLI;
all 8 `RelayEvent` types now emit), and **FR-8.2 / task 4.4 analyzeLogs** (read-only log-analysis CLI over the
`HostLogger` `session-*.jsonl` logs — summary/timeline/correlation/LED/anomalies/per-client, BLE-free unit-tested),
and **task 4.1 — the Electron operator GUI** (`packages/electron` over `core`, with runtime
**fake/mock/real source switching**; Electron 42 + Forge/Vite). **Slice A** = status dashboard +
manual controls; **Slice B** = the in-GUI **log viewer** (Logs panel over the same JSONL the relay
writes), and **task 4.5 — Sync migration** (Sync now consumes this repo **client-only**; this repo gained
`RelayClient.sendRaw` and the `docs/PROTOCOL.md` + `docs/FAKE_TOWER.md` reference docs). **Next: UTDD
`BridgeSource` (3.3).**

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
- `docs/PROTOCOL.md` — the client↔host WebSocket message protocol (incl. `client:action` + `host:resend`).
- `docs/FAKE_TOWER.md` — the BLE return-traffic / echo-timing behavior the companion app's state machine needs.
- `docs/MACOS_BLE_PERIPHERAL_LIMITATION.md` — why macOS can't expose the DIS ("checking firmware").
- Sibling repos to lift/evolve from (**do not modify** Sync/UDT/UTDD without explicit approval):
  - `../UltimateDarkTowerSync/packages/{shared,host,client,electron}` — origin of most ported code;
    `packages/client/src/{towerRelay.ts,app.ts}` is the basis for the SDK + (for FR-5.2) the replay logic.
  - `../UltimateDarkTower/src` — UDT core: `rtdt_pack_state`/`rtdt_unpack_state`, `udtConstants.ts`,
    `udtBleConnection.ts`; adapters `WebBluetoothAdapter` (browser) / `NodeBluetoothAdapter` (node) +
    `BluetoothAdapterFactory`; the high-level `UltimateDarkTower` class (connect + sendTowerState/command).
  - `../UltimateDarkTowerDigital/src/sources/types.ts` — the `TowerStateSource` seam a future UTDD
    `BridgeSource` (task 3.3) wraps; the relay's `RelayClient` is designed to map onto it.

## Current state (verified — `npm run ci` green, 123 tests; Electron GUI not unit-tested, matching Sync)

npm-workspaces monorepo; unscoped package names like the UDT family (root private `ultimatedarktowerrelay`).
`main` contains Phases 1→4(FR-5.1) as four commits.

| Package | Name | Contents |
|---|---|---|
| `packages/shared` | `ultimatedarktowerrelay-shared` | protocol envelope/`MessageType`/factories (+`client:action`), `LogEntry`, **`RelayEvent` union** (`relayEvents.ts`), `PROTOCOL_VERSION='0.1.0'` |
| `packages/core` | `ultimatedarktowerrelay-core` | `fakeTower` (configurable **DIS** via `deviceInfo`), `relayServer` (+`onClientAction`), `connectionManager`, `commandParser`, `logger`, **`eventLog`** (FR-6: append-only `RelayEvent` JSONL + `loadEventLog`/`replayEventLog`/`exportEventLog`), `observerDisplay`, `towerSource` seam, `mockTower`, **`notificationSynthesizer`**, **`deviceInfo`**, **`realTower`** (FR-5.1), **`logAnalysis`** (pure session-log analysis helpers — relocated from `cli` in 4.1 Slice B); `index.ts` barrel |
| `packages/client` | `ultimatedarktowerrelay-client` | **`RelayClient`** SDK (`relayClient.ts`): handshake, decoded-`state` + event subscriptions, participant `dropSkull()`, backoff reconnect, version-mismatch, isomorphic WebSocket (injectable for Node). **`PhysicalTowerReplay`** (`physicalTowerReplay.ts`, FR-5.2): writes relayed 20-byte commands to a local tower via an injected `TowerWriter`. Publish-ready (not published) |
| `packages/cli` | `ultimatedarktowerrelay-cli` | headless daemon: `TOWER_SOURCE=fake\|mock\|real`, `TOWER_DIS_*` env, SIGINT/SIGTERM; `mockConsumer.ts` (SDK-backed, `MOCK_ROLE=participant`); `replayEvents.ts` (EventLog inspect/replay/export — `npm run replay:events`); **`analyzeLogs.ts`** (FR-8.2 log analysis over `session-*.jsonl` — `npm run analyze:logs`; the pure helpers now live in `core/logAnalysis`, imported bleno-free via `…-core/dist/logAnalysis`) |
| `packages/electron` | `ultimatedarktowerrelay-electron` | **operator GUI** (FR-7.3, task 4.1 Slice A): Vite + Electron Forge app over `core`. Main process is the relay composition root made **source-swappable** (`buildSource`/`wireSource`/`switchSource` — fake/mock/real, synth + EventLog) + IPC; renderer = status dashboard, source selector, manual controls (skull drop/resend/start-stop/logging toggle), client list + LAN URLs. **Electron 42 / Node 24.** Not in root `tsc --build` refs or Jest — vite-built; type-checked via `tsc --noEmit -p packages/electron/tsconfig.json`. Run with `npm run start:electron`; package `npm run make:electron` |

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
- **`onTowerResponse` hook added to UDT (sibling repo) — published + consumed from the registry
  (2026-06-18).** New public assignable callback delivering the raw verbatim notification bytes (the
  public `onTowerStateUpdate` is decoded). Shipped in **`ultimatedarktower@4.1.0`**; the relay's
  `packages/{core,client}` deps are bumped to `^4.1.0` and the dev `npm link` is **removed** — `npm run
  ci` is green against the registry copy with no symlink. (UDT's CI `npm audit` step was also scoped to
  `--omit=dev` to unblock the publish — see below.) `docs/DEV_LINKS.md` §1 is now marked resolved.
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
- ✅ **UDT publish + relay dep-bump done (2026-06-18):** `ultimatedarktower@4.1.0` published; relay deps
  bumped to `^4.1.0`; npm link removed; `npm run ci` green against the registry copy — GitHub CI no
  longer needs the symlink.
- ⏳ pending: bridge mode (app → FakeTower → real tower) on a non-macOS host; concurrent central+peripheral
  BLE caveat.

## FR-6 / task 4.2 — EventLog (DONE)

The hybrid state model's append-only half (PRD §7): `EventLog` (`packages/core/src/eventLog.ts`) is a
**separate stream from `HostLogger`** — `HostLogger` keeps the byte/command + human debug log; `EventLog`
persists the structured `RelayEvent`s. Modeled on `HostLogger` (session-timestamp naming, `enabled` toggle,
size-based rotation), it writes one JSON object per line to `events-{date}.jsonl` and assigns each event its
**own monotonic `seq`** (independent of the relay's command-broadcast `seq`, per `relayEvents.ts` + §7).
- **No `ultimatedarktower` import** (only the `RelayEvent` type from shared + `node:fs`) → loads BLE-free;
  tests import `./eventLog` directly and run against a temp dir (`eventLog.test.ts`, 11 cases).
- **All 8 event types now emit** (`relayEvents.ts` previously only had 4 wired): the CLI is the composition
  root — it appends `app-connected`/`-disconnected` (source `companion-*`), `consumer-joined`/`-left`
  (relay `onClientConnected`/`onClientDisconnected`), and routes the synthesizer's stream
  (`command-received`/`skull-dropped`/`calibration-complete`/`heartbeat`) into the log. **Real-mode gap
  closed:** the synthesizer only runs for sink-capable sources, so `TOWER_SOURCE=real` has no synth —
  `command-received` is appended directly from the universal `source.on('command')` handler (the branches
  are mutually exclusive, so no double-emit).
- **Replay/export (FR-6.3):** `loadEventLog(path)` (JSONL → `RelayEvent[]`, skips malformed, sorts by seq),
  `replayEventLog(events, onEvent, { realtime?, speed? })` (sync or wall-clock-paced, delay clamped to 10s),
  `exportEventLog(events, 'json'|'jsonl')`. Thin CLI `packages/cli/src/replayEvents.ts`
  (`npm run replay:events -- --file … [--replay [--realtime] [--speed n]] [--export json|jsonl]`) imports
  those helpers **bleno-free** via `ultimatedarktowerrelay-core/dist/eventLog` (NOT the `core` barrel, which
  pulls in FakeTower→bleno — a log reader must never init Bluetooth).

## FR-8.2 / task 4.4 — analyzeLogs CLI (DONE)

Read-only log-analysis CLI over the `HostLogger` `session-*.jsonl` command/all logs (PRD FR-8.2),
ported from Sync's `analyzeLogs.ts`. `npm run analyze:logs` (or `node packages/cli/dist/analyzeLogs.js`)
prints a session summary, command timeline (with decoded LED-override / audio names), per-seq
correlation matrix, LED-override analysis, anomaly detection, and per-client latency. Flags:
`--dir <path>` (default `./logs`), `--session <date>` (filename prefix filter), `--led-focus`,
`--seq <n>`, `--anomalies`.
- **Pure logic split out for testing.** `logAnalysis.ts` holds the fs/console-free
  helpers (`ledSeqName`/`audioName` from UDT `TOWER_LIGHT_SEQUENCES`/`TOWER_AUDIO_LIBRARY`,
  `selectLogFiles`, `parseLogLines`, `detectAnomalies`); `analyzeLogs.ts` is the thin CLI (argv + fs +
  the `print*` reporters). Reuses the shared `decodeCommand`/`bytesFromHex`/`formatLogEntry` decoder.
  Unit-tested BLE/fs-free (`logAnalysis.test.ts`, in-memory fixtures). **Relocated `cli`→`core` in 4.1
  Slice B** so the Electron GUI can reuse it; the CLI now imports it bleno-free via the
  `ultimatedarktowerrelay-core/dist/logAnalysis` subpath (NOT the `core` barrel — same pattern
  `replayEvents` uses for `eventLog`), so reading logs still never initializes Bluetooth. Slice B also
  added pure `buildSessionSummary`/`buildCommandTimeline` data-builders (the structured form of the
  `print*` reporters) for the GUI, with their own unit tests (22 cases total now).
- **Two relay-specific deviations from the verbatim port:** (1) scoped to `session-*` filenames so it
  ignores the EventLog's `events-*.jsonl` (read by `replayEvents`) in the same dir; (2) MISSING_SEQ is
  gated on the presence of `client←host` entries — the relay's bundled consumers (`mockConsumer`) don't
  report logs back by default (the SDK now **supports** it via `RelayClient.sendRaw`, e.g. Sync's
  `ClientLogger`), so relay-only sessions are host-only and the unguarded check would false-positive every
  broadcast seq. The correlation / per-client sections degrade gracefully on host-only data and grow
  richer once a consumer reports logs back.

## Electron operator GUI (task 4.1 / FR-7.3) — Slices A + B (DONE)

`packages/electron` is a disciplined port of `../UltimateDarkTowerSync/packages/electron` (lifecycle/IPC/
Forge skeleton) with the wiring swapped for the relay's composition. **`src/main/main.ts` is the relay
composition root** (mirrors `packages/cli/src/index.ts`) made **runtime source-swappable**:
`buildSource(mode)` (fake→`FakeTower`+sink, mock→`MockTower`+sink, real→`RealTower`, no sink),
`wireSource()` (attaches the command/state/lifecycle handlers + builds the `NotificationSynthesizer`
for sink-capable sources, routing its events to the `EventLog`), `switchSource(mode)` (pause →
`stopAdvertising`+`removeAllListeners`+`destroy` → rebuild/rewire/start; relay+logger+eventLog stay up).
`bridge` is **not** offered in the GUI (dual-role bleno+noble caveat) — env `TOWER_SOURCE=bridge` falls
back to fake.

Locked decisions / gotchas:
- **`ble-adapter-state` + `ghost-connection` are FakeTower-only** (not on `TowerSource`) — wired under
  `instanceof FakeTower`; the renderer's BLE-adapter panel reads `n/a` for mock/real. **Skull drop** goes
  through `currentSynth.dropSkull()` (emits the EventLog `skull-dropped` event) and is disabled for the
  real source (it self-reports). **Logging toggle** flips **both** `HostLogger` and `EventLog` + relay
  `broadcastLogConfig`.
- **"Stop BLE" on macOS does NOT drop an already-connected companion app** — `bleno.disconnect()` is a
  no-op on macOS (CoreBluetooth has no peripheral-initiated disconnect API; see the comment in
  `fakeTower.ts` + `docs/MACOS_BLE_PERIPHERAL_LIMITATION.md`). It stops advertising and the relay goes
  idle/paused, but the OS keeps the GATT link until the process exits. On **Linux/Pi** (the real
  deployment target) `bleno.disconnect()` works and the button disconnects the app. macOS-only dev
  limitation — not fixable from our side.
- **Electron 42 (Node 24).** Bumped off Sync's EOL `electron@^35`; `@electron-forge/*@^7.11`, `vite@^8`,
  `@electron/rebuild@^4`. Electron 42 has **no postinstall binary download** (fetches on first run), so
  adding electron to the workspace does **not** bloat `npm ci`; `ci.yml` is unchanged. `@types/node@^24`
  already matched. Doc-review caveats: macOS OS-notifications need code-signing (N/A — none used);
  Linux/Pi defaults to **Wayland** (may need `--ozone-platform=x11` for the GUI on an X11 Pi).
- **`npm run start:electron` is the single happy-path command** — a smart launcher
  (`scripts/start-electron.mjs`) that (1) incrementally builds `shared`+`core`, (2) ensures
  `@stoprocent/{bleno,noble}` match the Electron ABI, (3) clears `ELECTRON_RUN_AS_NODE` (cross-platform,
  and VS Code's terminal sets it) and launches `electron-forge start`. No sequencing knowledge needed;
  just run it. The other electron scripts stay for specific needs.
- **Native ABI:** `electron-rebuild` is **scoped to the electron scripts** (no global `postinstall`), so
  a plain `npm install` keeps the natives at the **Node** ABI (147) for the CLI; `start:electron` flips
  them to the **Electron** ABI (146). `rebuild:electron` runs **without `--force`**, so `@electron/rebuild`
  cache-restores (keyed by ABI+electron version+source hash) — only the first launch per Electron version
  compiles; repeats are ~0.4s (verified). To return to the **Node CLI** afterwards, run **`npm run
  rebuild:node`** (`= npm rebuild @stoprocent/bleno @stoprocent/noble`); the next `start:electron`
  re-restores the Electron ABI from cache. ⏳ Owner validation: GUI launch +
  `make:electron` packaging + the @stoprocent rebuild against Electron 42's Node-24 ABI (fall back to
  `electron@^41` if it fails). The Electron main is not unit-tested (matches Sync); `npm run ci` (118
  tests) covers the rest, and Vite bundles main+preload cleanly.

Build/run: `npm run start:electron` (dev), `npm run make:electron` (package). Logs go to the app's
`userData/logs` (`session-*.jsonl` + `events-*.jsonl`), same formats the CLI writes. **`make:electron`
validated 2026-06-18** — darwin/arm64 `.zip` + `.dmg` produced (Vite bundles built, natives rebuilt +
packaged).
- **Known benign warning:** `make` prints `inlineDynamicImports option is deprecated, please use
  codeSplitting: false instead`. It comes from `@electron-forge/plugin-vite`
  (`dist/config/vite.preload.config.js` hardcodes `inlineDynamicImports: true`), which Vite 8/rolldown
  now deprecates — **not our config**, and the build output is correct. Clears when Forge updates the
  plugin; pinning `vite@^7` would also silence it (optional downgrade, not done).

### Slice B — in-GUI log viewer (DONE)

The "Logs" panel in the operator console surfaces the two JSONL streams the relay already writes to the
app's `userData/logs` (`session-*.jsonl` from `HostLogger`, `events-*.jsonl` from `EventLog`),
read-only. **Analysis runs in the main process** (it has `fs`); the renderer never reads files.
- **Helpers relocated to `core`.** The pure `logAnalysis` helpers moved `cli`→`core` (they import only
  shared + UDT constants — BLE-free), plus two new pure data-builders `buildSessionSummary` /
  `buildCommandTimeline` (the structured form of the CLI's `print*` reporters — the GUI builds data
  objects, it does NOT call the console reporters). All are re-exported from the `core` barrel and
  unit-tested in `core/src/logAnalysis.test.ts`. The CLI's `analyzeLogs` now imports them bleno-free via
  `ultimatedarktowerrelay-core/dist/logAnalysis` (NOT the barrel — the `replayEvents`→`eventLog`
  pattern). Electron `main` already loads the `core` barrel, so it consumes them directly (bleno is
  loaded regardless there).
- **IPC (main → renderer):** `logs:list` (`selectLogFiles` for sessions + an `events-*` filter, with
  size/mtime), `logs:analyze` (`parseLogLines` → `buildSessionSummary` + `buildCommandTimeline({limit:
  500})` + `detectAnomalies`, anomalies trimmed to `{type,message}`), `logs:load-events`
  (`loadEventLog`, capped to the last 2000 with a `truncated`/`total` flag). Every requested filename is
  `path.basename`'d + pattern-validated against the fixed `logDir` — the renderer can't read arbitrary
  paths. Caps bound the IPC payload + DOM; the CLIs remain the unbounded path.
- **Renderer:** the recording controls (Pause/Resume, Open Logs Folder) and the log viewer (Refresh +
  session select→Analyze + event-file select→Load Events; Summary / color-coded Anomalies / scrollable
  decoded Command Timeline / scrollable Event Log) are **merged into one collapsible "Logging"
  section** (full-width, sibling under the dashboard grid). A chevron control before the title
  collapses/expands the body; the **ON/OFF recording badge** (color-coded green/grey) lives in the
  always-visible header, so state is clear when collapsed. **Starts collapsed by default.** The file
  lists populate via a **guarded, non-awaited** `refreshLogs()` (not in the critical `init()` await
  chain) so a not-yet-registered IPC handler can't abort init. Renderer/preload use **type-only**
  imports from shared/core (the empty preload/renderer Vite configs erase them).
- **Window sizing/state.** Width + position are **persisted** to `userData/window-state.json` (saved
  debounced on resize/move + flushed on close, restored on launch if still on-screen). **Height
  auto-fits the rendered content**: the renderer measures `#app` height + body padding and asks main
  (`window:resize-content-height`, one-way IPC) to `setContentSize` to fit — on first paint and
  whenever the Logging section collapses/expands (or analysis results render) — **clamped to the
  display work area** (`screen.getDisplayMatching`), so the launch height matches the layout and the
  window grows/shrinks with the section but never exceeds the screen. The window is created
  `show: false` and revealed after the first measurement (with a 1.8s safety net) to avoid a size jump.
- `npm run ci` green (**123 tests**); the renderer + `index.html` + `styles.css` bundle clean via Vite.
  ⏳ Owner validation (repo convention): GUI launch + the Logs panel against real on-disk logs +
  window auto-fit/persistence (the GUI/windowing paths can't be exercised headlessly).

## Sync migration (task 4.5) — DONE

`UltimateDarkTowerSync` now consumes this repo and is a **client-only** product: **the relay is what the
host runs; Sync is what the clients run.** Sync deleted its own `host`/`electron`/`shared` packages and its
`client` rewired onto this repo's published SDK — `RelayClient` (transport) + `PhysicalTowerReplay` (the
remote-mirror replay consumer). Cross-repo changes that landed here:
- **`RelayClient.sendRaw(json)`** — the transport escape hatch a consumer uses to send pre-serialized
  client→host messages (e.g. Sync's `ClientLogger`'s `client:log` batches). Closes the client→host emit gap
  (FR-5.4); unit-tested.
- **Reference docs migrated in:** `docs/PROTOCOL.md` (the wire protocol, made relay-accurate with
  `client:action` + `host:resend`) and `docs/FAKE_TOWER.md` (the echo-timing behavior, from Sync's old
  technical spec). Sync keeps short pointer stubs.
- **§11 Q8 resolved** (how Sync consumes the relay): `file:` deps during development → **publish at
  cutover**. The interim `file:` dependency is tracked in `docs/DEV_LINKS.md` §4; the cutover (publish
  `ultimatedarktowerrelay-{shared,core,client}` + Sync swaps `file:`→`^0.1.0`) is the remaining owner-gated
  step. Sync's GitHub CI stays red on `npm ci` until then (the relay sibling isn't present).

## Next: UTDD `BridgeSource` (3.3)

## Workflow

Follow the `../ai-dev-tasks` PRD→tasks workflow. **Use plan mode**: explore the relevant code (Sync's
replay path + UDT Web Bluetooth driver), verify assumptions against the actual code/exports, propose a
plan, get approval before writing code. Keep CI green (lint→type-check→test→build) and tests BLE/browser-free
(mock the tower driver). STOP for review before the next slice.
