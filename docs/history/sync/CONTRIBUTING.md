# Contributing to DarkTowerSync

Thank you for your interest in contributing to DarkTowerSync! This document covers the monorepo structure, development workflow, code standards, and release process.

## Getting Started

```bash
# Clone the repository
git clone https://github.com/ChessMess/DarkTowerSync.git
cd DarkTowerSync

# Install all workspace dependencies
npm install

# Verify everything works
npm run ci
```

### Runtime Compatibility

- Current supported runtime floor is Node.js 18+ (`engines.node >=18.0.0`).
- When changing dependencies, run the full CI pipeline locally before opening a PR.

---

## Monorepo Structure

This project uses **npm workspaces** with three packages:

| Package                 | Path               | Purpose                                        |
| ----------------------- | ------------------ | ---------------------------------------------- |
| `@dark-tower-sync/shared` | `packages/shared` | Shared types, protocol constants, message factories |
| `@dark-tower-sync/host`   | `packages/host`   | Fake BLE tower peripheral + WebSocket relay server |
| `@dark-tower-sync/client` | `packages/client` | Browser client — WebSocket receiver + Web Bluetooth replay |

### Which package to work in

- **New protocol message types or shared types** → `packages/shared/src/`
- **BLE peripheral (fake tower), relay server, command parsing** → `packages/host/src/`
- **Browser UI, WebSocket client, Web Bluetooth tower replay** → `packages/client/src/`

### Cross-package imports

The host and client reference shared using the workspace protocol:

```ts
import { MessageType, PROTOCOL_VERSION } from '@dark-tower-sync/shared';
```

After `npm install`, npm creates a symlink so imports resolve to `packages/shared/src/`.
Build `shared` first before building `host` or `client` (`npm run build:shared`).

---

## Development Workflow

1. **Create a branch** from `main` for your changes
2. **Make your changes** following the code standards below
3. **Run the full CI pipeline** to verify: `npm run ci`
4. **Open a Pull Request** into `main`

### Useful Commands

| Command                     | Description                                         |
| --------------------------- | --------------------------------------------------- |
| `npm test`                  | Run test suite                                      |
| `npm run test:watch`        | Run tests in watch mode                             |
| `npm run test:coverage`     | Run tests with coverage report                      |
| `npm run lint`              | Check code with ESLint                              |
| `npm run lint:fix`          | Auto-fix lint issues                                |
| `npm run lint:flat:preview` | Run ESLint using flat config preview mode           |
| `npm run format`            | Format code with Prettier                           |
| `npm run type-check`        | TypeScript type checking across all packages        |
| `npm run build`             | Build all packages (shared first)                   |
| `npm run build:shared`      | Build the shared package only                       |
| `npm run build:host`        | Build the host package only                         |
| `npm run build:client`      | Build the client package (Vite) only                |
| `npm run dev:host`          | Run host in TypeScript watch mode                   |
| `npm run dev:client`        | Run Vite dev server for the client                  |
| `npm run ci`                | Full CI pipeline (lint + type-check + test + build) |
| `npm run clean`             | Remove all dist/ directories                        |

### ESLint 9 Migration Readiness

- The active lint path used by CI remains `npm run lint` (legacy `.eslintrc.js`).
- A flat-config preview file is available at `eslint.config.mjs` for staged ESLint 9 migration work.
- Use `npm run lint:flat:preview` to evaluate compatibility before any major ESLint upgrade.

---

## Code Standards

### TypeScript

- `strict: true` is enabled across all packages — no implicit `any`, strict null checks.
- Use explicit return types for public methods and exported functions.
- Export types for all public API surfaces.
- Add JSDoc comments for public classes and methods.

### Style

- **ESLint** for code quality — run `npm run lint`
- **Prettier** for formatting — run `npm run format`
- Single quotes, trailing commas (ES5), 100-character print width, 2-space indent.
- One class per file with a descriptive filename matching the class name.

### Testing

- Tests live in `tests/unit/` mirroring the package structure (e.g., `tests/unit/shared/`).
- Use [Jest](https://jestjs.io/) as the test framework with `ts-jest` for TypeScript.
- Run `npm run test:coverage` and aim for high coverage on new code in `packages/shared` and `packages/host`.
- The `packages/client` package is excluded from Jest coverage (browser environment — test manually).

---

## Hardware Testing

DarkTowerSync communicates with physical hardware. Integration tests that require a real tower or BLE adapter live in `tests/integration/` and are **not run by the CI pipeline** automatically.

### Requirements for hardware testing

- A physical **Return to Dark Tower** game tower.
- A Bluetooth adapter supporting **peripheral mode** (BLE advertising).
- The official **Return to Dark Tower companion app** running on a phone.
- A browser with **Web Bluetooth** support (Chrome or Edge) for client testing.

Contributions that include hardware-validated integration tests are especially welcome.

---

## Release Process

This project follows [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow) with tagged releases.

### Steps

1. **Create a release branch** from `main`:

   ```bash
   git checkout -b release/vX.Y.Z
   ```

2. **Update version** in root `package.json` and all `packages/*/package.json` files.

3. **Update `CHANGELOG.md`** — move the `[Unreleased]` items into a new `[X.Y.Z] - YYYY-MM-DD` section.

4. **Run the full CI pipeline**:

   ```bash
   npm run ci
   ```

5. **Open a Pull Request** from the release branch into `main`.

6. **After merge, tag the release**:

   ```bash
   git checkout main && git pull
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

7. **Create a GitHub Release** from the tag with the changelog content as release notes.

8. **Delete the release branch**:
   ```bash
   git push origin --delete release/vX.Y.Z
   ```

### Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **Major** (X.0.0) — Breaking changes to the WebSocket protocol or public API
- **Minor** (0.X.0) — New features, backwards-compatible
- **Patch** (0.0.X) — Bug fixes, backwards-compatible

> The project is currently at `0.1.0` — pre-release. The public API and protocol are not yet stable.

---

## Questions?

Join us on the [Discord Server](https://discord.com/channels/722465956265197618/1167555008376610945/1167842435766952158)!
