// dungeon_test.js — the dungeon subflow (§4 row 157; catalog §5) and the glyph gate (§4.4 / §3.4).
// Realistic walks are driven through the public API (replay) on the golden fixture's 3-room dungeon;
// edge cases (gate block, enter-requirement block, cross-hero cleared-persistence) use the test-only
// __internals surface, mirroring battle_test.js.

const engine = require("../src/engine");
const { golden } = require("../src/golden-fixture");
const { __internals } = require("../src/engine");
const { makeTestState, interpretNode, resolveRoomEntry } = __internals;

let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log("PASS  " + name); } else { fail++; console.log("XXXX  " + name + (extra ? "  — " + extra : "")); } }
function check(name, fn) { try { ok(name, fn()); } catch (e) { fail++; console.log("XXXX  " + name + "  — threw: " + e.message); } }
function expectFault(name, fn) { try { fn(); fail++; console.log("XXXX  " + name + "  — expected fault"); } catch (e) { if (e.isFault) { pass++; console.log("PASS  " + name); } else { fail++; console.log("XXXX  " + name + "  — wrong error: " + e.message); } } }

const opts = { seed: "mvp-runtime-seed", playerCount: 1 };
const act = (v) => ({ requestId: "action", value: v, kind: "decision" });
const dadv = (improve) => ({ requestId: "dungeonRoomAdvantage", value: { improve }, kind: "decision" });
const dmove = (direction) => ({ requestId: "dungeonMove", value: { direction }, kind: "decision" });
const dleave = () => ({ requestId: "dungeonMove", value: { leave: true }, kind: "decision" });
const obs = (v) => ({ requestId: "skullCounter", value: v, kind: "observed" });
const last = (run) => run[run.length - 1];
const DUN = "azkol-vault-dungeon";
const h = (st) => st.heroes.hero1;

// ============================== REPLAY-DRIVEN WALKS ==============================

// ---- full clear WITHOUT the room improvement ----
// enter(entry: +1 spirit) → [no improve] → E → hall(pay 1 spirit, +1 warrior) → E → target(flag) → complete.
const noImprove = engine.replay(golden, opts, [act("dungeon"), dadv(false), dmove("E"), dmove("E")]);
const niF = last(noImprove);
check("enter routes the subflow into the entrance room (awaits the improve boundary)", () =>
  noImprove[1].awaiting && noImprove[1].awaiting.id === "dungeonRoomAdvantage");
check("entry room inside-event resolves (+1 spirit on enter)", () => noImprove[1].state.heroes.hero1.spirit === 2);
check("declining the improvement spends no Advantage", () => h(niF.state).advantages === 6);
check("enter-requirement spirit tax is paid at the warded hall (spirit 2 → 1)", () => h(niF.state).spirit === 1);
check("target room clears the whole dungeon (3 rooms cleared, persist per-dungeon)", () => {
  const cr = niF.state.dungeons[DUN].clearedRooms; return cr.length === 3 && cr.includes("vault-entry") && cr.includes("vault-hall") && cr.includes("vault-target");
});
check("clearing the target completes the dungeon's spawning quest", () =>
  niF.state.quests["azkol-vault"] && niF.state.quests["azkol-vault"].complete === true);
check("target inside-event fired (vaultCleared flag set)", () => niF.state.flags.vaultCleared === true);
check("control returns to the turn loop after completion (awaits the skull drop)", () =>
  niF.awaiting && niF.awaiting.id === "skullCounter");
check("completing a dungeon emits a removeDungeonToken board mutation", () =>
  noImprove.flatMap(r => r.directives).some(d => d.type === "board.mutate" && d.command === "removeDungeonToken"));

// ---- full clear WITH the one-time room improvement ----
const withImprove = engine.replay(golden, opts, [act("dungeon"), dadv(true), dmove("E"), dmove("E")]);
const wiF = last(withImprove);
check("improving the entry room spends exactly 1 Advantage (6 → 5)", () => h(wiF.state).advantages === 5);
check("improveOnce effects apply (+2 warriors: 7 base +2 improve +1 hall = 10)", () => h(wiF.state).warriors === 10);
check("dungeon completes the same way with or without the improvement", () =>
  wiF.state.quests["azkol-vault"].complete === true && wiF.awaiting.id === "skullCounter");

// ---- leaving the dungeon mid-walk (no board-move cost; only the entry room is cleared) ----
const leftRun = engine.replay(golden, opts, [act("dungeon"), dadv(false), dleave()]);
const lF = last(leftRun);
check("leaving clears only the resolved room(s), not the dungeon", () =>
  lF.state.dungeons[DUN].clearedRooms.length === 1 && lF.state.dungeons[DUN].clearedRooms[0] === "vault-entry");
check("leaving does NOT complete the spawning quest", () => !lF.state.quests["azkol-vault"]);
check("leaving returns control to the turn loop (awaits the skull drop)", () => lF.awaiting.id === "skullCounter");

// ---- improve-once + cleared persistence across a RE-ENTRY (a cleared room is not re-resolved) ----
// turn 1: enter, improve entry, leave.  turn 2: re-enter (entry already cleared → no re-resolution,
// no second improve offered) → walk through to the target.
const reenter = engine.replay(golden, opts,
  [act("dungeon"), dadv(true), dleave(), obs(0), act("dungeon"), dmove("E"), dmove("E")]);
const reF = last(reenter);
check("a cleared room is not re-resolved on re-entry (entry's +1 spirit not re-applied)", () => h(reF.state).spirit === 1);
check("improve-once holds across re-entry (still only 1 Advantage ever spent: 6 → 5)", () => h(reF.state).advantages === 5);
check("the dungeon is completable across two visits (quest complete after re-entry)", () =>
  reF.state.quests["azkol-vault"].complete === true);

// ---- determinism: the dungeon walk replays byte-identically ----
function trace(run) { return run.map(r => ({ s: r.status, d: engine.digest(r.state), dir: JSON.stringify(r.directives) })); }
check("dungeon walk is deterministic (byte-identical replays)", () =>
  JSON.stringify(trace(engine.replay(golden, opts, [act("dungeon"), dadv(true), dmove("E"), dmove("E")]))) ===
  JSON.stringify(trace(engine.replay(golden, opts, [act("dungeon"), dadv(true), dmove("E"), dmove("E")]))));

// ============================== UNIT: GLYPH GATE (§4.4 / §3.4) ==============================
// The gate reads the engine-owned DERIVED facing mirror (state.tower.glyphFacing). makeTestState's
// hero home kingdom is "north".
const glyphNode = (action) => ({ id: "g1", kind: "cond.glyphGate", props: { action }, wires: { out: ["o"], blocked: ["b"] } });

check("glyph gate: a revealed glyph facing home taxes 1 spirit and proceeds", () => {
  const s = makeTestState(); s.tower.glyphFacing = { north: "quest" }; // hero1 home = north
  const r = interpretNode(glyphNode("quest"), s, []);
  return r.goto === "o" && s.heroes.hero1.spirit === 2; // started at 3
});
check("glyph gate: matching action with no spirit is BLOCKED", () => {
  const s = makeTestState(); s.heroes.hero1.spirit = 0; s.tower.glyphFacing = { north: "quest" };
  const r = interpretNode(glyphNode("quest"), s, []);
  return r.goto === "b" && s.heroes.hero1.spirit === 0;
});
check("glyph gate: a glyph facing home for a DIFFERENT action does not gate", () => {
  const s = makeTestState(); s.tower.glyphFacing = { north: "battle" };
  const r = interpretNode(glyphNode("quest"), s, []);
  return r.goto === "o" && s.heroes.hero1.spirit === 3; // untouched
});
check("glyph gate: a glyph facing a NON-home kingdom does not gate", () => {
  const s = makeTestState(); s.tower.glyphFacing = { south: "quest" };
  const r = interpretNode(glyphNode("quest"), s, []);
  return r.goto === "o" && s.heroes.hero1.spirit === 3;
});
check("glyph gate: no revealed glyph ⇒ free passage", () => {
  const s = makeTestState(); s.tower.glyphFacing = {};
  const r = interpretNode(glyphNode("banner"), s, []);
  return r.goto === "o" && s.heroes.hero1.spirit === 3;
});
expectFault("glyph gate: a block with no 'blocked' port is a fault", () => {
  const s = makeTestState(); s.heroes.hero1.spirit = 0; s.tower.glyphFacing = { north: "quest" };
  interpretNode({ id: "g2", kind: "cond.glyphGate", props: { action: "quest" }, wires: { out: ["o"] } }, s, []);
});

// ============================== UNIT: ENTER-REQUIREMENT BLOCK & CROSS-HERO PERSISTENCE ==============================
// A small in-state dungeon for direct resolveRoomEntry() calls.
function dungeonState() {
  const s = makeTestState();
  s._lib.dungeons = { d1: { id: "d1", rooms: [
    { id: "r-ward", cell: { col: 0, row: 0 }, exits: { E: "door" }, isEntrance: true,
      enterRequirement: { spiritCost: 5, onFail: [{ op: "corruption.gain" }] },
      insideEvent: [{ op: "resource.gain", resource: "warriors", amount: 1 }] },
    { id: "r-cond", cell: { col: 1, row: 0 }, exits: { W: "door" },
      enterRequirement: { condition: { subject: "flag", comparator: "eq", value: true, key: "haveKey" }, onFail: [{ op: "corruption.gain" }] },
      insideEvent: [{ op: "resource.gain", resource: "warriors", amount: 1 }] }
  ] } };
  s.dungeons.d1 = { clearedRooms: [], improvedRooms: [] };
  s.clock.dungeon = { dungeonId: "d1", completed: "C", left: "L", currentRoom: null, currentRoomNode: null };
  return s;
}
const wardNode = { id: "n", kind: "dungeon.room", props: { roomId: "r-ward" }, wires: {} };
const condNode = { id: "n", kind: "dungeon.room", props: { roomId: "r-cond" }, wires: {} };

check("enter-requirement spirit block: insufficient spirit → onFail + leave (room NOT cleared)", () => {
  const s = dungeonState(); s.heroes.hero1.spirit = 0; // can't pay the cost of 5
  const r = resolveRoomEntry(wardNode, s, []);
  return r.goto === "L" && s.heroes.hero1.corruption === 1 &&
    !s.dungeons.d1.clearedRooms.includes("r-ward") && s.clock.dungeon === null &&
    s.heroes.hero1.warriors === 7; // inside-event did NOT run
});
check("enter-requirement condition block: condition unmet → onFail + leave", () => {
  const s = dungeonState(); // flag haveKey absent → condition false
  const r = resolveRoomEntry(condNode, s, []);
  return r.goto === "L" && s.heroes.hero1.corruption === 1 && !s.dungeons.d1.clearedRooms.includes("r-cond");
});
check("enter-requirement condition satisfied → room resolves normally", () => {
  const s = dungeonState(); s.flags.haveKey = true;
  const r = resolveRoomEntry(condNode, s, []);
  // no improveOnce here, not target → awaits the move boundary; inside-event ran (+1 warrior)
  return r.await && r.await.request.id === "dungeonMove" && s.heroes.hero1.warriors === 8 && s.dungeons.d1.clearedRooms.includes("r-cond");
});
check("cleared rooms persist ACROSS heroes (contract §3.1): a cleared room is not re-resolved for hero2", () => {
  const s = dungeonState();
  s.dungeons.d1.clearedRooms.push("r-cond");                 // hero1 already cleared r-cond
  s.heroes.hero2 = JSON.parse(JSON.stringify(s.heroes.hero1)); // a second hero
  s.clock.activeHero = "hero2"; s.clock.turnOrder = ["hero1", "hero2"];
  const before = s.heroes.hero2.warriors;
  const r = resolveRoomEntry(condNode, s, []);
  return r.await && r.await.request.id === "dungeonMove" && s.heroes.hero2.warriors === before; // no inside-event re-run
});

expectFault("dungeon.room outside an active subflow is a fault", () => {
  const s = makeTestState(); s.clock.dungeon = null;
  resolveRoomEntry({ id: "n", kind: "dungeon.room", props: { roomId: "x" }, wires: {} }, s, []);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
