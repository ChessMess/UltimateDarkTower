# apps/digital (`ultimatedarktowerdigital`) — solo digital game (private)

Play a solo base game of Return to Dark Tower in the browser — a software tower emulator +
digital board + player boards, composed from the UDT library family. Has a `docs/prd/` folder.

## The official app bridge (PRD-05) is wired up

`src/sources/BridgeTowerSource.ts` connects to a relay host (`apps/relay-cli` /
`apps/relay-electron`) via `ultimatedarktowerrelay-client`, so the official companion app drives
the tower. It **wraps** `ManualTowerSource` instead of replacing it — `TowerBoardStage` captures
`store.towerSource` once at mount, so swapping the object at runtime would leave the 3D scene
painting a dead source. Disconnected, every call falls through and the app behaves exactly as it
did pre-bridge.

Three traps worth remembering:

- **The hosted build needs the Local Network Access permission, and the first connect always
  fails.** Chrome gates public-origin → loopback (shipped 142, WebSockets in 147) and **aborts the
  very request that raises the prompt** — an `error` + `close 1006`, instantly. So
  `BridgeTowerSource.connect` retries once, gated on `awaitLocalNetworkGrant()` waiting for the
  permission to flip to `granted`; do **not** replace that with a fixed delay, it races the
  player's click. Confirmed on the live Pages origin in Chrome 150.

  **Testing it needs a live relay + the hosted origin + a non-automated browser.** Drop any one and
  you get a false result: nothing listening → the refusal short-circuits before the permission check;
  `http://localhost:5173` → a local origin, never gated; CDP → the prompt is suppressed and the
  socket just hangs. This was misdiagnosed twice on the way in. See PRD-05 §7.

- **Don't derive the skull count from `TowerState.beam.count` while connected.** Every command the
  app writes carries its own beam count (bytes 15-16), so remote state clobbers it on the next
  command. `BridgeTowerSource` keeps its own counter; `BridgeTowerSource.test.ts` guards this.
- **`ultimatedarktowerrelay-client` / `-shared` resolve via their `import` condition**, added in
  the PRD-05 pass — both were CJS-only and `relay-shared`'s barrel emits `__exportStar`. They are
  deliberately **not** in `vite.config.ts`'s `optimizeDeps.include`; the export condition is
  sufficient, same as core's `browser` condition.

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
under `src/`). `vite.config.ts`'s `optimizeDeps.include` pre-bundles the linked
`ultimatedarktowerdisplay`/`ultimatedarktowerboard` workspace libs so their `file:` links
resolve cleanly in dev. `ultimatedarktower` is deliberately _not_ listed there: since core
v7.0.0 it ships a `browser` export condition (`dist/browser/index.mjs`, no `createRequire`/
noble banner) that Vite resolves directly.

## `localStorage` in tests needs `src/test/setup.ts`

Node 22+ defines a global `localStorage` accessor gated behind `--localstorage-file` (present but
returns `undefined` without the flag). Vitest's jsdom environment only overrides globals on its
own allowlist, and `localStorage`/`sessionStorage` aren't on it — so Node's inert getter silently
shadows jsdom's real, working `Storage` before any test runs; a test hitting bare `localStorage`
sees `undefined`, not a jsdom object. `vite.config.ts`'s `test.setupFiles` points at
`src/test/setup.ts`, which redirects the global accessors to the real jsdom-backed storage at
`globalThis.jsdom.window`. Don't remove that setup file or its `setupFiles` wiring — tests that
touch `localStorage` (`gameStore.test.ts`'s save/load/stale-session suite) fail cryptically
without it.
