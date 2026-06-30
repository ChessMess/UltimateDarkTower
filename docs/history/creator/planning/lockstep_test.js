// lockstep_test.js — the L4 lockstep harness (rules-engine §9).
// Proves the golden MVP fixture is (1) schema-valid (L1), (2) driveable to a CLEAN WIN and a
// CLEAN LOSS by two scripted input streams, and (3) DETERMINISTIC — same seed + same stream ⇒
// byte-identical per-step (state digest, ordered directive stream, status). This is the
// "authored == runnable" guarantee that makes Creator-sim and Player-run the same computation.

const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
const fs = require("fs");
const engine = require("./engine");
const { golden } = require("./golden-fixture");

let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log("PASS  " + name); } else { fail++; console.log("XXXX  " + name + (extra ? "  — " + extra : "")); } }

// input constructors (§5.3)
const act = (v) => ({ requestId: "action", value: v, kind: "decision" });
const obs = (v) => ({ requestId: "skullCounter", value: v, kind: "observed" });

// ---------- L1: golden fixture is schema-valid ----------
const ajv = new Ajv({ strict: true, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(fs.readFileSync("scenario.schema.json", "utf8")));
ok("golden fixture is schema-valid (L1)", validate(golden), JSON.stringify(validate.errors));

const opts = { seed: "mvp-runtime-seed", playerCount: 1 };
const tgt = (foeId) => ({ requestId: "target", value: { foeId }, kind: "decision" });
const adv = (spend) => ({ requestId: "advantageSpend", value: { spend }, kind: "decision" });

// ---------- a clean WIN ----------
// quest ×3 → main goal complete → adversary spawns; then a real card-driven battle:
// select Ashstrider (5 cards) → spend 5 Advantages → all cards cleared → defeated → win.
const winStream = [act("quest"), obs(0), act("quest"), obs(0), act("quest"), obs(0), act("battle"), tgt("ashstrider"), adv(5)];
const winRun = engine.replay(golden, opts, winStream);
const winFinal = winRun[winRun.length - 1];
ok("golden fixture reaches a CLEAN WIN", winFinal.status === "won", "got " + winFinal.status + " / " + (winFinal.state.outcome.reason));
ok("win is by adversary-defeated", winFinal.state.outcome.reason === "adversary-defeated");
ok("win: main goal completed", winFinal.state.mainGoalComplete === true);
ok("win: adversary was spawned then defeated", winFinal.state.adversary.spawned && winFinal.state.adversary.defeated);
ok("win: battle cleared all cards (no warrior loss at 5 spend)", winFinal.state.heroes.hero1.warriors === 7);

// ---------- a clean LOSS ----------
// pass ×3 while the tower spits 4 emergent skulls each turn → 3 buildings destroyed → 3rd corruption.
const lossStream = [act("pass"), obs(4), act("pass"), obs(4), act("pass"), obs(4)];
const lossRun = engine.replay(golden, opts, lossStream);
const lossFinal = lossRun[lossRun.length - 1];
ok("golden fixture reaches a CLEAN LOSS", lossFinal.status === "lost", "got " + lossFinal.status + " / " + (lossFinal.state.outcome.reason));
ok("loss is by third-corruption", lossFinal.state.outcome.reason === "third-corruption");
ok("loss: active hero hit 3 corruption", lossFinal.state.heroes.hero1.corruption === 3);

// ---------- the skull invariant: no directive ever carries an emergence count ----------
function allDirectives(run) { return run.flatMap(r => r.directives); }
const towerPrograms = allDirectives(winRun).concat(allDirectives(lossRun)).filter(d => d.type === "tower.program");
const dropTriggers = towerPrograms.filter(d => (d.ops || []).some(o => o.channel === "skull.dropTrigger"));
ok("skull.dropTrigger directives carry no count (skull invariant)",
   dropTriggers.length > 0 && dropTriggers.every(d => d.ops.every(o => !("count" in o))));

// ---------- determinism / lockstep: same seed + same stream ⇒ byte-identical ----------
function trace(run) {
  return run.map(r => ({ status: r.status, digest: engine.digest(r.state), directives: JSON.stringify(r.directives) }));
}
const a = JSON.stringify(trace(engine.replay(golden, opts, winStream)));
const b = JSON.stringify(trace(engine.replay(golden, opts, winStream)));
ok("two win replays are byte-identical (lockstep determinism)", a === b);
const la = JSON.stringify(trace(engine.replay(golden, opts, lossStream)));
const lb = JSON.stringify(trace(engine.replay(golden, opts, lossStream)));
ok("two loss replays are byte-identical (lockstep determinism)", la === lb);

// a differing runtime seed may differ only in RNG-driven branches (month length), never authored logic →
// both still terminate at the same authored outcome:
const winRun2 = engine.replay(golden, { seed: "different-seed", playerCount: 1 }, winStream);
ok("win outcome is seed-independent (authored logic, not RNG)", winRun2[winRun2.length - 1].status === "won");

// ---------- readable trace ----------
console.log("\n--- WIN run (status @ each step) ---");
winRun.forEach((r, i) => console.log(`  step ${i}: ${r.status}` + (r.awaiting ? ` awaiting ${r.awaiting.id}` : "") +
  `  [m${r.state.clock.month} t${r.state.clock.turnInMonth} corr${r.state.heroes.hero1.corruption} supply${r.state.skulls.supply}]`));
console.log("--- LOSS run (status @ each step) ---");
lossRun.forEach((r, i) => console.log(`  step ${i}: ${r.status}` + (r.awaiting ? ` awaiting ${r.awaiting.id}` : "") +
  `  [m${r.state.clock.month} t${r.state.clock.turnInMonth} corr${r.state.heroes.hero1.corruption} supply${r.state.skulls.supply}]`));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
