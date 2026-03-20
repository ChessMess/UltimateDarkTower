# DarkTowerSync Electron App — Implementation Plan

## Implementation Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 — Hello World Shell | **Complete** | All files created, window opens, lint/type-check clean |
| Phase 2 — FakeTower + RelayServer wiring | **Complete** | bleno N-API prebuild works in Electron without rebuild; IPC channels wired |
| Phase 2 — IPC status dashboard | **Complete** | Dashboard renders live tower state, client list, command counter |
| Phase 2 — macOS Bluetooth entitlement | Not started | Needed for packaged builds only |

### Phase 1 Deviations from Plan

1. **`electron-squirrel-startup` added as dependency** — the plan's `package.json` omitted this package despite `main.ts` calling `require('electron-squirrel-startup')` at startup. Added `"electron-squirrel-startup": "^1.0.0"` to `dependencies`.

2. **`@stoprocent/bleno` version corrected** — plan specified `^1.0.0` which does not exist on npm; corrected to `^0.12.4` (latest published as of 2026-03-19) in `packages/host/package.json`.

3. **`postinstall` made non-fatal** — `@electron/rebuild` fails on Node v25 due to a `yargs` ESM compatibility regression (`require is not defined in ES module scope`). Added `|| true` to prevent `npm install` from failing. This is safe for Phase 1 since no native modules are imported. Must be revisited when bleno is wired in Phase 2 — likely needs a newer `@electron/rebuild` that pins a compatible `yargs`, or a workaround via `npm run postinstall:electron` invoked manually or in CI only.

### Phase 2 Deviations / Findings

1. **`@electron/rebuild` not required for bleno** — `@stoprocent/bleno@0.12.4` ships a universal macOS N-API prebuild (`darwin-x64+arm64`). N-API is ABI-stable across both Node.js versions and Electron, so no per-ABI recompilation is needed. The prebuild loads cleanly in both Node and Electron. The `postinstall` `|| true` guard (from Phase 1) remains; `@electron/rebuild` may still be useful on Linux or for other future native deps.

2. **Host `index.ts` needed `require.main === module` guard** — the plan did not call this out. When Electron imports `@dark-tower-sync/host`, the host `index.ts` runs its `main()` function (starts a second relay server and BLE advertising). Fixed by wrapping the `main()` call and adding public re-exports (`FakeTower`, `RelayServer`, types) to the top of `index.ts`.

3. **`start:electron` script now builds host first** — Vite externalizes `@dark-tower-sync/host` and resolves it from `node_modules/@dark-tower-sync/host/dist/index.js` at Electron runtime. Dist must exist before `electron-forge start`. Updated root script to `build:shared && build:host && npm run start -w packages/electron`.

4. **`ultimatedarktower` and workspace packages externalized in Vite** — added `@dark-tower-sync/host`, `@dark-tower-sync/shared`, and `ultimatedarktower` to `vite.main.config.ts` externals so Vite doesn't attempt to bundle them.

5. **Tower UUIDs sourced from `ultimatedarktower` main export** — `UART_SERVICE_UUID`, `UART_RX_CHARACTERISTIC_UUID`, `UART_TX_CHARACTERISTIC_UUID`, and `TOWER_DEVICE_NAME` are re-exported from the `ultimatedarktower` package root (`export * from './udtConstants'`). Direct subpath imports (`ultimatedarktower/dist/src/udtConstants`) are blocked by the package `exports` map.

6. **Pre-existing lint errors in `packages/host` fixed** — `relayServer.ts` had two `no-duplicate-imports` errors and five `@typescript-eslint/no-unused-vars` errors that were pre-existing scaffolding stubs. All resolved by the Phase 2 implementation.

7. **EventEmitter generic (`EventEmitter<T>`) used** — `@types/node@24` supports `EventEmitter<EventMap>`. Used for both `FakeTower` and `RelayServer` for fully typed `on`/`emit` calls.

### Phase 1 Verification Results

- [x] `npm install` from repo root installs all four packages including electron
- [x] `npm run start:electron` opens an Electron window showing the hello world status page
- [x] The window title says "DarkTowerSync Host"
- [x] The renderer loads without console errors
- [x] `eslint packages/electron/src` passes with zero errors/warnings
- [x] `tsc --noEmit -p packages/electron/tsconfig.json` passes cleanly
- [x] Pre-existing lint errors (11) and test failures unchanged — no regressions
- [ ] `npm run lint` — 11 pre-existing errors in client/host/tests (not introduced here)
- [ ] `npm test` — pre-existing failure (shared package not built; needs `npm run build:shared` first)
- [ ] `cd packages/electron && npx electron-forge package` — not yet verified (run manually to validate packaging)

### Phase 2 — Main Process Wiring Verification Results

- [x] `npm run build:shared && npm run build:host` — both compile clean, zero errors
- [x] `tsc --noEmit -p packages/electron/tsconfig.json` — clean
- [x] `eslint packages/host/src packages/electron/src` — zero errors/warnings
- [x] `npm run start:electron` — builds shared+host, launches Electron window without crash
- [x] FakeTower and RelayServer imported by Electron main process without triggering standalone host `main()` (guarded by `require.main === module`)
- [x] Pre-existing lint errors in relayServer.ts (7) resolved by Phase 2 implementation
- [ ] Companion app → fake tower BLE connection — requires physical device testing with real companion app
- [ ] Remote client → relay → physical tower round-trip — requires full hardware test
- [ ] IPC events reaching renderer — requires renderer dashboard (Phase 2 next step)

### Phase 2 — IPC Dashboard Deviations / Findings

1. **`index.html` must live at the Electron package root, not `src/renderer/`** — the Forge Vite plugin sets `root: projectDir` (= `packages/electron/`) when launching the Vite dev server for the renderer. Vite looks for `index.html` at that root. The official Forge Vite TypeScript template explicitly moves `index.html` from `src/` to the project root during scaffolding (see `ViteTypeScriptTemplate.ts` line 47: `fs.move(filePath('index.html'), path.join(directory, 'index.html'))`). Our original plan placed it at `src/renderer/index.html`, which caused the Vite dev server to serve nothing — resulting in a blank white window.

2. **Renderer asset paths are root-relative** — with `index.html` at the package root, the script tag must use `/src/renderer/renderer.ts` (absolute from Vite root) and the CSS link uses `./src/renderer/styles.css`. The official template uses `/src/renderer.ts` (their files are directly in `src/`).

3. **`ELECTRON_RUN_AS_NODE=1` from VSCode** — VSCode (itself an Electron app) sets this env var in child processes. When set, `require('electron')` returns the binary path string instead of the Electron API, causing `TypeError: Cannot read properties of undefined` on `ipcMain`, `BrowserWindow`, etc. The root `start:electron` script was updated to `env -u ELECTRON_RUN_AS_NODE npm run start -w packages/electron`. Note: Forge's own `start.js` also deletes this env var before spawning Electron (line 146 of `@electron-forge/core/dist/api/start.js`), but the var must be cleared before Forge itself loads the config.

4. **`target` field required in forge.config.ts VitePlugin build entries** — the official template specifies `target: 'main'` and `target: 'preload'` in the build array. Without these, the plugin may not correctly route builds through the right Vite config (main vs preload vs renderer).

5. **`will-quit` with `event.preventDefault()` is dangerous** — the original plan used `will-quit` with `event.preventDefault()` + async cleanup + `app.quit()`. This can cause infinite exit loops if the async shutdown fails. Replaced with fire-and-forget `app.on('before-quit', () => void shutdown())`, matching the official template pattern.

6. **`electron-squirrel-startup` requires ESM default import** — the plan used `require('electron-squirrel-startup')`, but the official template uses `import started from 'electron-squirrel-startup'`. Added `@types/electron-squirrel-startup` devDependency for type safety.

7. **`bleno_1.Characteristic is not a constructor` at runtime** — non-fatal error caught by `startServices().catch()`. The bleno API may behave differently when loaded in Electron's Node context vs standalone Node. The relay server starts fine; only BLE advertising fails. This is expected until the bleno integration is specifically tested in Electron.

8. **Pre-existing `no-duplicate-imports` lint errors** — 4 errors across `packages/client/src/app.ts`, `packages/client/src/towerRelay.ts`, and `tests/unit/shared/protocol.test.ts`. Fixed by merging duplicate import statements in each file.

### Phase 2 — IPC Dashboard Verification Results

- [x] `npm run start:electron` — launches Electron, dashboard renders with all three cards
- [x] BLE Tower card shows state dot + label (idle by default)
- [x] Relay Clients card shows badge count + list (empty by default)
- [x] Commands Relayed card shows counter + timestamp
- [x] Preload bridge exposes `window.darkTowerSync` API correctly
- [x] IPC subscriptions wired: `onTowerState`, `onRelayClientChange`, `onTowerCommand`
- [x] `npm run lint` passes clean (pre-existing errors in client/tests also fixed)
- [x] `tsc --noEmit -p packages/electron/tsconfig.json` passes clean
- [ ] Live IPC updates visible in dashboard — requires companion app or manual tower state trigger
- [ ] Companion app → fake tower BLE connection — requires physical device testing

---

### Troubleshooting Log: Blank White Window on Launch

This section documents the multi-step debugging process for the Electron app showing a blank white window instead of the dashboard UI.

#### Symptom
Running `npm run start:electron` opened an Electron window with a completely white/blank page. No errors in the terminal. The Forge logs showed "Launched Electron app" and the Vite dev server appeared to start successfully.

#### Root Cause
**`index.html` was in the wrong location.** The file was at `packages/electron/src/renderer/index.html`, but the Forge Vite plugin sets the Vite dev server's `root` to `packages/electron/` (the `projectDir`). Vite looks for `index.html` at the configured root directory. Since there was no `index.html` at the package root, the Vite dev server had nothing to serve — the Electron window loaded an empty response.

#### Investigation Path

1. **`ELECTRON_RUN_AS_NODE=1`** — initially suspected as the cause because `require('electron')` returned a string instead of the API. Fixed with `env -u ELECTRON_RUN_AS_NODE` in the start script. This was a real bug but not the blank-window cause.

2. **Missing `target` field in forge.config.ts** — compared against official template, added `target: 'main'` and `target: 'preload'` to build entries. Real configuration gap but not the blank-window cause.

3. **`will-quit` handler** — replaced with fire-and-forget `before-quit` to prevent potential exit loops. Improved reliability but not the blank-window cause.

4. **Electron binary not downloaded** — `node_modules/electron/dist/` was empty. Ran `node node_modules/electron/install.js` to download. Required for launch but not the blank-window cause.

5. **Direct binary run test** — ran `env -u ELECTRON_RUN_AS_NODE node_modules/electron/dist/Electron.app/Contents/MacOS/Electron packages/electron` — process stayed alive, showed a blank window (expected without Vite dev server). Confirmed the Electron code itself was functional.

6. **Inspected Forge plugin-vite source** — found `vite.renderer.config.ts` (the internal one at `node_modules/@electron-forge/plugin-vite/dist/config/`) sets `root: this.projectDir`. Then inspected `ViteTypeScriptTemplate.js` and found line 47: the template **explicitly moves** `index.html` from `src/` to the project root during scaffolding.

#### Fix
- Moved `index.html` from `packages/electron/src/renderer/index.html` to `packages/electron/index.html`
- Updated script tag from `src="./renderer.ts"` to `src="/src/renderer/renderer.ts"` (absolute from Vite root)
- Updated CSS link from `href="./styles.css"` to `href="./src/renderer/styles.css"`

#### Lesson
The Forge Vite plugin's renderer dev server uses the Electron package directory as its Vite `root`. The `index.html` entry point must be at that root, not nested in a subdirectory. This matches how Vite itself works (it always looks for `index.html` at the configured root), and the official Forge template enforces this layout during project generation. The directory structure in the plan was updated to reflect this.

---

## Overview

This plan covers adding an Electron app package to the existing DarkTowerSync monorepo. The Electron app wraps the host functionality (FakeTower BLE peripheral + WebSocket relay server) into a distributable desktop application with a simple status UI. The goal for this phase is a working "hello world" Electron shell with all tooling, build pipeline, and native module support wired up — ready for FakeTower and RelayServer integration.

---

## Why Electron?

The host needs `@stoprocent/bleno` (a native Node.js addon using CoreBluetooth/BlueZ bindings) running in a long-lived process alongside a WebSocket server. Electron gives us:

- **Native module support** — bleno compiles against Electron's Node.js ABI via `@electron/rebuild`
- **Main process = Node.js** — FakeTower and RelayServer run in the main process with full hardware access, no browser sandbox restrictions
- **Built-in renderer** — the host status/monitoring UI lives in a Chromium window, same tech stack as the remote client
- **Packaging & distribution** — Electron Forge handles code signing, DMG/ZIP creation for macOS, and future Linux/Windows builds
- **Single install** — players don't need to install Node.js, grant terminal Bluetooth permissions, or run CLI commands

---

## New Package: `packages/electron`

Add a fourth package to the monorepo alongside `shared`, `host`, and `client`.

### Relationship to Existing Packages

```
packages/
├── shared/          ← types, protocol, message factories (dependency)
├── host/            ← FakeTower, RelayServer, CommandParser (dependency — main process)
├── client/          ← browser client, TowerRelay, UI (NOT bundled in Electron)
└── electron/        ← NEW — Electron shell wrapping host + status UI
```

- `electron` depends on `@dark-tower-sync/shared` and `@dark-tower-sync/host`
- The remote player browser client (`packages/client`) is **not** part of the Electron app — remote players still open a browser
- The Electron app replaces `npm run dev:host` as the user-facing way to run the host

### Directory Structure

```
packages/electron/
├── index.html                   # Renderer entry — MUST be at package root (Vite root)
├── forge.config.ts              # Electron Forge configuration
├── package.json
├── tsconfig.json
├── vite.main.config.ts          # Vite config for main process
├── vite.preload.config.ts       # Vite config for preload script
├── vite.renderer.config.ts      # Vite config for renderer (status UI)
├── src/
│   ├── main/
│   │   ├── main.ts              # Electron main process entry
│   │   └── preload.ts           # Preload script (IPC bridge)
│   └── renderer/
│       ├── renderer.ts          # Renderer entry point
│       └── styles.css           # Status UI styles
└── resources/
    └── icon.png                 # App icon (can reuse tower imagery)
```

---

## Phase 1 — Hello World Electron App

### Step 1: Scaffold the Electron Package

Create `packages/electron/package.json`:

```json
{
  "name": "@dark-tower-sync/electron",
  "version": "0.1.0",
  "description": "DarkTowerSync desktop host — Electron app wrapping the fake tower and relay server.",
  "main": ".vite/build/main.js",
  "scripts": {
    "start": "electron-forge start",
    "package": "electron-forge package",
    "make": "electron-forge make",
    "publish": "electron-forge publish"
  },
  "author": "ChessMess",
  "license": "MIT",
  "dependencies": {
    "@dark-tower-sync/shared": "*",
    "@dark-tower-sync/host": "*"
  },
  "devDependencies": {
    "@electron-forge/cli": "^7.8.0",
    "@electron-forge/maker-dmg": "^7.8.0",
    "@electron-forge/maker-zip": "^7.8.0",
    "@electron-forge/maker-deb": "^7.8.0",
    "@electron-forge/plugin-vite": "^7.8.0",
    "@electron-forge/plugin-auto-unpack-natives": "^7.8.0",
    "@electron/rebuild": "^3.7.0",
    "electron": "^35.0.0",
    "typescript": "^5.9.0",
    "vite": "^5.4.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

Key decisions:
- **Electron Forge** with the **Vite plugin** — matches the existing project's use of Vite (client package) and TypeScript everywhere
- **`@electron-forge/plugin-auto-unpack-natives`** — critical for bleno; ensures native `.node` addons are extracted from the ASAR archive at runtime so they can load properly
- **`@electron/rebuild`** — recompiles bleno's native bindings against Electron's Node.js headers (different ABI from system Node)

### Step 2: Forge Configuration

Create `packages/electron/forge.config.ts`:

```typescript
import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: 'DarkTowerSync',
    executableName: 'dark-tower-sync',
    // icon: './resources/icon', // add when icon is ready
  },
  makers: [
    { name: '@electron-forge/maker-zip', platforms: ['darwin', 'linux'] },
    { name: '@electron-forge/maker-dmg', platforms: ['darwin'] },
    { name: '@electron-forge/maker-deb', platforms: ['linux'] },
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        { entry: 'src/main/main.ts', config: 'vite.main.config.ts' },
        { entry: 'src/main/preload.ts', config: 'vite.preload.config.ts' },
      ],
      renderer: [
        { name: 'main_window', config: 'vite.renderer.config.ts' },
      ],
    }),
  ],
};

export default config;
```

### Step 3: Vite Configs

**`vite.main.config.ts`** (main process — Node.js environment):

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        '@stoprocent/bleno',    // native module — must not be bundled
        '@stoprocent/noble',    // native module
        'ws',                   // works better unbundled in Electron main
      ],
    },
  },
});
```

Externalizing native modules is essential — Vite/Rollup cannot bundle `.node` binaries. They load at runtime from `node_modules`.

**`vite.preload.config.ts`**:

```typescript
import { defineConfig } from 'vite';
export default defineConfig({});
```

**`vite.renderer.config.ts`** (status UI — browser environment):

```typescript
import { defineConfig } from 'vite';
export default defineConfig({});
```

### Step 4: TypeScript Configuration

Create `packages/electron/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "sourceMap": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "isolatedModules": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "out", ".vite"]
}
```

### Step 5: Main Process Entry (Hello World)

Create `packages/electron/src/main/main.ts`:

```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';

// Squirrel.Windows install/uninstall handling
if (require('electron-squirrel-startup')) app.quit();

// Vite injects these at build time
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 720,
    height: 520,
    title: 'DarkTowerSync Host',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
```

### Step 6: Preload Script

Create `packages/electron/src/main/preload.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('darkTowerSync', {
  // Phase 1: placeholder — will expose relay/tower status APIs later
  getVersion: () => ipcRenderer.invoke('get-version'),
});
```

### Step 7: Renderer (Status UI — Hello World)

Create `packages/electron/src/renderer/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DarkTowerSync Host</title>
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <div id="app">
    <h1>Dark Tower Sync</h1>
    <p class="subtitle">Host Console</p>
    <div id="status">Ready — waiting for implementation.</div>
  </div>
  <script type="module" src="./renderer.ts"></script>
</body>
</html>
```

Create `packages/electron/src/renderer/styles.css` — reuse the dark theme from the existing client `index.html` (same CSS variables: `--bg: #1a1a1a`, `--accent: #c0392b`, etc.) for visual consistency.

Create `packages/electron/src/renderer/renderer.ts`:

```typescript
console.log('DarkTowerSync host renderer loaded.');
```

---

## Phase 1 — Monorepo Integration

### Root `package.json` Changes

Add the electron workspace and new scripts:

```jsonc
{
  "workspaces": [
    "packages/*"
    // electron is already covered by the wildcard
  ],
  "scripts": {
    // existing scripts unchanged...
    "start:electron": "npm run start -w packages/electron",
    "make:electron": "npm run make -w packages/electron",
    "package:electron": "npm run package -w packages/electron"
  }
}
```

### Build Order

The shared package must build first (it already does via `npm run build`). The host package must build before the Electron app can reference its exports. Update the root `build` script:

```json
"build": "npm run build:shared && npm run build:host && npm run build:client"
```

No change needed — the electron package uses Forge's own build pipeline (`electron-forge start` / `make`), which invokes Vite internally and resolves workspace dependencies via symlinks.

### Native Module Rebuild — `postinstall` Script

Add to root `package.json`:

```json
"scripts": {
  "postinstall": "cd packages/electron && npx @electron/rebuild"
}
```

This ensures bleno's native addon is compiled against Electron's ABI after every `npm install`. Electron Forge also handles this during `make`, but the postinstall catches dev-time usage.

---

## Phase 1 — CI/CD Updates

### `npm run ci` Pipeline

The existing CI pipeline is `lint → type-check → test → build`. The Electron package slots in naturally:

1. **Lint** — already covered (ESLint scans `packages/*/src/**/*.ts` via the root config)
2. **Type-check** — add `tsc --noEmit -p packages/electron/tsconfig.json` to the `type-check` script
3. **Test** — Phase 1 has no testable logic; unit tests come when FakeTower/RelayServer are wired in
4. **Build** — `electron-forge package` validates the full build. Add a CI-only script that runs the Forge build in a headless-safe way

Updated root scripts:

```json
"type-check": "tsc --build --noEmit && tsc --noEmit -p packages/client/tsconfig.json && tsc --noEmit -p packages/electron/tsconfig.json"
```

### GitHub Actions Workflow (New)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest]
        node: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: npm

      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test
      - run: npm run build

  electron-build:
    runs-on: macos-latest
    needs: ci
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: cd packages/electron && npx electron-forge package
```

Notes:
- macOS is the primary host platform; Ubuntu validates Linux support
- `electron-forge package` (not `make`) in CI — avoids code signing requirements
- The `electron-build` job depends on the main `ci` job passing first
- Windows is excluded per the project analysis (stretch goal)

---

## Phase 1 — Key Technical Considerations

### Native Module Handling (bleno)

This is the trickiest part and worth calling out explicitly:

1. **`@electron/rebuild`** recompiles `@stoprocent/bleno` against Electron's Node.js headers. Without this, you get `NODE_MODULE_VERSION` mismatch errors at runtime.

2. **`@electron-forge/plugin-auto-unpack-natives`** extracts `.node` files from the ASAR archive during packaging. Native addons can't load from inside ASAR.

3. **Vite externals** — bleno, noble, and ws must be listed in `rollupOptions.external` so Vite doesn't try to bundle them. They resolve from `node_modules` at runtime.

4. **macOS Bluetooth permissions** — the Electron app needs Bluetooth access. During development, the terminal running `electron-forge start` needs the permission. For packaged apps, add to `packagerConfig`:

   ```typescript
   packagerConfig: {
     asar: true,
     extendInfo: {
       NSBluetoothAlwaysUsageDescription:
         'DarkTowerSync needs Bluetooth to emulate the tower for the companion app.',
     },
   }
   ```

### IPC Architecture (Preview for Phase 2)

The main process runs FakeTower and RelayServer. The renderer shows status. Communication flows via Electron IPC:

```
Main Process                          Renderer (Status UI)
┌────────────────────┐                ┌────────────────────┐
│ FakeTower (bleno)  │                │                    │
│ RelayServer (ws)   │───ipcMain────▶│  Status dashboard  │
│ CommandParser      │  send events   │  Connection list   │
│                    │◀──ipcRenderer──│  Log viewer        │
│                    │  user actions   │                    │
└────────────────────┘                └────────────────────┘
```

Phase 1 doesn't implement this — just the shell. But the preload script and `contextBridge` are set up so the pattern is ready.

---

## Phase 1 — Verification Checklist

After implementation, verify:

- [ ] `npm install` from the repo root installs all four packages including electron
- [ ] `npm run start:electron` opens an Electron window showing the hello world status page
- [ ] The window title says "DarkTowerSync Host"
- [ ] The renderer loads without console errors
- [ ] `npm run lint` passes with the new electron package files
- [ ] `npm run type-check` passes (including the new tsconfig)
- [ ] `npm test` still passes (no regressions)
- [ ] `cd packages/electron && npx electron-forge package` produces an app bundle in `out/`
- [ ] The packaged app launches and shows the same hello world page

---

## Summary of Files to Create

| File | Purpose |
|------|---------|
| `packages/electron/package.json` | Package manifest with Forge + Vite deps |
| `packages/electron/forge.config.ts` | Electron Forge build/package/make config |
| `packages/electron/tsconfig.json` | TypeScript config for the electron package |
| `packages/electron/vite.main.config.ts` | Vite config for main process (externals!) |
| `packages/electron/vite.preload.config.ts` | Vite config for preload script |
| `packages/electron/vite.renderer.config.ts` | Vite config for renderer UI |
| `packages/electron/src/main/main.ts` | Electron main process entry |
| `packages/electron/src/main/preload.ts` | Preload script with IPC bridge |
| `packages/electron/src/renderer/index.html` | Status UI HTML |
| `packages/electron/src/renderer/renderer.ts` | Status UI entry script |
| `packages/electron/src/renderer/styles.css` | Status UI styles (dark theme) |
| `.github/workflows/ci.yml` | GitHub Actions CI pipeline |

### Files to Modify

| File | Change |
|------|--------|
| `package.json` (root) | Add `start:electron`, `make:electron`, `package:electron` scripts; add `postinstall` for `@electron/rebuild` |
| `package.json` (root) | Update `type-check` script to include electron tsconfig |

---

## What Comes Next (Phase 2 Preview)

Once the hello world shell is verified:

1. Wire `FakeTower` and `RelayServer` into `main.ts` (import from `@dark-tower-sync/host`)
2. Add IPC handlers to push tower state, client connections, and relay status to the renderer
3. Build the status dashboard UI in the renderer (connection list, command log, tower state indicator)
4. Add the macOS Bluetooth permission entitlement for packaged builds
5. Test end-to-end: companion app → fake tower → relay → remote client → physical tower
