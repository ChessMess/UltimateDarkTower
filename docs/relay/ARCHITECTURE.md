# Architecture

*Docs: [Index](README.md) > Integrator > Architecture*

How UltimateDarkTowerRelay is put together: the packages, the data flow, the state model, the selectable
tower sources, and the event log. For a hands-on intro see [GETTING_STARTED.md](GETTING_STARTED.md); for
the wire protocol see [PROTOCOL.md](PROTOCOL.md).

---

## The core idea

The official *Return to Dark Tower* companion app drives the physical tower over Bluetooth LE, with the
**app as the BLE central** and the **tower as the peripheral**. A browser cannot advertise as a BLE
peripheral, so the relay runs in Node and advertises a **tower emulator peripheral** the app connects to. It
then decodes every command, fans it out to consumers over WebSocket, and synthesizes the tower→app return
traffic the app's state machine expects.

### Why the protocol makes this simple

Every command the app writes is a **complete 20-byte state snapshot** (1 command byte + 19 state bytes),
not an incremental delta, and the snapshots are **idempotent**. That has three consequences the whole
design leans on:

- A consumer that misses a command is corrected by the next one — no drift accumulates.
- A late joiner catches up instantly from the last command (`sync:state` on connect).
- Relaying is fire-and-forget safe; no acknowledgements or retry chains are needed.

This is why the **live state path is a single last-command snapshot, not event sourcing** (see
[State model](#state-model)).

---

## Packages

An npm-workspaces monorepo built on the published [`ultimatedarktower`](https://github.com/ChessMess/UltimateDarkTower)
core library. Build order is `shared → core → client → cli` via TypeScript composite project references.

| Package | Responsibility |
|---|---|
| `packages/shared` | The wire contract: the message envelope, `MessageType` + `make*Message` factories, the `RelayEvent` semantic-event union, and `PROTOCOL_VERSION`. No BLE or `ultimatedarktower` dependency. |
| `packages/core` | The headless engine: `TowerEmulator` (BLE peripheral), `RelayServer` + `ConnectionManager` (WebSocket transport), `NotificationSynthesizer`, `RealTower` (real-tower mirror), `EventLog`, `HostLogger`, and the pure `logAnalysis` helpers. Usable as a library. |
| `packages/cli` | A headless daemon (`index.ts`) plus the `replayEvents` and `analyzeLogs` tools. Suitable for servers, Raspberry Pi, Docker, or an always-on host. |
| `packages/electron` | An operator GUI over `core`: status dashboard, runtime tower-source switching, manual controls, and an in-app log viewer. |
| `packages/client` | The published, framework-agnostic consumer SDK — `RelayClient` (transport) and `PhysicalTowerReplay` (local-tower mirroring). Imports `shared` + `ultimatedarktower` types only; never `core`. |

`core` is consumed as a library by both the CLI and the Electron main process — the composition root that
wires a tower source to the relay lives in `packages/cli/src/index.ts` (and, source-swappable, in
`packages/electron/src/main/main.ts`).

---

## Data flow

```
Official App (phone, BLE central)
  │  BLE write (20-byte command)
  ▼
TowerEmulator (@stoprocent/bleno peripheral)  ◄── synthesized notifications ──┐
  │  decode (rtdt_unpack_state) → TowerState                              │
  ▼                                                                       │
core: last-command snapshot + RelayServer (assign monotonic seq) + EventLog
  │  ws: { type: "tower:command", payload: { data, seq } }                │
  ├──► participant consumer (mirrors commands to a local tower) ──────────┤
  ├──► screen-only consumer (decodes + renders)                           │
  └──► observer consumer (read-only)                                      │
                                                                          │
NotificationSynthesizer ──────────────────────────────────────────────────┘
  (per-write echo, calibration-complete, skull-drop driven by a
   participant-reported player action)
```

The host assigns each command a **monotonic `seq`** for cross-log correlation, broadcasts it to all
consumers, and stores it as the live snapshot. A participant reporting an action (`client:action`) feeds
the synthesizer, which sends a tower→app notification back through `TowerEmulator`.

---

## State model

The relay keeps a **hybrid state model** — a live snapshot *plus* a semantic event log — explicitly
*not* strict event sourcing, because the commands are already full-state idempotent snapshots.

- **Live state:** a single `TowerState` derived from the last full command. Drives consumers and the
  `sync:state` catch-up. Idempotent replays mean no drift.
- **Event log:** an append-only, monotonic-`seq` stream of *semantic* [`RelayEvent`](../packages/shared/src/relayEvents.ts)s
  (`app-connected` / `app-disconnected`, `command-received`, `skull-dropped`, `calibration-complete`,
  `heartbeat`, `consumer-joined` / `consumer-left`), persisted as JSONL.

The two streams are separate: `HostLogger` keeps the byte/command + human-readable debug log
(`session-*.jsonl`); `EventLog` persists the structured events (`events-*.jsonl`) with its **own**
monotonic `seq`, independent of the relay's command-broadcast `seq`. `EventLog` supports replay and
export (`loadEventLog` / `replayEventLog` / `exportEventLog`), exposed through the `replayEvents` CLI.

---

## Tower sources

`core` defines a `TowerSource` seam — `startAdvertising()` / `stopAdvertising()` plus
`command` / `state-change` / `companion-connected` / `companion-disconnected` events — so the relay is
agnostic to *where* the tower traffic comes from. The CLI selects one via `TOWER_SOURCE`:

| `TOWER_SOURCE` | Source | Notes |
|---|---|---|
| `emulator` (default) | `TowerEmulator` | BLE peripheral the official app connects to. The standard mode. (Legacy alias: `fake`.) |
| `mock` | `MockTower` | BLE-free canned-command source for headless testing/demos. |
| `real` | `RealTower` | Connects to a **physical master tower** as a BLE central and relays its state outward (read-only mirror). |
| `bridge` | `TowerEmulator` + `RealTower` | The app drives a tower emulator whose commands are forwarded verbatim onto a real master tower. |

`TowerEmulator` and `MockTower` also implement a `NotificationSink`, so the CLI wires the
`NotificationSynthesizer` only for sink-capable sources. `RealTower` has no sink — a real tower produces
its own notifications.

### Real-tower path

`RealTower` drives the tower through UDT's high-level `UltimateDarkTower` class (not the raw adapter),
which owns disconnect **detection** (GATT health check + verified battery-heartbeat timeout →
`onTowerDisconnect`). `RealTower` adds the reconnect **policy** — reconnect-on-drop with capped
exponential backoff and a background initial-connect retry (so you can start the relay before powering the
tower on), following UDT's documented `onTowerDisconnect → connect()` pattern. It relays the raw 20-byte
state verbatim via UDT's public `onTowerResponse` hook. `@stoprocent/noble` is an **optional** dependency,
constructed lazily at connect time — the emulator/mock paths never load it.

> **Bridge caveat:** `bridge` mode needs the host BLE stack to act as peripheral (bleno) *and* central
> (noble) simultaneously, which not every adapter supports — it may require a second BLE dongle. See
> [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## Notification synthesis

`TowerEmulator` already produces the **per-write echo** every command needs (clearing the transient audio/LED
bytes, with an animation delay so the app doesn't interrupt the animation) — see [TOWER_EMULATOR.md](TOWER_EMULATOR.md).
The `NotificationSynthesizer` completes the return traffic:

- **Skull drop** — a participant's `client:action` drives the skull-drop notification (incrementing the
  count via `buildSkullDropPacket`), replacing the old operator-only manual injection.
- **Calibration-complete** — responds to the calibration opcode; the reply's message-type byte is
  configurable (default `0x00` tower-state response, optionally `0x08` `CALIBRATION_FINISHED`).
- **Heartbeat** — no periodic beat by default (the initial heartbeat + per-write echoes suffice); an
  opt-in interval exists as a fallback.

All synthesized tower-state notifications are encoded via `rtdt_pack_state` over the last-command
baseline, so unrelated state bytes are preserved. (Seal breaks are **not** synthesized — they are
app-command-driven; only the physically-detected skull drop is synthesized.)

---

## Transport & resilience

- `RelayServer` assigns the `seq`, broadcasts `tower:command`, and sends `sync:state` to each new client.
- `ConnectionManager` handles the client lifecycle: a 10s handshake timeout, 20s ping/pong keepalive, and
  dead-client termination.
- `relay:paused` / `relay:resumed` broadcast when the companion app disconnects/reconnects ("Game Paused").
- The SDK's `RelayClient` auto-reconnects with exponential backoff and refuses to reconnect on a protocol
  version mismatch (close code `4000`).

See [PROTOCOL.md](PROTOCOL.md) for the message-level detail.

---

## Testing discipline

Tests stay **BLE-free** by importing the specific module under test (never the `core` barrel, which
re-exports `TowerEmulator` → `@stoprocent/bleno`) and injecting mocks — a mock BLE adapter for `RealTower`, a
mock `WebSocket` for `RelayClient`, a mock `TowerWriter` for `PhysicalTowerReplay`. The official app's
reaction cannot be unit-tested without the app, so timing-sensitive behavior is validated against recorded
sessions and on-hardware runs.

---

**See also:** [GETTING_STARTED.md](GETTING_STARTED.md) · [API.md](API.md) · [PROTOCOL.md](PROTOCOL.md) ·
[TOWER_EMULATOR.md](TOWER_EMULATOR.md)
