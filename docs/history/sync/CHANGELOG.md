# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- **Client proceeded as connected after cancelling Bluetooth dialog** — Cancelling the browser's Bluetooth device picker left the client in a half-connected state (button showed "Connected to Tower", calibration attempted). Added a defensive `isConnected` guard after `tower.connect()` so the client correctly resets even if the library silently swallows the connection error.

- **Ghost BLE connection state desync (macOS)** — After clicking "Stop BLE" while
  the companion app was connected, the host entered a state where commands flowed
  (relay count incremented) but the UI showed "Idle" with no green indicator.
  Toggling Start Advertising / Stop BLE had no effect on the actual BLE connection.

  **Root cause:** macOS CoreBluetooth has no peripheral-initiated disconnect API.
  `CBPeripheralManager` has no `disconnect` method and `CBPeripheralManagerDelegate`
  has no `didDisconnectCentral:` callback (confirmed via Apple documentation). The
  `bleno.disconnect()` call maps to an empty Objective-C method — a platform
  limitation, not a bleno bug. When Stop BLE is pressed, the companion app's BLE
  link survives the stop/start cycle. On the next Start Advertising, neither the
  `accept` event (blocked by bleno's native `connectedCentrals` set which never
  clears known centrals) nor `onSubscribe` (companion doesn't resubscribe since it
  believes it already is) fires, leaving FakeTower stuck in `advertising` state.

  **Fixes applied:**
  - `onWriteRequest` now detects ghost connections: if a BLE write arrives while in
    `advertising` state, the state machine promotes to `connected` and emits
    `companion-connected`. A write can only arrive on an active BLE link.
  - `stopAdvertising()` now explicitly emits `companion-disconnected` when stopping
    from `connected` state, since `bleno.disconnect()` cannot trigger it on macOS.
  - New `ghost-connection` diagnostic event emitted and logged to session JSONL for
    post-session troubleshooting.
  - Diagnostic `console.log` entries added to `startAdvertising()` and
    `stopAdvertising()` showing prior state, aiding startup log analysis.

- **Duplicate `client:disconnected` broadcasts** — `RelayServer` registered both
  `close` and `error` handlers that called the same cleanup function. When a
  socket error preceded close (which always follows), cleanup ran twice,
  broadcasting a duplicate disconnect notification. Added a guard flag so cleanup
  executes at most once per client.
- **Map mutation during broadcast iteration** — `ConnectionManager.broadcast()`
  called `this.remove(id)` inside a `for…of` loop over the clients map when a
  send threw. While ES spec allows this, it can skip entries unpredictably.
  Failed client IDs are now collected and removed after the loop completes.
- **Log cap removing text nodes** — `UI.log()` used `firstChild!` to trim
  entries beyond the 200-entry cap, which could skip over whitespace text nodes.
  Changed to `firstElementChild!` so only `<p>` element nodes are removed.

### Changed

- **Client reconnect attempts capped at 10** — the client no longer retries indefinitely after losing the WebSocket connection to the host. After 10 failed attempts it stops, re-enables the "Connect to Host" button, and logs a message prompting the user to reconnect manually. The exponential backoff (1 s → 30 s max) is otherwise unchanged.
- Remove stale scaffolding log messages from host entry point
  ("Implement FakeTower and RelayServer to proceed") that were leftover from
  initial development
- Simplify redundant ternary in `CommandParser.parse()`
  (`Array.from(data instanceof Buffer ? data : data)` → `Array.from(data)`)
- Bump `@dark-tower-sync/shared` version from 0.1.2 → 0.1.3 for consistency
  with host and client packages

### Tests

- Remove unused `bytes` variable and `void bytes` suppressor in
  `logger.test.ts` setEnabled test

## [0.1.3] - 2026-03-22

### Added

- **Connection and log-send events in JSONL logs** — the following events are now
  recorded as structured `event`-level entries in `session-*-host.jsonl` and
  `session-*-all.jsonl`, making it possible to correlate tower commands with
  connection lifecycle changes in a single log file:
  - FakeTower BLE adapter state changes (`idle → advertising → connected`)
  - Companion app connect / disconnect from FakeTower
  - Relay client WebSocket connect / disconnect (includes player label when known)
  - Remote client tower BLE connect / disconnect (the `client:ready` signal)
  - Client manually clicking "Send Logs Now" (entry logged before the flush so it
    appears in the submitted batch)
  - Host receiving a client log batch (meta-event with entry count)
  - `RelayServer` gains `onClientConnected`, `onClientDisconnected`, and
    `onClientReady` optional callbacks in `RelayServerOptions`; both the Electron
    host (`packages/electron/src/main/main.ts`) and standalone Node host
    (`packages/host/src/index.ts`) wire these to `logger.logEvent()`

### Fixed

- **Packaged app crash on launch (v0.1.0 DMG):** The v0.1.0 release built native
  modules against CI's Node.js v20, but Electron 35 uses Node.js v22. The ABI
  mismatch caused an immediate crash with no visible error. The release workflow
  now runs `electron-rebuild` before packaging to recompile native addons for the
  correct Electron ABI.
- **Duplicate `servicesSetError` listener:** `bleno.on('servicesSetError', ...)`
  was registered inside `startAdvertising()` with an anonymous function,
  accumulating listeners on each call. Moved to a named handler registered once
  in the constructor.
- **`_isStarting` guard never reset on stop:** If `stopAdvertising()` was called
  while `startAdvertising()` was in-flight, the `_isStarting` flag stayed `true`
  forever, blocking all future advertising. Now reset in `stopAdvertising()`.
- **Shutdown hang leaking port 8765:** `ConnectionManager.destroy()` cleared
  timers but did not terminate client WebSocket connections, causing `wss.close()`
  to wait for graceful close handshakes. If that exceeded the 5-second timeout,
  SIGKILL fired and the port leaked on next launch. `destroy()` now terminates
  all client sockets before clearing the map.
- **macOS `servicesSetError` noise:** CoreBluetooth blocks standard Bluetooth SIG
  16-bit UUIDs in peripheral mode, so the Device Information Service (0x180A) is
  now skipped on macOS with a one-time warning. See
  `docs/MACOS_BLE_PERIPHERAL_LIMITATION.md`.

### Added

- **Startup file logging:** The Electron main process writes a detailed startup
  log to `~/Library/Application Support/@dark-tower-sync/electron/startup.log`.
  Captures platform info, module load results, uncaught exceptions, and all
  console output. Falls back to `os.tmpdir()` if `app.getPath('userData')` is
  unavailable before app ready.
- **Lazy native module loading:** Host modules (`@dark-tower-sync/host`) are
  loaded via dynamic `import()` inside `initApp()` instead of static imports.
  File logging is guaranteed to be active before any native module loads, and
  failures surface a clear error dialog.

## [0.1.0] - 2026-03-21

### Added

- **v0.1.0 release workflow** — `.github/workflows/release.yml` triggers on
  `v*` tags, builds the Electron DMG on macOS via `electron-forge make`, runs
  the test suite, and uploads DMG + ZIP artifacts to the GitHub Release using
  `softprops/action-gh-release@v2`.

- **Testing guide** — `docs/TESTING.md` documents how to run, debug, and extend
  the test suite: quick-start commands, test layout, what to look for in output,
  coverage generation, CI matrix details, and conventions for writing new tests.

- **Protocol version enforcement** — the host now disconnects clients whose
  `protocolVersion` in `client:hello` does not match `PROTOCOL_VERSION`, using
  custom WebSocket close code `4000` (`CLOSE_CODE_PROTOCOL_VERSION_MISMATCH`).
  The client suppresses auto-reconnect on code 4000 and emits a
  `relay:version-mismatch` event so the UI can show a "please hard-reload"
  overlay. Added integration tests for mismatch, match, and missing-version
  scenarios.

- **Log file rotation** — `HostLogger` accepts a `maxFileSizeBytes` option; when a
  log file exceeds the limit, the current stream closes and a new numbered segment
  opens (`session-{ts}-host-2.jsonl`). Electron host defaults to 10 MB per file.
- **Old log pruning** — `pruneOldLogs(dir, maxAgeDays)` utility deletes `.jsonl`
  files older than 30 days; called automatically at Electron startup.

- **Observer mode** — browser clients can now connect with `?observer` in the URL
  to view a live tower state visualizer without requiring a physical tower or Web
  Bluetooth. Observer clients receive all `tower:command` messages and decode them
  using `rtdt_unpack_state()` from the `ultimatedarktower` library.
  - `packages/client/src/towerVisualizer.ts` — new `TowerVisualizer` class renders
    24 LEDs (6 light effects with CSS animations), 3 drum positions with glyph
    detection, audio sample name lookup via `TOWER_AUDIO_LIBRARY`, skull drop
    detection (beam-count delta between consecutive packets), and LED sequence
    override labels
  - `packages/shared/src/types.ts` — `observer: boolean` added to `ConnectedClient`;
    `observerCount: number` added to `HostStatus`
  - `packages/shared/src/protocol.ts` — `observer?: boolean` added to
    `ClientHelloMessage` payload
  - `packages/host/src/connectionManager.ts` — `observersConnected` getter for
    counting observer clients
  - `packages/host/src/relayServer.ts` — reads `observer` flag from `client:hello`,
    includes `observerCount` in periodic `host:status` broadcasts
  - `packages/client/src/towerRelay.ts` — accepts `observer` option, includes it
    in `client:hello` payload
  - `packages/client/src/app.ts` — detects `?observer` URL parameter; hides tower
    Bluetooth card; decodes commands with `rtdt_unpack_state()` and updates
    visualizer; shows observer count in relay status
  - `packages/client/index.html` — `#visualizer-section` card (hidden by default,
    shown in observer mode)
  - `packages/client/src/client.css` — visualizer styles with LED effect animations

### Fixed

- **Wire `CommandParser` into relay path** — `CommandParser.isValid()` is now
  called before `RelayServer.broadcast()` in both the standalone host
  (`packages/host/src/index.ts`) and Electron main process
  (`packages/electron/src/main/main.ts`). Malformed packets (not exactly 20
  bytes) are dropped with a `console.warn` instead of being forwarded to all
  connected clients.

### Tests

- Add `tests/unit/host/relayGate.test.ts` — 4 tests verifying the relay gate:
  valid 20-byte commands reach `relay.broadcast`; short, empty, and oversized
  packets do not.

### Changed

- UI polish pass — refined dark theme with improved depth, typography, and interactive states across both the client web app and Electron host; client UI is now mobile-friendly with proper touch targets, iOS zoom prevention, safe-area inset support, and responsive layouts for phone and tablet use



### Added

- **Resilience & reconnection system** — robust failure handling across all four
  failure surfaces (companion BLE, WebSocket, remote tower BLE, app crash)
  - `relay:paused` / `relay:resumed` protocol messages — host broadcasts
    immediately when the companion app disconnects from or reconnects to
    FakeTower, replacing the previous 5-second `host:status` polling delay
  - `relay:tower:alert` protocol message — host broadcasts when any remote
    player's tower BLE connection changes, so all peers and the dashboard see
    who has a live tower
  - `appConnected` and `towersConnected` fields added to `HostStatus` for
    explicit companion app and aggregate tower health tracking
  - `towerConnected` and `towerLastSeenAt` fields added to `ConnectedClient`
    for per-player tower health tracking on the host
  - WebSocket ping/pong keepalive (20-second interval) — detects dead clients
    (browser tabbed out, network gone) within 40 seconds instead of waiting
    for TCP timeout
  - 10-second `CLIENT_HELLO` handshake timeout — zombie clients that connect
    but never send a handshake are removed automatically
  - `readyState` checks in `ConnectionManager.broadcast()` and `sendTo()` —
    prevents throws when sending to closing/closed sockets during reconnection
  - Self-healing tower replay — client caches `lastCommandBytes` from
    `tower:command` and `sync:state`; on tower BLE reconnect after
    recalibration, the last command is replayed automatically
  - Reconnection UI feedback — client shows "Reconnecting in Xs (attempt N)…"
    during auto-reconnect instead of flat "disconnected"
  - Client pause overlay — full-screen overlay appears on `relay:paused` and
    clears on `relay:resumed`, preventing player actions while the host's
    companion app is disconnected
  - Reconnect timer race guard — `connect()` cancels any pending auto-reconnect
    timer to prevent duplicate WebSocket connections
  - Per-player tower health grid in Electron dashboard — each client row shows
    relay ✓ and tower ✓/✗ indicators with amber alert banner when any player's
    tower disconnects
- **Troubleshooting guide** — `docs/TROUBLESHOOTING.md` operational runbook
  covering tower disconnects, relay drops, companion app issues, Bluetooth
  permissions, and Web Bluetooth browser compatibility
- **Setup tips** — iOS auto-lock prevention and BLE range notes added to
  `docs/SETUP.md`

- **Structured logging system** — persistent, structured JSONL logging across all
  components for post-session diagnostics and cross-component command correlation
  - `packages/shared/src/logging.ts` — shared `LogEntry`, `LogDirection`, `LogLevel`,
    and `DecodedCommand` types; `decodeCommand()` maps the 20-byte tower packet into
    named fields (cmdType, drumStates, ledStates, audio, beamBreak, volumeDrumBeam,
    ledOverride); `hexFromBytes()`/`bytesFromHex()` conversion utilities;
    `makeCommandLogEntry()`/`makeEventLogEntry()` factory functions;
    `formatLogEntry()` for human-readable single-line output
  - `packages/host/src/logger.ts` — `HostLogger` class writes two JSONL files per
    session: `session-{date}-host.jsonl` (host-only) and `session-{date}-all.jsonl`
    (host + client interleaved); master `enabled` switch (default `true`, togglable
    at runtime); `logCommand()`, `logEvent()`, `writeClientEntries()` methods; no-op
    when disabled but streams stay open for instant resumption
  - `packages/client/src/clientLogger.ts` — `ClientLogger` with 500-entry ring buffer;
    auto-sends unsent entries to host every 30 seconds via `client:log` WebSocket
    message; manual `sendLogs()` and local `downloadAsFile()` (Blob + anchor download)
    always work regardless of master switch; `setAutoSend()` responds to
    `host:log-config` broadcasts; `flush()` on relay disconnect
  - `packages/host/scripts/analyzeLogs.ts` — CLI log analysis tool
    (`npm run analyze -w packages/host`); options: `--dir`, `--session`, `--led-focus`,
    `--seq`, `--anomalies`; produces session summary, command timeline, host↔client
    correlation matrix, LED override analysis (byte 19 decoded via UDT
    `TOWER_LIGHT_SEQUENCES`), anomaly detection (missing seq, duplicate seq, time gaps,
    hex mismatches), and per-client summary
- **Monotonic sequence numbers on relayed commands** — `RelayServer.broadcast()` now
  assigns an incrementing `seq` to each `tower:command` message, enabling cross-log
  correlation between host and client entries regardless of clock skew
  - `packages/shared/src/protocol.ts` — `TowerCommandMessage` payload gains optional
    `seq: number`; `makeTowerCommandMessage()` accepts optional second `seq` parameter
- **`client:log` protocol message** — clients batch-submit structured log entries to
  the host for centralized persistent storage
  - `packages/shared/src/protocol.ts` — `CLIENT_LOG` added to `MessageType`,
    `ClientLogMessage` type and union member
  - `packages/host/src/relayServer.ts` — handles `CLIENT_LOG` messages, forwards
    entries to `onClientLog` callback; accepts `onClientLog` in `RelayServerOptions`
  - `packages/client/src/towerRelay.ts` — `sendRaw()` method for log submission
- **`host:log-config` protocol message** — host broadcasts logging toggle to clients
  - `packages/shared/src/protocol.ts` — `HOST_LOG_CONFIG` added to `MessageType`,
    `HostLogConfigMessage` type, `makeHostLogConfigMessage()` factory
  - `packages/host/src/relayServer.ts` — `broadcastLogConfig()` method
  - `packages/client/src/towerRelay.ts` — new `host:log-config` event type
  - `packages/client/src/app.ts` — handles event, toggles `ClientLogger.setAutoSend()`
- **Electron host logging dashboard card** — new Logging card in dashboard with
  ON/OFF badge, status dot, "Pause/Resume Logging" toggle, and "Open Logs Folder"
  button
  - `packages/electron/index.html` — `#card-logging` section
  - `packages/electron/src/renderer/renderer.ts` — `setLoggingState()`, toggle and
    open-folder click handlers, feedback display
  - `packages/electron/src/main/preload.ts` — `toggleLogging()`, `getLoggingState()`,
    `openLogDir()` exposed via contextBridge
  - `packages/electron/src/main/main.ts` — `TOGGLE_LOGGING`, `GET_LOGGING_STATE`,
    `OPEN_LOG_DIR` IPC handlers; HostLogger instantiation with
    `app.getPath('userData')/logs`; logger wired into command event flow with seq;
    `logger.close()` in shutdown sequence
- **Client logging UI** — "Send Logs to Host" and "Download Logs" buttons in client
  web app
  - `packages/client/index.html` — Logs card with two buttons
  - `packages/client/src/ui.ts` — `sendLogsBtn` and `downloadLogsBtn` properties
  - `packages/client/src/app.ts` — button bindings, logger lifecycle wiring
- **Host standalone logging** — `packages/host/src/index.ts` wired with HostLogger,
  `LOGGING=0` env var support; `HostLogger` re-exported for library consumers
- **Documentation updated** — `docs/TECHNICAL_SPECIFICATION.md` §9 documents the full
  logging system; `docs/PROTOCOL.md` documents `client:log`, `host:log-config`, and
  `seq` on `tower:command`; `ARCHITECTURE.md` updated with logging data flow diagram

### Fixed

- **Electron window too small for dashboard content** — increased default
  `BrowserWindow` height from 520 to 680; added `overflow-y: auto` to body for
  scroll fallback when content exceeds window height

- **Fake tower BLE on/off controls** — the Electron host dashboard now has two
  labeled buttons in the BLE Tower card ("Start Advertising" and "Stop BLE") so
  the operator can suppress BLE advertising without quitting the app — useful when
  the companion app needs to connect to a real physical tower instead
  - `packages/electron/index.html` — "Start Advertising" and "Stop BLE" buttons
    added as a dedicated action row above the skull-drop control
  - `packages/electron/src/main/main.ts` — `TOWER_START_ADVERTISING` and
    `TOWER_STOP_ADVERTISING` IPC channel constants; two `ipcMain.handle()` handlers
    that call `tower.startAdvertising()` / `tower.stopAdvertising()` and return
    `{ ok, reason? }` consistent with the skull-drop pattern
  - `packages/electron/src/main/preload.ts` — `startTowerAdvertising()` and
    `stopTowerAdvertising()` exposed via `contextBridge`
  - `packages/electron/src/renderer/renderer.ts` — `DarkTowerSyncAPI` interface
    extended with the two new methods; `setTowerState()` manages button enabled
    states (Stop BLE enabled when advertising/connected; Start Advertising enabled
    when idle/error); click handlers disable the button immediately to prevent
    double-clicks and delegate re-enable to the `onTowerState` subscription;
    separate feedback span for BLE lifecycle errors
  - `packages/electron/src/renderer/styles.css` — `.text-btn` class for
    readable labeled buttons alongside the existing `.icon-btn`
- **`docs/TECHNICAL_SPECIFICATION.md` updated** — §4.2 and §8 document the new
  BLE on/off operator controls and the expanded IPC surface

### Fixed

- **Session fields not reset on manual `stopAdvertising()`** —
  `_txUpdateValue`, `_connectedAddress`, `_skullDropCount`, and `_lastCommand`
  were previously only reset inside `_onDisconnect`, which is removed from bleno
  before `bleno.disconnect()` fires during a manual stop. They now reset inside
  `stopAdvertising()` directly before calling `bleno.disconnect()`.
- **Concurrent `startAdvertising()` calls** — the existing `if (this._advertising)
return` guard is only set after the full async chain completes (up to 10 seconds).
  Added `_isStarting: boolean` flag set at the top of `startAdvertising()` and
  cleared in both success and failure paths to prevent a second concurrent
  invocation during the BLE wait.

- **Tower calibration on connect** — client now calls `tower.calibrate()` after
  BLE connect and waits for `onCalibrationComplete` before marking the tower as
  ready; UI shows "Tower calibrating…" (amber dot) during this phase
- **`client:ready` protocol message** — new WebSocket message type allowing
  clients to signal tower readiness to the host
  - `packages/shared/src/protocol.ts` — added `CLIENT_READY` to `MessageType`,
    `ClientReadyMessage` type, `makeClientReadyMessage()` factory
  - `packages/shared/src/types.ts` — added `'ready'` to `ClientConnectionState`
  - `packages/client/src/towerRelay.ts` — added `sendReady(ready)` method
  - `packages/client/src/app.ts` — sends `ready: true` after calibration
    completes; sends `ready: false` on tower disconnect (manual or unexpected);
    sends immediate `ready: true` if tower is already calibrated when relay
    connects; guards `replayOnTower()` to skip commands while calibrating
  - `packages/host/src/relayServer.ts` — handles `CLIENT_READY` messages,
    updates client state to `'ready'` or `'connected'`
  - `packages/electron/src/renderer/renderer.ts` — shows `[ready]` /
    `[connecting tower…]` badges next to client names in the dashboard
  - `packages/client/src/ui.ts` — added `'calibrating'` to `UiConnectionState`
- **Protocol docs** — documented `client:ready` message in `docs/PROTOCOL.md`,
  updated connection lifecycle diagram and key rules

- **Client web app — full WebSocket + Web Bluetooth implementation**
  - `packages/client/src/towerRelay.ts` — implemented WebSocket connection lifecycle
    with `CLIENT_HELLO` handshake, `PROTOCOL_VERSION` negotiation, and typed event
    dispatch for all relay message types (`tower:command`, `sync:state`, `host:status`,
    `client:connected`, `client:disconnected`)
  - Auto-reconnect with exponential backoff (`min(1s × 2^n, 30s)`) on non-clean
    WebSocket close; user-initiated disconnect (code 1000) suppresses reconnect
  - `packages/client/src/app.ts` — Web Bluetooth tower integration via
    `ultimatedarktower` library (auto-detects `WebBluetoothAdapter` in browser)
  - `replayOnTower()` writes raw 20-byte command packets via `sendTowerCommandDirect()`
    — no calibration needed since packets are exact intercepted bytes
  - `sync:state` catchup on connect replays last command so late-joining players
    see the current tower state immediately
  - `BluetoothUserCancelledError` handling for when user dismisses the Bluetooth
    device picker
  - localStorage persistence for host URL and player name across sessions
  - URL validation requiring `ws://` or `wss://` protocol
  - Player join/leave notifications and live player count in relay status
  - `packages/client/src/ui.ts` — log capping at 200 entries to prevent unbounded
    DOM growth
  - `packages/client/vite.config.ts` — aliased `ultimatedarktower` to CJS build
    (`dist/src/index.js`) to avoid ESM `createRequire` browser incompatibility;
    externalized `@stoprocent/noble` from both Rollup bundle and Vite dep pre-bundling
  - Moved `index.html` from `public/` to package root (Vite entry point requirement)
- **Electron IPC status dashboard** — replaced hello-world renderer with a live
  three-card dashboard (BLE tower state, relay clients, command counter) consuming
  the preload bridge subscriptions for real-time updates
- Dark-themed dashboard styles with animated state indicators, responsive
  two-column grid layout, and pulse animation for advertising state
- `@types/electron-squirrel-startup` dev dependency for type-safe ESM import
- **macOS Bluetooth entitlement** — added `NSBluetoothAlwaysUsageDescription` to
  `packagerConfig.extendInfo` in `forge.config.ts`; entry is now present in the
  packaged app's `Info.plist`

### Fixed

- **`index.html` moved to Electron package root** — Forge's Vite plugin sets
  `root: projectDir`, so the renderer entry must be at `packages/electron/index.html`,
  not nested in `src/renderer/`. This was causing a blank white window on launch.
- **`ELECTRON_RUN_AS_NODE` stripped from `start:electron`** — VSCode sets this
  env var in child processes, causing `require('electron')` to return the binary
  path instead of the API. Added `env -u ELECTRON_RUN_AS_NODE` to root script.
- **Added `target` fields to forge.config.ts** — `target: 'main'` and
  `target: 'preload'` in VitePlugin build entries, matching official template.
- **Replaced `will-quit` handler with `before-quit`** — previous pattern using
  `event.preventDefault()` + async cleanup could cause exit loops.
- **ESM import for `electron-squirrel-startup`** — switched from `require()` to
  `import started from 'electron-squirrel-startup'` per official template.
- **Merged duplicate imports** in `packages/client/src/app.ts`,
  `packages/client/src/towerRelay.ts`, and `tests/unit/shared/protocol.test.ts`
  (4 pre-existing `no-duplicate-imports` lint errors)
- **`bleno_1.Characteristic is not a constructor` runtime error** — `tsc` compiled
  the named import `import bleno, { Characteristic, PrimaryService } from '@stoprocent/bleno'`
  using `__importStar`, which copies only _own_ properties of the CJS module export.
  `Characteristic` and `PrimaryService` live on `Bleno.prototype` (not own properties
  of the instance), so they were `undefined` when destructured. Fixed by removing
  them from the named import and destructuring from the default import instead:
  `const { Characteristic, PrimaryService } = bleno;` — prototype-chain lookup
  works correctly on the default-import value (`bleno_1.default`).
- **Electron shutdown SIGABRT (`napi_release_threadsafe_function`)** — quitting the
  app triggered Node environment cleanup (`node::FreeEnvironment`) where
  `@stoprocent/bleno` finalized internal N-API threadsafe functions and crashed in
  `uv_mutex_lock`. Fixed by hardening shutdown and then force-terminating the process
  with `SIGKILL` after best-effort cleanup (`stopAdvertising`, `relay.stop`,
  `tower.destroy`) to bypass native finalizers entirely.
- **Main-process shutdown lifecycle hardening** — added guarded, idempotent shutdown
  flow shared by window close and `SIGINT`/`SIGTERM`; updated quit handling to await
  async cleanup and avoid re-entrant exit paths.
- **FakeTower listener cleanup safety** — switched to named handler refs, made
  advertising start/stop idempotent, and added `destroy()` to detach bleno listeners
  during app shutdown.

---

## Previous — Phase 2 Main Process Wiring + Phase 1 Shell

### Added

- `packages/host/src/fakeTower.ts` — full bleno BLE peripheral implementation
  - Advertises as "ReturnToDarkTower" with Nordic UART service UUID (`6e400001-…`)
  - RX characteristic (`6e400003-…`) captures 20-byte companion app writes and fires `'command'` event
  - TX characteristic (`6e400002-…`) with notify support wired for future tower response feedback
  - Typed EventEmitter (`EventEmitter<FakeTowerEventMap>`) with events: `'state-change'`, `'command'`, `'companion-connected'`, `'companion-disconnected'`
  - Uses bleno async API: `waitForPoweredOnAsync()` + `startAdvertisingAsync()` + `setServicesAsync()`
  - Tower UUIDs sourced from `ultimatedarktower` package root exports
- `packages/host/src/relayServer.ts` — full WebSocket relay implementation
  - `start()`: binds `WebSocketServer`, handles full connection lifecycle (sync:state catchup, CLIENT_HELLO label parsing, client:connected/disconnected broadcasts, 5-second host:status interval)
  - `stop()`: clears interval, closes server gracefully
  - `broadcast()` now tracks `lastCommandAt` ISO timestamp for catchup
  - Typed EventEmitter with `'client-change'` event carrying current `ConnectedClient[]`
  - Fixed pre-existing lint errors: merged duplicate `ws` and `@dark-tower-sync/shared` imports; all previously unused vars are now used
- `packages/host/src/index.ts` — standalone process entry updated
  - Added public re-exports: `FakeTower`, `RelayServer`, `RelayServerOptions`, `CommandReceivedCallback`
  - `main()` call guarded with `require.main === module` so the standalone host does not start when host is imported as a library by Electron
  - Uncommented and wired `relay.start()`, `tower.startAdvertising()`, `tower.stopAdvertising()`, `relay.stop()`
- `packages/electron/src/main/main.ts` — wired FakeTower + RelayServer with IPC
  - Imports `FakeTower`, `RelayServer` from `@dark-tower-sync/host`
  - Wires `tower 'command'` → `relay.broadcast()` + `IPC.TOWER_COMMAND` push to renderer
  - Wires `tower 'state-change'` → `relay.setFakeTowerState()` + `IPC.TOWER_STATE` push to renderer
  - Wires `relay 'client-change'` → `IPC.RELAY_CLIENT_CHANGE` push to renderer
  - `ipcMain.handle('get-version')` handler
  - Async `startServices()` / `shutdown()` with `app.on('will-quit')` cleanup hook
- `packages/electron/src/main/preload.ts` — expanded IPC bridge
  - Exposes: `getVersion`, `onTowerState`, `onRelayClientChange`, `onTowerCommand`
  - Each subscription returns an unsubscribe function; payloads are fully typed
- `packages/electron/vite.main.config.ts` — added `@dark-tower-sync/host`, `@dark-tower-sync/shared`, `ultimatedarktower` to Rollup externals
- Root `package.json` — `start:electron` now runs `build:shared && build:host` before launching Forge (host dist must exist for Electron runtime resolution)

### Notes

- `@stoprocent/bleno` ships a universal macOS N-API prebuild (`darwin-x64+arm64`); N-API is ABI-stable across Node.js and Electron — `@electron/rebuild` is not required on macOS
- `packages/electron` — new Electron package scaffolding Phase 1 hello world shell
  - Electron Forge + Vite plugin build pipeline (main, preload, renderer targets)
  - `@electron-forge/plugin-auto-unpack-natives` for future bleno ASAR extraction
  - `@electron/rebuild` devDependency for native module ABI recompilation (Phase 2)
  - Main process entry (`src/main/main.ts`) with `BrowserWindow` creation, macOS lifecycle handling
  - Preload script (`src/main/preload.ts`) with `contextBridge` IPC stub
  - Renderer status UI (`src/renderer/`) — dark-themed hello world matching client design language
  - `tsconfig.json` with `moduleResolution: bundler` for Vite compatibility
  - Vite configs for main (with native module externals), preload, and renderer
  - `forge.config.ts` with ZIP/DMG/deb makers
- Root `package.json` — `start:electron`, `make:electron`, `package:electron` scripts
- Root `type-check` script extended to include `packages/electron/tsconfig.json`
- Root `postinstall` script to invoke `@electron/rebuild` for native module ABI sync
- `.github/workflows/ci.yml` — GitHub Actions CI (macOS + Ubuntu, Node 18 + 20); separate `electron-build` job running `electron-forge package`

### Fixed

- `packages/host/package.json` — corrected `@stoprocent/bleno` version from non-existent `^1.0.0` to `^0.12.4` (latest published)

### Known Issues

- `@electron/rebuild` postinstall fails on Node v25 due to a `yargs` ESM compatibility regression; made non-fatal with `|| true` — native rebuild is not required until Phase 2 wires in bleno
- Pre-existing lint errors (11) in `packages/client`, `packages/host`, and `tests/` — not introduced by this change
- Pre-existing `tsc --build --noEmit` TS6310 error in root `type-check` — `packages/host` references `packages/shared` which lacks `composite: true`; pre-dates this change

### Initial

- Initial project scaffolding and monorepo setup
- Shared types and WebSocket protocol message definitions
- Host package structure (fake tower BLE peripheral, WebSocket relay server)
- Client package structure (browser-based tower relay via Web Bluetooth)
- Development tooling (ESLint, Prettier, Jest, TypeScript)
