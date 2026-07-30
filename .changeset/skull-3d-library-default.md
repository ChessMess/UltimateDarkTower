---
'ultimatedarktowerboard': patch
---

Add skull tokens to the 3D plugin's library defaults: `Board3DPlugin.resolveModel()`
now falls through to a `defaultTokenModelPath()` function (mirroring `defaultTokenImagePath`)
that maps skull tokens to a 3D GLB model by convention. Apps no longer need a
per-token `tokenArt.skull.model3d` override to render skulls as 3D models instead
of flat 2D sprites in the 3D view — the library resolves the model automatically
if it exists at `${assetBaseUrl}markers/skull.glb`.
