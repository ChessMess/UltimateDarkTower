# UltimateDarkTowerBoard — Repository Scaffolding Spec

**Repo:** `UltimateDarkTowerBoard` (npm `ultimatedarktowerboard`) · maintainer ChessMess
**Status:** Draft v0.2 · **Date:** 2026-06-05 · Companion to the board PRD, prep guide, and the UDT data-additions plan.
**Goal:** stand up the empty repository skeleton — tooling, package shape, directory layout, example app, docs, CI — so feature work (state core → renderers → 3D plugin → UI) drops into a structure that matches the rest of the family. **No feature code here**; this spec produces the scaffold only.

> **Changes since v0.1** (verified against `ultimatedarktower@4.0.1` and `ultimatedarktowerdisplay@0.8.0` on 2026-06-05, then validated by building the scaffold): CJS output uses a bare `.cjs` extension — **not** Display's `.cjs.js`, which is parsed as ESM under `"type":"module"` and leaves Display's own CJS `require()` broken; `zod ^3 → ^4`; `three` peer set to Display's exact string; §9 publish rewritten to OIDC/provenance (Display already migrated off the `NODE_AUTH_TOKEN` flow); minor tooling claims aligned with Display; §12 assumptions annotated with verified outcomes. A working scaffold implementing this spec now exists in the repo (`npm run ci` green).

> Several choices below depend on decisions only the maintainer can confirm. Every such point is marked **[ASSUMPTION]** and collected in §12. Read those before executing.

---

## 0. How to use this document

You are creating a new TypeScript library repo that mirrors the conventions of `ultimatedarktowerdisplay` and `ultimatedarktower`. Before scaffolding, open those two repos and copy their *patterns* (not contents): `package.json` shape, `tsconfig`, Vite lib config, Jest config, ESLint/Prettier, `docs/` layout, `example/` app, CI workflows, `files`/`.npmignore`. This package is a **consumer** of both: it re-exports data from `ultimatedarktower` and plugs a 3D renderer into `ultimatedarktowerdisplay`.

---

## 1. What this package is (one paragraph for the scaffold's README)

A composable state + render library for the *Return to Dark Tower* game board. It owns a `BoardState` (heroes, foes, adversary, skulls-on-buildings, monuments, space markers), renders it three ways (text readout, 2D overhead map, 3D in-scene board), and ships an optional dockable editing UI. The 3D board is a `ScenePlugin` that plugs into `ultimatedarktowerdisplay`'s `Tower3DView`, replacing the placeholder disc image. It enforces no game rules — it stores, renders, and emits events; hosts own rules.

---

## 2. Package identity and the two-entry split

The single most important scaffolding decision: **split the public surface into two entry points** so consumers that only want headless state / readout / 2D don't pull in `three` or Display.

- `"."` (main) — headless core (`BoardState`, controller, reducer, commands, events, save/load), the `readout` renderer, the `2d-map` renderer, and re-exports of UDT board data/graph helpers. **Imports no `three`, no Display.**
- `"./plugin"` — the `Board3DPlugin` (the `ScenePlugin` for Display's `Tower3DView`). Imports `three` and `ultimatedarktowerdisplay`.

This mirrors how Display isolates its heavy `./physics` subpath. `attach`-ing the 3D board is then an explicit `import { Board3DPlugin } from 'ultimatedarktowerboard/plugin'`.

### `package.json` (sketch — verify field-by-field against Display's)
> Output filenames: ESM is `index.esm.js` / `plugin.esm.js`; CJS is **`index.cjs` / `plugin.cjs`** (a bare `.cjs`, **not** `.cjs.js`). ⚠️ This is a deliberate divergence from Display, validated by building the scaffold: because the package is `"type": "module"`, Node treats any `.js` file — including Display's `index.cjs.js` — as **ESM**, so `require('ultimatedarktowerdisplay')` returns an empty module (Display's CJS entry is in fact broken today). A bare `.cjs` extension forces Node to load it as CommonJS. The `fileName` function must therefore emit `.cjs` for the cjs format (see §4). Subpath asymmetry mirrors Display: types live in a folder (`dist/plugin/index.d.ts`) while the JS is flat (`dist/plugin.cjs`).
```jsonc
{
  "name": "ultimatedarktowerboard",
  "version": "0.1.0",
  "type": "module",
  "sideEffects": false,
  "main": "./dist/index.cjs",
  "module": "./dist/index.esm.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.esm.js", "require": "./dist/index.cjs" },
    "./plugin": { "types": "./dist/plugin/index.d.ts", "import": "./dist/plugin.esm.js", "require": "./dist/plugin.cjs" }
  },
  "files": ["dist"],
  "engines": { "node": ">=18", "npm": ">=7" },
  "license": "MIT",
  "scripts": {
    "dev": "vite",
    "dev:example": "vite --config vite.example.config.ts",
    "build": "vite build && tsc --emitDeclarationOnly",
    "build:example": "vite build --config vite.example.config.ts",
    "preview:example": "vite preview --config vite.example.config.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --write .",
    "clean": "rimraf dist",
    "ci": "npm run typecheck && npm run lint && npm run test && npm run build"
  },
  "peerDependencies": {
    "ultimatedarktower": "^4.1.0",
    "ultimatedarktowerdisplay": "^0.9.0",
    "three": "^0.170.0",
    "gsap": "^3.12.0"
  },
  "peerDependenciesMeta": {
    "ultimatedarktowerdisplay": { "optional": true },
    "three": { "optional": true },
    "gsap": { "optional": true }
  },
  "dependencies": { "zod": "^4" },
  "devDependencies": { /* see §4 */ }
}
```

`three` is set to Display's **exact** declared peer string (`^0.170.0`) — single-instance requirement means the board must declare the same range Display does, verbatim, not a hand-rolled one. ⚠️ Display currently mismatches itself (peer `three@^0.170.0` but dev-deps `three@^0.184`/`@types/three@^0.184`); when Display reconciles that, copy whatever its peer becomes. `gsap@^3.12.0` matches Display's actual minimum (not a bare `^3`). `zod` is `^4` because Display ships `zod@^4.4.3` as a runtime dependency — v3→v4 is breaking, so the board's save/load schemas must be on v4 to stay consistent with the family. **`@dimforge/rapier3d-compat`** (Display's 4th optional peer) is intentionally omitted: the board plugin does no physics. The example therefore cannot add Display's skull physics unless it pulls rapier in itself.

**[ASSUMPTION] peer versions (not yet shippable as written):** As of 2026-06-05, `ultimatedarktower` is **4.0.1** — only `BOARD_LOCATIONS` is exported; `BOARD_ANCHORS` / adjacency / `stepDistance` + graph helpers are **in progress** (maintainer is authoring them via `UltimateDarkTower/tools/location-marker`). `ultimatedarktowerdisplay` is **0.8.0** — `anchorToWorld` (consumer-spec TASK 4) **does not exist yet**. So `^4.1.0` / `^0.9.0` are placeholders for releases that don't exist. Pin both to whatever versions actually carry those symbols. Until they land, the scaffold stands up with placeholder re-exports (only `BOARD_LOCATIONS` is real) and the anchor/graph smoke tests stay pending (see §6).

---

## 3. Directory layout

```
UltimateDarkTowerBoard/
├─ src/
│  ├─ index.ts                      # main entry: re-exports core + renderers + UDT data/graph (NO three)
│  ├─ state/
│  │  ├─ boardState.ts              # BoardState types + createDefaultBoardState()
│  │  ├─ commands.ts                # command vocabulary + types
│  │  ├─ reducer.ts                 # applyBoardCommand(state, command): BoardState (pure)
│  │  ├─ controller.ts              # BoardStateController (holds state, runs reducer, emits events)
│  │  ├─ events.ts                  # event names + payload types
│  │  └─ serialize.ts               # versioned saveState()/loadState() (zod-validated)
│  ├─ renderers/
│  │  ├─ readout.ts                 # BoardReadout (text; deterministic; snapshot target)
│  │  ├─ map2d.ts                   # BoardMap2D (SVG/canvas over board image)
│  │  └─ shared.ts                  # shared renderer interface, focus/view types
│  ├─ view/
│  │  └─ boardRenderView.ts         # BoardRenderView facade (controller + renderers + optional UI)
│  ├─ ui/                           # optional dockable editing UI (vanilla TS) — palette/inspector/summary
│  ├─ data/
│  │  └─ udtReexports.ts            # re-export BOARD_LOCATIONS/ANCHORS/ADJACENCY, graph helpers, rosters from ultimatedarktower
│  └─ plugin/
│     └─ index.ts                   # "./plugin" entry: Board3DPlugin (imports three + display + anchorToWorld)
├─ example/                         # Vite app: TowerRenderView + board, deployed to GitHub Pages
│  ├─ index.html
│  ├─ src/main.ts
│  └─ public/                       # token images + (board.png strategy: see §7)
├─ docs/                            # audience-tiered (see §8)
├─ __tests__/                       # or co-located *.test.ts
├─ tsconfig.json                     # Display has no separate build tsconfig; dts emit runs against this
├─ vite.config.ts  vite.example.config.ts
├─ jest.config.cjs                   # Display uses .cjs (+ jest.config.snapshots.cjs); see §4
├─ .eslintrc.cjs  .prettierrc        # .editorconfig optional — Display ships none
├─ .gitignore  .npmignore
├─ .github/workflows/{ci.yml,pages.yml,publish.yml}
├─ README.md  CHANGELOG.md  CONTRIBUTING.md  LICENSE
```

`src/plugin/**` is the only place allowed to import `three` / `ultimatedarktowerdisplay`. A lint rule (or a simple CI grep) should enforce that `src/index.ts` and everything it transitively imports stays three-free.

---

## 4. Tooling configs

- **TypeScript:** `tsconfig.json` (strict, `target: ES2020`, `module: ESNext`, `moduleResolution: "bundler"` — that's what Display uses, not `NodeNext`; `declaration: true`, `declarationDir`/`outDir: dist`, `lib: ["ES2020","DOM","DOM.Iterable"]`). Display sets **no** `declarationMap` and has **no** separate `tsconfig.build.json` — its `build` runs `tsc --emitDeclarationOnly` against this same config. Mirror that unless you have a reason to split.
- **devDependencies:** `typescript`, `vite`, `jest` + **`ts-jest`** (Display uses ts-jest, not `@swc/jest`), `jest-environment-jsdom`, `@types/jest`, `eslint` + `@typescript-eslint/{parser,eslint-plugin}` v7 (Display's legacy `.eslintrc.cjs` setup), `prettier`, `three`, `@types/three` (align dev `three` with Display's dev `^0.184` to catch type drift even though the peer range is broader), `gsap`. `rimraf` only if you want a cross-platform `clean` — Display just uses `rm -rf`. For local sibling dev, add `ultimatedarktower` and `ultimatedarktowerdisplay` as **`file:../…` devDependencies** (Display does this for UDT) — but the **peer** ranges in §2 stay registry ranges, never `file:`.
- **Vite (lib):** library mode, two entries (`src/index.ts`, `src/plugin/index.ts`), ESM + CJS output via `fileName: (format, name) => format === 'es' ? \`${name}.esm.js\` : \`${name}.cjs\`` (CJS gets `.cjs`, not `.cjs.js` — see §2; this is the convention the §2 `exports` map assumes), and `rollupOptions.external` listing `ultimatedarktower`, `ultimatedarktowerdisplay`, `three`, `/^three\/.*/` (submodule paths), `gsap` so peers are never bundled.
- **Vite (example):** standard app build; output to `example/dist` for Pages.
- **Jest:** jsdom env; `ts-jest` transform; config in `jest.config.cjs`. Display additionally keeps a second `jest.config.snapshots.cjs` (it strips the gsap mock for 3D sequence snapshots) — the board's readout snapshot is deterministic text with no gsap, so a **single `jest.config.cjs` is sufficient**; add the second config only if a renderer snapshot later needs real gsap. `collectCoverageFrom: src/**`.

---

## 5. Build outputs

`npm run build` → `vite build` emits `dist/index.esm.js` + `dist/index.cjs` and `dist/plugin.esm.js` + `dist/plugin.cjs`; `tsc --emitDeclarationOnly` emits matching `.d.ts` (`dist/index.d.ts`, `dist/plugin/index.d.ts`). Verify the §2 `exports` map paths resolve against these exact filenames, that **`require('ultimatedarktowerboard')` returns the named exports** (the `.cjs` extension is what makes this work under `"type":"module"` — a `.cjs.js` file would be parsed as ESM and come back empty), and that a no-three consumer importing only `"."` pulls zero `three` bytes.

---

## 6. Testing scaffold (empty suites + one smoke each)

Stand up the harnesses (real tests come with feature work):
- `reducer.test.ts` — placeholder asserting `createDefaultBoardState()` shape.
- `readout.snapshot.test.ts` — snapshot of the readout for a default state (the deterministic test target).
- `graph.reexport.test.ts` — asserts the UDT graph helpers are importable and `stepDistance(x,x)===0`. **Keep `test.todo`/`describe.skip` until UDT actually exports `stepDistance` + adjacency** (4.0.1 ships only `BOARD_LOCATIONS`); a `BOARD_LOCATIONS` re-export smoke test can pass today.
- `serialize.test.ts` — `loadState(saveState())` round-trip placeholder (zod **v4** schema).
- `plugin.contract.test.ts` — jsdom; asserts `Board3DPlugin` satisfies Display's `ScenePlugin` shape — it needs `id: string`, `attach(ctx)`, `dispose()` (optional `onModelLoaded`/`onStateApplied`/`onSealsApplied`/`update`) — type-level + a mock attach, no pixel assertions.

---

## 7. Example app

Composes the whole stack and is the GitHub Pages demo:
- `new TowerRenderView({ container, modelUrl, overlay: true })`, then `view.view3D` (typed `Tower3DView | null` — **null-guard it**) `?.setBoardDiscEnabled(false)`, `attachScenePlugin(view.view3D, new Board3DPlugin({ boardState, assetBaseUrl }))`. Note `setBoardDiscEnabled(false)` only hides Display's board **texture**; the ground disc mesh (shadow catcher) stays, and the plugin draws its own board on top.
- Place tokens via `BOARD_ANCHORS` + Display's `anchorToWorld(...)`, fanning multiples around a slot anchor; do placement in the plugin's `onModelLoaded`. (Both symbols are unshipped today — see §2/§12-Q2.)
- Mount the dockable UI into `view.getOverlayContainer()` (HUD) and/or `getPanelSlot('right')` (editor).
- Wire the focus controls (All/N/E/S/W + Overhead/Isometric). N/E/S/W map to `selectSide`. **Display has no named "overhead"/"isometric" camera presets** — only `selectSide` (cardinal) + a flexible `CameraConfig` (`elevationFactor`, `targetHeightFactor`, …); the board must compute those factors itself for overhead/iso (or add presets upstream). "All" is a board-level overview concept, not a `TowerSide`.

**[ASSUMPTION] assets.** Token images load via an `assetBaseUrl` option (not bundled into JS). The board art `board.png` (4096², **21 MB**, at `UltimateDarkTowerDisplay/src/3d/assets/board.png`) — viable strategies are **copy into `example/public`** or **fetch at runtime**. *Importing it from the Display dep is not an option:* Display does not export the asset — only its internal code imports `./assets/board.png`, so there's no public specifier to import. Also flag in the README that the 3D path inherits Display's heavy transitive footprint (three + rapier + the 21 MB board image + audio; ~100 MB installed).

---

## 8. Docs skeleton (mirror Display's audience-tiered set)

Create stubs: `README.md` (npm landing + quick start), `docs/README.md` (role-based index), `GETTING_STARTED.md`, `ARCHITECTURE.md`, `STATE_MODEL.md` (BoardState + commands + events + save/load), `RENDERERS.md` (readout/2d-map/3d + focus controls), `DISPLAY_INTEGRATION.md` (the `/plugin` entry, `setBoardDiscEnabled(false)`, `anchorToWorld`, docking, pointer targets), `EXAMPLE.md`, `API.md`, `TROUBLESHOOTING.md`, `CONTRIBUTING.md`, `CHANGELOG.md` (with an `[Unreleased]` section). Add the package to UDT's `docs/ECOSYSTEM.md` and Display's related list.

---

## 9. CI / release

- `ci.yml` — `npm run ci`; **dual-checkout the sibling repos** (`ultimatedarktower`, `ultimatedarktowerdisplay`) the way Display's CI does, since dev uses `file:` links. (Confirmed: Display's `ci.yml` checks out the sibling into a parallel path.)
- `pages.yml` — build the example and deploy to GitHub Pages.
- `publish.yml` — **mirror Display's current workflow, which uses npm OIDC trusted publishing — no `NPM_TOKEN` at all** (the v0.1 `NODE_AUTH_TOKEN` advice is stale; Display already migrated off it). The reference shape:
  ```yaml
  permissions: { contents: read, id-token: write }   # OIDC
  steps:
    - uses: actions/checkout@v6        # + dual-checkout the sibling
    - uses: actions/setup-node@v6
      with: { node-version: 20, registry-url: https://registry.npmjs.org }
    - run: npm ci
    - run: npm run ci
    - run: npm publish --provenance    # OIDC validates identity; emits provenance
  ```
  One-time external setup the v0.1 spec omitted: **register `ultimatedarktowerboard` as a trusted publisher on npmjs.com** (package → Settings → Trusted Publisher → this repo + `publish.yml`). Caveat: trusted publishing needs npm CLI ≥ 11.5.1; Node 20's bundled npm may be older, so add `npm i -g npm@latest` before `npm publish` if the publish step fails to authenticate (verify Display's own publish actually runs green and copy whatever it does).

---

## 10. Repo-hygiene specifics

- `.npmignore` (or rely on `files: ["dist"]`) so `example/`, `docs/`, `__tests__/`, source, and configs are not published. (Deliberate deviation: Display's own `files` *does* publish `docs`/`README`/`LICENSE`/`CHANGELOG`; the board ships `dist` only — fine, just don't treat it as "mirror Display.")
- `.gitignore`: `dist`, `node_modules`, `example/dist`, coverage.
- A three-free guard for the main entry (lint rule or CI grep), per §3.

---

## 11. Definition of done (scaffold)

- [ ] `npm install` clean; `npm run ci` green on an empty-but-typechecking skeleton (placeholder exports + stub tests).
- [ ] Both entry points build and emit `.d.ts`; `"."` is verified three-free; `"./plugin"` resolves with `three` external.
- [ ] Example app builds and runs locally (even if it only renders the tower + an empty board).
- [ ] Docs stubs exist; CHANGELOG has `[Unreleased]`; CI + Pages workflows present; publish workflow uses OIDC `--provenance` (no `NPM_TOKEN`) and the package is registered as an npm trusted publisher.
- [ ] Peers/devDeps wired per §2/§4; sibling `file:` links work for local dev; published peers are registry ranges.

---

## 12. Assumptions to confirm + open questions

1. ✅ **[VERIFIED] Two-entry split** (`"."` three-free + `"./plugin"`): confirmed as the right pattern — Display ships exactly this with its `"./physics"` subpath. Load-bearing; everything in §2–§5 follows from it.
2. ⏳ **[VERIFIED unshipped] Peer versions:** `ultimatedarktower@^4.1.0` (datasets+graph) and `ultimatedarktowerdisplay@^0.9.0` (`anchorToWorld`) — **neither release exists yet.** UDT is 4.0.1 (only `BOARD_LOCATIONS` shipped; anchors/adjacency/`stepDistance` in progress by the maintainer). Display is 0.8.0 with **no `anchorToWorld`** — that Display change (consumer TASK 4) is not present in the repo and is the gating prerequisite for real 3D token placement. Pin to the real versions once they land.
3. **Board.png strategy** — narrowed to **copy into `example/public`** vs. **fetch at runtime** (the "import from the Display dep" option is struck — Display doesn't export the asset; see §7). Which of the two?
4. **Token image assets:** where do your token images live, and what's the naming convention so the plugin/2D renderer can resolve them via `assetBaseUrl`? (Not present in either sibling repo today — you mentioned you have the image files.)
5. ✅ **[VERIFIED] UI framework:** vanilla TS confirmed family-consistent — Display's overlay/docking/HUD is pure DOM (`document.createElement`), no React/Vue/Svelte. The board's dockable UI should be vanilla TS.
6. **Still-open schema item:** the data plan's §9 `blighted` → generalized `spaceMarkers` question. The `BoardState` types module (§3) encodes whichever you pick; recommend locking `spaceMarkers` now (all-expansions scope) — confirm or keep `blighted` for v1.
7. **Subpath name:** `"./plugin"` (Display uses a descriptive name, `"./physics"`, so `"./plugin"`/`"./3d"`/`"./display"` are all consistent) — keep `"./plugin"`, or prefer another?
8. **Repo bootstrap mechanics:** do you want this scaffold delivered as a generated file tree / script you run, or just this spec for a fresh session to execute?
