# PRD — UltimateDarkTowerRelay

> **Status: draft / pre-implementation.** This is the founding PRD for a new repo. It follows the
> numbered-functional-requirement convention used by the `UltimateDarkTowerDigital` PRD suite (after
> the `../ai-dev-tasks` workflow) and can be split into a numbered suite (`_overview`, `prd-00`, …)
> later if the project grows.

---

## 1. Introduction / Overview

**UltimateDarkTowerRelay** is a standalone application that connects to Restoration Games' official
*Return to Dark Tower* (RTDT) companion app **as if it were a real tower**, then relays the tower
traffic to any number of digital consumers over a local network.

The official app talks to the physical tower over Bluetooth LE, with the app acting as the BLE
**central** and the tower as the BLE **peripheral**. A browser cannot advertise as a BLE peripheral
(Web Bluetooth is central-only), so any software that wants the official app to "drive" it must run a
Node/Electron process that advertises a fake tower peripheral. The relay is that process. It:

1. Advertises a fake tower the official app connects to.
2. Decodes every command the app writes and fans it out to digital consumers over WebSocket.
3. Synthesizes the tower→app return traffic a real tower would send — including responses driven by
   **player actions reported back from a consumer** (e.g. "I dropped a skull").

The first consumer is **UltimateDarkTowerDigital (UTDD)**, the solo base-game digital app (tower
emulator + board + player-board tracker, with the official app as the rules brain). UTDD's existing
PRD-05 already specifies a `BridgeSource` designed to consume exactly this relay. A second LAN consumer
(another digital game) is intended/future; the relay is therefore built for **N independent consumers
via a versioned client SDK**, not a one-off UTDD integration.

This repo also becomes the **shared bridge that `UltimateDarkTowerSync`** (`dark-tower-sync`) builds on.
Sync is the remote-multiplayer product — it lets players in different locations each use their own
*physical* tower and have it react/respond like the host's "master" tower. Today Sync ships its own
fake-tower + relay implementation; going forward it **drops that custom implementation and consumes this
repo's relay `core` + client SDK** instead. Sync keeps its own product identity (the multiplayer
experience and its hosted client); the relay owns the reusable fake-tower / relay / transport plumbing
that both Sync and digital consumers (UTDD) share.

### Where this fits in the UDT family

| Lib | npm | Role |
|---|---|---|
| `UltimateDarkTower` (UDT core) | `ultimatedarktower` | BLE driver, `TowerState`, 20-byte protocol, game-data types |
| `UltimateDarkTowerDisplay` | `ultimatedarktowerdisplay` | tower renderers (text / 2D / 3D) |
| `UltimateDarkTowerBoard` | `ultimatedarktowerboard` | board state + renderers |
| `UltimateDarkTowerDigital` (UTDD) | — | solo-game app; first relay consumer (`BridgeSource`) |
| **`UltimateDarkTowerRelay` (this repo)** | TBD | fake-tower BLE peripheral + WebSocket relay + consumer SDK |
| `UltimateDarkTowerSync` | `dark-tower-sync` | remote-multiplayer product (real towers); **consumes this repo's `core` + SDK** |

---

## 2. Goals

- **G1** — Let the official app connect to the relay as if it were a real tower (BLE peripheral) and
  stay connected for a full game session.
- **G2** — Decode every app→tower command into a `TowerState` and relay it to all connected consumers
  over WebSocket on the local network, with instant catch-up for late joiners.
- **G3** — **Complete the tower→app return traffic** so a digital consumer with no physical tower can
  play a full game against the app, including notifications driven by *consumer-reported* player
  actions.
- **G4** — Ship a reusable, versioned **client SDK** so any consumer app (UTDD first) integrates
  without re-implementing the transport.
- **G5** — **Be the bridge Sync consumes:** provide the reusable fake-tower / relay `core` + client SDK
  (including the real-tower and physical-tower-replay path) so `UltimateDarkTowerSync` can drop its own
  custom implementation and build its remote-multiplayer experience on this repo.
- **G6** — Maintain a **hybrid state model** — an authoritative live snapshot plus an append-only
  semantic event log — for catch-up, replay, audit, and debugging.

---

## 3. Hard constraint — why a Node/Electron process is required

The official app connects to the tower as a **BLE peripheral** (app = central). **A browser cannot
advertise as a BLE peripheral.** Therefore the relay must run in Node, advertising a fake peripheral.

`UltimateDarkTowerSync` already implements this in `packages/host/src/fakeTower.ts` using
[`@stoprocent/bleno`](https://www.npmjs.com/package/@stoprocent/bleno) — a maintained fork of the
otherwise-unmaintained `bleno`/`@abandonware/bleno`. The relay reuses and evolves this code.

> **Dependency risk:** `@stoprocent/bleno` (and `@stoprocent/noble` for the real-tower path) are
> community forks of native BLE addons. Pin versions and treat a maintenance lapse as a project risk.

---

## 4. Architecture

### 4.1 The protocol makes this simple

Every command the app writes is a **complete 20-byte state snapshot** (1 command byte + 19 state
bytes), not an incremental delta. Verified in `UltimateDarkTower/src/udtTowerState.ts`:
`rtdt_unpack_state` consumes the 19-byte state buffer where `beam.count` is big-endian at state bytes
15–16 (packet bytes 16–17; `SKULL_DROP_COUNT_POS = 17` is its low byte). Because commands are
full-state and **idempotent**:

- A consumer that misses a command is corrected by the next one — no drift accumulates.
- A late joiner catches up instantly from the last command (`sync:state` on connect).
- Relaying is fire-and-forget safe; no acknowledgements or retry chains are needed.

This is why the **live state path is a single last-command snapshot, not event sourcing** (see §7).

### 4.2 Monorepo packages

Evolves Sync's `{shared, host, client, electron}` layout into:

| Package | Purpose | Derived from |
|---|---|---|
| `packages/shared` | protocol envelope, `MessageType`, **`RelayEvent` semantic-event union**, `PROTOCOL_VERSION` | Sync `packages/shared/src/{protocol,types,logging,version}.ts` |
| `packages/core` | headless relay engine: `FakeTower`, `RelayServer`, `ConnectionManager`, `CommandParser`, **`NotificationSynthesizer`** (net-new), **`EventLog`** (net-new), last-snapshot store, real-tower driver path (`@stoprocent/noble`) | Sync `packages/host/src/*` (renamed `host` → `core`) |
| `packages/cli` | Node daemon entry (servers, Raspberry Pi, Docker, always-on host) | Sync `packages/host/src/index.ts` `main()` |
| `packages/electron` | operator GUI: status dashboard, BLE permissions, log viewer, manual controls | Sync `packages/electron/*` + Electron Forge config |
| `packages/client` | published, framework-agnostic **consumer SDK** | Sync `packages/client/src/towerRelay.ts` |

`packages/core` is usable as a library (the CLI and Electron main both consume it), exactly as Sync's
`host` package re-exports its classes today.

### 4.3 Data flow

```
Official App (iOS/Android phone, BLE central)
  │  BLE write (20-byte command)
  ▼
FakeTower (@stoprocent/bleno peripheral)  ◄── synthesized notifications ──┐
  │  decode (rtdt_unpack_state) → TowerState                              │
  ▼                                                                       │
core: snapshot store + RelayServer (assign monotonic seq) + EventLog      │
  │  ws: { type: "tower:command", payload: { data, seq } }                │
  ├──► Consumer A (UTDD BridgeSource)  ── reports dropSkull() ────────────┤
  ├──► Consumer B (other digital game)                                    │
  └──► Consumer N (observer, read-only)                                   │
                                                                          │
NotificationSynthesizer ──────────────────────────────────────────────────┘
  (heartbeat, per-write echo, calibration-complete, skull-drop driven by
   consumer-reported player actions)
```

### 4.4 Consumer roles

- **observer** — read-only; renders relayed state. Cannot trigger synthesized notifications.
- **participant** — may report player actions (e.g. `dropSkull()`) that drive synthesized tower→app
  notifications.

For v1, the relay designates **a single authoritative participant** for tower actions to avoid
conflicting reports. Multi-participant reconciliation is an open question (§11).

### 4.5 UTDD consumer integration (illustrative — implemented in the UTDD repo, not here)

UTDD implements a `BridgeSource` against its existing source interfaces in
`UltimateDarkTowerDigital/src/sources/types.ts` (`TowerStateSource` / `BoardStateSource`). It:

- subscribes to the relay's state stream and applies each `TowerState` to the UI;
- forwards player tower actions (`dropSkull()`) to the relay, which synthesizes the matching app
  notification.

Because every UTDD feature already reads/writes through the source interfaces (the MVP `ManualSource`
implements the same contract), swapping in `BridgeSource` requires **no UI changes**. Board placement
is **not** carried by the relay (see §8) and stays manual in the consumer.

---

## 5. Functional Requirements

### FR-1 — BLE FakeTower peripheral
1. **FR-1.1** The relay MUST advertise a BLE peripheral named `ReturnToDarkTower`
   (`TOWER_DEVICE_NAME`) exposing the Nordic UART service (`UART_SERVICE_UUID`,
   `6e400001-b5a3-f393-e0a9-e50e24dcca9e`) with a write characteristic
   (`UART_TX_CHARACTERISTIC_UUID`, `…0002`) and a notify characteristic
   (`UART_RX_CHARACTERISTIC_UUID`, `…0003`).
2. **FR-1.2** It MUST advertise **by name only** (omitting the 128-bit service UUID), because the UUID
   plus the full name exceeds the 31-byte advertisement budget and causes CoreBluetooth to truncate the
   name; the app scans by name prefix and would otherwise never match.
3. **FR-1.3** It MUST expose the Device Information Service identity the app reads after connecting
   (manufacturer, model, hardware/firmware/software revision), as captured from a real tower — subject
   to the macOS limitation in §6. **Confirmed (resolves §11 Q4):** the app *requires* the DIS firmware
   revision — without it it stalls on the "checking firmware" screen. The DIS identity is now
   **configurable** (`FakeTower({ deviceInfo })` / `TOWER_DIS_*` env) so the firmware revision can match
   what the app accepts as current; it is exposed on all **non-macOS** hosts (Linux/Raspberry Pi, Windows).
   See `docs/MACOS_BLE_PERIPHERAL_LIMITATION.md`.
4. **FR-1.4** It MUST accept the app's connection, intercept every 20-byte write to the command
   characteristic, and emit it for decoding and relay.

### FR-2 — Command decode + relay
1. **FR-2.1** Each intercepted command MUST be validated as exactly 20 bytes and decoded via
   `rtdt_unpack_state` into a `TowerState`.
2. **FR-2.2** Each valid command MUST be assigned a **monotonic `seq`** and broadcast to all consumers
   as a `tower:command` message `{ data: number[], seq }`.
3. **FR-2.3** On consumer connect, the relay MUST send a `sync:state` message carrying the last command
   so the consumer reaches the current visual state immediately.

### FR-3 — Notification synthesis
> The existing `FakeTower` already sends: an **initial** heartbeat (`07 00 00 0c 10`) on subscribe; a
> **per-write echo** state response (clearing audio + LED-override bytes, with a ~1600 ms delay for
> animation commands to match real-tower timing); a manual `injectSkullDrop()`; and the full DIS
> identity. The net-new work is to *complete and automate* the return traffic.
1. **FR-3.1** A participant's reported player action (e.g. `dropSkull()`) MUST drive the synthesized
   skull-drop notification — wiring the existing `injectSkullDrop()` / `buildSkullDropPacket`
   (which increments the count at `SKULL_DROP_COUNT_POS`) to consumer events instead of a manual
   operator click.
2. **FR-3.2** The relay MUST respond to the calibration opcode (`TOWER_COMMANDS.calibration = 4`) with
   a `CALIBRATION_FINISHED` notification (`TOWER_MESSAGES.CALIBRATION_FINISHED.value = 8`) **if** the
   app expects one (validate per §11).
3. **FR-3.3** A **periodic** battery heartbeat is **likely NOT required** — per the project owner's
   play experience, the official app does not appear to need continual battery notifications; the
   *initial* heartbeat (which `FakeTower` already sends) plus the per-write echoes have sufficed. Treat
   a recurring beat as a **fallback** to implement only if a capture shows the app timing out without
   it. (UDT *central* library reference values, not necessarily the app's: `BATTERY_STATUS_FREQUENCY =
   200 ms`, `DEFAULT_BATTERY_HEARTBEAT_TIMEOUT = 3000 ms`.)
4. **FR-3.4** All synthesized tower-state notifications MUST be encoded via `rtdt_pack_state`, using the
   last received command as the baseline so unrelated state bytes are preserved.

> **Seal breaks are NOT synthesized.** Per the project owner, a seal break is **app-driven via
> commands**, not a tower→app notification: the app commands the seal-doorway **light + sound sequence**
> on (app→tower), shows a "remove the seal" screen and waits, and when the player taps **Continue** it
> sends a **new tower state with the seal-doorway light cleared**. The relay simply relays those
> app→tower commands like any other state change; the consumer's `breakSeal()` stays a **local**
> concern (the player also confirms on the app). This is unlike `dropSkull()`, which the tower
> physically detects and which therefore *must* be synthesized (FR-3.1). The exact "light-off after
> Continue" encoding is unconfirmed — see §11 Q2.

### FR-4 — Consumer SDK (`packages/client`)
1. **FR-4.1** The SDK MUST connect to `ws://<host>:<port>` and complete a `client:hello` handshake
   carrying a role (`observer` | `participant`) and the protocol version.
2. **FR-4.2** It MUST expose subscriptions to relayed commands, decoded state, and `RelayEvent`s, and a
   method for participants to report player actions.
3. **FR-4.3** It MUST auto-reconnect with exponential backoff and refuse to reconnect on a protocol
   version mismatch (dedicated close code).
4. **FR-4.4** It MUST be framework-agnostic (no React/DOM dependency) so any consumer — including a
   UTDD `BridgeSource` — can wrap it.

### FR-5 — Shared bridge for Sync (real-tower path + resilience)
> The relay is the reusable bridge `UltimateDarkTowerSync` consumes. Sync's host already uses a
> fake-tower + relay; these requirements ensure the relay can fully replace Sync's custom implementation
> so Sync builds only its multiplayer UX on top.
1. **FR-5.1** The relay's `core` MUST support a selectable tower source: the **synthesized fake tower**
   (no hardware) or a **real tower** driven via `@stoprocent/noble` (`NodeBluetoothAdapter`), so a host
   with a real "master" tower can drive the relay.
   > **Implemented + hardware-validated (Phase 4, 2026-06-17).** `RealTower` (`core`), selectable via
   > `TOWER_SOURCE=real`; read-only mirror (relays 20-byte state, filters battery beats); noble is an
   > optional dep loaded lazily. Confirmed live: a physical skull drop relayed end-to-end with the correct
   > decoded count. Towers share the BLE name `ReturnToDarkTower`, so selection is by name (no address
   > selector — single tower is the common case).
2. **FR-5.2** The client SDK MUST support a **physical-tower-replay consumer** (writes relayed commands
   to a local real tower via Web Bluetooth) alongside digital and observer consumers — this is the
   consumer type Sync's remote players use.
   > **Implemented + hardware-validated (Phase 4, 2026-06-17).** `PhysicalTowerReplay` (`packages/client`)
   > is a thin consumer that subscribes to `RelayClient` events (via `handleEvent`, composition —
   > `RelayClient` stays transport-only) and writes each relayed 20-byte command to a local tower through
   > an **injected** `TowerWriter` (UDT's `UltimateDarkTower` satisfies it structurally; Web Bluetooth
   > lives in the browser app, not the SDK). Writes are tower-ready-gated (`isConnected && isCalibrated`)
   > and serialized; `replayLast()` re-syncs a tower that reconnects mid-session (FR-5.3). Unit-tested
   > BLE/browser-free with a mock writer. **Confirmed live:** a physical tower mirrored relayed rotation
   > commands end-to-end in Chrome — the tower-ready gate held writes until calibration, `replayLast()`
   > fired on calibration-complete, and steady-state per-command writes drove the drums (genuine commands
   > built with `rtdt_pack_state`, no guessed bytes). Harness: `examples/replay-e2e/`.
3. **FR-5.3** The relay MUST provide Sync's live-play resilience as first-class features: `relay:paused`
   / `relay:resumed` ("Game Paused" on app disconnect/reconnect), WebSocket reconnect with backoff,
   ping/pong keepalive, handshake timeout, dead-client detection, and observer mode.
   > **Implemented (Phase 4, 2026-06-17).** The client/server/FakeTower resilience was ported in
   > Phases 1–3 — handshake timeout (10s) + ping/pong keepalive (20s) + dead-client termination
   > (`connectionManager.ts`), `relay:paused`/`relay:resumed` (`relayServer.ts`, wired in the CLI),
   > WS reconnect+backoff + observer mode (`relayClient.ts`). This slice closes the **real-tower** gaps by
   > rebuilding `RealTower` onto UDT's **high-level `UltimateDarkTower` class**, which owns the disconnect
   > *detection* (GATT health check + battery-heartbeat timeout with GATT verification → `onTowerDisconnect`).
   > `RealTower` adds the reconnect *policy*: **reconnect on drop** with capped exponential backoff
   > (re-emitting `companion-disconnected`/`companion-connected` → relay pause/resume) and **initial-connect
   > retry** in the background (start the relay before the tower is powered), following UDT's documented
   > `onTowerDisconnect → connect()` pattern. Verbatim relaying uses a new public `onTowerResponse` hook
   > added to UDT (the raw bytes; `onTowerStateUpdate` is decoded). **Hardware-validated (2026-06-17):**
   > initial-retry connected on power-up after retrying `1→2→4→8→16→30s`, and a power-cycle gave a clean
   > 1-disconnect → 1-reconnect → resume with no listener cascade. (An earlier hand-rolled stall/raw-adapter
   > version was wrong — the tower actually streams ~1–2 notifications/sec — and is removed.)
4. **FR-5.4** The relay MUST expose enough of `core` + `client` for Sync to **drop its own fake-tower /
   relay code and depend on this repo** without losing functionality.

### FR-6 — State + event log
1. **FR-6.1** The relay MUST keep the last command as the authoritative **live snapshot** (source of
   truth for current state and `sync:state`).
2. **FR-6.2** It MUST maintain an **append-only event log** of semantic `RelayEvent`s with monotonic
   `seq` (see §7), persisted as JSONL (evolving Sync's `HostLogger`).
3. **FR-6.3** It MUST support **replay/export** of a session's event log for debugging and audit.

### FR-7 — Form factors
1. **FR-7.1** `packages/core` MUST be usable as a headless library.
2. **FR-7.2** `packages/cli` MUST run the relay as a headless daemon (suitable for servers, Raspberry
   Pi, Docker, an always-on host).
3. **FR-7.3** `packages/electron` MUST provide an operator GUI over `core` (status, BLE permissions, log
   viewer, manual controls).
4. **FR-7.4** `packages/client` MUST be published as a consumer SDK package.

### FR-8 — Operations
1. **FR-8.1** Structured logging with a master on/off toggle, carrying over Sync's JSONL format and
   monotonic `seq` correlation.
2. **FR-8.2** A log-analysis CLI (carry over Sync's `analyzeLogs.ts`).
3. **FR-8.3** Graceful shutdown on SIGINT/SIGTERM (stop advertising, close relay, flush logs).
4. **FR-8.4** Configurable LAN bind host/port (`RELAY_PORT`, default `8765`).

---

## 6. Platform, BLE & operational constraints (Risks)

- **macOS CoreBluetooth peripheral limits** (encoded in `fakeTower.ts`):
  - Standard Bluetooth SIG UUIDs are blocked in peripheral mode → the **Device Information Service
    (0x180A) is skipped on macOS**. Sync still works without it, but the relay must confirm the official
    app tolerates a missing DIS (§11).
  - **No peripheral-initiated disconnect** → "ghost connection" recovery is required (promote to
    connected on a write received while advertising).
  - The 31-byte advertisement budget forces **name-only advertising** (FR-1.2).
- **Operational topology — the app runs on a phone, not the host.** The official app is an iOS/Android
  app; it is the BLE central. The practical way to pair it with a Mac-hosted bleno peripheral is **iPhone
  Mirroring** (macOS Sequoia 15+) or Android **Phone Link**. The phone must stay within **BLE range
  (~10 m)** of the host machine, and iOS must be prevented from suspending the companion app. This
  shapes who can realistically run the relay and MUST be documented in setup.
- **Platform matrix:** macOS = primary; Linux = supported with BlueZ; Windows host = stretch goal
  (needs a BLE dongle). Consumers (browser SDK) work on any Web Bluetooth-capable browser.

---

## 7. State & event-log design (hybrid)

The chosen model is **a live snapshot plus a semantic event log** — explicitly *not* strict event
sourcing, because commands are already full-state idempotent snapshots, so reconstructing live state by
replaying a log would be needless machinery.

- **Live state:** a single `TowerState` derived from the last full command. Drives consumers and
  `sync:state` catch-up. Idempotent replays mean no drift.
- **Event log:** append-only, monotonic `seq`, a `RelayEvent` union of *semantic* events derived from
  the byte stream and consumer actions — e.g. `AppConnected` / `AppDisconnected`, `CommandReceived`,
  `SkullDropped`, `CalibrationComplete`, `ConsumerJoined` / `ConsumerLeft`. Persisted as JSONL.
- **What the log buys us:** session replay, post-game audit, debugging desync, reconstructing the
  synthesized-notification history, and a foundation for any future derived game-event stream for
  consumers.

---

## 8. Non-Goals (v1)

- **Internet / remote access.** No Tailscale, hosted rendezvous, `wss`, room codes, or NAT traversal in
  v1 — LAN and same-machine consumers only (see §9).
- **Board placement over the relay.** The BLE tower protocol carries *tower* state, not *board*
  placement; the official app communicates foe/hero placement out-of-band via its own screen (confirmed
  in UTDD `assumptions-and-open-questions.md`, item 4). Digital consumers keep manual/assisted board
  entry; this is a protocol limitation, not a relay shortcoming.
- **Game rules.** The official app remains the rules brain; the relay does not reimplement them.
- **Reverse-engineering** beyond what is required to faithfully emulate tower I/O.
- **Multi-participant reconciliation** beyond a single authoritative tower-actor.

---

## 9. Future (out of v1)

- **Internet reach:** Tailscale (bring-your-own tailnet / MagicDNS) as the simplest path, or a hosted
  rendezvous with room codes for zero-config friend-to-friend play — both requiring `wss`, auth, and NAT
  traversal.
- **Multi-participant action reconciliation.**
- **Derived higher-level game-event stream** for consumers, built on the event log.
- **Online multiplayer** (overlaps UTDD PRD-06).

---

## 10. Intellectual property & ToS

*Return to Dark Tower* and its art, card text, sounds, board, and tower model are © Restoration Games.
UltimateDarkTowerRelay is an **unofficial, fan-made** project in the same family as the other UDT
libraries, intended for development and personal play. The relay **impersonates the official tower's BLE
identity** (device name and Device Information Service manufacturer / model / firmware values) solely so
the official app will connect for interoperability and personal use. The relay does **not**
reverse-engineer game content or redistribute copyrighted assets. Licensing and ToS implications MUST be
settled before any public or hosted build. (Mirrors UTDD's stance in
`UltimateDarkTowerDigital/docs/prd/assumptions-and-open-questions.md`.)

---

## 11. Open Questions

1. **Periodic heartbeat? — likely resolved (NO).** Project owner believes the official app does not
   require continual battery notifications, so FR-3.3 assumes the initial heartbeat + per-write echoes
   suffice. Confirm against a capture before dropping the periodic-beat fallback entirely.
2. **Seal break mechanism — understood, encoding unconfirmed.** Per the project owner, a seal break is
   **app-driven, not a tower→app notification**: the app drives the seal-doorway light + sound sequence
   via a command, shows a "remove the seal" screen and waits, then on **Continue** sends a new tower
   state that clears the seal-doorway light (suspected, not yet confirmed in a capture). Implication:
   the relay does **not** synthesize seal-break traffic — it relays the app's on/off commands, and the
   consumer's `breakSeal()` stays local (see FR-3 note). **To confirm:** the exact bytes of the
   light-off command after Continue.
3. **Which opcodes need synthesized responses,** and with exactly what timing/format? Validate against
   captured real-tower sessions before finalizing FR-3 packet shapes.
4. **Does the app tolerate the macOS-skipped DIS? — RESOLVED (no).** The app *requires* the DIS firmware
   revision and stalls on "checking firmware" without it. macOS CoreBluetooth cannot expose the DIS, so a
   **non-macOS host (Linux/Raspberry Pi, Windows) is required for a standalone fake tower**; on macOS the
   workaround is a real-tower handoff. The DIS firmware value is configurable (`TOWER_DIS_FIRMWARE_REVISION`
   / `FakeTower({ deviceInfo })`); the exact value the current app accepts is still to be validated against
   the live app. See `docs/MACOS_BLE_PERIPHERAL_LIMITATION.md` + `docs/SETUP.md`.
5. **Simultaneous modes? — RESOLVED (yes, via bridge mode).** `TOWER_SOURCE=bridge` runs a `FakeTower`
   (the app connects to it) and a `RealTower` together: every app→tower command is forwarded verbatim
   onto a real master tower the relay drives as central, while the same commands broadcast to mirror /
   digital consumers. **Caveat:** this needs the host BLE stack to act as peripheral (bleno) *and*
   central (noble) at once — not guaranteed on every adapter; may require a second BLE dongle or a
   specific platform. Hardware-validation item.
6. **Participant authority model** when multiple participants could report the same action.
7. **Electron packaging** — signing/notarization (macOS) and per-platform BLE entitlements.
8. **Sync migration path** — how Sync adopts the relay's `core` + `client` (npm dependency vs. shared
   workspace), what stays in Sync (its multiplayer UX, hosted client) vs. moves into the relay, and the
   version/release sequencing for the cutover.

---

## 12. Implementation phasing

1. **Scaffold + relay parity.** Stand up the monorepo (`shared` + `core` + `cli`); port FakeTower, the
   relay server, and the protocol from Sync; the CLI runs headless; decode + relay verified against a
   mock consumer.
2. **NotificationSynthesizer.** Wire consumer-reported actions → notifications (skull drop first);
   calibration-complete; resolve and implement the heartbeat decision; close the return-traffic loop
   `FakeTower` half-implements.
3. **Client SDK + UTDD `BridgeSource`.** Publish `packages/client`; UTDD implements `BridgeSource` and
   swaps `ManualSource` → bridge (this realizes UTDD PRD-05).
4. **Electron GUI + event log/replay + Sync adoption.** Operator GUI over `core`; event-log
   persistence/replay; the real-tower path + full resilience; then migrate `UltimateDarkTowerSync` onto
   the relay's `core` + `client`, removing Sync's custom fake-tower/relay code.
5. **Future.** Internet/Tailscale, rooms, multiplayer.

---

## 13. Test strategy

> **Constraint:** the official app's reaction cannot be unit-tested without the app. Rely on **recorded
> real-tower/app captures** (Sync's structured logs and `docs/{PROTOCOL,TECHNICAL_SPECIFICATION,
> TOWER_EMULATOR,TESTING}.md`) plus a **mock BLE central** harness for automated peripheral-side tests.

- **Unit:** `NotificationSynthesizer` output bytes compared against captured real-tower notifications;
  `CommandParser` 20-byte validation; `EventLog` append/replay ordering; `rtdt_pack_state` /
  `rtdt_unpack_state` round-trips.
- **Integration:** run the CLI relay with a mock WebSocket consumer; simulate an app connection (bleno
  on macOS/Linux); confirm the app stays connected and registers a skull drop when a participant reports
  `dropSkull()`.
- **End-to-end (manual):** the real official app via iPhone Mirroring (per Sync `docs/SETUP.md`), macOS
  host ↔ relay ↔ UTDD `BridgeSource` — drop a skull in UTDD and confirm the app registers it; have the
  app drive lights/drums and confirm UTDD renders them. Validate timing against captured sessions.

---

## 14. Reuse map (existing code to lift / evolve)

**From `UltimateDarkTowerSync`** (extracted into this repo's `core` / `client` / `shared`, so Sync can then depend back on them):
- `packages/host/src/fakeTower.ts` — BLE peripheral, command interception, per-write echo + animation
  timing, `injectSkullDrop`, DIS identity, ghost-connection recovery.
- `packages/host/src/{relayServer,connectionManager,commandParser,logger}.ts` — relay core, client
  lifecycle, 20-byte validation, `buildSkullDropPacket`, JSONL logging + `seq`.
- `packages/shared/src/{protocol,types,logging,version}.ts` — message envelope, factories, log format.
- `packages/client/src/towerRelay.ts` — consumer SDK basis (events, reconnect, handshake,
  paused/resumed).
- `packages/electron/*` + `forge.config.ts` — Electron Forge GUI + native-dependency packaging hook.
- `packages/host/src/index.ts` `main()` — CLI daemon wiring.

**From `UltimateDarkTower` (UDT core, `src/`):**
- `udtTowerState.ts` — `rtdt_pack_state` / `rtdt_unpack_state`, `STATE_DATA_LENGTH`.
- `udtConstants.ts` — `UART_*_UUID`, `TOWER_DEVICE_NAME`, `TOWER_COMMANDS`, `TOWER_MESSAGES`,
  `BATTERY_STATUS_FREQUENCY`, `DEFAULT_BATTERY_HEARTBEAT_TIMEOUT`, `SKULL_DROP_COUNT_POS`.
- `udtBleConnection.ts` — notification semantics (battery decode, skull-drop detection, calibration).
- `adapters/NodeBluetoothAdapter.ts` — real-tower driver for mirror mode.

**From `UltimateDarkTowerDigital` (consumer side — for the follow-up integration, not built here):**
- `src/sources/types.ts` — the `TowerStateSource` / `BoardStateSource` seam the `BridgeSource`
  implements.
