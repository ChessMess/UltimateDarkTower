# Board data & reference rosters

*Docs: [Index](../README.md) > App developer > API*

**Before reading:** these are static reference datasets (board geometry + content rosters), not tower
commands — start with the [Getting Started tutorial](../GETTING_STARTED.md) for the device API. They exist
mainly so [UltimateDarkTowerBoard](https://github.com/ChessMess/UltimateDarkTowerBoard) can **re-export**
them rather than vendor a copy; you can use them directly too. **Changelog:** [../../CHANGELOG.md](../../CHANGELOG.md).

```ts
import {
  BOARD_LOCATIONS, BOARD_LOCATION_BY_NAME, BOARD_GROUPINGS,
  BOARD_ANCHORS, BOARD_IMAGE_INFO,
  BOARD_ADJACENCY, neighborsOf, stepDistance, shortestPath,
  HEROES, HERO_BY_ID, MONUMENTS, MONUMENT_BY_ID,
  FOE_STATUSES, FOES, ADVERSARY_ROSTER, ALL_FOES, FOE_BY_ID, FOE_BY_NAME,
} from 'ultimatedarktower';
```

> The seed-parser foe/adversary/ally **enums** (`TIER1_FOES`, `ADVERSARIES`, `ALLIES`, …) and their types
> live in [seed.md](seed.md). This page covers the board geometry and the foe/hero/monument **metadata**.

---

## Board geography

| Export | Type | Purpose |
|---|---|---|
| `BOARD_LOCATIONS` | `BoardLocation[]` | Every named space on the board. |
| `BOARD_LOCATION_BY_NAME` | `Record<string, BoardLocation>` | Name → location lookup. |
| `BOARD_GROUPINGS` | `Record<BoardGrouping, …>` | Locations bucketed by named grouping. |

Types: **`BoardLocation`** (`{ name; kingdom: BoardKingdom; terrain: TerrainType; building?: BuildingType;
grouping; … }`), **`TerrainType`** (`'Hills' | 'Lake' | 'Desert' | 'Mountains' | 'Grasslands' | 'Forest'`),
**`BuildingType`** (`'Bazaar' | 'Village' | 'Sanctuary' | 'Citadel'`), **`BoardKingdom`** (`'north' |
'south' | 'east' | 'west'`), **`BoardGrouping`** (named region union).

## Token-placement anchors

Normalized (resolution-independent) placement coordinates authored against the upright board image — the
data the 2D/3D board renderers use to position tokens.

| Export | Type | Purpose |
|---|---|---|
| `BOARD_ANCHORS` | `BoardAnchorMap` | Per-location anchor slots for token placement. |
| `BOARD_IMAGE_INFO` | `BoardImageInfo` | Board image dimensions + calibration metadata. |

Types: **`Anchor`** (`{ x: number; y: number }`, normalized 0–1), **`AnchorSlot`** (`'building' | 'skull' |
'hero' | 'foe' | 'marker'`), **`LocationAnchors`** (`Partial<Record<AnchorSlot, Anchor>>`),
**`BoardAnchorMap`** (`Record<string, LocationAnchors>`), **`BoardImageInfo`**.

## Movement graph

The board's adjacency graph plus pure BFS helpers for move validation (the library enforces no rules — it
just provides the graph).

| Export | Signature | Purpose |
|---|---|---|
| `BOARD_ADJACENCY` | `BoardAdjacency` | Location → adjacent locations. |
| `neighborsOf` | `(loc: string) => string[]` | Direct neighbors of a location. |
| `stepDistance` | `(a: string, b: string) => number` | Fewest steps between two locations (`-1` if unreachable). |
| `shortestPath` | `(a: string, b: string) => string[]` | A shortest path (inclusive), or `[]` if unreachable. |

```ts
import { neighborsOf, stepDistance, shortestPath } from 'ultimatedarktower';

neighborsOf('Broken Lands');                 // -> adjacent location names
stepDistance('Broken Lands', 'Green Bridge'); // -> hop count (-1 if unreachable)
shortestPath('Broken Lands', 'Green Bridge'); // -> ['Broken Lands', …, 'Green Bridge']
```

## Heroes & monuments

Fixed reference rosters of board content (not seed-encoded).

| Export | Type | Purpose |
|---|---|---|
| `HEROES` | `Hero[]` | All heroes. |
| `HERO_BY_ID` | `Record<HeroId, Hero>` | Id → hero lookup. |
| `MONUMENTS` | `Monument[]` | All monuments. |
| `MONUMENT_BY_ID` | `Record<MonumentId, Monument>` | Id → monument lookup. |

Types: **`Hero`** (`{ id: HeroId; name: string; source: ContentSource; startLocation? }`), **`HeroId`**
(`string`), **`ContentSource`** (`'base' | 'alliances' | 'covenant' | 'expeditions'`), **`Monument`**
(`{ id: MonumentId; name; source }`), **`MonumentId`** (`string`).

## Foe & adversary metadata

Identity metadata (level / tier / kind / source) keyed by the same names the seed parser uses, plus the
in-play status progression.

| Export | Type | Purpose |
|---|---|---|
| `FOE_STATUSES` | `readonly FoeStatus[]` | The in-play progression `['ready', 'savage', 'lethal']`. |
| `FOES` | `Foe[]` | Tiered foes (levels 2–4). |
| `ADVERSARY_ROSTER` | `Foe[]` | Apex adversaries (level 5). |
| `ALL_FOES` | `Foe[]` | `FOES` + `ADVERSARY_ROSTER`. |
| `FOE_BY_ID` | `Record<FoeId, Foe>` | Id → foe lookup. |
| `FOE_BY_NAME` | `Record<FoeName, Foe>` | Name → foe lookup. |

Types: **`FoeStatus`** (`'ready' | 'savage' | 'lethal'`), **`FoeLevel`** (`2 | 3 | 4 | 5`), **`Foe`**
(`{ id: FoeId; name: FoeName; kind: 'foe' | 'adversary'; level: FoeLevel; tier?: 1 | 2 | 3; source:
ContentSource }`), **`FoeId`** (`string`), **`FoeName`** (the seed-parser foe/adversary name union).

---

## See also

- [api/README.md](README.md) — the API reference index
- [seed.md](seed.md) — seed parser + the foe/adversary/ally **enums** and seed types
- [ECOSYSTEM.md](../ECOSYSTEM.md) — how UltimateDarkTowerBoard consumes this data
