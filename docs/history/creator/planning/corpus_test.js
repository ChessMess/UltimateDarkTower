// corpus_test.js — the lockstep loss corpus + multi-hero turn order & inter-hero trade (engine step G,
// next-step #1). Complements lockstep_test.js (the clean-win / third-corruption-loss pair) by driving
// the two remaining default losses to ground and exercising a real ≥2-player turn rotation + trade:
//
//   1. EMPTY-SUPPLY loss  — the mandatory end-of-turn skull drop (§4.5 step 1) empties the supply and
//                           fires the loss in Action: End. Uses goldenLowSupply (skullSupply 2) so the
//                           loss is reached in three turns, independent of the seed-drawn month length.
//   2. OUT-OF-TIME loss   — a no-win all-pass walk through all six months routes month-6 New Month
//                           Check → Game End → loss. Uses goldenAmpleSupply (skullSupply 99) so the
//                           supply outlasts month 6 instead of emptying first. The turn count is
//                           seed-dependent, so the stream is captured by an auto-driver, then replayed.
//   3. MULTI-HERO         — a 2-player game: per-player home-kingdom ownership + dormant complement,
//                           clockwise seat rotation (catalog §132), the months-2+ first-player rule
//                           (catalog §107), and a real inter-hero trade applied atomically mid-stream.
//   4. CROSS-HERO DUNGEON — a 2P LOCKSTEP stream binding locked decision #9: hero1 clears rooms, the
//                           seat rotates, hero2 enters the SAME dungeon to find them already cleared and
//                           NOT re-resolved (persistence is per-dungeon, not per-hero — contract §3.1).
//   5. MULTI-HERO TERMINAL— a 2P game auto-driven to a genuine ending (out-of-time at month-6 Game End),
//                           proving rotation + the §107 rule hold across all six months to termination.
//   6. AUTHORED LOSS      — the winloss.lossCondition engine path (loseGame(…,"loss-condition")), driven
//                           on goldenAuthoredLoss, distinct from the three engine-intrinsic defaults.
//   7. MULTI-HERO WIN     — (v0.7) the matching 2P WIN: quest×3 → main goal → adversary spawns → a
//                           card-driven battle defeats Ashstrider, with the seat rotating across the
//                           pre-spawn quest turns so a DIFFERENT seat resolves the battle than opened.
//   8. AUTHORED LOSS (flag)— (v0.7) a second winloss.lossCondition clone on a NON-COUNTER subject
//                           (flag vaultCleared, set by the dungeon target room), distinct from #6's counter.
//   9. WARDED-ROOM BLOCK  — (v0.7) a lockstep stream of the dungeon enterRequirement BLOCK path: a hero
//                           enters a warded room with insufficient spirit → onFail (corruption) + forced
//                           leave, room left uncleared (catalog §5), on a higher-spiritCost golden clone.
//  10. AUTHORED LOSS (res) — (v0.8) a third winloss.lossCondition clone on the RESOURCE subject (warriors),
//                           driven by the built-in `reinforce` action (+2 → 7→9), distinct from #6/#8.
//  11. AUTHORED LOSS (seal)— (v0.8) the fourth subject, sealsRemoved, completing resource/flag/counter/
//                           sealsRemoved; an effect.apply(seal.remove) node supplies the headless driver.
//  12. MULTI-HERO WIN 3/4P — (v0.8, stretch) the §7 2P win generalized: the battle lands on the rotation-
//                           determined seat (3P wraps to hero1, 4P → hero4), seed-independent, lockstep.
//  13. MULTI-HERO AUTH LOSS— (v0.8) the per-ACTING-hero `resource` guard on goldenAuthoredLossResource @ 2P:
//                           hero1 passes (holds), seat rotates, hero2 reinforces → loss fires on hero2.
//  14. AUTHORED LOSS (foe)  — (v0.9) the foeOnSpace subject — the FIRST engine change since v0.6 (adds the
//                           evalCondition branch); an effect.apply(foe.spawn) drives 2 foes onto a space.
//
// Every stream also asserts byte-identical replays (the L4 determinism guarantee, §9), and the corpus
// fixtures are re-checked schema-valid (L1, ajv strict draft 2020-12).

const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
const fs = require("fs");
const engine = require("./engine");
const { golden, goldenLowSupply, goldenAmpleSupply, goldenAuthoredLoss, goldenAuthoredLossFlag, goldenWardedVault, goldenAuthoredLossResource, goldenAuthoredLossSeal, goldenAuthoredLossFoe } = require("./golden-fixture");

let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log("PASS  " + name); } else { fail++; console.log("XXXX  " + name + (extra ? "  — " + extra : "")); } }

// input constructors (§5.3)
const act = (v) => ({ requestId: "action", value: v, kind: "decision" });
const obs = (v) => ({ requestId: "skullCounter", value: v, kind: "observed" });
const tr  = (v) => ({ requestId: "trade", value: v, kind: "decision" });
// dungeon-room boundaries (vocabulary verified against dungeon_test.js)
const dadv   = (improve)   => ({ requestId: "dungeonRoomAdvantage", value: { improve }, kind: "decision" });
const dmove  = (direction) => ({ requestId: "dungeonMove", value: { direction }, kind: "decision" });
const dleave = ()          => ({ requestId: "dungeonMove", value: { leave: true }, kind: "decision" });
// battle-subflow boundaries (vocabulary verified against lockstep_test.js)
const tgt = (foeId) => ({ requestId: "target", value: { foeId }, kind: "decision" });
const adv = (spend) => ({ requestId: "advantageSpend", value: { spend }, kind: "decision" });
// condition builder (mirrors golden-fixture's helper) — for the direct evalCondition unit boundary (§14)
const cond = (subject, comparator, value, key) => (key === undefined ? { subject, comparator, value } : { subject, comparator, value, key });

// per-step (status, state digest, ordered directives) trace — the lockstep comparison unit (§9)
function trace(run) { return run.map(r => ({ status: r.status, digest: engine.digest(r.state), directives: JSON.stringify(r.directives) })); }
function identical(scn, opts, inputs) { return JSON.stringify(trace(engine.replay(scn, opts, inputs))) === JSON.stringify(trace(engine.replay(scn, opts, inputs))); }
function lastOf(run) { return run[run.length - 1]; }
function dropTriggers(run) {
  return run.flatMap(r => r.directives).filter(d => d.type === "tower.program")
            .filter(d => (d.ops || []).some(o => o.channel === "skull.dropTrigger"));
}

// An auto-driver: respond to whatever boundary the engine is awaiting and capture the realized input
// stream (so seed-variable walks can be replayed verbatim for the determinism assertion).
function autoDrive(scn, opts, respond, max = 5000) {
  const inputs = []; let r = engine.init(scn, opts); let guard = 0;
  while (r.status === "awaitingInput" && guard++ < max) {
    const inp = respond(r.awaiting.id, r.state);
    if (!inp) throw new Error("auto-driver has no response for await: " + r.awaiting.id);
    inputs.push(inp);
    r = engine.step(r.state, inp);
  }
  return { final: r, inputs };
}
const passDriver = (id) => id === "action" ? act("pass") : id === "skullCounter" ? obs(0) : null;

// =====================================================================================
// 1 — EMPTY-SUPPLY loss
// =====================================================================================
// turn 1 drop (supply 2→1), turn 2 drop (1→0), turn 3 Action: End finds supply 0 → loss BEFORE the
// drop. Min month length is 3, so turn 3's Action: End is always reached within month 1.
const esStream = [act("pass"), obs(0), act("pass"), obs(0), act("pass")];
const esRun = engine.replay(goldenLowSupply, { seed: "mvp-runtime-seed", playerCount: 1 }, esStream);
const esF = lastOf(esRun);
ok("empty-supply: reaches a clean LOSS", esF.status === "lost", "got " + esF.status + " / " + esF.state.outcome.reason);
ok("empty-supply: loss reason is empty-supply", esF.state.outcome.reason === "empty-supply");
ok("empty-supply: supply is exactly 0 at the loss", esF.state.skulls.supply === 0);
ok("empty-supply: loss fires at turn 3's Action: End", esF.state.clock.month === 1 && esF.state.clock.turnInMonth === 3);
// the loss precedes the drop emit, so only the first two turns emitted a drop trigger:
ok("empty-supply: exactly 2 skull drops occurred (turn 3 lost before dropping)", dropTriggers(esRun).length === 2);
ok("empty-supply: a gameLost directive carries the reason", esRun.flatMap(r => r.directives).some(d => d.type === "log.entry" && d.event === "gameLost" && d.reason === "empty-supply"));
ok("empty-supply: replays are byte-identical (determinism)", identical(goldenLowSupply, { seed: "mvp-runtime-seed", playerCount: 1 }, esStream));
// supply exhaustion is structural, not RNG-driven → seed-independent outcome:
ok("empty-supply: outcome is seed-independent (structural, not RNG)",
   lastOf(engine.replay(goldenLowSupply, { seed: "another-seed", playerCount: 1 }, esStream)).state.outcome.reason === "empty-supply");

// =====================================================================================
// 2 — OUT-OF-TIME loss
// =====================================================================================
const ootOpts = { seed: "mvp-runtime-seed", playerCount: 1 };
const oot = autoDrive(goldenAmpleSupply, ootOpts, passDriver);
ok("out-of-time: reaches a clean LOSS", oot.final.status === "lost", "got " + oot.final.status + " / " + oot.final.state.outcome.reason);
ok("out-of-time: loss reason is out-of-time", oot.final.state.outcome.reason === "out-of-time");
ok("out-of-time: loss is at the end of month 6", oot.final.state.clock.month === 6);
ok("out-of-time: ample supply never emptied (supply > 0 at loss)", oot.final.state.skulls.supply > 0);
ok("out-of-time: a gameLost directive carries the reason", oot.final.state.outcome.reason === "out-of-time");
// the captured (seed-variable) stream replays byte-identically:
ok("out-of-time: captured stream replays byte-identically (determinism)", identical(goldenAmpleSupply, ootOpts, oot.inputs));
// across several seeds the authored outcome is always out-of-time, while the realized walk length is
// genuinely seed-driven (the within-range month-length draw), so the lengths are not all identical:
const ootSeeds = ["different-seed", "s2", "s3", "alpha"].map(s => autoDrive(goldenAmpleSupply, { seed: s, playerCount: 1 }, passDriver));
ok("out-of-time: outcome is seed-independent (always out-of-time)",
   ootSeeds.every(o => o.final.state.outcome.reason === "out-of-time"));
ok("out-of-time: realized walk length is seed-driven (lengths are not all identical)",
   new Set(ootSeeds.concat([oot]).map(o => o.inputs.length)).size > 1);

// =====================================================================================
// 3 — MULTI-HERO turn order + inter-hero trade
// =====================================================================================
const mhOpts = { seed: "mvp-runtime-seed", playerCount: 2 };

// --- init: hero set, per-player home-kingdom ownership, dormant complement, clockwise seating ---
const mh = engine.init(golden, mhOpts);
ok("multi-hero: init builds two heroes", Object.keys(mh.state.heroes).length === 2 && mh.state.heroes.hero1 && mh.state.heroes.hero2);
ok("multi-hero: per-player home-kingdom ownership (north→hero1, south→hero2)",
   mh.state.kingdoms.ownership.north === "hero1" && mh.state.kingdoms.ownership.south === "hero2");
ok("multi-hero: the unowned kingdoms are dormant (east, west)",
   JSON.stringify(mh.state.kingdoms.dormant) === JSON.stringify(["east", "west"]));
ok("multi-hero: clockwise seating turnOrder = [hero1, hero2]", JSON.stringify(mh.state.clock.turnOrder) === JSON.stringify(["hero1", "hero2"]));
ok("multi-hero: month 1 first player is hero1", mh.state.clock.activeHero === "hero1" && mh.state.clock.firstPlayerOfMonth === "hero1");
// a 4-player game has no dormant kingdoms (schema v0.4 byPlayerCount.4 maxItems:0 / canonical fallback)
ok("multi-hero: a 4-player init owns all four kingdoms with none dormant", (() => {
  const i4 = engine.init(golden, { seed: "s", playerCount: 4 });
  return i4.state.kingdoms.dormant.length === 0 && Object.keys(i4.state.kingdoms.ownership).length === 4;
})());

// --- a real inter-hero trade applied atomically mid-stream ---
// hero1's turn: trade 2 warriors to hero2, then the mandatory drop ends the turn and rotates the seat.
const tradeStream = [act("trade"), tr({ from: "hero1", to: "hero2", give: [{ asset: "warriors", amount: 2 }] }), obs(0)];
const tradeRun = engine.replay(golden, mhOpts, tradeStream);
const tradeF = lastOf(tradeRun);
ok("multi-hero trade: hero1 gave 2 warriors (7→5)", tradeF.state.heroes.hero1.warriors === 5);
ok("multi-hero trade: hero2 received 2 warriors (7→9)", tradeF.state.heroes.hero2.warriors === 9);
ok("multi-hero trade: total warriors conserved (atomic transfer)", tradeF.state.heroes.hero1.warriors + tradeF.state.heroes.hero2.warriors === 14);
ok("multi-hero trade: a ui.update records the transfer", tradeRun.flatMap(r => r.directives).some(d => d.type === "ui.update" && d.delta && d.delta.trade && d.delta.trade.from === "hero1" && d.delta.trade.to === "hero2"));
ok("multi-hero trade: the seat rotated to hero2 after hero1's turn", tradeF.state.clock.activeHero === "hero2");
ok("multi-hero trade: stream replays byte-identically (determinism)", identical(golden, mhOpts, tradeStream));

// --- a trade that the giver cannot afford faults (never applied partially) ---
let tradeFaulted = false;
try { engine.replay(golden, mhOpts, [act("trade"), tr({ from: "hero1", to: "hero2", give: [{ asset: "warriors", amount: 999 }] })]); }
catch (e) { tradeFaulted = e.isFault === true; }
ok("multi-hero trade: an unaffordable trade faults (atomic, no partial application)", tradeFaulted);

// --- clockwise rotation + the months-2+ first-player rule (catalog §107, §132) ---
// Drive 2P all-pass and record the acting hero per turn; verify alternation within a month and that
// month 2 begins with the player left of month 1's final player (= continuous clockwise rotation).
const turns = [];
autoDrive(golden, mhOpts, (id, state) => {
  if (id === "action") { turns.push({ month: state.clock.month, turn: state.clock.turnInMonth, hero: state.clock.activeHero }); return act("pass"); }
  return obs(0);
}, 400);
const m1 = turns.filter(t => t.month === 1);
const m2 = turns.filter(t => t.month === 2);
ok("multi-hero rotation: month 1 alternates hero1/hero2 clockwise", m1.length >= 2 && m1.every((t, i) => t.hero === (i % 2 === 0 ? "hero1" : "hero2")));
ok("multi-hero rotation: month 2 first player is left of month 1's final player", (() => {
  if (!m1.length || !m2.length) return false;
  const finalM1 = m1[m1.length - 1].hero;
  const expected = finalM1 === "hero1" ? "hero2" : "hero1"; // clockwise-next of the final player
  return m2[0].hero === expected;
})());

// =====================================================================================
// 4 — CROSS-HERO DUNGEON PERSISTENCE (lockstep) — binds locked decision #9 to an executable proof
// =====================================================================================
// Decision #9 / contract §3.1 / catalog §5: cleared dungeon rooms persist PER-DUNGEON across ALL
// heroes (state.dungeons[id].clearedRooms), not per-hero. dungeon_test proves this single-process; this
// is the missing multi-hero LOCKSTEP stream. 2P (golden), one dungeon (azkol-vault-dungeon, 3 rooms):
//   turn 1 (hero1): enter → decline improve → E into the warded hall (pays the 1-spirit tax, +1 warrior)
//                   → leave. Clears vault-entry AND vault-hall. obs(0) ends the turn → seat rotates.
//   turn 2 (hero2): enter the SAME dungeon → the entrance is already cleared (no improve boundary) →
//                   walk E through the cleared hall (NO re-paid tax, NO re-gained warrior) → E into the
//                   uncleared target → completes the dungeon. hero2 finishes what hero1 started.
const DUN = "azkol-vault-dungeon";
const xhStream = [
  act("dungeon"), dadv(false), dmove("E"), dleave(), obs(0), // hero1 clears entry+hall, turn ends, rotate
  act("dungeon"), dmove("E"), dmove("E")                     // hero2 re-enters cleared rooms, clears target
];
const xhRun = engine.replay(golden, mhOpts, xhStream);
const xhHero1Left = xhRun[4].state.dungeons[DUN].clearedRooms; // after hero1 leaves (still hero1's turn)
const xhHero2Entry = xhRun[6].state.dungeons[DUN].clearedRooms; // after hero2 has entered the same dungeon
const xhF = lastOf(xhRun);
ok("cross-hero dungeon: hero1 cleared ≥1 room → clearedRooms grew (entry+hall)",
   xhHero1Left.length === 2 && xhHero1Left.includes("vault-entry") && xhHero1Left.includes("vault-hall"));
ok("cross-hero dungeon: the seat rotated to hero2 before the second entry", xhRun[6].state.clock.activeHero === "hero2");
ok("cross-hero dungeon: hero2's entry sees the IDENTICAL clearedRooms set hero1 left (persists per-dungeon)",
   JSON.stringify(xhHero2Entry) === JSON.stringify(xhHero1Left));
// the crux of decision #9 (per-dungeon, NOT per-hero): hero2 walks the entry + warded hall WITHOUT
// re-resolving them — no re-applied +1 spirit, no re-paid spirit tax, no re-gained warrior. hero2's
// resources are untouched by the rooms hero1 cleared (start: spirit 1, warriors 7).
ok("cross-hero dungeon: cleared rooms are NOT re-resolved for hero2 (spirit 1, warriors 7 untouched)",
   xhF.state.heroes.hero2.spirit === 1 && xhF.state.heroes.hero2.warriors === 7);
// hero1 DID resolve them (spirit 1 +1 entry −1 hall tax = 1; warriors 7 +1 hall = 8) — proving the
// persistence is about the ROOM set, not a shared effect:
ok("cross-hero dungeon: hero1 (who resolved the rooms) shows the room effects (spirit 1, warriors 8)",
   xhF.state.heroes.hero1.spirit === 1 && xhF.state.heroes.hero1.warriors === 8);
ok("cross-hero dungeon: hero2 finishes the dungeon (3rd room cleared, quest complete)",
   xhF.state.dungeons[DUN].clearedRooms.length === 3 && xhF.state.dungeons[DUN].clearedRooms.includes("vault-target") &&
   xhF.state.quests["azkol-vault"] && xhF.state.quests["azkol-vault"].complete === true);
ok("cross-hero dungeon: the stream replays byte-identically (lockstep determinism)", identical(golden, mhOpts, xhStream));
// sanity: the SAME stream at 1P stays consistent — rotation is a no-op so hero1 re-enters its own
// cleared rooms; persistence still carries the dungeon to completion, byte-identically.
const xh1p = lastOf(engine.replay(golden, { seed: "mvp-runtime-seed", playerCount: 1 }, xhStream));
ok("cross-hero dungeon (sanity): the 1P run of the same stream completes the dungeon consistently",
   xh1p.state.dungeons[DUN].clearedRooms.length === 3 && xh1p.state.quests["azkol-vault"].complete === true &&
   xh1p.state.clock.activeHero === "hero1");
ok("cross-hero dungeon (sanity): the 1P run replays byte-identically",
   identical(golden, { seed: "mvp-runtime-seed", playerCount: 1 }, xhStream));

// =====================================================================================
// 5 — MULTI-HERO driven to a TERMINAL outcome (out-of-time on goldenAmpleSupply, 2P)
// =====================================================================================
// Every prior multi-hero assertion stops mid-game. This drives a real 2P game to a genuine ending: a
// no-win all-pass walk on the ample-supply clone reaches the month-6 Game End → out-of-time loss, with
// the seat rotating clockwise within every month and the §107 first-player rule holding across every
// month boundary. The walk length is seed-driven, so it is captured by the auto-driver, then replayed.
const t5turns = [];
const t5 = autoDrive(goldenAmpleSupply, mhOpts, (id, state) => {
  if (id === "action") { t5turns.push({ month: state.clock.month, hero: state.clock.activeHero, fpm: state.clock.firstPlayerOfMonth }); return act("pass"); }
  return obs(0);
});
ok("multi-hero terminal: a 2P game reaches a clean LOSS", t5.final.status === "lost", "got " + t5.final.status + " / " + t5.final.state.outcome.reason);
ok("multi-hero terminal: loss reason is out-of-time at the end of month 6",
   t5.final.state.outcome.reason === "out-of-time" && t5.final.state.clock.month === 6);
ok("multi-hero terminal: ample supply never emptied (supply > 0 at the loss)", t5.final.state.skulls.supply > 0);
// per-month hero sequences: within every month the two seats strictly alternate (clockwise rotation).
const monthsSeen = [...new Set(t5turns.map(t => t.month))].sort((a, b) => a - b);
const seqOf = (m) => t5turns.filter(t => t.month === m).map(t => t.hero);
ok("multi-hero terminal: the game spanned all six months", monthsSeen.length === 6 && monthsSeen[0] === 1 && monthsSeen[5] === 6);
ok("multi-hero terminal: rotation held — seats strictly alternate within every month",
   monthsSeen.every(m => { const s = seqOf(m); return s.length >= 1 && s.every((h, i) => i === 0 || h !== s[i - 1]); }));
// §107 (catalog): months 2+ begin with the player clockwise-left of last month's final player. With
// continuous rotation that is exactly turnOrder-next(finalPlayer(m−1)) == firstPlayerOfMonth(m).
const next2 = (h) => (h === "hero1" ? "hero2" : "hero1"); // clockwise next in turnOrder [hero1,hero2]
ok("multi-hero terminal: the §107 first-player rule held across every month boundary (months 2–6)",
   monthsSeen.slice(1).every(m => {
     const prev = seqOf(m - 1); const fpm = seqOf(m)[0];
     return fpm === next2(prev[prev.length - 1]) && fpm === t5turns.find(t => t.month === m).fpm;
   }));
ok("multi-hero terminal: the captured (seed-variable) stream replays byte-identically", identical(goldenAmpleSupply, mhOpts, t5.inputs));

// =====================================================================================
// 6 — AUTHORED loss-condition node (winloss.lossCondition) — distinct from the 3 engine-intrinsic losses
// =====================================================================================
// goldenAuthoredLoss splices one winloss.lossCondition node onto the action path; its condition
// (counter goalProgress gte 2) is satisfied by the `quest` action. Two quests fire loseGame(
// "loss-condition") BEFORE the main goal's threshold of 3 — a clean authored loss, schema-valid (L1).
const alStream = [act("quest"), obs(0), act("quest")];
const alRun = engine.replay(goldenAuthoredLoss, { seed: "mvp-runtime-seed", playerCount: 1 }, alStream);
const alF = lastOf(alRun);
ok("authored loss: reaches a clean LOSS", alF.status === "lost", "got " + alF.status + " / " + alF.state.outcome.reason);
ok("authored loss: reason is loss-condition (authored, not an engine-intrinsic default)", alF.state.outcome.reason === "loss-condition");
ok("authored loss: a gameLost directive carries the authored reason",
   alRun.flatMap(r => r.directives).some(d => d.type === "log.entry" && d.event === "gameLost" && d.reason === "loss-condition"));
ok("authored loss: it fired below the main goal's threshold (goalProgress 2, main goal NOT complete)",
   alF.state.counters.goalProgress === 2 && alF.state.mainGoalComplete === false);
ok("authored loss: the guard holds until the threshold (one quest does NOT end the game)",
   lastOf(engine.replay(goldenAuthoredLoss, { seed: "mvp-runtime-seed", playerCount: 1 }, [act("quest")])).status === "awaitingInput");
ok("authored loss: the stream replays byte-identically (lockstep determinism)",
   identical(goldenAuthoredLoss, { seed: "mvp-runtime-seed", playerCount: 1 }, alStream));

// =====================================================================================
// 7 — MULTI-HERO WIN driven to a TERMINAL outcome (adversary-defeated, 2P on golden)
// =====================================================================================
// Section 5 drove a 2P game to a terminal LOSS; this is the matching 2P WIN. The build runs quest ×3 →
// main goal complete → adversary spawns → a card-driven battle defeats Ashstrider (select adversary,
// spend 5 Advantages, all 5 cards cleared). The seat rotates clockwise across the three pre-spawn quest
// turns, so a DIFFERENT seat resolves the battle than opened the build.
//
// Traced before asserting (handoff): the win path TOLERATES quest alternation. goalProgress lives on
// state.counters (GLOBAL), advanced by whichever hero acts — the three quests come from seats
// [hero1, hero2, hero1], yet the global counter still reaches the threshold (3) and completes the main
// goal. It does NOT require all quests from one seat. And because rotation is continuous, the k-th action
// belongs to turnOrder[(k-1) mod 2], so the 4th action (the battle) is hero2 regardless of the seed-drawn
// month length — verified to hold even when month 1 is only 3 turns and the battle rolls into month 2.
const winStream = [act("quest"), obs(0), act("quest"), obs(0), act("quest"), obs(0), act("battle"), tgt("ashstrider"), adv(5)];
const mhWin = engine.replay(golden, mhOpts, winStream);
const mhWinF = lastOf(mhWin);
ok("multi-hero win: a 2P game reaches a clean WIN", mhWinF.status === "won", "got " + mhWinF.status + " / " + mhWinF.state.outcome.reason);
ok("multi-hero win: win reason is adversary-defeated", mhWinF.state.outcome.reason === "adversary-defeated");
ok("multi-hero win: main goal completed, adversary spawned then defeated",
   mhWinF.state.mainGoalComplete === true && mhWinF.state.adversary.spawned && mhWinF.state.adversary.defeated);
// the acting seat captured at each `action` boundary across the build:
const mhWinActors = mhWin.filter(r => r.awaiting && r.awaiting.id === "action").map(r => r.state.clock.activeHero);
ok("multi-hero win: the seat rotated mid-build (4 action turns spanning BOTH seats, not all hero1)",
   mhWinActors.length === 4 && new Set(mhWinActors).size === 2);
ok("multi-hero win: a DIFFERENT seat resolved the battle than opened the build (hero1 opened, hero2 battled)",
   mhWinActors[0] === "hero1" && mhWinActors[3] === "hero2" && mhWinF.state.clock.activeHero === "hero2");
// the crux: the win TOLERATES quest alternation because goalProgress is global — the three quests came
// from ≥2 distinct seats, yet the global counter completed the main goal at the threshold (3).
ok("multi-hero win: win path tolerates quest alternation (3 quests from ≥2 seats; global goalProgress reaches 3)",
   new Set(mhWinActors.slice(0, 3)).size >= 2 && mhWinF.state.counters.goalProgress === 3);
ok("multi-hero win: the battling seat took no warrior loss (all 5 cards cleared at 5 spend)",
   mhWinF.state.heroes.hero2.warriors === 7);
ok("multi-hero win: the scripted stream replays byte-identically (lockstep determinism)", identical(golden, mhOpts, winStream));
// the 2P win is authored-logic, not RNG: across seeds it is always adversary-defeated and always resolved
// by the rotated seat (hero2), even though the seed-drawn month length varies underneath.
const mhWinSeeds = ["different-seed", "s2", "s3", "alpha"].map(s => lastOf(engine.replay(golden, { seed: s, playerCount: 2 }, winStream)));
ok("multi-hero win: outcome is seed-independent (always won/adversary-defeated, always the rotated seat hero2)",
   mhWinSeeds.every(f => f.status === "won" && f.state.outcome.reason === "adversary-defeated" && f.state.clock.activeHero === "hero2"));

// =====================================================================================
// 8 — AUTHORED loss via a NON-COUNTER condition subject (flag vaultCleared) — distinct from #6's counter
// =====================================================================================
// goldenAuthoredLossFlag splices the same loss guard onto the action path, but its condition is
// `flag vaultCleared eq true` — a flag set by REAL GAMEPLAY (the dungeon target room's insideEvent
// flag.set), proving the winloss.lossCondition path on a schema-valid + engine-supported subject other
// than a counter. turn 1: enter the vault, decline improve, walk E→E to the target (sets vaultCleared) →
// the dungeon completes via its `completed` port, which BYPASSES the guard → obs ends the turn. turn 2:
// a plain `pass` walks n-amid → n-lossguard with vaultCleared now true → loseGame("loss-condition").
const alfOpts = { seed: "mvp-runtime-seed", playerCount: 1 };
const flStream = [act("dungeon"), dadv(false), dmove("E"), dmove("E"), obs(0), act("pass")];
const flRun = engine.replay(goldenAuthoredLossFlag, alfOpts, flStream);
const flF = lastOf(flRun);
ok("authored loss (flag): reaches a clean LOSS", flF.status === "lost", "got " + flF.status + " / " + flF.state.outcome.reason);
ok("authored loss (flag): reason is loss-condition (authored, on a non-counter subject)", flF.state.outcome.reason === "loss-condition");
ok("authored loss (flag): the triggering flag was set by real gameplay (vaultCleared via the dungeon target)", flF.state.flags.vaultCleared === true);
ok("authored loss (flag): a gameLost directive carries the authored reason",
   flRun.flatMap(r => r.directives).some(d => d.type === "log.entry" && d.event === "gameLost" && d.reason === "loss-condition"));
// guard-holds: clearing the vault sets the flag but does NOT end the game (the dungeon bypasses the
// guard); the loss fires only on the SUBSEQUENT plain action that routes through n-lossguard.
ok("authored loss (flag): the guard holds through the dungeon turn (clearing the vault does NOT end the game)",
   flRun[4].state.flags.vaultCleared === true && flRun[4].status === "awaitingInput" && flRun[4].state.outcome.reason === null);
ok("authored loss (flag): the stream replays byte-identically (lockstep determinism)", identical(goldenAuthoredLossFlag, alfOpts, flStream));

// =====================================================================================
// 9 — DUNGEON enterRequirement BLOCK inside a lockstep stream (warded room, insufficient spirit)
// =====================================================================================
// dungeon_test proves resolveRoomEntry's block branch single-process; this is the missing REPLAY stream.
// goldenWardedVault bumps vault-hall's spiritCost 1 → 3. A hero reaches the hall with spirit 2 (start 1 +
// the entrance's +1 insideEvent), so 2 < 3 → the block branch fires: apply onFail ([corruption.gain]) and
// force a leave WITHOUT clearing the hall (catalog §5); the spiritCost is never debited on a block.
//   turn 1 (1P): enter → decline improve → E into the warded hall → BLOCKED → corruption +1 + forced
//                leave → back to Action: End → obs(0) ends the turn. The hall stays uncleared.
const wvOpts = { seed: "mvp-runtime-seed", playerCount: 1 };
const wvDUN = "azkol-vault-dungeon";
const wvStream = [act("dungeon"), dadv(false), dmove("E"), obs(0)];
const wvRun = engine.replay(goldenWardedVault, wvOpts, wvStream);
const wvF = lastOf(wvRun);
const wvCleared = wvF.state.dungeons[wvDUN].clearedRooms;
ok("warded block: the run completes without terminating and ends the turn", wvF.status === "awaitingInput" && wvF.state.outcome.reason === null);
ok("warded block: a dungeonRoomBlocked directive fired for the warded hall",
   wvRun.flatMap(r => r.directives).some(d => d.type === "log.entry" && d.event === "dungeonRoomBlocked" && d.room === "vault-hall"));
ok("warded block: onFail applied — the blocked hero gained a corruption (0 → 1)", wvF.state.heroes.hero1.corruption === 1);
ok("warded block: the hero was force-left out of the dungeon (no active dungeon subflow remains)", !wvF.state.clock.dungeon);
ok("warded block: the warded hall is NOT cleared (only the entrance the hero actually resolved)",
   wvCleared.length === 1 && wvCleared.includes("vault-entry") && !wvCleared.includes("vault-hall"));
ok("warded block: the spiritCost was NOT debited on the blocked entry (spirit stays 2 from the entrance gain)",
   wvF.state.heroes.hero1.spirit === 2);
ok("warded block: the stream replays byte-identically (lockstep determinism)", identical(goldenWardedVault, wvOpts, wvStream));

// =====================================================================================
// 10 — AUTHORED loss via a RESOURCE condition subject (warriors) — distinct from #6 (counter) & #8 (flag)
// =====================================================================================
// goldenAuthoredLossResource splices the same loss guard onto the action path, but its condition is
// `resource warriors gte 9` — a per-hero reading (evalCondition's resource branch reads
// state.heroes[activeHero][key]). The driver is the BUILT-IN `reinforce` action (performAction →
// resource.gain warriors +2, §4.1 once-per-turn latch): heroes start at 7, so ONE reinforce lifts the
// active hero 7 → 9 and the guard fires on that same action (n-amid → n-lossguard). This is the third
// non-default winloss.lossCondition subject, completing resource/flag/counter as schema-valid drivers.
const arOpts = { seed: "mvp-runtime-seed", playerCount: 1 };
const arStream = [act("reinforce")];
const arRun = engine.replay(goldenAuthoredLossResource, arOpts, arStream);
const arF = lastOf(arRun);
ok("authored loss (resource): reaches a clean LOSS", arF.status === "lost", "got " + arF.status + " / " + arF.state.outcome.reason);
ok("authored loss (resource): reason is loss-condition (authored, on a resource subject)", arF.state.outcome.reason === "loss-condition");
ok("authored loss (resource): the triggering resource was raised by real gameplay (reinforce: warriors 7 → 9)", arF.state.heroes.hero1.warriors === 9);
ok("authored loss (resource): a gameLost directive carries the authored reason",
   arRun.flatMap(r => r.directives).some(d => d.type === "log.entry" && d.event === "gameLost" && d.reason === "loss-condition"));
// guard-holds: a plain `pass` leaves warriors at 7 (< 9), so the guard does NOT fire — the loss is
// reached only once reinforce lifts the active hero to the threshold (mirrors #6's below-threshold hold).
ok("authored loss (resource): the guard holds below the threshold (a pass turn keeps warriors 7 and does NOT end the game)",
   (() => { const h = lastOf(engine.replay(goldenAuthoredLossResource, arOpts, [act("pass")])); return h.status === "awaitingInput" && h.state.heroes.hero1.warriors === 7 && h.state.outcome.reason === null; })());
ok("authored loss (resource): the stream replays byte-identically (lockstep determinism)", identical(goldenAuthoredLossResource, arOpts, arStream));

// =====================================================================================
// 11 — AUTHORED loss via the sealsRemoved condition subject — completes resource/flag/counter/sealsRemoved
// =====================================================================================
// goldenAuthoredLossSeal is the last of the four schema-valid ∩ engine-supported subjects. The golden
// slice authors no native seal-break, so this clone SUPPLIES the driver the minimal way: it splices an
// `effect.apply` node carrying [{op:"seal.remove"}] just ahead of the guard, so each plain action breaks
// one seal (state.sealsRemoved += 1, a default "(n)-north" id into state.brokenSeals, a `sealRemoved`
// event). The guard reads `sealsRemoved gte 2` and fires on the SECOND break. The hardware face of seals
// is adapter-deferred (the seal.remove tower.program/ui.prompt directives are merely QUEUED headless),
// but the state.sealsRemoved field is engine-owned and lockstep-deterministic — so the path is fully
// drivable headless. turn 1: pass → 1 seal broken (guard holds, 1 < 2) → obs ends the turn. turn 2: pass →
// 2nd seal broken → loseGame("loss-condition").
const asOpts = { seed: "mvp-runtime-seed", playerCount: 1 };
const asStream = [act("pass"), obs(0), act("pass")];
const asRun = engine.replay(goldenAuthoredLossSeal, asOpts, asStream);
const asF = lastOf(asRun);
ok("authored loss (sealsRemoved): reaches a clean LOSS", asF.status === "lost", "got " + asF.status + " / " + asF.state.outcome.reason);
ok("authored loss (sealsRemoved): reason is loss-condition (authored, on the sealsRemoved subject)", asF.state.outcome.reason === "loss-condition");
ok("authored loss (sealsRemoved): the threshold was reached by real gameplay (two seal.remove breaks → sealsRemoved 2)", asF.state.sealsRemoved === 2);
ok("authored loss (sealsRemoved): brokenSeals tracks the two engine-defaulted seal ids", JSON.stringify(asF.state.brokenSeals) === JSON.stringify(["1-north", "2-north"]));
ok("authored loss (sealsRemoved): a gameLost directive carries the authored reason",
   asRun.flatMap(r => r.directives).some(d => d.type === "log.entry" && d.event === "gameLost" && d.reason === "loss-condition"));
ok("authored loss (sealsRemoved): a sealRemoved event was raised by the break (engine-owned mirror advanced)",
   asRun.flatMap(r => r.directives).some(d => d.type === "log.entry" && d.event === "sealRemoved"));
// guard-holds: after the FIRST break the guard sits at 1 < 2 and the turn continues to the drop boundary
// (run[1]) — the loss fires only on the second break, the subsequent action's traversal of n-lossguard.
ok("authored loss (sealsRemoved): the guard holds at one seal (turn 1 ends awaitingInput with sealsRemoved 1)",
   asRun[1].state.sealsRemoved === 1 && asRun[1].status === "awaitingInput" && asRun[1].state.outcome.reason === null);
ok("authored loss (sealsRemoved): the stream replays byte-identically (lockstep determinism)", identical(goldenAuthoredLossSeal, asOpts, asStream));

// =====================================================================================
// 12 — MULTI-HERO WIN at 3P / 4P (stretch) — the 2P win (§7) generalized across higher seat counts
// =====================================================================================
// §7 proved the 2P win with the battle resolved by the rotated seat (hero2). This drives the SAME win
// stream at 3P and 4P. Rotation is continuous (the §107 month-boundary rule is just turnOrder-next), so
// the k-th action across the whole game belongs to turnOrder[(k-1) mod N] regardless of the seed-drawn
// month length. The build is 3 quests + 1 battle = 4 actions, so the battle (action 4) lands on
// turnOrder[3 mod N]: at 3P that WRAPS back to hero1 (the opener), at 4P it is hero4 (the last seat) —
// each distinct from 2P's hero2, yet each completes the global main goal (goalProgress reaches 3 from
// mixed seats) and defeats Ashstrider.
const winStream3 = [act("quest"), obs(0), act("quest"), obs(0), act("quest"), obs(0), act("battle"), tgt("ashstrider"), adv(5)];
const battleSeatFor = (pc) => { const f = lastOf(engine.replay(golden, { seed: "mvp-runtime-seed", playerCount: pc }, winStream3)); return f; };
const w3 = battleSeatFor(3);
ok("multi-hero win (3P): reaches a clean WIN (adversary-defeated)", w3.status === "won" && w3.state.outcome.reason === "adversary-defeated", "got " + w3.status + " / " + w3.state.outcome.reason);
ok("multi-hero win (3P): the battle resolved on the rotation-determined seat (action 4 wraps to hero1, distinct from 2P's hero2)",
   w3.state.clock.activeHero === "hero1" && w3.state.adversary.defeated && w3.state.counters.goalProgress === 3);
ok("multi-hero win (3P): the scripted stream replays byte-identically (lockstep determinism)", identical(golden, { seed: "mvp-runtime-seed", playerCount: 3 }, winStream3));
ok("multi-hero win (3P): outcome is seed-independent (always won/adversary-defeated, always the rotated seat hero1)",
   ["different-seed", "s2", "s3", "alpha"].map(s => lastOf(engine.replay(golden, { seed: s, playerCount: 3 }, winStream3))).every(f => f.status === "won" && f.state.outcome.reason === "adversary-defeated" && f.state.clock.activeHero === "hero1"));
const w4 = battleSeatFor(4);
ok("multi-hero win (4P): reaches a clean WIN, battle on hero4 (the 4th seat, action 4 = turnOrder[3])",
   w4.status === "won" && w4.state.outcome.reason === "adversary-defeated" && w4.state.clock.activeHero === "hero4" && w4.state.counters.goalProgress === 3);
ok("multi-hero win (4P): replays byte-identically and is seed-independent (always won/adversary-defeated, always hero4)",
   identical(golden, { seed: "mvp-runtime-seed", playerCount: 4 }, winStream3) &&
   ["different-seed", "s2", "s3", "alpha"].map(s => lastOf(engine.replay(golden, { seed: s, playerCount: 4 }, winStream3))).every(f => f.status === "won" && f.state.outcome.reason === "adversary-defeated" && f.state.clock.activeHero === "hero4"));

// =====================================================================================
// 13 — MULTI-HERO AUTHORED LOSS — the per-ACTING-hero `resource` guard fires on the rotated seat
// =====================================================================================
// Every authored loss above is 1P. But the resource guard is semantically distinct from the global
// counter/flag guards: evalCondition's `resource` branch reads state.heroes[ACTIVEHERO][key], so the
// guard `resource warriors gte 9` watches whichever seat is currently acting. This 2P stream on the SAME
// goldenAuthoredLossResource (no new fixture) proves the guard fires on the ROTATED seat, not a fixed
// seat or a global: hero1 passes (warriors stay 7 < 9, guard holds), the seat rotates, then hero2
// reinforces (7 → 9) and the guard — now reading hero2 — fires. hero1's untouched 7 is irrelevant to it.
const mhalOpts = { seed: "mvp-runtime-seed", playerCount: 2 };
const mhalStream = [act("pass"), obs(0), act("reinforce")];
const mhalRun = engine.replay(goldenAuthoredLossResource, mhalOpts, mhalStream);
const mhalF = lastOf(mhalRun);
ok("multi-hero authored loss: reaches a clean LOSS", mhalF.status === "lost", "got " + mhalF.status + " / " + mhalF.state.outcome.reason);
ok("multi-hero authored loss: reason is loss-condition (authored)", mhalF.state.outcome.reason === "loss-condition");
ok("multi-hero authored loss: the loss fired on the ROTATED seat hero2 (not the opener hero1)", mhalF.state.clock.activeHero === "hero2");
// the crux: the resource guard is per-ACTING-hero, not global and not a fixed seat — hero2 (who
// reinforced) sits at 9 and tripped it, while hero1 (who only passed) is untouched at 7 and did NOT.
ok("multi-hero authored loss: per-acting-hero — hero2 (who reinforced) is at 9, hero1 (who passed) untouched at 7",
   mhalF.state.heroes.hero2.warriors === 9 && mhalF.state.heroes.hero1.warriors === 7);
// guard-holds across the rotation: on hero1's turn the guard read hero1's 7 (< 9) and the turn continued.
ok("multi-hero authored loss: the guard held on hero1's turn (hero1 active, warriors 7, no loss)",
   mhalRun[1].state.clock.activeHero === "hero1" && mhalRun[1].state.heroes.hero1.warriors === 7 && mhalRun[1].status === "awaitingInput" && mhalRun[1].state.outcome.reason === null);
ok("multi-hero authored loss: a gameLost directive carries the authored reason",
   mhalRun.flatMap(r => r.directives).some(d => d.type === "log.entry" && d.event === "gameLost" && d.reason === "loss-condition"));
// symmetry: the SAME fixture fires on hero1 when hero1 reinforces first — confirming the guard tracks the
// active seat, whichever it is (hero1 here, before any rotation), not a hard-coded hero2.
const mhalSym = lastOf(engine.replay(goldenAuthoredLossResource, mhalOpts, [act("reinforce")]));
ok("multi-hero authored loss: symmetric — the same guard fires on hero1 when hero1 reinforces first (hero1 at 9, hero2 untouched at 7)",
   mhalSym.status === "lost" && mhalSym.state.clock.activeHero === "hero1" && mhalSym.state.heroes.hero1.warriors === 9 && mhalSym.state.heroes.hero2.warriors === 7);
ok("multi-hero authored loss: the stream replays byte-identically (lockstep determinism)", identical(goldenAuthoredLossResource, mhalOpts, mhalStream));

// =====================================================================================
// 14 — AUTHORED loss via the foeOnSpace condition subject (v0.9 — first engine change since v0.6)
// =====================================================================================
// foeOnSpace previously had no evalCondition branch (in the schema enum, but runtime-faulting). v0.9
// adds it: lhs = count of foes whose location === key, so `key` is the SPACE and the comparator/value
// test the count. The branch reads existing state (state.foes[].location, maintained by foe.spawn/
// foe.move) — no new plumbing. First a DIRECT unit boundary on a real run state, then the lockstep
// stream. goldenAuthoredLossFoe splices an effect.apply(foe.spawn brigands @the-tower) ahead of the
// guard foeOnSpace gte 2, so each plain action spawns one foe onto the-tower; turn 1 (1 foe, guard holds
// 1 < 2) → obs ends the turn; turn 2 (2nd foe) → loseGame("loss-condition"). (heroAtLocation, the sibling
// enum subject, stays Board-blocked — heroes carry no headless position.)
const afOpts = { seed: "mvp-runtime-seed", playerCount: 1 };
const afStream = [act("pass"), obs(0), act("pass")];
const afRun = engine.replay(goldenAuthoredLossFoe, afOpts, afStream);
const afF = lastOf(afRun);
// direct unit boundary: after the FIRST spawn (run[1]) exactly one foe is on the-tower — gte 1 true,
// gte 2 false, and a different space reads 0 (the branch keys on location, not a global foe count).
ok("foeOnSpace (unit): gte 1 is true with one foe on the space", engine.evalCondition(cond("foeOnSpace", "gte", 1, "the-tower"), afRun[1].state) === true);
ok("foeOnSpace (unit): gte 2 is false with only one foe on the space (guard boundary)", engine.evalCondition(cond("foeOnSpace", "gte", 2, "the-tower"), afRun[1].state) === false);
ok("foeOnSpace (unit): a different space reads 0 (keyed on location, not a global foe count)", engine.evalCondition(cond("foeOnSpace", "gte", 1, "elsewhere"), afRun[1].state) === false);
// lockstep stream:
ok("authored loss (foeOnSpace): reaches a clean LOSS", afF.status === "lost", "got " + afF.status + " / " + afF.state.outcome.reason);
ok("authored loss (foeOnSpace): reason is loss-condition (authored, on the foeOnSpace subject)", afF.state.outcome.reason === "loss-condition");
ok("authored loss (foeOnSpace): the threshold was reached by real gameplay (two foe.spawn → 2 foes on the-tower)",
   afF.state.foes.filter(f => f.location === "the-tower").length === 2);
ok("authored loss (foeOnSpace): a gameLost directive carries the authored reason",
   afRun.flatMap(r => r.directives).some(d => d.type === "log.entry" && d.event === "gameLost" && d.reason === "loss-condition"));
ok("authored loss (foeOnSpace): the guard holds at one foe (turn 1 ends awaitingInput with one foe on the space)",
   afRun[1].state.foes.filter(f => f.location === "the-tower").length === 1 && afRun[1].status === "awaitingInput" && afRun[1].state.outcome.reason === null);
ok("authored loss (foeOnSpace): the stream replays byte-identically (lockstep determinism)", identical(goldenAuthoredLossFoe, afOpts, afStream));

// =====================================================================================
// L1: the corpus fixtures (supply variants + the authored-loss clone) stay schema-valid (§9 / L1)
// =====================================================================================
const ajv = new Ajv({ strict: true, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(fs.readFileSync("scenario.schema.json", "utf8")));
ok("L1: goldenLowSupply is schema-valid", validate(goldenLowSupply), JSON.stringify(validate.errors));
ok("L1: goldenAmpleSupply is schema-valid", validate(goldenAmpleSupply), JSON.stringify(validate.errors));
ok("L1: goldenAuthoredLoss (winloss.lossCondition clone) is schema-valid", validate(goldenAuthoredLoss), JSON.stringify(validate.errors));
ok("L1: goldenAuthoredLossFlag (flag-subject lossCondition clone) is schema-valid", validate(goldenAuthoredLossFlag), JSON.stringify(validate.errors));
ok("L1: goldenWardedVault (higher-spiritCost dungeon clone) is schema-valid", validate(goldenWardedVault), JSON.stringify(validate.errors));
ok("L1: goldenAuthoredLossResource (resource-subject lossCondition clone) is schema-valid", validate(goldenAuthoredLossResource), JSON.stringify(validate.errors));
ok("L1: goldenAuthoredLossSeal (sealsRemoved-subject lossCondition clone, effect.apply seal.remove driver) is schema-valid", validate(goldenAuthoredLossSeal), JSON.stringify(validate.errors));
ok("L1: goldenAuthoredLossFoe (foeOnSpace-subject lossCondition clone, effect.apply foe.spawn driver) is schema-valid", validate(goldenAuthoredLossFoe), JSON.stringify(validate.errors));

// =====================================================================================
// cross-cut: the skull invariant still holds across every new stream
// =====================================================================================
const allDrops = dropTriggers(esRun).concat(dropTriggers(tradeRun)).concat(dropTriggers(xhRun)).concat(dropTriggers(alRun))
  .concat(dropTriggers(mhWin)).concat(dropTriggers(flRun)).concat(dropTriggers(wvRun))
  .concat(dropTriggers(arRun)).concat(dropTriggers(asRun)).concat(dropTriggers(mhalRun)).concat(dropTriggers(afRun))
  .concat(oot.final ? dropTriggers(engine.replay(goldenAmpleSupply, ootOpts, oot.inputs)) : []);
ok("skull invariant: no skull.dropTrigger across the corpus carries a count",
   allDrops.length > 0 && allDrops.every(d => d.ops.every(o => !("count" in o))));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);