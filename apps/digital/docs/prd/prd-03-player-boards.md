# PRD-03 — Digital Player Boards

> MVP feature. Depends on PRD-00. Read [_overview.md](_overview.md) first.

## 1. Introduction / Overview

Each hero has a physical player board the official app does **not** track. UTDD provides a digital
player board per hero (1–4 heroes for solo play) so the player can place and track the cards, tokens,
and virtues they'd manage in the physical game: warriors, spirit, corruption, potions, gear, treasures,
quest items, companions, and virtue tiles. This is a **player-owned tracker** — UTDD stores and
displays the values; it does not enforce rules or costs.

## 2. Goals

- A player board per active hero (up to 4), each showing the hero's identity and tracked state.
- Let the player adjust every tracked resource and place/remove cards and virtues.
- Persist player-board state as part of the saved session (see PRD-04).
- Pull hero identity from UDT core and descriptive card/virtue text from the local rules content where
  available.

## 3. User Stories

- _As a player_, I can add and remove warriors and spirit, so I can track my pools as they change.
- _As a player_, I can add a corruption and be clearly warned that a 3rd corruption is a loss, so I
  don't miss it.
- _As a player_, I can mark gear (one of each of the 6 types), treasures (up to 4), potions, quest
  items, and companions I'm carrying.
- _As a player_, I can flip a virtue between inactive and active and see my kingdom virtue, so I can
  track virtue activation.
- _As a player controlling 4 heroes_, I can switch between each hero's board, so I can manage all of
  them in a solo game.

## 4. Functional Requirements

1. **FR-03.1** UTDD MUST support 1–4 hero player boards in one session, each tied to a hero from UDT
   core's `HEROES` roster and assigned a home kingdom.
2. **FR-03.2** Each board MUST track **warriors** and **spirit** as adjustable non-negative counts.
3. **FR-03.3** Each board MUST track **corruption** (0–2 normally); reaching a **3rd** corruption MUST
   be visually flagged as a game-loss condition (display only — no enforcement).
4. **FR-03.4** Each board MUST track **potions**, **treasures** (cap 4), **gear** (one each of the 6
   types), **quest items**, and **companions** — addable/removable.
5. **FR-03.5** Each board MUST track **virtues**: 3 hero virtues that toggle active/inactive, plus the
   hero's kingdom virtue. (Capacity per the base game: 3 active / 3 inactive / 1 kingdom.)
6. **FR-03.6** Where available, card/virtue/companion **descriptive text** SHOULD be shown, sourced
   from the local game-content (`Mcp Server Return to Dark Tower/src/game-content`) or a bundled data
   file derived from it.
7. **FR-03.7** The player MUST be able to switch the active hero board and see all heroes' boards at a
   glance (tabs or a multi-board layout).
8. **FR-03.8** All player-board state MUST be serializable so PRD-04 can save/restore it.

## 5. Non-Goals (Out of Scope)

- Enforcing resource costs, gear effects, advantage math, or any rules (player-owned tracker only).
- Auto-computing battle/quest outcomes.
- Trading between heroes (a multiplayer concern; solo has a single controller). May be revisited.

## 6. Design Considerations

- A compact board card per hero (portrait/name, resource steppers, virtue tiles, item slots) with a
  way to expand for detail/notes.
- Make the corruption track unmistakable as it approaches 3.
- Reuse hero data/art conventions consistent with the board's token art.

## 7. Technical Considerations

- Hero identity from `ultimatedarktower` `HEROES`/`HERO_BY_ID` (base heroes: Brutal Warlord, Relic
  Hunter, Orphaned Scion, Spymaster). Card/virtue/Banner text is **not** in the libs and is
  **incomplete** in the local game-content (it's explicitly marked TODO — "expand from physical
  components"). Treat that text as unverified reference, and note the **IP caveat**: this text is ©
  Restoration Games — confirm licensing before bundling it in a public build (see
  [assumptions-and-open-questions.md](assumptions-and-open-questions.md#intellectual-property--asset-provenance)).
  The virtue model per the rules is **3 active + 3 inactive hero virtues + 1 kingdom virtue**.
- Player-board state is UTDD-native (no UD library models it) — define UTDD's own types and a store;
  keep it independent of `TowerState`/`BoardState`.

## 8. Success Metrics

- 1–4 boards usable in a session; every tracked field adjustable.
- Corruption-loss flag fires at 3.
- State round-trips through save/load (verified with PRD-04).

## 9. Open Questions

Resolved for MVP (decisions made during implementation):

- **Bundled card/virtue/companion text** — _none_. The text is © Restoration Games and the
  local game-content is explicitly TODO, so UTDD ships **no card text**. Instead the player
  **labels their own** gear, treasures, quest items, and companions (free-text lists). Virtue
  tiles are generic ("Virtue 1–3" + "Kingdom") with an optional player label. A curated
  data file can be added later if licensing is cleared.
- **Gear model** — the 6 gear _type_ names aren't available (IP/TODO), so gear is a
  **labeled list capped at 6** ("up to one of each of the 6 types") rather than 6 named
  slots. Same approach for treasures (labeled list capped at 4).
- **Free-form per-hero notes** — **deferred**. `GameProgress.notes` already exists for a
  session-level note; per-hero notes can be added without a schema change beyond a field.

## 10. Implementation status (MVP — built)

Implemented and verified (unit tests + in-browser): 1–4 player boards per session, each
tied to a `HEROES` hero + home kingdom (FR-03.1); adjustable **warriors / spirit / potions**
pools and a **corruption** track that caps at 3 and flags the loss visually (FR-03.2–03.3,
also surfaced as a turn-tracker reminder); **gear** (≤6), **treasures** (≤4), **quest items**,
and **companions** as add/remove labeled lists (FR-03.4); **3 hero virtue tiles + 1 kingdom
virtue** that toggle active/inactive (FR-03.5); the IP-safe "label your own" note in place of
bundled card text (FR-03.6); **hero tabs** to switch boards with a corruption flag per tab
(FR-03.7); and full **save/load round-trip** of the rich board through the `GameSession`
(FR-03.8 — the schema bumped to **v2**). Code: `src/session/playerBoard.ts` (constants +
pure transforms), the extended `PlayerBoard` in `src/session/types.ts`, `createPlayerBoard`
in `src/session/factory.ts`, the `updatePlayerBoard` store action + `usePlayerBoardAction`
hook, and `src/features/player-board/{PlayerBoardPane,PlayerBoardCard}.tsx`.
