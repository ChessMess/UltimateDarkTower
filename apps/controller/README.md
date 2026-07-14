# Tower Controller

Reference UI that exercises essentially every method on `UltimateDarkTower`. Use it as a manual test harness when verifying library changes, or as a copy-paste source when building your own UI.

## What it demonstrates

- Connecting, calibrating, and cleanly disconnecting via Web Bluetooth.
- Every command type: `playSound`, individual `setLED` calls, `allLightsOn`/`allLightsOff`, `Rotate`, `rotateDrumStateful`, `lightOverrides`, `breakSeal`, `resetTowerSkullCount`.
- Real-time battery monitoring with a battery-history chart.
- Glyph-position tracking after rotations.
- A **BLE Debug** tab built on the [diagnostics flight recorder](../../packages/core/docs/BLE_DIAGNOSTICS.md) — toggle on/off, live event stream, persistent IndexedDB incident log, JSON export.
- A **3D tower emulator** (powered by `ultimatedarktowerdisplay`) for development without hardware on hand.

## Run locally

```bash
pnpm install
pnpm --filter ultimatedarktowercontroller dev
```

Vite opens the controller at the printed URL. Use it in Chrome / Edge / Samsung Internet, click **Connect**, and pick `ReturnToDarkTower` — or choose **Tower Emulator** from the connect dropdown to drive the 3D emulator popup without hardware.

## Live demo

[chessmess.github.io/UltimateDarkTower/controller/](https://chessmess.github.io/UltimateDarkTower/controller/)

> iOS users need the [Bluefy app](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055) — Safari/Chrome on iOS don't expose Web Bluetooth.

## Files

- `index.html` / `src/TowerController.ts` — the main controller UI.
- `TowerEmulator.html` / `src/TowerEmulator.ts` — the 3D emulator popup the controller opens.
- `src/TowerEmulatorAdapter.ts` — `IBluetoothAdapter` implementation that talks to the emulator instead of real hardware (with `src/TowerEmulatorAdapter.test.ts`).
- `public/assets/` — fonts, background, favicon, glyph SVGs, and the `tower.glb` 3D model.

## See also

- [../../packages/core/docs/EXAMPLES.md](../../packages/core/docs/EXAMPLES.md) — overview of the library examples.
- [../../packages/core/docs/api/README.md](../../packages/core/docs/api/README.md) — the API this app exercises.
- [../../packages/core/docs/BLE_DIAGNOSTICS.md](../../packages/core/docs/BLE_DIAGNOSTICS.md) — what the BLE Debug tab is showing.
