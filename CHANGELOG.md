# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

[Added]

-   Build artifacts for lights integration test (`dist/tests/integration/lights.integration.js`, `.d.ts`, `.js.map`).
-   Updated documentation for lights integration test covering `allLightsOn` and `allLightsOff` API usage and integration test procedure.

## [2.3.0] - 2026-02-23

### Added

-   **`allLightsOn(effect?)` and `allLightsOff()` convenience methods** — Turns all 24 tower LEDs on or off with a single command packet. `allLightsOn` accepts an optional `effect` parameter (default: `LIGHT_EFFECTS.on`); `allLightsOff` is a convenience wrapper around `allLightsOn(LIGHT_EFFECTS.off)`. Both preserve existing drum, beam, and audio state.

### Changed

-   **Public audio volume API now clamps inputs to 0–3** — The `volume` parameter accepted by `playSoundStateful`, `breakSeal`, and related methods is now clamped to the range 0–3 (0=loudest, 1=medium, 2=quiet, 3=softest/mute) before being sent to the tower. The tower's 4-bit device field accepts 0–15, but the firmware only defines behaviour for 0–3; out-of-range inputs now silently clamp rather than producing undefined tower behaviour. If you were passing values outside 0–3, update them to the equivalent in-range value.

## [2.2.0] - 2026-02-20

### Fixed

-   **`setLEDStateful` stale-state accumulation** — `setLEDStateful` never called `setTowerState`, so `onTowerStateUpdate` callbacks were never fired for LED changes and any code calling it in a loop (including `lights()`) risked reading stale state if `this.currentTowerState` was replaced between iterations. State is now updated explicitly before the command is sent.
-   **`cleanup()` reconnect hazard** — `cleanup()` called `disconnect()` which fired `onTowerDisconnect`, meaning a reconnect-on-disconnect handler could call `connect()` on an instance mid-teardown. `isDisposed` is now set before any disconnect logic runs so the callback cannot re-enter `connect()`.
-   **`cleanup()` not idempotent** — Calling `cleanup()` more than once would re-run the full teardown sequence. It now returns early if the instance is already disposed.
-   **`MockBluetoothAdapter.cleanup()` leaving callbacks registered** — The mock adapter's `cleanup()` now clears all three event callbacks, matching the behaviour of `NodeBluetoothAdapter`.

### Changed

-   **`connect()` throws after disposal** — Calling `connect()` on a `UdtBleConnection` instance after `cleanup()` now throws `Error: UdtBleConnection instance has been disposed and cannot reconnect`. Use `disconnect()` for reversible disconnection.

## [2.1.3] - 2026-02-19

### Fixed

-   **`@stoprocent/noble` not loading in ESM build** — In Node.js ESM contexts, `require` is not defined, causing esbuild's `__require` shim to silently fail and leave `noble` as `undefined`. The ESM bundle now injects `import{createRequire}from'module';const require=createRequire(import.meta.url);` as a banner so `@stoprocent/noble` loads correctly via CJS `require` within the ESM module.

## [2.1.2] - 2026-02-19

### Fixed

-   **ESM named imports broken** — `import { UltimateDarkTower } from 'ultimatedarktower'` previously threw `SyntaxError: The requested module does not provide an export named 'UltimateDarkTower'` in Node.js ESM projects because the `"import"` export condition pointed to the CommonJS build. The package now ships a true ES Module bundle so named imports work correctly.

### Added

-   **ESM build** (`dist/esm/index.mjs`) — a native ES Module bundle produced by esbuild, included in the published package alongside the existing CommonJS build

### Changed

-   `package.json` `exports["import"]` condition now points to `dist/esm/index.mjs` instead of the CommonJS output; `exports["require"]` is unchanged
-   `package.json` `files` now includes `dist/esm/**/*`

## [2.1.1] - 2026-02-19

### Added

-   Integration test for tower calibration using Node.js Bluetooth adapter, located in `tests/integration/calibration.integration.ts`
-   `npm run test:integration` script to run integration tests requiring real hardware
-   Integration tests are now organized under `tests/integration/` and are not run by default with unit tests or during publish

## [2.1.0] - 2026-02-19

### Added

-   **Public Tower State Types** — Exported `TowerState`, `Light`, `Layer`, `Drum`, `Audio`, and `Beam` type interfaces for direct tower state manipulation
-   **Tower State Utilities** — Exported `rtdt_unpack_state`, `rtdt_pack_state`, `isCalibrated`, and `createDefaultTowerState` for converting between `TowerState` objects and binary tower data
-   **Differential Readings** — Exported `parseDifferentialReadings` function and `ParsedDifferentialReadings` type for parsing tower sensor data
-   **`TowerResponseConfig` Type** — Exported interface for controlling which tower responses are logged via `logTowerResponseConfig`

### Changed

-   **`TowerResponseConfig`** — Moved from private interface in `UltimateDarkTower.ts` to exported interface in `udtTowerResponse.ts`
-   **`shouldLogResponse`** — Updated parameter type from `any` to `TowerResponseConfig` for type safety
-   **Controller Example** — Updated imports to use the package index instead of internal module paths

## [2.0.0] - 2025-02-18

### Added

-   **Node.js Support** — `NodeBluetoothAdapter` using `@stoprocent/noble` for BLE communication in Node.js environments (macOS, Linux, Windows)
-   **Platform Auto-Detection** — `BluetoothAdapterFactory` automatically selects the correct adapter based on the runtime environment (browser vs Node.js vs Electron)
-   **`BluetoothPlatform` Enum** — Explicit platform selection via `BluetoothPlatform.WEB`, `BluetoothPlatform.NODE`, or `BluetoothPlatform.AUTO`
-   **`IBluetoothAdapter` Interface** — Public adapter interface for implementing custom Bluetooth adapters (React Native, Cordova, etc.)
-   **Platform-Agnostic Error Types** — `BluetoothConnectionError`, `BluetoothDeviceNotFoundError`, `BluetoothNotAvailableError`, `BluetoothCharacteristicError`, `BluetoothAdapterError` for consistent error handling across platforms
-   **Node.js CLI Example** — Interactive command-line example application (`examples/node/`)
-   **Adapter Layer Tests** — Unit tests for `NodeBluetoothAdapter`, `WebBluetoothAdapter`, `BluetoothAdapterFactory`, `UdtBleConnection`, and error types

### Changed

-   **`udtBleConnection`** — Refactored to use `IBluetoothAdapter` interface instead of direct Web Bluetooth API calls, enabling multi-platform support
-   **`UltimateDarkTower` Constructor** — Now accepts `UltimateDarkTowerConfig` with optional `platform` or `adapter` properties for platform selection
-   **Peer Dependency** — Updated `@stoprocent/noble` peer dependency from `^1.15.0` to `^2.0.0`

## [1.0.0] - 2025-08-18

### Added

-   Initial release
-   Web Bluetooth support for Chrome, Edge, and Samsung Internet
-   Tower control API (lights, sounds, drum rotation)
-   Glyph position tracking with automatic updates on drum rotation
-   Seal management for game mechanics
-   Tower state management and validation
-   Multi-layered disconnect detection (heartbeat, GATT events, command timeout)
-   Callback-based event system for tower events
-   Comprehensive logging system with multiple outputs
-   Battery monitoring with low battery warnings
-   TypeScript definitions and type safety
-   Tower Controller example web app
-   Tower Game ("The Tower's Challenge") example web app
-   Complete API reference documentation

[2.3.0]: https://github.com/ChessMess/UltimateDarkTower/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/ChessMess/UltimateDarkTower/compare/v2.1.3...v2.2.0
[2.1.3]: https://github.com/ChessMess/UltimateDarkTower/compare/v2.1.2...v2.1.3
[2.1.2]: https://github.com/ChessMess/UltimateDarkTower/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/ChessMess/UltimateDarkTower/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/ChessMess/UltimateDarkTower/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/ChessMess/UltimateDarkTower/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/ChessMess/UltimateDarkTower/releases/tag/v1.0.0
