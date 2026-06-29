<h1 align="center">ultimatedarktowerrelay-core</h1>

<p align="center">
  The headless engine behind <a href="https://github.com/ChessMess/UltimateDarkTowerRelay"><strong>UltimateDarkTowerRelay</strong></a> — a BLE tower-emulator peripheral and WebSocket relay for <em>Return to Dark Tower</em>.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/ultimatedarktowerrelay-core"><img alt="npm version" src="https://img.shields.io/npm/v/ultimatedarktowerrelay-core.svg"></a>
  <a href="https://www.npmjs.com/package/ultimatedarktowerrelay-core"><img alt="npm downloads" src="https://img.shields.io/npm/dm/ultimatedarktowerrelay-core.svg"></a>
  <a href="https://github.com/ChessMess/UltimateDarkTowerRelay/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/npm/l/ultimatedarktowerrelay-core.svg"></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Ready-blue"></a>
</p>

---

## What this is

The relay **host** engine. It advertises a tower-emulator the official companion app connects to (`TowerEmulator`), decodes every 20-byte command, broadcasts it to consumers (`RelayServer`), synthesizes the tower→app return traffic (`NotificationSynthesizer`), and can mirror a real master tower (`RealTower`) or replay canned data (`MockTower`). Also bundles the append-only `EventLog`, logging, and log-analysis helpers.

> **Building a consumer (visualizer, companion app)?** You want the [`ultimatedarktowerrelay-client`](https://www.npmjs.com/package/ultimatedarktowerrelay-client) SDK, not this. This package is for running or embedding the host.

This is a **Node** package: it depends on `@stoprocent/bleno` for BLE peripheral mode (with `@stoprocent/noble` as an optional dependency for the real-tower central path). The companion app gates on the Device Information Service, which **macOS cannot expose in peripheral mode** — so a standalone emulator host needs Linux / Raspberry Pi or Windows. See [SETUP.md](https://github.com/ChessMess/UltimateDarkTowerRelay/blob/main/docs/SETUP.md).

## Install

```bash
npm install ultimatedarktowerrelay-core
```

## Usage

```ts
import { TowerEmulator, RelayServer } from 'ultimatedarktowerrelay-core';
```

For a ready-to-run daemon, see the CLI and Electron operator console in the [main repo](https://github.com/ChessMess/UltimateDarkTowerRelay).

## Documentation

- [Architecture](https://github.com/ChessMess/UltimateDarkTowerRelay/blob/main/docs/ARCHITECTURE.md) · [Tower emulator behavior](https://github.com/ChessMess/UltimateDarkTowerRelay/blob/main/docs/TOWER_EMULATOR.md)
- [Per-platform setup](https://github.com/ChessMess/UltimateDarkTowerRelay/blob/main/docs/SETUP.md) · [Troubleshooting](https://github.com/ChessMess/UltimateDarkTowerRelay/blob/main/docs/TROUBLESHOOTING.md)
- Project overview: [UltimateDarkTowerRelay](https://github.com/ChessMess/UltimateDarkTowerRelay#readme)

## License

MIT. Unofficial, fan-made project; *Return to Dark Tower* is © Restoration Games.
