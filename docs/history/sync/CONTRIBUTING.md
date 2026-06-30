# Contributing to DarkTowerSync

Thank you for your interest in contributing to DarkTowerSync! This document covers the project structure,
development workflow, code standards, and release process.

DarkTowerSync is **client-only**: it is the browser multiplayer client on top of
[UltimateDarkTowerRelay](../UltimateDarkTowerRelay). The tower-emulator / relay / host / electron code now lives in
the relay — contribute host/protocol changes there.

## Getting Started

```bash
# Clone the repository
git clone https://github.com/ChessMess/DarkTowerSync.git
cd DarkTowerSync

# Install dependencies (see the relay prerequisite below first)
npm install

# Verify everything works
npm run ci
```

### Relay dependency (interim `file:` prerequisite)

The client consumes the relay's published packages (`ultimatedarktowerrelay-client`,
`ultimatedarktowerrelay-shared`). **Until those are published to npm**, `packages/client/package.json`
references them via `file:` deps, so you must:

1. Check out **UltimateDarkTowerRelay as a sibling directory** (`../UltimateDarkTowerRelay`).
2. Build it: `cd ../UltimateDarkTowerRelay && npm install && npm run build`.
3. Then `npm install` here — the `file:` targets resolve to the relay's `dist/`.

This is described in the relay's [CONTRIBUTING.md](../UltimateDarkTowerRelay/CONTRIBUTING.md) (Releasing). It
goes away at the cutover, when the relay packages are published and the client switches to versioned ranges.
Until then, GitHub CI / deploy cannot `npm ci` (the sibling isn't present) — see
[docs/plans/MIGRATION_FOLLOWUPS.md](docs/plans/MIGRATION_FOLLOWUPS.md).

### Runtime Compatibility

- Current supported runtime floor is Node.js 18+ (`engines.node >=18.0.0`).
- When changing dependencies, run the full CI pipeline locally before opening a PR.

---

## Project Structure

This project is an npm-workspaces repo with a **single package**:

| Package                   | Path              | Purpose                                                        |
| ------------------------- | ----------------- | -------------------------------------------------------------- |
| `@dark-tower-sync/client` | `packages/client` | Browser client — relay WebSocket receiver (`RelayClient`) + Web Bluetooth replay (`PhysicalTowerReplay`) + visualizer (`TowerDisplay`) + `ClientLogger` |

Protocol/types come from `ultimatedarktowerrelay-shared`; transport + replay from
`ultimatedarktowerrelay-client`; the visualizer from `ultimatedarktowerdisplay`; Web Bluetooth from
`ultimatedarktower`.

### Where to work

- **Browser UI, WebSocket client wiring, Web Bluetooth tower replay, client logging** → `packages/client/src/`.
- **Tower emulator / relay server / protocol / host logging / log analysis** → the
  [UltimateDarkTowerRelay](../UltimateDarkTowerRelay) repo.
- **Wire protocol / shared types** → the relay's `packages/shared` (consumed here as
  `ultimatedarktowerrelay-shared`).

---

## Development Workflow

1. **Create a branch** from `main` for your changes.
2. **Make your changes** following the code standards below.
3. **Run the full CI pipeline** to verify: `npm run ci`.
4. **Open a Pull Request** into `main`.

### Useful Commands

| Command                     | Description                                          |
| --------------------------- | --------------------------------------------------- |
| `npm test`                  | Run the test suite                                  |
| `npm run test:watch`        | Run tests in watch mode                             |
| `npm run test:coverage`     | Run tests with coverage report                      |
| `npm run lint`              | Check code with ESLint                              |
| `npm run lint:fix`          | Auto-fix lint issues                                |
| `npm run lint:flat:preview` | Run ESLint using flat config preview mode           |
| `npm run format`            | Format code with Prettier                           |
| `npm run type-check`        | TypeScript type checking (`tsc --noEmit`, client)   |
| `npm run build`             | Build the client (Vite) — alias `build:client`      |
| `npm run dev:client`        | Run the Vite dev server for the client              |
| `npm run ci`                | Full CI pipeline (lint + type-check + test + build) |
| `npm run clean`             | Remove the client `dist/` and coverage              |

### ESLint 9 Migration Readiness

- The active lint path used by CI remains `npm run lint` (legacy `.eslintrc.js`).
- A flat-config preview file is available at `eslint.config.mjs` for staged ESLint 9 migration work.
- Use `npm run lint:flat:preview` to evaluate compatibility before any major ESLint upgrade.

---

## Code Standards

### TypeScript

- `strict: true` is enabled — no implicit `any`, strict null checks.
- Use explicit return types for public methods and exported functions.
- Export types for all public API surfaces.
- Add JSDoc comments for public classes and methods.

### Style

- **ESLint** for code quality — run `npm run lint`.
- **Prettier** for formatting — run `npm run format`.
- Single quotes, trailing commas (ES5), 100-character print width, 2-space indent.
- One class per file with a descriptive filename matching the class name.

### Testing

- Client unit tests live in `tests/unit/client/`.
- Use [Jest](https://jestjs.io/) with `ts-jest`.
- Keep tests **browser/BLE-free** — inject mocks. See [docs/TESTING.md](docs/TESTING.md).

---

## Hardware Testing

DarkTowerSync drives physical hardware (the player's tower via Web Bluetooth) and connects to a relay host.
End-to-end checks require:

- A physical **Return to Dark Tower** game tower.
- A browser with **Web Bluetooth** (Chrome or Edge).
- A running **relay host** ([UltimateDarkTowerRelay](../UltimateDarkTowerRelay) — `TOWER_SOURCE=mock` works
  for a BLE-free host, or a real tower-emulator host with the companion app).

Contributions that include hardware-validated reports are especially welcome.

---

## Release Process

DarkTowerSync follows [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow); the
client deploys to GitHub Pages via `.github/workflows/deploy-client.yml`.

1. **Create a release branch** from `main`: `git checkout -b release/vX.Y.Z`.
2. **Update version** in root `package.json` and `packages/client/package.json`.
3. **Update `CHANGELOG.md`** — move `[Unreleased]` items into a new `[X.Y.Z] - YYYY-MM-DD` section.
4. **Run the full CI pipeline**: `npm run ci`.
5. **Open a PR** into `main`; after merge, **tag** (`git tag vX.Y.Z && git push origin vX.Y.Z`) and create a
   GitHub Release.

> The published client depends on the relay packages being on npm. Coordinate releases with the relay's
> publish cutover (see [docs/plans/MIGRATION_FOLLOWUPS.md](docs/plans/MIGRATION_FOLLOWUPS.md)).

### Versioning

[Semantic Versioning](https://semver.org/): **Major** = breaking protocol/API changes, **Minor** = new
backwards-compatible features, **Patch** = backwards-compatible fixes. The project is currently pre-`1.0`; the
public API and protocol are not yet stable.

---

## Questions?

Join us on the [Discord Server](https://discord.com/channels/722465956265197618/1167555008376610945/1167842435766952158)!
