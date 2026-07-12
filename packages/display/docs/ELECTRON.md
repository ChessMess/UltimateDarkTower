# Using UltimateDarkTowerDisplay in Electron

_Docs: [Index](README.md) > Electron integrator > Electron_

**Before reading:** [GETTING_STARTED](GETTING_STARTED.md) covers install and the first render. [TROUBLESHOOTING §electron-specific](TROUBLESHOOTING.md#electron-specific) lists the predictable failure modes; this doc is the full walkthrough.

## TL;DR

This package runs in Electron's **renderer process** unchanged — the renderer is Chromium, so WebGL, Web Audio, and the DOM are all available. It does **not** run in the main process; use the parent [`ultimatedarktower`](https://github.com/ChessMess/UltimateDarkTower) package there for state decoding and BLE communication.

---

## Recommended BrowserWindow setup

```ts
// main.ts
import { BrowserWindow } from 'electron';

const win = new BrowserWindow({
  webPreferences: {
    contextIsolation: true, // required for security
    nodeIntegration: false, // renderer behaves like a normal browser page
    sandbox: true, // additional isolation (optional but recommended)
  },
});
```

With `nodeIntegration: false`, the renderer behaves exactly like a Chrome tab. All DOM, WebGL, and Web Audio APIs are available as normal.

---

## Bundling the renderer

Use **vite**, **webpack**, or **esbuild** to bundle your renderer. The package externalises `three`, `gsap`, and `ultimatedarktower`, so install them as your own dependencies:

```sh
npm install three gsap ultimatedarktower ultimatedarktowerdisplay
```

The `ultimatedarktower` ESM build uses `createRequire`, which is not available in browser contexts. Mirror the alias used by this package's own build config:

```ts
// vite.config.ts (renderer)
import { resolve } from 'path';

export default {
  resolve: {
    alias: {
      ultimatedarktower: resolve(__dirname, 'node_modules/ultimatedarktower/dist/src/index.js'),
    },
  },
};
```

---

## Loading the tower model (`modelUrl`)

`TowerDisplay` with the `'3d-view'` renderer requires a `modelUrl` pointing at the bundled GLB. Three options, ranked by recommendation:

### 1. Bundler-emitted URL (recommended)

```ts
// renderer/index.ts — vite-style ?url import
import towerModelUrl from 'ultimatedarktowerdisplay/dist/3d/assets/tower.glb?url';

const display = new TowerDisplay({
  container: document.getElementById('tower')!,
  renderers: ['3d-view'],
  modelUrl: towerModelUrl,
});
```

The bundler copies the file and gives you a string URL that works in any context.

### 2. Custom `app://` protocol

Register a protocol handler in `main.ts` to serve files from disk:

```ts
// main.ts
import { protocol, app } from 'electron';
import { join } from 'path';
import { readFileSync } from 'fs';

app.whenReady().then(() => {
  protocol.registerBufferProtocol('app', (request, callback) => {
    const url = request.url.replace('app://', '');
    const filePath = join(__dirname, url);
    callback({ data: readFileSync(filePath), mimeType: 'model/gltf-binary' });
  });
});
```

Then pass `modelUrl: 'app://dist/3d/assets/tower.glb'`.

### 3. `file://` URL (prototyping only)

You can set `webSecurity: false` in `BrowserWindow.webPreferences` and pass a `file://` path, but this disables the renderer's security sandbox and should not be shipped in production.

---

## Content security policy

If your app sets a CSP header (recommended), inline `<style>` tags are blocked by `style-src 'self'`. By default this package injects styles into `document.head`. To opt out:

```ts
import { TowerDisplay, TOWER_DISPLAY_CSS } from 'ultimatedarktowerdisplay';

// Option A — inject TOWER_DISPLAY_CSS yourself via a <link> tag to a real file,
// then create TowerDisplay with injection disabled:
const display = new TowerDisplay({
  container: document.getElementById('tower')!,
  injectStyles: false,
  // ...
});
```

To include the styles via your bundler instead of a runtime injection:

```ts
// Write the string to a .css file at build time, or import it as a CSS module
// if your bundler supports it.  Example (vite with ?inline):
import css from 'ultimatedarktowerdisplay/dist/index.esm.js?inline'; // not a real path
// Better: just copy TOWER_DISPLAY_CSS into your app's own stylesheet bundle.
```

The simplest approach is to copy `TOWER_DISPLAY_CSS` into a `.css` file in your renderer source tree and include it via a `<link rel="stylesheet">` tag in your HTML — then set `injectStyles: false`.

---

## Web Bluetooth (tower pairing)

BLE is handled entirely by the [`ultimatedarktower`](https://github.com/ChessMess/UltimateDarkTower) parent package. Web Bluetooth works in Electron's renderer, but you must register a device-selection handler in `main.ts`:

```ts
// main.ts
import { app, BrowserWindow } from 'electron';

app.on('web-contents-created', (_, contents) => {
  contents.session.on('select-bluetooth-device', (event, devices, callback) => {
    event.preventDefault();
    // Pick the first device named "Dark Tower" (or show a picker UI):
    const tower = devices.find((d) => d.deviceName.includes('Dark Tower'));
    if (tower) callback(tower.deviceId);
    else callback(''); // cancel
  });
});
```

On macOS, add the `NSBluetoothAlwaysUsageDescription` key to your app's `Info.plist` and enable the Bluetooth entitlement. On Linux, ensure `bluez` is installed and the user has Bluetooth permissions.

---

## What doesn't work in the main process

The main process is plain Node.js — no DOM, no WebGL, no Web Audio. Do not `import` this package in the main process; it will throw `document is not defined` immediately.

For state-only use in the main process (decoding BLE packets, tracking game state without rendering):

```ts
// main.ts — use the parent package directly
import { UltimateDarkTower } from 'ultimatedarktower';
```

If you want to do server-side state tracking while the renderer handles display, send decoded `TowerState` objects over IPC:

```ts
// main.ts — send state to renderer
win.webContents.send('tower-state', state);

// renderer/index.ts — receive and apply
const { ipcRenderer } = window.require('electron'); // with contextIsolation use contextBridge
ipcRenderer.on('tower-state', (_event, state) => display.applyState(state));
```

If you need the pure state-merge controller without any DOM (e.g. for main-process logic or testing), `TowerStateController` is safe to import anywhere:

```ts
import { TowerStateController } from 'ultimatedarktowerdisplay';
// No DOM dependency — works in Node, Electron main, or browser
const ctrl = new TowerStateController();
```

## See also

- [TROUBLESHOOTING §electron-specific](TROUBLESHOOTING.md#electron-specific) — short symptom-to-fix entries for Electron.
- [GETTING_STARTED §production-checklist](GETTING_STARTED.md#production-checklist) — general bundler considerations.
- [API §TowerDisplay](API.md#towerdisplay) — `injectStyles: false` and `TOWER_DISPLAY_CSS` reference.
