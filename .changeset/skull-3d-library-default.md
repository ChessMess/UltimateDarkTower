---
'ultimatedarktowerboard': patch
---

Add skull tokens to the library defaults for both 3D models and 2D images:

- `Board3DPlugin.resolveModel()` now falls through to `defaultTokenModelPath()`, mapping skulls
  to a 3D GLB model by convention. Apps no longer need a per-token `tokenArt.skull.model3d`
  override — the library resolves the model at `${assetBaseUrl}markers/skull.glb` automatically.
- `resolveTokenImageFor()` now includes skull in the `OFFICIAL_2D_ICON` table, so both the 2D map
  and 3D sprite fallbacks render the nice `${assetBaseUrl}markers/grey-skull.png` image instead of
  a generic colored disc.
