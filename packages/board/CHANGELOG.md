# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial repository scaffold per `UltimateDarkTowerBoard-Scaffolding-Spec.md` v0.2:
  two-entry package (`.` three-free core + `./plugin` 3D board), headless state core
  (BoardState / commands / reducer / controller / events / zod-v4 save-load), text
  readout + 2D map renderer stubs, `Board3DPlugin` implementing Display's `ScenePlugin`,
  UDT data re-exports (`BOARD_LOCATIONS` + rosters), example app, stub test suites,
  docs stubs, and CI/Pages/Publish workflows.

### Notes / TODO before features

- Peer ranges are pinned to currently-published siblings (`ultimatedarktower@^4.0.0`,
  `ultimatedarktowerdisplay@^0.8.0`). **Bump to the releases that carry the board
  datasets/graph helpers and `anchorToWorld`** once they ship (spec §2 / §12-Q2).
- `BOARD_ANCHORS` / adjacency / `stepDistance` re-exports and the 3D placement code are
  stubbed/pending until upstream lands them.
- Commit the generated `package-lock.json` so CI's `npm ci` is reproducible.
