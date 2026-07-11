# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

## [0.2.0] — 2026-07-03

### Fixed

- **`client:connected` now carries the label.** The broadcast was fired at raw socket-connect (before
  `client:hello`), so `payload.label` was always empty and never re-sent. It is now broadcast once the
  handshake is accepted — carrying the label — and is no longer echoed to the joining client.
- **No phantom disconnects for un-handshaked clients.** A handshake timeout or protocol-version mismatch
  no longer fires `client:disconnected` / `onClientDisconnected` (and no longer logs a `consumer-left`
  event) for a client that never completed `client:hello`.
- **Relay server no longer crashes on a post-startup socket error.** The one-shot startup error listener
  is swapped for a persistent handler once the server is listening.
- **Handshake timeout can no longer be bypassed.** A client that sent `client:ready` before `client:hello`
  previously escaped the 10s handshake timeout.
- **`RelayClient` reconnect handling.** A failed *initial* `connect()` no longer silently starts a
  background reconnect loop, and a retry attempt that times out no longer kills the whole backoff loop.
- **`ultimatedarktowerrelay-core` packaging.** `prepack` now cleans `dist/` before building, so stale
  compiled files (e.g. the pre-rename `fakeTower.*`) are no longer published in the tarball.

### Removed

- **`ultimatedarktowerrelay-core` (0.2.0):** dropped dead public API — `TowerEmulator.injectSkullDrop()`,
  `TowerEmulator.resetSkullDropCount()`, the `TowerEmulator.onCommandReceived` legacy callback (+ its
  `CommandReceivedCallback` type), and `ConnectionManager.sendTo()`. Skull-drop synthesis is owned by
  `NotificationSynthesizer.dropSkull()`.

## [0.1.0] — 2026-06-29

Initial release. All three publishable packages (`shared`, `core`, `client`) are live on npm.

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

[0.2.0]: https://github.com/ChessMess/UltimateDarkTowerRelay/compare/v0.1.0...v0.2.0
