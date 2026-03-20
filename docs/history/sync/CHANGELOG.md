# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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
