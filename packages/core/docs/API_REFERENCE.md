# API Reference — Moved

The API reference has been split into focused topic pages under [docs/api/](api/README.md):

- [Connection](api/connection.md) — constructor, config, `connect` / `disconnect` / `cleanup`, status, monitoring, error types
- [Adapters](api/adapters.md) — `IBluetoothAdapter`, built-in adapters, building a custom adapter
- [Commands](api/commands.md) — calibration, audio, lights, drum rotation, stateful variants
- [State](api/state.md) — tower state types, glyph tracking, seal management
- [Events](api/events.md) — connection / calibration / skull drop / battery callbacks
- [Logging](api/logging.md) — logger configuration, outputs, response logging
- [Diagnostics](api/diagnostics.md) — flight recorder API

The seed parser and board/hero/foe reference data moved to
[`ultimatedarktowerdata`](../../game-data) in v6.0.0 — see its
[seed](../../game-data/docs/seed.md) docs.

New to the library? Start with the [Getting Started tutorial](GETTING_STARTED.md) instead.

For the conceptual architecture, see [ARCHITECTURE.md](ARCHITECTURE.md).
