# DarkTowerSync: Next Engineering Steps

## Context

The project is functionally complete for its core use case — the relay system, BLE interception, client Web Bluetooth replay, logging, resilience, and Electron dashboard are all implemented and working. Version 0.1.0 is unreleased. The codebase is clean and well-documented.

The gaps are: low test coverage (27 passing, mostly protocol factories), operational risks (unbounded log growth), and friction for end users (remote players must run a local dev server to access the client). Addressing these three areas transforms the project from "works on my machine" into something genuinely distributable and trustworthy.

---

## Tier 1: Core Quality & Usability (do next)

### 1. Expand Test Suite

**What:** Add unit tests for HostLogger and ClientLogger, integration tests for relay connection lifecycle, and protocol conformance tests. Spec section 15 explicitly lists these as the top 3 suggested next steps.

**Why it matters:** The existing 27 tests only cover protocol message shape. The most complex logic (ping/pong keepalive, handshake timeout, zombie cleanup, ring buffer auto-send, log file writes) has zero test coverage. A failure here would be invisible until a live game session.

**Scope:**
- `tests/unit/host/logger.test.ts` — HostLogger: write entry, master switch no-op, session file naming
- `tests/unit/client/clientLogger.test.ts` — ring buffer eviction at 500, auto-send batching, flush on disconnect
- `tests/integration/relayLifecycle.test.ts` — client connect → hello → sync:state → disconnect flow; handshake timeout fires for zombie; ping/pong terminates unresponsive client
- `tests/unit/shared/protocol.test.ts` (extend) — malformed input handling, protocol version mismatch messages

**Key files:** `packages/host/src/logger.ts`, `packages/client/src/clientLogger.ts`, `packages/host/src/relayServer.ts`, `packages/host/src/connectionManager.ts`

**Verification:** `npm test` all green; CI matrix catches regressions.

---

### ~~2. Log File Rotation / Size Cap~~ ✓

Implemented. See [Completed](#completed) section below.

---

### 3. Hosted Client via GitHub Pages

**What:** Add a GitHub Actions workflow that builds and deploys the Vite client to GitHub Pages on every push to `main`. Remote players open a URL in Chrome instead of cloning the repo and running `npm run dev:client`.

**Why it matters:** Currently, remote players need Node.js, `npm install`, and `npm run dev:client` just to participate. This is the single biggest friction point for real use. A hosted URL eliminates all of it.

**Scope:**
- New workflow: `.github/workflows/deploy-client.yml` — build `packages/client`, upload `dist/` as Pages artifact
- Update `packages/client/vite.config.ts`: set `base` to the GitHub Pages path (e.g. `/UltimateDarkTowerSync/`)
- Update README with the hosted URL and note that users enter the host's relay address into the client
- The host URL input already persists in localStorage — no other client changes needed

**Key files:** `packages/client/vite.config.ts`, `.github/workflows/deploy-client.yml`, `README.md`

**Verification:** Push to `main`, confirm Pages deploys, open URL in Chrome, enter a host WebSocket address, verify connection and tower pairing work end-to-end.

---

## Tier 2: Polish & Robustness

### ~~4. Protocol Version Enforcement~~ ✓

Implemented. See [Completed](#completed) section below.

---

### ~~5. Observer Mode (No-Tower Client)~~ ✓

Implemented. See [Completed](#completed) section below.

---

## Tier 3: Release Readiness

### 7. First Release (v0.1.0) Workflow

**What:** Tag a `v0.1.0` release with a GitHub Actions workflow that builds the Electron DMG (macOS) on tag push and attaches it to the GitHub release.

**Why it matters:** Makes the project distributable without requiring the host to have Node.js or dev tools. The Electron app is the primary host UX.

**Scope:**
- `.github/workflows/release.yml` — triggered on `v*` tags; builds Electron via `electron-forge make`; uploads DMG as release artifact
- Bump `version` in root and electron `package.json` to `0.1.0`
- Write concise release notes in CHANGELOG summarizing the feature set

**Key files:** `.github/workflows/release.yml`, `package.json`, `packages/electron/package.json`, `CHANGELOG.md`

---

## Execution Order

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 1 | Expand test suite | Medium | High — confidence before release |
| 2 | Log rotation | Small | High — prevents operational failures |
| 3 | Hosted client (GitHub Pages) | Small | Very high — removes all remote player friction |
| ~~4~~ | ~~Protocol version enforcement~~ | ~~Small~~ | ~~Medium — correctness guard~~ ✓ |
| ~~5~~ | ~~Observer mode~~ | ~~Medium~~ | ~~Medium — usability for spectators~~ ✓ |
| 6 | v0.1.0 release workflow | Small | High — distributable artifact |

Recommended sequence: complete Tier 1 items (1–3) together as a "pre-release quality pass," then Tier 2 items as game feature additions, then cut the release.

---

## Completed

### Observer Mode (No-Tower Client) ✓

Browser clients can connect with `?observer` in the URL to view a live tower state
visualizer without a physical tower. Observer clients decode `tower:command` packets
using `rtdt_unpack_state()` from the `ultimatedarktower` library and render LEDs
(6 effect types), drum positions with glyph detection, audio sample names, skull
drop events (beam-count delta), and LED sequence overrides. The tower Bluetooth card
is hidden in observer mode. The host tracks observer count separately in `host:status`
broadcasts via `observerCount`. Protocol: `client:hello` accepts an optional
`observer: true` flag.

### Wire CommandParser into Relay Path ✓

Wired `CommandParser.isValid()` as a gate before `RelayServer.broadcast()` in both
`packages/host/src/index.ts` and `packages/electron/src/main/main.ts`. Malformed
packets (not exactly 20 bytes) are now dropped with a `console.warn` before reaching
any client. Added `tests/unit/host/relayGate.test.ts` (4 tests) to lock in the
behavior.

### Log File Rotation / Size Cap ✓

`HostLogger` now accepts a `maxFileSizeBytes` option via a `HostLoggerOptions` object
(backward-compatible — legacy `(logDir, boolean)` constructor still works). When a log
file exceeds the limit, the current write stream closes and a new numbered segment
opens (`session-{ts}-host-2.jsonl`, `-3.jsonl`, etc.). Host and all streams rotate
independently. Electron host defaults to 10 MB per file. A `pruneOldLogs(dir, maxAgeDays)`
utility deletes `.jsonl` files older than 30 days and is called fire-and-forget at
Electron startup. Added 7 tests covering rotation behavior and pruning edge cases.

### Protocol Version Enforcement ✓

The host now enforces protocol version matching during the `client:hello` handshake.
If a client's `protocolVersion` does not match `PROTOCOL_VERSION`, the server closes
the socket with custom close code `4000` (`CLOSE_CODE_PROTOCOL_VERSION_MISMATCH`)
and a human-readable reason string. On the client side, `TowerRelay` detects close
code 4000, suppresses auto-reconnect, and emits a `relay:version-mismatch` event so
the UI can display a "please hard-reload" overlay. Added 3 integration tests (mismatch
disconnect, matching version stays connected, missing version treated as mismatch) and
1 unit test for the close code constant.
