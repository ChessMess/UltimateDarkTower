# macOS BLE Peripheral Limitation: Standard GATT Service UUIDs

## Table of Contents

- [Problem Statement](#problem-statement)
- [How It Manifests in This Project](#how-it-manifests-in-this-project)
- [Root Cause](#root-cause)
- [Affected UUIDs](#affected-uuids)
- [Research Findings](#research-findings)
  - [Is This Documented?](#is-this-documented)
  - [Does It Affect All BLE Libraries?](#does-it-affect-all-ble-libraries)
  - [Can a USB Dongle Bypass It?](#can-a-usb-dongle-bypass-it)
  - [Does the 128-bit UUID Form Work?](#does-the-128-bit-uuid-form-work)
- [Paths Forward](#paths-forward)
  - [Option A — Raspberry Pi (Recommended)](#option-a--raspberry-pi-recommended)
  - [Option B — UART HCI Dongle on Mac](#option-b--uart-hci-dongle-on-mac)
  - [Option C — Standard USB Bluetooth Dongle](#option-c--standard-usb-bluetooth-dongle)
  - [Experimental Session Handoff Workaround](#experimental-session-handoff-workaround)
- [What Can Still Be Developed on Mac](#what-can-still-be-developed-on-mac)
- [Supporting References](#supporting-references)

---

## Problem Statement

The UltimateDarkTowerSync host process runs `FakeTower`, a BLE peripheral that impersonates the
*Return to Dark Tower* hardware so the official companion app (iPad/iPhone) believes it is connected
to a real tower. The real tower exposes a **Device Information Service (DIS)** — Bluetooth GATT
service UUID `0x180A` — which the companion app reads immediately after connecting to verify the
tower's firmware version before proceeding to gameplay.

When the host runs on **macOS**, attempting to register the DIS service fails silently at startup
with the error:

```
[FakeTower] servicesSetError: [Error: The specified UUID is not allowed for this operation.]
```

Because DIS is never registered, the companion app reads a blank firmware version, displays a
firmware-update prompt, and **immediately disconnects**. No game commands are ever exchanged.

---

## How It Manifests in This Project

The following sequence was observed when running the host on macOS with an iPad as the companion
app client:

| Step | Event | Console Output |
|------|-------|----------------|
| 1 | Host starts, UART service registers successfully | `services set — tower ready` |
| 2 | DIS service (`0x180A`) is rejected asynchronously | `servicesSetError: The specified UUID is not allowed` |
| 3 | iPad connects and subscribes to UART notify char | `companion subscribed to state notifications` |
| 4 | iPad reads DIS → service not found → firmware = blank | *(no DIS read log — handler never fires)* |
| 5 | Companion app shows firmware-update dialog | *(observed on iPad UI)* |
| 6 | Companion app disconnects | `companion disconnected` |

The UART service itself works correctly — the subscription in step 3 succeeds and the initial
heartbeat packet (`07 00 00 0c 10`) is delivered. The blocker is exclusively the missing DIS.

---

## Root Cause

macOS CoreBluetooth (`CBPeripheralManager`) **intentionally blocks** third-party apps from
registering services that use Bluetooth SIG-assigned 16-bit UUIDs. This restriction has been
present since **OS X 10.10 (Yosemite)** and persists through macOS 15 (Sequoia).

Apple reserves these UUIDs for system-managed services:

- The **HID profile** (`0x1812`) is consumed by macOS's kernel HID stack
- **Battery** (`0x180F`) and **Device Information** (`0x180A`) are consumed by system UI
- **GAP/GATT** (`0x1800`, `0x1801`) are managed by `bluetoothd`

Unlike Linux (which uses BlueZ and gives userspace apps direct HCI socket access),
macOS CoreBluetooth acts as a proxy to `bluetoothd` / the `IOBluetoothFamily` kernel extension.
Apple's framework enforces these restrictions at the framework level, below which third-party code
cannot reach without disabling System Integrity Protection.

---

## Affected UUIDs

All of the following standard Bluetooth SIG service UUIDs return `CBError.uuidNotAllowed` (error
code 6) when passed to `CBPeripheralManager.addService()` on macOS:

| UUID | Service Name | Why macOS Blocks It |
|------|-------------|---------------------|
| `0x1800` | Generic Access (GAP) | System-managed |
| `0x1801` | Generic Attribute (GATT) | System-managed |
| `0x180A` | Device Information | System UI |
| `0x180F` | Battery Service | System UI |
| `0x1805` | Current Time Service | System-managed |
| `0x1812` | Human Interface Device | Kernel HID stack |

Custom 128-bit UUIDs and non-SIG 16-bit UUIDs (e.g., `0xFFFF`) are **not** affected and work
normally in `CBPeripheralManager`.

---

## Research Findings

### Is This Documented?

Apple's documentation for
[`CBError.Code.uuidNotAllowed`](https://developer.apple.com/documentation/corebluetooth/cberror-swift.struct/code/uuidnotallowed)
states only: *"The specified UUID isn't permitted"* with the note "Available in OS X v10.9 and
later." Apple provides no list of which UUIDs are blocked or the reason.

The restriction was first reported and confirmed publicly in a
[noble/bleno GitHub issue (#133)](https://github.com/noble/bleno/issues/noble/bleno/issues/133)
in 2015 when the Battery Service broke on OS X 10.10 Yosemite. That issue was closed with
documentation acknowledging the incompatibility — no code fix was ever provided because
**there is no fix at the CoreBluetooth layer**.

Apple Developer Forums
[thread 103557](https://developer.apple.com/forums/thread/103557) and
[thread 70979](https://developer.apple.com/forums/thread/70979) (HID over GATT) contain
additional developer reports confirming the restriction on iOS and macOS, with no Apple-suggested
workaround.

### Does It Affect All BLE Libraries?

**Yes.** Every Node.js BLE library that runs on macOS ultimately calls `CBPeripheralManager` and
is equally affected:

- `bleno` (original, sandeepmistry) — affected since 10.10; documented in issue #133
- `@stoprocent/bleno` — uses the same CoreBluetooth API; same restriction applies
- Any Swift/Objective-C wrapper — same restriction
- Rust (`bluster`, `ble-peripheral`) — wrap CoreBluetooth on macOS; same restriction

The restriction is in **Apple's framework**, not in any library's code.

### Can a USB Dongle Bypass It?

**A standard USB Bluetooth dongle cannot bypass it.** When any USB Bluetooth adapter is plugged
into a Mac, macOS immediately attaches its `IOBluetoothFamily` kernel extension to the device.
This prevents userspace from opening a raw HCI socket to it — the same restriction applies as
with the built-in adapter.

**A UART HCI dongle can bypass it.** An nRF52840 or ESP32-S3 flashed with HCI UART firmware and
connected via USB serial is seen by macOS as a **serial port**, not a Bluetooth controller. The
Bluetooth kext never claims it. `@stoprocent/bleno` in `'hci'` mode (with
`BLUETOOTH_HCI_SOCKET_UART_PORT` set to the serial port) communicates directly with the chip over
HCI and has no UUID restrictions.

See [Option B](#option-b--uart-hci-dongle-on-mac) for implementation details.

Reference: [stoprocent/node-bluetooth-hci-socket](https://github.com/stoprocent/node-bluetooth-hci-socket)
and [Google Bumble Issue #97](https://github.com/google/bumble/issues/97) (macOS HCI access analysis).

### Does the 128-bit UUID Form Work?

**No.** One developer reported that substituting the full 128-bit Bluetooth Base UUID expansion
(e.g., `00001812-0000-1000-8000-00805F9B34FB` for `0x1812`) caused `addService` to succeed
without error. However, a follow-up confirmed that while advertising started, **GATT read/write
callbacks never fired** — the central app received no response to any characteristic operation.
This workaround is non-functional.

Reference: [GitHub Gist — CoreBluetooth HID Keyboard Peripheral](https://gist.github.com/conath/c606d95d58bbcb50e9715864eeeecf07)

---

## Paths Forward

### Option A — Raspberry Pi (Recommended)

**Effort:** Low | **Cost:** ~$15–35 | **Reliability:** High

Run `packages/host` on any Linux machine. BlueZ (Linux's Bluetooth stack) gives userspace direct
HCI socket access with no UUID restrictions. All standard GATT service UUIDs work, including DIS
`0x180A`.

The host package already supports standalone execution — no code changes required:

```sh
# On a Raspberry Pi with Node.js 18+ installed:
git clone <repo>
npm install
npm run build -w packages/host
node packages/host/dist/index.js
```

**Recommended hardware:**

| Board | Price | Notes |
|-------|-------|-------|
| Raspberry Pi Zero 2 W | ~$15 | Ideal — compact, built-in BLE 5.0, WiFi |
| Raspberry Pi 3B/3B+ | ~$35 | More RAM, better for development |
| Any Linux box with Bluetooth | — | Works if it has a BLE adapter |

**Resulting architecture:**

```
iPad (companion app)
       ↕ BLE (Bluetooth Low Energy)
Raspberry Pi  ←→  packages/host  (FakeTower + RelayServer)
       ↕ WebSocket (WiFi/LAN/internet)
Mac / PC  ←→  Electron app  (relay viewer / client)
```

The Pi sits near whoever has the physical tower. Remote players connect to the relay server over
WebSocket. The Mac/PC runs the Electron client only — no BLE peripheral needed on the Mac.

**References:**
- [bleno on Raspberry Pi — original README](https://github.com/noble/bleno#readme)
- [Node.js on Raspberry Pi — official guide](https://nodejs.org/en/download)

---

### Option B — UART HCI Dongle on Mac

**Effort:** Medium | **Cost:** $10–40 | **Reliability:** High once configured

An nRF52840 or ESP32-S3 flashed with HCI UART firmware acts as a UART-attached Bluetooth
controller. macOS never claims it with its Bluetooth kext, so `@stoprocent/bleno` can open a raw
HCI connection to it via a serial port — bypassing CoreBluetooth entirely.

**Compatible hardware:**

| Device | Price | Notes |
|--------|-------|-------|
| Nordic nRF52840 DK | ~$40 | Official dev kit; well-tested with HCI UART |
| Adafruit nRF52840 Feather | ~$25 | Compact; needs HCI UART firmware flashing |
| Nordic nRF52840 Dongle (PCA10059) | ~$10 | USB dongle form factor; needs firmware |
| ESP32-S3 board | ~$10 | Flash with Apache Mynewt/NimBLE HCI UART |

**Configuration in this project:**

Once the dongle is connected and the serial port is known (e.g., `/dev/tty.usbmodem1234`), set
one environment variable before starting the host:

```sh
BLUETOOTH_HCI_SOCKET_UART_PORT=/dev/tty.usbmodem1234 node packages/host/dist/index.js
```

`@stoprocent/bleno` detects `BLUETOOTH_HCI_SOCKET_UART_PORT` and automatically switches from
the CoreBluetooth (`'mac'`) binding to the HCI UART (`'hci'`) binding. No code changes are
needed in `FakeTower` or any other module.

**References:**
- [@stoprocent/node-bluetooth-hci-socket README](https://github.com/stoprocent/node-bluetooth-hci-socket)
- [nRF52840 HCI UART firmware guide — Nordic DevZone](https://developer.nordicsemi.com)
- [bleno resolve-bindings.js — HCI env var detection](../packages/host/node_modules/@stoprocent/bleno/lib/resolve-bindings.js)

---

### Option C — Standard USB Bluetooth Dongle

**Effort:** High | **Cost:** $10–20 | **Reliability:** Low

A standard USB Bluetooth adapter (CSR8510, RTL8761, BCM20702, etc.) **does not work** on macOS
for this purpose. The macOS `IOBluetoothFamily` kext claims the device immediately, and there is
no supported way for userspace to open a competing HCI socket.

Technically possible workarounds (not recommended):
- Disable SIP and unload `IOBluetoothFamily` for the specific device — fragile, unsupported,
  breaks other Bluetooth functionality
- Use a Linux VM with USB passthrough — the dongle would appear as a Linux HCI device inside the
  VM, which could then run the host. Complex setup, latency concerns.

**This option is listed only for completeness. Use Option A or B instead.**

---

### Experimental Session Handoff Workaround

**Effort:** Low | **Cost:** $0 | **Reliability:** Medium (state-dependent)

In testing, a game session that already passed firmware validation on the real tower can sometimes
continue after reconnecting to FakeTower on macOS, without re-triggering the firmware gate.

**Observed sequence that worked:**
1. Start the official companion app and connect to the real tower.
2. Begin a game so initial tower validation completes.
3. Turn off the real tower.
4. Start UltimateDarkTowerSync host (FakeTower advertising).
5. In the companion app, select reconnect.

If the app remains in an active gameplay state, it may skip re-checking the Device Information
Service and proceed with in-session commands.

**Important limitations:**
- This is not guaranteed across all app states or versions.
- Starting a new game, force-closing the app, or ending the session may re-run full validation and
  fail again on macOS.
- Treat this as a temporary workaround, not a replacement for Option A (Linux host) or Option B
  (UART HCI dongle).

---

## What Can Still Be Developed on Mac

The macOS restriction only affects the BLE peripheral role. All of the following continue to work
normally on Mac:

| Component | Status on Mac | Notes |
|-----------|--------------|-------|
| `RelayServer` (WebSocket) | Fully functional | No BLE involvement |
| Electron client UI | Fully functional | Relay client only |
| `captureTower.ts` script | Fully functional | Uses noble (BLE central) — no peripheral restrictions |
| Shared protocol (`@dark-tower-sync/shared`) | Fully functional | Platform-agnostic |
| UART service in FakeTower | Works on Mac | Only DIS fails |
| WebSocket relay end-to-end testing | Fully functional | Use `wscat` or the Electron client |

The recommended development workflow on Mac is:
1. Develop and test the relay server, Electron client, and protocol on Mac
2. Deploy `packages/host` to a Raspberry Pi for end-to-end BLE testing
3. Use `npm run capture -w packages/host` on Mac with the real tower for protocol research

---

## Supporting References

| Resource | URL | Relevance |
|----------|-----|-----------|
| Apple — `CBError.Code.uuidNotAllowed` | https://developer.apple.com/documentation/corebluetooth/cberror-swift.struct/code/uuidnotallowed | Official error documentation |
| Apple Developer Forums — thread 103557 | https://developer.apple.com/forums/thread/103557 | Original developer report |
| Apple Developer Forums — HID over GATT | https://developer.apple.com/forums/thread/70979 | Confirms iOS/macOS restriction |
| noble/bleno Issue #133 | https://github.com/noble/bleno/issues/133 | First public acknowledgement (2015); full list of blocked UUIDs |
| GitHub Gist — CoreBluetooth HID Peripheral | https://gist.github.com/conath/c606d95d58bbcb50e9715864eeeecf07 | 128-bit UUID workaround analysis |
| @stoprocent/bleno on npm | https://www.npmjs.com/package/@stoprocent/bleno | Library in use; macOS restriction unresolved |
| stoprocent/node-bluetooth-hci-socket | https://github.com/stoprocent/node-bluetooth-hci-socket | UART HCI transport (Option B) |
| Google Bumble Issue #97 | https://github.com/google/bumble/issues/97 | macOS HCI access deep-dive |
| Hacking IOBluetooth (blog) | https://colemancda.github.io/2018/03/25/Hacking-IOBluetooth | Technical analysis of macOS Bluetooth stack |
