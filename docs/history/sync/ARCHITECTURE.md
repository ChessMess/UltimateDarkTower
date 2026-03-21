# DarkTowerSync Architecture

This document explains how DarkTowerSync works at a component level.

---

## Table of Contents

- [System Diagram](#system-diagram)
- [Component Descriptions](#component-descriptions)
  - [FakeTower](#faketower-packageshostsrcfaketowerts)
  - [CommandParser](#commandparser-packageshostsrccommandparserts)
  - [RelayServer](#relayserver-packageshostsrcrelayserverts)
  - [ConnectionManager](#connectionmanager-packageshostsrcconnectionmanagerts)
  - [TowerRelay](#towerrelay-packagesclientsrctowerrelayts)
  - [UltimateDarkTower (Web Bluetooth)](#ultimatedarktower-web-bluetooth)
  - [TowerVisualizer (Observer Mode)](#towervisualizer-packagesclientsrctowervisualizerts)
- [Why Full-State Commands Prevent Sync Drift](#why-full-state-commands-prevent-sync-drift)
- [Skull and Glyph Handling](#skull-and-glyph-handling)
- [Structured Logging](#structured-logging)
  - [HostLogger](#hostlogger-packageshostsrcloggerts)
  - [ClientLogger](#clientlogger-packagesclientsrcclientloggerts)
  - [Log Analysis CLI](#log-analysis-cli-packageshostscriptsanalyzelogsts)
- [Data Flow Summary](#data-flow-summary)

---

## System Diagram

```mermaid
flowchart TD
    subgraph HOST["Host Machine (macOS / Linux)"]
        APP["Official Companion App\n(iPhone via iPhone Mirroring)"]
        FAKE["FakeTower\n@stoprocent/bleno\nBLE Peripheral"]
        LOGGER["HostLogger\nJSONL file writer"]
        RELAY["RelayServer\nWebSocket ws://host:8765"]
        PARSER["CommandParser\n20-byte validation"]

        APP -->|"BLE write\n20-byte command"| FAKE
        FAKE -->|onCommandReceived| PARSER
        PARSER -->|valid command bytes| LOGGER
        LOGGER -->|"log + assign seq"| RELAY
    end

    subgraph CLIENT1["Remote Player 1 (Browser)"]
        WS1["TowerRelay\nWebSocket client"]
        CLOG1["ClientLogger\n500-entry ring buffer"]
        UDT1["UltimateDarkTower\nWeb Bluetooth"]
        TOWER1["Physical Tower 🗼"]

        WS1 -->|replay command| UDT1
        WS1 -->|log entry| CLOG1
        UDT1 -->|"BLE write\n20-byte command"| TOWER1
    end

    subgraph CLIENT2["Remote Player 2 (Browser)"]
        WS2["TowerRelay\nWebSocket client"]
        CLOG2["ClientLogger\n500-entry ring buffer"]
        UDT2["UltimateDarkTower\nWeb Bluetooth"]
        TOWER2["Physical Tower 🗼"]

        WS2 -->|replay command| UDT2
        WS2 -->|log entry| CLOG2
        UDT2 -->|"BLE write\n20-byte command"| TOWER2
    end

    subgraph OBSERVER["Observer (Browser, no tower)"]
        WS3["TowerRelay\nWebSocket client\n{observer: true}"]
        VIZ["TowerVisualizer\nrtdt_unpack_state()"]

        WS3 -->|decode command| VIZ
    end

    RELAY -->|"tower:command + seq\n(broadcast)"| WS1
    RELAY -->|"tower:command + seq\n(broadcast)"| WS2
    RELAY -->|"tower:command + seq\n(broadcast)"| WS3
    CLOG1 -.->|"client:log\n(every 30s)"| RELAY
    CLOG2 -.->|"client:log\n(every 30s)"| RELAY
```

---

## Component Descriptions

### FakeTower (`packages/host/src/fakeTower.ts`)

FakeTower is a BLE peripheral that impersonates the real Return to Dark Tower hardware.

- **Advertises** the same GATT service UUID and device name as the physical tower.
- **Accepts connections** from the official companion app, which believes it is talking to a real tower.
- **Intercepts writes** to the tower's command characteristic (20-byte packets).
- **Fires a callback** (`onCommandReceived`) with the raw bytes for every intercepted command.

Implementation uses `@stoprocent/bleno` for BLE peripheral mode on Node.js.
Service and characteristic UUIDs come from the [UltimateDarkTower](https://github.com/chessmess/UltimateDarkTower) library constants.

### CommandParser (`packages/host/src/commandParser.ts`)

Validates and annotates raw BLE write payloads before they enter the relay.

- Checks that packets are exactly **20 bytes** long (the fixed tower command length).
- Future iterations can decode the byte structure (drum position, light state, skull/glyph flags, audio) for logging and selective relay.

### RelayServer (`packages/host/src/relayServer.ts`)

WebSocket server that broadcasts intercepted tower commands to all connected remote clients.

- Maintains a set of active client connections via `ConnectionManager`.
- Assigns a monotonic sequence number (`seq`) to each broadcast for cross-log correlation.
- On new client connection: sends a `sync:state` message containing the last known command, so the remote tower can catch up immediately.
- Broadcasts `client:connected` / `client:disconnected` membership events.
- Sends periodic `host:status` updates so clients can display host health.
- Handles `client:log` messages from clients — forwards entries to `HostLogger` for centralized storage.
- Broadcasts `host:log-config` when the operator toggles the master logging switch.

### ConnectionManager (`packages/host/src/connectionManager.ts`)

Tracks active WebSocket client connections.

- Stores client metadata (ID, label, connect time) and the raw `WebSocket` socket.
- Provides `broadcast()` to send a message to all clients and `sendTo()` for unicast.

---

### TowerRelay (`packages/client/src/towerRelay.ts`)

The browser-side WebSocket client.

- Connects to the host relay server and sends a `client:hello` handshake.
- Receives `sync:state` on connect and replays it on the local tower for immediate catchup.
- Receives `tower:command` messages and replays each one on the local physical tower via Web Bluetooth.

### UltimateDarkTower (Web Bluetooth)

The [UltimateDarkTower](https://github.com/chessmess/UltimateDarkTower) library provides the complete BLE protocol implementation for browser-side tower control.

- Handles the Web Bluetooth device picker, GATT connection, and characteristic writes.
- The client receives raw 20-byte command arrays from the relay and writes them directly to the tower characteristic — no re-encoding needed.

### TowerVisualizer (`packages/client/src/towerVisualizer.ts`)

Renders decoded tower state for observer-mode clients (no physical tower).

- Accepts a `TowerState` object from `rtdt_unpack_state()` (exported by the `ultimatedarktower` library) and renders it into a DOM container.
- Displays 24 LEDs across 6 layers with CSS animations for each of the 6 light effects (`off`, `on`, `breathe`, `breatheFast`, `breathe50percent`, `flicker`).
- Shows drum positions (N/E/S/W), calibration status, and active glyph detection using the `GLYPHS` constant.
- Looks up audio sample names from `TOWER_AUDIO_LIBRARY` and displays volume.
- Detects skull drops by comparing `beam.count` between consecutive packets.
- Shows LED sequence override labels from `TOWER_LIGHT_SEQUENCES`.

Observer mode is activated by adding `?observer` to the client URL. The tower Bluetooth card is hidden and the visualizer section is shown instead.

---

## Why Full-State Commands Prevent Sync Drift

Every command the companion app sends to the tower is a **complete state snapshot** — it encodes the full tower state (all drum positions, all 24 LEDs, skull/glyph active flags, audio trigger) in a single 20-byte packet. There are no incremental delta messages.

This means:

- **No accumulation of drift.** A client that misses one command will be corrected by the next one. There is no dependency chain between commands.
- **Late joiners can catch up instantly.** The `sync:state` message carries the last full command, so a newly connected tower reaches the correct visual state immediately.
- **Fire-and-forget is safe.** Because each command is idempotent (replaying it twice produces the same result), the relay does not need acknowledgements or retry logic.

---

## Skull and Glyph Handling

The Return to Dark Tower uses skull and glyph symbols as binary flags within the command packet. Because each command is a full-state snapshot:

- If skulls are active, every subsequent command will include them until the companion app explicitly clears them.
- The relay does not need special skull/glyph logic — it faithfully relays whatever the companion app sends.
- Remote towers will display the same skull/glyph state as the host tower automatically.

---

## Structured Logging

All components produce structured JSONL log entries for post-session diagnostics. The host assigns a monotonic sequence number (`seq`) to each relayed command, enabling correlation across host and client log files regardless of clock skew.

### HostLogger (`packages/host/src/logger.ts`)

Writes two JSONL files per session: a host-only file and a combined file that interleaves host and client entries. Has a master on/off switch controllable from the Electron dashboard or via `LOGGING=0` env var. When disabled, all writes are no-ops but streams stay open.

### ClientLogger (`packages/client/src/clientLogger.ts`)

A 500-entry ring buffer in the browser. Entries are auto-sent to the host every 30 seconds via `client:log` WebSocket messages, and can also be sent manually or downloaded as a local `.jsonl` file. The host controls auto-send via `host:log-config` broadcasts.

### Log Analysis CLI (`packages/host/scripts/analyzeLogs.ts`)

Post-session analysis tool that reads JSONL files and produces reports: session summary, command timeline, host↔client correlation matrix, LED override analysis, anomaly detection (missing seq, hex mismatches, time gaps), and per-client summaries. Uses constants from the `ultimatedarktower` library for human-readable names.

---

## Data Flow Summary

```
Companion App
  │  BLE write (20 bytes)
  ▼
FakeTower (bleno)
  │  onCommandReceived(Buffer)
  ▼
CommandParser  ──validates──▶  drop if invalid
  │  valid ParsedCommand
  ▼
HostLogger  ──logs companion→host──▶  session-*-host.jsonl + session-*-all.jsonl
  │
  ▼
RelayServer.broadcast()  ──assigns seq──▶  HostLogger logs host→clients
  │  JSON: { type: "tower:command", payload: { data: [...], seq: N } }
  ├──▶  TowerRelay (Client 1)  ──▶  ClientLogger  ──▶  UltimateDarkTower  ──▶  Tower 1
  ├──▶  TowerRelay (Client 2)  ──▶  ClientLogger  ──▶  UltimateDarkTower  ──▶  Tower 2
  ├──▶  TowerRelay (Client N)  ──▶  ClientLogger  ──▶  UltimateDarkTower  ──▶  Tower N
  └──▶  TowerRelay (Observer)  ──▶  rtdt_unpack_state()  ──▶  TowerVisualizer  ──▶  Browser UI
                                        │
                                        └──▶  client:log (every 30s)  ──▶  HostLogger (all.jsonl)
```
