// fixture_test.js — WP1 fixture-fidelity suite: the golden library now carries the REAL base-game
// content (rules.md / buildings.md): building Reinforce effects, battleDefs for all three selected
// foes (card count = level), library.foes defaults, the Zaida companion, and location-gated quests.
// All additions are INERT to the legacy golden streams (engine ignores or never reaches them), which
// this suite also proves by replaying the canonical win/loss streams.

const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
const fs = require("fs");
const path = require("path");
const engine = require("../dist/engine");
const fixtures = require("../dist/golden-fixture");
const { golden, goldenFull } = fixtures;

let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log("PASS  " + name); } else { fail++; console.log("XXXX  " + name + (extra ? "  — " + extra : "")); } }

const act = (v) => ({ requestId: "action", value: v, kind: "decision" });
const obs = (v) => ({ requestId: "skullCounter", value: v, kind: "observed" });
const tgt = (foeId) => ({ requestId: "target", value: { foeId }, kind: "decision" });
const adv = (spend) => ({ requestId: "advantageSpend", value: { spend }, kind: "decision" });
const opts = { seed: "mvp-runtime-seed", playerCount: 1 };
const lastOf = (run) => run[run.length - 1];

// ---------- L1: enriched golden library is schema-valid ----------
const ajv = new Ajv({ strict: true, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(fs.readFileSync(path.join(__dirname, "../../schema/src/scenario.schema.json"), "utf8")));
ok("L1: golden with the enriched library is schema-valid", validate(golden), JSON.stringify(validate.errors));
ok("L1: goldenFull (full-turn fidelity scenario) is schema-valid", validate(goldenFull), JSON.stringify(validate.errors));
ok("goldenFull opts into the full-turn protocol via actionMiddle props",
   goldenFull.graph.nodes.find(n => n.kind === "lifecycle.actionMiddle").props.turn === "full");
ok("goldenFull authors the 16-building boardState with home citadels",
   goldenFull.setup.board.boardState.buildings.length === 16 && goldenFull.setup.board.boardState.home.north === "Radiant Mountains");
ok("goldenFull's month 1 is exactly one turn", JSON.stringify(goldenFull.setup.monthEnd.perMonth["1"]) === JSON.stringify({ minTurn: 1, maxTurn: 1 }));

// ---------- structural fidelity: battle cards = foe level (rules.md §Battle) ----------
const defs = golden.library.battleDefs;
ok("brigands (tier1, level 2) have 2 battle cards", defs.brigands.cards.length === 2);
ok("frost-trolls (tier2, level 3) have 3 battle cards", defs["frost-trolls"].cards.length === 3);
ok("dragons (tier3, level 4) have 4 battle cards", defs.dragons.cards.length === 4);
ok("ashstrider (adversary, level 5) has 5 battle cards", defs.ashstrider.cards.length === 5);
ok("dragons carry a critical card (cannot be improved)", defs.dragons.cards.some(c => c.critical === true));
ok("every selected foe has a battleDef",
   ["brigands", "frost-trolls", "dragons"].every(f => (defs[f].cards || []).length > 0));

// ---------- structural fidelity: building Reinforce effects (buildings.md) ----------
const bt = golden.library.buildingTypes;
ok("village free = 6 warriors", bt.village.free[0].op === "resource.gain" && bt.village.free[0].resource === "warriors" && bt.village.free[0].amount === 6);
ok("village enhanced = 1 spirit → 12 warriors", bt.village.enhanced.cost.amount === 1 && bt.village.enhanced.effects[0].amount === 12);
ok("citadel free = 1 potion", bt.citadel.free[0].op === "item.gain" && bt.citadel.free[0].itemType === "potion");
ok("citadel enhanced = 5 spirit → activate a virtue", bt.citadel.enhanced.cost.amount === 5 && bt.citadel.enhanced.effects[0].op === "virtue.activate");
ok("sanctuary free = 1 spirit", bt.sanctuary.free[0].op === "resource.gain" && bt.sanctuary.free[0].resource === "spirit" && bt.sanctuary.free[0].amount === 1);
ok("sanctuary enhanced = 5 spirit → remove all corruption", bt.sanctuary.enhanced.cost.amount === 5 && bt.sanctuary.enhanced.effects[0].op === "corruption.remove" && bt.sanctuary.enhanced.effects[0].all === true);
ok("bazaar free = 1 gear", bt.bazaar.free[0].op === "item.gain" && bt.bazaar.free[0].itemType === "gear");
ok("bazaar enhanced = 2 spirit → 1 treasure", bt.bazaar.enhanced.cost.amount === 2 && bt.bazaar.enhanced.effects[0].itemType === "treasure");
ok("every building holds 3 skulls, the 4th destroys (schema-pinned)",
   ["citadel", "sanctuary", "village", "bazaar"].every(b => bt[b].skullCapacity === 3 && bt[b].destroyOnSkull === 4));

// ---------- structural fidelity: foes, companion, quests ----------
ok("library.foes defines all three selected foes (no engine-owned level)",
   ["brigands", "frost-trolls", "dragons"].every(f => golden.library.foes[f] && golden.library.foes[f].level === undefined));
ok("the selected ally resolves in library.companions", golden.setup.selections.allyId === "zaida" && golden.library.companions.zaida.name === "Zaida");
ok("Zaida is granted by the companion quest", golden.library.companions.zaida.grantedByQuestId === "zaida-escort" && !!golden.library.quests["zaida-escort"]);
ok("main goal carries location + relic requirements", (golden.library.quests["recover-azkols-treasures"].requirements || []).length === 3);
ok("monthly adversary quests exist for months 2–6",
   [2, 3, 4, 5, 6].every(m => !!golden.library.quests["adv-quest-m" + m]));
ok("every adversary quest failure makes the world worse (scenario-determined skull)",
   [2, 3, 4, 5, 6].every(m => golden.library.quests["adv-quest-m" + m].outcomes.failure[0].op === "skull.place"));

// ---------- behavioral: a brigands battle now runs on 2 REAL cards ----------
const bStream = [act("battle"), tgt("brigands"), adv(2)];
const bRun = engine.replay(golden, opts, bStream);
const bMid = bRun[2]; // after target selection, battle cursor is live
ok("brigands battle draws exactly 2 cards", bMid.state.clock.battle && bMid.state.clock.battle.cards.length === 2,
   "got " + (bMid.state.clock.battle && bMid.state.clock.battle.cards.length));
const bEnd = bRun[3];
ok("brigands defeated by clearing both cards with 2 Advantages", !bEnd.state.foes.some(f => f.foeId === "brigands"));
ok("brigands battle: no warrior loss at full spend", bEnd.state.heroes.hero1.warriors === 7);
const b2 = JSON.stringify(engine.replay(golden, opts, bStream).map(r => engine.digest(r.state)));
const b1 = JSON.stringify(bRun.map(r => engine.digest(r.state)));
ok("brigands battle replays byte-identically", b1 === b2);

// ---------- inertness: the canonical legacy streams still land the same outcomes ----------
const winStream = [act("quest"), obs(0), act("quest"), obs(0), act("quest"), obs(0), act("battle"), tgt("ashstrider"), adv(5)];
ok("legacy WIN stream unchanged (adversary-defeated)", lastOf(engine.replay(golden, opts, winStream)).state.outcome.reason === "adversary-defeated");
const lossStream = [act("pass"), obs(4), act("pass"), obs(4), act("pass"), obs(4)];
ok("legacy LOSS stream unchanged (third-corruption)", lastOf(engine.replay(golden, opts, lossStream)).state.outcome.reason === "third-corruption");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
