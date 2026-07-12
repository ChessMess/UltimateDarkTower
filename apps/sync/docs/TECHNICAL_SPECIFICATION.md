# DarkTowerSync Technical Specification → split

DarkTowerSync became **client-only** (task 4.5). The old single-document spec covered both the host and the
client; that content now lives in two places:

## Host / protocol / BLE emulation → the relay

The BLE tower emulator, WebSocket relay server, connection management, host logging, log analysis, and the BLE
emulation details are now **[UltimateDarkTowerRelay](../../../docs/relay)**. See:

- **[ARCHITECTURE.md](../../../docs/relay/ARCHITECTURE.md)** — packages, data flow, the hybrid
  state model, tower sources, and the event log.
- **[PROTOCOL.md](../../../docs/relay/PROTOCOL.md)** — the client↔host WebSocket protocol.
- **[TOWER_EMULATOR.md](../../../docs/relay/TOWER_EMULATOR.md)** — the BLE return-traffic / echo-timing
  behavior (the companion app's flow control).
- **[MACOS_BLE_PERIPHERAL_LIMITATION.md](../../../docs/relay/MACOS_BLE_PERIPHERAL_LIMITATION.md)**
  — the DIS / "checking firmware" limitation.

## Client internals → this repo

The browser client's components (`RelayClient`, `PhysicalTowerReplay`, `TowerDisplay`, `ClientLogger`, `App`,
`UI`) and data flow are documented in **[../ARCHITECTURE.md](../ARCHITECTURE.md)**.
