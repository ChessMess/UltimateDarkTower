---
'ultimatedarktowerboard': minor
---

Add `skullsInKingdom(state, kingdom, board?)` and `destroyedInKingdom(state, kingdom, board?)`
selectors — the per-kingdom rollup the editing UI's Summary panel already computed internally,
now available to any host. `board` is optional (defaults to the built-in RtDT board), matching
`createDefaultBoardState`'s existing optional-board idiom.

A destroyed building now renders as the `wasteland` marker (2D and 3D) instead of a
programmatic red X — a real host asset instead of a placeholder, using the same art-resolution
path every other token goes through (falls back to a tinted disc when the asset is missing). The
editing UI's Summary panel column is renamed "Razed" → "Destroyed" to match; nothing else about
its shape changed (still per-kingdom heroes/foes/skulls/destroyed/markers/quests/adversary
counts).
