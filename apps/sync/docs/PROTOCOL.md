# DarkTowerSync WebSocket Protocol

This document describes the WebSocket message protocol used between the host relay server (`packages/host`) and connected remote player clients (`packages/client`).

---

## Table of Contents

- [Overview](#overview)
- [Message Types](#message-types)
- [Message Payloads](#message-payloads)
  - [`tower:command`](#towercommand)
  - [`sync:state`](#syncstate)
  - [`client:connected`](#clientconnected)
  - [`client:disconnected`](#clientdisconnected)
  - [`host:status`](#hoststatus)
  - [`client:hello`](#clienthello)
  - [`client:ready`](#clientready)
  - [`client:log`](#clientlog)
  - [`host:log-config`](#hostlog-config)
  - [`relay:paused`](#relaypaused)
  - [`relay:resumed`](#relayresumed)
  - [`relay:tower:alert`](#relaytoweralert)
- [Connection Lifecycle](#connection-lifecycle)
  - [Key rules](#key-rules)

---

## Overview

All messages are **JSON-encoded** objects sent as WebSocket text frames. Every message follows the same envelope structure:

```json
{
  "type": "<message-type>",
  "payload": { ... },
  "timestamp": "2026-03-19T12:00:00.000Z"
}
```

| Field       | Type   | Description                                           |
| ----------- | ------ | ----------------------------------------------------- |
| `type`      | string | Message type discriminant (see table below)           |
| `payload`   | object | Message-specific data                                 |
| `timestamp` | string | ISO-8601 UTC timestamp set by the sender at send time |

---

## Message Types

| Type                  | Direction      | Description                                          |
| --------------------- | -------------- | ---------------------------------------------------- |
| `tower:command`       | Host → clients | Relay a raw 20-byte tower command                    |
| `sync:state`          | Host → client  | Full-state catchup for a newly connected client      |
| `client:connected`    | Host → clients | A new client has joined the relay                    |
| `client:disconnected` | Host → clients | A client has left the relay                          |
| `host:status`         | Host → clients | Periodic host status update                          |
| `host:log-config`     | Host → clients | Enable or disable automatic client log submission    |
| `client:hello`        | Client → host  | Handshake sent immediately after WebSocket open      |
| `client:ready`        | Client → host  | Tower calibrated & ready to receive commands         |
| `client:log`          | Client → host  | Batch of structured log entries for centralized storage |
| `relay:paused`        | Host → clients | Game paused — companion app disconnected from FakeTower |
| `relay:resumed`       | Host → clients | Game resumed — companion app reconnected to FakeTower |
| `relay:tower:alert`   | Host → clients | A remote player's tower BLE connection changed       |

---

## Message Payloads

### `tower:command`

Sent by the host each time the official companion app writes a 20-byte command to the fake tower's BLE characteristic. Clients should replay this on their local physical tower.

```json
{
  "type": "tower:command",
  "payload": {
    "data": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    "seq": 42
  },
  "timestamp": "2026-03-19T12:00:00.123Z"
}
```

| Field          | Type       | Description                                                     |
| -------------- | ---------- | --------------------------------------------------------------- |
| `payload.data` | `number[]` | Raw 20-byte tower command as a JSON array                       |
| `payload.seq`  | `number?`  | Monotonic sequence number assigned by the relay for log correlation |

> **Note:** The byte array is always exactly 20 elements. Clients should validate length before writing to the tower characteristic.
>
> **Packet format:** For the full byte-by-byte layout (drum positions, LED effects, audio, beam break counter, volume) see [UltimateDarkTower/TOWER_TECH_NOTES.md](../../UltimateDarkTower/TOWER_TECH_NOTES.md#command-packet-structure-documentation).

---

### `sync:state`

Sent once to a newly connected client immediately after the WebSocket connection is established. Contains the most recent full-state tower command so the remote tower can catch up without waiting for the next command.

```json
{
  "type": "sync:state",
  "payload": {
    "lastCommand": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  "timestamp": "2026-03-19T12:00:00.200Z"
}
```

| Field                 | Type              | Description                                          |
| --------------------- | ----------------- | ---------------------------------------------------- |
| `payload.lastCommand` | `number[] \| null`| Last command bytes, or `null` if no command yet sent |

---

### `client:connected`

Broadcast to all clients when a new client joins the relay.

```json
{
  "type": "client:connected",
  "payload": {
    "clientId": "a3f2c1d4-...",
    "label": "Player 2"
  },
  "timestamp": "2026-03-19T12:00:01.000Z"
}
```

| Field              | Type    | Description                                |
| ------------------ | ------- | ------------------------------------------ |
| `payload.clientId` | string  | Unique ID assigned to the client           |
| `payload.label`    | string? | Display name from the CLIENT_HELLO, if any |

---

### `client:disconnected`

Broadcast to all remaining clients when a client disconnects.

```json
{
  "type": "client:disconnected",
  "payload": {
    "clientId": "a3f2c1d4-..."
  },
  "timestamp": "2026-03-19T12:01:00.000Z"
}
```

| Field              | Type   | Description                    |
| ------------------ | ------ | ------------------------------ |
| `payload.clientId` | string | ID of the client that left     |

---

### `host:status`

Sent periodically (every ~5 seconds) and on significant state changes. Clients can use this to display host health in the UI.

```json
{
  "type": "host:status",
  "payload": {
    "relaying": true,
    "fakeTowerState": "connected",
    "appConnected": true,
    "clientCount": 3,
    "towersConnected": 2,
    "lastCommandAt": "2026-03-19T12:00:55.000Z"
  },
  "timestamp": "2026-03-19T12:01:00.000Z"
}
```

| Field                    | Type             | Description                                                       |
| ------------------------ | ---------------- | ----------------------------------------------------------------- |
| `payload.relaying`       | boolean          | Whether the relay is actively forwarding commands                 |
| `payload.fakeTowerState` | string           | BLE peripheral state: `idle \| advertising \| connected \| error` |
| `payload.appConnected`   | boolean          | Whether the companion app is connected to the fake tower          |
| `payload.clientCount`    | number           | Number of currently connected clients                             |
| `payload.towersConnected`| number           | How many clients have their physical tower BLE connection active  |
| `payload.lastCommandAt`  | `string \| null` | ISO timestamp of the last relayed command                         |

---

### `client:hello`

Sent by the client **immediately** after the WebSocket `open` event fires.

```json
{
  "type": "client:hello",
  "payload": {
    "label": "Player 2",
    "protocolVersion": "0.1.0"
  },
  "timestamp": "2026-03-19T12:00:00.100Z"
}
```

| Field                     | Type    | Description                                        |
| ------------------------- | ------- | -------------------------------------------------- |
| `payload.label`           | string? | Optional display name chosen by the player         |
| `payload.protocolVersion` | string  | Protocol version the client speaks (semver string) |

> The host logs a warning if the client's `protocolVersion` does not match its own. Clients are **not** forcibly disconnected for version mismatches in the current implementation. Check the `PROTOCOL_VERSION` constant in `@dark-tower-sync/shared`.

---

### `client:ready`

Sent by the client after its local tower has been connected via Web Bluetooth and calibration has completed. Can also be sent with `ready: false` when the tower disconnects.

```json
{
  "type": "client:ready",
  "payload": {
    "ready": true
  },
  "timestamp": "2026-03-19T12:00:05.000Z"
}
```

| Field           | Type    | Description                                              |
| --------------- | ------- | -------------------------------------------------------- |
| `payload.ready` | boolean | `true` when calibrated and ready; `false` on disconnect  |

> The host updates the client's state to `'ready'` or `'connected'` accordingly. This allows the host dashboard and other clients to see which players have their towers online and calibrated.

---

### `client:log`

Sent by the client to submit structured log entries to the host for centralized, persistent storage. Entries are batched — typically sent automatically every 30 seconds, or immediately via the "Send Logs" button.

```json
{
  "type": "client:log",
  "payload": {
    "entries": [
      {
        "ts": "2026-03-19T12:00:00.123Z",
        "seq": 42,
        "dir": "client←host",
        "hex": "0001020304050607080910111213141516171819",
        "src": "Player 2",
        "level": "cmd",
        "decoded": { "cmdType": 0, "drumStates": [1, 2], "ledStates": [3,4,5,6,7,8,9,10,11,12,13,14], "audio": 21, "beamBreak": [22, 23], "volumeDrumBeam": 24, "ledOverride": 14 }
      }
    ]
  },
  "timestamp": "2026-03-19T12:00:30.000Z"
}
```

| Field              | Type         | Description                              |
| ------------------ | ------------ | ---------------------------------------- |
| `payload.entries`  | `LogEntry[]` | Array of structured log entries to store |

> The host writes these entries to the combined `session-*-all.jsonl` log file. Each entry's `src` field is tagged with the client ID if not already set.

---

### `host:log-config`

Sent by the host when the operator toggles the master logging switch. Clients use this to start or stop their automatic log submission timer.

```json
{
  "type": "host:log-config",
  "payload": {
    "enabled": false
  },
  "timestamp": "2026-03-19T12:05:00.000Z"
}
```

| Field             | Type    | Description                                              |
| ----------------- | ------- | -------------------------------------------------------- |
| `payload.enabled` | boolean | `true` to enable auto-send; `false` to pause auto-send  |

> When `enabled` is `false`, clients stop their 30-second auto-send timer but continue buffering entries locally. The "Send Logs" and "Download Logs" buttons always work regardless of this setting.

---

### `relay:paused`

Broadcast immediately when the companion app disconnects from FakeTower. All clients should display a pause overlay until `relay:resumed` is received.

```json
{
  "type": "relay:paused",
  "payload": {
    "reason": "Companion app disconnected from FakeTower"
  },
  "timestamp": "2026-03-19T12:10:00.000Z"
}
```

| Field            | Type   | Description                                              |
| ---------------- | ------ | -------------------------------------------------------- |
| `payload.reason` | string | Human-readable reason for the pause                      |

---

### `relay:resumed`

Broadcast when the companion app reconnects to FakeTower. Clients should dismiss any pause overlay.

```json
{
  "type": "relay:resumed",
  "payload": {},
  "timestamp": "2026-03-19T12:10:15.000Z"
}
```

No payload fields.

---

### `relay:tower:alert`

Broadcast when a remote player's physical tower BLE connection changes. Allows other players and the host to see who has a live tower.

```json
{
  "type": "relay:tower:alert",
  "payload": {
    "clientId": "a3f2c1d4-...",
    "label": "Player 2",
    "towerConnected": false
  },
  "timestamp": "2026-03-19T12:11:00.000Z"
}
```

| Field                    | Type    | Description                                              |
| ------------------------ | ------- | -------------------------------------------------------- |
| `payload.clientId`       | string  | ID of the affected client                                |
| `payload.label`          | string? | Display name of the affected client, if known            |
| `payload.towerConnected` | boolean | `true` if the tower just reconnected; `false` if lost    |

---

## Connection Lifecycle

```
Client                                     Host
  |                                          |
  |------- WebSocket connect() ------------>|
  |                                          |
  |<------ sync:state ----------------------|  (host sends immediately on connect)
  |<------ client:connected (broadcast) ----|  (host tells existing clients)
  |                                          |
  |------- client:hello ------------------>|  (client sends immediately after open)
  |                                          |  [host marks handshake complete;
  |                                          |   10s timeout if hello never arrives]
  |                                          |
  |  [user clicks "Connect to Tower"]        |
  |  [BLE connect + calibrate]               |
  |                                          |
  |------- client:ready {ready:true} ----->|  (tower calibrated)
  |                                          |
  |     [companion app issues a command]     |
  |<------ tower:command -------------------|  (host relays to all clients)
  |<------ tower:command -------------------|
  |         ...                              |
  |<------ host:status (periodic) ----------|
  |                                          |
  |  [tower disconnects unexpectedly]        |
  |------- client:ready {ready:false} ---->|
  |                                          |
  |------- WebSocket close() ------------->|
  |<------ client:disconnected (broadcast) -|
```

### Key rules

1. **`client:hello` must be the first message** the client sends. The host may log a warning if it receives other messages before the handshake.
2. **`sync:state` is always sent** to a new client, even if `lastCommand` is `null`. Clients must handle both cases.
3. **`tower:command` messages are fire-and-forget.** There is no acknowledgement — the protocol prioritizes low latency over guaranteed delivery. A missed command is corrected by the next full-state command from the companion app.
4. **Protocol versioning:** both sides include the version in their hello/status messages. Future breaking changes will increment the minor or major version.
5. **`client:ready` should be sent after tower calibration completes.** Clients should also send `ready: false` if the tower disconnects, so the host can track which players have live towers. Commands received before the tower is calibrated should be ignored.
