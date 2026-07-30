# apps/relay-cli (`ultimatedarktowerrelay-cli`) — relay CLI (**published**)

The relay composition root — wires a selected `TowerSource` into a `RelayServer`. This is
where `relay-core` + `relay-client` + `relay-shared` are exercised together at runtime.
Central docs: `docs/relay/` (repo root).

## It publishes to npm — `npx ultimatedarktowerrelay-cli` is the user-facing entry point

This is the **second** app with `private: false` (after `apps/mcp-server`), because `npx` is
how a player is meant to run the relay: no clone, no `pnpm install`, no build. It works
because `@stoprocent/bleno` + `@stoprocent/noble` ship N-API `prebuilds/` (win32-x64/ia32,
darwin-x64+arm64, linux-x64/arm/arm64) resolved by `node-gyp-build` — **no compiler needed**,
except on Windows-on-ARM, which has no prebuild.

Consequences to keep in mind when editing this package:

- **Two `bin` entries**, one matching the package name exactly. npx's "single bin" fallback is
  where `could not determine executable to run` comes from — don't collapse them to one.
- **`src/index.ts` starts with a shebang.** tsc preserves it into `dist/index.js`; don't let a
  formatter or a header rewrite drop it.
- **`sourceMap`/`declarationMap` are off** in `tsconfig.json` on purpose — `files` ships `dist`
  but not `src`, so maps would point at files that aren't in the tarball.
- **No `prepack`/`prepublishOnly`.** `changeset publish` runs them, and the monorepo strips
  devDeps at that point (the trap documented in the root CLAUDE.md for `apps/mcp-server`).
- **Adding it to npm was a token change too** — the granular `NPM_TOKEN` is a fixed package
  allow-list; see the root CLAUDE.md's release section.

## This package is ESM — the one exception among its CJS siblings

`package.json` sets `"type": "module"`. Every other package extending `tsconfig.node-lib.json`
(`relay-core`, `relay-shared`, `relay-client`, `packages/core`, `packages/game-data`) is CJS —
this one flipped because the live status board (`src/dashboard.tsx`) is built on
[Ink](https://github.com/vadimdemedes/ink), which is ESM-only as of v7. `module: Node16` in
`tsconfig.json` follows the package's own `"type"` field, so it now emits real ESM (verified: the
same pattern `apps/mcp-server` already uses). The shebang still survives into `dist/index.js`
unchanged. `relay-core`/`relay-shared`/`relay-client` stay CJS — ESM-importing a CJS dep works
here because their barrels use named `Object.defineProperty` re-exports (not `__exportStar`),
which `cjs-module-lexer` can see; see `browser-apps-named-import-udt-class` / the display-package
ESM history for the pattern that does break.

**TypeScript gotcha found in the wild:** narrowing `source: TowerSource` via `instanceof
TowerEmulator` (to reach `TowerEmulator`-only members like `getBleAdapterState()`) _before_ other
plain `TowerSource`-typed `.on()` calls corrupts overload resolution for the rest of the
function — every later `source.on(...)` call fails with a nonsensical "argument of type X is not
assignable to the last overload" error, because `TowerEmulator`'s `.on()` comes from a generic
`EventEmitter<TowerEmulatorEventMap>`, a different overload shape than the plain interface
`TowerSource.on()`. Keep any `instanceof TowerEmulator` narrowing block **last**, after every
plain-`TowerSource`-typed usage of `source` — this file's `ghost-connection` +
`ble-adapter-state` wiring live in one combined block at the very end of `main()` for exactly
this reason. Don't split it back out and move it earlier.

## The Ink dashboard (`src/dashboard.tsx` + `src/format.ts`)

A live status board (relay URLs incl. LAN address, tower/BLE state, decoded drum/LED/audio
state, connected clients, an activity feed) replaces the old six print-and-go-silent lines.
`index.ts` owns one mutable `RelayStatus` object and mutates it from the event handlers it
already has (including two that existed but were never subscribed to before: `relay.on(
'client-change', ...)` and `TowerEmulator`'s `'ble-adapter-state'`); the component itself
doesn't subscribe to anything, it just re-renders on a 250 ms tick and reads the object
directly. Pure formatting helpers (`format.ts`) are deliberately free of any `ink`/`react`
import so they unit-test without pulling in ink's yoga-layout wasm.

- **`RELAY_DASHBOARD=0`** — force the plain console-line fallback even on a TTY.
- The board only mounts when **both** `stdout` and `stdin` are TTYs — `useInput`/`setRawMode`
  throw outright otherwise (Docker `-d`, systemd, a piped `| tee`). Piped/headless users get
  today's exact plain-line output, untouched.
- `relay-core` writes ~30 unstructured `console.log`/`warn`/`error` calls directly (TowerEmulator,
  RealTower, RelayServer, ConnectionManager, ObserverDisplay). With the board mounted, `index.ts`
  monkey-patches `console.*` to route those into the same activity feed (and still into the
  JSONL log via `logger.logEvent`) instead of letting ink's own `patchConsole` print them above
  the live frame — that default would make a full-screen board crawl down the terminal. This
  patch is applied (and restored) only on the TTY path; the non-dashboard path never touches
  `console`.
- **Ctrl-C is handled explicitly, not via ink's default.** `exitOnCtrlC` is `false`; the
  dashboard's own `useInput` treats `key.ctrl && input === 'c'` exactly like `q`. Needed because
  raw mode swallows the actual SIGINT — once the board is mounted, `process.on('SIGINT', ...)`
  will not fire from a terminal Ctrl-C (it still does from an external `kill`/`docker stop`).
- Mounting order matters on quit: `startDashboard`'s `quit` action wraps the caller-supplied one
  to call `instance.unmount()` **first**, then the real `shutdown()`. Ink hides the cursor and
  holds stdin in raw mode; exiting without unmounting first leaks both into the user's shell.

## Runtime env vars

- **`TOWER_SOURCE`** — `emulator` | `mock` | `real` | `bridge` (picks the `TowerSource` impl).
- **`RELAY_PORT`** — WebSocket port (default `8765`).
- **`TOWER_DIS_*`** — Device Information Service overrides (e.g. `TOWER_DIS_FIRMWARE_REVISION`).
- **`LOGGING=0`** — disable JSONL file logging.
- **`RELAY_LOG_DIR`** — log directory (default `./logs`, **cwd-relative** — under `npx` that's
  wherever the user ran the command, not the package dir).
- **`RELAY_DASHBOARD=0`** — disable the live Ink status board; see above.

Extra entrypoints beyond `start`: `replay` (`node dist/replayEvents.js`) and `analyze`
(`node dist/analyzeLogs.js`).

## CI build gotcha

The `relay-native` CI job builds via `pnpm --filter "./packages/relay-*..." --filter
"./apps/relay-cli..."` — but the `...` path-glob selector does **not** expand to workspace
deps of deps, so the job must **also** `--filter` in `ultimatedarktower` and
`ultimatedarktowerdata` by name, or the build fails with "Cannot find module 'ultimatedarktower'".

`test` = `vitest run --passWithNoTests`, currently exercising `src/format.test.ts` (the pure
dashboard helpers only — nothing ink/react-rendering is under test). Depends on all three relay
packages + `ultimatedarktower` (`workspace:^`) + `ws` + `ink`/`react`.
