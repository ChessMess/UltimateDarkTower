# packages/core (`ultimatedarktower`) — the BLE driver

Controls the physical tower over the Nordic UART service (device name
`ReturnToDarkTower`). See `docs/` for depth: `ARCHITECTURE.md`, `API_REFERENCE.md`,
`TOWER_TECH_NOTES.md`, `BLE_DIAGNOSTICS.md`. Tower protocol constants (side/level/glyph
enums, LED layer index, light/volume values) live in the repo-root `AGENTS.md`.

## Architecture

- **`IBluetoothAdapter` (`src/udtBluetoothAdapter.ts`) is the platform contract.** A
  factory auto-detects Web Bluetooth vs Node `@stoprocent/noble`; custom platforms
  (React Native, Cordova) and tests implement the same interface. Don't reach past it
  to a concrete transport.
- Layered: `UltimateDarkTower` → `UdtCommandQueue` (serializes, 30 s response timeout)
  → `UdtTowerState` (packs/unpacks the 19-byte state) → `UdtBleConnection` → adapter.

## Gotchas when touching tower control

- **Rate limiting** — keep ~200–500 ms between commands; the tower silently drops
  packets sent faster. Long commands (calibration, rotation) suspend heartbeat
  detection. Check connection state first.
- **Stateful commands** (`setLED`, `playSoundStateful`, `rotateDrumStateful`,
  `rotateWithState`) send the **full** state packet, never a delta — read-modify-write
  against `UdtTowerState` so you don't clobber other fields.
- **"Command complete" fires when a sound/animation _starts_, not when it ends** — do
  not use it as a "ready for the next sound" signal (see `docs/TOWER_TECH_NOTES.md`).
- **Glyph tracking** — positions are `null` until calibration completes, then
  auto-update on rotation; multiple glyphs can share a drum.
- **Seal state** is software-only (firmware doesn't report it). **Disconnect detection**
  watches 5 signals (battery heartbeat ~3 s, GATT event, 30 s command timeout, BT
  availability, manual) — no single source of truth.
- Render-only apps (no BLE) should construct with `{ platform: BluetoothPlatform.NONE }`.

## Build & test

- `build` is a chain: `clean && typecheck && tsc && esbuild …` — it ships a `tsc` CJS
  build (`dist/src/`) **and** a hand-rolled esbuild ESM bundle (`dist/esm/index.mjs`).
  `tsconfig.json` targets `es2017`/CommonJS on purpose (broadest consumer compat) and
  does not extend the workspace ES2022 base.
- Tests are **jest** (`tests/`, not colocated). Mocks in `tests/mocks/`,
  adapter tests in `tests/adapters/`.
- **`MockBluetoothAdapter` (`tests/mocks/MockBluetoothAdapter.ts`)** is the standard test
  seam — implements `IBluetoothAdapter` with fail-injection flags and call counts. Pass
  it via `new UltimateDarkTower({ adapter: mockAdapter })`.
- `tests/integration/*.integration.ts` run via **ts-node** (`test:integration`), need a
  real powered-on tower, and are excluded from the jest run.

## Publishing

Depends on `ultimatedarktowerdata` (`workspace:*`) — since v6, core re-exports board/foe/
seed data from game-data rather than shipping its own. `files` allowlist ships only
`dist/` + README/LICENSE/CHANGELOG, so this file is never in the npm tarball.
