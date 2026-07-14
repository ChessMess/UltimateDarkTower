# Tower Game Example — The Tower's Challenge

A complete browser game built on top of UltimateDarkTower. You pick a glyph, the tower picks one, and the rotation outcome decides who wins each round. Includes scoring, difficulty modes, a seeded RNG for reproducible runs, and confetti on victory.

## What it demonstrates

- A real game loop on top of `UltimateDarkTower` — turn order, win conditions, persistent score across rounds.
- Reading drum positions back into game logic via `getCurrentDrumPosition`.
- Using the [seed parser](../../packages/core/docs/api/seed.md) for reproducible game state.
- Glyph-position tracking informing UI state.
- A self-contained example of pairing tower control with arbitrary application logic.

## Run locally

```bash
pnpm install
pnpm --filter ultimatedarktowergame dev
```

Vite opens the game at the printed URL.

## Files

- `index.html` — markup, styles, and the confetti library.
- `src/TowerGame.ts` — game logic, tower wiring, scoring.
- `public/assets/` — styles image map, favicon, and glyph sprite.

## See also

- [../../packages/core/docs/EXAMPLES.md](../../packages/core/docs/EXAMPLES.md) — overview of the library examples.
- [../../packages/core/docs/api/state.md](../../packages/core/docs/api/state.md) — glyph and seal tracking APIs the game uses.
- [../../packages/core/docs/api/seed.md](../../packages/core/docs/api/seed.md) — game seed encoding/decoding.
