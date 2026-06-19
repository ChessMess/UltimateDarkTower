# Contributing to UltimateDarkTowerRelay

Thanks for your interest! This is an unofficial, fan-made project in the *Ultimate Dark Tower* family.
This guide covers the development workflow, project layout, and code standards.

---

## Getting Started

```bash
# Clone and install
git clone https://github.com/ChessMess/UltimateDarkTowerRelay.git
cd UltimateDarkTowerRelay
npm install

# Verify everything works (lint → type-check → test → build)
npm run ci
```

Requires **Node.js 18+** and **npm 7+** (workspaces). Native BLE addons (`@stoprocent/bleno`, and the
optional `@stoprocent/noble`) build during install; if a prebuild isn't available you'll need platform
build tools.

---

## Project Structure

An npm-workspaces monorepo:

| Path | Package | Role |
|---|---|---|
| `packages/shared` | `ultimatedarktowerrelay-shared` | Wire protocol types, factories, `RelayEvent`, `PROTOCOL_VERSION`. |
| `packages/core` | `ultimatedarktowerrelay-core` | Headless engine (`TowerEmulator`, `RelayServer`, synthesizer, `RealTower`, `EventLog`, log analysis). |
| `packages/cli` | `ultimatedarktowerrelay-cli` | Headless daemon + `replayEvents` / `analyzeLogs` tools. |
| `packages/electron` | `ultimatedarktowerrelay-electron` | Operator GUI over `core`. |
| `packages/client` | `ultimatedarktowerrelay-client` | Published consumer SDK (`RelayClient`, `PhysicalTowerReplay`). |

Build order is `shared → core → client → cli` via TypeScript composite project references. The reader-facing
docs live in [docs/](docs/); see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design.

> **Planning notes:** the PRD, task roadmap, handoff notes, and dev-link checklist live in a local
> `planning/` directory that is **gitignored** (not part of the published repo). They're working artifacts,
> not reference docs.

---

## Development Workflow

```bash
npm run build           # tsc --build across the workspace
npm start               # run the relay (BLE tower emulator)
npm run start:mock      # BLE-free mock source
npm run start:electron  # Electron operator GUI
npm run mock:consumer   # headless demo consumer (MOCK_ROLE=participant for actions)
npm test                # jest (ts-jest → CommonJS)
npm run lint            # eslint (legacy .eslintrc.js config)
npm run type-check      # tsc --build + electron noEmit
npm run ci              # lint → type-check → test → build
```

Keep CI green before opening a PR. Don't commit `package-lock.json` changes unintentionally — it's
committed for reproducible CI installs.

### Testing discipline

- Tests are co-located as `*.test.ts` under `packages/*/src`.
- **Tests stay BLE-free**: import the **specific** module under test (never the `core` barrel, which
  re-exports `TowerEmulator` → `@stoprocent/bleno`) and inject mocks — a mock BLE adapter for `RealTower`, a mock
  `WebSocket` for `RelayClient`, a mock `TowerWriter` for `PhysicalTowerReplay`.
- **ts-jest type-checks cross-package imports against built `dist/*.d.ts`.** After changing a
  `shared`/`core`/`client` public API, run `npm run type-check` (`tsc --build`) **before** running `jest` in
  isolation, or you'll get phantom `TS2305` errors. `npm run ci` already orders it correctly.
- The official app's reaction can't be unit-tested without the app; timing-sensitive BLE behavior is
  validated on hardware and against recorded sessions.

---

## Code Standards

- **TypeScript** strict mode + composite project references. Keep `core` headless/library-style.
- **Native BLE deps load lazily / stay out of tests** — `RealTower` only reaches `@stoprocent/noble` at
  connect time; it's an **optional** dependency.
- **Prettier** for formatting (`npm run format`), **ESLint** for linting.

---

## Releasing (publish cutover)

The packages are version `0.1.0` and publish-ready but not yet on npm. Downstream repos consume them via
`file:` deps against a sibling checkout until the cutover: publish
`ultimatedarktowerrelay-{shared,core,client}`, then downstream consumers swap their `file:` specifiers to a
versioned range. Bump `PROTOCOL_VERSION` (in `packages/shared`) alongside the package version on any
breaking wire-protocol change.

---

## Questions?

Join the [Restoration Games Discord](https://discord.com/channels/722465956265197618/1167555008376610945/1167842435766952158).
