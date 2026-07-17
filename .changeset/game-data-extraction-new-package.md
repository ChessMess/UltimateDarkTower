---
'ultimatedarktowerdata': major
---

Initial release. Return to Dark Tower reference data — board locations, foes, heroes, monuments,
box inventory, glyphs, light sequences, the audio-cue catalog, and seed encode/decode — split out
of `ultimatedarktower` (the BLE driver) in its v6.0.0. Zero runtime dependencies, no Bluetooth.

Exported flat at the package root, plus `./board` and `./seed` subpaths for consumers who want a
slice. `gameContent` (a separate, name-colliding gameplay-content dataset — banner actions and
virtues, not the board-identity roster) stays namespaced to avoid shadowing `Hero` / `HEROES` /
`Foe` / `FOES`.

Install this directly when you want the reference data without a Bluetooth dependency — a browser
app, a content tool, a card generator. `ultimatedarktower`, `ultimatedarktowerdisplay`, and
`ultimatedarktowerboard` all depend on it and re-export what they need, so you don't need it
directly if you're already using one of those.
