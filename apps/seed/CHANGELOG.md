# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-06-29

### Added

- Initial standalone release of the **Seed Decoder**, a browser Vite SPA for decoding and
  reverse-engineering _Return to Dark Tower_ game seeds. Extracted from the
  `UltimateDarkTowerSync` monorepo into its own repository.
- Baseline sessions: enter a seed plus the recorded game configuration, then decode the
  base-34, two-section seed format (setup chars 0–5, RNG chars 6–11).
- Per-character **bit map** visualization with section/field tooltips and confidence coloring.
- **Variant comparison** against the baseline (`compareSeedsRaw`), highlighting which characters
  changed.
- **Field mapping** hypotheses with auto-suggest from collected variants.
- **Game event** logging for post-start observations (foe spawns, dungeons, quests, battles).
- **Export**: copy a structured LLM analysis prompt, or export/import session state as JSON.
- GitHub Pages deployment workflow; live demo at
  <https://chessmess.github.io/UltimateDarkTowerSeed/>.

### Changed

- Ported to **`ultimatedarktower` 5.0.0**, whose seed API moved behind the `seed` namespace.
  All seed imports now use `import { seed as seedApi } from 'ultimatedarktower'` and reference
  members as `seedApi.validateSeed`, `seedApi.decodeSeed`, `seedApi.compareSeedsRaw`,
  `seedApi.dumpSeedChars`, and the `seedApi.*` types.

### Fixed

- Removed a duplicate `./types` import and an unused type import in `llmExport.ts` surfaced when
  the project gained its own ESLint configuration.

[Unreleased]: https://github.com/ChessMess/UltimateDarkTowerSeed/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ChessMess/UltimateDarkTowerSeed/releases/tag/v0.1.0
