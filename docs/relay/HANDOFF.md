# Handoff — UltimateDarkTowerRelay

A working handoff for continuing this repo in a fresh session. The canonical specs are
[docs/prd/prd-relay.md](prd/prd-relay.md) (the spec) and [docs/tasks/tasks-prd-relay.md](tasks/tasks-prd-relay.md)
(the roadmap — one parent task per PRD §12 phase). **Phase 1 is done; work continues at task 2.0.**

## What this is

A Node/Electron app that connects to the official *Return to Dark Tower* companion app **as a fake BLE
tower** and relays tower traffic to digital consumers over WebSocket on the LAN, plus a published client
SDK. It is a disciplined extraction/port from the sibling repo `UltimateDarkTowerSync`, built on the
published `ultimatedarktower` core lib. It will also become the shared bridge Sync later consumes.

## Read first (read-only)

- `docs/prd/prd-relay.md` — goals, FR-1..FR-8, architecture, state model, constraints, phasing (§12),
  open questions (§11), reuse map (§14).
- `docs/tasks/tasks-prd-relay.md` — the roadmap; Phase 1 (task 1.0) is checked off.
- Sibling repos to lift/evolve from (do **not** modify them):
  - `../UltimateDarkTowerSync/packages/{shared,host,client,electron}` — most code is ported from here.
  - `../UltimateDarkTower/src` — UDT core (`rtdt_pack_state`/`rtdt_unpack_state`, `udtConstants.ts`
    `TOWER_COMMANDS`/`TOWER_MESSAGES`/`SKULL_DROP_COUNT_POS`, `udtBleConnection.ts` notification semantics).
  - `../UltimateDarkTowerDigital/src/sources/types.ts` — the consumer seam (`TowerStateSource` with
    `dropSkull()`/`breakSeal()`) the future client SDK/BridgeSource targets.

## Current state (Phase 1 — verified)

npm-workspaces monorepo; packages named unscoped like the UDT family (root is private
`ultimatedarktowerrelay`):

| Package | Name | Contents |
|---|---|---|
| `packages/shared` | `ultimatedarktowerrelay-shared` | protocol envelope/`MessageType`/factories, `LogEntry`, `PROTOCOL_VERSION='0.1.0'` (verbatim port) |
| `packages/core` | `ultimatedarktowerrelay-core` | verbatim ports: `fakeTower`, `relayServer`, `connectionManager`, `commandParser`, `logger` (`HostLogger`), `observerDisplay`; net-new `towerSource.ts` seam + `mockTower.ts`; `index.ts` library barrel |
| `packages/cli` | `ultimatedarktowerrelay-cli` | headless daemon `index.ts` (`TOWER_SOURCE=fake\|mock`, `RELAY_PORT`, SIGINT/SIGTERM) + `mockConsumer.ts` |

Tooling (ported from Sync): TS strict + composite project refs, ESLint (`.eslintrc.js`, legacy) /
Prettier, Jest (ts-jest→CJS), `.github/workflows/ci.yml` (lint→type-check→test→build, Node 18/20,
macOS+Ubuntu). Tests co-located `packages/core/src/*.test.ts`: `commandParser`, `towerState.roundtrip`,
`relayServer.integration`.

Verify: `npm run ci` (lint, type-check, test, build — 26 tests). Headless demo: `npm run start:mock`
(terminal 1) + `npm run mock:consumer` (terminal 2) → consumer receives `sync:state` + a relayed
`tower:command`, no BLE hardware. `npm start` runs the real FakeTower (advertises on macOS via bleno).

## Locked decisions — do not re-litigate

- Sync is NOT retired; this repo is the shared bridge Sync will later consume. Do **not** modify the Sync,
  UDT, or UTDD repos.
- LAN-only for v1 (internet/Tailscale/auth are a future phase).
- Hybrid state: authoritative last-command `TowerState` snapshot (live/catch-up) + append-only semantic
  event log (JSONL) for replay/audit. NOT strict event-sourcing.
- Naming: unscoped `ultimatedarktowerrelay-*` (mirrors the UDT family, not Sync's `@dark-tower-sync/*`).
  Wire protocol kept identical to Sync's (`host:status` etc.) for a low-churn Sync cutover later.
- Resolved synthesis facts (PRD §11): likely NO periodic battery heartbeat (initial heartbeat + per-write
  echoes suffice — add a recurring beat only as a fallback if a capture shows a timeout); a seal break is
  app-command-driven, NOT synthesized; only `dropSkull()` needs synthesizing.

## Conventions / gotchas

- **FakeTower is a verbatim port** (top-level `@stoprocent/bleno` import + constructor listeners — do NOT
  lazy-load). Tests stay BLE-free by importing the **specific** source module under test, never the `core`
  barrel (which re-exports FakeTower→bleno). `@stoprocent/noble` (real-tower path) is not a dependency yet
  (Phase 4).
- Jest `moduleNameMapper` resolves `ultimatedarktower` → installed `dist/src/index.js` and the workspace
  packages → their `src/index.ts`. Package tsconfigs exclude `src/**/*.test.ts` from the composite build.
- The CLI wires the source via `source.on('command', …)` (the `TowerSource` seam), so FakeTower and
  MockTower are interchangeable. New tower sources/synthesizers should fit this seam.
- Keep `core` headless and usable as a library (CLI and future Electron main both consume it).
- Don't commit/push unless asked. `package-lock.json` is committed for CI's `npm ci`.

## Next: Phase 2 (PRD §12.2 / tasks doc 2.0) — NotificationSynthesizer

Close the tower→app return-traffic loop FakeTower half-implements:

1. Add a headless `NotificationSynthesizer` in `packages/core`; wire a participant-reported `dropSkull()`
   → the existing `injectSkullDrop()` / `buildSkullDropPacket` (driven by a consumer event, not a manual
   click).
2. Calibration-complete: respond to `TOWER_COMMANDS.calibration` (=4) with `CALIBRATION_FINISHED`
   (`TOWER_MESSAGES.CALIBRATION_FINISHED.value`=8) **if** the app expects one (validate per §11/§13).
3. Resolve the heartbeat decision (initial-only vs. periodic fallback).
4. Encode synthesized notifications via `rtdt_pack_state` over the last-command baseline (FR-3.4).
5. Add the `RelayEvent` semantic-event union in `packages/shared` (type + emission points; full EventLog
   persistence/replay is Phase 4).
6. Unit-test synthesizer output bytes; keep BLE-free and CI-green.

Do NOT build the Electron GUI, the client SDK, EventLog persistence/replay, or the real-tower mirror path
(Phases 3–4).

## Workflow

Follow the `../ai-dev-tasks` PRD→tasks workflow. Use plan mode: explore the relevant code (Sync's FakeTower
return traffic + any real-tower captures under `../UltimateDarkTowerSync/docs/`, and UDT's
`TOWER_MESSAGES`/notification decode in `udtBleConnection.ts`), propose a Phase-2 plan, get approval before
writing code. Where exact synthesized bytes/timing are unconfirmed without the real app (PRD §13), say so
and prefer validating against captures over guessing. Verify with unit tests + the `start:mock` demo, then
STOP for review before Phase 3.
