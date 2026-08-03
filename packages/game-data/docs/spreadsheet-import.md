# The RtDT research-spreadsheet import

Provenance for the card datasets in this package — `DUNGEON_ROOMS`, `CARAVAN_ROOMS`,
`FOE_CARDS`, `MONUMENT_CARDS`, `COMPANION_CARDS`, `TREASURES`, `POTIONS_AND_GEAR`,
`CORRUPTIONS`, `QUEST_ITEMS`, `QUESTS`, `SPELLS`, `NATIONS`, and the `borders` / `dungeon`
fields on `BOARD_LOCATIONS`.

They come from two research workbooks (`Dungeons.xlsx`, `Four Kingdoms.xlsx`) compiled by
George Krubski (`gwek01@hotmail.com` / `@gwek` on BoardGameGeek), plus his answers to the
questions the conversion raised and his running BGG thread
[_Lessons from my war against Ashstrider (spoilers)_](https://boardgamegeek.com/thread/3719158/lessons-from-my-war-against-ashstrider-spoilers)
(June–July 2026), where designer Justin Jacobson also weighs in.

Open gaps are tracked in [`open-questions.md`](./open-questions.md).

## How the data was gathered

George is playing every companion against every adversary — 72 projected games, half done
as of late July 2026. Everything here is **observational**: he records cards and rooms as
they come up rather than transcribing a component list, and he speed-runs many games rather
than playing them out. Two consequences the types respect — some sets are **known
incomplete**, and a few entries are **known uncertain**. Neither is guessed at; both carry
`needsReview: true` and a `sourceNote` saying why.

### Cross-check against the BGG thread

The thread gives independent numbers for several things this data also counts. They agree,
which is decent evidence the conversion didn't lose or duplicate rows. Most of these are
asserted in `tests/cardData.test.ts`, so a silent change fails the suite.

| Claim on BGG                                                        | This data                                                 |
| ------------------------------------------------------------------- | --------------------------------------------------------- |
| "20 quest items total, including four copies of the Amulet of Hope" | 17 entries summing to 20 cards ✓                          |
| "DUNGEONS: 46/60" (24 July)                                         | 46 of 60 locations carry a dungeon ✓                      |
| "I've collected the most Encampments – 9"                           | Encampment is the largest type, at 9 ✓                    |
| "11 and 13 unique room types for each dungeon type"                 | 12 rooms + 1 entrance per dungeon ✓                       |
| Sanctuary-regions-have-no-dungeon theory "proven incorrect"         | 2 of the 4 sanctuary locations have one ✓                 |
| "The Dragon … has the same event regardless of level"               | Dragons, Titans and Mormos repeat identical `acts` text ✓ |

## Dungeons & caravans

**Room pools, not maps.** George originally tried to map dungeon layouts, then realised
they are procedurally generated — the same named quest looks completely different in two
games. The map-attempt columns are dead and were dropped.

**Rooms repeat.** A single delve can hit the same room twice or more, so the unique rooms
observed per caravan (11 east / 10 north / 9 west) is a **floor, not a total**. The three
caravans George mapped ran 11–13 rooms long. Dungeon pools look like 12 rooms plus an
entrance and are believed close to complete; caravan pools are not.

**Dungeon ↔ location is one-to-one and stable.** The Earthen Warrens is always a Cave in
Delmsmire regardless of which quest surfaced it — `nameConsistency.test.ts` asserts dungeon
names never repeat across locations. The Forbidden Theater was the sole entry recorded
under two types; George re-checked and confirmed Shrine.

**Berat auto-upgrades.** The companion Berat upgrades a random selection of dungeon rooms
automatically. He does not produce unique room variants, so the sheet's `Berat` column was
scratch and was dropped. It does explain the caravan room `Armament Wagon`, which George has
only ever seen with Berat recruited — hence upgraded text with no initial face.

## Foes

**The dungeon legend is a real rule.** The trait block at the bottom of the Foes sheet
(Cave→Beast, Tomb→Undead, Ruins→Stealth, Fortress→Melee, Encampment→Humanoid, Shrine→Magic)
is printed on the dungeon token: inside a dungeon you may spend only that one advantage
type. It lives in `dungeons.ts` as `DUNGEON_ADVANTAGE`, not buried in the foe data.

**Adversaries are shaped differently.** Their two "When Battling" lines come straight off
the card and sit in the same position as a foe's, but they describe the adversary's own
targeting and effects — they do _not_ map to the two trait slots. So level-5 entries use
`cardText` and levels 2–4 use `whenBattling`. Adversaries have no Ready/Savage/Lethal strike
text at all in the heroic game, so `acts` is simply absent.

**The escalation pattern is a tendency, not a rule.** Most level 2–3 foes widen their blast
radius as they escalate — `ready` hits on-or-adjacent, `savage` hits the kingdom, `lethal`
hits everyone for roughly double. Level 4 foes largely break it: Titans, Mormos and Dragons
repeat identical text at all three statuses. **Read the text, don't infer the progression.**

**Isa the Exile has one trait.** Confirmed, not a gap in the data — and odd enough to be
worth asking the designers about. `cardData.test.ts` asserts Isa is the _only_ such foe.

## Cards

**Treasure groups** mix three different ideas, which the `TreasureGroup` union documents:
`Scroll` and `Wand` are mechanical cycles (spent for a one-off bonus vs. carrying charges);
`Champion` and `Guild` are naming cycles; `Crystal` and `Emissary` are three-card sets;
`Azkol's` marks cards that matter for Zaida's quest.

**Cards with an advantage and no text** (Crystal Blade, Grim Whisper) — the advantage line
is the whole card. **Cards with text and no advantage** (the scrolls, Ring of the Emissary,
Zemayir's Teeth, Robes of the Last Sultan, Azkol's Vambraces, Azkol's Scroll, Jeweled Goblet
of Azkol) genuinely grant no passive bonus; they trade it for a large one-off effect.

**Four Amulets of Hope are real.** Competitive play deals every player one at setup, so a
full four-player game needs four copies — 16 unique items + 4 copies is exactly the 20 quest
items in the box.

**Zaida has no ability** — unlike most companions her card carries only the advantage line.
The sheet's literal `N/A` is dropped rather than stored.

**Complete sets:** 16 quests (four players × four kingdoms in competitive play), 6 spells +
4 invocations (Reverent Astromancer only), 24 corruptions, 8 monuments, 22 companions.

**Incomplete:** four Expeditions gear cards are unreleased — three unnamed, and
`Gilded Alembic` named but with illegible effect text in the only available photo. George
expects one to grant `+1 Humanoid Advantage`, completing the six-advantage gear set alongside
Fell Snares (Beast) and Fulgent Relics (Undead). Justin Jacobson has also confirmed on BGG
that Expeditions adds a `Bloodthirsty` corruption — not in this data, since it hasn't shipped.

## Board

**Border codes confirmed:** `T` = borders the Tower, `B` = borders the edge of the map,
`N`/`S`/`E`/`W` = borders that kingdom. Decoded into `BoardLocation.borders`.

**Only three groupings are printed on the board** — Long Water, The Great Woods and Regal
Run, exactly what `BOARD_GROUPINGS` already had. George also infers Three Sisters,
Tombstones, Kinghills, Ice Fangs and Woldra; **those are not imported**, since
`BoardLocation.grouping` is the printed grouping only.

**The 14 missing dungeons are a live count, not a closed set.** George expects every
location to have exactly one, though he suspects the true total might be 56 rather than 60.
He is missing roughly 2 each in the East and West and 5 each in the North and South.

## What was deliberately not imported

- **`bannersAndVirtues` (64 rows).** It maps 1:1 onto `gameContent.HEROES` +
  `KINGDOM_VIRTUES` — same 10 heroes, same tile names, no unmatched row either side. Of the
  11 text deltas, 10 were the spreadsheet being worse (`adjancent`, `reiniforce`,
  `addiiton`, `Remov`) and one was an outright rules error ("spend **on** Advantages on" for
  Undaunted Aegis's Ascetic, which should read "spend **no** advantages on"). Its only novel
  field was `tileColor` on 18 rows, whose meaning nobody knows.
- **A standalone `REGIONS` roster.** All 60 rows matched `BOARD_LOCATIONS` exactly on name,
  terrain, building, kingdom and official grouping. Only `borders` and `dungeon` were new,
  so those merged into `BoardLocation` rather than shipping a second roster to drift.
- **RPG-only material.** `NATION_RPG_NOTES` (DragonMaster suits and primal beings),
  `HERO_ORIGINS` (hero home kingdoms) and `CompanionCard.rpgTag` are George's design work for
  a "Shadow of the Dark Tower" tabletop campaign, not game data.

## Corrections applied during the import

### Names reconciled with this package's canonical rosters

| Dataset           | Field       | Spreadsheet                       | Canonical                     |
| ----------------- | ----------- | --------------------------------- | ----------------------------- |
| `COMPANION_CARDS` | `hero`      | Dauntless Aegis                   | **Undaunted Aegis**           |
| `FOE_CARDS`       | `name`      | Spine Fiend                       | **Spine Fiends**              |
| `FOE_CARDS`       | `name`      | Frost Troll                       | **Frost Trolls**              |
| `FOE_CARDS`       | `name`      | Lemure                            | **Lemures**                   |
| `FOE_CARDS`       | `name`      | Widowmade Spider                  | **Widowmade Spiders**         |
| `FOE_CARDS`       | `name`      | Titan / Mormo / Dragon            | **Titans / Mormos / Dragons** |
| `FOE_CARDS`       | `name`      | Banes of Omens                    | **Bane of Omens**             |
| `FOE_CARDS`       | `id`/`name` | `utukku` / Utuk-ku the Ice Herald | **`utuk-ku` / Utuk'Ku**       |
| `BOARD_LOCATIONS` | `name`      | Mountains of the Watcher          | **Mountains of the Watchers** |
| `BOARD_LOCATIONS` | `name`      | Akartus                           | **Arkartus**                  |
| `BOARD_LOCATIONS` | `name`      | The Emtpy Glade                   | **The Empty Glade**           |
| `BOARD_LOCATIONS` | `name`      | Greenbridge                       | **Green Bridge**              |
| `BOARD_LOCATIONS` | `name`      | Pearl-of-the-North                | **Pearl of the North**        |
| `BOARD_LOCATIONS` | `grouping`  | Longwater                         | **Long Water**                |

`tests/nameConsistency.test.ts` now enforces all of this — foe cards against `FOE_BY_ID`,
monument cards against `MONUMENT_BY_ID`, companions against `gameContent.COMPANIONS`, and
every quest's location text against `BOARD_LOCATION_BY_NAME`.

### `boxInventory.ts` corrected against the card text

`boxInventory.ts` independently names the same ~130 cards and disagreed on 56 of them, so it
was corrected to the printed card spelling. Five were outright errors:

| Category     | Was                                         | Now                                                                             |
| ------------ | ------------------------------------------- | ------------------------------------------------------------------------------- |
| Treasures    | `Diadem / Ring / Vestments Of The Emmisary` | `… of the Emissary`                                                             |
| Treasures    | `Orhpaned Scion's Charm`                    | `Orphaned Scion's Charm`                                                        |
| Treasures    | `Opal of Protection`                        | `Opal of Projection` — the card reads "complete a monthly quest from any space" |
| Potions      | `Potion Of one Thousand Strides`            | `Potion of One Thousand Strides`                                                |
| Heroic Tests | `Repair The Weeping Damn`                   | `Repair the Weeping Dam`                                                        |

The rest were mechanical title-casing (`Amulet Of Hope`, `Scroll Of The Great Serpent`,
`Perform The Song Of Peril`) that the cards do not use.

### Transcription typos in the rules text

Fixed on import: `strile`→strike, `stringa`→striga, `virue`→virtue, `santuaries`→sanctuaries,
`unleases`→unleashes, `Liingering`→Lingering, `Clease`→Cleanse, `baittle`→battle,
`corrpution`→corruption, `adjancent`→adjacent, `Borgoyn`→Burgoyn, `Adcantages`→Advantages,
`gllyphs`→glyphs, `guilid`→guild, `spirrit`/`spririt`→spirit, `warrirors`/`warriros`→warriors,
`weaknes`→weakness, `encorceelled`→ensorcelled, `acquireed`→acquired, `eqyal`→equal,
`treaasure`→treasure, `Centuar`→Centaur, `Sarcophogi`→Sarcophagi, `Fortresss`→Fortress.

Two names where the two transcriptions disagreed kept the `boxInventory` spelling and are
listed in [`open-questions.md`](./open-questions.md): **Blessed Scepters** (not `Sceptres`)
and **Scroll of Burning Sands** (not `of the Burning Sands`).

## The likely next import

George's BGG thread describes five datasets these workbooks don't contain. They are bigger
and more relational than anything here, so the schema is worth designing before the next
spreadsheet arrives rather than after.

- **Adversary quests** — 8 per adversary (4 early game, months 2–3; 4 late game, months 4–5),
  with both success and failure text. 32/32 collected across four adversaries; one failure
  text missing ("A Targeted Eruption"). Two of the eight require completing a dungeon.
  Roughly 64 total across all 8 adversaries.
- **Companion quests** — 61 possibilities: each of the ten quest companions has a quest for
  each of months 2–6, forming a deliberate per-companion story arc (Justin confirmed the arcs
  are intentional). 54/61 collected, 45/61 failure texts.
- **Guild quests** — 20 total, one per guild per month 2–6. 17/20 collected, 10/20 failures.
- **Foe battle cards** — complete. Each foe has 10 cards: 5 unique × 2 copies, each with 3
  levels. Level 2–3 foes have one card per keyword (Humanoid Treachery, Beast Frenzy, Stealth
  Attack, Magic Attack) plus a unique "Critical Hit!" card; level 4 foes have a Critical Hit
  card plus four others not tied to keywords. Dragons and Titans share 3 of their 4
  non-Critical cards.
- **Adversary battle cards** — complete for Empress of Shades and Gaze Eternal.
- **Game seeds** — recorded from the Empress of Shades games onward, after this repo's seed
  decoder came up in the thread. Ashstrider, Bane of Omens and the early Gaze Eternal games
  predate that and have no seed.
