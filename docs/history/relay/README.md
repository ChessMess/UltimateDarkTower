# UltimateDarkTowerRelay

> **Status: pre-implementation.** Only the founding PRD exists so far —
> [docs/prd/prd-relay.md](docs/prd/prd-relay.md).

A standalone app that connects to Restoration Games' official *Return to Dark Tower* companion app **as
if it were a real tower**, then relays the tower traffic to any number of digital consumers over the
local network.

The official app talks to the tower over Bluetooth LE with the app as the BLE *central* and the tower as
the *peripheral* — and a browser cannot advertise as a BLE peripheral. So the relay runs in Node,
advertises a fake tower the app connects to, decodes every command the app sends, fans it out to
consumers over WebSocket, and **synthesizes the tower→app return traffic** a real tower would send
(including responses driven by player actions reported back from a consumer).

- **First consumer:** [UltimateDarkTowerDigital](../UltimateDarkTowerDigital) (its PRD-05 `BridgeSource`).
- **Shared bridge for [UltimateDarkTowerSync](../UltimateDarkTowerSync):** Sync stays as the
  remote-multiplayer product (players in different locations each use their own *physical* tower, mirrored
  to a host "master" tower), but **drops its own custom fake-tower / relay code and consumes this repo's
  `core` + client SDK** instead. The relay owns the reusable bridge plumbing; Sync owns its multiplayer
  experience.

Planned shape: an npm-workspaces monorepo — a headless `core` engine, a Node `cli` daemon, an `electron`
operator GUI, a published `client` SDK, and a `shared` protocol package. **LAN-only for v1**; internet
reach (Tailscale / hosted rooms) is a documented future phase.

See **[docs/prd/prd-relay.md](docs/prd/prd-relay.md)** for goals, functional requirements, the
hybrid state model, platform/BLE constraints, the IP stance, open questions, and the phased plan.

— Part of the unofficial, fan-made *Ultimate Dark Tower* family. *Return to Dark Tower* © Restoration Games.
