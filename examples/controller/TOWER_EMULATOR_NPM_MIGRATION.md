# Tower Emulator — npm Migration Guide

The emulator currently uses an explicit sibling checkout of `../UltimateDarkTowerDisplay` rather than a `file:` dependency in `package.json`. When `ultimatedarktowerdisplay` is published to npm, switch the example imports over to the published package.

## Step 1 — `examples/controller/TowerEmulator.ts`

```diff
- import { TowerRenderView } from '../../../UltimateDarkTowerDisplay/src/index';
- import towerModelUrl from '../../../UltimateDarkTowerDisplay/src/3d/assets/tower.glb';
+ import { TowerRenderView } from 'ultimatedarktowerdisplay';
+ import towerModelUrl from 'ultimatedarktowerdisplay/dist/3d/assets/tower.glb';
```

## Step 2 — `build-examples.js`

Remove the `ultimatedarktower` alias entries once the published display package no longer needs to consume this repo from local TypeScript source during the example build.

```diff
- alias: {
-     "ultimatedarktower": path.resolve(__dirname, "src/index.ts"),
- },
```

> **Why keep `ultimatedarktower` aliased for now?** The local display source still imports `ultimatedarktower` as a peer dependency. The alias redirects that to this repo's local TypeScript source so esbuild can bundle the examples cleanly.

## Nothing else changes

- `TowerEmulatorAdapter.ts` — no changes
- `TowerEmulator.ts` — switch both sibling imports to the published package paths shown above
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
