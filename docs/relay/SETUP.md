# Setup — running the relay per platform

The relay advertises a **fake BLE tower** the official *Return to Dark Tower* companion
app connects to, then relays tower traffic to digital consumers over WebSocket.

> **Key platform fact:** only **non-macOS** hosts can expose the Device Information
> Service the app needs to clear its "checking firmware" screen. See
> [MACOS_BLE_PERIPHERAL_LIMITATION.md](MACOS_BLE_PERIPHERAL_LIMITATION.md). For a
> **standalone** fake tower (no real-tower handoff), use Linux / Raspberry Pi or Windows.

Common steps:

```bash
npm install
npm run build
npm start            # fake BLE tower (companion app connects)
# or, no hardware:
npm run start:mock   # BLE-free canned-command source
```

Environment:

| Var | Default | Purpose |
|---|---|---|
| `RELAY_PORT` | `8765` | WebSocket relay port |
| `TOWER_SOURCE` | `fake` | `fake` (real BLE) · `mock` (BLE-free) · `real` (drive from a physical master tower) · `bridge` (app→FakeTower→real tower) |
| `LOGGING` | on | set `0` to disable JSONL logging |
| `TOWER_DIS_FIRMWARE_REVISION` | captured value | DIS firmware revision the app gates on |
| `TOWER_DIS_{MANUFACTURER,MODEL,HARDWARE_REVISION,SOFTWARE_REVISION}` | captured values | other DIS fields |

---

## macOS (primary dev platform)

```bash
npm start
```

macOS **cannot expose the DIS** (CoreBluetooth blocks `0x180A` in peripheral mode), so
the app stalls on "checking firmware". Workaround: connect the app to a **real tower**
to clear that screen, then reconnect to the fake tower. For a standalone experience use
Linux/Pi or Windows. See [MACOS_BLE_PERIPHERAL_LIMITATION.md](MACOS_BLE_PERIPHERAL_LIMITATION.md).

The phone running the official app must stay within BLE range (~10 m) of the host; pair
it via **iPhone Mirroring** (macOS Sequoia 15+) or Android **Phone Link**.

---

## Linux / Raspberry Pi (standalone fake tower)

A Raspberry Pi Zero W (or any BlueZ Linux host) can expose the DIS, so the app clears
the firmware screen **without** a real-tower handoff — ideal for an always-on fake tower.

### 1. Install BlueZ and Node.js

```bash
# Debian/Ubuntu/Raspberry Pi OS
sudo apt-get update
sudo apt-get install -y bluetooth bluez libbluetooth-dev libudev-dev
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Grant Node raw-socket access for BLE peripheral mode

```bash
sudo setcap cap_net_raw,cap_net_admin+eip $(which node)
```

(Or run with `sudo` during development — not recommended for production.)

### 3. Run the relay

```bash
npm install && npm run build
# Override the firmware revision if the app reports the tower as out of date:
TOWER_DIS_FIRMWARE_REVISION=<value-the-app-accepts> npm start
```

On startup the log shows `exposing Device Information Service (firmware: …)`. Connect the
official app (Android via Phone Link, or an iOS device) and confirm it clears "checking
firmware". The exact firmware value the current app accepts is unconfirmed — validate
against the live app and set `TOWER_DIS_FIRMWARE_REVISION` accordingly.

---

## Windows

The Windows BLE stack also exposes the DIS. BLE **peripheral** mode in Node is the
blocker: the built-in stack may need an external USB BLE dongle compatible with
`@stoprocent/bleno`. Once advertising works, the DIS is exposed like Linux. Run the
official app via **Phone Link** (Windows 11).

---

## Real master tower (`TOWER_SOURCE=real`)

Instead of advertising a fake tower, the relay can connect to a **physical** tower as a
BLE central and relay its state to consumers (PRD FR-5.1 — the "master tower → remote
mirrors" model). This needs the optional native dependency **`@stoprocent/noble`**
(installed automatically where its prebuild is available; if its build fails the relay
still runs in fake/mock mode, and `TOWER_SOURCE=real` prints a clear error).

```bash
TOWER_SOURCE=real npm start
```

The relay scans for `ReturnToDarkTower`, connects, subscribes to its notifications, and
broadcasts each 20-byte state packet to consumers. This mode is **read-only** — it
mirrors the tower's state outward; it does not drive/write to the tower, and it must be
the sole BLE connection to that tower (the official app can't be connected to the same
tower at the same time). Works on Linux/Raspberry Pi or macOS as a central.

`TOWER_SOURCE=real` is **resilient** (FR-5.3): it drives the tower through UDT's high-level
`UltimateDarkTower` class, which monitors the connection (GATT health check + battery-heartbeat
timeout with verification) and reports drops; the relay then retries the initial connect in the
background (so you can start it before powering the tower on) and reconnects with backoff when the
tower drops (showing "Game Paused", then resuming).

---

## Bridge mode — app drives a real tower (`TOWER_SOURCE=bridge`)

Runs a **FakeTower** (the official app connects to it, as in `fake` mode) **and** a
**RealTower** together: every command the app writes is forwarded **verbatim** onto a
physical master tower the relay drives as a BLE central, while the same commands are
broadcast to mirror / digital consumers. This lets the app drive a real tower *through*
the relay (PRD §11 Q5 — simultaneous fake + real).

```bash
TOWER_SOURCE=bridge npm start
```

Requirements & caveats:
- Needs **both** `@stoprocent/bleno` (peripheral, for the app) **and** `@stoprocent/noble`
  (central, for the real tower).
- The app needs the DIS, so — like standalone `fake` mode — bridge mode realistically runs
  on **Linux/Raspberry Pi or Windows**, not macOS.
- ⚠️ **Concurrent BLE roles:** the host's adapter must act as peripheral *and* central at the
  same time. Not all adapters/stacks support this, and the two native addons may contend for
  the HCI device — you may need a **second BLE dongle**. This is a hardware constraint to
  validate on your setup.
- The real tower is a **write-only target** here: its own notifications aren't broadcast (the
  app/FakeTower is the source of truth), and the RealTower reconnects in the background if it
  drops.

---

## Consumers

Any consumer connects with the SDK (`ultimatedarktowerrelay-client`) to
`ws://<host>:<RELAY_PORT>`. For a quick headless check on the same machine:

```bash
npm run mock:consumer                 # observer
MOCK_ROLE=participant npm run mock:consumer   # participant — fires a demo dropSkull
```
