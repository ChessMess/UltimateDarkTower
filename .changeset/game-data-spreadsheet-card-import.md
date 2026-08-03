---
'ultimatedarktowerdata': minor
---

Add the Return to Dark Tower card datasets, and reconcile `boxInventory` names against them.

**New exports.** The printed card face for every card, keyed by the same stable ids as the
existing identity rosters: `FOE_CARDS`, `MONUMENT_CARDS`, `COMPANION_CARDS` (all 22 —
the 12 guild companions are new), `TREASURES` (62), `POTIONS_AND_GEAR`, `CORRUPTIONS` (24),
`QUEST_ITEMS`, `QUESTS` (16), `SPELLS`, `NATIONS`, plus `DUNGEON_ROOMS` (78 rooms across
the six dungeon types), `DUNGEON_ADVANTAGE`, `CARAVAN_ROOMS`, and the shared
`AdvantageType` / `ADVANTAGE_TYPES`. Each dataset ships a frozen `_BY_ID` map.

`BoardLocation` gains `borders` (Tower / map edge / neighbouring kingdom) and an optional
`dungeon` (`{ name, type }`), identified for 46 of the 60 locations. Purely additive.

**Data corrections in `boxInventory.ts`.** It independently named the same ~130 cards and
disagreed with the card text on 56 of them; every one is now the printed card spelling.
Five were outright errors — `Diadem/Ring/Vestments Of The Emmisary` → `… of the Emissary`,
`Orhpaned Scion's Charm` → `Orphaned`, `Opal of Protection` → `Opal of Projection`,
`Potion Of one Thousand Strides` → `of One Thousand Strides`, and
`Repair The Weeping Damn` → `Repair the Weeping Dam`. The rest was mechanical title-casing
(`Amulet Of Hope` → `Amulet of Hope`, `Perform The Song Of Peril` → `Perform the Song of
Peril`). **If you match on `boxInventory` component names, they have changed.**

`tests/nameConsistency.test.ts` now enforces the agreement in both directions, so this
class of drift cannot return.

Provenance and the known gaps are in `docs/spreadsheet-import.md` and
`docs/open-questions.md`. Data compiled from play by George Krubski (`@gwek` on
BoardGameGeek); rows he could not fully observe carry `needsReview: true` and a
`sourceNote` rather than a guess.
