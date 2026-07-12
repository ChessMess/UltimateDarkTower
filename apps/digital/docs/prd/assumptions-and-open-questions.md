# UTDD — Assumptions, Verified Facts, Risks & Open Questions

> This is the "what we know vs. what we're assuming" ledger for the PRD suite. It exists so we
> don't build on unverified claims. Every entry is tagged **Verified** (checked against source) or
> **Assumption / Needs verification**. Update it as facts are confirmed.

## How facts were verified

- **Library API** — checked against the built `.d.ts` and source in `../UltimateDarkTower`,
  `../UltimateDarkTowerDisplay`, `../UltimateDarkTowerBoard`, and proven by the working scaffold
  (the app builds, imports resolve, the vertical slice runs).
- **Game rules** — checked against the community-extracted rules at
  `../Mcp Server Return To Dark Tower/src/game-content/*.md`. This is **not** the official rulebook;
  treat mechanical edge cases as provisional until confirmed against official sources.

## Verified facts (safe to build on)

| Fact                                                                                                                                      | Source                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Game runs **6 months**, cooperative, all win/lose together                                                                                | rules.md                               |
| Turns per month: 1p→6, 2p→7, 3p→8, 4p→9 (fewer on Gritty)                                                                                 | rules.md                               |
| Turn = Banner → (move / one heroic action / Reinforce, any order) → **drop 1 skull (mandatory)**                                          | rules.md                               |
| Heroic actions: Cleanse / Battle / Quest; **gain 2 spirit** after any heroic action                                                       | rules.md                               |
| Start resources: **7 warriors, 1 spirit**; base move value typically **3**; spend 1 spirit to double move                                 | rules.md / heroes.md                   |
| Item caps: potions ∞, **gear 1 of each of 6 types**, **treasures max 4**, quest items ∞                                                   | heroes.md                              |
| Corruption: **max 2; 3rd = loss**; removable at a Sanctuary                                                                               | rules.md / glossary.md                 |
| Win = complete main goal **then** defeat adversary. Lose = 3rd corruption / end of month 6 / must drop skull with none left               | rules.md                               |
| Buildings: 16 total (4 kingdoms × Citadel/Sanctuary/Village/Bazaar); ≤3 skulls each, 4th destroys (home-kingdom destruction → corruption) | rules.md                               |
| Foes: levels 2/3/4 chosen at setup; adversary (level 5) spawns only after the main goal is complete                                       | rules.md                               |
| Base heroes (4): Brutal Warlord, Relic Hunter, Orphaned Scion, Spymaster                                                                  | udtHeroes.ts / heroes.md               |
| 60 board locations; buildings are a **property of named locations**, not locations themselves                                             | udtGameBoard.ts                        |
| Official app connects to the tower as a **BLE peripheral** (browser can't be one)                                                         | udtSync FakeTower / Web Bluetooth spec |

## Known discrepancies & risks

1. **Foe status: 3 vs 5 states — RESOLVED.** The library's `FOE_STATUSES` originally modeled **3**
   (`ready → savage → lethal`), but the rules glossary lists **5** (`Panicked → Unsteady → Ready →
Savage → Lethal`). Decision: extend the library. `ultimatedarktower`'s `FoeStatus`/`FOE_STATUSES`
   were widened to all 5 (`panicked | unsteady | ready | savage | lethal`, lowest→highest threat) in
   `src/udtFoes.ts`; `dist` rebuilt locally so UTDD picks it up via the `file:` symlink. **Not yet
   released to npm** — a version bump + CHANGELOG + full lib CI are deferred to a later release pass.

2. **Hero/adversary/item/virtue specifics are not in code or the rules text.** Banner actions, the
   3-active/3-inactive virtue tile text, adversary mechanics, gear/treasure/potion effects, dungeon
   room generation, and main-goal win conditions live on physical cards and inside the official app.
   The local game-content explicitly marks these **TODO**. UTDD's player board (PRD-03) must source
   this data separately and verify it — and see the IP note below before bundling any of it.

3. **Asset weight.** The bundled `board.png` is ~22 MB and `UltimateDarkTowerDisplay` currently inlines
   it into its JS bundle (~30 MB chunk) — see PRD-00 Non-Functional Requirements. Affects load time and
   is being addressed upstream.

4. **Board placement instructions are out-of-band.** The BLE tower protocol carries _tower_ state, not
   _board_ placement. So "the app tells you where to place a foe" cannot arrive over the tower channel —
   in MVP the player reads the official app and places manually; PRD-05 must define how/if this is ever
   automated.

## Open questions (carried from the PRDs)

- **Player-board card text** — how complete for MVP, and is bundling RTDT card text acceptable (IP)?
- **Tooling** — Vitest vs Jest (chose Vitest); Zustand vs Redux (chose Zustand).
- **Assets** — copy example assets vs CDN; how to slim `board.png`.
- **PRD-05 packaging** — extend UDT Sync's Electron host vs a dedicated UTDD host.

## Intellectual property & asset provenance

_Return to Dark Tower_ and its art, card text, sounds, board, and tower model are © Restoration Games.
UTDD is an **unofficial, fan-made** companion in the same family as the other UDT libraries. Intent:

- Use the existing UDT libraries' assets/data for development and personal play; do **not** redistribute
  copyrighted art/audio/text beyond what those libraries already do.
- Treat any extracted card/rules text as reference for personal use; confirm licensing before shipping a
  public build that bundles game content.
- This stance must be settled before any public/hosted release (see PRD-04 / a future release PRD).
