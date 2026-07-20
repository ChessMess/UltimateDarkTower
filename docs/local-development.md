# Local Development

How to run each app and library demo locally while working on the monorepo.
Every command is run from the **repo root** via pnpm `--filter`, so you never
have to `cd` into a package.

## One-time setup

```bash
pnpm install        # links the workspace + runs the topological build
```

`pnpm install` builds every library's `dist/` once. This matters: the apps
consume the libraries through workspace symlinks that resolve to **built
output** (`dist/`), not source. If you ever skip the install-time build, run
`pnpm --filter "./packages/*" build` before starting any app.

## Apps (browser — Vite dev servers)

| App                                          | Command                                         | URL                                |
| -------------------------------------------- | ----------------------------------------------- | ---------------------------------- |
| **Creator** (`@udtc/creator`)                | `pnpm --filter @udtc/creator dev`               | http://localhost:5173              |
| **Player** (`@udtc/player`)                  | `pnpm --filter @udtc/player dev`                | http://localhost:5174              |
| **Digital** — solo digital play              | `pnpm --filter ultimatedarktowerdigital dev`    | http://localhost:5173 †            |
| **Seed** — seed decoder SPA                  | `pnpm --filter ultimatedarktowerseed dev`       | http://localhost:3002 (auto-opens) |
| **Sync** (`@dark-tower-sync/client`)         | `pnpm --filter @dark-tower-sync/client dev`     | http://localhost:3000 (auto-opens) |
| **Controller** — tower control + 3D emulator | `pnpm --filter ultimatedarktowercontroller dev` | http://localhost:3005 (auto-opens) |
| **Game** — The Tower's Challenge             | `pnpm --filter ultimatedarktowergame dev`       | http://localhost:3004 (auto-opens) |

† Digital has no pinned port, so it takes 5173 — or the next free port if
Creator is already running there. Vite prints the actual URL on start.

Controller and Game consume the core (and, for Controller, display) `dist/` from
the initial `pnpm install`; run `pnpm --filter "./packages/*" build` first if you
skipped it.

Creator and Player auto-build `@udtc/engine` first (their `predev` hook), so
those two are self-contained. Digital, Seed, and Sync rely on the core (and, for
Sync, the relay) `dist/` produced by the initial `pnpm install`.

## Library demos (display / board)

These packages are libraries, so their runnable demo lives behind a dedicated
**example** script — plain `dev` on these is not the demo. (The core library's
browser demo, the Tower Controller, is now a standalone app — see the Apps table
above.)

| Demo                | Command                                                  | URL                                |
| ------------------- | -------------------------------------------------------- | ---------------------------------- |
| **Display** example | `pnpm --filter ultimatedarktowerdisplay run dev:example` | opens `/example/index.html` (5173) |
| **Board** example   | `pnpm --filter ultimatedarktowerboard run dev:example`   | http://localhost:5173              |

## Non-browser apps

- **Relay CLI** (`ultimatedarktowerrelay-cli`) — build then run:

  ```bash
  pnpm --filter ultimatedarktowerrelay-cli build
  pnpm --filter ultimatedarktowerrelay-cli start
  ```

  Use `dev` for a `tsc --build --watch` loop.

- **Relay Electron** (`ultimatedarktowerrelay-electron`) — BLE tower emulator
  desktop app:

  ```bash
  pnpm --filter ultimatedarktowerrelay-electron dev   # electron-forge start
  ```

  Needs the native BLE modules built, which the root install's `allowBuilds`
  handles. If the native modules complain, rebuild them:
  `pnpm --filter ultimatedarktowerrelay-electron rebuild`.

## Gotcha: editing a library while an app is running

Vite's HMR watches the **app's own** source, not the symlinked library `dist/`.
So if you edit `packages/core` (or display/board) while, say, Digital is
running, rebuild that library to see the change:

```bash
pnpm --filter ultimatedarktower build
```

For a tight loop on a library, run its watcher in a second terminal alongside
the app — e.g. `pnpm --filter ultimatedarktower dev` (tsc `-watch`). For the
controller specifically, `dev:controller` already rebuilds core examples on save.

## Related

- The deployed Pages site assembles these same apps/demos under a base path
  (`/creator/`, `/display/`, `/controller/`, …) via
  [`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml) —
  that path is for the live site, not local dev.
- Root `package.json` scripts (`pnpm run ci`, `build`, `typecheck`, `test`) run
  across the whole workspace topologically.
