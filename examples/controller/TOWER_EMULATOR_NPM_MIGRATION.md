# Tower Emulator — npm Migration Guide

When `ultimatedarktowerdisplay` is published to npm, replace the local `file:` path reference with the versioned package. Only two files need to change.

## Step 1 — `package.json`

```diff
- "ultimatedarktowerdisplay": "file:../../UltimateDarkTowerDisplay"
+ "ultimatedarktowerdisplay": "^<published-version>"
```

Run `npm install` to pull the published package.

## Step 2 — `build-examples.js`

Remove the `alias` entries from both esbuild calls (TowerController and TowerEmulator builds). Once the package is in `node_modules`, esbuild resolves both packages automatically.

```diff
- alias: {
-     "ultimatedarktowerdisplay": path.resolve(__dirname, "../UltimateDarkTowerDisplay/dist/index.esm.js"),
-     "ultimatedarktower": path.resolve(__dirname, "src/index.ts"),
- },
```

> **Why both aliases?** The current local build of `ultimatedarktowerdisplay` imports `ultimatedarktower` as an external peer dep. The `ultimatedarktower` alias redirects that to our local TypeScript source so esbuild can bundle it cleanly. Once both packages are on npm and properly installed, neither alias is needed.

## Nothing else changes

- `TowerEmulatorAdapter.ts` — no changes
- `TowerEmulator.ts` — import path `'ultimatedarktowerdisplay'` already correct
- `TowerEmulator.html` — no changes
- `TowerController.ts` — no changes
- `TowerController.html` — no changes

## Checklist

- [ ] Confirm published package name matches `ultimatedarktowerdisplay`
- [ ] Confirm `TowerDisplay`, `applyState()`, and `showIdle()` signatures match current usage
- [ ] Update `package.json` devDependency
- [ ] Remove `alias` from both esbuild calls in `build-examples.js`
- [ ] `npm install && npm run build:examples` — verify bundle succeeds
- [ ] Open `dist/examples/controller/TowerController.html`, select "Tower Emulator", click Connect, verify display window opens and updates
