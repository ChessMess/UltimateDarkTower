# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `packages/electron` — new Electron package scaffolding Phase 1 hello world shell
  - Electron Forge + Vite plugin build pipeline (main, preload, renderer targets)
  - `@electron-forge/plugin-auto-unpack-natives` for future bleno ASAR extraction
  - `@electron/rebuild` devDependency for native module ABI recompilation (Phase 2)
  - Main process entry (`src/main/main.ts`) with `BrowserWindow` creation, macOS lifecycle handling
  - Preload script (`src/main/preload.ts`) with `contextBridge` IPC stub
  - Renderer status UI (`src/renderer/`) — dark-themed hello world matching client design language
  - `tsconfig.json` with `moduleResolution: bundler` for Vite compatibility
  - Vite configs for main (with native module externals), preload, and renderer
  - `forge.config.ts` with ZIP/DMG/deb makers
- Root `package.json` — `start:electron`, `make:electron`, `package:electron` scripts
- Root `type-check` script extended to include `packages/electron/tsconfig.json`
- Root `postinstall` script to invoke `@electron/rebuild` for native module ABI sync
- `.github/workflows/ci.yml` — GitHub Actions CI (macOS + Ubuntu, Node 18 + 20); separate `electron-build` job running `electron-forge package`

### Fixed

- `packages/host/package.json` — corrected `@stoprocent/bleno` version from non-existent `^1.0.0` to `^0.12.4` (latest published)

### Known Issues

- `@electron/rebuild` postinstall fails on Node v25 due to a `yargs` ESM compatibility regression; made non-fatal with `|| true` — native rebuild is not required until Phase 2 wires in bleno
- Pre-existing lint errors (11) in `packages/client`, `packages/host`, and `tests/` — not introduced by this change
- Pre-existing `tsc --build --noEmit` TS6310 error in root `type-check` — `packages/host` references `packages/shared` which lacks `composite: true`; pre-dates this change

## [0.1.0] - Unreleased

### Added

- Initial project scaffolding and monorepo setup
- Shared types and WebSocket protocol message definitions
- Host package structure (fake tower BLE peripheral, WebSocket relay server)
- Client package structure (browser-based tower relay via Web Bluetooth)
- Development tooling (ESLint, Prettier, Jest, TypeScript)
