# Relay CLI

Headless relay daemon — a BLE tower emulator (or a real tower bridge) plus a WebSocket relay
server, for running unattended on a server, a Raspberry Pi, in Docker, or any always-on host.

## What it does

Starts a `TowerSource` (emulator, mock, real tower, or bridge) and a `RelayServer`, then wires the
source's commands into the relay so any connected WebSocket consumer receives them in real time.

## Run locally

```bash
pnpm install
pnpm --filter ultimatedarktowerrelay-cli build
pnpm --filter ultimatedarktowerrelay-cli start
```

Shortcut for both steps together: `pnpm run dev:relay-cli` (from the repo
root, or from this directory).

### Tower source modes

```bash
node dist/index.js                     # tower emulator (companion app connects)
TOWER_SOURCE=mock node dist/index.js   # BLE-free canned-command source
TOWER_SOURCE=real node dist/index.js   # connect to a physical tower, relay its state
TOWER_SOURCE=bridge node dist/index.js # app drives the emulator; forward to a real master tower
```

Other env vars: `RELAY_PORT` (default `8765`), `TOWER_DIS_*` (Device Information Service
overrides), `LOGGING=0` (disable JSONL file logging). See the header comment in
[`src/index.ts`](src/index.ts) for the full list.

## Files

- `src/index.ts` — daemon entry point (source selection, relay wiring, graceful shutdown).
- `src/replayEvents.ts` — replay a recorded JSONL event log (`pnpm replay`).
- `src/analyzeLogs.ts` — summarize a recorded session (`pnpm analyze`).
- `src/mockConsumer.ts` — a minimal WebSocket consumer for manual testing against the relay.

## See also

- [docs/relay/](../../docs/relay/) — start with [SETUP.md](../../docs/relay/SETUP.md) for
  per-platform setup and the `TOWER_SOURCE` modes.
- [docs/relay/ARCHITECTURE.md](../../docs/relay/ARCHITECTURE.md) — packages and data flow.
- [docs/relay/TROUBLESHOOTING.md](../../docs/relay/TROUBLESHOOTING.md) — connection and BLE issues.
