---
'ultimatedarktowerdisplay': major
---

**Breaking:** the 3D ground disc's board art is now **consumer-supplied** via the new
`boardTextureUrl` option, mirroring how `modelUrl` already works for the tower GLB. The
22 MB `board.png` is no longer statically imported by the library.

**Migration** — pass the URL explicitly:

```ts
new TowerDisplay(container, {
  modelUrl: towerModelUrl,
  boardTextureUrl: boardImageUrl, // NEW — was implicit before
});
```

The package still ships the file at `dist/3d/assets/board.png` (now via a copy plugin,
exactly like `tower.glb`), so reference it through your bundler as before:

```ts
import boardImageUrl from 'ultimatedarktowerdisplay/dist/3d/assets/board.png';
```

When `boardTextureUrl` is omitted the ground disc uses the procedural canvas texture,
regardless of `lighting.boardDisc.source` — `source: 'image'` with no URL is procedural,
since there is no longer anything bundled to load.

**Why:** Vite emits assets from the `transform` hook, _before_ tree-shaking, so a static
`new URL('./assets/board.png', import.meta.url)` forced the 22 MB PNG into the `dist/` of
every downstream app whether it rendered a board or not. Across this repo's deployed site
that was ~85 MB of dead weight — including two apps that never render a board at all, and
two that render one but disable Display's disc (`setBoardDiscEnabled(false)`) and so
downloaded the image only to cover it up.

Consumers that already pass `boardImageUrl` to `ultimatedarktowerboard`'s renderers see no
visual change: that path draws the board's own surface and disables Display's disc anyway.
