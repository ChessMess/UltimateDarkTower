<h1 align="center">ultimatedarktowerrelay-shared</h1>

<p align="center">
  Shared protocol types, WebSocket message factories, and constants for <a href="https://github.com/ChessMess/UltimateDarkTowerRelay"><strong>UltimateDarkTowerRelay</strong></a>.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/ultimatedarktowerrelay-shared"><img alt="npm version" src="https://img.shields.io/npm/v/ultimatedarktowerrelay-shared.svg"></a>
  <a href="https://www.npmjs.com/package/ultimatedarktowerrelay-shared"><img alt="npm downloads" src="https://img.shields.io/npm/dm/ultimatedarktowerrelay-shared.svg"></a>
  <a href="https://github.com/ChessMess/UltimateDarkTowerRelay/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/npm/l/ultimatedarktowerrelay-shared.svg"></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Ready-blue"></a>
</p>

---

## What this is

The wire contract shared by the relay **core** (host) and the **client** SDK (consumer): the message envelope and `MessageType`, the message factory helpers, the `RelayEvent` semantic-event union (for the event log), and `PROTOCOL_VERSION`.

You usually don't depend on this directly — [`ultimatedarktowerrelay-client`](https://www.npmjs.com/package/ultimatedarktowerrelay-client) and [`ultimatedarktowerrelay-core`](https://www.npmjs.com/package/ultimatedarktowerrelay-core) re-export what consumers need. Install it directly only when building your own host or transport against the protocol.

## Install

```bash
npm install ultimatedarktowerrelay-shared
```

## Usage

```ts
import { PROTOCOL_VERSION, MessageType } from 'ultimatedarktowerrelay-shared';
```

## Documentation

- [WebSocket protocol](https://github.com/ChessMess/UltimateDarkTowerRelay/blob/main/docs/PROTOCOL.md)
- Project overview: [UltimateDarkTowerRelay](https://github.com/ChessMess/UltimateDarkTowerRelay#readme)

## License

MIT. Unofficial, fan-made project; *Return to Dark Tower* is © Restoration Games.
