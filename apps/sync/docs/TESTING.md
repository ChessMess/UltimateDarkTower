# Testing Guide

This document covers the DarkTowerSync **client** test suite. (Host / relay / protocol engine tests live in
[UltimateDarkTowerRelay](../../UltimateDarkTowerRelay) — run `npm run ci` there.)

---

## Quick Start

```bash
# Run the suite
npm test

# Watch mode — re-runs on file changes
npm run test:watch

# Run with coverage report
npm run test:coverage
```

All three invoke [Jest](https://jestjs.io/) via the root `package.json` scripts, with `ts-jest` compiling
TypeScript on the fly.

---

## Prerequisites

| Requirement | Minimum | Notes |
|-------------|---------|-------|
| Node.js | 18+ | LTS recommended |
| npm | 7+ | Workspaces support |
| Dependencies | installed | Run `npm install` at the repo root first |
| Relay built | yes | `ts-jest` type-checks the relay SDK imports against the relay's built `dist` (see below) |

No physical tower, BLE hardware, or browser is needed to run the tests.

> **Relay build prerequisite (ts-jest/dist gotcha).** The client imports `ultimatedarktowerrelay-shared`,
> which resolves (via the `file:` dep) to the relay's built `dist`. `ts-jest` type-checks cross-package
> imports against those `.d.ts` files, so **check out and build the relay sibling** (`npm run build`) before
> running `jest`, or you'll get phantom `TS2305` errors.

---

## Test Layout

```
tests/
└── unit/
    └── client/
        └── clientLogger.test.ts   # Ring buffer, auto-send batching, flush, client:log JSON contract
```

The client is the only package in this repo; its lone unit-tested module is `ClientLogger`.

- **`client/clientLogger.test.ts`** — tests `ClientLogger` ring-buffer eviction at 500 entries, auto-send
  batching, flush-on-disconnect, and the `client:log` message contract (it asserts on the JSON string sent
  through the injected send function — `JSON.parse(...).type === 'client:log'`, `payload.entries`). It imports
  only `ClientLogger` (no relay transport), so it stays browser/BLE-free.

The transport (`RelayClient`) and replay (`PhysicalTowerReplay`) are unit-tested in the relay repo, against a
mock WebSocket / mock tower writer.

---

## Running Specific Tests

```bash
npx jest tests/unit/client/clientLogger.test.ts   # one file
npx jest -t "ring buffer"                          # by name pattern
```

---

## Coverage

```bash
npm run test:coverage
```

Generates a terminal summary, an HTML report (`coverage/index.html`), and `coverage/lcov.info`. Coverage is
collected from `packages/*/src/**/*.ts`.

---

## Module resolution

`jest.config.js` maps only the `ultimatedarktower` CJS entry (so the relay's `shared` dist can `require` it
under Jest); the relay SDK packages (`ultimatedarktowerrelay-*`) resolve through `node_modules` via their
`file:` deps' built `dist`:

```js
moduleNameMapper: {
  '^ultimatedarktower$': '<rootDir>/node_modules/ultimatedarktower/dist/src/index.js',
}
```

---

## CI

The client CI pipeline (`.github/workflows/ci.yml`) runs `npm ci` → `lint` → `type-check` → `test` → `build`.
All dependencies (relay SDK, UltimateDarkTower, UltimateDarkTowerDisplay) are published to npm, so `npm ci`
resolves from the registry on a clean checkout.

---

## Writing New Tests

- Place client unit tests in `tests/unit/client/`, named `<module>.test.ts`.
- Keep tests **browser/BLE-free** — inject mocks rather than touching Web Bluetooth or a real `RelayClient`
  socket.
- Add a JSDoc comment at the top of each test file describing what it covers.
