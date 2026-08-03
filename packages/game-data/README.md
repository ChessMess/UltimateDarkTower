<h1 align="center">ultimatedarktowerdata</h1>

<p align="center">
  Return to Dark Tower reference data — board locations, foes, heroes, monuments, box inventory, glyphs, and seed parsing for the <a href="https://github.com/ChessMess/UltimateDarkTower"><strong>UltimateDarkTower</strong></a> ecosystem.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/ultimatedarktowerdata"><img alt="npm version" src="https://img.shields.io/npm/v/ultimatedarktowerdata.svg"></a>
  <a href="https://www.npmjs.com/package/ultimatedarktowerdata"><img alt="npm downloads" src="https://img.shields.io/npm/dm/ultimatedarktowerdata.svg"></a>
  <a href="https://github.com/ChessMess/UltimateDarkTower/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/npm/l/ultimatedarktowerdata.svg"></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Ready-blue"></a>
</p>

---

## What this is

Pure Return to Dark Tower reference data, with **zero runtime dependencies** and
no Bluetooth.

Includes:

- **Foes & adversaries** — `FOES`, `ADVERSARY_ROSTER`, `ALL_FOES`, `FOE_BY_ID`, `FOE_BY_NAME`
- **Heroes** — `HEROES`, `HERO_BY_ID`, `HERO_BY_NAME`: one record per hero carrying both board
  identity and the gameplay sheet (banner action, starting and unlockable virtues). The four
  unreleased Expeditions heroes are identity-only until their cards are public.
- **Monuments** — `MONUMENTS`, `MONUMENT_BY_ID`
- **Box inventory** — component/token counts per expansion
- **Board** (`ultimatedarktowerdata/board`) — the 60 built-in locations, layout
  anchors, and the movement adjacency graph (`neighborsOf`, `stepDistance`, `shortestPath`)
- **Seed** (`ultimatedarktowerdata/seed`) — scenario seed encode/decode and the
  deterministic `SystemRandom` RNG
- **Glyphs & audio** — `GLYPHS`, `TOWER_LIGHT_SEQUENCES`, `TOWER_AUDIO_LIBRARY`
  (name/category catalogs; the tower's own byte values, unchanged from `ultimatedarktower`)
- **Card text** — the printed face of every card, keyed by the same ids as the rosters
  above: `FOE_CARDS`, `MONUMENT_CARDS`, `COMPANION_CARDS`, `TREASURES`, `POTIONS_AND_GEAR`,
  `CORRUPTIONS`, `QUEST_ITEMS`, `QUESTS`, `SPELLS`, `NATIONS`
- **Dungeons & caravans** — `DUNGEON_ROOMS` (78 rooms across the six types),
  `DUNGEON_ADVANTAGE` (which advantage each type lets you spend), `CARAVAN_ROOMS`

Board locations also carry `borders` and, where one has been identified, the `dungeon`
found there (46 of 60 so far).

## Install

```bash
npm install ultimatedarktowerdata
```

## Usage

```ts
import { BOARD_LOCATIONS, FOES, HEROES } from 'ultimatedarktowerdata';
import { decodeSeed } from 'ultimatedarktowerdata/seed';
```

You usually don't need this if you're already using `ultimatedarktower` for a
physical tower connection, `ultimatedarktowerdisplay` for a renderer, or
`ultimatedarktowerboard` for a board UI — they depend on this package and
re-export what they need. Install it directly when you want the reference data
**without** a Bluetooth dependency (a browser app, a content tool, a card generator).

## Data provenance

The card, dungeon and caravan datasets were compiled from play by George Krubski
(`@gwek` on BoardGameGeek). Because they are observational, a few sets are known
incomplete — those rows carry `needsReview: true` and a `sourceNote`.
See [`docs/spreadsheet-import.md`](./docs/spreadsheet-import.md) for the full record and
[`docs/open-questions.md`](./docs/open-questions.md) for the outstanding gaps.

## License

MIT — see [LICENSE](./LICENSE). Some elements are © Restoration Games, LLC and are used with permission.

---

## History

Split out of [`ultimatedarktower`](https://www.npmjs.com/package/ultimatedarktower)
(the BLE driver) in v6. The two were entangled only by packaging, not by code —
the driver never read this data, but every consumer of it had to load a
Node-only Bluetooth stack just to get it.
