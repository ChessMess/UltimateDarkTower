# Tasks — UltimateDarkTowerRelay (from `docs/prd/prd-relay.md`)

Implementation roadmap generated per the `../ai-dev-tasks` PRD→tasks workflow. One **parent task per PRD
§12 phase**. Phase 1 sub-tasks are concrete and built first; Phases 2–5 are coarser placeholders that
will be expanded when their phase begins.

The relay is a disciplined **extraction/port** from `UltimateDarkTowerSync`'s `host`/`shared`/`client`
packages, built on the published `ultimatedarktower` core lib. Locked decisions: LAN-only v1; hybrid
state (authoritative last-command snapshot + append-only semantic event log); npm-workspaces monorepo
(`shared` / `core` / `cli` / `electron` / `client`); package naming mirrors the UDT family's unscoped
style (`ultimatedarktowerrelay-*`).

## Relevant Files

- `package.json` — root npm-workspaces manifest, scripts, shared devDependencies.
- `tsconfig.json` — root composite project references (shared → core → cli).
- `.eslintrc.js`, `.prettierrc`, `jest.config.js` — shared lint/format/test tooling (ported from Sync).
- `.github/workflows/ci.yml` — CI: lint → type-check → test → build on Node 18/20 (macOS + Ubuntu).
- `packages/shared/src/{version,types,protocol,logging,index}.ts` — protocol envelope, `MessageType`,
  message factories, `LogEntry` format, `PROTOCOL_VERSION`.
- `packages/core/src/fakeTower.ts` — BLE peripheral (`@stoprocent/bleno`): advertising, command
  interception, per-write echo + animation timing, `injectSkullDrop`, DIS identity, ghost-connection
  recovery.
- `packages/core/src/relayServer.ts` — WebSocket relay: `seq` assignment, broadcast, `sync:state`
  catch-up, handshake, ping/pong, paused/resumed, observer mode.
- `packages/core/src/connectionManager.ts` — client lifecycle, handshake timeout, dead-client detection.
- `packages/core/src/commandParser.ts` — 20-byte validation + `buildSkullDropPacket`.
- `packages/core/src/logger.ts` — JSONL logging (`HostLogger`), `seq` correlation, on/off toggle.
- `packages/core/src/observerDisplay.ts` — decoded last-snapshot `TowerState` store.
- `packages/core/src/towerSource.ts` — `TowerSource` seam (FakeTower / MockTower), seeds FR-5.1.
- `packages/core/src/mockTower.ts` — BLE-free canned-command source for headless verification.
- `packages/core/src/index.ts` — library barrel re-exporting the core classes.
- `packages/core/src/commandParser.test.ts` — unit tests for `CommandParser` / `buildSkullDropPacket`.
- `packages/core/src/towerState.roundtrip.test.ts` — `rtdt_pack_state` / `rtdt_unpack_state` round-trips.
- `packages/core/src/relayServer.integration.test.ts` — mock WS consumer receives `sync:state` + a
  relayed `tower:command`.
- `packages/cli/src/index.ts` — headless daemon (`main()`): wires the tower source → relay; `RELAY_PORT`;
  `TOWER_SOURCE=fake|mock`; SIGINT/SIGTERM graceful shutdown.
- `packages/cli/src/mockConsumer.ts` — tiny WebSocket consumer for the demo/verification.

### Notes

- Unit/integration tests are co-located as `*.test.ts` under `packages/*/src` and run with `npm test`
  (jest + ts-jest, compiled to CommonJS). Jest `moduleNameMapper` resolves `ultimatedarktower` to its
  installed `dist`, and the workspace packages to their `src/index.ts`.
- Build order is shared → core → cli via composite project references (`tsc --build`).
- Tests stay BLE-free by importing the specific source modules under test (never the `core` barrel, which
  re-exports `FakeTower`/bleno). `npm run start:mock` exercises the full relay path with no BLE hardware.
- The official app's reaction cannot be unit-tested without the app (PRD §13); real-tower captures + a
  mock BLE central are deferred to later phases.

## Tasks

- [x] 0.0 Repo initialization
  - [x] 0.1 `git init`; create `feature/phase-1-scaffold` branch; add `.gitignore` (ported from Sync).
  - [x] 0.2 Write this roadmap (`docs/tasks/tasks-prd-relay.md`).

- [x] 1.0 Phase 1 — Scaffold + relay parity (PRD §12.1)  ← **built this session**
  - [x] 1.1 Root workspace tooling: `package.json` (`workspaces`, scripts, devDeps), root composite
        `tsconfig.json`, `.eslintrc.js`, `.prettierrc`, `jest.config.js`.
  - [x] 1.2 Port `packages/shared` (`version`, `types`, `protocol`, `logging`, `index`) +
        `package.json`/`tsconfig.json`.
  - [x] 1.3 Port `packages/core`: `commandParser`, `connectionManager`, `relayServer`, `logger`,
        `observerDisplay`, `fakeTower` (verbatim), `index` barrel + `package.json`/`tsconfig.json`.
  - [x] 1.4 Add the `TowerSource` seam + `MockTower` (BLE-free canned-command source).
  - [x] 1.5 Port `packages/cli` `index.ts` daemon (`RELAY_PORT`, `TOWER_SOURCE=fake|mock`,
        SIGINT/SIGTERM) + `mockConsumer.ts`.
  - [x] 1.6 Unit tests: `commandParser`, `rtdt_pack`/`unpack` round-trip.
  - [x] 1.7 Integration test: mock WS consumer receives `sync:state` on connect and a relayed
        `tower:command` with monotonic `seq`.
  - [x] 1.8 Wire npm scripts (`build`, `start`, `start:mock`, `mock:consumer`, `lint`, `type-check`,
        `test`, `ci`) and `.github/workflows/ci.yml`.
  - [x] 1.9 Verify: `npm install`, `npm run ci` green; `start:mock` + `mock:consumer` demo. **← STOP
        for review (you are here).**

- [x] 2.0 Phase 2 — NotificationSynthesizer (PRD §12.2)
  - [x] 2.1 `NotificationSynthesizer` in `core`; participant-reported `dropSkull()` (new `client:action`
        wire message, observer-gated) → `buildSkullDropPacket`. Drives the count out of `FakeTower`'s
        operator-only `injectSkullDrop()` (left as dormant legacy) into the synthesizer.
  - [x] 2.2 Calibration-complete response (`TOWER_COMMANDS.calibration` → fully-calibrated state, all
        drums calibrated at pos 0). **Reply type byte is a configurable API** (default `0x00` tower-state
        response, settable to `0x08` `CALIBRATION_FINISHED`) — exact bytes/timing capture-pending
        (no real captures exist; PRD §11 Q3 / §13). Grounded in UDT central detection + Display
        `buildCalibratedState`.
  - [x] 2.3 Periodic-heartbeat decision: NO periodic beat by default (initial heartbeat + echoes
        suffice). Implemented as an opt-in fallback (`heartbeatIntervalMs`), disabled by default.
  - [x] 2.4 Synthesized calibration reply encoded via `rtdt_pack_state` over the last-command baseline;
        skull drop keeps the byte-preserving `buildSkullDropPacket`.
  - [x] 2.5 `RelayEvent` semantic-event union added in `shared` (type + emission points; persistent
        EventLog is Phase 4).

- [ ] 3.0 Phase 3 — Client SDK + UTDD BridgeSource (PRD §12.3)
  - [x] 3.1 `packages/client` framework-agnostic SDK (`RelayClient`): handshake, decoded-state +
        event subscriptions, participant `dropSkull()`, auto-reconnect with backoff, version-mismatch
        close code, isomorphic WebSocket (injectable for Node). `mockConsumer` refactored to use it.
  - [x] 3.2 `ultimatedarktowerrelay-client` is publish-ready (package metadata + `exports` +
        `publishConfig`). Actual `npm publish` is a manual release step (deferred).
  - [ ] 3.3 (In UTDD — separate session, UTDD read-only here) implement `BridgeSource` against
        `src/sources/types.ts`; swap `ManualSource` → bridge.
  - [x] 3.4 (Owner-directed, resolves §11 Q4) Configurable FakeTower **DIS** (`deviceInfo` option +
        `TOWER_DIS_*` env) so a non-macOS host (Raspberry Pi / Windows) clears the app's "checking
        firmware" screen standalone; BLE-free `deviceInfo` tests; `docs/MACOS_BLE_PERIPHERAL_LIMITATION.md`
        + `docs/SETUP.md`.

- [ ] 4.0 Phase 4 — Electron GUI + event log/replay + Sync adoption (PRD §12.4)
  - [x] 4.1 `packages/electron` operator GUI over `core` (status, BLE permissions, log viewer, manual
        controls) + Electron Forge config. **Slice A done:** ported Sync's Electron lifecycle/IPC/Forge
        skeleton, rewired to the relay composition root (`main.ts` = source-swappable
        `buildSource`/`wireSource`/`switchSource`), with runtime **fake/mock/real** source switching,
        synthesizer-driven skull drop, EventLog wiring, status dashboard, manual controls, client list +
        LAN URLs. **Electron 42 / Node 24** (bumped off Sync's EOL E35); Forge/Vite build; vite-built so
        out of root `tsc --build` + Jest, type-checked via `tsc --noEmit -p packages/electron/tsconfig.json`.
        `electron-rebuild` scoped to the electron scripts (no global postinstall) — keeps CLI Node-ABI
        by default. **Slice B done (log viewer):** relocated the pure `logAnalysis` helpers into `core`
        (+ new BLE/fs-free `buildSessionSummary`/`buildCommandTimeline` builders, unit-tested) so both the
        CLI and the GUI consume them; main-process IPC (`logs:list`/`logs:analyze`/`logs:load-events`)
        runs the analysis with `fs` (the renderer never reads files) and ships structured results to a new
        read-only **Logs** panel (file list + summary / decoded command timeline / anomalies / event log).
        `npm run ci` green (123 tests); renderer bundles clean via Vite. ⏳ Owner: GUI launch +
        `make:electron` packaging + @stoprocent rebuild vs Electron-42 ABI.
  - [x] 4.2 `EventLog` (append-only JSONL semantic events) + replay/export. **Done:** `EventLog`
        (`core`) appends `RelayEvent`s with its own monotonic `seq` to `events-{date}.jsonl` (own
        stream, separate from `HostLogger`; `enabled` toggle + size rotation). All 8 event types now
        emit (CLI wires app-connected/-disconnected + consumer-joined/-left; synthesizer covers the
        rest; real mode appends `command-received` directly). Replay/export via `loadEventLog` /
        `replayEventLog` (sync or realtime-paced) / `exportEventLog` (json|jsonl) + a thin
        `replayEvents` CLI (`npm run replay:events`). BLE-free unit tests (`eventLog.test.ts`).
  - [~] 4.3 Real-tower source (FR-5.1): `RealTower` `TowerSource` via UDT's `NodeBluetoothAdapter`
        (`@stoprocent/noble`, optional dep), selectable `TOWER_SOURCE=real`, BLE-free mock-adapter tests,
        read-only mirror. **Hardware-validated live (2026-06-17)** — physical skull drop relayed
        end-to-end with correct decoded count.
        **FR-5.2 done + hardware-validated (2026-06-17):** `PhysicalTowerReplay` (client SDK) — a thin
        consumer that writes each relayed 20-byte command to a local tower via an injected UDT tower driver
        (Web Bluetooth in the browser); tower-ready gated, serialized writes, `replayLast()` self-heal on
        reconnect; BLE/browser-free unit tests with a mock writer. **Confirmed live:** a physical tower
        mirrored relayed rotations end-to-end in Chrome (harness: `examples/replay-e2e/`).
        **FR-5.3 done; real-mode hardware-validated (2026-06-17):** generic resilience (paused/resumed,
        WS reconnect+backoff, ping/pong, handshake timeout, dead-client, observer) was already ported
        (Phases 1–3); this slice rebuilt `RealTower` onto UDT's **high-level `UltimateDarkTower` class**,
        which owns disconnect *detection* (GATT health + verified battery-heartbeat → `onTowerDisconnect`).
        `RealTower` adds reconnect-on-drop (capped backoff) + initial-connect retry per UDT's documented
        `onTowerDisconnect → connect()` pattern, and relays raw bytes via a new UDT public `onTowerResponse`
        hook. **Confirmed live:** initial-retry connected on power-up; a power-cycle gave a clean
        1-disconnect → 1-reconnect → resume, no listener cascade. (An earlier hand-rolled stall/raw-adapter
        attempt was removed — the tower streams ~1–2 notifications/sec, so silence-based stall was wrong.)
        **Write-back done:** `TOWER_SOURCE=bridge` (FakeTower + RealTower) forwards app commands onto a real
        master tower via `RealTower.sendToTower` (resolves §11 Q5). **Cross-repo (done 2026-06-18):** the UDT
        `onTowerResponse` hook is published in `ultimatedarktower@4.1.0`; relay deps bumped to `^4.1.0` and the
        `npm link` removed, so relay CI is green against the registry. Bridge needs on-hardware validation on a
        non-macOS host (concurrent BLE central+peripheral caveat).
        **Remaining:** FR-5.3 real-tower-specific resilience · relay→tower write-back path ← **next**.
  - [x] 4.4 Port the log-analysis CLI (`analyzeLogs`). **Done:** read-only CLI over the `HostLogger`
        `session-*.jsonl` logs (`npm run analyze:logs` / `-- --dir --session --led-focus --seq
        --anomalies`) — session summary, command timeline, per-seq correlation, LED-override analysis,
        anomaly detection, per-client latency. Pure analysis helpers split into `logAnalysis.ts`
        (reuses shared `decodeCommand`/`bytesFromHex`/`formatLogEntry` + UDT
        `TOWER_LIGHT_SEQUENCES`/`TOWER_AUDIO_LIBRARY`) with a thin `analyzeLogs.ts` CLI; BLE/fs-free
        unit tests (`logAnalysis.test.ts`, 17 cases). **Relocated to `core` in Slice B** (so the GUI can
        reuse it too); the CLI now imports it bleno-free via `ultimatedarktowerrelay-core/dist/logAnalysis`
        (the `replayEvents`→`eventLog` pattern). Scoped to `session-*` files (ignores the
        EventLog's `events-*`); MISSING_SEQ guarded on the presence of client-side log entries (the
        bundled SDK doesn't emit `client:log`, so relay logs are host-only and the check would
        otherwise false-positive every seq).
  - [ ] 4.5 Migrate `UltimateDarkTowerSync` onto the relay's `core` + `client`; remove Sync's custom
        fake-tower/relay code.

- [ ] 5.0 Phase 5 — Future (PRD §12.5)
  - [ ] 5.1 Internet reach (Tailscale / hosted rooms, `wss`, auth, NAT traversal).
  - [ ] 5.2 Multi-participant action reconciliation.
  - [ ] 5.3 Derived higher-level game-event stream built on the event log.
