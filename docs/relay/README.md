# UltimateDarkTowerRelay Documentation

The documentation set for [UltimateDarkTowerRelay](../README.md). Start here if you're not sure which
file to open.

---

## Start here by goal

### I want to run the relay (host a session)
1. [SETUP.md](SETUP.md) — per-platform setup (macOS / Raspberry Pi / Windows) and the `TOWER_SOURCE` modes.
2. [MACOS_BLE_PERIPHERAL_LIMITATION.md](MACOS_BLE_PERIPHERAL_LIMITATION.md) — why macOS stalls on
   "checking firmware" and how to get past it.
3. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — connection, BLE, and consumer issues.

### I want to build a consumer (use the SDK)
1. [GETTING_STARTED.md](GETTING_STARTED.md) — connect, receive decoded state, observer vs participant.
2. [API.md](API.md) — the full `ultimatedarktowerrelay-client` reference.
3. [PROTOCOL.md](PROTOCOL.md) — the wire protocol, if you need the message-level detail.

### I want to understand how it fits together
1. [ARCHITECTURE.md](ARCHITECTURE.md) — packages, data flow, the hybrid state model, tower sources.
2. [TOWER_EMULATOR.md](TOWER_EMULATOR.md) — the BLE return-traffic / echo-timing behavior the companion app needs.
3. [ECOSYSTEM.md](ECOSYSTEM.md) — where the relay sits in the UDT family.

---

## All documentation

| File | Purpose | Audience |
|---|---|---|
| [GETTING_STARTED.md](GETTING_STARTED.md) | Tutorial: connect a consumer, receive state, report actions | SDK integrator |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Packages, data flow, state model, tower sources, event log | Integrator, contributor |
| [API.md](API.md) | The `ultimatedarktowerrelay-client` SDK surface | SDK integrator |
| [PROTOCOL.md](PROTOCOL.md) | Client↔host WebSocket message protocol | Protocol-level developer |
| [TOWER_EMULATOR.md](TOWER_EMULATOR.md) | BLE echo-timing / return-traffic behavior | Protocol-level developer |
| [SETUP.md](SETUP.md) | Per-platform host setup + `TOWER_SOURCE` modes | Operator |
| [MACOS_BLE_PERIPHERAL_LIMITATION.md](MACOS_BLE_PERIPHERAL_LIMITATION.md) | The "checking firmware" DIS limitation | Operator |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Operational fixes for hosts and consumers | Operator, integrator |
| [ECOSYSTEM.md](ECOSYSTEM.md) | Companion repos in the UDT family | All |

---

## External

- **GitHub:** [ChessMess/UltimateDarkTowerRelay](https://github.com/ChessMess/UltimateDarkTowerRelay)
- **Changelog:** [../CHANGELOG.md](../CHANGELOG.md)
- **Contributing:** [../CONTRIBUTING.md](../CONTRIBUTING.md)
- **Core library:** [`ultimatedarktower`](https://github.com/ChessMess/UltimateDarkTower)
- **Discord:** [Restoration Games community](https://discord.com/channels/722465956265197618/1167555008376610945/1167842435766952158)
