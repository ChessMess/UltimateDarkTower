# apps/digital (`ultimatedarktowerdigital`) — solo digital game (private)

Play a solo base game of Return to Dark Tower in the browser — a software tower emulator +
digital board + player boards, composed from the UDT library family. Has a `docs/prd/` folder.

## Framing: display, not a rules engine

UTDD is a **display, not a rules engine.** In the full game the official companion app is the
brain; UTDD's role is the tower + board it drives. Keep game-rules logic out — it consumes
`ultimatedarktower` + `ultimatedarktowerdata` + `ultimatedarktowerboard` +
`ultimatedarktowerdisplay` and renders their state.

## eslint: no local devDeps (follows the root convention)

This app has **no** `eslint` / `typescript-eslint` / `eslint-plugin-react-*` devDeps, and
should not gain any — see the root CLAUDE.md (a nested copy shadows the root v9 flat config).

It used to carry all five, and an earlier version of this note justified them as needed to
"satisfy the React plugins." That was wrong: the root `eslint.config.js` imports
`eslint-plugin-react-hooks` and `eslint-plugin-react-refresh` itself (lines 3-4) and the root
`package.json` declares all five at the _same_ ranges, so the local copies were exact
duplicates. They were removed in the July 2026 stack-alignment pass. Root `eslint .` covers
this app, including the React rules — `eslint.config.js` scopes them to
`apps/digital/**/*.{ts,tsx}` explicitly.

Standard Vite scripts; `build` = `tsc -b && vite build`; `test` = `vitest run` (tests colocated
under `src/`). Like `apps/creator`, its Vite setup pre-bundles `ultimatedarktower` (see the
`vite-apps-must-prebundle-udt` gotcha).
