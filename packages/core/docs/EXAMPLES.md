# Examples

Three example apps ship with this library, each showing a different slice of what you can do with it. Use them as a reference for your own code or as a quick test harness when verifying library changes against real hardware.

| Example        | Runtime                 | Demonstrates                                                                                 | Source                                          |
| -------------- | ----------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Controller** | Browser (Web Bluetooth) | Full command surface, BLE diagnostics tab, tower emulator                                    | [examples/controller/](../examples/controller/) |
| **Game**       | Browser (Web Bluetooth) | A complete playable game (The Tower's Challenge) with scoring, glyph mechanics, and confetti | [examples/game/](../examples/game/)             |
| **Node CLI**   | Node.js                 | Minimal command-line driver for verifying the Node adapter                                   | [examples/node/](../examples/node/)             |

---

## Controller

A reference UI that exercises essentially every method on `UltimateDarkTower`. Use it as a manual test harness when verifying library changes, or as a copy-paste source when building your own UI.

**What it demonstrates:**

- Connecting, calibrating, and cleanly disconnecting via Web Bluetooth.
- Every command type: `playSound`, individual `setLED` calls, `allLightsOn`/`allLightsOff`, `Rotate`, `rotateDrumStateful`, `lightOverrides`, `breakSeal`, `resetTowerSkullCount`.
- Real-time battery monitoring with a battery-history chart.
- Glyph-position tracking after rotations.
- A **BLE Debug** tab built on top of the diagnostics recorder ([BLE_DIAGNOSTICS.md](BLE_DIAGNOSTICS.md)) — toggle the flight recorder on/off, watch the live event stream, browse the persistent IndexedDB incident log, export JSON.
- A **tower emulator** for when you don't have hardware on hand — drives the same UI without a real tower.

**Run locally:**

```bash
npm install
npm run dev:controller
```

Then open the printed URL in Chrome / Edge / Samsung Internet. Click **Connect**, pick "ReturnToDarkTower" from the chooser, and you're in.

**Live demo (no install required):**

[chessmess.github.io/UltimateDarkTower/dist/examples/controller/TowerController.html](https://chessmess.github.io/UltimateDarkTower/dist/examples/controller/TowerController.html)

> iOS users: open the live demo in the [Bluefy app](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055). Safari and Chrome on iOS don't expose Web Bluetooth.

**Local README:** [examples/controller/README.md](../examples/controller/README.md)

---

## Game — The Tower's Challenge

A complete browser game built on top of the library. You pick a glyph, the tower picks one, and the rotation outcome decides who wins each round. Includes scoring, difficulty modes, a seeded RNG for reproducible runs, and confetti on victory.

**What it demonstrates:**

- A real game loop on top of `UltimateDarkTower` — turn order, win conditions, persistent score across rounds.
- Reading drum positions back into game logic via `getCurrentDrumPosition`.
- Using the seed parser ([SEED_FORMAT.md](SEED_FORMAT.md)) for reproducible game state.
- Glyph-position tracking informing UI state.
- A self-contained example of pairing tower control with arbitrary application logic.

**Run locally:**

```bash
npm install
npm run dev:examples
```

Then open the Game HTML at the printed URL (`TowerGame.html`).

**Local README:** [examples/game/README.md](../examples/game/README.md)

---

## Node CLI

A minimal interactive command-line app for verifying the Node.js Bluetooth adapter. The smallest possible "does it work?" test for the library on Node.

**What it demonstrates:**

- Auto-detected Node.js adapter using `@stoprocent/noble`.
- The lifecycle: scan → connect → calibrate → command → disconnect.
- A simple inactivity timeout to preserve tower battery (auto-disconnects after 10 minutes idle).
- Minimal boilerplate — under 200 lines, easy to read end to end.

**Run locally:**

```bash
npm install @stoprocent/noble --save-dev
npm run example:node
```

> Use `--save-dev` (or `--save`); a plain `npm install @stoprocent/noble` may not persist because it's listed as an optional peer dependency.

Make sure the tower is powered on and in range, then follow the menu prompts.

**Local README:** [examples/node/README.md](../examples/node/README.md)

---

## Building all examples for distribution

The examples are bundled as static assets to `dist/examples/` for the live demo on GitHub Pages:

```bash
npm run build:examples
```

This runs `build-examples.js`, which uses esbuild to produce IIFE bundles for each example and copies HTML + asset files alongside them.

---

## See also

- [GETTING_STARTED.md](GETTING_STARTED.md) — write your first program from scratch instead of starting from an example.
- [api/README.md](api/README.md) — the full API reference these examples are exercising.
- [ECOSYSTEM.md](ECOSYSTEM.md) — companion projects (rendering, sync, MCP server) that pair with these examples.
