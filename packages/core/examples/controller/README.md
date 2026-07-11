# Tower Controller Example

Reference UI that exercises essentially every method on `UltimateDarkTower`. Use it as a manual test harness when verifying library changes, or as a copy-paste source when building your own UI.

## What it demonstrates

- Connecting, calibrating, and cleanly disconnecting via Web Bluetooth.
- Every command type: `playSound`, individual `setLED` calls, `allLightsOn`/`allLightsOff`, `Rotate`, `rotateDrumStateful`, `lightOverrides`, `breakSeal`, `resetTowerSkullCount`.
- Real-time battery monitoring with a battery-history chart.
- Glyph-position tracking after rotations.
- A **BLE Debug** tab built on the [diagnostics flight recorder](../../docs/BLE_DIAGNOSTICS.md) — toggle on/off, live event stream, persistent IndexedDB incident log, JSON export.
- A **tower emulator** for development without hardware on hand.

## Run locally

```bash
npm install
npm run dev:controller
```

Then open the printed URL in Chrome / Edge / Samsung Internet, click **Connect**, and pick `ReturnToDarkTower`.

## Live demo

[chessmess.github.io/UltimateDarkTower/dist/examples/controller/TowerController.html](https://chessmess.github.io/UltimateDarkTower/dist/examples/controller/TowerController.html)

> iOS users need the [Bluefy app](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055) — Safari/Chrome on iOS don't expose Web Bluetooth.

## Files

- `TowerController.html` / `TowerController.ts` — the main controller UI.
- `TowerEmulator.html` / `TowerEmulator.ts` — standalone emulator UI.
- `TowerEmulatorAdapter.ts` — `IBluetoothAdapter` implementation that talks to the emulator instead of real hardware.
- `TowerEmulatorMissing.ts` — UI fallback when the emulator isn't running.

## See also

- [../../docs/EXAMPLES.md](../../docs/EXAMPLES.md) — overview of all examples.
- [../../docs/api/README.md](../../docs/api/README.md) — the API this example exercises.
- [../../docs/BLE_DIAGNOSTICS.md](../../docs/BLE_DIAGNOSTICS.md) — what the BLE Debug tab is showing.
