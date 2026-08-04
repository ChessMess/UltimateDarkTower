---
'ultimatedarktowerdata': major
---

**One record per entity: the `gameContent` namespace is removed.** `HEROES`
entries now carry the gameplay sheet — `bannerAction`, `defaultVirtues`,
`unlockableVirtues` — alongside board identity, and the foe/adversary/companion
copies are gone in favour of the rosters that already covered them.

Through v2, 10 of the 14 heroes existed twice: identity in `heroes.ts` keyed by a
stable `id`, and the gameplay sheet in `gameContent.HEROES` keyed by display name
with no `id` at all. Nothing could join the two halves except by matching on a
name string, and the two could drift apart silently. The split was never a
modelling decision — it was a workaround for a `Hero`/`HEROES` name collision,
recorded as such in `src/index.ts`.

The sheet half had **no consumers**, in this repo or its apps. The identity half
has many: `apps/digital` (hero pickers, player boards) and
`packages/board` (default roster, and portrait asset paths keyed by `id`).
So the merge keeps the `id`-keyed roster and folds the sheet into it.

### Breaking

**`gameContent` no longer exists.** Every export moves to a flat one:

| Removed                                                                               | Use instead                                                              |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `gameContent.HEROES`                                                                  | `HERO_BY_NAME` (same name keys) or `HERO_BY_ID`                          |
| `gameContent.heroes`                                                                  | `HEROES`                                                                 |
| `gameContent.FOES`                                                                    | `FOES` — same 12, plus `id`, `kind`, `tier`, `source`                    |
| `gameContent.ADVERSARIES`                                                             | `ADVERSARY_ROSTER` — same 8, plus `id`, `tier`, `source`                 |
| `gameContent.COMPANIONS`                                                              | `COMPANION_CARDS` — a superset; the quest ten are the rows with `quest`  |
| `gameContent.KINGDOM_VIRTUES`                                                         | `KINGDOM_VIRTUES` (now flat, from `virtues.ts`)                          |
| `gameContent.kingdomVirtues`                                                          | `kingdomVirtues`                                                         |
| `gameContent.Virtue`                                                                  | `Virtue`                                                                 |
| `gameContent.Hero`                                                                    | `Hero`                                                                   |
| `gameContent.Foe` / `.Adversary` / `.Companion`                                       | `Foe` / `CompanionCard`                                                  |
| `gameContent.HeroName`, `.FoeName`, `.AdversaryName`, `.CompanionName`, `.VirtueName` | `string` — these are lists, not keyed literal maps                       |
| `gameContent.HeroExpansion`                                                           | `ContentSource` (`'base' \| 'alliances' \| 'covenant' \| 'expeditions'`) |

`hero.expansion` (`'Base Game' | 'Alliances' | 'Covenant'`) is gone; it agreed
with `hero.source` on all 10 rows, so `source` is the single vocabulary now.

**Adversaries no longer have their own type.** `gameContent.Adversary` collapses
into `Foe` — `ADVERSARY_ROSTER` is a `readonly Foe[]`, and `ALL_FOES` is
`[...FOES, ...ADVERSARY_ROSTER]`. Annotate with `Foe` wherever you used
`Adversary`; the fields you were reading are all still there, plus `id`, `tier`
and `source`.

```diff
-import { gameContent } from 'ultimatedarktowerdata';
-const banner = gameContent.HEROES['Spymaster'].bannerAction;
-const foes = Object.values(gameContent.FOES);
+import { HERO_BY_NAME, FOES } from 'ultimatedarktowerdata';
+const banner = HERO_BY_NAME['Spymaster'].bannerAction;
+const foes = FOES;
```

### Why the namespace existed, and why it doesn't now

It was never a domain boundary. It held a second, poorer copy of four datasets
the flat rosters already covered — each keyed by display name with **no `id`**,
so the two halves of an entity could only be joined by matching a display string,
and could drift apart silently. Those duplicates were the only things colliding
(`Hero`, `HEROES`, `Foe`, `FOES`, `Adversary`), and the namespace was the
workaround for the collision.

None of them had a single consumer, in this repo or its apps. Removing the
duplicates removed the collisions, which left the namespace with nothing to
protect — so its last member, the kingdom virtues, is now flat in `virtues.ts`.

Nothing was lost in the removal, and each claim is asserted in the suite:

- all 10 hero sheets transferred byte-identical (110 text fields verified)
- all 12 `gameContent.FOES` and 8 `ADVERSARIES` exist in `FOES` /
  `ADVERSARY_ROSTER` at the same level, with ids and sources they lacked
- the 10 quest companions are exactly the `COMPANION_CARDS` rows carrying a
  `quest`, with identical titles — `nameConsistency.test.ts` asserts the 10/12
  split

### Not breaking

`HEROES`, `HERO_BY_ID`, `Hero`, `HeroId` and `ContentSource` keep their shape;
the sheet fields are additive and optional. Existing consumers compile unchanged.

The sheet fields are **optional because four heroes genuinely have no sheet** —
the unreleased Expeditions heroes, whose cards are not public. They carry none of
it rather than a guess, matching how the package treats every other unobserved
row. `heroes.test.ts` asserts a hero has the whole sheet or none of it.

New: `HERO_BY_NAME`, for the name-keyed lookup `gameContent.HEROES` provided, and
`Virtue` / `KINGDOM_VIRTUES` / `kingdomVirtues` / `KingdomDirection` as flat
exports from the new `virtues.ts`.
