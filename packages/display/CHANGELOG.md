# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- `TowerSideView` now calls `injectStyles()` so side-view-only mode gets CSS
- JSDoc for `TowerDisplayOptions.renderers` now correctly documents the default as `['readout', 'side-view']`

### Added

- Tests for seal overlay injection, double-dispose safety, and multi-button side selection
- `applySeals(brokenSeals: SealIdentifier[])` method on `TowerDisplay`, `TowerSideView`, and `ITowerDisplay` — hides seal SVG overlays for broken seals on the currently displayed side; re-evaluates when switching sides
- `SealIdentifier` re-exported from the package public API
- `clickToToggleSeals` option on `TowerDisplayOptions` (default `true`) — clicking a seal in the side view toggles its visibility independently of game state; user-toggled state and game-broken state are merged so either alone can hide a seal; toggle state is per-side and is cleared on `dispose()`
- `clickToToggleSeals` public property on `TowerSideView` for consumers using the class directly
- Console logging on seal click: logs the side, level, and new visibility state (or notes when toggle is disabled)

## [0.1.0] - 2026-03-22

### Added

- Initial release
- `TowerDisplay` wrapper class with options-based constructor
- `TowerStateReadout` core DOM renderer
- LED grid rendering with per-light effect labels (on, off, breathe, flicker, etc.)
- Drum position and calibration display with glyph lookup
- Audio sample name resolution via `TOWER_AUDIO_LIBRARY`
- Skull drop detection (beam count delta between consecutive states)
- LED sequence override labels via `TOWER_LIGHT_SEQUENCES`
- Volume description rendering
- Automatic CSS injection via `injectStyles()`
- Interactive example demo page
- TypeScript type exports (`TowerDisplayOptions`, `ITowerDisplay`)
- Dual ESM/CJS build via Vite library mode
