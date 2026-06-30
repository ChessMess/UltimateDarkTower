# Return to Dark Tower — Official Companion App: "Under the Hood" Mechanics Analysis

**v0.3 · Draft for review · Reference / design input · Last updated: 2026-06-25**

> **What this is.** An empirical analysis of the *official* RTDT companion app's hidden
> algorithmic structures, compiled from consecutive test runs against the adversaries
> **Ashstrider** and **The Bane of Omens**, covering all 9 baseline companions. It is
> **reference material** for the Creator/Player toolchain — a picture of how the shipped app
> schedules quests, prices resources, builds virtual combat decks, and assembles dungeons —
> **not a contract the toolchain is required to replicate.** Figures here are observed or inferred
> from limited sample sizes. This version completes the verification pass the v0.1 §5 called for.

> **v0.2 — verification pass (the headline).** Every §1–§4 figure was checked against the
> content repo (`ChessMess/mcp-server-return-to-dark-tower`: `rules.md`, `glossary.md`,
> `adversaries.md`, `buildings.md`, `quests.md`, `items.md`, `lore.md`) and the UDT v4.1.0 roster
> (`udtFoes.ts`, `udtGameBoard.ts`), source-read 2026-06-25. **The decisive result: the content
> repo is rulebook-derived and, by its own explicit TODOs, deliberately omits card- and app-level
> data** — `adversaries.md` defers abilities/cards to the physical cards and app
> (`adversaries.md:38`, `:72`), `quests.md` defers quest requirements/rewards (`quests.md:96`), and
> `items.md` states item names/effects/costs are *"not in the rulebook PDF but … printed on the …
> cards"* (`items.md:80`). The analysis's §1–§4 numerics are **precisely** that card/app-internal
> data, so the great majority of them **cannot be promoted to "confirmed/canonical" from any
> available source.** What *is* source-grounded splits cleanly into two buckets: **(a) every
> entity the analysis names** (the two test adversaries, the boss-example foes, the item-locking
> adversaries, the dungeon location) **resolves in the UDT ecosystem roster**, and **(b) the
> high-level mechanics framing** (foe level = cards drawn, monthly-quest structure, dungeon
> target-room model, building/market structure, Amulet-of-Hope→competitive) is rules-confirmed.
> The numeric specifics remain empirical observations. Per-section **Verification (v0.2)** blocks
> carry the verdicts; §5 is rewritten as a results table; **§6 is new** and maps exactly which
> figures feed schema v0.4 — and the consequence that **they feed block *defaults*, never schema
> *constraints*** (the project's "compose, never redefine / never hardcode counts" stance, and the
> analysis's own "reference, not a contract" banner).

> **v0.3 — play-through findings (the source's owner, ~23 / 72 projected games).** A second
> batch of empirical data from the ongoing official-app play-through — now spanning **three of the
> eight adversaries** (Ashstrider, The Bane of Omens, and **Empress of Shades**, 5 of 9 games in,
> ≈32% of the projected 72-game sample) — refines several v0.2 verdicts. Three results are solid
> enough to move: **(1) §1.1 quest-pool size is now corroborated** — 24 distinct adversary quests
> across exactly 3 adversaries = **8 each**, with no cross-adversary sharing (upgrades the "8
> potential quests" claim from a single-adversary observation to a 3-adversary in-sample
> corroboration; still app-sourced, not rulebook-canonical). **(2) Dungeons have a fixed 6-type
> *archetype* axis** with a fourth name now attested — **Encampments** (joining Caves, Fortresses,
> Shrines) — which is **orthogonal** to the 6 dungeon *traits* (Beast/Magic/…); 34 of a likely 60
> unique dungeon names collected, sharpening the §4.2 anchoring model and its ⚠️ correction. **(3) A
> ~61-quest cross-companion quest pool** is observed (distinct from §2.1's per-game ~5 interactions),
> and the **main companion itself runs a month-indexed arc** — directly relevant because the MVP
> ally **Zaida** is among those being collected. Held pending more coverage: the per-type dungeon
> distribution (Encampments 9 vs 4–6) and the full companion story-arc text. Details land in the
> per-section **Verification (v0.3)** blocks below.

> **Grounding.** Content verified against `mcp-server-return-to-dark-tower` (cloned `--depth 1`,
> read 2026-06-25); `rules.md`/`glossary.md` in that repo are byte-identical to the project copies
> (`diff -q` clean). Roster/board verified against `ultimatedarktower` v4.1.0 (cloned `--depth 1`,
> source-read 2026-06-25): `FOES` (12) and `ADVERSARY_ROSTER` (8) live in **`udtFoes.ts`**, and
> `BOARD_LOCATIONS` (60) in **`udtGameBoard.ts`** — *not* `udtConstants.ts` as some prior notes
> attributed them (`udtConstants.ts` carries the BLE/light/audio surfaces and re-exports nothing
> here); the foe/ally/adversary identity entries also appear in `TOWER_AUDIO_LIBRARY`
> (`udtConstants.ts`, keyed by `category`). The **ally roster is a closed set of 10** — `Gleb`,
> `Grigor`, `Hakan`, `Letha`, `Miras`, `Nimet`, `Tomas`, `Vasa`, `Yana`, `Zaida` — defined as the
> `Ally` union and `ALLIES` array in `udtSeedParser.ts:45–54,76–77` and mirrored in the audio
> library (`udtConstants.ts:270–279`); **Empress of Shades** (the v0.3 third test adversary)
> resolves in `ADVERSARY_ROSTER` (`udtFoes.ts:74`). All citations are `file:line`.

> **Status.** Updated from v0.2. The earlier body (the source analysis and the v0.2 verification
> blocks) is preserved intact for traceability; v0.3 layers in the play-through findings as
> **Verification (v0.3)** additions to §1.1, §2, §2.4, and §4.2, updates the affected §5 rows and
> §6 notes, and adds this banner pair and a changelog entry. Nothing is deleted; refinements are
> stated, not silently applied.

> **Verdict legend (used throughout):**
> ✅ **Confirmed** against rules/content/roster source · 🟡 **Partial** — the entity or concept is
> source-grounded but the specific figure is not · ⬜ **Unverifiable** — card/app-internal data,
> absent from every available source (and explicitly TODO'd out of the content repo) · ⚠️
> **Correction / reconcile** — the claim is contradicted by source or needs rewording.

---

## 1. Adversary Quests & Resource Economy

The companion app manages difficulty scaling by dividing each adversary's 8 potential quests
into strict "Early Game" and "Late Game" pools.

### 1.1 Quest scheduling & pools

- **Early Game (Months 2–3):** 4 potential quests focused on infrastructure degradation
  (e.g., Market attacks).
- **Late Game (Months 4–5):** 4 potential quests forcing direct resource depletion.
- **Flexibility:** ~75% (6 of 8) of an adversary's quest pool can appear interchangeably
  across either of their respective phase months.

> **Verification (v0.2): ⬜ pool sizes & flexibility unverifiable; 🟡 month framing grounded.**
> No per-adversary quest list exists in the content repo: `adversaries.md` ends with a TODO to
> *"Expand with complete adversary list, specific abilities, traits, battle card themes, and
> escalation mechanics from the adversary cards and companion app data"* (`adversaries.md:72`), and
> `quests.md` likewise TODO's *"specific main goal names, quest requirements, and quest reward
> details from the companion app and quest cards"* (`quests.md:96`). So the **8-quest pool, the 4+4
> Early/Late split, and the ~75% (6 of 8) interchangeability are app/card-internal and cannot be
> confirmed.** What *is* grounded is the surrounding **month framing**: the game runs six months
> (`rules.md:51`), monthly quests are issued *"at the start of each month (except the first)"*
> (`rules.md:68`, `quests.md:21`) — so an "Early = Months 2–3 / Late = Months 4–5" window is
> consistent with the rules; only the *assignment of a fixed-size pool* to those windows is
> unverified. "Market" = the treasure market replenished at the Bazaar (`buildings.md:43`,
> `rules.md:20`) — a real, attackable structure, so the *flavor* of "infrastructure / Market
> attacks" is grounded even though the quest counts are not.
>
> **Verification (v0.3): 🟡→✅(in-sample) the 8-quest pool size is now corroborated across 3
> adversaries.** Play-through data (≈23/72 games) records **24 distinct adversary quests across
> exactly 3 adversaries** (Ashstrider, Bane of Omens, Empress of Shades) with **no cross-adversary
> sharing** → **8 per adversary**, matching the v0.1 claim exactly. This is an *empirical
> corroboration*, not a rulebook fact (the source is still the app; `adversaries.md:72` still TODO's
> the per-adversary list), but it upgrades "8 potential quests" from one observation to a
> three-adversary pattern and raises confidence in the §1.3 cost-curve defaults hung off the same
> pool. The 4+4 Early/Late *split* and the ~75% interchangeability remain unverified at this
> granularity. (Collection-completeness aside, not a structural gap: one Ashstrider quest's
> *failure* text is still uncollected — 23 of 24 "complete" with both outcomes.)

### 1.2 Adversary variance

- **Ashstrider:** Heavily features early infrastructure disruption (e.g., *Arsonists in Market*
  appearing in 8/9 games). Dungeon-based quests are strictly gated to the late-game pool.
- **The Bane of Omens:** Shifts dungeon-based quests to the early game. Observed real-world
  appearance frequency for these dungeons (~16.7%) runs below a baseline ~25% structural pool
  probability — attributed to RNG variance over the sample.

> **Verification (v0.2): ✅ both adversaries are real entities; ⬜ the frequencies are observations.**
> **Ashstrider** (`udtFoes.ts:72`, adversary L5) and **Bane of Omens** (`udtFoes.ts:73`, adversary
> L5) both resolve in `ADVERSARY_ROSTER`, so neither is invented. Ashstrider's rulebook signature
> (River-of-Fire tokens; lose 6 warriors crossing; unremovable) is confirmed
> (`adversaries.md:43–46`) but is unrelated to quest frequency. The *"Arsonists in Market 8/9
> games"* rate, the late-gating of Ashstrider's dungeon quests, and the **Bane ~16.7%-vs-~25%**
> figures are **sample-derived observations with no content source** — keep them flagged as
> observed, not structural. (Bane of Omens has *no* prose entry in `adversaries.md`; its only
> source-of-record is the roster id.)

### 1.3 The progression economy

The material cost required to overcome adversary quests shifts predictably as time advances:

| Phase | Months | Core resource costs | Unique mechanics / caps |
| :--- | :--- | :--- | :--- |
| **Early Game** | 2–3 | Gear (2), Potions (3), Treasure (1), Advantages (3) | High structural risk if failed |
| **Mid Game** | 4 | Advanced Spirit (up to 6), strategic Advantages | Increased scale of early-game costs |
| **Late Game** | 5 | Warriors, Spirit, direct Virtue manipulation | Requires gaining / losing / holding active Virtues; Advantages scale up to 7 |

*Toolchain relevance:* this is the closest thing to a reference curve for month-gated resource
pricing — useful as default values when authoring adversary quest blocks and the month-end-check
block, even though the Creator lets authors set costs freely.

> **Verification (v0.2): 🟡 the resource *vocabulary* is grounded; ⬜ every cost/cap number is not.**
> The cost columns are app-internal quest pricing and appear in no content file. The resource
> *types* the table names are all real and well-defined — Gear, Potions, Treasures, Quest Items
> (`items.md:5`, `:42–49`); Warriors and Spirit (`glossary.md:29–39`); the six Advantage types +
> Wild (`glossary.md:9–19`); Virtues, gained/activated by spending Spirit (`glossary.md:88–93`).
> So the table is a **defensible defaults curve in valid vocabulary**, but the specific amounts
> (Gear 2 / Potions 3 / …, Advantages capping at 3→7, Spirit up to 6) are **observed, not
> canonical.** The *Toolchain relevance* note is correct as written: this informs block **defaults**
> only — see §6.

---

## 2. Companion Quests & Story Arcs

The companion recruitment system balances asymmetric player abilities with a standardized
baseline pacing system.

### 2.1 Pacing & the standard game

A standard run reaching Month 6 yields a maximum of **5 companion interactions**:

- 4 "Recruit X" companion quests.
- 1 early-game Quest Item quest (occurring in Month 2 or 3).

> **Verification (v0.2): 🟡 the shape is grounded; ⬜ the counts are observations.**
> The repo confirms the *structure* the analysis describes: a Companion Quest *"provides a new
> companion or quest item when completed"* (`quests.md:25`, `rules.md:70`, `glossary.md:151`), and
> additional companions are *"recruited through monthly companion quests"* (`lore.md:65`). So a
> "4 recruit + 1 item" decomposition is **consistent** with the rules. The **counts themselves**
> (exactly 5 interactions, exactly 4 recruitments) are app-observed and unverifiable.

> **Verification (v0.3): ✅ the 10-ally roster is a closed, source-grounded set; ⬜ the ~61-quest
> *pool* size is a new (distinct) observation.** Two adjacent things are now separated cleanly: §2.1
> is about **per-game** companion interactions (≤5); the play-through reports a **cross-companion
> quest *pool* of ~61 possibilities** (52 of 61 encountered) — a different axis (total authored
> companion quests, not per-game pacing). The pool size is app/card-internal and unverifiable, but
> the gap arithmetic is internally consistent (missing 1 month each for Hakan/Letha/Nimet + 2 months
> each for Vasa/Yana/Zaida = 9 → 61−9 = 52; a further 16 carry victory-text only, i.e. single
> encounters; Month-6 quests carry no failure text by design, since failing the final month ends the
> game). What **is** now firmly grounded is the **ally vocabulary** those quests draw from: UDT
> defines a **closed set of 10 allies** — Gleb, Grigor, Hakan, Letha, Miras, Nimet, Tomas, Vasa,
> Yana, Zaida (`Ally` union / `ALLIES` array, `udtSeedParser.ts:45–54,76–77`; audio library
> `udtConstants.ts:270–279`). Every companion named in the play-through resolves there. One
> reconciliation: the analysis covers *"9 baseline companions"* for recruitment while UDT lists
> **10** allies — the likely explanation is that **Miras** is a *main-companion-for-certain-goals*
> ally (`lore.md:70`) outside the recruit-via-companion-quest pool, not a tenth recruitment track.
> Several of these doubles as *main* companions per goal (`lore.md:70–71`), so "main vs. recruited"
> is a **per-goal role**, not a fixed per-ally property — consistent with rules-engine decision #6.
> **Toolchain-relevant:** the MVP main companion **Zaida** is among the allies running a collectible
> month-indexed quest arc, which is direct evidence that **the main companion itself runs an arc**
> (not only recruited companions) — a concrete input toward the still-open goal→companion mapping
> (project item **D3**).

### 2.2 The Hakan exception

Hakan intentionally breaks standard recruitment parameters:

- He seeds **two** early-game item quests (Months 2 and 3), with a third item obtainable by
  slaying a Dragon.
- He offers one fewer standard recruitment quest and cannot be brought into the party via his
  primary quest line.

> **Verification (v0.2): ✅ Hakan is real; ⬜ the exception specifics unverifiable; ⚠️ reconcile one clause.**
> **Hakan the Artificer** exists as a notable companion *"recruited through companion quests"*
> (`lore.md:69`). The exception mechanics (two M2/M3 item quests, the third item from slaying a
> Dragon, one fewer recruitment quest) are app/card-internal and **unverifiable**. **⚠️ Reconcile:**
> v0.1 says Hakan *"cannot be brought into the party via his primary quest line,"* while
> `lore.md:69` states he *can* be recruited via companion quests. These are not strictly
> contradictory (a *primary quest line* ≠ *companion quests* in general), but the wording reads as a
> conflict; tighten it to "his item-bearing quest line does not itself recruit him; he is instead
> recruited through a separate companion quest" if the observation supports that, or flag as
> unverified. (For context, `lore.md:70–71` also names **Miras the Horselord** and **Letha the
> Dryad** as *main companions for certain goals* — corroborating the goal→companion linkage but not
> Hakan's recruitment detail.)

### 2.3 Month 6 uniformity

On entering the final endgame crunch in Month 6, the app standardizes recruitment: **every
companion quest uniformly costs exactly 2 Spirit.** This hardcoded catch-up mechanic ensures
players can secure a final ally for the Tower breach without being bottlenecked by complex
multi-step resource gates.

> **Verification (v0.2): ⬜ unverifiable (app hardcode).** No content source addresses Month-6
> companion-quest costing. Treat the uniform 2-Spirit figure as an **observed pattern**, not a
> confirmed floor; whether the Hakan case also collapses to it is likewise unverified. (Note: 2
> Spirit is coincidentally the standard post-heroic-action *gain*, `rules.md:100` / `quests.md:51` —
> but that is a different mechanic and should not be read as corroboration.)

### 2.4 Narrative design (story arcs)

Companions feature intentional, progressive text arcs from Months 2 through 6 that reflect their
escalating response to the Tower's corruption.

**Example — Tomas the Scout**

- **Month 3 (Intel):** Already at work, gathering information on enemy forces. A valuable asset
  if convinced.
- **Month 4 (Protection):** Seeks refuge for the common folk to hide them safely from the
  looming menace.
- **Month 5 (Peril):** Explores deep within the earth for an artifact and becomes trapped;
  requires rescue.
- **Month 6 (Resolution):** Realizes the only path forward leads straight to the Tower. Joins
  the final fight.

**Example — Gleb the Bandit**

- **Month 2 (Opportunism):** Sees the chaos as an opportunity to line his pockets. Can be
  bought out.
- **Month 4 (Realization):** Concludes the Tower is becoming more trouble than it's worth.
  Willing to bargain.
- **Month 5 (Alliance):** Troubled by the absolute breakdown of order; actively seeks an
  alliance with assurances.

*Toolchain relevance:* the month-indexed arc structure (one text/quest beat per month, escalating
to a Month-6 resolution) is a clean template for authoring ally story arcs once hero/ally content
lands — and the uniform Month-6 cost is a candidate default for the catch-up case.

> **Verification (v0.2): ⬜ specific arcs unverifiable; ✅ the *template* stands.** **Tomas the
> Scout** and **Gleb the Bandit** do not appear in the content repo, and the per-month text is
> app/card content. The value here is the **month-indexed arc *structure*** (a beat per month,
> escalating to a Month-6 "Resolution"), which is a sound authoring template independent of the
> specific examples — and which dovetails with the still-open month-end `resolution` policy noted
> elsewhere in the project. Keep §2.4 as a *design template*, not a content claim.

**Example — Grigor (completed arc, v0.3)** *— beat structure only; the verbatim app text lives in
the play-through collection, not reproduced here.*

- **Month 2 (Recruit / small-scale):** fighting Tower minions in the hills; convince him to join.
- **Month 3 (Fetch-quest):** seeks a lost heirloom blade ("Foeslayer"); retrieve it and he leads
  your troops.
- **Month 4 (Escalation):** means to battle a giant seasnake; aid him against it.
- **Month 5 (Crisis):** driven to the brink — wandering with bloodlust; bring him back to focus
  his rage.
- **Month 6 (Resolution-as-ally):** honed into a "living weapon"; word that the final fight is at
  hand brings him in.

> **Verification (v0.3): ⬜ specific arc unverifiable; ✅ confirms the template *and* a reusable
> beat motif.** Grigor (`udtSeedParser.ts:46`, audio `udtConstants.ts:271`) is a real ally; the
> per-month text is app content. The arc is a clean instance of the §2.4 template (recruit → fetch →
> escalate → M5 crisis → M6 resolution). The owner's reading — that Grigor *accretes corruptions*
> across the arc (e.g., a Vain-like pull toward Foeslayer, then a Cruel/Feverish/Reckless descent by
> M5) — surfaces a genuinely useful **authoring motif: corruption-as-narrative-beat**, where an
> ally's mid-arc setbacks read as gained corruptions resolved by endgame. That motif is a candidate
> pattern for the Creator's ally-arc authoring, independent of whether the official app implements
> it that way (it doesn't expose it). The corruption *deck* is not enumerated in any available
> source — `glossary.md:72–85` describes corruptions only generically — so claims about specific
> corruption names (present or absent) can't be verified here.

---

## 3. Foes & Combat Deck Mathematics

Combat math relies on a strictly managed virtual card system designed to mimic physical deck
depletion rather than pure randomized generation.

### 3.1 Virtual deck architecture

- Each Foe possesses a virtual combat deck of exactly **10 cards**.
- The deck uses an exact distribution of **two copies each of five unique cards**.
- *System behavior:* the recurring appearance of a duplicate card twice in a single engagement —
  but never three times — indicates the app tracks deck depletion without mid-fight shuffling.

> **Verification (v0.2): ⬜ deck size/distribution unverifiable; ✅ the level→cards-drawn rule is.**
> The 10-card deck and the 2×5 distribution are app-internal and appear in no source;
> `adversaries.md:72` explicitly defers *"battle card themes"* to the cards/app. What **is**
> confirmed and adjacent: a battle draws *"a number of battle cards equal to the foe's level"*
> (`rules.md:136`), and foe **level** is *"how many battle cards you draw (Level 2, 3, 4, or 5 for
> adversary)"* (`glossary.md:124`). That is the number of cards **drawn per battle**, *not* the
> size of the foe's deck — do not conflate the two when encoding `battleDefs`. The MVP foes draw
> 2 / 3 / 4 cards (Brigands L2, Frost Trolls L3, Dragons L4) and Ashstrider draws 5 — all roster-
> and rules-confirmed (`udtFoes.ts:54`, `:59`, `:64`, `:72`).

### 3.2 Keyword vs. boss symmetries

- **Level 2 & 3 Foes:** Decks are built symmetrically around core game mechanics. They include
  one unique card for each Foe keyword (*Beast Frenzy, Humanoid Treachery, Stealth Attack, Magic
  Attack*) alongside a highly devastating *Critical Hit!* card. This ensures baseline player
  advantages mathematically counter predictable card text.
- **Level 4 Foes (Bosses):** Discard the basic keyword mechanics entirely. They feature a unique
  *Critical Hit!* variant alongside four high-tier tactical hazards. Bosses of similar archetypes
  (e.g., the Dragon and the Titan) share 3 of these non-critical cards to maintain a uniform
  "colossus" profile.

*Toolchain relevance:* directly bears on the **foe battle definitions** noted as forthcoming /
identity-only in the current exports. The 10-card / 2×5 depletion model and the keyword-vs-boss
split are strong candidates for the eventual foe battle schema and the Player's combat resolver —
pending verification against `adversaries.md`.

> **Verification (v0.2): ✅ the Critical-Hit card + boss-example entities; ⬜ the keyword set & shared-card behavior; ⚠️ "boss" wording.**
> - **Critical Hit card — ✅ partially confirmed.** Each adversary has *"a unique critical hit
>   card"* and *"unique traits and battle card effects"* (`adversaries.md:66–67`). That confirms the
>   Critical-Hit element **for the level-5 adversary**; it is *not* separately stated for L2–L4 foes,
>   so the claim that L2–L3 *and* L4 foes each carry a crit card/variant is an extrapolation.
> - **Keyword set — ⬜ unverifiable.** The compound keyword names *Beast Frenzy / Humanoid
>   Treachery / Stealth Attack / Magic Attack* appear **nowhere** in content or roster. The
>   underlying **Advantage types** are real — Beast, Magic, Humanoid, Melee, Undead, Stealth, plus
>   Wild (`glossary.md:9–19`) — but note the analysis's four keywords omit Melee/Undead and use
>   card-specific phrasing not present in any source. The "one card per keyword" L2–L3 structure is
>   unverified.
> - **Boss shared-card behavior — ⬜ unverifiable, but ✅ both example entities are real.** The
>   "Dragon and the Titan share 3 cards" claim is app/card-internal. Both entities resolve as real
>   **L4 / Tier-3 foes**: Dragons (`udtFoes.ts:64`) and Titans (`udtFoes.ts:67`). So the example is
>   not invented; only the shared-card count is unverified.
> - **⚠️ "Bosses" wording.** Level 4 is the **top tiered-foe level (Tier 3)**, distinct from the
>   level-5 **adversary** (`adversaries.md:5`, `glossary.md:124`, `udtFoes.ts:63–68` vs `:71–80`).
>   "Boss" is acceptable shorthand for an L4 foe, but the schema must keep L4 foes and the L5
>   adversary as separate roster classes (`FOES` vs `ADVERSARY_ROSTER`).

---

## 4. Quest Items & Dungeons

### 4.1 Inventory breakdown

The base game contains exactly **20 Quest Item cards**, distributed by adversary seeding:

- **Competitive assets:** 4 copies of the *Amulet of Hope* are locked to Competitive Mode play,
  giving a balanced head-start to all players.
- **Companion anchors:** 13 items are tethered to specific companion quests (including Hakan's
  expanded pool).
- **Adversary locks:** the remaining items (*Amulet of Annihilation*, *Bezoar*, *Orb of Pure
  Snow*) seed into the reward pool only when specific *unselected* adversaries (e.g., *Utuk-Ku
  the Ice Herald* or *Gaze Eternal*) are active.

> **Verification (v0.2): ✅ Amulet-of-Hope→competitive + the locking adversaries; ⬜ the 20-count, the 4+13+3 split, and all other item names.**
> - **20-item total & the 4 + 13 + 3 split — ⬜ unverifiable.** `items.md` carries no item names or
>   counts and TODO's them out explicitly: *"specific item names, effects, and costs … not in the
>   rulebook PDF but … printed on the … quest item cards"* (`items.md:80`). It confirms only that
>   Quest Items have **unlimited** carry and come *"from the quest item deck in the box"*
>   (`items.md:34–37`).
> - **Amulet of Hope = competitive — ✅ confirmed.** Competitive setup directs *"Give each player
>   one Amulet of Hope quest item"* (`rules.md:250`). The **"4 copies"** figure is a reasonable
>   **inference** from up-to-4 players (four kingdoms/players, `rules.md:15`), **not** a stated count.
> - **Amulet of Annihilation / Bezoar / Orb of Pure Snow — ⬜ unverifiable.** These names appear in
>   no source.
> - **Adversary-lock list — ✅ entities real, ⬜ relationship unverified.** Both named locking
>   adversaries resolve in the roster: **Gaze Eternal** (`udtFoes.ts:75`) and **Utuk'Ku**
>   (`udtFoes.ts:79`; the roster carries no "the Ice Herald" epithet). The item→adversary *gating
>   relationship* itself is app-internal and unverified. (Competitive mode is post-MVP, so none of
>   §4.1 touches the MVP fixture — see §6.)

### 4.2 Dungeon architecture

Dungeons combine fixed geography with procedural contents:

- **The environment:** between 11 and 13 unique room layouts per environmental archetype (Caves,
  Fortresses, Shrines, etc.). The specific layout of encounters within a run is procedurally
  generated.
- **The anchor:** the geographical location and dungeon name are **statically locked** to the
  map. For example, the *Earthen Warrens* is always categorized as a Cave located in
  *Delmsmire*, regardless of the quest line that forces its discovery.

*Toolchain relevance:* the static-geography / procedural-contents split maps onto the dungeon
sub-editor model (named, map-anchored dungeon node with author-defined room contents). The
competitive-only and adversary-locked item gating is useful context for the item economy, even
though competitive mode is post-MVP.

> **Verification (v0.2): ✅ procedural-contents half + Delmsmire is real; ⬜ the 11–13 count & the dungeon name; ⚠️ the "Cave @ Delmsmire" example conflates two axes.**
> - **Procedural contents / target-room model — ✅ confirmed.** Dungeons spawn from quests, each has
>   a **trait** (Beast/Magic/Humanoid/Melee/Undead/Stealth), the goal is to clear the **target
>   room**, and cleared rooms **persist for any hero** (`quests.md:33–37`, `:55–69`;
>   `glossary.md:156–158`; `rules.md:172–180`). The "procedural contents within fixed geography"
>   framing is sound.
> - **11–13 layouts per archetype — ⬜ unverifiable** (app-internal; no source).
> - **Static anchoring — 🟡 the location is real; the dungeon name is not.** **Delmsmire is a
>   genuine board location** (`udtGameBoard.ts:84`): West kingdom, grouping *The Great Woods*. But
>   *"Earthen Warrens"* appears **nowhere** in UDT or content — the dungeon name is unverified.
> - **⚠️ Correction — "Cave" vs board terrain.** `udtGameBoard.ts:84` records Delmsmire's terrain
>   as **`Forest`**, not Cave. A board location's **terrain** (Desert/Forest/Hills/Grasslands/
>   Mountains/Lake — `glossary.md:107–114`) is a **different axis** from a dungeon **archetype**
>   (Caves/Fortresses/Shrines). The static-anchoring *concept* (a named, map-pinned dungeon whose
>   contents are procedural) is fine and the example location is real, but the specific *"Cave …
>   located in Delmsmire"* phrasing conflates dungeon archetype with kingdom terrain and is not
>   corroborated. If the dungeon sub-editor models an archetype, keep it as a **separate field**
>   from `BOARD_LOCATIONS.terrain`; don't infer one from the other.
>
> **Verification (v0.3): ✅ a fixed dungeon-*archetype* axis (4th name attested); 🟡 the ~60-name
> total + a falsifiable `BOARD_LOCATIONS` hypothesis; ⬜ the per-type distribution (held).**
> - **Archetype axis, orthogonal to traits — ✅ (model) / ⬜ (the number 6).** The play-through
>   confirms dungeons sort into a small fixed set of **archetypes** and names a fourth —
>   **Encampments** — alongside Caves, Fortresses, Shrines. Critically this is a **third, distinct
>   axis**: a dungeon has (i) a **trait** (Beast/Magic/Humanoid/Melee/Undead/Stealth — the Advantage
>   axis, `quests.md:57`), (ii) an **anchor location** (a `BOARD_LOCATIONS` name + its kingdom
>   *terrain*, `udtGameBoard.ts`), and now (iii) an **archetype** (Encampment/Cave/Fortress/Shrine/…
>   — a physical-style axis). This *reinforces* the v0.2 ⚠️ correction: archetype ≠ terrain, and also
>   ≠ trait. (The exact count "6 archetypes" is the owner's inference from the spread; treat the
>   *axis* as confirmed and its *cardinality* as observed.)
> - **~60 names ≈ 60 `BOARD_LOCATIONS` — 🟡 falsifiable hypothesis.** 34 unique dungeon names so far;
>   the owner projects ~60 total, coinciding with the **60 `BOARD_LOCATIONS`** (`udtGameBoard.ts`),
>   suggesting **one uniquely-named dungeon anchored per board location**. This is *name ≠ location*
>   (e.g., "Earthen Warrens" anchored at "Delmsmire"), so the test is whether the ~60 *anchors* are
>   distinct and exhaustive over `BOARD_LOCATIONS`, **not** whether names match. **Checkable against
>   source already in hand:** a (dungeon-name → anchor-location) list diffs directly against the 60
>   `BOARD_LOCATIONS` to confirm or refute one-per-location. Pending those pairs, leave it a
>   hypothesis.
> - **Per-type distribution (Encampments 9 vs others 4–6) — ⬜ held; most likely sampling, not
>   skew.** At 34/60 ≈ 57% coverage, a uniform 10-per-type model predicts ≈5.7 found per type, so a
>   4–6 spread is squarely on expectation and the Encampment 9 reads as a **nearly-exhausted set**
>   (near the 10 cap) rather than uneven distribution. Too early to commit; revisit past ~80%
>   coverage.
> - **⚠️ Reconcile with v0.1's "11–13 room layouts per archetype."** The v0.3 "~10 named dungeons
>   per type" counts **named dungeons**; v0.1's 11–13 counts **room layouts** — plausibly **different
>   axes** (a dungeon contains multiple rooms). Settle which metric each refers to before either
>   feeds a default; do not average or merge them.

---

## 5. Verification results (supersedes the v0.1 "open items" list)

The v0.1 §5 collected items "to confirm against source before they influence schema/engine
defaults." That pass is now done. Verdicts and citations below; legend per the banner.

| v0.1 item | Verdict | Source | Note |
| :--- | :--- | :--- | :--- |
| **§1.1/§1.2 pool sizes & flexibility** (8 quests; 4+4; ~75%) | 🟡 8-per-adversary corroborated in-sample (v0.3); ⬜ split/flex | `adversaries.md:72`, `quests.md:96` (TODO'd); play-through 24=3×8 | Pool **size** corroborated across 3 adversaries (24 distinct, no sharing); 4+4 split & ~75% still unverified; still app-sourced. |
| **§1.2 Ashstrider / Bane frequencies** (8/9; ~16.7% vs ~25%) | ⬜ Unverifiable (entities ✅) | `udtFoes.ts:72,73`; `adversaries.md:43–46` | Both adversaries real; frequencies are sample observations. Bane has no prose entry. |
| **§1.3 month-gated cost table** | ⬜ Unverifiable (vocabulary 🟡) | `items.md`, `glossary.md:9–19,88–93`, `buildings.md:43` | Resource types real; the specific costs/caps are app pricing. Defaults only. |
| **§2.1 pacing** (5 = 4 recruit + 1 item) | 🟡 Shape grounded, counts not | `quests.md:25`, `lore.md:65`, `rules.md:70` | Companion Quest → companion *or* item confirmed; counts are observed. |
| **§2.x ally roster & ~61-quest pool** (v0.3) | ✅ 10-ally closed set / ⬜ pool size | `udtSeedParser.ts:45–54,76–77`, `udtConstants.ts:270–279`; play-through 52/61 | Allies are a closed set of 10 (incl. MVP ally Zaida); the ~61 cross-companion pool is a new, app-internal observation (gap arithmetic consistent). |
| **§2.2 Hakan exception** | ✅ entity / ⬜ specifics / ⚠️ wording | `lore.md:69` (also `:70–71`) | Hakan recruitable via companion quests; "not via primary quest line" clause needs reconciling. |
| **§2.3 Month-6 uniform 2-Spirit** | ⬜ Unverifiable | — | App hardcode. Observed pattern, not a confirmed floor. |
| **§2.4 story arcs** (Tomas, Gleb; +Grigor v0.3) | ⬜ specifics / ✅ template + motif | `udtSeedParser.ts:46` (Grigor); `glossary.md:72–85` | Names/text are app content; arc *structure* confirmed as template. Grigor adds the **corruption-as-narrative-beat** motif (deck not enumerated in source). |
| **§3.1 10-card / 2×5 deck** | ⬜ Unverifiable | `adversaries.md:72` | Level→**cards drawn** is confirmed (`rules.md:136`, `glossary.md:124`); deck **size** is not. |
| **§3.2 L2–L3 keyword set** | ⬜ Unverifiable | `glossary.md:9–19` | Advantage *types* real; the compound keyword names & one-per-keyword structure are not. |
| **§3.2 Critical Hit card** | ✅ (adversary) / 🟡 (foes) | `adversaries.md:66–67` | Confirmed for the L5 adversary; extrapolated to L2–L4 foes. |
| **§3.2 Dragon/Titan share 3 cards** | ⬜ behavior / ✅ entities | `udtFoes.ts:64,67` | Both real L4/T3 foes; the shared-card count is app-internal. |
| **§4.1 20-item count & 4+13+3 split** | ⬜ Unverifiable | `items.md:80` (TODO'd) | No item names/counts in the repo. |
| **§4.1 Amulet of Hope = competitive** | ✅ (4 copies = inference) | `rules.md:250`, `rules.md:15` | "Each player gets one" in competitive; 4 follows from max players, not stated. |
| **§4.1 lock list** (Annihilation/Bezoar/Orb; Utuk'Ku/Gaze) | ⬜ items / ✅ adversaries | `udtFoes.ts:75,79` | Locking adversaries real; item names & gating unverified. |
| **§4.2 11–13 layouts/archetype** | ⬜ Unverifiable; ⚠️ axis ambiguity (v0.3) | — | App-internal. v0.3 reports "~10 *named dungeons* per type" — a possibly *different* axis (named dungeons vs. internal room layouts); reconcile before use. |
| **§4.2 dungeon archetype axis** (v0.3: Caves/Fortresses/Shrines/Encampments) | ✅ axis (model) / ⬜ cardinality | play-through; `quests.md:57`, `udtGameBoard.ts` | A third axis distinct from trait *and* terrain; reinforces the archetype≠terrain correction. "6 types" is observed. |
| **§4.2 ~60 dungeon names ≈ 60 `BOARD_LOCATIONS`** (v0.3) | 🟡 Falsifiable hypothesis | `udtGameBoard.ts` (60 locations); play-through 34 names | One-named-dungeon-per-location is testable by diffing *anchors* (not names) against `BOARD_LOCATIONS`; pending the name→location pairs. |
| **§4.2 procedural-contents model** | ✅ Confirmed | `quests.md:55–69`, `glossary.md:156–158`, `rules.md:172–180` | Trait + target room + persistence all confirmed. |
| **§4.2 Earthen Warrens = Cave @ Delmsmire** | 🟡 location ✅ / ⬜ name / ⚠️ "Cave" | `udtGameBoard.ts:84` | Delmsmire real (terrain **Forest**); dungeon name absent; archetype ≠ terrain. |
| **General — adversary scope** | ✅ Acknowledged | `udtFoes.ts:72,73` | All figures derive from Ashstrider + Bane runs; both real. Keep the scope caveat. |

**The single most important verification outcome:** the content repo is **rulebook-derived and
intentionally card/app-agnostic** — three of its files (`adversaries.md`, `quests.md`, `items.md`)
end with explicit TODOs stating that the very data this analysis quantifies lives on physical
components and in the app, not in the rulebook. Consequently this analysis stays **reference
material**: its entities and high-level mechanics are trustworthy and source-grounded; its **counts,
costs, deck shapes, and frequencies are empirical observations** that must not be hardened into the
schema. That is consistent with the analysis's own v0.1 banner and the project's "never hardcode
counts" stance.

---

## 6. Inputs to schema v0.4 — defaults, not constraints (new in v0.2)

The handoff asks which verified figures feed `battleDefs`, foe `strike`/`movement`, and block
defaults in the upcoming schema v0.4 work. Because the verification above shows nearly all of the
relevant numerics are **observed, not canonical**, the governing rule is:

> **Everything in §1–§4 feeds *author-editable block defaults*, never fixed schema constraints,
> enums, or `required` counts.** The schema continues to resolve entities **by reference** against
> `meta.pins.udt` and **never restates rosters or counts** (schema §7.4 stance; rules-engine §0
> grounding). The only items promotable to *structural* facts are the rules-confirmed ones, and
> those are already owned by UDT/rules, not by this analysis.

**Feeds, by target:**

- **`battleDefs.cards` (foe combat deck shape).** Source of *defaults* only: §3.1 (10-card / 2×5
  depletion) and §3.2 (keyword set; boss 4-hazard + crit; Dragon/Titan shared cards). **Encode as
  default templates an author can edit, clearly tagged "observed — official-app, unverified."** The
  only structurally grounded inputs are: a battle **draws `level` cards** (`rules.md:136`,
  `glossary.md:124` → already a rules fact, not a schema constant), and the **adversary has a unique
  crit card** (`adversaries.md:66–67`). Do **not** encode "deck size = 10" or the keyword names as
  required fields.
- **Foe `strike` / `movement`.** §3.2 keyword/strike behavior and §1.2 strike-cadence observations
  feed **per-foe defaults**. Nothing here is canonical; the rulebook only says a foe's strike event
  fires *"about once a month"* (`glossary.md:126`) and the adversary strikes from within the Tower
  even before spawning (`adversaries.md:32`). Author-editable defaults; not constraints.
- **Adversary-quest / month-end-check block defaults.** §1.3's cost curve and §1.1's pool framing
  feed **default costs and a default 4+4 month grouping** for adversary-quest blocks — in valid
  resource vocabulary, but as editable starting values. §2.3's Month-6 uniform 2-Spirit feeds the
  **companion-quest catch-up default**. All "observed, unverified."
- **Dungeon node defaults.** §4.2's confirmed model (trait + target room + persistence) is
  **structural and already rules-grounded**, so the dungeon node's *mechanics* are safe to specify.
  The **11–13 layout count is a soft default**, and **dungeon archetype must be its own field,
  separate from `BOARD_LOCATIONS.terrain`** (per the §4.2 ⚠️ correction). **v0.3 sharpens this: a
  dungeon carries three independent axes — trait, anchor location, and archetype
  (Encampment/Cave/Fortress/Shrine/…)** — so model all three as distinct fields, and keep
  archetype's enum *open/editable* (its cardinality, "~6", is observed, not canonical). Map-anchoring
  uses real `BOARD_LOCATIONS` names (e.g., `Delmsmire`) by reference; if the ~60-name↔60-location
  hypothesis (§4.2 v0.3) is confirmed via the anchor diff, an author default of "one dungeon per
  location" becomes available — but do not encode it until the diff lands.
- **Ally roster & companion arcs (v0.3).** The **10-ally closed set** (`udtSeedParser.ts` `Ally`
  union) is the canonical vocabulary for the `library` ally references and the still-open
  **goal→companion mapping (D3)**; the Creator resolves allies by id against it, never restating it.
  The §2.4 month-indexed arc template — now shown to apply to the **main companion itself** (the MVP
  ally Zaida runs an arc) — feeds the **ally-arc authoring defaults** (a beat per month M2–M6, M6 as
  resolution), with the optional **corruption-as-narrative-beat** motif as an authoring pattern, not
  a schema requirement. All editable; none canonical.
- **Item economy (post-MVP).** §4.1 is competitive-/adversary-gating context only; **none of it
  touches the MVP fixture** and it should not gate any MVP-scoped v0.4 prop work.

**Scope note for the MVP fixture (Recover Azkol's Treasures; Ashstrider L5; Brigands L2 / Frost
Trolls L3 / Dragons L4; ally Zaida; seed `AA9A-AAGS-W634`).** Every fixture entity is roster-/
seed-confirmed (`udtFoes.ts:54,59,64,72`; ally `Zaida` resolves in `TOWER_AUDIO_LIBRARY` /
`ALL_FOES`-adjacent identity data; the seed round-trips to Core / Heroic / 1P with no main goal — a
Creator selection). But the *combat/quest/economy numbers* those fixture nodes will carry are
exactly the §3/§1 figures shown above to be **observed, not canonical.** So schema v0.4 must author
the fixture's `battleDefs`, foe `strike`/`movement`, and adversary-quest costs as **defaults with
explicit observed-provenance tags**, finalized later against rich content (the project's D1
content-blocked item). This verification pass therefore *pre-stages* D1; it does not close it.

---

*Companion to: Canonical Scenario Schema v0.3 (`scenario.schema.json` @ `schemaVersion 0.3.0`,
`scenario-schema-v0_3.md`; the v0.4 props work this informs), Rules-Engine / Shared-Package Contract
v0.3 (§3.1 ally/companion, §4 effect verbs, §7 validation), Creator Block Catalog v0.3 (foe battle
defs, dungeon sub-editor, adversary-quest & month-end-check blocks). Content verified against
`ChessMess/mcp-server-return-to-dark-tower` (`rules.md`, `glossary.md`, `adversaries.md`,
`buildings.md`, `quests.md`, `items.md`, `lore.md`; source-read 2026-06-25). Roster/board verified
against `ultimatedarktower` v4.1.0 (`udtFoes.ts`, `udtGameBoard.ts`, `udtConstants.ts`,
`udtSeedParser.ts`; source-read 2026-06-25). Play-through findings (v0.3) contributed by the
analysis's owner across 3 of 8 adversaries (≈23/72 projected games). Supersedes: Official App
Analysis v0.2.*

### Changelog

- **v0.3 (2026-06-25)** — **Play-through findings pass (≈23/72 games, 3 of 8 adversaries incl.
  Empress of Shades `udtFoes.ts:74`).** Folded a second empirical batch into the verification
  layer. **Corroborated:** §1.1 quest-pool **size** — 24 distinct adversary quests across exactly 3
  adversaries = 8 each, no cross-adversary sharing (upgrades "8 quests" to a 3-adversary in-sample
  pattern; still app-sourced). **New, grounded:** the **closed 10-ally roster** (`udtSeedParser.ts`
  `Ally` union / `ALLIES`; audio `udtConstants.ts:270–279`) — every play-through companion resolves
  there; reconciled "9 baseline companions" vs UDT's 10 allies via Miras as a main-companion-only
  ally. **New, observed:** a ~61-quest **cross-companion pool** (52/61; gap arithmetic consistent),
  distinct from §2.1 per-game pacing; the **main companion itself runs a month-indexed arc** (MVP
  ally Zaida) — a D3 input. Added the **Grigor** arc (beat structure only, not verbatim text) and
  the **corruption-as-narrative-beat** authoring motif. **Dungeons:** confirmed a fixed
  **archetype** axis (4th name attested — **Encampments** — joining Caves/Fortresses/Shrines),
  *orthogonal* to both trait and terrain; recorded the **~60 names ≈ 60 `BOARD_LOCATIONS`**
  one-per-location hypothesis as falsifiable (diff *anchors*, not names); held the per-type
  distribution (Encampments 9 vs 4–6 ≈ sampling noise at 57% coverage); flagged the
  named-dungeons-vs-room-layouts axis ambiguity against v0.1's "11–13." Updated §5 rows (+3 new) and
  §6 (dungeon three-axis model; ally-roster/arc bullet). Earlier body preserved intact.
- **v0.2 (2026-06-25)** — **Verification pass (completes v0.1 §5).** Checked every §1–§4 figure
  against the content repo and UDT v4.1.0 roster/board, citing `file:line`. Headline finding: the
  content repo is rulebook-derived and explicitly TODO's out card/app data (`adversaries.md:72`,
  `quests.md:96`, `items.md:80`), so the majority of the analysis's numerics — pool sizes (§1.1),
  cost curve (§1.3), recruitment counts (§2.1), Month-6 cost (§2.3), 10-card/2×5 deck (§3.1),
  keyword set (§3.2), 20-item split (§4.1), 11–13 dungeon layouts (§4.2) — are **unverifiable
  app/card data** and remain observations. Confirmed: the **entities** the analysis names all
  resolve in-roster (Ashstrider/Bane `udtFoes.ts:72,73`; Dragons/Titans `:64,67`; Gaze/Utuk'Ku
  `:75,79`; Delmsmire `udtGameBoard.ts:84`); and the **mechanics framing** (level→cards drawn
  `rules.md:136`; adversary crit card `adversaries.md:66–67`; dungeon trait/target-room/persistence
  `quests.md:55–69`; Amulet-of-Hope→competitive `rules.md:250`; 16 buildings/market
  `buildings.md:5,43`). Two **⚠️ corrections**: §2.2 Hakan "primary quest line" clause conflicts
  with `lore.md:69` (reconcile wording); §4.2 "Cave @ Delmsmire" conflates dungeon archetype with
  board **terrain** (`udtGameBoard.ts:84` records Delmsmire as **Forest**) — keep archetype a
  separate field from `BOARD_LOCATIONS.terrain`. Rewrote §5 into a results table; added **§6**
  mapping each figure to its schema-v0.4 target with the governing rule that all of it feeds
  **block defaults, never schema constraints** (pre-stages D1, does not close it). Also corrected a
  source-location note: `FOES`/`ADVERSARY_ROSTER` live in `udtFoes.ts` and `BOARD_LOCATIONS` in
  `udtGameBoard.ts`, not `udtConstants.ts`. v0.1 body preserved intact.
- **v0.1 (2026-06-24)** — Initial draft. Reproduced the source analysis (quest/economy scheduling,
  companion pacing & arcs, combat-deck math, quest-item/dungeon architecture) and added the review
  banner, per-section *Toolchain relevance* lines, and the §5 open-items list.
