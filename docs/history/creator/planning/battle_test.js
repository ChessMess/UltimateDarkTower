// battle_test.js — the battle subflow (§4 row 157, runs on authored battleDefs.cards) and the
// mutual-consent trade (§10.9, closed TradeAsset union). Uses engine.__internals.

const { __internals } = require("./engine");
const { makeTestState, startBattle, resolveBattle, applyTrade } = __internals;

let pass = 0, fail = 0;
function check(name, fn) { try { if (fn()) { pass++; console.log("PASS  " + name); } else { fail++; console.log("XXXX  " + name); } } catch (e) { fail++; console.log("XXXX  " + name + "  — threw: " + e.message); } }
function expectFault(name, fn) { try { fn(); fail++; console.log("XXXX  " + name + "  — expected fault"); } catch (e) { if (e.isFault) { pass++; console.log("PASS  " + name); } else { fail++; console.log("XXXX  " + name + "  — wrong error: " + e.message); } } }
const h = (s) => s.heroes.hero1;

// ---------- battle: drawing cards = level ----------
check("startBattle (adversary) draws 5 cards", () => { const s = makeTestState(); startBattle(s, [], { foeId: "ashstrider" }); return s.clock.battle.isAdversary && s.clock.battle.cards.length === 5; });
check("startBattle (foe) draws cards = foe level (2)", () => { const s = makeTestState(); startBattle(s, [], { foeId: "brigands" }); return s.clock.battle.isAdversary === false && s.clock.battle.cards.length === 2; });

// ---------- battle resolution against the authored deck ----------
check("spend 5 clears all 5 adversary cards → defeated → win", () => { const s = makeTestState(); startBattle(s, [], { foeId: "ashstrider" }); resolveBattle(s, [], { spend: 5 }); return s.adversary.defeated && s.flags.adversaryDefeated && s.outcome.status === "won" && h(s).warriors === 7; });
check("spend 2 of 5 → 3 strikes through → hero loses 3 warriors, adversary survives", () => { const s = makeTestState(); startBattle(s, [], { foeId: "ashstrider" }); resolveBattle(s, [], { spend: 2 }); return h(s).warriors === 4 && !s.adversary.defeated && s.outcome.status === "running"; });
check("adversary banks Advantages across battles (2 then 3 → defeated)", () => {
  const s = makeTestState();
  startBattle(s, [], { foeId: "ashstrider" }); resolveBattle(s, [], { spend: 2 }); // banks 2, 3 strikes through
  startBattle(s, [], { foeId: "ashstrider" }); resolveBattle(s, [], { spend: 3 }); // 3 + banked 2 = 5 → clears
  return s.adversary.defeated && s.outcome.status === "won";
});
check("spend cap is 10/action (over-spend clamps)", () => { const s = makeTestState(); h(s).advantages = 50; startBattle(s, [], { foeId: "ashstrider" }); resolveBattle(s, [], { spend: 99 }); return s.adversary.advantagesBanked === 10; });
check("spend limited by hero pool", () => { const s = makeTestState(); h(s).advantages = 1; startBattle(s, [], { foeId: "ashstrider" }); resolveBattle(s, [], { spend: 5 }); return s.adversary.advantagesBanked === 1 && h(s).warriors === 3; }); // 4 strikes through
check("critical card cannot be cancelled by Advantages", () => { const s = makeTestState(); startBattle(s, [], { foeId: "crit" }); resolveBattle(s, [], { spend: 5 }); return h(s).warriors === 6; }); // crit's 1 strike always lands
check("non-adversary foe defeat removes the foe", () => { const s = makeTestState(); startBattle(s, [], { foeId: "brigands" }); resolveBattle(s, [], { spend: 2 }); return s.foes.find(f => f.foeId === "brigands") === undefined; });
check("undefeated foe escalates on the status ladder", () => { const s = makeTestState(); startBattle(s, [], { foeId: "brigands" }); resolveBattle(s, [], { spend: 0 }); return s.foes[0].status === "savage" && h(s).warriors === 5; });
check("retreat after ≥1 card ends battle, foe survives", () => { const s = makeTestState(); startBattle(s, [], { foeId: "ashstrider" }); resolveBattle(s, [], { retreat: true }); return s.clock.battle === null && !s.adversary.defeated && s.outcome.status === "running"; });
check("card onResolve effects fire when a card is cleared", () => { const s = makeTestState(); s._lib.battleDefs.boon = { cards: [{ advantage: "Magic", strikes: 1, onResolve: [{ op: "resource.gain", resource: "spirit", amount: 2 }] }] }; s._lib.foes.boon = { level: 1 }; startBattle(s, [], { foeId: "boon" }); resolveBattle(s, [], { spend: 1 }); return h(s).spirit === 5; });

// ---------- trade: closed TradeAsset union (§10.9) ----------
function twoHeroState() { const s = makeTestState(); s.heroes.hero2 = { warriors: 0, spirit: 0, corruption: 0, advantages: 0, virtues: { active: [], inactive: [] }, items: { gear: ["sword"], treasure: [], potions: [], questItems: [] }, companions: ["aric"], counters: {} }; return s; }
check("trade gives warriors atomically", () => { const s = twoHeroState(); applyTrade(s, [], { from: "hero1", to: "hero2", give: [{ asset: "warriors", amount: 3 }] }); return s.heroes.hero1.warriors === 4 && s.heroes.hero2.warriors === 3 && s.clock.latches.tradeUsed; });
check("trade moves an item between heroes", () => { const s = twoHeroState(); applyTrade(s, [], { from: "hero2", to: "hero1", give: [{ asset: "item", itemRef: "sword" }] }); return s.heroes.hero1.items.gear.includes("sword") && !s.heroes.hero2.items.gear.includes("sword"); });
check("trade moves a companion", () => { const s = twoHeroState(); applyTrade(s, [], { from: "hero2", to: "hero1", give: [{ asset: "companion", companionId: "aric" }] }); return s.heroes.hero1.companions.includes("aric") && !s.heroes.hero2.companions.includes("aric"); });
check("trade handles give + receive in one decision", () => { const s = twoHeroState(); applyTrade(s, [], { from: "hero1", to: "hero2", give: [{ asset: "warriors", amount: 2 }], receive: [{ asset: "item", itemRef: "sword" }] }); return s.heroes.hero2.warriors === 2 && s.heroes.hero1.items.gear.includes("sword"); });
expectFault("trade faults on insufficient resource", () => applyTrade(twoHeroState(), [], { from: "hero1", to: "hero2", give: [{ asset: "warriors", amount: 999 }] }));
expectFault("trade faults on an item not held", () => applyTrade(twoHeroState(), [], { from: "hero1", to: "hero2", give: [{ asset: "item", itemRef: "nope" }] }));
expectFault("trade faults on an untradeable asset (virtue)", () => applyTrade(twoHeroState(), [], { from: "hero1", to: "hero2", give: [{ asset: "virtue", virtueRef: "x" }] }));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
