# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

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

[2.0.0]: https://github.com/ChessMess/UltimateDarkTower/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/ChessMess/UltimateDarkTower/releases/tag/v1.0.0
