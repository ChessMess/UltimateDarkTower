# DarkTowerSync WebSocket Protocol

This document describes the WebSocket message protocol used between the host relay server (`packages/host`) and connected remote player clients (`packages/client`).

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
| `client:hello`        | Client → host  | Handshake sent immediately after WebSocket open      |
| `client:ready`        | Client → host  | Tower calibrated & ready to receive commands         |

---

## Message Payloads

### `tower:command`

Sent by the host each time the official companion app writes a 20-byte command to the fake tower's BLE characteristic. Clients should replay this on their local physical tower.

```json
{
  "type": "tower:command",
  "payload": {
    "data": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
  },
  "timestamp": "2026-03-19T12:00:00.123Z"
}
```

| Field          | Type       | Description                               |
| -------------- | ---------- | ----------------------------------------- |
| `payload.data` | `number[]` | Raw 20-byte tower command as a JSON array |

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
    "clientCount": 3,
    "lastCommandAt": "2026-03-19T12:00:55.000Z"
  },
  "timestamp": "2026-03-19T12:01:00.000Z"
}
```

| Field                    | Type             | Description                                                       |
| ------------------------ | ---------------- | ----------------------------------------------------------------- |
| `payload.relaying`       | boolean          | Whether the relay is actively forwarding commands                 |
| `payload.fakeTowerState` | string           | BLE peripheral state: `idle \| advertising \| connected \| error` |
| `payload.clientCount`    | number           | Number of currently connected clients                             |
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

> The host may disconnect clients whose `protocolVersion` is incompatible. Check the `PROTOCOL_VERSION` constant in `@dark-tower-sync/shared`.

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

## Connection Lifecycle

```
Client                                     Host
  |                                          |
  |------- WebSocket connect() ------------>|
  |<------ WebSocket open event ------------|
  |                                          |
  |------- client:hello ------------------>|  (client sends immediately)
  |<------ sync:state ----------------------|  (host responds with last known state)
  |<------ client:connected (broadcast) ----|  (host tells other clients)
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
