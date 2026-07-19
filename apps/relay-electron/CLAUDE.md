# apps/relay-electron (`ultimatedarktowerrelay-electron`) — Electron relay GUI (private)

A GUI wrapper over `relay-core` (electron-forge + Vite; vanilla renderer, no framework).
Central docs: `docs/relay/` (repo root).

## Packaging footgun (silent runtime break)

pnpm hoists to the workspace-root `node_modules`, but Forge only packages the app's own
`node_modules`. So `forge.config.ts`'s `packageAfterCopy` hook (`copyWithTransitiveDeps`)
manually copies a **`runtimeExternals`** list (`@stoprocent/bleno`, `@stoprocent/noble`,
`ultimatedarktower`, `ws`, `electron-squirrel-startup`) + transitive deps from the workspace
root into the build. **This list MUST stay in sync with the `external` array in
`vite.main.config.ts`.** Add a runtime-external dep to one and not the other and packaging
silently ships a broken app — a missing native module **at runtime**, not a build error.

## Native rebuild

Rebuild native modules with `pnpm --filter ultimatedarktowerrelay-electron rebuild`
(`electron-rebuild -f -w @stoprocent/bleno,@stoprocent/noble`). `pnpm run ci` does **not**
cover this (no `build` script). `tar`/`tmp` are transitive build-time-only deps of the
electron toolchain — see the root CLAUDE.md and `pnpm-workspace.yaml` overrides.

## macOS packaging

`forge.config.ts` sets `NSBluetoothAlwaysUsageDescription` (macOS Bluetooth entitlement) and
builds a `.dmg` (macOS) + `zip` (darwin/linux) + `deb` (linux) — no Windows maker configured.

Scripts: `start`/`package`/`make`/`publish` (electron-forge), `typecheck`, `rebuild`,
`test` (`vitest run --passWithNoTests`, 0 test files). Depends on `relay-core`,
`relay-shared`, and `ultimatedarktower` (`workspace:^`) — not `relay-client` or `relay-cli`.
