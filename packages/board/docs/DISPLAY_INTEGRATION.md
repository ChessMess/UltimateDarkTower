# Display Integration

The 3D board is a Display `ScenePlugin` (from the `ultimatedarktowerboard/plugin` subpath) attached to a
live `Tower3DView`. `three` and `ultimatedarktowerdisplay` are **optional peers** — only this subpath
imports them; the `.` entry stays three-free.

```ts
import { TowerRenderView } from 'ultimatedarktowerdisplay';
import { attachBoard3D } from 'ultimatedarktowerboard/plugin';

const view = new TowerRenderView({ container, modelUrl }); // a tower GLB
const board = view.view3D && attachBoard3D(view.view3D, {
  boardState,                 // initial BoardState (the plugin reads; the host owns mutations)
  assetBaseUrl: './tokens/',  // token art, loaded at runtime (never bundled)
  boardImageUrl: './board.png', // render OUR board on the disc + hide Display's (omit to keep Display's)
  onTokenSelect: (sel) => { /* { kind, id, location } — same shape as the 2D map */ },
});

// Push board-state updates from your controller (Display's onStateApplied is *tower* state, not board):
controller.subscribe((e) => { if (e.type === 'change') board?.setBoardState(e.state); });
```

`attachBoard3D(view3D, options)` wraps `attachScenePlugin` (mirroring Display's own
`attachSkullPhysics`) and returns a `Board3DHandle` — `{ setBoardState, setFocus, dispose }`. For advanced
wiring you can construct `new Board3DPlugin(view3D, options)` and attach it yourself.

## What the plugin does

- On model load it caches `view3D.getDiscMetrics()` and places tokens. With a `boardImageUrl` it also
  renders the board's **own** surface on the disc (a flat textured quad whose corners run through the same
  `anchorToWorld` mapping as the tokens, so the printed art is pixel-aligned with placement) and calls
  `view3D.setBoardDiscEnabled(false)` to hide Display's placeholder (the disc **mesh** + physics floor
  stay). Without a `boardImageUrl`, Display's board stays visible and tokens are placed on it.
- Tokens are **image billboards** (`THREE.Sprite`) on the disc top surface, positioned with Display 0.9's
  `anchorToWorld(anchor, discMetrics, northKingdom)`. They reuse the 2D map's asset conventions
  (`assetBaseUrl`, `${group}/${kebab(id)}.png`, programmatic fallback; heroes always fall back). A
  `tokenFactory` option is the seam for real 3D models later.
- All `Object3D`s are built with the **consumer's** `three` (the externalized peer). Keep a single `three`
  instance — in a bundler, dedupe it (the example sets `resolve.dedupe: ['three']`).

## Orientation (`northKingdom`)

Placement uses a board-owned `northKingdom` option (default `0`), **not** Display's lighting config — once
the disc art is hidden, the disc's own `northKingdom` is a don't-care. Default `0` matches Display's base
config and the calibrated `board.png`; a live one-marker check confirmed tokens land on the printed
buildings at `nk = 0`. Pass a different value only if you re-enable and rotate the disc art.

## Selection & focus

- Selection is wired through `ctx.registerPointerTarget`; a token `onPointerDown` consumes the gesture
  (so orbit / side-select don't fire) and emits `onTokenSelect({ kind, id, location })`. It is renderer-local
  UI state — never written to `BoardState`. (Add/move/delete editing is M4.)
- The 3D camera is the focus source of truth: `setFocus({ kingdom, angle })` maps `kingdom` → `selectSide`
  (cardinal identity; `all` leaves the camera put) and `angle` → `applyCameraConfig` (overhead/isometric,
  tunable). Camera side changes are reflected back via the `onFocusChange` option. Because the camera always
  faces a side, there is no 3D equivalent of `all` — apps that want `all` to mean "don't filter" should keep
  their focus controls canonical (as the example does) rather than letting every camera move re-filter.
