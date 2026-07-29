---
'ultimatedarktowerdata': patch
---

Fix two transcription typos in the reference data. These are the names apps
display and — now that consumers pick cards from a dropdown rather than typing
them — the exact strings they persist, so the misspellings had started leaking
into saved game state.

- `boxInventory`: the base-game gear card `'LeaTher Armor'` → `'Leather Armor'`.
- Companion Vasa's title `'The Devine'` → `'The Divine'`, in **both**
  `boxInventory` (`Component.description`) and `gameContent.COMPANIONS`
  (`Companion.title`). The two copies are corrected together — leaving one
  behind is exactly the roster drift `tests/nameConsistency.test.ts` exists to
  catch.
