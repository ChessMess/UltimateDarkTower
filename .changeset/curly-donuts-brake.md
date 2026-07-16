---
'ultimatedarktowerboard': minor
---

Add `BoardDefinition` injection so hosts can render a board this package doesn't ship (custom
game boards authored in the Creator app).

- New `board?: BoardDefinition` option on `BoardMap2D`, `BoardReadout`, `Board3DPlugin` /
  `attachBoard3D`, `createBoardTower3D`, `BoardRenderView`, `BoardStageView` and `mountBoardUI`,
  plus `createDefaultBoardState(board?)`.
- Exports `RTDT_BOARD_DEFINITION`, `resolveBoard`, `isBoardCalibrated`, `boardScaleFactor` and the
  `BoardDefinition` / `BoardDefLocation` / `BoardDefImageInfo` / `ResolvedBoard` types.
- Token geometry (tuned in image-space px against the 4096² board) now scales to a custom board's
  image by `min(width, height) / 4096`.
- 3D placement remaps a board's anchors onto the disc from its circle calibration; an uncalibrated
  board is 2D-only (`setTowerEnabled(true)` warns and no-ops).

Fully back-compatible: every new option is optional and defaults to the built-in Return to Dark
Tower board, so existing consumers are unaffected — covered by an identity regression test
(rendering with no `board` option is byte-identical to passing `RTDT_BOARD_DEFINITION`, and to a
structural clone of it).
