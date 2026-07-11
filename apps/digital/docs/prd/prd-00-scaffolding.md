# PRD-00 — Scaffolding & Architecture

> Foundation PRD. Implement this first. Read [_overview.md](_overview.md) for context.

## 1. Introduction / Overview

UTDD is a brand-new, empty repository. This PRD stands up the project skeleton: the build toolchain,
the dependencies on the four UDT libraries, the **state-source abstraction** that every later feature
plugs into, the React integration layer that wraps UDT Board's imperative `BoardStageView`, the
three-pane app shell, and CI/deployment. It ends with a **working vertical slice** so we know the
whole stack composes before we build game features.

**Problem it solves:** without a deliberate skeleton, the imperative (vanilla-TS, Three.js) libraries
and a modern React app fight each other, and the "official app drives it later" requirement gets
painted into a corner. PRD-00 makes both clean from day one.

## 2. Goals

- A runnable Vite + latest-React + TypeScript app that imports and renders the UDT tower + board.
- The `TowerStateSource` / `BoardStateSource` seam in place with a working `ManualSource`.
- React wrappers/hooks that own the lifecycle of the imperative UDT views (mount, update, dispose).
- A three-pane app shell (tower · board · player board) with the shared 3D scene live.
- Tooling parity with the sibling repos (lint, format, test, typecheck, CI, GitHub Pages).
- A vertical slice proving an end-to-end manual action works.

## 3. User Stories

- *As the developer*, I can run `npm install && npm run dev` and see the tower + board render in the
  browser, so I know the libraries are wired correctly.
- *As the developer*, I can call a `ManualSource` method and watch both the React UI and the 3D scene
  update, so I trust the state seam before building features on it.
- *As the developer*, I can run `npm run ci` and have it lint, typecheck, test, and build, so broken
  changes are caught before merge.
- *As a future contributor*, I can read `_overview.md` + this PRD and understand where new code goes.

## 4. Functional Requirements

1. **FR-00.1** The project MUST be a Vite app using the latest stable React and React DOM, with
   TypeScript in `strict` mode.
2. **FR-00.2** `package.json` MUST depend on the three consumable UDT libraries via local `file:`
   links: `ultimatedarktower` → `../UltimateDarkTower`, `ultimatedarktowerdisplay` →
   `../UltimateDarkTowerDisplay`, `ultimatedarktowerboard` → `../UltimateDarkTowerBoard`.
3. **FR-00.3** The shared peer dependencies `three`, `gsap`, and `@dimforge/rapier3d-compat` MUST be
   installed and **deduped to a single instance** (Vite `resolve.dedupe`), and a check MUST confirm
   only one copy of `three` resolves at build time.
4. **FR-00.4** The repo MUST define `TowerStateSource` and `BoardStateSource` interfaces. Each exposes
   the current state, a `subscribe(listener)` method, and the mutation methods the UI needs. A
   `ManualSource` implementation of each MUST exist (player-driven, in-memory).
5. **FR-00.5** State MUST be held in a store (Zustand recommended) that subscribes to the active state
   source; React components read from the store, never directly from a UD library instance.
6. **FR-00.6** A `<TowerBoardStage>` React component MUST wrap UDT Board's `BoardStageView`: create it
   in a mount effect, expose its `.controller` / `.tower3D` via a ref/context, and `dispose()` on
   unmount. It MUST NOT recreate the view on every render.
7. **FR-00.7** Hooks `useBoardController()` and `useTowerState()` MUST provide components access to the
   board controller and the current tower state without prop-drilling the imperative objects.
8. **FR-00.8** The app shell MUST present three regions — tower view, board view, player-board view —
   in a responsive layout, with the shared 3D scene (tower + board) rendering live.
9. **FR-00.9** Static assets (`tower.glb`, board image, token art folder) MUST be served from
   `public/assets/` and referenced via `assetBaseUrl` / `modelUrl`, sourced from the Display/Board
   example assets.
10. **FR-00.10** Tooling MUST include ESLint, Prettier, a test runner (Vitest recommended; see Open
    Questions), and npm scripts `dev`, `build`, `preview`, `typecheck`, `lint`, `format`, `test`, and
    `ci` (= lint + typecheck + test + build), mirroring the sibling repos.
11. **FR-00.11** A GitHub Actions workflow MUST run `ci` on push/PR, and a deploy workflow MUST publish
    the built app to GitHub Pages (matching how the sibling demos deploy).
12. **FR-00.12** **Vertical slice:** the running app MUST demonstrate at least one end-to-end manual
    action through the state seam — e.g. a "drop skull" control increments a tracked skull count, and
    placing a foe at a board location renders a token in both 2D and 3D.

## 5. Non-Goals (Out of Scope)

- Any real game rules, turn validation, or win/loss logic (that's the official app's job; never UTDD's).
- The official-app BLE connection / Node FakeTower (PRD-05).
- Final visual design / theming polish (functional shell only here).
- Online multiplayer (PRD-06).

## 6. Design Considerations

- Three-pane layout: tower + board can share the single 3D canvas (`BoardStageView` 3D mode), with the
  player board as a side/bottom panel. On narrow screens, panes stack or become tabs.
- Wrapping imperative views: the React tree owns *where* the view mounts; the view owns its own canvas
  and render loop. Treat the UD view like an "escape hatch" ref, not React-rendered children.
- Follow the sibling repos' look for parity (they ship `TOWER_DISPLAY_CSS` and example chrome to crib).

## 7. Technical Considerations

- The UD libraries are ESM, Three.js-based, and were authored for Vite + vanilla TS — Vite is the
  natural fit and avoids SSR pitfalls (no Next.js; this is a client-only SPA).
- `three`, `gsap`, `@dimforge/rapier3d-compat`, and the three UDT libs are externalized peers — a
  duplicate `three` will break the shared scene, hence FR-00.3.
- `file:` links mean changes in sibling repos require a rebuild of their `dist/`; document the dev loop
  (run the lib's `build`/`watch`, then UTDD picks it up).
- State-source snapshots (the current `TowerState`/`BoardState`) MUST stay plain **JSON-serializable**
  objects, so PRD-04's single `GameSession` save/share object is just `JSON.stringify` of the composed
  state — don't put class instances or non-serializable values into the tracked state.
- Suggested layout:
  ```
  src/
    app/            # shell, layout, providers
    features/{tower,board,player-board,session}/
    sources/        # TowerStateSource, BoardStateSource, ManualSource
    state/          # Zustand stores
    lib/            # React wrappers around BoardStageView / Tower3DView
  public/assets/{tower.glb,board.png,tokens/}
  ```

## 8. Non-Functional Requirements & Constraints

- **Platform/browser:** client-only SPA targeting Chromium-based + Firefox + Safari desktop. No
  backend; no SSR. (Web Bluetooth is irrelevant to MVP — the official-app connection is PRD-05 and
  needs a Node host, not the browser.)
- **Persistence:** local only (localStorage) for MVP; no accounts or cloud.
- **Performance / asset weight:** the bundled `board.png` is ~22 MB and `UltimateDarkTowerDisplay`
  currently inlines it into its JS (~30 MB chunk, fetched only when 3D loads). This hurts first 3D
  load and must be tracked: keep the 3D path lazy, and slim the image upstream (a fix is already
  filed against the Display lib). Document acceptable load targets once measured.
- **Determinism for tests:** the dev server's dep-optimizer reloads on first run; CI/tests must not
  depend on dev timing (use the production build or unit tests for verification).
- **Testing strategy:** unit-test the state-source + store logic (sources are DOM-free and the prime
  target — see the vertical-slice tests); smoke-test that the libraries import and the stage mounts;
  defer heavy 3D-render assertions to manual/preview verification. Run via Vitest in `npm test`/`ci`.
- **Accessibility:** baseline keyboard focus + labels on controls; full a11y is a later concern.

## 9. Success Metrics

- `npm install` resolves all `file:` links; `npm run dev` boots with no console errors.
- `npm run ci` passes (lint + typecheck + test + build).
- The 3D scene shows the tower with the board disc; switching `BoardStageView` modes works.
- Exactly one `three` instance resolves.
- The vertical-slice action updates UI + 3D together.

## 10. Open Questions

- **Test runner:** Vitest (Vite-native, recommended) vs Jest (sibling-repo parity)?
- **State library:** Zustand (recommended, light) vs Redux Toolkit?
- **Asset pipeline:** copy lib example assets into `public/`, symlink, or fetch from a CDN/the demo
  sites?

---

## Appendix: worked task list (ai-dev-tasks style)

This is the kind of breakdown `generate-tasks.md` would produce. Use it as the template for the other
PRDs.

- **1.0 Initialize repo & toolchain**
  - 1.1 `npm create vite@latest` (react-ts); commit baseline
  - 1.2 Enable strict `tsconfig`; set up path aliases
  - 1.3 Add ESLint + Prettier configs mirroring sibling repos
  - 1.4 Add the test runner + a smoke test
  - 1.5 Add `ci` script, GitHub Actions CI, and Pages deploy workflow
- **2.0 Wire the libraries**
  - 2.1 Add `file:` deps for the three UDT libs + peer `three`/`gsap`/rapier; configure `resolve.dedupe`
  - 2.2 Smoke-import `BoardStageView` and `Tower3DView`; verify single `three`
  - 2.3 Place `tower.glb`, board image, and tokens under `public/assets/`
- **3.0 State-source abstraction**
  - 3.1 Define `TowerStateSource` / `BoardStateSource` interfaces
  - 3.2 Implement `ManualSource` for each
  - 3.3 Create Zustand stores that subscribe to the active source
- **4.0 React integration layer**
  - 4.1 `<TowerBoardStage>` wrapping `BoardStageView` (mount/dispose, ref to controller/tower3D)
  - 4.2 `useBoardController()` hook
  - 4.3 `useTowerState()` hook
- **5.0 App shell vertical slice**
  - 5.1 Three-pane responsive layout
  - 5.2 Mount the stage + a stubbed player board
  - 5.3 One end-to-end manual action (drop-skull count + place-a-foe token)
