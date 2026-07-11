# Tower Game Example — The Tower's Challenge

A complete browser game built on top of UltimateDarkTower. You pick a glyph, the tower picks one, and the rotation outcome decides who wins each round. Includes scoring, difficulty modes, a seeded RNG for reproducible runs, and confetti on victory.

## What it demonstrates

- A real game loop on top of `UltimateDarkTower` — turn order, win conditions, persistent score across rounds.
- Reading drum positions back into game logic via `getCurrentDrumPosition`.
- Using the [seed parser](../../docs/api/seed.md) for reproducible game state.
- Glyph-position tracking informing UI state.
- A self-contained example of pairing tower control with arbitrary application logic.

## Run locally

```bash
npm install
npm run dev:examples
```

Then open `TowerGame.html` at the printed URL.

## Files

- `TowerGame.html` — markup, styles, and confetti library.
- `TowerGame.ts` — game logic, tower wiring, scoring.

## See also

- [../../docs/EXAMPLES.md](../../docs/EXAMPLES.md) — overview of all examples.
- [../../docs/api/state.md](../../docs/api/state.md) — glyph and seal tracking APIs the game uses.
- [../../docs/api/seed.md](../../docs/api/seed.md) — game seed encoding/decoding.
