# Node.js Example

A minimal interactive CLI app for verifying the UltimateDarkTower Node.js Bluetooth adapter.

## Prerequisites

1. Install the BLE dependency:

    ```bash
    npm install @stoprocent/noble --save-dev
    ```

    > **Note:** You must use `--save-dev` (or `--save`). A plain `npm install @stoprocent/noble` may not persist the package because it is already listed as an optional peer dependency.

2. Platform-specific requirements:
    - **macOS** — Works out of the box (CoreBluetooth)
    - **Linux** — Requires BlueZ: `sudo apt install bluetooth bluez libbluetooth-dev`
    - **Windows** — Windows 10+ with BLE support

## Usage

```bash
npm run example:node
```

## What It Does

Presents an interactive menu to:

1. **Connect** — Scans for and connects to the tower via BLE
2. **Calibrate** — Runs the tower calibration sequence
3. **Play Sound** — Plays the 8-bit Bazaar sound to verify commands work
4. **Status** — Shows connection state, calibration state, and battery level
5. **Disconnect** — Cleanly disconnects from the tower
6. **Exit** — Disconnects and exits

Make sure the tower is powered on and within Bluetooth range before connecting.

## Auto-Disconnect

To preserve tower battery life, the app automatically disconnects after **10 minutes** of inactivity. Any menu interaction resets the timer. A warning message is displayed when the auto-disconnect triggers.
