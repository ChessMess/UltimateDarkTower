# Getting Started

*Docs: [Index](README.md) > Integrator > Getting Started*

A walkthrough from zero to a consumer that connects to a relay host, receives decoded tower state, and
(optionally) reports player actions. This guide is for building a **consumer** with the SDK. If you want
to *run the relay host*, start at [SETUP.md](SETUP.md) instead.

> **New here?** This covers the happy path for the `ultimatedarktowerrelay-client` SDK. For the full
> surface see [API.md](API.md); for how the pieces fit together see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Prerequisites

- **A running relay host** reachable on your network — see [SETUP.md](SETUP.md). For desk testing,
  `npm run start:mock` runs a BLE-free host that broadcasts canned commands. Note the host's WebSocket
  URL (default `ws://<host>:8765`).
- Node.js 18+, or a Web Bluetooth–capable browser (Chrome / Edge) for tower-mirror consumers.

---

## Consumer roles at a glance

| Role | Has a physical tower? | What it does | Sends actions? |
|---|---|---|---|
| **Observer / screen-only** | No | Decodes and renders the relayed tower state (LEDs, drums, audio, skull count). | No |
| **Participant** | Yes (or reports actions) | Mirrors relayed commands onto a local tower, and/or reports player actions the tower would detect. | Yes (`dropSkull()`) |

Pick `observer: true` for a screen-only consumer; omit it (the default) for a participant.

---

## 1. Install

```bash
npm install ultimatedarktowerrelay-client
```

> The SDK is **published on npm** (`ultimatedarktowerrelay-client`). `ultimatedarktower` is installed
> alongside it (decoded `TowerState` types + the `PhysicalTowerReplay` tower interface).

The SDK is **isomorphic**: it uses the global `WebSocket` in the browser, or an injected implementation
(e.g. the [`ws`](https://www.npmjs.com/package/ws) package) in Node.

---

## 2. Connect and receive state

Set up the client, wire an event handler, and connect. The SDK decodes each relayed command into a
[`TowerState`](../../UltimateDarkTower/docs/api/state.md) and emits a `state` event.

```ts
import { RelayClient } from 'ultimatedarktowerrelay-client';

const client = new RelayClient({
  label: 'My Visualizer',
  observer: true, // screen-only consumer
  onEvent: (event) => {
    switch (event.type) {
      case 'relay:connected':
        console.log('connected to host');
        break;
      case 'state':
        render(event.state); // decoded TowerState
        break;
      case 'relay:paused':
        showPauseOverlay(event.reason); // companion app dropped
        break;
      case 'relay:resumed':
        hidePauseOverlay();
        break;
    }
  },
});

await client.connect('ws://192.168.1.5:8765');
```

`connect()` resolves once the socket is open and the `client:hello` handshake is sent. On connect the
host immediately sends a `sync:state` catch-up, so your first `state` event reflects the current tower
even if you joined mid-session.

The client **auto-reconnects** with exponential backoff (1s → 30s, up to 10 attempts), except on a
protocol-version mismatch — there it emits `relay:version-mismatch` and stops, because a hard reload is
required.

---

## 3. Report a player action (participants)

A participant reports actions the physical tower would normally detect, so the relay can synthesize the
matching tower→app notification. Today that's a dropped skull:

```ts
const client = new RelayClient({ label: 'Player 2' }); // participant (observer defaults to false)
await client.connect('ws://192.168.1.5:8765');

client.dropSkull(); // → relay synthesizes the skull-drop notification to the companion app
```

`dropSkull()` returns `false` (a no-op) if not connected, and the relay rejects it from observer clients.

---

## 4. Mirror commands onto a local tower (`PhysicalTowerReplay`)

A participant with its own physical tower mirrors the host's tower by writing every relayed command to
the local hardware. `PhysicalTowerReplay` does this; it stays transport-agnostic by taking an injected
**`TowerWriter`** — UDT's [`UltimateDarkTower`](https://github.com/ChessMess/UltimateDarkTower) satisfies
it structurally.

Because Web Bluetooth needs a user gesture, **your app owns the tower lifecycle** and tells the replay
when the tower is ready:

```ts
import { RelayClient, PhysicalTowerReplay } from 'ultimatedarktowerrelay-client';
import { UltimateDarkTower } from 'ultimatedarktower';

const replay = new PhysicalTowerReplay({ onLog: (m) => console.log(m) });

// Fan the single onEvent out to BOTH your UI handler and the replay (composition):
const client = new RelayClient({
  label: 'Player 2',
  onEvent: (e) => {
    replay.handleEvent(e);
    appUiHandler(e);
  },
});

const tower = new UltimateDarkTower(); // auto Web Bluetooth on connect()
tower.onTowerDisconnect = () => {
  replay.setTower(null);
  client.sendReady(false);
};
tower.onCalibrationComplete = () => {
  replay.setTower(tower);
  client.sendReady(true);
  void replay.replayLast(); // self-heal: re-apply the last command after a reconnect
};

await client.connect('ws://192.168.1.5:8765');
await tower.connect();   // opens the Web Bluetooth chooser (user gesture)
await tower.calibrate();
```

Writes are **tower-ready-gated** (only a connected, calibrated tower is written) and **serialized**, so
concurrent relayed commands can't interleave BLE writes. `replayLast()` re-applies the most recent
command, which self-heals a tower that reconnected mid-session.

---

## 5. Node usage (inject `ws`)

In Node there's no stable global `WebSocket` before v22, so pass one in:

```ts
import { WebSocket } from 'ws';
import { RelayClient } from 'ultimatedarktowerrelay-client';

const client = new RelayClient({
  label: 'headless-consumer',
  observer: true,
  webSocketImpl: WebSocket,
  onEvent: (e) => { /* … */ },
});
await client.connect('ws://192.168.1.5:8765');
```

For a runnable headless consumer, see `packages/cli/src/mockConsumer.ts`
(`MOCK_ROLE=participant npm run mock:consumer`).

---

## Where to go next

| You want to… | Read |
|---|---|
| See every method, option, and event | [API.md](API.md) |
| Understand the relay's design | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Read the wire protocol | [PROTOCOL.md](PROTOCOL.md) |
| Run the relay host | [SETUP.md](SETUP.md) |
| Diagnose a problem | [TROUBLESHOOTING.md](TROUBLESHOOTING.md) |

**See also:** [API.md](API.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [PROTOCOL.md](PROTOCOL.md)
