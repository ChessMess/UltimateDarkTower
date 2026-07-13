# Ultimate Dark Tower

A pnpm monorepo for the **Ultimate Dark Tower (UDT)** ecosystem — a TypeScript library, renderers,
and companion apps for _Return to Dark Tower_.

**🎮 Live demos:** https://chessmess.github.io/UltimateDarkTower/

## Packages

Reusable libraries under [`packages/`](packages/). The six below are published to npm:

| Package                                          | npm                                                                                            | What it is                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [`packages/core`](packages/core)                 | [`ultimatedarktower`](https://www.npmjs.com/package/ultimatedarktower)                         | BLE driver + core library for the physical tower                  |
| [`packages/display`](packages/display)           | [`ultimatedarktowerdisplay`](https://www.npmjs.com/package/ultimatedarktowerdisplay)           | Composable text / 2D / 3D renderers for tower state               |
| [`packages/board`](packages/board)               | [`ultimatedarktowerboard`](https://www.npmjs.com/package/ultimatedarktowerboard)               | 2D game-board renderer, token layout, and Board3D plugin          |
| [`packages/relay-shared`](packages/relay-shared) | [`ultimatedarktowerrelay-shared`](https://www.npmjs.com/package/ultimatedarktowerrelay-shared) | Shared relay protocol types, message factories, constants         |
| [`packages/relay-core`](packages/relay-core)     | [`ultimatedarktowerrelay-core`](https://www.npmjs.com/package/ultimatedarktowerrelay-core)     | Headless relay engine (BLE tower-emulator peripheral + WebSocket) |
| [`packages/relay-client`](packages/relay-client) | [`ultimatedarktowerrelay-client`](https://www.npmjs.com/package/ultimatedarktowerrelay-client) | Framework-agnostic consumer SDK for the relay                     |

Internal (private) Creator libraries: `creator-schema` (`@udtc/schema`), `creator-engine`
(`@udtc/engine`), `creator-adapters` (`@udtc/adapters`), `creator-card-render`
(`@udtc/card-render`), `creator-theme` (`@udtc/theme`).

## Apps

Runnable apps under [`apps/`](apps/) (not published):

| App                                          | Demo                                                                  | What it is                                        |
| -------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------- |
| [`apps/creator`](apps/creator)               | [`/creator/`](https://chessmess.github.io/UltimateDarkTower/creator/) | Scenario creator — deck, dungeon & battle builder |
| [`apps/player`](apps/player)                 | [`/player/`](https://chessmess.github.io/UltimateDarkTower/player/)   | Scenario player (masked-map play engine)          |
| [`apps/digital`](apps/digital)               | [`/digital/`](https://chessmess.github.io/UltimateDarkTower/digital/) | Solo digital play                                 |
| [`apps/seed`](apps/seed)                     | [`/seed/`](https://chessmess.github.io/UltimateDarkTower/seed/)       | Seed / tower-state decoder                        |
| [`apps/sync`](apps/sync)                     | [`/sync/`](https://chessmess.github.io/UltimateDarkTower/sync/)       | Browser client for the relay                      |
| [`apps/relay-cli`](apps/relay-cli)           | —                                                                     | Relay daemon (CLI)                                |
| [`apps/relay-electron`](apps/relay-electron) | —                                                                     | BLE tower-emulator desktop console                |

## Development

Requires **Node ≥ 20** and **pnpm ≥ 10** (`packageManager` pins pnpm 11.9.0).

```bash
pnpm install          # install everything (builds native BLE deps + @udtc/engine)
pnpm run ci           # validate:nodes → build → typecheck → test (what CI runs)

pnpm --filter <pkg> build        # build one package/app
pnpm --filter <pkg> test         # test one package/app
pnpm run format                  # prettier --write across the workspace
pnpm run lint                    # eslint (see lint debt note below)
```

- **Workspace:** [`pnpm-workspace.yaml`](pnpm-workspace.yaml) — one TypeScript version via `catalog:`,
  `nodeLinker: hoisted`, and `allowBuilds` for the native BLE / esbuild / electron deps.
- **Tooling:** one root [`eslint.config.js`](eslint.config.js) + [`.prettierrc`](.prettierrc).
  Lint is not yet part of `ci` — there is pre-existing lint debt (mostly `no-explicit-any`).
- **Docs:** per-package docs live in each package; Creator/Relay/Sync guides are under
  [`docs/`](docs/). Pre-merge repository history is preserved under [`docs/history/`](docs/history/).

## Publishing

Published packages use [Changesets](.changeset/) with independent versioning. Add a changeset
with `pnpm changeset` when you change a published package; releases publish from
[`.github/workflows/release.yml`](.github/workflows/release.yml) once npm Trusted Publishing is
configured.

## License

MIT © ChessMess — see [LICENSE](LICENSE).
