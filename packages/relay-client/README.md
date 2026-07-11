<h1 align="center">ultimatedarktowerrelay-client</h1>

<p align="center">
  Framework-agnostic consumer SDK for <a href="https://github.com/ChessMess/UltimateDarkTowerRelay"><strong>UltimateDarkTowerRelay</strong></a>.<br/>
  Connect to a relay host over WebSocket, receive decoded <em>Return to Dark Tower</em> tower state, and report player actions.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/ultimatedarktowerrelay-client"><img alt="npm version" src="https://img.shields.io/npm/v/ultimatedarktowerrelay-client.svg"></a>
  <a href="https://www.npmjs.com/package/ultimatedarktowerrelay-client"><img alt="npm downloads" src="https://img.shields.io/npm/dm/ultimatedarktowerrelay-client.svg"></a>
  <a href="https://github.com/ChessMess/UltimateDarkTowerRelay/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/npm/l/ultimatedarktowerrelay-client.svg"></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Ready-blue"></a>
</p>

---

## What this is

A relay **host** advertises a tower-emulator the official *Return to Dark Tower* companion app connects to, decodes every 20-byte command, and broadcasts it over WebSocket. **This package is what a consumer runs.** It speaks the relay's WebSocket protocol so you don't have to: handshake, decoded `TowerState` events, participant actions, auto-reconnect with backoff, and protocol-version-mismatch handling.

It's **isomorphic** — use the browser's global `WebSocket`, or inject the `ws` package in Node. Consumers fall into two roles:

- **Observer / screen-only** — render the decoded tower state (LEDs, drum positions, skull drops) without any hardware.
- **Participant** — has a physical tower or reports player actions; pair `RelayClient` with `PhysicalTowerReplay` to mirror the host's tower onto a local one over Web Bluetooth.

## Install

```bash
npm install ultimatedarktowerrelay-client
```

`ultimatedarktower` is installed alongside it (decoded `TowerState` types + the `PhysicalTowerReplay` tower interface).

## Quick start

### Observer (screen-only, browser)

```ts
import { RelayClient } from 'ultimatedarktowerrelay-client';

const client = new RelayClient({
  label: 'My Visualizer',
  observer: true,
  onEvent: (e) => {
    if (e.type === 'state') render(e.state); // decoded TowerState
  },
});

await client.connect('ws://192.168.1.5:8765');
```

### Node consumer

In Node there is no global `WebSocket`, so inject one:

```ts
import { RelayClient } from 'ultimatedarktowerrelay-client';
import WebSocket from 'ws';

const client = new RelayClient({ observer: true, webSocketImpl: WebSocket, onEvent });
await client.connect('ws://192.168.1.5:8765');
```

### Participant — mirror the host onto a local tower

```ts
import { RelayClient, PhysicalTowerReplay } from 'ultimatedarktowerrelay-client';
import UltimateDarkTower from 'ultimatedarktower';

const tower = new UltimateDarkTower();        // satisfies TowerWriter structurally
const replay = new PhysicalTowerReplay({ tower });

const client = new RelayClient({
  label: 'Player 2',
  onEvent: (e) => replay.handleEvent(e), // mirrors tower:command + sync:state onto my tower
});

await client.connect('ws://192.168.1.5:8765');

// Report a player action back to the host:
client.dropSkull();
```

## Events

`onEvent` receives a discriminated union (`RelayClientEvent`). Common types:

| Type | Meaning |
|---|---|
| `state` | Decoded `TowerState` + the raw `lastCommand`. |
| `tower:command` | Raw 20-byte command with a monotonic `seq`. |
| `sync:state` | Late-join catch-up (last command). |
| `relay:connected` · `relay:disconnected` · `relay:reconnecting` | Connection lifecycle. |
| `relay:version-mismatch` | Host/client `PROTOCOL_VERSION` disagree. |
| `host:status` · `client:connected` · `client:disconnected` | Room/host status. |

## Documentation

- [SDK API reference](https://github.com/ChessMess/UltimateDarkTowerRelay/blob/main/docs/API.md)
- [WebSocket protocol](https://github.com/ChessMess/UltimateDarkTowerRelay/blob/main/docs/PROTOCOL.md)
- [Getting started](https://github.com/ChessMess/UltimateDarkTowerRelay/blob/main/docs/GETTING_STARTED.md) · [Architecture](https://github.com/ChessMess/UltimateDarkTowerRelay/blob/main/docs/ARCHITECTURE.md)
- Project overview: [UltimateDarkTowerRelay](https://github.com/ChessMess/UltimateDarkTowerRelay#readme)

## License

MIT. *Return to Dark Tower* and its art, sounds, and likeness are © Restoration Games. This is an unofficial, fan-made project.
