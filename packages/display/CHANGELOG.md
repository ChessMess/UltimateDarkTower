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
