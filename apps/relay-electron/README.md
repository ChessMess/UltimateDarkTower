# Relay Console

Electron desktop operator console for the relay core — pick a tower source (emulator, mock, or a
real tower over BLE), see live status, and drive manual controls, without a terminal.

## What it does

Wraps `ultimatedarktowerrelay-core` in a GUI: source select, connection status, a WebSocket relay
you can point consumers at, and manual command controls for testing without a companion app.

## Run locally

```bash
pnpm install
pnpm --filter ultimatedarktowerrelay-electron dev
```

BLE natives (`@stoprocent/bleno`, `@stoprocent/noble`) are prebuilt for Electron's Node ABI. If you
add/upgrade a native dep, rebuild for Electron with:

```bash
pnpm --filter ultimatedarktowerrelay-electron rebuild
```

### Package / distribute

```bash
pnpm --filter ultimatedarktowerrelay-electron package   # unpacked app
pnpm --filter ultimatedarktowerrelay-electron make       # platform installers (dmg/deb/zip)
```

## Files

- `src/main/main.ts` — main process: window lifecycle, tower source wiring, IPC handlers.
- `src/main/preload.ts` — context-isolated bridge exposing IPC to the renderer.
- `src/renderer/renderer.ts` / `src/renderer/styles.css` — the operator console UI.
- `forge.config.ts` — Electron Forge build/package/make configuration.

## See also

- [docs/relay/](../../docs/relay/) — start with [SETUP.md](../../docs/relay/SETUP.md) for
  per-platform setup and the `TOWER_SOURCE` modes.
- [docs/relay/MACOS_BLE_PERIPHERAL_LIMITATION.md](../../docs/relay/MACOS_BLE_PERIPHERAL_LIMITATION.md)
  — why macOS stalls on "checking firmware" and how to get past it.
- [apps/relay-cli/](../relay-cli/) — the headless equivalent of this console.
