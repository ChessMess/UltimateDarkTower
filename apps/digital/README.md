# UltimateDarkTowerDigital (UTDD)

Play a **solo base game** of _Return to Dark Tower_ (1 player, up to 4 heroes, no expansions) in the
browser — a software **tower emulator**, a **digital game board**, and **digital player boards** —
composed from the UDT library family.

> UTDD is a **display, not a rules engine.** In the full game the official companion app is the brain;
> UTDD's long-term role is to be the tower + board it drives. The MVP runs browser-only with the player
> driving everything manually, behind a state-source seam that lets the official app take over later.
> See **[docs/prd/\_overview.md](docs/prd/_overview.md)**.

## Architecture at a glance

```
React UI ──reads──▶ game store (Zustand) ──subscribes──▶ state sources
                                              │
        ManualTowerSource / ManualBoardSource │  (MVP: player-driven)
        BridgeSource (PRD-05, official app)   │  ← swappable, no UI change
        NetworkSource (PRD-06, multiplayer)   ┘
```

- **Tower + board render in ONE shared 3D scene** via UDT Board's `BoardStageView` (2D + lazy 3D).
- `src/sources/` — the `TowerStateSource` / `BoardStateSource` interfaces + `ManualSource` impls.
- `src/state/` — the Zustand store bridging sources to React.
- `src/lib/` — `TowerBoardStage` (React wrapper around the imperative `BoardStageView`) + hooks.
- `src/features/` — tower, board, player-board, session UIs.

## Prerequisites

This app lives in the [UltimateDarkTower monorepo](../../README.md) and depends on the
`ultimatedarktower`, `ultimatedarktowerdisplay`, and `ultimatedarktowerboard` workspace
packages (`workspace:^`). A single `pnpm install` at the repo root links and builds them.

## Develop

From the monorepo root:

```bash
pnpm install                              # once, for the whole workspace
pnpm --filter ultimatedarktowerdigital dev   # http://localhost:5173
pnpm --filter ultimatedarktowerdigital build
```

The workspace packages are symlinked; when you change one, rebuild it
(`pnpm --filter <pkg> build`) and Vite picks it up.

## Docs

- **[Connecting the official app](https://chessmess.github.io/UltimateDarkTower/digital/connecting-the-official-app.html)**
  — step-by-step player guide to driving UTDD's tower from Restoration Games' companion app.
  Written for non-developers. The source lives in
  [`public/`](public/connecting-the-official-app.html), not `docs/`, so Vite deploys it alongside
  the app and the in-app "How do I set this up?" link resolves in dev and on Pages alike.
- **[PRD suite](docs/prd/)** — start with [`_overview.md`](docs/prd/_overview.md), then PRD-00..06.

## License

MIT © ChessMess
