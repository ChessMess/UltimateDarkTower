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
| `TOWER_SOURCE` | `fake` | `fake` (real BLE) or `mock` (BLE-free) |
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

## Consumers

Any consumer connects with the SDK (`ultimatedarktowerrelay-client`) to
`ws://<host>:<RELAY_PORT>`. For a quick headless check on the same machine:

```bash
npm run mock:consumer                 # observer
MOCK_ROLE=participant npm run mock:consumer   # participant — fires a demo dropSkull
```
