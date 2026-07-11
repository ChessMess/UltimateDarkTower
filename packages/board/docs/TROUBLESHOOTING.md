# Troubleshooting

**`Cannot find module 'ultimatedarktower'` / `ultimatedarktowerdisplay`.** In this repo the siblings
are `file:` devDependencies — check them out next to this repo and build them (`npm run build`) so
their `dist/` exists, then `npm install`. CI does the same: it checks out `UltimateDarkTower` and
`UltimateDarkTowerDisplay` as siblings and builds each from `main` before building this package.

**Two `three` instances / the 3D board renders nothing.** The 3D plugin builds every `Object3D` with
the **consumer's** `three` (an externalized peer); a second copy silently fails to render. Ensure your
app resolves a single `three` — dedupe it in your bundler (the example sets `resolve.dedupe: ['three']`)
or add an npm `overrides`. Also confirm the 3D path has a valid GLB `modelUrl` on the `TowerRenderView`,
and — if you want the board's own surface on the disc — a `boardImageUrl` (otherwise Display's
placeholder board stays and tokens are placed on it).

**A token shows as a flat colored disc instead of art.** That's the **programmatic fallback** — it
renders when the art URL 404s or `resolveTokenImage` returns `null`. Heroes always fall back (no hero
art exists yet). Check `assetBaseUrl` and the `${group}/${kebab(id)}.png` path convention (e.g.
`tokens/foes/brigands.png`), or pass `resolveTokenImage` to map ids to your own URLs.

**The GitHub Pages demo loads but assets 404.** Project sites serve under a subpath
(`/UltimateDarkTowerBoard/`). The example build uses a relative `base` so its hashed bundle and the
`./board.png` / `./tokens/` / `./tower.glb` assets resolve under that subpath; if you fork to a
different repo name and assets 404, set `base` in `vite.example.config.ts` to `'/<your-repo>/'`.

**`npm ci` fails in CI.** Make sure CI checks out **and builds** the sibling repos first (see
`.github/workflows/ci.yml`); the `package-lock.json` is committed so `npm ci` is reproducible.
