---
'ultimatedarktowercodex': minor
---

New app: **Tower Codex** — a browsable reference for everything
`ultimatedarktowerdata` exports.

Twenty-eight datasets, ~1,300 records: the identity rosters, the full card layer
imported in `55dfad3` (foe/monument/companion cards, treasures, potions and
gear, corruptions, quest items, quests, spells, nations), all 78 dungeon rooms
and 32 caravan rooms, the 60 board locations with their adjacency graph and 212
token spots, the flattened box inventory, the tower's 113 audio cues and light
sequences, and the seed encoding tables.

Each dataset gets a sortable table and a card view; records cross-link on the
shared kebab-case ids — a foe reaches its printed card and its tower sound, a
box component reaches the card that names it, a board location reaches its
dungeon's room pool. Global search covers every record in one pass.

Rows the source author could not fully observe are stamped `needs review` with
their source note shown, and the home page reports the data's known gaps
(6 flagged rows, 14 of 60 locations without an identified dungeon, 4 provisional
Expeditions heroes) rather than leaving them buried in `open-questions.md`.

A registry test asserts the app covers every export of `ultimatedarktowerdata`,
so adding data there fails this app's tests until it is registered.
