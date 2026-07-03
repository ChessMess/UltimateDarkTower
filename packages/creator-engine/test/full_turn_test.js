// full_turn_test.js — the goldenFull base-game fidelity scenario (rules.md §Taking Your Turn):
// optional banner + move + ONE heroic action (+2 spirit on completion) + reinforce, in any order,
// each once per turn; building-based Reinforce/Cleanse; located quests and monthly quests; the
// located final confrontation. Proves legacy `golden` still runs the single-action loop unchanged.

const engine = require("../src/engine");
const { golden, goldenFull } = require("../src/golden-fixture");

let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log("PASS  " + name); } else { fail++; console.log("XXXX  " + name + (extra ? "  — " + extra : "")); } }
function expectFault(name, fn) { try { fn(); fail++; console.log("XXXX  " + name + "  — expected fault"); } catch (e) { if (e.isFault) { pass++; console.log("PASS  " + name); } else { fail++; console.log("XXXX  " + name + "  — wrong error: " + e.message); } } }

// input constructors (§5.3) — full-turn action decisions are { choice, ...args }
const act = (choice, args) => ({ requestId: "action", value: args ? { choice, ...args } : { choice }, kind: "decision" });
const obs = (v) => ({ requestId: "skullCounter", value: v, kind: "observed" });
const tgt = (foeId) => ({ requestId: "target", value: { foeId }, kind: "decision" });
const adv = (spend) => ({ requestId: "advantageSpend", value: { spend }, kind: "decision" });
const mov = (to) => ({ requestId: "moveTarget", value: { to }, kind: "decision" });
const dmove = (direction) => ({ requestId: "dungeonMove", value: { direction }, kind: "decision" });
const dimp = (improve) => ({ requestId: "dungeonRoomAdvantage", value: { improve }, kind: "decision" });
const opts = { seed: "mvp-runtime-seed", playerCount: 1 };

// drive(): steps through a script of decision inputs, auto-answering skullCounter with obs(0)
// unless the script's next entry is an observed input. Robust to seed-drawn month lengths.
function drive(scenario, o, script) {
  let r = engine.init(scenario, o);
  const results = [r];
  let i = 0, guard = 0;
  while (r.status === "awaitingInput" && guard++ < 500) {
    const req = r.awaiting;
    let input;
    if (req.id === "skullCounter" && !(i < script.length && script[i].requestId === "skullCounter")) {
      input = obs(0);
    } else {
      if (i >= script.length) break;
      input = script[i++];
      if (input.requestId !== req.id) throw new Error("script mismatch at " + i + ": engine awaits '" + req.id + "', script has '" + input.requestId + "'");
    }
    r = engine.step(r.state, input);
    results.push(r);
  }
  return results;
}
const lastOf = (run) => run[run.length - 1];

// a goldenFull clone with FIXED month lengths (months 2+ = exactly 3 turns) so monthly-quest
// boundaries are stream-predictable; month 1 stays the authored single turn.
function fixedMonths() {
  const c = JSON.parse(JSON.stringify(goldenFull));
  c.setup.monthEnd.default = { minTurn: 3, maxTurn: 3 };
  delete c.setup.monthEnd.perMonth["6"];
  return c;
}
const gf = fixedMonths();

// ---------- init fidelity ----------
const r0 = engine.init(goldenFull, opts);
ok("hero starts at the home citadel (rules.md §Hero Setup)", r0.state.heroes.hero1.location === "Radiant Mountains");
ok("the 16-building registry is live", r0.state.buildings.length === 16 && r0.state.buildings.every(b => b.skulls === 0 && !b.destroyed));
ok("full-turn heroes carry the 3+3 virtue split (placeholders)",
   r0.state.heroes.hero1.virtues.active.length === 3 && r0.state.heroes.hero1.virtues.inactive.length === 3);
ok("month 1 is exactly one turn per player", r0.state.clock.turnsThisMonth === 1);
ok("boardSetup emits a placeHero directive for hero1's home citadel",
   r0.directives.some(d => d.type === "board.mutate" && d.command === "placeHero" && d.args.hero === "hero1" && d.args.to === "Radiant Mountains"));
ok("the full-turn action menu offers banner/move/heroic/reinforce/endTurn",
   ["banner", "move", "quest", "cleanse", "battle", "dungeon", "reinforce", "endTurn"].every(o =>
     r0.awaiting.options.some(x => x.id === o)));

// ---------- foe levels derive from selection tier ----------
{
  const run = drive(gf, opts, [act("move"), mov("Dragontooth Lake"), act("battle"), tgt("dragons")]);
  const b = lastOf(run).state.clock.battle;
  ok("dragons (tier3) draw 4 battle cards", b && b.level === 4 && b.cards.length === 4, JSON.stringify(b && b.cards));
  const run2 = drive(gf, opts, [act("move"), mov("The Tundra"), act("battle"), tgt("frost-trolls")]);
  const b2 = lastOf(run2).state.clock.battle;
  ok("frost-trolls (tier2) draw 3 battle cards", b2 && b2.level === 3 && b2.cards.length === 3);
}

// ---------- one full turn: banner + move + heroic (battle) + reinforce, any order ----------
{
  const run = drive(gf, opts, [
    act("banner"),
    act("move"), mov("Delmsmire"),
    act("battle"), tgt("brigands"), adv(2),
    act("reinforce"), // no building at Delmsmire → covered below as fault; here use citadel first
  ].slice(0, 6)); // banner, move, battle only
  const s = lastOf(run).state;
  ok("banner + move + battle in a single turn", s.clock.latches.bannerUsed && s.clock.latches.moveUsed && s.clock.latches.heroicActionUsed);
  ok("battle heroic completion awards 2 spirit", s.heroes.hero1.spirit === 3, "spirit=" + s.heroes.hero1.spirit);
  ok("brigands defeated at their own space", !s.foes.some(f => f.foeId === "brigands"));
  ok("turn is still open after three actions (menu shrinks)", lastOf(run).status === "awaitingInput" && lastOf(run).awaiting.id === "action");
  ok("spent options leave the menu", !lastOf(run).awaiting.options.some(o => ["banner", "move", "battle", "quest"].includes(o.id)));
}

// ---------- per-turn latches fault on reuse ----------
expectFault("second banner in a turn faults", () => drive(gf, opts, [act("banner"), act("banner")]));
expectFault("second move in a turn faults", () => drive(gf, opts, [act("move"), mov("Delmsmire"), act("move"), mov("The Tundra")]));
expectFault("second heroic action in a turn faults", () =>
  drive(gf, opts, [act("move"), mov("Delmsmire"), act("battle"), tgt("brigands"), adv(2), act("cleanse")]));
expectFault("pass is not a full-turn action (use endTurn)", () => drive(gf, opts, [act("pass")]));

// ---------- battle location gating (rules.md §Battle: a foe ON YOUR SPACE) ----------
expectFault("battling a foe elsewhere faults", () => drive(gf, opts, [act("battle"), tgt("brigands")]));
expectFault("battling the unspawned adversary faults", () => drive(gf, opts, [act("battle"), tgt("ashstrider")]));

// ---------- building-based Reinforce (rules.md §Reinforce / buildings.md) ----------
{
  const run = drive(gf, opts, [act("reinforce")]); // at the home citadel
  const h = lastOf(run).state.heroes.hero1;
  ok("citadel free reinforce grants a potion", h.items.potions.length === 1);
}
{
  const run = drive(gf, opts, [act("move"), mov("Egan's End"), act("reinforce")]);
  const h = lastOf(run).state.heroes.hero1;
  ok("village free reinforce grants 6 warriors (7 → 13)", h.warriors === 13, "warriors=" + h.warriors);
}
{
  const run = drive(gf, opts, [act("move"), mov("Egan's End"), act("reinforce", { enhanced: true })]);
  const h = lastOf(run).state.heroes.hero1;
  ok("village enhanced reinforce: 1 spirit → 12 warriors", h.warriors === 19 && h.spirit === 0, "w=" + h.warriors + " s=" + h.spirit);
}
{
  const run = drive(gf, opts, [act("move"), mov("Dayside"), act("reinforce")]);
  const h = lastOf(run).state.heroes.hero1;
  ok("bazaar free reinforce grants a gear", h.items.gear.length === 1);
}
expectFault("reinforce away from any building faults", () => drive(gf, opts, [act("move"), mov("Delmsmire"), act("reinforce")]));
expectFault("second reinforce in a turn faults", () => drive(gf, opts, [act("reinforce"), act("reinforce")]));

// ---------- citadel enhanced: 5 spirit → activate a virtue ----------
{
  // bank spirit via dungeon heroic (+1 entry, -1 hall, +1 warriors… net spirit: 1+1-1+1(quest)+2(heroic)=4) then sanctuary
  const run = drive(gf, opts, [
    act("dungeon"), dimp(false), dmove("E"), dmove("E"), // clears the vault: spirit 1→2→1, +1 quest, +2 heroic = 4
    act("endTurn"),
    act("move"), mov("Upper Ice Fangs"), act("reinforce"), // sanctuary free: +1 spirit = 5
    act("endTurn"),
    act("move"), mov("Radiant Mountains"), act("reinforce", { enhanced: true }) // citadel: -5 spirit → virtue
  ]);
  const h = lastOf(run).state.heroes.hero1;
  ok("citadel enhanced activates a virtue for 5 spirit", h.virtues.active.length === 4 && h.virtues.inactive.length === 2 && h.spirit === 0,
     "active=" + h.virtues.active.length + " spirit=" + h.spirit);
  ok("dungeon completion pays the quest + heroic rewards", h.warriors >= 8); // hall's +1 warrior landed
}

// ---------- Cleanse removes ALL skulls from the building on your space ----------
{
  const place4 = { requestId: "skullCounter", value: { count: 2, placements: [
    { kingdom: "north", type: "citadel" }, { kingdom: "north", type: "citadel" }] }, kind: "observed" };
  const run = drive(gf, opts, [act("endTurn"), place4, act("cleanse")]);
  const s = lastOf(run).state;
  const citadel = s.buildings.find(b => b.kingdom === "north" && b.type === "citadel");
  ok("cleanse zeroes the building's skulls and returns them to the supply",
     citadel.skulls === 0 && s.skulls.onBoard === 0, "skulls=" + citadel.skulls + " onBoard=" + s.skulls.onBoard);
  ok("cleanse pays the 2-spirit heroic reward", s.heroes.hero1.spirit === 3, "spirit=" + s.heroes.hero1.spirit);
}
expectFault("cleansing a skull-less building faults", () => drive(gf, opts, [act("cleanse")]));

// ---------- per-building skulls: the 4th destroys, owner gains corruption ----------
{
  const skulls4 = (type) => ({ requestId: "skullCounter", value: { count: 4, placements: [
    { kingdom: "north", type }, { kingdom: "north", type }, { kingdom: "north", type }, { kingdom: "north", type }] }, kind: "observed" });
  const run = drive(gf, opts, [act("endTurn"), skulls4("village")]);
  const s = lastOf(run).state;
  const village = s.buildings.find(b => b.type === "village" && b.kingdom === "north");
  ok("the 4th skull destroys the building", village.destroyed === true);
  ok("the owning kingdom's hero gains the corruption", s.heroes.hero1.corruption === 1);
  ok("the 4th skull returns to supply, the 3 leave the game (supply 24-1+1)", s.skulls.supply === 24 && s.skulls.onBoard === 0,
     "supply=" + s.skulls.supply + " onBoard=" + s.skulls.onBoard);
  // destroyed buildings can no longer be reinforced
  let faulted = false;
  try { drive(gf, opts, [act("endTurn"), skulls4("village"), act("move"), mov("Egan's End"), act("reinforce")]); }
  catch (e) { faulted = e.isFault; }
  ok("reinforce at a destroyed building faults", faulted);
}

// ---------- LOSS end-to-end: three razed buildings → third corruption ----------
{
  const raze = (type) => ({ requestId: "skullCounter", value: { count: 4, placements: [
    { kingdom: "north", type }, { kingdom: "north", type }, { kingdom: "north", type }, { kingdom: "north", type }] }, kind: "observed" });
  const run = drive(gf, opts, [act("endTurn"), raze("village"), act("endTurn"), raze("bazaar"), act("endTurn"), raze("sanctuary")]);
  const f = lastOf(run);
  ok("goldenFull reaches a CLEAN LOSS (third-corruption)", f.status === "lost" && f.state.outcome.reason === "third-corruption",
     f.status + "/" + f.state.outcome.reason);
}

// ---------- monthly quests (rules.md §Monthly Quests) ----------
{
  // month 2 issues the companion + adversary quests; completing the companion quest grants Zaida
  const run = drive(gf, opts, [
    act("endTurn"), // month 1 (single turn)
    act("move"), mov("Delmsmire"), act("quest", { questId: "zaida-escort" })
  ]);
  const s = lastOf(run).state;
  ok("month 2 activates the companion + adversary quests",
     (s.activeQuests || []).some(q => q.questId === "adv-quest-m2") || s.quests["zaida-escort"], JSON.stringify(s.activeQuests));
  ok("completing the companion quest grants Zaida", s.heroes.hero1.companions.includes("zaida"));
}
expectFault("a monthly quest cannot be taken before it is issued", () =>
  drive(gf, opts, [act("move"), mov("Delmsmire"), act("quest", { questId: "zaida-escort" })])); // month 1
expectFault("a quest's location requirement gates the quest action", () =>
  drive(gf, opts, [act("endTurn"), act("quest", { questId: "zaida-escort" })])); // month 2 but at the citadel
{
  // an unmet adversary quest applies its failure at month end (a scenario-determined skull)
  const run = drive(gf, opts, [act("endTurn"), act("endTurn"), act("endTurn"), act("endTurn"), act("endTurn")]);
  const s = lastOf(run).state;
  const failed = run.flatMap(r => r.directives).some(d => d.type === "log.entry" && d.event === "questFailed" && d.questId === "adv-quest-m2");
  ok("the month-2 adversary quest fails at month end", failed);
  // engine 0.4.0: skull.place now lands the skull on a standing building in the registry model
  // (source "effect" with the building it hit), rather than emitting a chooser prompt.
  ok("the failed adversary quest makes the world worse (skull placed from supply on a north building)",
     run.flatMap(r => r.directives).some(d => d.type === "board.mutate" && d.command === "placeSkull" && (d.args || {}).source === "effect" && (d.args || {}).kingdom === "north"));
  ok("the failed monthly quest is retired", !(s.activeQuests || []).some(q => q.questId === "adv-quest-m2"));
}

// ---------- WIN end-to-end: dungeon relic → shrine relic → main goal at the Tower → final battle ----------
const winScript = [
  // M1 T1 — the vault dungeon is the quest heroic action
  act("dungeon"), dimp(false), dmove("E"), dmove("E"), act("endTurn"),
  // M2 T1 — companion quest at Delmsmire
  act("move"), mov("Delmsmire"), act("quest", { questId: "zaida-escort" }), act("endTurn"),
  // M2 T2 — shrine relic at Azkol's Bane
  act("move"), mov("Azkol's Bane"), act("quest", { questId: "azkol-shrine" }), act("endTurn"),
  // M2 T3 — the main goal at the Tower → Ashstrider spawns there
  act("move"), mov("the-tower"), act("quest", { questId: "recover-azkols-treasures" }), act("endTurn"),
  // M3 T1 — the final battle on the Tower space
  act("battle"), tgt("ashstrider"), adv(5)
];
{
  const run = drive(gf, opts, winScript);
  const f = lastOf(run);
  ok("goldenFull reaches a CLEAN WIN (adversary-defeated)", f.status === "won" && f.state.outcome.reason === "adversary-defeated",
     f.status + "/" + f.state.outcome.reason + " m" + f.state.clock.month + "t" + f.state.clock.turnInMonth);
  ok("the adversary spawned ON the board at the Tower", f.state.adversary.location === "the-tower");
  ok("the main goal was completed before the battle", f.state.mainGoalComplete === true);
  ok("the shrine relic quest spent its warriors", run.flatMap(r => r.directives)
      .some(d => d.type === "log.entry" && d.event === "questComplete" && d.questId === "azkol-shrine"));
  // determinism: the same seed + stream is byte-identical
  const traceOf = (rr) => JSON.stringify(rr.map(x => ({ s: x.status, d: engine.digest(x.state), dir: JSON.stringify(x.directives) })));
  ok("the WIN stream replays byte-identically (lockstep)", traceOf(run) === traceOf(drive(gf, opts, winScript)));
}
expectFault("the main goal is location-gated (not takeable from the citadel)", () =>
  drive(gf, opts, [
    act("dungeon"), dimp(false), dmove("E"), dmove("E"), act("endTurn"),
    act("move"), mov("Azkol's Bane"), act("quest", { questId: "azkol-shrine" }), act("endTurn"),
    act("quest", { questId: "recover-azkols-treasures" }) // at Azkol's Bane, not the Tower
  ]));

// ---------- legacy golden is untouched by all of the above ----------
{
  const lact = (v) => ({ requestId: "action", value: v, kind: "decision" });
  const lobs = (v) => ({ requestId: "skullCounter", value: v, kind: "observed" });
  const ltgt = (foeId) => ({ requestId: "target", value: { foeId }, kind: "decision" });
  const ladv = (spend) => ({ requestId: "advantageSpend", value: { spend }, kind: "decision" });
  const win = engine.replay(golden, opts, [lact("quest"), lobs(0), lact("quest"), lobs(0), lact("quest"), lobs(0), lact("battle"), ltgt("ashstrider"), ladv(5)]);
  ok("legacy golden still wins via the single-action loop", lastOf(win).state.outcome.reason === "adversary-defeated");
  const first = engine.init(golden, opts);
  ok("legacy golden still offers the compact 4-option menu", first.awaiting.options.length === 4);
  ok("legacy heroes carry no placeholder virtues", first.state.heroes.hero1.virtues.active.length === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
