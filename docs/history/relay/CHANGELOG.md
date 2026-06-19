# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

Initial development toward the `0.1.0` release. The packages are version `0.1.0` and **publish-ready but
not yet on npm**; downstream repos consume them via `file:` deps until the cutover.

### Added

- **Tower-emulator relay (Phase 1).** `TowerEmulator` BLE peripheral the official companion app connects to;
  `RelayServer` + `ConnectionManager` broadcast each decoded 20-byte command to WebSocket consumers with a
  monotonic `seq` and `sync:state` catch-up; `MockTower` BLE-free source; headless CLI daemon.
- **Notification synthesis (Phase 2).** `NotificationSynthesizer` completes the tower→app return traffic —
  participant-reported skull drops (`client:action`), calibration-complete, and an opt-in heartbeat
  fallback — encoded via `rtdt_pack_state`.
- **Consumer SDK (Phase 3).** `ultimatedarktowerrelay-client` — framework-agnostic, isomorphic
  `RelayClient` (handshake, decoded `state` + event subscriptions, participant `dropSkull()`, auto-reconnect
  with backoff, protocol-version-mismatch handling). Configurable Device Information Service so a non-macOS
  host clears the app's "checking firmware" screen standalone.
- **Real-tower path + resilience (Phase 4).** `RealTower` mirrors a physical master tower
  (`TOWER_SOURCE=real`) via UDT's high-level driver with reconnect/backoff + initial-connect retry;
  `PhysicalTowerReplay` writes relayed commands onto a consumer's local tower (tower-ready-gated,
  serialized, self-healing). `TOWER_SOURCE=bridge` forwards app commands onto a real master tower.
- **Event log + tooling (Phase 4).** Append-only `RelayEvent` `EventLog` (JSONL, own monotonic `seq`) with
  replay/export and the `replayEvents` CLI; read-only `analyzeLogs` CLI over the session logs;
  `RelayClient.sendRaw` client→host escape hatch.
- **Electron operator GUI (Phase 4).** Status dashboard, runtime emulator/mock/real source switching, manual
  controls, and an in-app log viewer over `core`.
- **Documentation.** Reader-facing docs set — getting started, architecture, the SDK API reference,
  protocol, tower-emulator behavior, per-platform setup, troubleshooting, and ecosystem.

[Unreleased]: https://github.com/ChessMess/UltimateDarkTowerRelay
