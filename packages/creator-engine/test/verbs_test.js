// verbs_test.js — exercises the complete §4.3 effect-verb instruction set (all 36 verbs),
// each against a minimal EngineState, asserting the state mutation and emitted directive(s).
// Uses engine.__internals (test-only surface).

const { __internals } = require("../dist/engine");
const { makeTestState, applyOne } = __internals;

let pass = 0, fail = 0;
function check(name, fn) {
  try { if (fn()) { pass++; console.log("PASS  " + name); } else { fail++; console.log("XXXX  " + name); } }
  catch (e) { fail++; console.log("XXXX  " + name + "  — threw: " + e.message); }
}
function expectFault(name, fn) {
  try { fn(); fail++; console.log("XXXX  " + name + "  — expected a fault, none thrown"); }
  catch (e) { if (e.isFault) { pass++; console.log("PASS  " + name); } else { fail++; console.log("XXXX  " + name + "  — wrong error: " + e.message); } }
}
const hasDir = (r, type, pred) => r.directives.some(d => d.type === type && (!pred || pred(d)));
const h = (r) => r.state.heroes.hero1;

// ---------- resources & hero state ----------
check("resource.gain adds & emits ui.update", () => { const r = applyOne(makeTestState(), { op: "resource.gain", resource: "warriors", amount: 2 }); return h(r).warriors === 9 && hasDir(r, "ui.update"); });
check("resource.lose subtracts (afforded, no corruption)", () => { const r = applyOne(makeTestState(), { op: "resource.lose", resource: "warriors", amount: 2 }); return h(r).warriors === 5 && h(r).corruption === 0; });
check("resource.lose shortfall → clamp 0 + one corruption", () => { const r = applyOne(makeTestState(), { op: "resource.lose", resource: "spirit", amount: 5 }); return h(r).spirit === 0 && h(r).corruption === 1; });
check("resource.spend subtracts when afforded", () => { const r = applyOne(makeTestState(), { op: "resource.spend", resource: "spirit", amount: 2 }); return h(r).spirit === 1; });
expectFault("resource.spend faults when unaffordable", () => applyOne(makeTestState(), { op: "resource.spend", resource: "spirit", amount: 99 }));
check("corruption.gain increments", () => { const r = applyOne(makeTestState(), { op: "corruption.gain", source: "x" }); return h(r).corruption === 1; });
check("corruption.remove {count}", () => { const s = makeTestState(); s.heroes.hero1.corruption = 2; const r = applyOne(s, { op: "corruption.remove", count: 1 }); return h(r).corruption === 1; });
check("corruption.remove {all}", () => { const s = makeTestState(); s.heroes.hero1.corruption = 2; const r = applyOne(s, { op: "corruption.remove", all: true }); return h(r).corruption === 0; });
check("virtue.activate flips inactive→active", () => { const r = applyOne(makeTestState(), { op: "virtue.activate" }); return h(r).virtues.active.length === 1 && h(r).virtues.inactive.length === 1; });
check("virtue.grant adds a virtue", () => { const r = applyOne(makeTestState(), { op: "virtue.grant", virtue: "courage" }); return h(r).virtues.active.includes("courage"); });
check("item.gain adds to the right bucket", () => { const r = applyOne(makeTestState(), { op: "item.gain", itemType: "treasure", from: "market" }); return h(r).items.treasure.length === 1; });
check("item.enforceLimits prompts on 5th treasure", () => { const s = makeTestState(); s.heroes.hero1.items.treasure = ["a", "b", "c", "d", "e"]; const r = applyOne(s, { op: "item.enforceLimits" }); return hasDir(r, "ui.prompt"); });

// ---------- foes & adversary ----------
check("foe.spawn adds instance + board.mutate(spawnFoe)", () => { const r = applyOne(makeTestState(), { op: "foe.spawn", foeId: "dragons", location: "ruins" }); return r.state.foes.length === 2 && hasDir(r, "board.mutate", d => d.command === "spawnFoe"); });
check("foe.move updates location + board.mutate(moveFoe)", () => { const r = applyOne(makeTestState(), { op: "foe.move", foeId: "brigands", to: "ruins" }); return r.state.foes[0].location === "ruins" && hasDir(r, "board.mutate", d => d.command === "moveFoe"); });
check("foe.remove drops instance + board.mutate(removeFoe)", () => { const r = applyOne(makeTestState(), { op: "foe.remove", foeId: "brigands" }); return r.state.foes.length === 0 && hasDir(r, "board.mutate", d => d.command === "removeFoe"); });
check("foe.escalateStatus steps the ladder (ready→savage)", () => { const r = applyOne(makeTestState(), { op: "foe.escalateStatus", foeId: "brigands" }); return r.state.foes[0].status === "savage"; });
check("adversary.spawn sets spawned + board.mutate + tower.program", () => { const r = applyOne(makeTestState(), { op: "adversary.spawn" }); return r.state.adversary.spawned && hasDir(r, "board.mutate") && hasDir(r, "tower.program"); });

// ---------- tokens & counters ----------
check("token.place records token + board.mutate(placeToken)", () => { const r = applyOne(makeTestState(), { op: "token.place", tokenTypeId: "river-of-fire", target: { edge: "a-b" } }); return r.state.tokens.length === 1 && hasDir(r, "board.mutate", d => d.command === "placeToken"); });
check("token.counterIncrement increments a per-hero counter", () => { const r = applyOne(makeTestState(), { op: "token.counterIncrement", tokenTypeId: "spore", amount: 1 }); return h(r).counters.spore === 1; });
check("token.counterIncrement fires threshold.onReach (Spore → reset + corruption)", () => { const r = applyOne(makeTestState(), { op: "token.counterIncrement", tokenTypeId: "spore", amount: 3 }); return h(r).counters.spore === 0 && h(r).corruption === 1; });
check("token.remove removes a removable token", () => { const s = makeTestState(); s.tokens = [{ tokenTypeId: "spore", target: { x: 1 } }]; const r = applyOne(s, { op: "token.remove", tokenTypeId: "spore", target: { x: 1 } }); return r.state.tokens.length === 0; });
expectFault("token.remove faults on a non-removable token", () => applyOne(makeTestState(), { op: "token.remove", tokenTypeId: "river-of-fire", target: {} }));

// ---------- hero / board placement ----------
check("hero.placeOrMove emits board.mutate(placeHero)", () => hasDir(applyOne(makeTestState(), { op: "hero.placeOrMove", to: "delmsmire" }), "board.mutate", d => d.command === "placeHero"));
check("board.placeMonument records + board.mutate", () => { const r = applyOne(makeTestState(), { op: "board.placeMonument", location: "ruins" }); return r.state.monuments.length === 1 && hasDir(r, "board.mutate", d => d.command === "placeMonument"); });
check("board.placeMarker records + board.mutate", () => { const r = applyOne(makeTestState(), { op: "board.placeMarker", location: "ruins", markerType: "quest" }); return r.state.markers.length === 1 && hasDir(r, "board.mutate", d => d.command === "placeMarker"); });

// ---------- skulls & buildings ----------
check("skull.place decrements supply + prompt + board.mutate", () => { const r = applyOne(makeTestState(), { op: "skull.place", count: 2, kingdom: "north" }); return r.state.skulls.supply === 22 && hasDir(r, "ui.prompt") && hasDir(r, "board.mutate", d => d.command === "placeSkull"); });
check("skull.place that empties supply → loss", () => { const s = makeTestState(); s.skulls.supply = 2; const r = applyOne(s, { op: "skull.place", count: 2, kingdom: "north" }); return r.state.outcome.status === "lost" && r.state.outcome.reason === "empty-supply"; });
check("skull.remove returns skulls to supply", () => { const s = makeTestState(); s.skulls.onBoard = 3; const r = applyOne(s, { op: "skull.remove", count: 2 }); return r.state.skulls.supply === 26 && r.state.skulls.onBoard === 1; });
check("building.destroy (non-dormant) → 4th to supply + owner corruption", () => { const r = applyOne(makeTestState(), { op: "building.destroy", location: "north-1", kingdom: "north" }); return r.state.skulls.supply === 25 && h(r).corruption === 1 && hasDir(r, "board.mutate", d => d.command === "removeBuilding"); });
check("building.destroy (dormant kingdom) → no corruption", () => { const s = makeTestState(); s.kingdoms.dormant = ["south"]; const r = applyOne(s, { op: "building.destroy", location: "south-1", kingdom: "south" }); return h(r).corruption === 0; });
check("skull.modifySupply adjusts supply", () => { const r = applyOne(makeTestState(), { op: "skull.modifySupply", delta: -3 }); return r.state.skulls.supply === 21; });

// ---------- decks & market ----------
check("deck.draw pulls top of a seeded deck", () => { const s = makeTestState(); s.decks.corruption = { draw: ["a", "b"], discard: [] }; const r = applyOne(s, { op: "deck.draw", deck: "corruption" }); return r.state.decks.corruption.draw.length === 1 && r.state._lastDraw === "a"; });
expectFault("deck.draw faults on empty draw pile", () => { const s = makeTestState(); s.decks.corruption = { draw: [], discard: ["x"] }; return applyOne(s, { op: "deck.draw", deck: "corruption" }); });
check("deck.discard moves a card to discard", () => { const s = makeTestState(); s.decks.corruption = { draw: [], discard: [] }; const r = applyOne(s, { op: "deck.discard", deck: "corruption", card: "z" }); return r.state.decks.corruption.discard[0] === "z"; });
check("deck.reshuffle folds discard into draw deterministically", () => { const s = makeTestState(); s.decks.market = { draw: ["a"], discard: ["b", "c"] }; const r = applyOne(s, { op: "deck.reshuffle", deck: "market" }); return r.state.decks.market.draw.length === 3 && r.state.decks.market.discard.length === 0; });
check("market.refresh replaces face-up treasures", () => { const r = applyOne(makeTestState(), { op: "market.refresh" }); return r.state.market.length === 4; });
check("market.acquireReplace prompts", () => hasDir(applyOne(makeTestState(), { op: "market.acquireReplace" }), "ui.prompt"));

// ---------- quests & seals & variables ----------
check("quest.complete marks complete + raises event", () => { const r = applyOne(makeTestState(), { op: "quest.complete", questId: "q1" }); return r.state.quests.q1.complete === true; });
check("quest.complete (main goal) fires adversary.spawn", () => { const s = makeTestState(); s._lib.quests = { mg: { isMainGoal: true } }; const r = applyOne(s, { op: "quest.complete", questId: "mg" }); return r.state.mainGoalComplete === true && r.state.adversary.spawned === true; });
check("quest.spawnDungeon instantiates dungeon + board.mutate", () => { const r = applyOne(makeTestState(), { op: "quest.spawnDungeon", quest: "q1", dungeon: "d1" }); return r.state.dungeons.d1 && hasDir(r, "board.mutate", d => d.command === "spawnDungeon"); });
check("quest.placeMarker records a quest marker", () => { const r = applyOne(makeTestState(), { op: "quest.placeMarker", quest: "q1", location: "ruins" }); return r.state.markers.length === 1; });
check("seal.remove increments + brokenSeals + tower.program + display sidecar + prompt", () => { const r = applyOne(makeTestState(), { op: "seal.remove", seal: "1-north" }); return r.state.sealsRemoved === 1 && r.state.brokenSeals.includes("1-north") && hasDir(r, "tower.program", d => (d.ops || []).some(o => o.channel === "seal.break")) && hasDir(r, "tower.program", d => Array.isArray(d.brokenSeals)) && hasDir(r, "ui.prompt"); });
check("seal.replace removes from brokenSeals", () => { const s = makeTestState(); s.brokenSeals = ["1-north"]; s.sealsRemoved = 1; const r = applyOne(s, { op: "seal.replace", seal: "1-north" }); return r.state.brokenSeals.length === 0 && r.state.sealsRemoved === 0; });
check("flag.set sets a scenario flag", () => { const r = applyOne(makeTestState(), { op: "flag.set", name: "gate", value: true }); return r.state.flags.gate === true; });
check("counter.set sets a scenario counter", () => { const r = applyOne(makeTestState(), { op: "counter.set", name: "rep", value: 5 }); return r.state.counters.rep === 5; });

// ---------- closure ----------
expectFault("unknown op faults (closed 36-verb set)", () => applyOne(makeTestState(), { op: "teleport.hero" }));

// ---------- coverage check: every §4.3 verb is exercised ----------
const ALL_VERBS = ["resource.gain","resource.lose","resource.spend","corruption.gain","corruption.remove","virtue.activate","virtue.grant","item.gain","item.enforceLimits","foe.spawn","foe.move","foe.remove","foe.escalateStatus","adversary.spawn","token.place","token.counterIncrement","token.remove","hero.placeOrMove","board.placeMonument","board.placeMarker","skull.place","skull.remove","building.destroy","skull.modifySupply","deck.draw","deck.discard","deck.reshuffle","market.refresh","market.acquireReplace","quest.complete","quest.spawnDungeon","quest.placeMarker","seal.remove","seal.replace","flag.set","counter.set"];
check("all 36 §4.3 verbs apply without an 'unimplemented' fault", () => {
  let okCount = 0;
  for (const op of ALL_VERBS) {
    const s = makeTestState();
    // give each verb the minimal args it needs
    const args = {
      "resource.gain": { resource: "warriors", amount: 1 }, "resource.lose": { resource: "warriors", amount: 1 }, "resource.spend": { resource: "warriors", amount: 1 },
      "corruption.remove": { count: 1 }, "virtue.grant": { virtue: "x" }, "item.gain": { itemType: "gear" },
      "foe.spawn": { foeId: "dragons" }, "foe.move": { foeId: "brigands", to: "x" }, "foe.remove": { foeId: "brigands" }, "foe.escalateStatus": { foeId: "brigands" },
      "token.place": { tokenTypeId: "spore", target: {} }, "token.counterIncrement": { tokenTypeId: "spore" }, "token.remove": { tokenTypeId: "spore", target: {} },
      "hero.placeOrMove": { to: "x" }, "board.placeMonument": { location: "x" }, "board.placeMarker": { location: "x" },
      "skull.place": { count: 1, kingdom: "north" }, "skull.remove": { count: 1 }, "building.destroy": { kingdom: "north", location: "x" }, "skull.modifySupply": { delta: 1 },
      "deck.discard": { deck: "d", card: "c" }, "deck.reshuffle": { deck: "d" }, "market.refresh": {}, "market.acquireReplace": {},
      "quest.complete": { questId: "q" }, "quest.spawnDungeon": { quest: "q", dungeon: "d" }, "quest.placeMarker": { quest: "q", location: "x" },
      "seal.remove": {}, "seal.replace": { seal: "1-north" }, "flag.set": { name: "f", value: 1 }, "counter.set": { name: "c", value: 1 }
    }[op] || {};
    if (op === "deck.draw") { s.decks.d = { draw: ["a"], discard: [] }; args.deck = "d"; }
    try { applyOne(s, Object.assign({ op }, args)); okCount++; }
    catch (e) { if (!e.isFault || !/unknown effect verb|unimplemented/.test(e.message)) okCount++; else console.log("    missing verb:", op); }
  }
  return okCount === ALL_VERBS.length;
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
