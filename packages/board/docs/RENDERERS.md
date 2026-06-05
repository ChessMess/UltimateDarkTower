# Renderers

> Scaffold stub.

| Renderer | Entry | Notes |
| --- | --- | --- |
| `BoardReadout` | `.` | Deterministic text; the snapshot test target. |
| `BoardMap2D` | `.` | SVG/canvas over the board image (stub — needs `BOARD_ANCHORS`). |
| `Board3DPlugin` | `./plugin` | 3D in-scene board; a Display `ScenePlugin`. |

All share the `BoardFocus` selector (`all` | `north` | `east` | `south` | `west`). The cardinal
values map to Display's `selectSide`. Display has **no** named overhead/isometric presets — compute
them via `CameraConfig` (`elevationFactor` / `targetHeightFactor`).
