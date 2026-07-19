# apps/digital (`ultimatedarktowerdigital`) — solo digital game (private)

Play a solo base game of Return to Dark Tower in the browser — a software tower emulator +
digital board + player boards, composed from the UDT library family. Has a `docs/prd/` folder.

## Framing: display, not a rules engine

UTDD is a **display, not a rules engine.** In the full game the official companion app is the
brain; UTDD's role is the tower + board it drives. Keep game-rules logic out — it consumes
`ultimatedarktower` + `ultimatedarktowerdata` + `ultimatedarktowerboard` +
`ultimatedarktowerdisplay` and renders their state.

## eslint devDeps note (tension with the root convention)

This app carries its own `eslint` / `typescript-eslint` / `eslint-plugin-react-*` devDeps.
The root CLAUDE.md warns against per-package eslint devDeps because a nested **v8** copy
shadows the root v9 flat config — but here they're **v9-aligned** (`eslint ^9`,
`typescript-eslint ^8`), matching the root major, so lint still resolves the root config.
Understand this before "fixing" it: don't downgrade or add a v8 copy. Root `eslint .` covers
this app; the local devDeps mainly satisfy the React plugins.

Standard Vite scripts; `build` = `tsc -b && vite build`; `test` = `vitest run` (tests colocated
under `src/`). Like `apps/creator`, its Vite setup pre-bundles `ultimatedarktower` (see the
`vite-apps-must-prebundle-udt` gotcha).
