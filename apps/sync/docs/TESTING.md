# Testing Guide

This document covers how to run, debug, and extend the DarkTowerSync test suite.

---

## Quick Start

```bash
# Run the full suite (unit + integration)
npm test

# Watch mode — re-runs on file changes
npm test:watch

# Run with coverage report
npm test:coverage
```

All three commands invoke [Jest](https://jestjs.io/) via the root `package.json` scripts. No build step is required — `ts-jest` compiles TypeScript on-the-fly.

---

## Prerequisites

| Requirement | Minimum | Notes |
|-------------|---------|-------|
| Node.js | 18+ | LTS recommended |
| npm | 7+ | Workspaces support |
| Dependencies | installed | Run `npm ci` (or `npm install`) at the repo root first |

No physical tower, BLE hardware, or Electron build is needed to run tests. The integration tests spin up a real WebSocket server on localhost.

---

## Test Layout

```
tests/
├── unit/
│   ├── shared/
│   │   └── protocol.test.ts        # Protocol constants & message factories
│   ├── host/
│   │   ├── connectionManager.test.ts  # Handshake timeout, ping/pong, zombie cleanup
│   │   ├── logger.test.ts             # HostLogger write, rotation, pruning
│   │   ├── commandParser.test.ts      # 20-byte command validation
│   │   └── relayGate.test.ts          # CommandParser gate before broadcast
│   └── client/
│       └── clientLogger.test.ts       # Ring buffer, auto-send batching, flush
└── integration/
    └── relayLifecycle.test.ts         # Full relay server ↔ WebSocket client lifecycle
```

### Unit tests (`tests/unit/`)

Each unit test file targets a single module in isolation. External dependencies (WebSocket, timers, filesystem) are mocked or faked.

- **`shared/protocol.test.ts`** — Verifies `MessageType` constants, `PROTOCOL_VERSION` format, `CLOSE_CODE_PROTOCOL_VERSION_MISMATCH` value, and that every message factory (`makeTowerCommandMessage`, `makeSyncStateMessage`, etc.) produces correctly shaped envelopes with `type`, `payload`, and `timestamp` fields.

- **`host/connectionManager.test.ts`** — Uses **Jest fake timers** (`jest.useFakeTimers()`) to test time-dependent behavior without real delays: handshake timeout fires after 10 s of inactivity, ping/pong keepalive terminates unresponsive sockets, `destroy()` cleans up all timers. Socket mocks capture `ping`, `terminate`, and `close` calls.

- **`host/logger.test.ts`** — Tests `HostLogger` file I/O: session file naming, writing structured log entries, log file rotation when a file exceeds `maxFileSizeBytes`, and `pruneOldLogs` deleting files older than a threshold. Uses a real temp directory (`os.tmpdir()`), cleaned up in `afterEach`.

- **`host/commandParser.test.ts`** — Tests `CommandParser.isValid()` against valid 20-byte arrays, short arrays, oversized arrays, and empty input.

- **`host/relayGate.test.ts`** — Tests the integration point where `CommandParser.isValid()` gates `RelayServer.broadcast()`, verifying that invalid packets are dropped and valid ones are forwarded.

- **`client/clientLogger.test.ts`** — Tests `ClientLogger` ring buffer eviction at 500 entries, auto-send batching, and flush-on-disconnect behavior using a mock `TowerRelay`.

### Integration tests (`tests/integration/`)

Integration tests exercise real network I/O — no mocks for WebSocket connections.

- **`relayLifecycle.test.ts`** — Starts a **real `RelayServer`** bound to port `19876` on `127.0.0.1`. Connects actual `ws` WebSocket clients. Tests the full handshake lifecycle:
  - `sync:state` arrives as the first message on connect
  - `sync:state` carries `null` before any broadcast, then carries `lastCommand` after
  - Client stays connected after sending `CLIENT_HELLO`
  - `tower:command` broadcast reaches all connected clients
  - `broadcast()` returns incrementing sequence numbers
  - `client:disconnected` propagates to remaining peers
  - **Protocol version enforcement**: mismatched version → close code 4000; matching version → stays open; missing version → close code 4000

---

## Running Specific Tests

```bash
# Run only integration tests
npx jest tests/integration

# Run only unit tests
npx jest tests/unit

# Run a single test file
npx jest tests/integration/relayLifecycle.test.ts

# Run tests matching a name pattern
npx jest -t "protocol version"
```

---

## What to Look For

### All green

```
Test Suites: 7 passed, 7 total
Tests:       98 passed, 98 total
```

If you see this, everything is working. The `console.warn` output from `ConnectionManager` and `RelayServer` during tests is expected — these are the actual warning logs emitted by the code under test (e.g., handshake timeouts, protocol mismatches). They are not errors.

### Common warnings to ignore

| Warning | Why it appears |
|---------|---------------|
| `Watchman crawl failed` | Watchman is not installed or lacks permissions. Jest falls back to the Node crawler — tests still run fine. |
| `--localstorage-file was provided without a valid path` | Node.js internal warning from Jest workers. Harmless. |
| `[ConnectionManager] Client … did not complete handshake` | Expected output from the handshake timeout test. |
| `[relay] Client … protocol mismatch` | Expected output from the version enforcement tests. |

### Failures to investigate

- **Port conflict on 19876** — The integration tests bind to `127.0.0.1:19876`. If another process holds that port, `relayLifecycle.test.ts` will fail with `EADDRINUSE`. Kill the conflicting process or change `TEST_PORT` in the test file.

- **Timeout errors in integration tests** — The test timeout is 10 seconds (`jest.setTimeout(10_000)`). If a test hangs, it usually means a WebSocket message was never received. Check that `RelayServer` starts and that nothing is swallowing errors silently.

- **Fake timer leaks in unit tests** — `connectionManager.test.ts` uses `jest.useFakeTimers()`. If a test fails and timers are not restored, subsequent tests in the same worker may behave unexpectedly. Each test file is isolated by default (separate worker), so this is rare.

---

## Coverage

```bash
npm run test:coverage
```

This generates a report in three formats:
- **Terminal** — summary table printed to stdout
- **HTML** — open `coverage/index.html` in a browser for a line-by-line view
- **LCOV** — `coverage/lcov.info` for CI integration

Coverage is collected from `packages/*/src/**/*.ts`, excluding `.d.ts` files, `index.ts` barrel exports, and the client package (browser-only, not testable in Node).

---

## CI

Tests run automatically on every push and PR to `main` via [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

- **Matrix**: macOS + Ubuntu, Node 18 + 20
- **Pipeline**: `npm ci` → `lint` → `type-check` → `test` → `build`

If CI is red, check the failing job's log. The most common cause is a type error caught by `npm run type-check` that wasn't caught locally (e.g., stricter settings on a different platform).

---

## Writing New Tests

### Conventions

- Place unit tests in `tests/unit/<package>/` mirroring the source structure.
- Place integration tests (real I/O, real server) in `tests/integration/`.
- Name test files `<module>.test.ts`.
- Use a JSDoc comment at the top of each test file explaining what it covers.
- Write high-quality tests — no filler. Each test should verify meaningful behavior.

### Unit test template

```ts
/**
 * myModule.test.ts — unit tests for MyModule.
 */
import { MyModule } from '../../../packages/<pkg>/src/myModule';

describe('MyModule', () => {
  it('does the expected thing', () => {
    const result = MyModule.doThing();
    expect(result).toBe(expected);
  });
});
```

### Integration test tips

- Use the helper functions in `relayLifecycle.test.ts` as a pattern: `connectAndReceiveFirst()`, `connectAndHandshake()`, `waitForMessage()`.
- Always close WebSocket clients in tests (even on failure paths) to avoid port leaks.
- Use `afterEach` with a small `setTimeout` pause between tests to let sockets fully close.
- Set `jest.setTimeout(10_000)` or higher for integration suites — real network I/O can be slow.

### Module resolution

The Jest config in `jest.config.js` maps workspace package names to source:

```js
moduleNameMapper: {
  '^@dark-tower-sync/shared$': '<rootDir>/packages/shared/src/index.ts',
  '^@dark-tower-sync/host$':   '<rootDir>/packages/host/src/index.ts',
}
```

Import from `@dark-tower-sync/shared` in tests — it resolves to the TypeScript source directly (no build needed).
