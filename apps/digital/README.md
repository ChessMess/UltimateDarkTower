# UltimateDarkTowerDigital (UTDD)

Play a **solo base game** of *Return to Dark Tower* (1 player, up to 4 heroes, no expansions) in the
browser — a software **tower emulator**, a **digital game board**, and **digital player boards** —
composed from the UDT library family.

> UTDD is a **display, not a rules engine.** In the full game the official companion app is the brain;
> UTDD's long-term role is to be the tower + board it drives. The MVP runs browser-only with the player
> driving everything manually, behind a state-source seam that lets the official app take over later.
> See **[docs/prd/_overview.md](docs/prd/_overview.md)**.

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

UTDD depends on three sibling repos via `file:` links — clone them next to this repo and build them:

```
../UltimateDarkTower
../UltimateDarkTowerDisplay
../UltimateDarkTowerBoard
```

```bash
# Build the libraries first (their dist/ must exist for file: links to resolve)
for lib in UltimateDarkTower UltimateDarkTowerDisplay UltimateDarkTowerBoard; do
  (cd ../$lib && npm install && npm run build)
done
```

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run ci         # lint + typecheck + test + build
```

When you change a sibling library, rebuild it (`npm run build` in that repo) and Vite picks it up.

## Docs

- **[PRD suite](docs/prd/)** — start with [`_overview.md`](docs/prd/_overview.md), then PRD-00..06.

## License

MIT © ChessMess
