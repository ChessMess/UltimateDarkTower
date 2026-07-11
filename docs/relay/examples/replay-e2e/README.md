# `replay-e2e` — manual E2E for FR-5.2 `PhysicalTowerReplay`

A throwaway harness for validating the physical-tower-replay consumer against a **real tower** over
Web Bluetooth. Not shipped code — it's the exact wiring documented in
[../../docs/API.md](../../docs/API.md) and [../../docs/GETTING_STARTED.md](../../docs/GETTING_STARTED.md):
`RelayClient` (transport) + `PhysicalTowerReplay` (mirror writes) + UDT's `UltimateDarkTower`
(Web Bluetooth). First validated live on 2026-06-17 (drums physically mirrored relayed rotations).

## Files
- `host.cjs` — a `RelayServer` that broadcasts a cycle of **genuine** 20-byte rotation commands
  (all drums N→E→S→W) every 2.5s, each built with the library's own `rtdt_pack_state` (no guessed
  bytes). The "master" stand-in.
- `app.ts` — the browser harness entry. Bundled to `app.js` (git-ignored build artifact).
- `index.html` — minimal UI (Connect to Host / Connect to Tower + a log).
- `module-shim.js` — browser stub for Node's `module` builtin (UDT's ESM build calls
  `createRequire` only on the Node-adapter path, never taken in the browser).
- `noble-probe.cjs` — a Node BLE diagnostic: connects to the tower via UDT's Node adapter
  and logs every notification with a timestamp. Used to confirm the tower streams ~1–2
  notifications/sec (`node examples/replay-e2e/noble-probe.cjs`, tower on + not held by
  another central).

## Run
```sh
# 1. host relay (from repo root) — needs the workspace packages built (npm run build)
node examples/replay-e2e/host.cjs

# 2. bundle the browser app (uses the sibling Sync repo's esbuild; any esbuild works)
../UltimateDarkTowerSync/node_modules/.bin/esbuild examples/replay-e2e/app.ts \
  --bundle --format=iife --platform=browser \
  --alias:module="$PWD/examples/replay-e2e/module-shim.js" \
  --external:@stoprocent/noble --external:@stoprocent/bleno \
  --outfile=examples/replay-e2e/app.js

# 3. serve over http://localhost (a secure context for Web Bluetooth)
python3 -m http.server 8080 --directory examples/replay-e2e
```
Open **http://localhost:8080/index.html in real Chrome/Edge** (not VSCode's embedded browser — it
can't show the Bluetooth device chooser). Click **Connect to Host**, then **Connect to Tower**, pick
`ReturnToDarkTower`.

## What success looks like
- No `🗼 Replayed …` lines until `tower calibrated ✓` (the tower-ready gate).
- A no-seq `🗼 Replayed command on tower` right after calibration (`replayLast()` self-heal).
- Each `◀ relayed command (seq N)` paired 1:1 with `🗼 Replayed command on tower (seq N)`, and the
  tower's drums rotating. Power the tower off/on + reconnect to re-exercise self-heal.
