# apps/relay-electron (`ultimatedarktowerrelay-electron`) — Electron relay GUI (private)

A GUI wrapper over `relay-core` (electron-forge + Vite; vanilla renderer, no framework).
Central docs: `docs/relay/` (repo root).

## Packaging footgun (silent runtime break)

Forge only packages the app's own `node_modules`, which under pnpm are symlinks (registry deps
hoisted to the workspace root; workspace packages like `ultimatedarktower` linked only under
`apps/relay-electron/node_modules`). So `forge.config.ts`'s `packageAfterCopy` hook
(`copyWithTransitiveDeps`) copies a **`runtimeExternals`** list (`@stoprocent/bleno`,
`@stoprocent/noble`, `ultimatedarktower`, `ws`, `electron-squirrel-startup`) + transitive deps
into the build, resolving each Node-style (walk up from the app dir, then from each package's
real path). A non-optional dep it can't resolve **fails the build**. **This list MUST stay in
sync with the `external` array in `vite.main.config.ts`** — a dep in `external` but missing
here ships an app that crashes **at launch**, and CI's `electron-forge package` smoke never
launches the app, so it won't catch that. (Until 2026-10 the hook only searched the root
`node_modules`, silently skipped `ultimatedarktower`, and every packaged build crashed with
`Cannot find module 'ultimatedarktower'`.) To verify a package for real, launch it:
`ELECTRON_ENABLE_LOGGING=1 out/DarkTowerRelay-darwin-arm64/DarkTowerRelay.app/Contents/MacOS/dark-tower-relay`
and look for `[main] Core modules loaded successfully`.

Forge 8 emits the main/preload bundles as **`.cjs`**: `package.json` `main` is
`.vite/build/main.cjs` and `main.ts` loads `preload.cjs` — keep both in sync if renamed.

## Native rebuild

Rebuild native modules with `pnpm --filter ultimatedarktowerrelay-electron rebuild:native`
(`electron-rebuild -f -w @stoprocent/bleno,@stoprocent/noble`). The `:native` suffix is
load-bearing — `rebuild` alone is a **pnpm builtin**, so `pnpm --filter … rebuild` runs
pnpm's own command and never reaches this script (see the root `pnpm-workspace.yaml`).
This is **not** part of
`build` — `build` is deliberately `tsc --noEmit` only (typecheck-only, matching
`typecheck`), so this app participates in the root `pnpm -r build` fan-out without every
CI run packaging a full Electron app with native BLE deps. Real packaging/native rebuild
stays manual or lives in the separate `relay-native` CI job. `tar`/`tmp` are transitive
build-time-only deps of the electron toolchain — see the root CLAUDE.md and
`pnpm-workspace.yaml` overrides.

## macOS packaging

`forge.config.ts` sets `NSBluetoothAlwaysUsageDescription` (macOS Bluetooth entitlement) and
builds a `zip` (darwin/linux) + `deb` (linux) via makers, plus a plain `.dmg` (macOS) built by a
`postMake` hook with the system `hdiutil` (app + `/Applications` symlink) — no Windows maker.
Don't re-add `@electron-forge/maker-dmg`: its `appdmg` → `image-size@0.7.5` chain carries an
unpatchable Dependabot advisory.

Scripts: `dev`/`package`/`make`/`release` (electron-forge 8 — `release` was `publish` in forge 7; `dev` runs `electron-forge start`
— renamed from `start` to match every other app's dev-loop convention), `typecheck`,
`rebuild`, `test` (`vitest run --passWithNoTests`, 0 test files). Depends on `relay-core`,
`relay-shared`, and `ultimatedarktower` (`workspace:^`) — not `relay-client` or `relay-cli`.
