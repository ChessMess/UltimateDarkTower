---
'ultimatedarktowerdisplay': minor
---

Add `Tower3DView.onZoomChange` (and the underlying `CameraController.onZoomChange` /
`tickDerivedZoom()`), mirroring the existing `onSideChange` pattern: fired from the same
per-frame camera check, whenever the live camera distance moves by more than a tiny
epsilon. Covers wheel-zoom, orbit-drag zoom, any `applyCameraConfig` call, and the
built-in Center/Reset buttons uniformly — a consumer no longer needs to poll
`getLiveCameraFactors()` to notice the camera has moved. First consumer:
`ultimatedarktowerboard`'s `BoardStageView` zoom-percentage readout.
