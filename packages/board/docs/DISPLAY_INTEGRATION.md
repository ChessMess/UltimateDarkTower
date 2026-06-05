# Display Integration

> Scaffold stub.

The 3D board is a Display `ScenePlugin`, attached to a live `Tower3DView`:

```ts
import { TowerRenderView, attachScenePlugin } from 'ultimatedarktowerdisplay';
import { Board3DPlugin } from 'ultimatedarktowerboard/plugin';

const view = new TowerRenderView({ container, modelUrl, overlay: true });
view.view3D?.setBoardDiscEnabled(false); // hide Display's board texture (the disc mesh stays)
if (view.view3D) {
  attachScenePlugin(view.view3D, new Board3DPlugin({ boardState, assetBaseUrl }));
}
```

- `view.view3D` is `Tower3DView | null` — always null-guard it.
- Do token placement in the plugin's `onModelLoaded`, fanning multiples around a slot anchor.
- Mount the dockable UI into `view.getOverlayContainer()` (HUD) and/or `getPanelSlot('right')`.

### Prerequisite (not shipped yet)

Real anchor placement needs Display's **`anchorToWorld`** (a release after 0.8.0) and UDT's
**`BOARD_ANCHORS`** (after 4.0.x). Until both land, `Board3DPlugin.onModelLoaded` is an inert
placeholder. Keep `three` pinned to **Display's exact peer range** (single instance).
