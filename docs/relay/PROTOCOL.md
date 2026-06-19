# UltimateDarkTowerRelay WebSocket Protocol

This document describes the WebSocket message protocol between the **relay host** (`packages/core`'s
`RelayServer`, run by `packages/cli` or `packages/electron`) and connected **consumer clients** (the published
`packages/client` SDK — `RelayClient`). Consumers may be *participants* (a remote player driving a physical
tower, e.g. [UltimateDarkTowerSync](../../UltimateDarkTowerSync)) or screen-only *observers*/digital consumers
(e.g. a visualizer or UTDD). The protocol is intentionally a low-churn **superset** of the protocol Sync
originally defined.

> This is the **client-facing wire protocol**. The relay also maintains a separate, append-only **semantic
> event log** (`RelayEvent`, see `packages/shared/src/relayEvents.ts` + `packages/core/src/eventLog.ts`) for
> host-side persistence/replay — that is an internal stream, not a client wire message, and is not covered
> here.

---

## Table of Contents

- [Overview](#overview)
- [Message Types](#message-types)
- [Message Payloads](#message-payloads)
  - [`tower:command`](#towercommand)
  - [`host:resend`](#hostresend)
  - [`sync:state`](#syncstate)
  - [`client:connected`](#clientconnected)
  - [`client:disconnected`](#clientdisconnected)
  - [`host:status`](#hoststatus)
  - [`client:hello`](#clienthello)
  - [`client:ready`](#clientready)
  - [`client:action`](#clientaction)
  - [`client:log`](#clientlog)
  - [`host:log-config`](#hostlog-config)
  - [`relay:paused`](#relaypaused)
  - [`relay:resumed`](#relayresumed)
  - [`relay:tower:alert`](#relaytoweralert)
- [Connection Lifecycle](#connection-lifecycle)
  - [Key rules](#key-rules)

---

## Overview

All messages are **JSON-encoded** objects sent as WebSocket text frames. Every message follows the same
envelope structure:

```json
{
  "type": "<message-type>",
  "payload": { ... },
  "timestamp": "2026-06-18T12:00:00.000Z"
}
```

| Field       | Type   | Description                                           |
| ----------- | ------ | ----------------------------------------------------- |
| `type`      | string | Message type discriminant (see table below)           |
| `payload`   | object | Message-specific data                                 |
| `timestamp` | string | ISO-8601 UTC timestamp set by the sender at send time |

The canonical definitions live in `packages/shared/src/protocol.ts` (`MessageType`, the per-message
`BaseMessage<…>` shapes, and `make*Message` factories) and `packages/shared/src/version.ts`
(`PROTOCOL_VERSION`).

---

## Message Types

| Type                  | Direction      | Description                                              |
| --------------------- | -------------- | ------------------------------------------------------- |
| `tower:command`       | Host → clients | Relay a raw 20-byte tower command                       |
| `host:resend`         | Host → clients | Operator re-sent the last tower state (distinct from a live command) |
| `sync:state`          | Host → client  | Full-state catchup for a newly connected client         |
| `client:connected`    | Host → clients | A new client has joined the relay                       |
| `client:disconnected` | Host → clients | A client has left the relay                             |
| `host:status`         | Host → clients | Periodic host status update                             |
| `host:log-config`     | Host → clients | Enable or disable automatic client log submission       |
| `client:hello`        | Client → host  | Handshake sent immediately after WebSocket open         |
| `client:ready`        | Client → host  | Tower calibrated & ready to receive commands            |
| `client:action`       | Client → host  | Participant reports a player action (e.g. dropped a skull) |
| `client:log`          | Client → host  | Batch of structured log entries for centralized storage |
| `relay:paused`        | Host → clients | Game paused — companion app disconnected from FakeTower  |
| `relay:resumed`       | Host → clients | Game resumed — companion app reconnected to FakeTower    |
| `relay:tower:alert`   | Host → clients | A remote player's tower BLE connection changed           |

---

## Message Payloads

### `tower:command`

Sent by the host each time the official companion app writes a 20-byte command to the fake tower's BLE
characteristic (or, in `TOWER_SOURCE=real`, each verbatim state notification from a real master tower).
Tower-bearing clients replay this on their local physical tower (via `PhysicalTowerReplay`); observers decode
it for display.

```json
{
  "type": "tower:command",
  "payload": {
    "data": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    "seq": 42
  },
  "timestamp": "2026-06-18T12:00:00.123Z"
}
```

| Field          | Type       | Description                                                          |
| -------------- | ---------- | ------------------------------------------------------------------- |
| `payload.data` | `number[]` | Raw 20-byte tower command as a JSON array                           |
| `payload.seq`  | `number?`  | Monotonic sequence number assigned by the relay for log correlation |

> **Note:** The byte array is always exactly 20 elements. Clients should validate length before writing to the
> tower characteristic.
>
> **Packet format:** For the full byte-by-byte layout (drum positions, LED effects, audio, beam break counter,
> volume) see [UltimateDarkTower TOWER_TECH_NOTES.md](../../UltimateDarkTower/docs/TOWER_TECH_NOTES.md#command-packet-structure-documentation).

---

### `host:resend`

Broadcast when the host **operator manually re-sends the last tower state** (e.g. from the Electron GUI or a
`mockConsumer`-driven resend). It carries the same 20 bytes as a `tower:command` but uses a distinct type so
host/client logs can tell an operator-triggered resend apart from a live app command. `PhysicalTowerReplay`
treats it like a command and replays it on the local tower.

```json
{
  "type": "host:resend",
  "payload": {
    "data": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  "timestamp": "2026-06-18T12:00:10.000Z"
}
```

| Field          | Type       | Description                              |
| -------------- | ---------- | ---------------------------------------- |
| `payload.data` | `number[]` | The last full-state 20-byte command bytes |

---

### `sync:state`

Sent once to a newly connected client immediately after the WebSocket connection is established. Contains the
most recent full-state tower command so the remote tower can catch up without waiting for the next command.

```json
{
  "type": "sync:state",
  "payload": {
    "lastCommand": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  "timestamp": "2026-06-18T12:00:00.200Z"
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
  "timestamp": "2026-06-18T12:00:01.000Z"
}
```

| Field              | Type    | Description                                |
| ------------------ | ------- | ------------------------------------------ |
| `payload.clientId` | string  | Unique ID assigned to the client           |
| `payload.label`    | string? | Display name from the `client:hello`, if any |

---

### `client:disconnected`

Broadcast to all remaining clients when a client disconnects.

```json
{
  "type": "client:disconnected",
  "payload": {
    "clientId": "a3f2c1d4-..."
  },
  "timestamp": "2026-06-18T12:01:00.000Z"
}
```

| Field              | Type   | Description                |
| ------------------ | ------ | ------------------------- |
| `payload.clientId` | string | ID of the client that left |

---

### `host:status`

Sent periodically (every ~5 seconds) and on significant state changes. Clients can use this to display host
health in the UI. The payload is the `HostStatus` type (`packages/shared/src/types.ts`).

```json
{
  "type": "host:status",
  "payload": {
    "relaying": true,
    "fakeTowerState": "connected",
    "appConnected": true,
    "clientCount": 3,
    "towersConnected": 2,
    "observerCount": 1,
    "lastCommandAt": "2026-06-18T12:00:55.000Z"
  },
  "timestamp": "2026-06-18T12:01:00.000Z"
}
```

| Field                    | Type             | Description                                                       |
| ------------------------ | ---------------- | ----------------------------------------------------------------- |
| `payload.relaying`       | boolean          | Whether the relay is actively forwarding commands                 |
| `payload.fakeTowerState` | string           | BLE peripheral state: `idle \| advertising \| connected \| error` |
| `payload.appConnected`   | boolean          | Whether the companion app is connected to the fake tower          |
| `payload.clientCount`    | number           | Number of currently connected clients                             |
| `payload.towersConnected`| number           | How many clients have their physical tower BLE connection active  |
| `payload.observerCount`  | number           | How many connected clients are observers (no physical tower)      |
| `payload.lastCommandAt`  | `string \| null` | ISO timestamp of the last relayed command                         |

---

### `client:hello`

Sent by the client **immediately** after the WebSocket `open` event fires.

```json
{
  "type": "client:hello",
  "payload": {
    "label": "Player 2",
    "protocolVersion": "0.1.0",
    "observer": true
  },
  "timestamp": "2026-06-18T12:00:00.100Z"
}
```

| Field                     | Type     | Description                                                                  |
| ------------------------- | -------- | ---------------------------------------------------------------------------- |
| `payload.label`           | string?  | Optional display name chosen by the player                                   |
| `payload.protocolVersion` | string   | Protocol version the client speaks (semver string)                           |
| `payload.observer`        | boolean? | If `true`, client is an observer with no physical tower (visualizer only). Omitted or `false` for normal tower-bearing clients. |

> If the client's `protocolVersion` does not match the host's, the host closes the socket with close code
> **`4000`** (`CLOSE_CODE_PROTOCOL_VERSION_MISMATCH`); clients should **not** auto-reconnect on that code (a
> hard reload is required). Check the `PROTOCOL_VERSION` constant in `ultimatedarktowerrelay-shared`.

---

### `client:ready`

Sent by the client after its local tower has been connected via Web Bluetooth and calibration has completed.
Can also be sent with `ready: false` when the tower disconnects.

```json
{
  "type": "client:ready",
  "payload": {
    "ready": true
  },
  "timestamp": "2026-06-18T12:00:05.000Z"
}
```

| Field           | Type    | Description                                              |
| --------------- | ------- | -------------------------------------------------------- |
| `payload.ready` | boolean | `true` when calibrated and ready; `false` on disconnect  |

> The host updates the client's state to `'ready'` or `'connected'` accordingly. This allows the host
> dashboard and other clients to see which players have their towers online and calibrated.

---

### `client:action`

Sent by a **participant** client to report a player action the physical tower would normally detect (e.g. a
dropped skull), so the relay can **synthesize the matching tower→app notification** (via
`NotificationSynthesizer`). Observers **must not** send this — the relay rejects actions from observer clients
(PRD §4.4). The `action` field is a string literal kept extensible for future actions.

```json
{
  "type": "client:action",
  "payload": {
    "action": "dropSkull"
  },
  "timestamp": "2026-06-18T12:00:20.000Z"
}
```

| Field            | Type   | Description                                            |
| ---------------- | ------ | ----------------------------------------------------- |
| `payload.action` | string | The reported action. Currently `"dropSkull"`.         |

> In the SDK this is sent via `RelayClient.dropSkull()`, which is a no-op for observer clients.

---

### `client:log`

Sent by the client to submit structured log entries to the host for centralized, persistent storage. Entries
are batched — typically sent automatically (e.g. every 30 seconds), or immediately on demand.

```json
{
  "type": "client:log",
  "payload": {
    "entries": [
      {
        "ts": "2026-06-18T12:00:00.123Z",
        "seq": 42,
        "dir": "client←host",
        "hex": "0001020304050607080910111213141516171819",
        "src": "Player 2",
        "level": "cmd",
        "decoded": { "cmdType": 0, "drumStates": [1, 2], "ledStates": [3,4,5,6,7,8,9,10,11,12,13,14], "audio": 21, "beamBreak": [22, 23], "volumeDrumBeam": 24, "ledOverride": 14 }
      }
    ]
  },
  "timestamp": "2026-06-18T12:00:30.000Z"
}
```

| Field              | Type         | Description                              |
| ------------------ | ------------ | ---------------------------------------- |
| `payload.entries`  | `LogEntry[]` | Array of structured log entries to store |

> The host writes these entries to the combined `session-*-all.jsonl` log file. The SDK exposes
> `RelayClient.sendRaw(json)` as the transport seam consumers use to send pre-serialized `client:log` batches
> (e.g. Sync's `ClientLogger`); the bundled `mockConsumer` does not report logs by default.

---

### `host:log-config`

Sent by the host when the operator toggles the master logging switch. Clients use this to start or stop their
automatic log submission timer.

```json
{
  "type": "host:log-config",
  "payload": {
    "enabled": false
  },
  "timestamp": "2026-06-18T12:05:00.000Z"
}
```

| Field             | Type    | Description                                              |
| ----------------- | ------- | -------------------------------------------------------- |
| `payload.enabled` | boolean | `true` to enable auto-send; `false` to pause auto-send  |

> When `enabled` is `false`, clients stop their auto-send timer but continue buffering entries locally. Manual
> send/download remains available regardless of this setting.

---

### `relay:paused`

Broadcast immediately when the companion app disconnects from FakeTower. All clients should display a pause
overlay until `relay:resumed` is received.

```json
{
  "type": "relay:paused",
  "payload": {
    "reason": "Companion app disconnected from FakeTower"
  },
  "timestamp": "2026-06-18T12:10:00.000Z"
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
  "timestamp": "2026-06-18T12:10:15.000Z"
}
```

No payload fields.

---

### `relay:tower:alert`

Broadcast when a remote player's physical tower BLE connection changes. Allows other players and the host to
see who has a live tower.

```json
{
  "type": "relay:tower:alert",
  "payload": {
    "clientId": "a3f2c1d4-...",
    "label": "Player 2",
    "towerConnected": false
  },
  "timestamp": "2026-06-18T12:11:00.000Z"
}
```

| Field                    | Type    | Description                                              |
| ------------------------ | ------- | -------------------------------------------------------- |
| `payload.clientId`       | string  | ID of the affected client                                |
| `payload.label`          | string? | Display name of the affected client, if known            |
| `payload.towerConnected` | boolean | `true` if the tower just reconnected; `false` if lost    |

---

## Connection Lifecycle

### Tower-bearing client (participant)

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
  |------- client:action {dropSkull} ----->|  (participant reports a skull drop)
  |<------ host:status (periodic) ----------|
  |                                          |
  |  [tower disconnects unexpectedly]        |
  |------- client:ready {ready:false} ---->|
  |                                          |
  |------- WebSocket close() ------------->|
  |<------ client:disconnected (broadcast) -|
```

### Observer client (no physical tower)

```
Observer                                   Host
  |                                          |
  |------- WebSocket connect() ------------>|
  |                                          |
  |<------ sync:state ----------------------|  (observer decodes & visualizes)
  |<------ client:connected (broadcast) ----|
  |                                          |
  |------- client:hello {observer:true} -->|  (host tracks as observer)
  |                                          |
  |     [companion app issues a command]     |
  |<------ tower:command -------------------|  (observer decodes via rtdt_unpack_state)
  |         ...                              |
  |<------ host:status (periodic) ----------|  (includes observerCount)
  |                                          |
  |------- WebSocket close() ------------->|
  |<------ client:disconnected (broadcast) -|
```

Observer clients never send `client:ready` or `client:action` — they have no tower. The host counts them
separately in `host:status.observerCount` and rejects `client:action` from them.

### Key rules

1. **`client:hello` must be the first message** the client sends. The host may log a warning if it receives
   other messages before the handshake.
2. **`sync:state` is always sent** to a new client, even if `lastCommand` is `null`. Clients must handle both
   cases.
3. **`tower:command` messages are fire-and-forget.** There is no acknowledgement — the protocol prioritizes
   low latency over guaranteed delivery. A missed command is corrected by the next full-state command from the
   companion app.
4. **Protocol versioning:** the client sends its `protocolVersion` in `client:hello`; a mismatch closes the
   socket with code `4000`. Future breaking changes will increment the minor or major version.
5. **`client:ready` should be sent after tower calibration completes.** Clients should also send `ready: false`
   if the tower disconnects, so the host can track which players have live towers. Commands received before the
   tower is calibrated are ignored (`PhysicalTowerReplay` is tower-ready-gated).
6. **`client:action` is participant-only.** Observers send `client:hello` with `observer: true`, receive all
   `tower:command` messages, but never send `client:ready` or `client:action`. They decode commands client-side
   using `rtdt_unpack_state()` and display the tower state visually.
