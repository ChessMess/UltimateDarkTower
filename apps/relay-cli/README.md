# Relay CLI

Headless relay daemon — a BLE tower emulator (or a real tower bridge) plus a WebSocket relay
server, for running unattended on a server, a Raspberry Pi, in Docker, or any always-on host.

## What it does

Starts a `TowerSource` (emulator, mock, real tower, or bridge) and a `RelayServer`, then wires the
source's commands into the relay so any connected WebSocket consumer receives them in real time.

## Run it

```bash
npx ultimatedarktowerrelay-cli
```

That's the whole install. Needs **Node >= 22.13** and nothing else — the BLE native modules ship
prebuilt binaries for Windows (x64/x86), macOS (Intel/Apple Silicon) and Linux (x64/arm/arm64), so
there is no compile step. (Windows-on-ARM has no prebuild and will attempt to build from source.)

It opens on a live status board — relay URLs (including your LAN address, so a phone can
connect), tower/BLE state, connected clients, and an activity feed — with the URL to open and
click **Connect** shown in the RELAY panel. Full player-facing walkthrough:
**[Connecting the official app](https://chessmess.github.io/UltimateDarkTower/digital/connecting-the-official-app.html)**.

Keys: `q` quit, `r` resend the last command, `l` toggle JSONL logging. Set `RELAY_DASHBOARD=0` to
fall back to plain log lines instead (useful over a dumb pipe, or if you just prefer it) — the
board also disables itself automatically when stdout/stdin aren't both a real terminal (Docker,
systemd, a piped log).

### From a checkout, for development

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
overrides), `LOGGING=0` (disable JSONL file logging), `RELAY_LOG_DIR` (log directory, default
`./logs` — **relative to the current directory**, which under `npx` is wherever you ran it),
`RELAY_DASHBOARD=0` (disable the live status board). See the header comment in
[`src/index.ts`](src/index.ts) for the full list.

## Files

- `src/index.ts` — daemon entry point (source selection, relay wiring, graceful shutdown).
- `src/dashboard.tsx` — the Ink status board.
- `src/format.ts` — pure formatting helpers for the board (unit-tested in `format.test.ts`).
- `src/replayEvents.ts` — replay a recorded JSONL event log (`pnpm replay`).
- `src/analyzeLogs.ts` — summarize a recorded session (`pnpm analyze`).
- `src/mockConsumer.ts` — a minimal WebSocket consumer for manual testing against the relay.

## See also

- [docs/relay/](../../docs/relay/) — start with [SETUP.md](../../docs/relay/SETUP.md) for
  per-platform setup and the `TOWER_SOURCE` modes.
- [docs/relay/ARCHITECTURE.md](../../docs/relay/ARCHITECTURE.md) — packages and data flow.
- [docs/relay/TROUBLESHOOTING.md](../../docs/relay/TROUBLESHOOTING.md) — connection and BLE issues.
