# Contributing to UltimateDarkTower

Thank you for your interest in contributing to UltimateDarkTower! This document covers the development workflow, code standards, and release process.

## Getting Started

```bash
# Clone the repository
git clone https://github.com/ChessMess/UltimateDarkTower.git
cd UltimateDarkTower

# Install dependencies
npm install

# Verify everything works
npm run ci
```

## Development Workflow

1. **Create a branch** from `main` for your changes
2. **Make your changes** following the code standards below
3. **Run the full CI pipeline** to verify: `npm run ci`
4. **Open a Pull Request** into `main`

### Useful Commands

| Command | Description |
| --- | --- |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Check code with ESLint |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | TypeScript type checking |
| `npm run build` | Full build (type-check + compile + examples) |
| `npm run ci` | Full CI pipeline (lint + type-check + test + build) |

## Code Standards

### TypeScript

- Target ES2017 for broad compatibility
- Use explicit return types for public methods
- Export types for public API surfaces
- Add JSDoc comments for public APIs

### Style

- **ESLint** for code quality — run `npm run lint`
- **Prettier** for formatting — run `npm run format`
- Follow existing naming conventions (`udt` prefix for internal modules)
- One class per file with descriptive file names

### Testing

- Tests live in `tests/` mirroring the `src/` structure
- Use [Jest](https://jestjs.io/) as the test framework
- Use `MockBluetoothAdapter` (`tests/mocks/MockBluetoothAdapter.ts`) for unit tests that need a Bluetooth adapter
- Pass the mock adapter via `new UltimateDarkTower({ adapter: mockAdapter })`
- Run `npm run test:coverage` and aim for high coverage on new code

## Project Architecture

The library uses an **adapter pattern** for multi-platform Bluetooth support:

```
UltimateDarkTower (main API)
  └── UdtBleConnection (connection management)
        └── IBluetoothAdapter (platform interface)
              ├── WebBluetoothAdapter (browsers)
              ├── NodeBluetoothAdapter (Node.js)
              └── Custom adapters (React Native, etc.)
```

Key source files:

- `src/UltimateDarkTower.ts` — Main class users interact with
- `src/udtBleConnection.ts` — Platform-agnostic connection lifecycle
- `src/udtBluetoothAdapter.ts` — `IBluetoothAdapter` interface and error types
- `src/udtBluetoothAdapterFactory.ts` — Auto-detection and adapter creation
- `src/adapters/` — Platform-specific implementations

## Release Process

This project follows [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow) with tagged releases.

### Steps

1. **Create a release branch** from `main`:
   ```bash
   git checkout -b release/vX.Y.Z
   ```

2. **Update version** in `package.json`

3. **Update `CHANGELOG.md`** with the new version's changes

4. **Run the full CI pipeline**:
   ```bash
   npm run ci
   ```

5. **Verify package contents**:
   ```bash
   npm pack --dry-run
   ```

6. **Open a Pull Request** from the release branch into `main`

7. **After merge, tag the release**:
   ```bash
   git checkout main && git pull
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

8. **Publish to npm**:
   ```bash
   npm publish
   ```
   The `prepack` script automatically runs the full CI pipeline before publishing.

9. **Create a GitHub Release** from the tag with the changelog content as release notes

10. **Delete the release branch**:
    ```bash
    git push origin --delete release/vX.Y.Z
    ```

### Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **Major** (X.0.0) — Breaking changes or significant architectural changes
- **Minor** (0.X.0) — New features, backwards-compatible
- **Patch** (0.0.X) — Bug fixes, backwards-compatible

## Hardware Testing

This project communicates with physical hardware (the Return to Dark Tower game tower). When possible, test changes with a real tower device. The `examples/` directory contains applications useful for manual integration testing:

- **Controller** (`examples/controller/`) — Web app replicating official app functionality
- **Game** (`examples/game/`) — Web app with a complete tower game
- **Node** (`examples/node/`) — CLI app for Node.js testing

## Questions?

Join us on the [Discord Server](https://discord.com/channels/722465956265197618/1167555008376610945/1167842435766952158)!
