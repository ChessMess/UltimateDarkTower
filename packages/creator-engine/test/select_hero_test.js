// select_hero_test.js — lifecycle.selectHero: a real runtime await boundary where each active
// seat (turnOrder) picks one distinct hero from an authored candidate pool (props.heroIds), in
// seat order, until every seat has HeroState.heroRef set. Covers single-seat, multi-seat
// uniqueness + seat-order, and the pool-exhaustion fault. Splices the node into a golden clone
// rather than touching the frozen golden/goldenFull streams.

const engine = require("../dist/engine");
const { golden } = require("../dist/golden-fixture");

let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log("PASS  " + name); } else { fail++; console.log("XXXX  " + name + (extra ? "  — " + extra : "")); } }
function expectFault(name, fn) {
  try { fn(); fail++; console.log("XXXX  " + name + "  — expected fault"); }
  catch (e) { if (e.isFault) { pass++; console.log("PASS  " + name); } else { fail++; console.log("XXXX  " + name + "  — wrong error: " + e.message); } }
}

const heroSel = (heroId) => ({ requestId: "heroSelect", value: { heroId }, kind: "decision" });

// Clone golden and splice a lifecycle.selectHero node between gameStart and boardSetup, with the
// given candidate pool. Everything downstream is untouched.
function withSelectHero(heroIds) {
  const c = JSON.parse(JSON.stringify(golden));
  const nodes = c.graph.nodes;
  const start = nodes.find((n) => n.id === "n-start");
  start.wires.out = ["n-selecthero"];
  const setupIdx = nodes.findIndex((n) => n.id === "n-setup");
  nodes.splice(setupIdx, 0, {
    id: "n-selecthero", kind: "lifecycle.selectHero",
    props: { heroIds }, wires: { out: ["n-setup"] },
  });
  return c;
}

const POOL = ["brutal-warlord", "orphaned-scion", "relic-hunter", "spymaster", "archwright"];

// ---------- single seat ----------
(() => {
  const sc = withSelectHero(POOL.slice(0, 2));
  const r0 = engine.init(sc, { seed: "s", playerCount: 1 });
  ok("1P: init pauses at the heroSelect boundary", r0.status === "awaitingInput" && r0.awaiting && r0.awaiting.id === "heroSelect");
  ok("1P: the request offers the full authored pool", r0.awaiting && JSON.stringify(r0.awaiting.options) === JSON.stringify([{ id: "brutal-warlord" }, { id: "orphaned-scion" }]));
  const prompt = r0.directives.find((d) => d.type === "ui.prompt" && d.requestId === "heroSelect");
  ok("1P: a ui.prompt directive carries the choice", !!prompt);

  const r1 = engine.step(r0.state, heroSel("orphaned-scion"));
  ok("1P: after the pick, hero1.heroRef is assigned", r1.state.heroes.hero1.heroRef === "orphaned-scion");
  ok("1P: the selection cursor is cleared once all seats are done", r1.state.clock.heroSelect === null);
  ok("1P: the run proceeds past the node (no longer awaiting heroSelect)", !(r1.awaiting && r1.awaiting.id === "heroSelect"));
  const logged = r1.directives.find((d) => d.type === "log.entry" && d.event === "heroSelected");
  ok("1P: a heroSelected log entry is emitted", logged && logged.hero === "hero1" && logged.heroId === "orphaned-scion");
})();

// ---------- four seats: uniqueness + seat order ----------
(() => {
  const sc = withSelectHero(POOL);
  let r = engine.init(sc, { seed: "s", playerCount: 4 });
  const picks = ["spymaster", "relic-hunter", "brutal-warlord", "archwright"];
  const askedSeats = [];
  for (let i = 0; i < 4; i++) {
    ok("4P: seat " + (i + 1) + " is awaiting heroSelect", r.status === "awaitingInput" && r.awaiting.id === "heroSelect");
    askedSeats.push(r.state.clock.heroSelect.seatIndex);
    // the offered pool must never include an already-claimed hero
    const offered = r.awaiting.options.map((o) => o.id);
    const claimedSoFar = picks.slice(0, i);
    ok("4P: seat " + (i + 1) + " pool excludes already-claimed heroes", claimedSoFar.every((h) => !offered.includes(h)));
    r = engine.step(r.state, heroSel(picks[i]));
  }
  ok("4P: seats are asked in turnOrder index order 0,1,2,3", JSON.stringify(askedSeats) === JSON.stringify([0, 1, 2, 3]));
  const refs = ["hero1", "hero2", "hero3", "hero4"].map((h) => r.state.heroes[h].heroRef);
  ok("4P: every seat received the hero it picked, in order", JSON.stringify(refs) === JSON.stringify(picks));
  ok("4P: all four heroRefs are distinct", new Set(refs).size === 4);
  ok("4P: the selection cursor is cleared after the last seat", r.state.clock.heroSelect === null);
})();

// ---------- pool exhaustion ----------
expectFault("pool smaller than seat count faults at runtime", () => {
  const sc = withSelectHero(["brutal-warlord", "orphaned-scion"]);
  let r = engine.init(sc, { seed: "s", playerCount: 3 });
  r = engine.step(r.state, heroSel("brutal-warlord"));
  r = engine.step(r.state, heroSel("orphaned-scion"));
  // third seat: pool is now empty — nodes.ts throws before offering an empty choice
});

// ---------- invalid pick ----------
expectFault("picking a hero not in the remaining pool faults", () => {
  const sc = withSelectHero(["brutal-warlord", "orphaned-scion"]);
  const r = engine.init(sc, { seed: "s", playerCount: 1 });
  engine.step(r.state, heroSel("dragons")); // not a hero, not in pool
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
