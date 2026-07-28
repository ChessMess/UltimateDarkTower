---
'ultimatedarktowerboard': minor
---

Add a floating zoom widget to each `BoardStageView` render pane. Both panes already
supported zoom (2D: cursor-anchored wheel-zoom/pan/spin; 3D: Display's OrbitControls) but
had no visible control, so it was undiscoverable without a wheel or trackpad. A pill-shaped
capsule docks bottom-left of each pane (dimmed until hovered) with circular `−`/`+` buttons
around a live "N%" percentage readout:

- **2D pane**: `− / N% / + / ⟲` (reset), calling a new `BoardMap2D.zoomBy(factor, fx?, fy?)`
  method — the same clamped, focus-bounded math the wheel handler uses, just without a
  wheel event. The percentage is driven by a new `onZoomChange` option on `BoardMap2D`/
  `BoardRenderView`, so it tracks wheel-zoom too, not just the buttons. Hidden when
  `enableZoom: false`.
- **3D pane**: `− / N% / +`, dollying the camera via Display's existing
  `applyCameraConfig({ distanceFactor }, { preserveView: true })` so the orbit angle and
  pan are preserved (no reset button — the 3D pane already has Center/Reset). The
  percentage is driven by Display's new `Tower3DView.onZoomChange` (see the
  `ultimatedarktowerdisplay` changeset), so it's live for wheel-zoom, orbit-drag zoom, and
  Center/Reset too, not just this widget's own buttons.

`BoardStageView.resetLayout()` now also resets the 2D map's zoom/spin, matching the other
layout state it already clears. `createSegmented()`'s items gained an optional `title`
field (sets `title` + `aria-label`) so icon-only buttons like these have accessible names.
