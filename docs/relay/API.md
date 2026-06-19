# API reference

*Docs: [Index](README.md) > Integrator > API*

**Before reading:** [GETTING_STARTED](GETTING_STARTED.md) covers prerequisites and a first connection.
[ARCHITECTURE](ARCHITECTURE.md) explains how the relay fits together. **Changelog:** [../CHANGELOG.md](../CHANGELOG.md).

This document covers the public API exported by `ultimatedarktowerrelay-client`, the framework-agnostic
consumer SDK. It follows the shared [API documentation standard](https://github.com/ChessMess/UltimateDarkTower/blob/main/docs/API_STYLE.md)
used across the UDT-family repos. The wire-level message types live in `ultimatedarktowerrelay-shared`
and are documented in [PROTOCOL.md](PROTOCOL.md).

## Exports

```ts
import { RelayClient, PhysicalTowerReplay } from 'ultimatedarktowerrelay-client';
import type {
  RelayClientOptions, RelayClientEvent, RelayClientEventHandler,
  WebSocketLike, WebSocketConstructor,
  TowerWriter, PhysicalTowerReplayOptions,
} from 'ultimatedarktowerrelay-client';
```

The SDK is **isomorphic**: it uses the global `WebSocket` in the browser, or an injected implementation
(e.g. the `ws` package) in Node. It depends only on `ultimatedarktowerrelay-shared` and `ultimatedarktower`
types — never on the relay `core`.

---

## Classes

### `RelayClient`

The transport. Opens a WebSocket to the relay host, completes the `client:hello` handshake, decodes each
relayed command into a `TowerState`, and (as a participant) reports player actions. Auto-reconnects with
exponential backoff. Use this for **every** consumer — observer or participant.

```ts
import { RelayClient } from 'ultimatedarktowerrelay-client';

const client = new RelayClient({
  label: 'My Visualizer',
  observer: true,
  onEvent: (e) => { if (e.type === 'state') render(e.state); },
});
await client.connect('ws://192.168.1.5:8765');
```

#### Constructor

```ts
new RelayClient(options?: RelayClientOptions)
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `options.label` | `string` | — | Display name sent in `client:hello` (e.g. a player name). |
| `options.observer` | `boolean` | `false` | If `true`, this is a read-only observer; the relay rejects `dropSkull()` from it. Omit for a participant. |
| `options.onEvent` | `RelayClientEventHandler` | no-op | Called for every relay event (see [`RelayClientEvent`](#relayclientevent)). |
| `options.webSocketImpl` | `WebSocketConstructor` | global `WebSocket` | WebSocket implementation. In Node (no stable global `WebSocket` before v22), pass the `ws` package's `WebSocket`. Throws at construction if none is available. |

#### Methods

- `connect(url: string): Promise<void>` — open a connection to the relay host (e.g.
  `ws://192.168.1.5:8765`) and send the handshake. Resolves once the socket is open; rejects on a 15s
  connection timeout or socket error. Enables auto-reconnect.
- `dropSkull(): boolean` — report a participant skull-drop; the relay synthesizes the matching tower→app
  notification. Returns `false` (no-op) if not connected; rejected by the relay for observers.
- `sendReady(ready: boolean): void` — tell the host this client's physical tower is calibrated and ready
  (or no longer ready). No-op if not connected.
- `sendRaw(json: string): void` — send a pre-serialized client→host message verbatim. An escape hatch for
  consumers that build their own messages (e.g. a client-side logger pushing `client:log` batches). Prefer
  the typed methods where they cover the action. No-op if not connected.
- `disconnect(): void` — close the connection cleanly and disable auto-reconnect.
- `getState(): TowerState` — the most recently decoded tower state (a default state before any command).
- `getLastCommand(): number[] | null` — the last raw 20-byte command received, or `null`.

#### Getters

- `isConnected: boolean` — `true` while the WebSocket is open.

---

### `PhysicalTowerReplay`

Mirrors relayed commands onto a **local physical tower** via an injected [`TowerWriter`](#towerwriter).
This is the participant consumer that keeps a remote player's own tower in sync with the host's master
tower. Screen-only consumers don't need it — they render `RelayClient`'s decoded `state` events instead.

It deliberately keeps transport in `RelayClient` (composition): your app fans `RelayClient`'s single
`onEvent` out to both your UI handler and `replay.handleEvent`. It imports no `ultimatedarktower` value and
no browser global, so it is unit-testable with a mock writer — no browser, no BLE, no hardware.

```ts
import { RelayClient, PhysicalTowerReplay } from 'ultimatedarktowerrelay-client';
import { UltimateDarkTower } from 'ultimatedarktower';

const replay = new PhysicalTowerReplay({ onLog });
const client = new RelayClient({
  onEvent: (e) => { replay.handleEvent(e); appUiHandler(e); },
});

const tower = new UltimateDarkTower(); // satisfies TowerWriter structurally
tower.onCalibrationComplete = () => {
  replay.setTower(tower);
  client.sendReady(true);
  void replay.replayLast(); // self-heal after a (re)connect
};
tower.onTowerDisconnect = () => { replay.setTower(null); client.sendReady(false); };
```

#### Constructor

```ts
new PhysicalTowerReplay(options?: PhysicalTowerReplayOptions)
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `options.tower` | `TowerWriter \| null` | `null` | The local tower driver. May be set/cleared later via `setTower`. |
| `options.onLog` | `(message: string, error?: unknown) => void` | no-op | Diagnostics hook called on each write attempt; `error` is present only when the write rejected. |

#### Methods

- `handleEvent(event: RelayClientEvent): void` — route a `RelayClient` event here. Command-bearing events
  (`tower:command`, non-null `sync:state`, `host:resend`) are cached and queued for write; all others are
  ignored. (`state` is deliberately *not* handled — it would double-write.)
- `setTower(tower: TowerWriter | null): void` — set or clear the local tower driver (e.g. on
  connect/disconnect). A reconnect typically supplies a fresh driver instance.
- `replayLast(): Promise<void>` — re-apply the last cached command to the local tower. Call on
  reconnect / calibration-complete to self-heal a tower that missed commands. Resolves immediately if
  nothing has been relayed yet; never rejects (write errors route to `onLog`).
- `getLastCommand(): number[] | null` — the last relayed 20-byte command cached for self-heal, or `null`.

Writes are **tower-ready-gated** (only a connected, calibrated tower is written) and **serialized** through
a promise queue, so concurrent relayed commands can't interleave BLE writes.

---

## Types

### `RelayClientEvent`

The discriminated union passed to `onEvent`. Narrow on `event.type`:

| `type` | Fields | Meaning |
|---|---|---|
| `relay:connected` | — | Socket open + handshake sent. |
| `relay:disconnected` | `code: number`, `reason: string` | Socket closed. |
| `relay:reconnecting` | `attempt: number`, `delayMs: number` | A reconnect attempt is scheduled. |
| `relay:reconnect-failed` | `attempts: number` | Gave up after the max attempts (10). |
| `relay:error` | `error: unknown` | A socket error fired. |
| `relay:paused` | `reason: string` | Companion app disconnected from the tower emulator ("Game Paused"). |
| `relay:resumed` | — | Companion app reconnected. |
| `relay:version-mismatch` | `reason: string` | Protocol-version mismatch (close `4000`); the client will **not** reconnect. |
| `tower:command` | `data: number[]`, `seq: number \| null` | A relayed raw 20-byte command. |
| `sync:state` | `lastCommand: number[] \| null` | Catch-up state on connect. |
| `state` | `state: TowerState`, `lastCommand: number[]` | Decoded tower state, emitted after each `tower:command` and non-null `sync:state`. |
| `client:connected` | `clientId: string`, `label?: string` | Another consumer joined. |
| `client:disconnected` | `clientId: string` | Another consumer left. |
| `host:status` | `status: HostStatus` | Periodic host status (see [PROTOCOL.md](PROTOCOL.md#hoststatus)). |
| `host:log-config` | `enabled: boolean` | Operator toggled automatic client-log submission. |
| `relay:tower:alert` | `clientId: string`, `label?: string`, `towerConnected: boolean` | A remote player's tower BLE connection changed. |
| `host:resend` | `data: number[]` | Operator manually re-sent the last tower state. |

`TowerState` is from [`ultimatedarktower`](https://github.com/ChessMess/UltimateDarkTower); `HostStatus` is
from `ultimatedarktowerrelay-shared`.

### `RelayClientOptions`

Constructor options for [`RelayClient`](#relayclient). See the constructor table above.

### `RelayClientEventHandler`

`(event: RelayClientEvent) => void` — the `onEvent` callback signature.

### `TowerWriter`

The minimal write surface [`PhysicalTowerReplay`](#physicaltowerreplay) needs from a local tower driver.
UDT's `UltimateDarkTower` satisfies it structurally, so you inject `new UltimateDarkTower()` directly;
tests inject a mock.

```ts
interface TowerWriter {
  readonly isConnected: boolean;   // true while a BLE connection is open
  readonly isCalibrated: boolean;  // true once the tower can accept state writes
  sendTowerCommandDirect(command: Uint8Array): Promise<void>;
}
```

### `PhysicalTowerReplayOptions`

Constructor options for [`PhysicalTowerReplay`](#physicaltowerreplay). See the constructor table above.

### `WebSocketLike` / `WebSocketConstructor`

The minimal browser-`WebSocket`-shaped surface the SDK uses, and its constructor type. Both the browser
global `WebSocket` and the `ws` package's `WebSocket` satisfy them; you only reference these when typing a
custom `webSocketImpl`.

---

## Other packages

| Package | What it provides | Reference |
|---|---|---|
| `ultimatedarktowerrelay-shared` | The wire message types, `MessageType` + `make*Message` factories, `RelayEvent`, `PROTOCOL_VERSION`, `HostStatus`. | [PROTOCOL.md](PROTOCOL.md) |
| `ultimatedarktowerrelay-core` | The host-side engine (`TowerEmulator`, `RelayServer`, `NotificationSynthesizer`, `RealTower`, `EventLog`, …). Consumed by the CLI/Electron, not by browser consumers. | [ARCHITECTURE.md](ARCHITECTURE.md) |

---

**See also:** [GETTING_STARTED.md](GETTING_STARTED.md) · [ARCHITECTURE.md](ARCHITECTURE.md) ·
[PROTOCOL.md](PROTOCOL.md)
