# DarkTowerSync Technical Specification

Version: 2026-03-20
Audience: Engineers, maintainers, and LLM coding agents
Status: Source-of-truth implementation guide for the current codebase

## 1. Purpose

DarkTowerSync synchronizes multiple physical Return to Dark Tower towers across locations.

- The host side intercepts tower commands from the official companion app.
- The host relays commands over WebSocket.
- Remote players receive and replay commands on their own tower hardware.

This document is designed to help both humans and LLMs quickly understand what is implemented today, what is scaffolded, and where to make changes safely.

## 2. System Summary

The repository currently contains two host execution paths:

1. Node host package runtime for direct host execution.
2. Electron desktop host runtime that embeds the host package and exposes status in a desktop UI.

The browser client package exists and provides UI scaffolding, but command transport and tower replay are not fully implemented yet.

### 2.1 Implementation Snapshot

| Area | Status | Notes |
| --- | --- | --- |
| Host relay in Node | Implemented | FakeTower and RelayServer are wired and start from host entrypoint |
| Host relay in Electron | Implemented | Electron main embeds host runtime and publishes status to renderer |
| Shared protocol/types | Implemented | Message types and host message factories are in shared package |
| Browser client transport | Scaffolded | TowerRelay.connect is TODO and currently throws not implemented |
| Browser client tower replay | Scaffolded | Web Bluetooth replay path is not implemented yet |

## 3. Monorepo Structure

- packages/shared
- packages/host
- packages/client
- packages/electron
- tests/unit/shared
- docs

### 3.1 Package Responsibilities

#### packages/shared

Defines shared protocol and types used by host and client:

- Message type literals and message envelopes.
- Factory functions for outbound host messages.
- Shared domain types such as fake tower state and host status.
- Protocol version constant.

#### packages/host

Implements relay backend behavior:

- Fake BLE tower peripheral emulation using @stoprocent/bleno.
- WebSocket relay using ws.
- Connected client tracking.
- Basic command parsing utility (length validation).
- Standalone entrypoint with startup and graceful shutdown wiring.

Important: CommandParser exists but is not currently in the active relay path from FakeTower to RelayServer.

#### packages/client

Implements browser-side UI scaffolding for remote players:

- UI status and log view.
- App controller wiring.
- TowerRelay message dispatch skeleton.

Important: WebSocket connect logic and Web Bluetooth replay are currently TODO in source.

#### packages/electron

Desktop host wrapper around host package:

- Main process starts relay server and fake tower.
- Preload defines a safe renderer bridge.
- Renderer displays host state, client list, and command counters.
- Packager config includes macOS Bluetooth usage entitlement.

## 4. Runtime Architectures

### 4.1 Host Runtime (Node)

Startup sequence in host entry:

1. Create RelayServer using RELAY_PORT or default 8765.
2. Create FakeTower.
3. Wire FakeTower command events to RelayServer.broadcast.
4. Wire FakeTower state changes to RelayServer.setFakeTowerState.
5. Start relay server.
6. Start BLE advertising.
7. Register SIGINT and SIGTERM handlers for shutdown.

Shutdown sequence:

1. Stop BLE advertising.
2. Stop relay server.
3. Exit process.

### 4.2 Host Runtime (Electron)

Main process sequence:

1. Create BrowserWindow.
2. Start RelayServer with configured port.
3. Start FakeTower advertising.
4. Relay every intercepted tower command to clients.
5. Push status updates to renderer over IPC.

Electron-specific behavior:

- Handles relay port-in-use errors without crashing the app.
- Keeps UI open even if BLE startup fails.
- Uses forced hard-kill during quit path to avoid native addon teardown aborts.
- Exposes operator controls to stop BLE advertising (making the fake tower invisible to Bluetooth scanners) and restart it, without requiring the app to quit.

### 4.3 Remote Client Runtime (Browser)

Current implementation status:

- UI can collect host URL and optional player label.
- App-level state transitions are wired.
- TowerRelay.connect currently throws not implemented.
- Tower connection flow is placeholder only.

Result: End-to-end remote replay is not yet active in the browser client package.

## 5. Data Flow

### 5.1 Implemented Host Relay Flow

1. Companion app writes command bytes to fake tower BLE write characteristic.
2. FakeTower emits command event with raw bytes.
3. RelayServer converts bytes to protocol message.
4. RelayServer broadcasts JSON message to all connected clients.
5. RelayServer stores last command for future sync state.

### 5.2 Connection Lifecycle (Implemented in RelayServer)

On client WebSocket connection:

1. Server assigns a UUID client ID.
2. Server sends sync:state immediately with last command or null.
3. Server broadcasts client:connected to existing clients.
4. Server registers client in connection manager.
5. Server listens for client:hello to capture label and compare protocol version.
6. On close or error, server removes client and broadcasts client:disconnected.

Current behavior detail: protocol version mismatch is logged as a warning, and the client is not forcibly disconnected.

## 6. Protocol Contract

All relay messages use this envelope shape:

- type: string
- payload: object
- timestamp: ISO-8601 string

Implemented host message factories in shared:

- tower:command
- sync:state
- host:status

Additional message types defined and used in runtime handling:

- client:connected
- client:disconnected
- client:hello

Payload expectations:

- tower:command payload.data is number[] of command bytes.
- sync:state payload.lastCommand is number[] or null.
- host:status payload includes relaying, fakeTowerState, clientCount, lastCommandAt.
- client:hello payload includes protocolVersion and optional label.

Validation notes:

- CommandParser validates only fixed length of 20 bytes.
- Deeper semantic packet parsing is not implemented yet.

## 7. BLE Emulation Details

FakeTower emulates key BLE characteristics of the physical tower:

- Advertises as ReturnToDarkTower device name.
- Uses Nordic UART service and command/notify characteristics from ultimatedarktower constants.
- Implements write and writeWithoutResponse for command input.
- Implements notify characteristic for tower-to-app messages.
- Sends an initial heartbeat notification immediately after client subscribes.
- Exposes Device Information Service characteristics with captured values.

> **BLE packet format reference:** The complete 20-byte command packet structure (byte-by-byte drum, LED, audio, beam counter, and volume fields) is documented in the UltimateDarkTower library repository:
> [`/Users/wopr/Documents/GitHub/UltimateDarkTower/TOWER_TECH_NOTES.md`](../../UltimateDarkTower/TOWER_TECH_NOTES.md)

State model:

- idle
- advertising
- connected
- error

Events emitted:

- state-change
- command
- companion-connected
- companion-disconnected
- ble-adapter-state

## 8. IPC Surface (Electron)

Preload exposes a darkTowerSync bridge in renderer with:

- getVersion
- getRelayStatus
- getTowerState
- getBleAdapterState
- onTowerState
- onRelayClientChange
- onTowerCommand
- onRelayStatus
- onBleAdapterState
- triggerSkullDrop
- startTowerAdvertising
- stopTowerAdvertising

Control actions (triggerSkullDrop, startTowerAdvertising, stopTowerAdvertising) all return { ok: boolean; reason?: string }.

stopTowerAdvertising disconnects any active companion app and stops BLE advertising, leaving the tower idle and invisible to Bluetooth scanners. startTowerAdvertising resumes advertising so the companion app can reconnect.

## 9. Build, Run, and Tooling

Root scripts of interest:

- npm run build
- npm run build:shared
- npm run build:host
- npm run build:client
- npm run dev:host
- npm run dev:client
- npm run start:electron
- npm run ci

Notable build/runtime behavior:

- Electron start builds shared and host first.
- Electron main Vite config externalizes native and workspace dependencies.
- Client Vite config aliases shared source for development.
- Jest is configured with ts-jest CommonJS transform override.
- Host standalone startup message still contains a scaffolding note, even though core host runtime is wired.

## 10. Test Coverage Status

Existing unit coverage is centered on shared protocol factories and constants.

Covered now:

- Message type values.
- Protocol version format.
- Message factory output shapes.

Not covered now:

- Host relay connection edge cases.
- FakeTower BLE interaction behavior in tests.
- Client runtime replay behavior.
- Electron IPC end-to-end behavior.

## 11. Current Implementation Matrix

### 11.1 Complete

- Shared protocol types and message factory helpers.
- Host relay server lifecycle and client management.
- Fake tower BLE advertising and command interception path.
- Electron host integration and status dashboard.

### 11.2 Partial

- Command parser has only basic length validation.
- Protocol docs exist but should remain aligned with source as behavior evolves.

### 11.3 Not Yet Implemented

- Browser client WebSocket connection logic in TowerRelay.connect.
- Browser client command replay to local tower via Web Bluetooth.
- Browser client sync-state replay behavior.

## 12. Source of Truth Pointers

External references:

- [UltimateDarkTower TOWER_TECH_NOTES.md](../../UltimateDarkTower/TOWER_TECH_NOTES.md) — Authoritative 20-byte BLE command packet layout, LED architecture, Noble/macOS BLE gotchas. Consult this before reasoning about raw packet bytes.

Primary implementation files:

- packages/shared/src/protocol.ts
- packages/shared/src/types.ts
- packages/shared/src/version.ts
- packages/host/src/fakeTower.ts
- packages/host/src/relayServer.ts
- packages/host/src/connectionManager.ts
- packages/host/src/commandParser.ts
- packages/host/src/index.ts
- packages/electron/src/main/main.ts
- packages/electron/src/main/preload.ts
- packages/electron/src/renderer/renderer.ts
- packages/client/src/app.ts
- packages/client/src/towerRelay.ts

Reference docs:

- ARCHITECTURE.md
- docs/PROTOCOL.md
- docs/SETUP.md
- docs/electron-app-plan.md

## 13. Known Risks and Constraints

- BLE peripheral behavior depends on platform support and permissions.
- Native module teardown in Electron requires guarded shutdown path.
- Relay transport is low-latency fire-and-forget and does not include delivery acknowledgements.
- Browser client functionality is currently scaffold-level, so full multiplayer flow is presently dependent on host-side readiness and pending client implementation.

## 14. Suggested Next Engineering Steps

1. Implement TowerRelay.connect lifecycle and robust parsing/validation in client.
2. Implement Web Bluetooth write path through ultimatedarktower in browser client.
3. Add host integration tests around relay connection lifecycle and status emission.
4. Add protocol conformance tests for message handling, including malformed input.
5. Keep docs/PROTOCOL.md and this specification synchronized with source-level behavior.
