// events_test.js — the end-of-turn event pipeline (rules.md §Events): trigger.schedule /
// trigger.onState roots fire after the skull drop resolves, run their event chains (foes strike,
// foes grow, tower stirs, new wares, …), then the turn spine resumes. Deterministic order,
// skull-invariant safe, and inert for legacy scenarios with no trigger nodes.

const engine = require("../dist/engine");
const { golden, goldenFull } = require("../dist/golden-fixture");

let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log("PASS  " + name); } else { fail++; console.log("XXXX  " + name + (extra ? "  — " + extra : "")); } }

const act = (choice, args) => ({ requestId: "action", value: args ? { choice, ...args } : { choice }, kind: "decision" });
const obs = (v) => ({ requestId: "skullCounter", value: v, kind: "observed" });
const mov = (to) => ({ requestId: "moveTarget", value: { to }, kind: "decision" });
const opts = { seed: "mvp-runtime-seed", playerCount: 1 };
const lastOf = (run) => run[run.length - 1];

function fixedMonths(base) {
  const c = JSON.parse(JSON.stringify(base || goldenFull));
  c.setup.monthEnd.default = { minTurn: 3, maxTurn: 3 };
  delete c.setup.monthEnd.perMonth["6"];
  return c;
}
function drive(scenario, o, script) {
  let r = engine.init(scenario, o);
  const results = [r];
  let i = 0, guard = 0;
  while (r.status === "awaitingInput" && guard++ < 500) {
    const req = r.awaiting;
    let input;
    if (req.id === "skullCounter" && !(i < script.length && script[i].requestId === "skullCounter")) input = obs(0);
    else { if (i >= script.length) break; input = script[i++]; }
    r = engine.step(r.state, input);
    results.push(r);
  }
  return results;
}
const gf = fixedMonths();
const dirs = (run) => run.flatMap(r => r.directives);

// ---------- scheduled events fire at the end of the matching turn ----------
{
  const run = drive(gf, opts, [act("endTurn")]); // M1 T1 → turn:1 triggers (tower stirs + new wares)
  ok("tower stirs at turn 1 (drum.rotate emitted)", dirs(run).some(d => d.type === "tower.program" && (d.ops || []).some(o => o.channel === "drum.rotate")));
  ok("new wares refresh the market", lastOf(run).state.market.includes("azkol-idol"));
  ok("no strike on month 1's single turn (turn-2 trigger idle)", !dirs(run).some(d => d.type === "log.entry" && d.event === "foeStrike"));
  ok("skull invariant holds across event directives",
     dirs(run).filter(d => d.type === "tower.program").every(d => (d.ops || []).every(o => !("count" in o))));
}

// ---------- foes strike: each foe on the board hits the acting hero ----------
{
  const run = drive(gf, opts, [act("endTurn"), act("endTurn"), act("endTurn")]); // through M2 T2
  const s = lastOf(run).state;
  const strikes = dirs(run).filter(d => d.type === "log.entry" && d.event === "foeStrike");
  ok("all three foes strike at turn 2 of the month", strikes.length === 3, "strikes=" + strikes.length);
  ok("strikes cost the acting hero warriors (7 − 3)", s.heroes.hero1.warriors === 4, "warriors=" + s.heroes.hero1.warriors);
}
{
  // a defeated foe no longer strikes
  const tgt = (foeId) => ({ requestId: "target", value: { foeId }, kind: "decision" });
  const adv = (spend) => ({ requestId: "advantageSpend", value: { spend }, kind: "decision" });
  const run = drive(gf, opts, [
    act("move"), mov("Delmsmire"), act("battle"), tgt("brigands"), adv(2), act("endTurn"), // M1: kill brigands
    act("endTurn"), act("endTurn")]); // M2 T2 strike
  const strikes = dirs(run).filter(d => d.type === "log.entry" && d.event === "foeStrike");
  ok("a defeated foe is skipped by foes-strike", strikes.length === 2 && !strikes.some(d => d.foeId === "brigands"));
}

// ---------- foes grow: the status ladder advances and clamps ----------
{
  const run = drive(gf, opts, [act("endTurn"), act("endTurn"), act("endTurn"), act("endTurn")]); // through M2 T3
  const s = lastOf(run).state;
  ok("foes grow at turn 3 (ready → savage)", s.foes.every(f => f.status === "savage"), JSON.stringify(s.foes.map(f => f.status)));
  const long = drive(gf, opts, Array(13).fill(act("endTurn"))); // many months of growth
  ok("the ladder clamps at lethal", lastOf(long).state.foes.every(f => ["savage", "lethal"].includes(f.status)));
}

// ---------- events resolve before the seat rotates (multi-hero) ----------
{
  const run = drive(gf, { seed: "mvp-runtime-seed", playerCount: 2 }, [act("endTurn"), act("endTurn"), act("endTurn")]);
  const s = lastOf(run).state;
  // 2P seats: M1T1 = hero1, M2T1 = hero2 (rotation), M2T2 = hero1 — the M2T2 strike lands on
  // hero1 (the hero whose turn is ending), never on the seated-out hero.
  ok("strikes hit the hero whose turn is ending", s.heroes.hero1.warriors === 4 && s.heroes.hero2.warriors === 7,
     "h1=" + s.heroes.hero1.warriors + " h2=" + s.heroes.hero2.warriors);
}

// ---------- onState triggers: raised events are consumed at the turn boundary ----------
{
  const c = fixedMonths();
  c.graph.nodes.push(
    { id: "n-trig-qdone", kind: "trigger.onState", props: { trigger: { on: "onState", event: "questComplete" } }, wires: { out: ["n-ev-qdone"] } },
    { id: "n-ev-qdone", kind: "event.towerActs", props: { effects: [{ op: "flag.set", name: "sagaAdvanced", value: true }] }, wires: {} }
  );
  const dmove = (d) => ({ requestId: "dungeonMove", value: { direction: d }, kind: "decision" });
  const dimp = (v) => ({ requestId: "dungeonRoomAdvantage", value: { improve: v }, kind: "decision" });
  const run = drive(c, opts, [act("dungeon"), dimp(false), dmove("E"), dmove("E"), act("endTurn")]);
  const s = lastOf(run).state;
  ok("an onState trigger fires at the boundary after its event was raised", s.flags.sagaAdvanced === true);
  const run2 = drive(c, opts, [act("endTurn")]);
  ok("the onState trigger stays idle when its event never fired", lastOf(run2).state.flags.sagaAdvanced === undefined);
}

// ---------- determinism & legacy inertness ----------
{
  const script = Array(6).fill(act("endTurn"));
  const traceOf = (rr) => JSON.stringify(rr.map(x => ({ s: x.status, d: engine.digest(x.state), dir: JSON.stringify(x.directives) })));
  ok("event-heavy streams replay byte-identically", traceOf(drive(gf, opts, script)) === traceOf(drive(gf, opts, script)));
  const lact = (v) => ({ requestId: "action", value: v, kind: "decision" });
  const legacy = engine.replay(golden, opts, [lact("pass"), obs(0), lact("pass"), obs(0)]);
  ok("legacy golden emits no event directives (no trigger nodes)",
     !dirs(legacy).some(d => d.type === "log.entry" && ["foeStrike", "foesGrow", "towerStirs", "newWares"].includes(d.event)));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
