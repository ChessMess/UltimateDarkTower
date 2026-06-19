# Troubleshooting

*Docs: [Index](README.md) > Operator / Integrator > Troubleshooting*

Operational fixes for running the relay host and connecting consumers. For setup steps see
[SETUP.md](SETUP.md); for the design see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## The companion app

### The app stalls on "checking firmware"

**Cause:** the official app reads the Bluetooth Device Information Service (DIS) firmware revision before
it proceeds, and **macOS CoreBluetooth cannot expose the DIS** in peripheral mode.

**Fix:** run the relay host on a **non-macOS** machine (Linux / Raspberry Pi or Windows), which exposes the
DIS automatically. On macOS, use the real-tower handoff: connect the app to a real tower to clear the
screen, then reconnect to the tower emulator. If the app reports the tower as out of date, set the firmware
value it accepts via `TOWER_DIS_FIRMWARE_REVISION`. Full detail:
[MACOS_BLE_PERIPHERAL_LIMITATION.md](MACOS_BLE_PERIPHERAL_LIMITATION.md).

### The app never finds the tower emulator

- **BLE range / pairing path** — the phone running the app must stay within ~10 m of the host. Pair it via
  **iPhone Mirroring** (macOS Sequoia 15+) or Android **Phone Link**.
- **Linux/Pi permissions** — Node needs raw-socket access for peripheral mode:
  `sudo setcap cap_net_raw,cap_net_admin+eip $(which node)`.
- **Advertising** — the relay advertises **by name only** (`ReturnToDarkTower`); confirm the startup log
  shows it advertising and, on non-macOS, `exposing Device Information Service`.

### A command animation gets interrupted, or the app pauses ~18s between commands

**Cause:** the per-write echo timing. If the echo doesn't clear the transient audio/LED bytes (or doesn't
delay for animations), the app reads the tower as "still animating" and falls back to a hardcoded timeout.
This is handled by `TowerEmulator`; the tuning constants are capture-pending. See [TOWER_EMULATOR.md](TOWER_EMULATOR.md).

---

## BLE on the host

### "Stop BLE" on macOS doesn't disconnect the app

**Cause:** macOS CoreBluetooth has no peripheral-initiated disconnect API, so `bleno.disconnect()` is a
no-op there. The relay stops advertising and goes idle, but the OS keeps the existing GATT link until the
process exits. This is a macOS-only dev limitation — on Linux/Pi the disconnect works. (A write arriving
while only advertising is treated as a "ghost connection" and promotes the state back to connected.)

### `TOWER_SOURCE=real` won't connect or keeps reconnecting

- The relay scans for `ReturnToDarkTower` and must be the **sole** BLE central on that tower — the official
  app cannot be connected to the same tower at the same time.
- `@stoprocent/noble` is an **optional** native dependency. If its prebuild wasn't available, real mode
  prints a clear error; install build tools and reinstall, or use `emulator`/`mock`.
- You can start the relay **before** powering the tower on — it retries the initial connect with backoff
  (`1→2→4→8→16→30s`) and reconnects on drop.

### `TOWER_SOURCE=bridge` fails or only one role works

**Cause:** bridge mode needs the host BLE stack to act as **peripheral (bleno) and central (noble)
simultaneously**. Not every adapter/stack supports this, and the two native addons can contend for the HCI
device. **Fix:** use a **second BLE dongle** for one of the roles, and run on Linux/Pi or Windows (the app
still needs the DIS). This path is hardware-dependent — validate on your setup.

---

## Consumers (WebSocket SDK)

### The client can't connect to the host

- Use the host's LAN address and port: `ws://<host-ip>:8765` (configurable via `RELAY_PORT`). The relay is
  **LAN-only** in v1 — no `wss`, no internet rendezvous.
- Check the host firewall allows inbound TCP on the relay port, and that client and host are on the same
  network.
- `connect()` rejects after a **15-second** timeout if the host doesn't respond.

### The client disconnects and won't reconnect

If the close was a **protocol-version mismatch** (close code `4000`), the SDK intentionally does **not**
auto-reconnect — a hard reload is required. Check that the client and host ship the same `PROTOCOL_VERSION`
(from `ultimatedarktowerrelay-shared`). The SDK emits a `relay:version-mismatch` event in this case. All
other non-clean closes auto-reconnect with backoff (up to 10 attempts).

### `RelayClient: no WebSocket implementation available` (Node)

There's no stable global `WebSocket` in Node before v22. Pass one in:

```ts
import { WebSocket } from 'ws';
new RelayClient({ webSocketImpl: WebSocket, /* … */ });
```

### A participant's local tower doesn't mirror commands

`PhysicalTowerReplay` is **tower-ready-gated** — it only writes to a connected, **calibrated** tower. Make
sure your app calls `replay.setTower(tower)` and `client.sendReady(true)` on `onCalibrationComplete`, and
`void replay.replayLast()` to re-apply the last command after a (re)connect. See
[GETTING_STARTED.md](GETTING_STARTED.md#4-mirror-commands-onto-a-local-tower-physicaltowerreplay).

---

## Logs & diagnostics

The host writes two JSONL streams to its logs folder: `session-*.jsonl` (commands + debug) and
`events-*.jsonl` (semantic events). Inspect them without touching BLE:

```bash
npm run analyze:logs    # session summary, command timeline, correlation, anomalies
npm run replay:events   # inspect / replay / export the event log
```

---

**See also:** [SETUP.md](SETUP.md) · [MACOS_BLE_PERIPHERAL_LIMITATION.md](MACOS_BLE_PERIPHERAL_LIMITATION.md) ·
[TOWER_EMULATOR.md](TOWER_EMULATOR.md) · [PROTOCOL.md](PROTOCOL.md)
