# Rules-Engine + Lockstep Harness — v0.9 (foeOnSpace condition subject — first engine change since v0.6)

**2026-06-27 · Handoff step G (cont.) · Built to Rules-Engine Contract v0.3 / Scenario Schema v0.4 · supersedes engine-notes v0.8**

The shared logic core (the package both Creator-sim and Player-runtime import) plus the L4 lockstep
test that proves *authored == runnable*. v0.2 completed the 36-verb instruction set; v0.3 added the
orchestration layer (battle subflow, trade, turn actions); v0.4 added the dungeon subflow + glyph gate;
v0.5 grew the corpus to all four default endings and made the engine multi-player; v0.6 bound
cross-hero dungeon persistence, a multi-hero terminal loss, and the authored-loss path to executable
lockstep proofs; v0.7 added the multi-hero win, a `flag`-subject authored loss, and the warded-room
block as a stream. **v0.8 closes the two authored-loss subjects v0.7 left on "What's next" and lands the
3P/4P win stretch — again with no engine change**, all in `corpus_test.js`: the **`resource`-subject
authored loss** (driven by the built-in `reinforce` action), the **`sealsRemoved`-subject authored
loss** (driven headless by an `effect.apply` carrying `seal.remove`), and the **2P win generalized to
3P and 4P** (the battle landing on the rotation-determined seat), plus a **multi-hero authored loss**
proving the per-acting-hero `resource` guard fires on the rotated seat. With this, every schema-valid condition subject that already had an engine branch —
`resource / flag / counter / sealsRemoved` — has a lockstep authored-loss proof. **v0.9 takes the one
deliberate engine step the owner authorized: it adds the `foeOnSpace` `evalCondition` branch** (reads the
existing `state.foes[].location`, no new plumbing) and proves it with an authored loss driven by
`foe.spawn` — bringing condition coverage to **5 of 6** subjects. The sixth, `heroAtLocation`, stays
Board-blocked (heroes carry no headless position).

## Files

- `pcg32.js` — engine-local PRNG (§6, decision #2). Deterministic, serializable, seeded by a
  **separate runtime seed** — never the official 12-char seed. *(unchanged)*
- `engine.js` — the reducer. Public API (§2.3): `init` / `step` / `replay` / `serialize` /
  `deserialize` / `digest`, plus `ENGINE_VERSION`, `SUPPORTED_SCHEMA_RANGE`. Near-pure
  `(EngineState, Input) → StepResult` (§5.1); input state never mutated. **v0.9: one additive line** — a
  `foeOnSpace` case in `evalCondition` (`lhs = count of state.foes with location === key`), reading
  existing state with no new plumbing; `ENGINE_VERSION` unchanged (`0.1.0`, as across every prior feature
  pass). It is backward-compatible (a previously runtime-faulting enum subject now evaluates) and caused
  zero regression across all six suites. *(v0.8: none — proofs only. v0.7: none. v0.6: none. v0.5:
  `opts.playerCount`, `rotateActiveHero`, `firstPlayerOfMonth`. v0.4: dungeon node kinds + glyph gate.)*
- `golden-fixture.js` — the playable golden MVP scenario (*Recover Azkol's Treasures*; Ashstrider;
  Brigands/Frost Trolls/Dragons; ally Zaida; seed `AA9A-AAGS-W634`). Schema-valid. **v0.9:** adds one
  more export (now **nine** total). `goldenAuthoredLossFoe` — the same effect.apply-driver splice as the
  seal clone, but the `effect.apply` carries `foe.spawn brigands @the-tower` and the guard reads
  `foeOnSpace gte 2`, so each plain action spawns one foe onto the space and the second fires the loss.
  *(v0.8:* adds two exports. `goldenAuthoredLossResource` — the same one-node guard splice as
  `goldenAuthoredLoss`, but the guard reads `resource warriors gte 9`; the driver is the built-in
  `reinforce` action (+2 → 7 → 9), so a single reinforce fires the loss. `goldenAuthoredLossSeal` — the
  guard reads `sealsRemoved gte 2`; because the golden slice authors **no** native seal-break, the clone
  **supplies the driver** by splicing an `effect.apply` node carrying `[{op:"seal.remove"}]` onto the
  plain-action path just ahead of the guard, so each plain action breaks one seal and the second fires
  the loss. *(v0.7: `goldenAuthoredLossFlag` (`flag vaultCleared eq true`), `goldenWardedVault`
  (spiritCost 1 → 3). v0.6: `goldenAuthoredLoss` (`counter goalProgress gte 2`). v0.5: `action.trade`
  node + `goldenLowSupply` (2) / `goldenAmpleSupply` (99). v0.4: the `azkol-vault-dungeon` 3-room
  dungeon.)*
- `corpus_test.js` — the lockstep loss/win corpus + multi-hero streams. **v0.9: 111 → 121 assertions**
  (added the `foeOnSpace` authored loss — a direct `evalCondition` unit boundary plus the lockstep stream
  — and its L1 re-check; v0.8 had taken it 81 → 111). All green.
- `dungeon_test.js` — the dungeon subflow + glyph gate. 30 assertions, all green. *(unchanged)*
- `lockstep_test.js` — the L4 win/loss harness. 13 assertions, all green. *(unchanged)*
- `verbs_test.js` — the §4.3 instruction-set suite. 47 assertions, all green. *(unchanged)*
- `battle_test.js` — the battle subflow + trade suite. 19 assertions, all green. *(unchanged)*
- `conformance_test.js` — schema L1 (ajv strict). 12 assertions, all green. *(unchanged)*

## What's real (faithful to the contract)

- **The authored `winloss.lossCondition` path is now proven on every engine-supported subject (new).**
  The schema-valid ∩ engine-supported intersection is exactly `resource / flag / counter / sealsRemoved`
  (`month`/`supply` have `evalCondition` branches but are **not** in the schema's condition-subject enum,
  so they fail L1; `foeOnSpace`/`heroAtLocation` are in the enum but have **no** `evalCondition` branch,
  so they fault at runtime — neither is drivable in this slice). v0.6 proved `counter`, v0.7 `flag`, and
  v0.8 closes the set:
  - **`resource`** (`goldenAuthoredLossResource`, `resource warriors gte 9`). `evalCondition`'s
    `resource` branch reads `state.heroes[activeHero][key]`, so the guard watches the **active hero's**
    warrior count. The driver is the built-in **`reinforce`** action (`performAction` → `resource.gain
    warriors +2`, §4.1 once-per-turn latch): heroes start at 7, so one reinforce lifts the active hero
    7 → 9 and the guard fires on that same action (`n-amid → n-lossguard`). A guard-holds check confirms
    a plain `pass` leaves warriors at 7 (< 9) and does not end the game; byte-identical. A 2P stream
    additionally proves the guard is **per-acting-hero** — it reads `state.heroes[activeHero]`, so it
    fires on whichever seat reaches the threshold (hero2 after rotation; symmetrically hero1 first), not a
    fixed seat or a global, distinguishing it from the global `counter`/`flag` guards.
  - **`sealsRemoved`** (`goldenAuthoredLossSeal`, `sealsRemoved gte 2`). The golden slice authors no
    native seal-break, so the clone supplies the driver the minimal, content-free way: an `effect.apply`
    node (a v0.3-spine node kind whose `props.effects` runs the closed effect vocabulary) carrying
    `[{op:"seal.remove"}]` spliced just ahead of the guard. Each plain action breaks one seal
    (`state.sealsRemoved += 1`, a default `"(n)-north"` id into `state.brokenSeals`, a `sealRemoved`
    event), so turn 1's `pass` breaks one (guard holds, 1 < 2), `obs(0)` ends the turn, and turn 2's
    `pass` breaks the second → `loseGame(…, "loss-condition")`. **Grounding (handoff task 2):** the seal
    subsystem's *hardware* face lives in UDT/Display and is adapter-deferred, but `seal.remove`'s
    `tower.program`/`ui.prompt` directives are merely **queued** headless while the `state.sealsRemoved`
    field is **engine-owned and lockstep-deterministic** — so the engine does expose a headless break
    path; the only thing absent from the golden slice was an authored *trigger*, supplied here by the
    `effect.apply` node. Both `effect.apply` (node-kind enum) and `seal.remove` (effect-op enum) are in
    the closed schema vocabularies, so the clone stays L1-valid under ajv strict.
- **`foeOnSpace` is now an engine-supported condition subject — the first engine change since v0.6
  (new).** v0.9 adds one additive `evalCondition` case: `lhs = (state.foes||[]).filter(f => f.location
  === key).length` — `key` is the **space** and lhs is the **count** of foes on it, consistent with the
  other scalar subjects (key selects, value is the threshold). It reads existing state (`state.foes[]`,
  maintained headless by `foe.spawn`/`foe.move`) with no new plumbing, is backward-compatible (a
  previously runtime-faulting enum subject now evaluates), and regressed nothing. `goldenAuthoredLossFoe`
  proves it both as a **direct `evalCondition` unit boundary** (one foe → `gte 1` true / `gte 2` false; a
  different space reads 0) **and** as a **lockstep stream**: a spliced `effect.apply(foe.spawn brigands
  @the-tower)` spawns one foe per plain action, so the guard `foeOnSpace gte 2` holds after the first and
  fires on the second. This brings condition coverage to **5 of 6** subjects; `heroAtLocation` is the
  lone holdout — heroes carry no headless position (`hero.placeOrMove` only emits a `board.mutate`
  directive), so it waits for the Board (E2).
- **The multi-hero win generalizes across seat counts (new).** v0.7 proved the 2P win with the battle
  resolved by the rotated seat (hero2); v0.8 replays the **same** win stream (`quest ×3 → battle → select
  Ashstrider → spend 5 Advantages`) on `golden` at `playerCount: 3` **and** `4`. Rotation is continuous
  (the §107 month-boundary rule is just `turnOrder`-next), so the k-th action across the whole game
  belongs to `turnOrder[(k-1) mod N]` regardless of the seed-drawn month length. The build is 4 actions
  (3 quests + 1 battle), so the battle (action 4) lands on `turnOrder[3 mod N]`: at **3P** it **wraps**
  back to hero1 (the opener), at **4P** it is hero4 (the last seat) — each distinct from 2P's hero2, yet
  each completes the **global** main goal (`goalProgress` reaches 3 from mixed seats) and defeats
  Ashstrider. Both are byte-identical and seed-independent (always `won / adversary-defeated`, always the
  rotation-determined seat).
- **Multi-hero win at 2P, the `flag` authored loss, and the warded-room block stream** *(v0.7, retained)*
  remain lockstep-proven.
- **Cross-hero dungeon persistence, multi-hero terminal loss, and the authored loss-condition path**
  *(v0.6, retained)* remain lockstep-proven (decision #9; §3.1; catalog §5/§107).
- **Multi-hero setup & turn order** (§3.1, §4.5; catalog §107/§132). *(v0.5, retained.)* `init` builds
  `hero1…heroN`, per-player home-kingdom ownership in canonical clockwise order, the dormant complement
  (authored map or canonical fallback; load-faults on a bad split), clockwise `turnOrder`; End Turn
  rotates the seat clockwise (`rotateActiveHero`, 1P no-op so 1P digests stay byte-stable).
- **All four default endings executable + mutual-consent trade** *(v0.5, retained)*; **dungeon subflow +
  glyph gate** *(v0.4, retained)*; **battle subflow on authored `battleDefs.cards`, the turn-action node
  kinds, the skull invariant (no directive ever carries an emergence count — re-asserted across the
  whole v0.8 corpus), engine-intrinsic phase sequencing, byte-identical replays** *(v0.3, retained)*.
- Board/Relay/Display directives are **emitted and recorded, not executed** (headless) — Board (E2),
  Relay (E1), Display targets are unpublished.

## The scripted streams (§9)

- **Win** *(`lockstep_test.js`, 1P)*: `quest ×3` → main goal → Ashstrider spawns → `battle` (spend 5
  Advantages) → all 5 cards cleared → defeated → win.
- **Multi-hero win** *(`corpus_test.js`, `golden` @ 2P)*: the same win stream replayed at 2P; the seat
  rotates across the three pre-spawn quests so hero2 resolves the battle; `goalProgress` completes
  globally at the threshold despite quest alternation; `won / adversary-defeated`, byte-identical,
  seed-independent.
- **Multi-hero win @ 3P / 4P** *(`corpus_test.js`, `golden`)* — **new.** The same win stream at
  `playerCount: 3` and `4`: the battle (action 4) lands on `turnOrder[3 mod N]` — 3P wraps to hero1, 4P
  → hero4 — each `won / adversary-defeated`, byte-identical, seed-independent.
- **Third-corruption loss** *(`lockstep_test.js`)*: `pass ×3` while the tower reports 4 emergent
  skulls/turn → buildings destroyed → 3rd corruption → loss.
- **Empty-supply loss** *(`corpus_test.js`, `goldenLowSupply`)*: `pass / obs(0)` for three turns — the
  drop empties `supply` (2 → 1 → 0), turn 3's Action: End finds it empty → loss. Seed-independent.
- **Out-of-time loss** *(`corpus_test.js`, `goldenAmpleSupply`)*: an auto-driver plays `pass / obs(0)`
  through all six months → Game End → loss; the seed-driven stream is captured and replayed.
- **Multi-hero turn order + trade** *(`corpus_test.js`, `golden` @ 2P)*: ownership `{north:hero1,
  south:hero2}`, dormant `[east,west]`; an atomic inter-hero `trade` mid-stream; clockwise alternation +
  the months-2+ first-player rule across the month-1 → month-2 boundary.
- **Cross-hero dungeon persistence** *(`corpus_test.js`, `golden` @ 2P)*: hero1
  `dungeon → decline improve → E (hall) → leave`; `obs(0)` (seat rotates); hero2 `dungeon → E → E
  (target)` finds entry+hall already cleared, does not re-resolve them, clears the target.
  Byte-identical; same stream at 1P stays consistent.
- **Multi-hero terminal (out-of-time)** *(`corpus_test.js`, `goldenAmpleSupply` @ 2P)*: a 2P
  auto-driven no-win walk to the month-6 out-of-time loss; rotation + §107 verified across all six
  months; captured stream replayed.
- **Authored loss-condition (counter)** *(`corpus_test.js`, `goldenAuthoredLoss`)*: `quest / obs(0) /
  quest` → `goalProgress` hits 2 → authored `loss-condition` fires below the main-goal threshold.
- **Authored loss-condition (flag)** *(`corpus_test.js`, `goldenAuthoredLossFlag`)*:
  `dungeon → decline improve → E → E → obs(0)` clears the vault target (sets `vaultCleared`, guard
  bypassed), then `pass` walks `n-amid → n-lossguard` with the flag true → `loss-condition`. A
  guard-holds check confirms the dungeon turn does not end the game; byte-identical.
- **Authored loss-condition (resource)** *(`corpus_test.js`, `goldenAuthoredLossResource`)* — **new.**
  `reinforce` lifts the active hero's warriors 7 → 9 and the guard `resource warriors gte 9` fires on
  that action; a `pass` guard-holds check keeps warriors at 7 and does not end the game; byte-identical.
- **Authored loss-condition (sealsRemoved)** *(`corpus_test.js`, `goldenAuthoredLossSeal`)* — **new.**
  `pass / obs(0) / pass`: each plain action runs the spliced `effect.apply` (`seal.remove`) so
  `sealsRemoved` advances 1 → 2; the guard `sealsRemoved gte 2` fires on the second break. The guard
  holds at one seal (turn 1 ends `awaitingInput` with `sealsRemoved 1`); a `sealRemoved` event is raised
  and `brokenSeals` tracks the engine-defaulted ids; byte-identical.
- **Multi-hero authored loss (resource)** *(`corpus_test.js`, `goldenAuthoredLossResource` @ 2P)* —
  **new.** `pass / obs(0) / reinforce`: hero1 passes (warriors 7 < 9, guard holds), the seat rotates,
  hero2 reinforces (7 → 9) and the per-acting-hero guard — now reading hero2 — fires; hero1 stays
  untouched at 7. A symmetric check confirms the same guard fires on hero1 when hero1 reinforces first;
  byte-identical.
- **Authored loss-condition (foeOnSpace)** *(`corpus_test.js`, `goldenAuthoredLossFoe`)* — **new (v0.9).**
  `pass / obs(0) / pass`: each plain action runs the spliced `effect.apply(foe.spawn brigands @the-tower)`
  so the foe count on the space goes 1 → 2; the guard `foeOnSpace gte 2` fires on the second. A direct
  `evalCondition` unit boundary accompanies the stream (one foe → `gte 1` true, `gte 2` false, other
  spaces 0); the guard holds at one foe; byte-identical.
  `dungeon → decline improve → E (warded hall) → obs(0)`: spirit 2 < spiritCost 3 → block → `onFail`
  corruption + forced leave; the hall stays uncleared and the spiritCost is not debited; byte-identical.

## How to run

```
node verbs_test.js        # 47/47 — every §4.3 effect verb
node battle_test.js       # 19/19 — battle subflow + trade
node dungeon_test.js      # 30/30 — dungeon subflow + glyph gate
node conformance_test.js  # 12/12 — schema L1 (ajv strict)
node lockstep_test.js     # 13/13 — golden win + third-corruption loss + skull-invariant + determinism
node corpus_test.js       # 121/121 — supply losses, multi-hero turn order + trade, cross-hero dungeon
                          #          persistence, a multi-hero terminal out-of-time, multi-hero WINs at
                          #          2P/3P/4P, the authored-loss path on all four engine-supported
                          #          subjects (counter + flag + resource + sealsRemoved), the warded-room
                          #          block as a stream, and an L1 re-check of the corpus clones
```
Total: **242 assertions, all green.**

> **Conformance-count note.** The `conformance_test.js` copy in this project is the **12-case** L1
> suite (the contract §9 seed corpus). The canonical repo carries an extended **38-case** copy; the
> engine files here were reconstructed in earlier sessions and diverge from the repo in incidental
> ways. The invariant that matters — *every suite green, 0 failed* — holds; counts reconcile when the
> repo copy is restored.

## What's placeholder (harden over time, not blocking)

- **Trade co-location & latch are App-mediated, not engine-enforced (compact).** `applyTrade` applies a
  finalized, unanimous-by-construction decision and validates affordability + the closed TradeAsset
  union; the §10.9 co-location check and the once-per-turn `tradeUsed` precondition are App-surface
  responsibilities in the slice. Tighten when the Board projection of hero positions is wired (E2).
- **Glyph facing geometry is adapter-deferred** (decision #10): the gate logic is real and tested; the
  drum→facing derivation resolves via the UDT adapter (tagged stand-in until source-verified). An
  in-fixture glyph-gated action is therefore still omitted (inert until the adapter lands).
- **Seal directives are adapter-deferred, the state mirror is not.** `seal.remove`'s `tower.program`
  (`seal.break` channel) and `ui.prompt` directives are emitted-and-queued only (the physical seal
  subsystem lives in UDT/Display, unpublished); the `state.sealsRemoved` / `state.brokenSeals` mirror
  that `goldenAuthoredLossSeal` drives is fully engine-owned and lockstep-deterministic.
- **Authored-loss fixtures are intentionally contrived.** `goldenAuthoredLoss` (`counter`),
  `goldenAuthoredLossFlag` (`flag`), `goldenAuthoredLossResource` (`resource`),
  `goldenAuthoredLossSeal` (`sealsRemoved`), and `goldenAuthoredLossFoe` (`foeOnSpace`) drive the
  `winloss.lossCondition` engine path with short, deterministic, L1-valid streams; they are path proofs
  across all five engine-supported subjects (the seal and foe clones additionally supply their own
  `effect.apply` driver, since the golden slice authors neither a native seal-break nor a foe-spawn on
  the action path), not designed scenarios. Real authored losses arrive with content.
- *(retained)* action selection folded into `actionMiddle`; emergent-skull→corruption is an every-4th
  rule pending Board geometry; the hero **Advantage pool is a placeholder** (6/battle) — real
  Advantages are injected hero rich-data (D2, content-blocked).

## What's next

- **Condition coverage is now 5 of 6; the corpus is at proof saturation.** With `foeOnSpace` landed
  (v0.9), the only schema condition subject without an engine branch is **`heroAtLocation`**, and it is
  **Board-blocked**: `hero.placeOrMove` only emits a `board.mutate` directive and heroes carry no
  headless position field, so it cannot be driven without the Board projection (E2). Every other authored
  path is proven. Recommendation: treat the corpus as complete for this phase and pivot to
  integration-readiness rather than chase the one Board-gated subject.
- **Integration-readiness (unblocked prep for blocked work).** Front-load what shortens publish-to-wired:
  a dry R1–R11 review of the Player↔Relay Protocol v0.1.2, and/or stubbing the `board.mutate` /
  `tower.program` contract surface against the directives the engine already emits headless.
- **Wire adapters** when Board (E2) and the Relay (E1) publish: the real reference resolver + the
  `board.mutate` / `tower.program` target contracts; then re-ground the glyph/seal geometry (decision
  #10) and enforce trade co-location against the Board hero-position projection. *(blocked)*
- **Relay requirements checklist (R1–R11, Player↔Relay Protocol v0.1.2)** — post-publish review. *(blocked)*
- **Blocked content:** D2 (rich hero data → real Advantages/virtues/move values), D3 (the goal→companion
  mapping table → the goal↔ally consistency check).

## Changelog

- **v0.9 (2026-06-27)** — **`foeOnSpace` condition subject — first engine change since v0.6.** One
  additive `evalCondition` case (`lhs = count of state.foes with location === key`; `key` = the space,
  consistent with the other scalar subjects), reading existing `state.foes[].location` with no new
  plumbing; `ENGINE_VERSION` unchanged (`0.1.0`), backward-compatible, **zero regression** across all six
  suites. Proven by `goldenAuthoredLossFoe`: a direct `evalCondition` unit boundary (one foe → `gte 1`
  true / `gte 2` false; a different space reads 0) plus a lockstep stream where a spliced
  `effect.apply(foe.spawn brigands @the-tower)` spawns one foe per plain action so the guard `foeOnSpace
  gte 2` holds after the first and fires on the second — byte-identical, L1-valid. Condition coverage is
  now **5 of 6** subjects (`heroAtLocation` alone remains, Board-blocked). `corpus_test.js` 111 → **121**;
  suite total 232 → **242**. All other suites unchanged and still green.
- **v0.8 (2026-06-27)** — **Authored-loss subject set complete + 3P/4P win.** No engine change; three
  new corpus streams bind already-implemented paths to executable proofs. (1) An authored loss on the
  **`resource`** subject, `goldenAuthoredLossResource` (`resource warriors gte 9`), driven by the
  built-in `reinforce` action (+2 → 7 → 9): the loss fires on the single reinforce that reaches the
  threshold, with a `pass` guard-holds check (warriors stay 7) and a byte-identical replay. (2) An
  authored loss on the **`sealsRemoved`** subject, `goldenAuthoredLossSeal` (`sealsRemoved gte 2`):
  because the golden slice authors no native seal-break, the clone splices an `effect.apply`
  (`seal.remove`) node onto the plain-action path to supply the headless driver — each plain action
  breaks one seal, the guard fires on the second, the guard holds at one seal, a `sealRemoved` event is
  raised, and the stream replays byte-identically. With `counter` (v0.6) and `flag` (v0.7), this
  completes the schema-valid ∩ engine-supported subject set `resource / flag / counter / sealsRemoved`.
  (3) The 2P win generalized to **3P and 4P**: the same win stream lands the battle on the
  rotation-determined seat (`turnOrder[3 mod N]` — 3P wraps to hero1, 4P → hero4), each `won /
  adversary-defeated`, byte-identical and seed-independent — plus an L1 re-check of both new clones.
  (4) A **multi-hero authored loss** on `goldenAuthoredLossResource` @ 2P proving the `resource` guard is
  per-acting-hero: hero1 passes (guard holds at 7), the seat rotates, hero2 reinforces (7 → 9) and the
  guard fires on hero2 while hero1 stays untouched at 7, with a symmetric hero1-first check and a
  byte-identical replay (no new fixture — the existing resource clone driven at 2P).
  `corpus_test.js` 81 → **111**; suite total 202 → **232**. All other suites unchanged and still green.
- **v0.7 (2026-06-27)** — **Multi-hero win + authored-loss breadth + warded-block stream.** No engine
  change; three new corpus streams (closing the three units v0.6 left on "What's next") bind
  already-implemented paths to executable proofs. (1) A 2P **multi-hero win** on `golden`: the 1P win
  stream replayed at `playerCount: 2` reaches `won / adversary-defeated` with the seat rotating
  clockwise across the pre-spawn quests so a *different* seat (hero2) resolves the battle than opened the
  build (hero1) — the win tolerates quest alternation because `goalProgress` is a global counter;
  byte-identical and seed-independent. (2) A second **authored loss-condition clone**,
  `goldenAuthoredLossFlag`, on the non-`counter` subject `flag vaultCleared eq true` — the flag set by
  real gameplay (the dungeon target's `flag.set` insideEvent), with a guard-holds check confirming the
  dungeon turn bypasses the guard and the loss fires on the subsequent plain action. (3) The dungeon
  **`enterRequirement` block as a replay stream**, `goldenWardedVault` (spiritCost 1 → 3): spirit 2 < 3
  → block branch (`onFail` corruption + forced leave, hall uncleared, spiritCost not debited), with a
  `dungeonRoomBlocked` directive and a byte-identical replay — plus an L1 re-check of both new clones.
  `corpus_test.js` 57 → **81**; suite total 178 → **202**. All other suites unchanged and still green.
- **v0.6 (2026-06-27)** — **Cross-hero + terminal + authored-loss lockstep.** No engine change; three
  new corpus streams bind already-implemented guarantees to executable proofs. (1) A 2P **cross-hero
  dungeon-persistence** lockstep stream (decision #9): hero1 clears entry+hall and leaves, the seat
  rotates, hero2 enters the same dungeon to find them cleared and *not* re-resolved (no re-paid tax / no
  re-gained warrior), then clears the target — byte-identical, with a 1P consistency sanity check. (2) A
  2P game **auto-driven to a terminal out-of-time loss** at month 6, asserting clockwise rotation within
  every month, the §107 first-player rule across every month boundary, supply never empties, and a
  byte-identical replay of the captured stream. (3) The **authored `winloss.lossCondition`** path driven
  on a new `goldenAuthoredLoss` clone (one spliced node; `counter goalProgress gte 2`), firing below the
  main-goal threshold, with a one-quest guard check — plus an L1 re-check of all three corpus clones.
  `corpus_test.js` 32 → **57**; suite total 153 → **178**. All other suites unchanged and still green.
- **v0.5 (2026-06-26)** — **Lockstep loss corpus + multi-hero.** `init` honors `opts.playerCount`
  (1–4): hero set, per-player home-kingdom ownership, dormant complement (authored map or canonical
  fallback; load-faults on a bad split), clockwise `turnOrder`; **End Turn rotates the seat clockwise**
  (`rotateActiveHero`, 1P no-op → 1P digests byte-stable); Start Month records `firstPlayerOfMonth`
  (catalog §107). Golden fixture gains an `action.trade` node (Action: Middle `trade` port) and exports
  `goldenLowSupply` (2) / `goldenAmpleSupply` (99). New `corpus_test.js` (32): empty-supply loss,
  out-of-time loss (auto-driven + replayed), 2-player ownership/dormant/seating, an atomic inter-hero
  trade, clockwise rotation + the months-2+ first-player rule, and a corpus-wide skull-invariant
  re-check. All existing suites unchanged and still green; suite total 121 → 153.
- **v0.4 (2026-06-26)** — **Dungeon subflow + glyph gate.** `dungeon.subflow` / `dungeon.room`
  (rooms wired N/E/S/W; data in `library.dungeons`; enter-requirement → inside-event → improve-once →
  finalize; target completes dungeon + spawning quest; cleared rooms persist per-dungeon across
  heroes) and `cond.glyphGate` (derived facing → 1-spirit tax / block). `step` resume can open a new
  input boundary; `state.tower` derived mirror added. Golden fixture gains `azkol-vault-dungeon`. New
  `dungeon_test.js` (30). Suite total 91 → 121.
- **v0.3 (2026-06-26)** — battle subflow + trade + turn actions; golden win path rewired through a
  real card-driven battle.
- **v0.2** — the 36-verb §4.3 instruction set.

*Companion to: Rules-Engine Contract v0.3, Scenario Schema v0.4 (`scenario.schema.json`).*
