# Testing Guide

This document covers the DarkTowerSync **client** test suite. (Host / relay / protocol engine tests live in
`packages/relay-core` and `packages/relay-client` in this monorepo — run `pnpm run ci` from the repo root.)

---

## Quick Start

```bash
# From the repo root
pnpm --filter @dark-tower-sync/client test

# Watch mode — re-runs on file changes
pnpm --filter @dark-tower-sync/client exec vitest

# Run with coverage report
pnpm --filter @dark-tower-sync/client exec vitest run --coverage
```

All invoke [Vitest](https://vitest.dev/) — configured in `vite.config.ts`'s `test` block (`environment: 'node'`,
since `ClientLogger` is pure buffer logic with no DOM dependency).

---

## Prerequisites

| Requirement  | Minimum   | Notes                                          |
| ------------ | --------- | ---------------------------------------------- |
| Node.js      | 22.13+    | pnpm 11 loads `node:sqlite`; see root `.nvmrc` |
| pnpm         | 11+       | Workspace catalogs, `workspace:` protocol      |
| Dependencies | installed | Run `pnpm install` at the repo root first      |

No physical tower, BLE hardware, or browser is needed to run the tests.

The relay SDK (`ultimatedarktowerrelay-client`, `ultimatedarktowerrelay-shared`) and
`ultimatedarktower`/`ultimatedarktowerdisplay` are consumed as `workspace:^` dependencies, resolved
through pnpm's workspace symlinks — no separate build or checkout step is needed beyond `pnpm install`
at the repo root (which runs each dependency's own build as part of the workspace graph).

---

## Test Layout

```
tests/
└── unit/
    └── client/
        └── clientLogger.test.ts   # Ring buffer, auto-send batching, flush, client:log JSON contract
```

The client is the only package in this app; its lone unit-tested module is `ClientLogger`.

- **`client/clientLogger.test.ts`** — tests `ClientLogger` ring-buffer eviction at 500 entries, auto-send
  batching, flush-on-disconnect, and the `client:log` message contract (it asserts on the JSON string sent
  through the injected send function — `JSON.parse(...).type === 'client:log'`, `payload.entries`). It imports
  only `ClientLogger` (no relay transport), so it stays browser/BLE-free.

The transport (`RelayClient`) and replay (`PhysicalTowerReplay`) are unit-tested in `packages/relay-client`,
against a mock WebSocket / mock tower writer.

---

## Running Specific Tests

```bash
pnpm --filter @dark-tower-sync/client exec vitest run tests/unit/client/clientLogger.test.ts   # one file
pnpm --filter @dark-tower-sync/client exec vitest run -t "ring buffer"                          # by name pattern
```

---

## Coverage

```bash
pnpm --filter @dark-tower-sync/client exec vitest run --coverage
```

No coverage provider is currently installed for this app (`@vitest/coverage-v8` is not a devDependency),
so the above prompts to install one on first run.

---

## Module resolution

No test-specific module aliasing is needed. `ultimatedarktower` resolves through its own `exports` map
(both `import` and `require` conditions) via Node's native ESM resolution; the relay SDK packages resolve
through their pnpm workspace symlinks. `vite.config.ts`'s `resolve.alias` stubs only
`@stoprocent/noble` (a Node-only BLE peer dep, never installed or loaded in the browser) — see the comments
there for why.

---

## CI

The monorepo's CI pipeline (`.github/workflows/ci.yml`) runs `pnpm install --frozen-lockfile` →
`pnpm validate:nodes` → `pnpm lint` → `pnpm format:check` → `pnpm build` → `pnpm typecheck` → `pnpm test`,
fanning out across every workspace including this app.

---

## Writing New Tests

- Place client unit tests in `tests/unit/client/`, named `<module>.test.ts`.
- Keep tests **browser/BLE-free** — inject mocks rather than touching Web Bluetooth or a real `RelayClient`
  socket.
- Add a JSDoc comment at the top of each test file describing what it covers.
