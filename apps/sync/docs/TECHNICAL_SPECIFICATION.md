# DarkTowerSync Technical Specification

Version: 2026-03-22
Audience: Engineers, maintainers, and LLM coding agents
Status: Source-of-truth implementation guide for the current codebase

---

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. System Summary](#2-system-summary)
- [3. Monorepo Structure](#3-monorepo-structure)
- [4. Runtime Architectures](#4-runtime-architectures)
  - [4.1 Host Runtime (Node)](#41-host-runtime-node)
  - [4.2 Host Runtime (Electron)](#42-host-runtime-electron)
  - [4.3 Remote Client Runtime (Browser)](#43-remote-client-runtime-browser)
- [5. Data Flow](#5-data-flow)
  - [5.1 Host Relay Flow](#51-host-relay-flow)
  - [5.2 Connection Lifecycle](#52-connection-lifecycle-implemented-in-relayserver)
  - [5.3 Logging Data Flow](#53-logging-data-flow)
  - [5.4 Resilience Data Flow](#54-resilience-data-flow)
- [6. Protocol Contract](#6-protocol-contract)
- [7. BLE Emulation Details](#7-ble-emulation-details)
- [8. IPC Surface (Electron)](#8-ipc-surface-electron)
- [9. Structured Logging System](#9-structured-logging-system)
  - [9.1 Overview](#91-overview)
  - [9.2 Log Entry Format](#92-log-entry-format-jsonl)
  - [9.3 Host Logger](#93-host-logger-packageshostsrcloggerts)
  - [9.4 Client Logger](#94-client-logger-packagesclientsrcclientloggerts)
  - [9.5 Command Decoder](#95-command-decoder)
  - [9.6 Log Analysis CLI](#96-log-analysis-cli-packageshostscriptsanalyzelogsts)
- [10. Build, Run, and Tooling](#10-build-run-and-tooling)
- [11. Test Coverage Status](#11-test-coverage-status)
- [12. Current Implementation Matrix](#12-current-implementation-matrix)
- [13. Source of Truth Pointers](#13-source-of-truth-pointers)
- [14. Known Risks and Constraints](#14-known-risks-and-constraints)
- [15. Suggested Next Engineering Steps](#15-suggested-next-engineering-steps)

---

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

The browser client connects via WebSocket and replays commands on the player's physical tower via Web Bluetooth.

### 2.1 Implementation Snapshot

| Area | Status | Notes |
| --- | --- | --- |
| Host relay in Node | Implemented | FakeTower and RelayServer are wired and start from host entrypoint |
| Host relay in Electron | Implemented | Electron main embeds host runtime and publishes status to renderer |
| Shared protocol/types | Implemented | Message types, factories, and shared logging types in shared package |
| Browser client transport | Implemented | TowerRelay with auto-reconnect, hello handshake, protocol negotiation |
| Browser client tower replay | Implemented | Web Bluetooth replay via UltimateDarkTower library |
| Structured logging (host) | Implemented | JSONL file logger with master on/off switch, dual log streams |
| Structured logging (client) | Implemented | 500-entry ring buffer, auto-send to host every 30s, manual send/download |
| Log analysis CLI | Implemented | Correlation matrix, LED override analysis, anomaly detection |
| Resilience & reconnection | Implemented | Immediate pause/resume broadcasts, per-client tower health, ping/pong keepalive, handshake timeout, self-healing replay, reconnect UI feedback |

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
- Structured logging types (`LogEntry`, `LogDirection`, `LogLevel`, `DecodedCommand`).
- Command decoder (`decodeCommand`) that maps the 20-byte packet into named fields using raw byte offsets (no dependency on `ultimatedarktower`).
- Log entry factories (`makeCommandLogEntry`, `makeEventLogEntry`) and hex conversion utilities.

#### packages/host

Implements relay backend behavior:

- Fake BLE tower peripheral emulation using @stoprocent/bleno.
- WebSocket relay using ws.
- Connected client tracking with per-client tower health (`towerConnected`, `towerLastSeenAt`).
- WebSocket ping/pong keepalive (20s interval) for dead client detection.
- 10-second handshake timeout for zombie client cleanup.
- `readyState` checks on broadcast/send to prevent throws during reconnection.
- Basic command parsing utility (length validation).
- Standalone entrypoint with startup and graceful shutdown wiring.
- `HostLogger` — file-based JSONL logger with master on/off switch, writing host-only and combined (host + client) log streams.
- Log analysis CLI tool (`scripts/analyzeLogs.ts`) for post-session diagnostics.

Important: CommandParser exists but is not currently in the active relay path from FakeTower to RelayServer.

#### packages/client

Implements browser-side remote player application:

- WebSocket connection lifecycle with auto-reconnect (exponential backoff).
- Reconnect timer race guard — cancels pending timer on manual connect.
- Reconnection UI feedback with attempt count and countdown.
- Web Bluetooth tower replay via `ultimatedarktower` library.
- Self-healing replay — caches `lastCommandBytes` and replays on tower BLE reconnect after recalibration.
- Tower calibration flow with `client:ready` signaling.
- Pause overlay — full-screen overlay on `relay:paused`, clears on `relay:resumed`.
- Peer tower alert handling — logs and displays when other players' towers disconnect.
- `ClientLogger` — 500-entry ring buffer that auto-sends entries to host every 30s. Manual "Send Logs" and "Download Logs" controls available in the UI.

#### packages/electron

Desktop host wrapper around host package:

- Main process starts relay server and fake tower.
- Preload defines a safe renderer bridge.
- Renderer displays host state, client list with per-player tower health grid (✓/✗ indicators), command counters, and logging controls.
- Amber alert banner when any player's tower disconnects; clears when all towers are healthy.
- Logging card with toggle (pause/resume), open logs folder, and master on/off state.
- Packager config includes macOS Bluetooth usage entitlement.

## 4. Runtime Architectures

### 4.1 Host Runtime (Node)

Startup sequence in host entry:

1. Create HostLogger with `./logs` directory and optional `LOGGING=0` env var.
2. Create RelayServer using RELAY_PORT or default 8765, with `onClientLog` callback wired to logger.
3. Create FakeTower.
4. Wire FakeTower command events to logger (`companion→host`) then RelayServer.broadcast (returns seq), then logger (`host→clients` with seq).
5. Wire FakeTower state changes to RelayServer.setFakeTowerState.
6. Start relay server.
7. Start BLE advertising.
8. Register SIGINT and SIGTERM handlers for shutdown.

Shutdown sequence:

1. Stop BLE advertising.
2. Stop relay server.
3. Close logger (flush and close write streams).
4. Exit process.

### 4.2 Host Runtime (Electron)

Main process sequence:

1. Set up file-based startup logging to `~/Library/Application Support/@dark-tower-sync/electron/startup.log` (falls back to `os.tmpdir()/DarkTowerSync/startup.log` if `app.getPath('userData')` is unavailable before app ready). Intercepts `console.log/warn/error` to write to both the file and stdout.
2. Register `uncaughtException` and `unhandledRejection` handlers that write to the startup log.
3. On `app.ready`: create BrowserWindow (720×680), then call async `initApp()`.
4. `initApp()` loads host modules (`@dark-tower-sync/host`) via dynamic `import()` — this ensures file logging is active before any native module load attempt. On failure, shows an error dialog and exits.
5. Create HostLogger with `app.getPath('userData')/logs`, respects `LOGGING=0` env var.
6. Create RelayServer with configured port and `onClientLog` callback wired to logger.
7. Start RelayServer.
8. Start FakeTower advertising.
9. Relay every intercepted tower command: log `companion→host`, broadcast (returns seq), log `host→clients` with seq, push count to renderer.
10. Push status updates to renderer over IPC.

Electron-specific behavior:

- Host modules are lazy-loaded via dynamic `import()` so startup logging captures native module load failures (e.g. ABI mismatch).
- Handles relay port-in-use errors without crashing the app.
- Keeps UI open even if BLE startup fails.
- Uses forced hard-kill during quit path to avoid native addon teardown aborts.
- Exposes operator controls to stop BLE advertising (making the fake tower invisible to Bluetooth scanners) and restart it, without requiring the app to quit.
- Logging card in dashboard: toggle logging on/off (broadcasts `host:log-config` to all clients), open logs folder via `shell.openPath`.
- On macOS, the Device Information Service (0x180A) is skipped because CoreBluetooth blocks standard Bluetooth SIG UUIDs in peripheral mode.

### 4.3 Remote Client Runtime (Browser)

Fully implemented:

- WebSocket connection with `client:hello` handshake and protocol version negotiation.
- Auto-reconnect with exponential backoff (`min(1s × 2^n, 30s)`) on non-clean close.
- Web Bluetooth tower connection, calibration, and `client:ready` signaling.
- Command replay via `sendTowerCommandDirect()` — writes raw 20-byte packets.
- `sync:state` catchup on connect replays last command for late-joining players.
- localStorage persistence for host URL and player name.
- `ClientLogger` ring buffer (500 entries) with 30s auto-send to host, manual send, and local JSONL download.
- Responds to `host:log-config` to start/stop auto-send timer (manual send always works).

## 5. Data Flow

### 5.1 Host Relay Flow

1. Companion app writes command bytes to fake tower BLE write characteristic.
2. FakeTower emits command event with raw bytes.
3. Host logger records `companion→host` entry with raw hex and decoded fields.
4. RelayServer assigns monotonic `seq`, converts bytes to protocol message with seq, broadcasts to all connected clients.
5. Host logger records `host→clients` entry with assigned seq.
6. RelayServer stores last command for future sync state.

### 5.2 Connection Lifecycle (Implemented in RelayServer)

On client WebSocket connection:

1. Server assigns a UUID client ID.
2. Server sends sync:state immediately with last command or null.
3. Server broadcasts client:connected to existing clients.
4. Server registers client in connection manager with 10-second handshake timeout.
5. Server listens for client:hello to capture label and compare protocol version; marks handshake complete.
6. If client:hello is not received within 10 seconds, the client is removed (zombie cleanup).
7. On close or error, server removes client and broadcasts client:disconnected.
8. Ping/pong keepalive (20s interval) detects dead clients; unresponsive clients are terminated.

Current behavior detail: protocol version mismatch is logged as a warning, and the client is not forcibly disconnected.

### 5.3 Resilience Data Flow

```
Companion App Disconnect:
  FakeTower emits companion-disconnected
  → Electron main calls relay.broadcastPaused(reason)
  → All clients receive relay:paused → show pause overlay
  → FakeTower re-advertises automatically

Companion App Reconnect:
  FakeTower emits companion-connected
  → Electron main calls relay.broadcastResumed()
  → All clients receive relay:resumed → hide pause overlay

Remote Tower BLE Disconnect:
  Client detects gattserverdisconnected
  → Sends client:ready {ready: false}
  → Host sets client.towerConnected = false
  → Host broadcasts relay:tower:alert {towerConnected: false}
  → Dashboard shows ✗ for that player's tower

Remote Tower BLE Reconnect:
  Player clicks "Connect to Tower"
  → BLE connect + calibrate
  → Client replays cached lastCommandBytes
  → Sends client:ready {ready: true}
  → Host sets client.towerConnected = true
  → Host broadcasts relay:tower:alert {towerConnected: true}

WebSocket Disconnect (client side):
  → UI shows "Reconnecting in Xs (attempt N)…"
  → Exponential backoff: min(1s × 2^n, 30s)
  → On reconnect: client:hello → sync:state catchup → auto-replay if tower ready
```

### 5.4 Logging Data Flow

```
Client Browser                              Host (Electron/Node)
─────────────────                           ────────────────────
Command received from WebSocket
  → logCommand('client←host', data, seq)
  → entry added to ring buffer [500 max]

Command replayed on tower via BLE
  → logCommand('client→tower', data, seq)
  → entry added to ring buffer

Every 30s (auto-send timer):
  → unsent entries packaged as              → RelayServer receives client:log
    client:log message                      → logEvent: "Received N entries from…"
  → sent via WebSocket ─────────────────►   → HostLogger.writeClientEntries()
                                            → appended to session-*-all.jsonl

Player clicks "Send Logs":
  → logEvent: "Sent logs to host manually"  → same as above
  → sendLogs() — immediate flush ────────►

Player clicks "Download Logs":
  → downloadAsFile() — local .jsonl save
  (no server involvement)

On relay disconnect:
  → flush() — send remaining entries ────►  → written to disk before close

Connection events (host side, session-*-host.jsonl + session-*-all.jsonl):
  FakeTower state-change    → logEvent: "FakeTower state: <state>"
  companion-connected       → logEvent: "Companion app connected"
  companion-disconnected    → logEvent: "Companion app disconnected"
  CLIENT_HELLO (handshake)  → logEvent: "Client connected: <label>"
  WebSocket close           → logEvent: "Client disconnected: <label>"
  CLIENT_READY              → logEvent: "Client <label> tower: connected/disconnected"
```

## 6. Protocol Contract

All relay messages use this envelope shape:

- type: string
- payload: object
- timestamp: ISO-8601 string

Implemented host message factories in shared:

- tower:command (with optional `seq` for cross-log correlation)
- sync:state
- host:status
- host:log-config
- relay:paused
- relay:resumed
- relay:tower:alert

Additional message types defined and used in runtime handling:

- client:connected
- client:disconnected
- client:hello
- client:ready
- client:log

Payload expectations:

- tower:command payload.data is number[] of command bytes; payload.seq is optional monotonic counter.
- sync:state payload.lastCommand is number[] or null.
- host:status payload includes relaying, fakeTowerState, appConnected, clientCount, towersConnected, lastCommandAt.
- client:hello payload includes protocolVersion and optional label.
- client:ready payload.ready is boolean.
- client:log payload.entries is LogEntry[].
- host:log-config payload.enabled is boolean.
- relay:paused payload.reason is string (human-readable pause reason).
- relay:resumed payload is empty object.
- relay:tower:alert payload includes clientId, optional label, and towerConnected boolean.

Validation notes:

- CommandParser validates only fixed length of 20 bytes.
- The shared `decodeCommand()` function parses the 20-byte packet into named fields (cmdType, drumStates, ledStates, audio, beamBreak, volumeDrumBeam, ledOverride) for structured logging.

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
- toggleLogging
- getLoggingState
- openLogDir

Control actions (triggerSkullDrop, startTowerAdvertising, stopTowerAdvertising) all return { ok: boolean; reason?: string }.

stopTowerAdvertising disconnects any active companion app and stops BLE advertising, leaving the tower idle and invisible to Bluetooth scanners. startTowerAdvertising resumes advertising so the companion app can reconnect.

toggleLogging flips the HostLogger master switch and broadcasts `host:log-config` to all connected clients. Returns { enabled: boolean }. getLoggingState returns the current state. openLogDir opens the log directory in the OS file manager via `shell.openPath`.

## 9. Structured Logging System

### 9.1 Overview

All components produce structured JSONL log entries for post-session diagnostics. The host assigns monotonic sequence numbers (`seq`) to each relayed command, enabling cross-log correlation between host and client entries regardless of clock skew. In addition to commands, connection lifecycle events are recorded as `event`-level entries in the same files — companion app attach/detach, relay client join/leave, remote tower BLE connect/disconnect — so a single log file gives a complete picture of what happened during a session.

### 9.2 Log Entry Format (JSONL)

Each line is a JSON object conforming to `LogEntry` (defined in `packages/shared/src/logging.ts`):

| Field   | Type                | Description                                         |
| ------- | ------------------- | --------------------------------------------------- |
| ts      | string              | ISO-8601 timestamp from the machine that created it |
| seq     | number \| null      | Monotonic relay sequence number (null for events)   |
| dir     | LogDirection \| null | `companion→host`, `host→clients`, `client←host`, `client→tower` |
| hex     | string \| null      | 40-char hex string of the 20-byte command           |
| src     | string              | Source identifier (host, client UUID, player label)  |
| level   | LogLevel            | `cmd`, `event`, `warn`, `error`                     |
| note    | string?             | Optional human-readable annotation                  |
| decoded | DecodedCommand?     | Parsed command fields (when hex is present)          |

### 9.3 Host Logger (`packages/host/src/logger.ts`)

`HostLogger` writes two JSONL files per session:
- `session-{date}-host.jsonl` — host-originated entries only.
- `session-{date}-all.jsonl` — host + client entries interleaved.

Master `enabled` switch (default `true`). When disabled, all write methods are no-ops but streams stay open for resumption. Toggled via `setEnabled()`. Electron host exposes this as a dashboard toggle that also broadcasts `host:log-config` to clients.

Connection lifecycle events logged to both files by the host:
- `FakeTower state: <state>` — BLE adapter state transition (`idle → advertising → connected`)
- `Companion app connected` / `Companion app disconnected` — companion app attaches/detaches from FakeTower
- `Client connected: <label>` — relay client completes CLIENT_HELLO handshake (label shown if provided)
- `Client disconnected: <label>` — relay client WebSocket closes
- `Client <label> tower: connected` / `tower: disconnected` — remote CLIENT_READY signal
- `Received N log entries from <clientId>` — meta-event when a client log batch arrives (written before the entries)

`RelayServer` exposes `onClientConnected`, `onClientDisconnected`, and `onClientReady` callbacks in `RelayServerOptions` to decouple logging from the relay implementation.

### 9.4 Client Logger (`packages/client/src/clientLogger.ts`)

`ClientLogger` maintains a 500-entry ring buffer in memory:
- Auto-sends unsent entries to host every 30 seconds via `client:log` WebSocket message.
- Manual "Send Logs" button logs a `Sent logs to host manually` event entry *before* flushing, so the event appears in the transmitted batch.
- "Download Logs" button exports the full ring buffer as a local `.jsonl` file via Blob download.
- Responds to `host:log-config` messages to start/stop the auto-send timer.
- Flushes remaining entries on relay disconnect.

### 9.5 Command Decoder

`decodeCommand()` in `packages/shared/src/logging.ts` parses the 20-byte packet:

| Bytes | Field          | Description                                    |
| ----- | -------------- | ---------------------------------------------- |
| 0     | cmdType        | Command header / response type                 |
| 1–2   | drumStates     | Raw drum state bytes                           |
| 3–14  | ledStates      | 12 bytes: 6 layers × 2 bytes (4 lights each)  |
| 15    | audio          | Audio sample (bits 0–6) + loop flag (bit 7)    |
| 16–17 | beamBreak      | Beam count high/low (SKULL_DROP_COUNT_POS=17)  |
| 18    | volumeDrumBeam | Volume (4–7), beam fault (0), drum rev (1–3)   |
| 19    | ledOverride    | led_sequence value (0x0e = sealReveal, etc.)   |

The shared package has no dependency on `ultimatedarktower`. The analysis tool (in host) imports UDT constants for human-readable names.

### 9.6 Log Analysis CLI (`packages/host/scripts/analyzeLogs.ts`)

Run with: `npm run analyze -w packages/host -- [options]`

Options:
- `--dir <path>` — Log directory (default: `./logs`)
- `--session <date>` — Filter to session date
- `--led-focus` — Highlight LED override analysis (byte 19)
- `--seq <n>` — Focus on a specific sequence number
- `--anomalies` — Show only anomalies

Report sections:
1. **Session Summary** — Time range, duration, command count, clients.
2. **Command Timeline** — Chronological commands with hex, decoded fields, delta timing.
3. **Correlation Matrix** — For each seq: host received → broadcast → client received → client→tower, with latencies.
4. **LED Override Analysis** (`--led-focus`) — Commands where byte 19 ≠ 0, decoded via `TOWER_LIGHT_SEQUENCES` from UDT.
5. **Anomaly Detection** — Missing seq at clients, time gaps > 5s, hex mismatches, duplicates, errors.
6. **Per-Client Summary** — Commands received/replayed/errors, average latency.

## 10. Build, Run, and Tooling

Root scripts of interest:

- npm run build
- npm run build:shared
- npm run build:host
- npm run build:client
- npm run dev:host
- npm run dev:client
- npm run start:electron
- npm run ci
- npm run analyze -w packages/host — Run log analysis tool

Notable build/runtime behavior:

- Electron start builds shared and host first.
- Electron main Vite config externalizes native and workspace dependencies.
- Client Vite config aliases shared source for development.
- Jest is configured with ts-jest CommonJS transform override.

## 11. Test Coverage Status

Existing unit coverage is centered on shared protocol factories and constants (27 tests passing).

Covered now:

- Message type values (including CLIENT_LOG, HOST_LOG_CONFIG).
- Protocol version format.
- Message factory output shapes (including seq on tower:command).

Not covered now:

- Host relay connection edge cases.
- FakeTower BLE interaction behavior in tests.
- Client runtime replay behavior.
- Electron IPC end-to-end behavior.
- HostLogger and ClientLogger unit tests.
- Log analysis tool output validation.

## 12. Current Implementation Matrix

### 12.1 Complete

- Shared protocol types and message factory helpers.
- Host relay server lifecycle and client management.
- Fake tower BLE advertising and command interception path.
- Electron host integration and status dashboard.
- Browser client WebSocket connection with auto-reconnect.
- Browser client command replay to local tower via Web Bluetooth.
- Browser client sync-state catchup on connect.
- Structured logging across host and clients (JSONL format, seq correlation).
- Host master logging toggle with client broadcast.
- Client ring buffer with auto-send, manual send, and local download.
- Log analysis CLI tool with correlation, LED analysis, and anomaly detection.
- Immediate companion disconnect/reconnect broadcasts (relay:paused/resumed).
- Per-client tower health tracking with relay:tower:alert broadcasts.
- WebSocket ping/pong keepalive and handshake timeout.
- ConnectionManager readyState checks for safe send during reconnection.
- Client self-healing replay of lastCommandBytes on tower BLE reconnect.
- Client reconnection UI feedback with attempt count and countdown.
- Client pause overlay on companion app disconnect.
- Per-player tower health grid in Electron dashboard.

### 12.2 Partial

- Command parser has only basic length validation.
- Protocol docs exist but should remain aligned with source as behavior evolves.

## 13. Source of Truth Pointers

External references:

- [UltimateDarkTower TOWER_TECH_NOTES.md](../../UltimateDarkTower/TOWER_TECH_NOTES.md) — Authoritative 20-byte BLE command packet layout, LED architecture, Noble/macOS BLE gotchas. Consult this before reasoning about raw packet bytes.

Primary implementation files:

- packages/shared/src/protocol.ts
- packages/shared/src/types.ts
- packages/shared/src/version.ts
- packages/shared/src/logging.ts
- packages/host/src/fakeTower.ts
- packages/host/src/relayServer.ts
- packages/host/src/connectionManager.ts
- packages/host/src/commandParser.ts
- packages/host/src/logger.ts
- packages/host/src/index.ts
- packages/host/scripts/analyzeLogs.ts
- packages/electron/src/main/main.ts
- packages/electron/src/main/preload.ts
- packages/electron/src/renderer/renderer.ts
- packages/client/src/app.ts
- packages/client/src/towerRelay.ts
- packages/client/src/clientLogger.ts
- packages/client/src/ui.ts

Reference docs:

- ARCHITECTURE.md
- docs/PROTOCOL.md
- docs/SETUP.md
- docs/TROUBLESHOOTING.md
- docs/electron-app-plan.md

## 14. Known Risks and Constraints

- BLE peripheral behavior depends on platform support and permissions.
- macOS CoreBluetooth blocks standard Bluetooth SIG 16-bit UUIDs in peripheral mode — the Device Information Service (0x180A) cannot be registered. The companion app may show a firmware-update prompt on macOS without hardware workarounds (see `docs/MACOS_BLE_PERIPHERAL_LIMITATION.md`).
- Native module teardown in Electron requires guarded shutdown path.
- Native modules (e.g. `@stoprocent/bleno`) must be compiled for Electron's Node.js version, not the system Node.js. The release workflow runs `electron-rebuild` to handle this; local builds use Forge's built-in native dependency preparation.
- Relay transport is low-latency fire-and-forget and does not include delivery acknowledgements. Missed commands are corrected by the next full-state command from the companion app.
- Client log auto-send relies on WebSocket connectivity; entries buffered during disconnect are flushed on reconnect but may exceed the 500-entry ring buffer if the outage is long.
- Ping/pong keepalive detects dead clients within ~40 seconds. Shorter intervals would increase overhead; longer intervals delay detection.

## 15. Suggested Next Engineering Steps

1. Add unit tests for HostLogger and ClientLogger.
2. Add host integration tests around relay connection lifecycle, ping/pong keepalive, and handshake timeout.
3. Add protocol conformance tests for message handling, including malformed input and new resilience messages.
4. Implement log file rotation or size caps for long-running sessions.
5. Keep docs/PROTOCOL.md and this specification synchronized with source-level behavior.
6. Add integration tests for the self-healing replay path (tower reconnect → lastCommandBytes replay).
