# BoardStageView — the all-in-one render stage

`BoardStageView` (`ultimatedarktowerboard/stage`) is a **batteries-included** component: one
`new BoardStageView({ container })` gives you everything the [example app](./EXAMPLE.md) shows —
the 2D map + text readout, the **2D / 3D / 2D+3D / PiP** display switcher with a big↔mini **swap**,
a movable/resizable **PiP inset**, **Pop Out** into a window, the **Spin / Pan** drag toggle, the
**N / E / S / W + All** kingdom-zoom bar, the dockable **palette / inspector** editing UI, and a
**3D tower you can turn on and off**.

It is the board-domain analog of Display's `TowerRenderView`: a plain, framework-agnostic class
that orchestrates the lower-level pieces ([`BoardRenderView`](./RENDERERS.md),
[`mountBoardUI`](./RENDERERS.md#dockable-editing-ui), and the
[3D board plugin](./DISPLAY_INTEGRATION.md)) so you don't have to wire them yourself.

```ts
import { BoardStageView } from 'ultimatedarktowerboard/stage';

const stage = new BoardStageView({
  container: document.getElementById('board')!,
  assetBaseUrl: './tokens/',
  boardImageUrl: './board.png',
  modelUrl: './tower.glb',   // omit for a 2D-only stage (no `three` is ever loaded)
});

stage.controller.spawnFoe('foe-1', 'Brigands', 'Dayside'); // mutate via the shared controller
```

It mounts into (and fills) `container`; **you** size the container.

## Lazy 3D — `three` is never loaded until you ask

The stage's static module graph is **three-free**. The 3D tower (Display + `three`) lives behind a
dynamic `import()` and is fetched only when the tower is enabled, so a **2D-only app pays nothing**
for the 3D stack. Enablement:

- `tower3D: 'auto'` (default) — on iff a `modelUrl` is given.
- `tower3D: true` — force on (warns + stays 2D without a `modelUrl`).
- `tower3D: false` — start 2D-only.

Toggle at runtime with `await stage.setTowerEnabled(true | false)`. The first enable loads the 3D
chunk; disabling tears the tower down, hides the 3D-mode pills, and drops to `2d`. For end users the
**2D / 3D / 2D+3D / PiP** pills already cover showing/hiding the 3D view, so there is **no** on/off
button by default; pass `towerToggle: true` to add one (e.g. an app that wants to free the WebGL/`three`
cost on demand).

## Styling

CSS is injected automatically on construction (idempotent), so the stage looks right out of the box.
It is scoped under `.bsv-root` and themeable: every colour reads a `--bsv-*` variable that falls back
to the host's theme token (`--accent`, `--bg-panel`, …) then to a default. Supply your own styles
instead with `injectStyles: false` and import the `BOARD_STAGE_CSS` string (or `injectStageStyles()`).

## Options

| Option | Default | Notes |
| --- | --- | --- |
| `container` | — | **Required.** The stage fills this element. |
| `initialState` | empty board | Seeds the shared controller. |
| `assetBaseUrl` / `boardImageUrl` / `tokenArt` | — | Token art + board image, shared by both renderers. |
| `resolveTokenImage` | — | Override the token-art path; `null` → fallback. |
| `modelUrl` | — | Tower GLB; required to enable the 3D tower. |
| `tower3D` | `'auto'` | `'auto'` \| `true` \| `false` (see above). |
| `towerToggle` | `false` | Add a built-in Tower 3D on/off button (the mode pills already cover most needs). |
| `defaultMode` | `pip-3dbig` (tower on) / `2d` | A stored preference wins. |
| `editingUI` | `true` | `false` to skip; or a `mountBoardUI` config object. |
| `enableZoom` / `maxZoom` / `dragMode` | `true` / `8` / `'rotate'` | Forwarded to the 2D map. |
| `persist` | `true` | Persist mode / drag / PiP inset. `false`, or `{ prefix }` to namespace. |
| `injectStyles` | `true` | Inject `BOARD_STAGE_CSS`. |
| `onTokenSelect` / `onFocusChange` / `onModeChange` / `onTowerToggle` / `onPopOut` | — | Callbacks. |

## API

**Getters:** `controller`, `view` (the inner `BoardRenderView`), `readout`, `selection`,
`locationPick`, `focus`, `map2d`, `tower3D` (the Display view, or `null`), `editingUI`, `root`, `mode`.

**Methods:** `setDisplayMode(mode)`, `swap()`, `setDragMode('rotate' | 'pan')`, `setFocus(focus)`,
`setTowerEnabled(on): Promise<void>`, `popOut()` / `popIn()`, `resetLayout()`, `dispose()`.

`DisplayMode = '2d' | '3d' | '2d3d' | 'pip-2dbig' | 'pip-3dbig'`.

## When to use which entry

| You want… | Use |
| --- | --- |
| Just headless state, the readout, or the 2D map (no chrome) | `ultimatedarktowerboard` ([`BoardRenderView`](./RENDERERS.md)) |
| The full interactive stage (2D + 3D + all controls) | `ultimatedarktowerboard/stage` (**this**) |
| To embed only the 3D board into your own Display scene | `ultimatedarktowerboard/plugin` ([Display integration](./DISPLAY_INTEGRATION.md)) |
