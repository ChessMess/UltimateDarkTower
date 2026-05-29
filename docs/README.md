# UltimateDarkTower Documentation

The full documentation set for [UltimateDarkTower](../README.md). Start here if you're not sure which file to open.

---

## Start here by goal

### I want to build a browser app
1. [GETTING_STARTED.md](GETTING_STARTED.md) — connect, calibrate, first commands.
2. [api/connection.md](api/connection.md) — full connection API.
3. [api/commands.md](api/commands.md) — every command the tower accepts.
4. [api/events.md](api/events.md) — callbacks you'll wire up.

### I want to use it from Node.js
1. [GETTING_STARTED.md](GETTING_STARTED.md) — Node section.
2. [examples/node/README.md](../examples/node/README.md) — minimal CLI to copy from.
3. [api/connection.md](api/connection.md) — same surface as the browser.

### I want to support React Native, Cordova, or another platform
1. [api/adapters.md](api/adapters.md) — `IBluetoothAdapter` interface and a React Native walkthrough.
2. [ARCHITECTURE.md](ARCHITECTURE.md) — why the adapter pattern exists.

### I want to understand the protocol or reverse-engineer something
1. [TOWER_TECH_NOTES.md](TOWER_TECH_NOTES.md) — BLE services (with real device screenshots), 20-byte packet structure, LED channel map, Noble macOS quirks.
2. [SEED_FORMAT.md](SEED_FORMAT.md) — base-34 game seed format.
3. [api/seed.md](api/seed.md) — seed parser API.

### I want to ship a tower-aware app and the BLE is flaky
1. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — end-user fixes.
2. [BLE_DIAGNOSTICS.md](BLE_DIAGNOSTICS.md) — flight recorder, conceptual.
3. [api/diagnostics.md](api/diagnostics.md) — flight recorder API.

### I want to contribute
1. [../CONTRIBUTING.md](../CONTRIBUTING.md) — workflow, code standards, release process.
2. [ARCHITECTURE.md](ARCHITECTURE.md) — what each file is responsible for.

---

## All documentation

| File | Purpose | Audience |
|---|---|---|
| **[GETTING_STARTED.md](GETTING_STARTED.md)** | Tutorial: install → connect → calibrate → first command | App developer |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Layer diagram, adapter pattern, command lifecycle | App developer, contributor |
| **[EXAMPLES.md](EXAMPLES.md)** | What controller / game / node demos demonstrate | App developer |
| **[ECOSYSTEM.md](ECOSYSTEM.md)** | Companion repos (Display, Sync, MCP server, etc.) | All |
| **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** | End-user fixes for jams, disconnects, firmware updates | End user, support |
| **[BLE_DIAGNOSTICS.md](BLE_DIAGNOSTICS.md)** | Flight recorder concepts + IncidentReport schema | App developer debugging BLE |
| **[TOWER_TECH_NOTES.md](TOWER_TECH_NOTES.md)** | BLE services, packet structure, LED channels, Noble quirks | Protocol-level developer |
| **[SEED_FORMAT.md](SEED_FORMAT.md)** | Game seed encoding spec (base-34, RNG polynomial) | Seed format implementer |
| **[API_REFERENCE.md](API_REFERENCE.md)** | Redirect to `api/` — kept for backward links | — |
| **[api/](api/README.md)** | The API surface, split by topic | App developer |
| **[api/connection.md](api/connection.md)** | Constructor, connect / disconnect, status, monitoring | App developer |
| **[api/adapters.md](api/adapters.md)** | `IBluetoothAdapter`, built-in adapters, custom adapter walkthrough | Platform integrator |
| **[api/commands.md](api/commands.md)** | Calibration, audio, lights, rotation, stateful variants | App developer |
| **[api/state.md](api/state.md)** | Tower state types, glyphs, seals | App developer |
| **[api/events.md](api/events.md)** | Connection / calibration / skull / battery callbacks | App developer |
| **[api/logging.md](api/logging.md)** | Logger config, outputs, response logging | App developer |
| **[api/seed.md](api/seed.md)** | Seed parser + SystemRandom PRNG | Seed-aware app developer |
| **[api/diagnostics.md](api/diagnostics.md)** | Flight recorder API | App developer debugging BLE |

---

## External

- **npm:** [`ultimatedarktower`](https://www.npmjs.com/package/ultimatedarktower)
- **GitHub:** [ChessMess/UltimateDarkTower](https://github.com/ChessMess/UltimateDarkTower)
- **Discord:** [Restoration Games community](https://discord.com/channels/722465956265197618/1167555008376610945/1167842435766952158)
- **Live demo:** [Tower Controller](https://chessmess.github.io/UltimateDarkTower/dist/examples/controller/TowerController.html)
