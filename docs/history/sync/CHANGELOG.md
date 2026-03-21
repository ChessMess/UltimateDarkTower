# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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
  using `__importStar`, which copies only *own* properties of the CJS module export.
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

## [0.1.0] - Unreleased

### Added

- Initial project scaffolding and monorepo setup
- Shared types and WebSocket protocol message definitions
- Host package structure (fake tower BLE peripheral, WebSocket relay server)
- Client package structure (browser-based tower relay via Web Bluetooth)
- Development tooling (ESLint, Prettier, Jest, TypeScript)
