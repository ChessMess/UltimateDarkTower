# macOS BLE peripheral limitation — the "checking firmware" screen

## Summary

On **macOS**, the fake tower **cannot expose the Bluetooth Device Information Service
(DIS, `0x180A`)**. Apple's CoreBluetooth blocks standard Bluetooth SIG service UUIDs
(incl. `0x180A`) when acting as a BLE **peripheral**. The official *Return to Dark
Tower* companion app reads the DIS **firmware revision** to decide whether the tower
needs a firmware update — so **without a DIS the app stalls on the "checking firmware"
screen and never proceeds**.

This is a platform limitation, not a relay bug, and it **cannot be worked around on
macOS** (the full 128-bit expansion of `0x180A` makes `addService` succeed but GATT
read callbacks never fire — a non-functional workaround).

## Two ways past the screen

### 1. macOS host — real-tower handoff (current workaround)
1. Start the official app and connect it to a **real tower** so it clears the
   "checking firmware" screen.
2. Disconnect the real tower.
3. Reconnect the app to the **fake tower** (the relay) and continue the session.

### 2. Non-macOS host — standalone fake tower (recommended)
Run the relay on a host whose BLE stack **can** expose the DIS:

- **Linux / Raspberry Pi (BlueZ)** — e.g. a Raspberry Pi Zero W. The fake tower
  advertises the DIS automatically, so the app clears the firmware screen on its own.
- **Windows** — same: the DIS is exposed.

The relay already advertises the DIS on every non-macOS platform
(`shouldExposeDeviceInfoService(process.platform)` in `packages/core/src/deviceInfo.ts`).

## Firmware revision value

The app may try to **flash** the tower if the firmware revision looks out of date, so
the value should match what the app accepts as current. The default is a value captured
from a real tower; override it without editing source via env vars (the firmware one is
the key):

```
TOWER_DIS_FIRMWARE_REVISION=<value>   # the value the app gates on
TOWER_DIS_MANUFACTURER=<value>
TOWER_DIS_MODEL=<value>
TOWER_DIS_HARDWARE_REVISION=<value>
TOWER_DIS_SOFTWARE_REVISION=<value>
```

or programmatically: `new FakeTower({ deviceInfo: { firmwareRevision: '…' } })`.

The exact value the current app accepts is not yet confirmed; validate against the live
app on the Pi/Windows host.

## See also
- `docs/SETUP.md` — per-platform setup (macOS, Linux/Raspberry Pi, Windows).
- PRD `docs/prd/prd-relay.md` §6 (platform constraints), §11 Q4 (resolved), FR-1.3.
