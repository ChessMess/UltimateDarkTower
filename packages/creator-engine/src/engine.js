// engine.js — the shared rules-engine reducer (MVP vertical slice).
// Implements the contract's API surface (§2.3): init / step / replay / serialize / digest,
// a near-pure (EngineState, Input) → StepResult reducer (§5.1), the closed directive (§5.2)
// and input (§5.3) vocabularies, the observed-input bridge (§5.4: skullCounter), determinism
// via the engine-local pcg32 PRNG (§6), phase sequencing (§4.5), and win/loss detection (§9).
//
// SCOPE: this is a faithful *vertical slice* — real engine machinery (deterministic step loop,
// effects that mutate state, a genuine decision boundary + an observed boundary, the skull
// invariant, all three loss conditions + the win condition, the closed directive set) over a
// COMPACT golden scenario. It implements the node kinds and effect verbs the golden fixture
// uses; unimplemented kinds/verbs raise a clear fault rather than silently passing. Full
// month-by-month rules fidelity and the remaining verbs are a later pass (§4.3 is the full set).

const pcg32 = require("./pcg32");

const ENGINE_VERSION = "0.2.0";
const SUPPORTED_SCHEMA_RANGE = ">=0.4.0 <0.5.0"; // semver-range, same-minor pre-1.0 (§8)

// The four board kingdoms in canonical clockwise order (schema $defs/kingdom). Seating, home-kingdom
// ownership, and the dormant-kingdom complement (§3.1) are all derived from this order so that two
// runs of the same scenario at the same player count build an identical hero/kingdom layout.
const KINGDOMS = ["north", "south", "east", "west"];

// ---------- canonical serialization + digest (§6, §9) ----------
function canonical(o) {
  if (o === null || typeof o !== "object") return JSON.stringify(o);
  if (Array.isArray(o)) return "[" + o.map(canonical).join(",") + "]";
  return "{" + Object.keys(o).sort().map(k => JSON.stringify(k) + ":" + canonical(o[k])).join(",") + "}";
}
function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h + ((h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24))) >>> 0; }
  return ("00000000" + h.toString(16)).slice(-8);
}
function serialize(state) { return canonical(state); }
function deserialize(blob) { return JSON.parse(blob); }
function digest(state) {
  // hash everything except volatile cursor bookkeeping that isn't game state
  const { clock, ...rest } = state;
  const c = { month: clock.month, turnInMonth: clock.turnInMonth, activeHero: clock.activeHero, cursor: clock.cursor };
  return fnv1a32(canonical({ ...rest, clock: c }));
}

function clone(x) { return JSON.parse(JSON.stringify(x)); }
function fault(msg) { const e = new Error("ENGINE FAULT: " + msg); e.isFault = true; return e; }

// ---------- directives (§5.2, closed) ----------
function dir(directives, type, payload) { directives.push({ type, ...payload }); }

// ---------- conditions (§4.4, pure predicates) ----------
function evalCondition(cond, state) {
  if (!cond) return true;
  if (cond.allOf) return cond.allOf.every(c => evalCondition(c, state));
  if (cond.anyOf) return cond.anyOf.some(c => evalCondition(c, state));
  if (cond.not) return !evalCondition(cond.not, state);
  const { subject, comparator, value, key } = cond;
  let lhs;
  switch (subject) {
    case "resource": lhs = (state.heroes[state.clock.activeHero] || {})[key]; break;
    case "flag": lhs = state.flags[key]; break;
    case "counter": lhs = state.counters[key] || 0; break;
    case "sealsRemoved": lhs = state.sealsRemoved; break;
    case "foeOnSpace": lhs = (state.foes || []).filter(f => f.location === key).length; break;
    case "heroAtLocation": lhs = Object.values(state.heroes).filter(h => h.location === key).length; break;
    case "supply": lhs = state.skulls.supply; break;
    case "month": lhs = state.clock.month; break;
    case "endOfMonth": lhs = (state.clock.turnInMonth >= state.clock.turnsThisMonth); break;
    default: throw fault("condition subject not supported in MVP slice: " + subject);
  }
  switch (comparator) {
    case "eq": return lhs === value;
    case "ne": return lhs !== value;
    case "lt": return lhs < value;
    case "lte": return lhs <= value;
    case "gt": return lhs > value;
    case "gte": return lhs >= value;
    case "has": return Array.isArray(lhs) && lhs.includes(value);
    case "in": return Array.isArray(value) && value.includes(lhs);
    default: throw fault("comparator not supported: " + comparator);
  }
}

// ---------- effect verbs (§4.3, MVP subset) ----------
// Each returns nothing; mutates state, pushes directives. Loss-on-3rd-corruption and
// empty-supply checks fire inline exactly where the contract says (§4.3, §4.5).
const FOE_LADDER = ["panicked", "unsteady", "ready", "savage", "lethal"];

// Deterministic Fisher–Yates using the engine PRNG; advances + reserializes RNG state (§6).
function shuffleInPlace(arr, state) {
  const rng = pcg32.deserialize(state.rng);
  for (let i = arr.length - 1; i > 0; i--) { const j = pcg32.nextRange(rng, 0, i); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  state.rng = pcg32.serialize(rng);
}
function getDeck(state, name) { if (!state.decks[name]) state.decks[name] = { draw: [], discard: [] }; return state.decks[name]; }

// The full §4.3 instruction set, discriminated on `op`. "Mutation" = EngineState change;
// directives are handed to the host. Board-touching verbs update nothing physical here
// (headless) — they emit board.mutate for Board's reducer when it lands (§5.2, §10.5).
function applyEffect(eff, state, directives) {
  const hero = state.heroes[state.clock.activeHero];
  const ui = (delta) => dir(directives, "ui.update", { delta });
  switch (eff.op) {
    // ----- resources & hero state -----
    case "resource.gain":
      hero[eff.resource] = (hero[eff.resource] || 0) + eff.amount;
      ui({ hero: state.clock.activeHero, [eff.resource]: hero[eff.resource] }); break;
    case "resource.lose": { // mandatory; shortfall → util.catch → one corruption
      const short = eff.amount - (hero[eff.resource] || 0);
      hero[eff.resource] = Math.max(0, (hero[eff.resource] || 0) - eff.amount);
      ui({ hero: state.clock.activeHero, [eff.resource]: hero[eff.resource] });
      if (short > 0) gainCorruption(state, directives, "shortfall");
      break;
    }
    case "resource.spend": { // optional; blocked if unaffordable
      if ((hero[eff.resource] || 0) < eff.amount) throw fault("cannot afford resource.spend " + eff.resource);
      hero[eff.resource] -= eff.amount; ui({ hero: state.clock.activeHero, [eff.resource]: hero[eff.resource] }); break;
    }
    case "corruption.gain": gainCorruption(state, directives, eff.source || "effect"); break;
    case "corruption.remove":
      hero.corruption = eff.all ? 0 : Math.max(0, hero.corruption - (eff.count || 0));
      ui({ hero: state.clock.activeHero, corruption: hero.corruption }); break;
    case "virtue.activate": {
      if (hero.virtues.inactive.length === 0) throw fault("no inactive virtue to activate");
      const v = eff.virtue && hero.virtues.inactive.includes(eff.virtue) ? eff.virtue : hero.virtues.inactive[0];
      hero.virtues.inactive = hero.virtues.inactive.filter(x => x !== v); hero.virtues.active.push(v);
      if (!eff.virtue) dir(directives, "ui.prompt", { kind: "choice", text: "Activate which virtue?" });
      ui({ hero: state.clock.activeHero, virtues: hero.virtues }); break;
    }
    case "virtue.grant":
      hero.virtues.active.push(eff.virtue); ui({ hero: state.clock.activeHero, virtues: hero.virtues }); break;
    case "item.gain": {
      const bucket = { gear: "gear", treasure: "treasure", potion: "potions", questItem: "questItems" }[eff.itemType];
      if (!bucket) throw fault("unknown itemType " + eff.itemType);
      hero.items[bucket].push(eff.item || (eff.itemType + ":" + (hero.items[bucket].length + 1)));
      if (eff.from) dir(directives, "ui.update", { delta: { drew: eff.from } });
      ui({ hero: state.clock.activeHero, items: hero.items }); break;
    }
    case "item.enforceLimits": {
      const over = hero.items.gear.length > 6 || hero.items.treasure.length > 4
        || new Set(hero.items.gear).size !== hero.items.gear.length;
      if (over) dir(directives, "ui.prompt", { kind: "choice", text: "Discard to satisfy carry limits" });
      ui({ hero: state.clock.activeHero, items: hero.items }); break;
    }
    // ----- foes & adversary -----
    case "foe.spawn":
      state.foes.push({ instanceId: "foe-" + (state.foes.length + 1), foeId: eff.foeId, status: eff.status || "ready", location: eff.location || null });
      dir(directives, "board.mutate", { command: "spawnFoe", args: { foeId: eff.foeId, location: eff.location } }); ui({ foe: eff.foeId }); break;
    case "foe.move": {
      const f = state.foes.find(x => x.foeId === eff.foeId); if (f) f.location = eff.to;
      dir(directives, "board.mutate", { command: "moveFoe", args: { foeId: eff.foeId, to: eff.to } }); break;
    }
    case "foe.remove":
      state.foes = state.foes.filter(x => x.foeId !== eff.foeId);
      dir(directives, "board.mutate", { command: "removeFoe", args: { foeId: eff.foeId } }); break;
    case "foe.escalateStatus": {
      const f = state.foes.find(x => x.foeId === eff.foeId);
      if (f) f.status = FOE_LADDER[Math.min(FOE_LADDER.length - 1, FOE_LADDER.indexOf(f.status) + (eff.steps || 1))];
      ui({ foe: eff.foeId }); break;
    }
    case "adversary.spawn":
      state.adversary.spawned = true;
      dir(directives, "board.mutate", { command: "spawnAdversary", args: { foeId: state.adversary.foeId } });
      dir(directives, "tower.program", { ops: [{ channel: "light.named", sequenceId: "adversaryReveal" }] });
      ui({ adversarySpawned: true }); raiseEvent(state, directives, "adversarySpawned"); break;
    // ----- tokens & counters -----
    case "token.place":
      state.tokens.push({ tokenTypeId: eff.tokenTypeId, target: eff.target });
      dir(directives, "board.mutate", { command: "placeToken", args: { tokenTypeId: eff.tokenTypeId, target: eff.target } }); break;
    case "token.counterIncrement": {
      const who = eff.hero || state.clock.activeHero; const h = state.heroes[who];
      const key = eff.tokenTypeId; h.counters[key] = (h.counters[key] || 0) + (eff.amount || 1);
      ui({ hero: who, counter: key, value: h.counters[key] });
      const cfg = ((state._lib.tokenTypes || {})[eff.tokenTypeId] || {}).threshold;
      if (cfg && h.counters[key] >= cfg.at) { h.counters[key] = 0; for (const e of (cfg.onReach || [])) applyEffect(e, state, directives); }
      break;
    }
    case "token.remove": {
      const cfg = (state._lib.tokenTypes || {})[eff.tokenTypeId] || {};
      if (cfg.removable === false) throw fault("token " + eff.tokenTypeId + " is not removable");
      state.tokens = state.tokens.filter(t => !(t.tokenTypeId === eff.tokenTypeId && JSON.stringify(t.target) === JSON.stringify(eff.target)));
      dir(directives, "board.mutate", { command: "removeToken", args: { tokenTypeId: eff.tokenTypeId, target: eff.target } }); break;
    }
    // ----- hero / board placement -----
    case "hero.placeOrMove": {
      const heroId = eff.hero || state.clock.activeHero;
      state.heroes[heroId].location = eff.to ?? null;
      dir(directives, "board.mutate", { command: "placeHero", args: { hero: heroId, to: eff.to } }); break;
    }
    case "board.placeMonument":
      state.monuments.push(eff.location);
      dir(directives, "board.mutate", { command: "placeMonument", args: { location: eff.location } }); break;
    case "board.placeMarker":
      state.markers.push({ location: eff.location, markerType: eff.markerType });
      dir(directives, "board.mutate", { command: "placeMarker", args: { location: eff.location, markerType: eff.markerType } }); break;
    // ----- skulls & buildings (scenario-determined only; emergence is observed) -----
    case "skull.place":
      state.skulls.supply -= eff.count;
      dir(directives, "ui.prompt", { kind: "choice", text: "Choose building for " + eff.count + " skull(s)" });
      dir(directives, "board.mutate", { command: "placeSkull", args: { count: eff.count, kingdom: eff.kingdom, chooser: eff.chooser || "homeOwner" } });
      if (state.skulls.supply <= 0) loseGame(state, directives, "empty-supply"); break;
    case "skull.remove":
      state.skulls.supply += eff.count; state.skulls.onBoard = Math.max(0, state.skulls.onBoard - eff.count);
      dir(directives, "board.mutate", { command: "removeSkull", args: { count: eff.count } }); ui({ supply: state.skulls.supply }); break;
    case "building.destroy": {
      state.skulls.supply += 1; // the 4th skull returns to supply
      dir(directives, "board.mutate", { command: "removeBuilding", args: { location: eff.location } });
      const kingdom = eff.kingdom; const dormant = state.kingdoms.dormant.includes(kingdom);
      if (!dormant) gainCorruption(state, directives, "building-destroyed"); break; // home owner only (none if dormant)
    }
    case "skull.modifySupply":
      state.skulls.supply += eff.delta; ui({ supply: state.skulls.supply }); break;
    // ----- decks & market -----
    case "deck.draw": {
      const d = getDeck(state, eff.deck);
      if (d.draw.length === 0) throw fault("deck '" + eff.deck + "' empty (explicit deck.reshuffle required, §4.3)");
      const card = d.draw.shift(); state._lastDraw = card; ui({ deck: eff.deck, drew: card }); break;
    }
    case "deck.discard": {
      const d = getDeck(state, eff.deck); d.discard.push(eff.card || state._lastDraw); break;
    }
    case "deck.reshuffle": {
      const d = getDeck(state, eff.deck); d.draw = d.draw.concat(d.discard); d.discard = []; shuffleInPlace(d.draw, state); break;
    }
    case "market.refresh":
      state.market = (eff.cards || ["t1", "t2", "t3", "t4"]); ui({ market: state.market }); break;
    case "market.acquireReplace":
      dir(directives, "ui.prompt", { kind: "choice", text: "Acquire / replace a market card" }); ui({ market: state.market }); break;
    // ----- quests & seals & variables -----
    case "quest.complete": completeQuest(state, directives, eff.questId); break;
    case "quest.spawnDungeon":
      state.dungeons[eff.dungeon] = { clearedRooms: [] };
      dir(directives, "board.mutate", { command: "spawnDungeon", args: { quest: eff.quest, dungeon: eff.dungeon } }); break;
    case "quest.placeMarker":
      state.markers.push({ location: eff.location, markerType: "quest", quest: eff.quest });
      dir(directives, "board.mutate", { command: "placeMarker", args: { location: eff.location, markerType: "quest" } }); break;
    case "seal.remove": {
      const seal = eff.seal || (state.sealsRemoved + 1) + "-north"; // engine/scenario/player-chosen (not observed, §3.4)
      state.sealsRemoved += 1; if (!state.brokenSeals.includes(seal)) state.brokenSeals.push(seal);
      raiseEvent(state, directives, "sealRemoved");
      dir(directives, "tower.program", { ops: [{ channel: "seal.break", seal }] });
      dir(directives, "tower.program", { brokenSeals: state.brokenSeals.slice(), target: "display" }); // app-level seal sidecar (§5.2)
      dir(directives, "ui.prompt", { kind: "confirm", text: "Physically remove the indicated seal" }); break;
    }
    case "seal.replace": {
      const seal = eff.seal; state.brokenSeals = state.brokenSeals.filter(s => s !== seal); state.sealsRemoved = Math.max(0, state.sealsRemoved - 1);
      dir(directives, "tower.program", { brokenSeals: state.brokenSeals.slice(), target: "display" }); break;
    }
    case "flag.set": state.flags[eff.name] = eff.value; break;
    case "counter.set": state.counters[eff.name] = eff.value; break;
    default:
      throw fault("unknown effect verb: " + eff.op + " (closed set is the 36 of §4.3)");
  }
}

function gainCorruption(state, directives, source) {
  const hero = state.heroes[state.clock.activeHero];
  hero.corruption += 1;
  dir(directives, "ui.prompt", { kind: "reveal", text: "Corruption drawn (" + source + ")" });
  dir(directives, "ui.update", { delta: { hero: state.clock.activeHero, corruption: hero.corruption } });
  raiseEvent(state, directives, "corruptionGained");
  if (hero.corruption >= 3) loseGame(state, directives, "third-corruption"); // §3.1 / §4.3
}

function completeQuest(state, directives, questId) {
  state.quests[questId] = { complete: true };
  dir(directives, "log.entry", { event: "questComplete", questId });
  raiseEvent(state, directives, "questComplete");
  const q = (state._lib.quests || {})[questId];
  if (q && q.isMainGoal) {
    state.mainGoalComplete = true;
    raiseEvent(state, directives, "mainGoalComplete");
    // main-goal completion fires the adversary.spawn path (§4.3)
    applyEffect({ op: "adversary.spawn" }, state, directives);
  }
}

function raiseEvent(state, directives, event) { dir(directives, "log.entry", { event }); /* onState bus stub */ }

function loseGame(state, directives, reason) {
  state.outcome = { status: "lost", reason };
  dir(directives, "log.entry", { event: "gameLost", reason });
}
function winGame(state, directives, reason) {
  state.outcome = { status: "won", reason };
  dir(directives, "log.entry", { event: "gameWon", reason });
}

// ---------- dungeon subflow (§4 row 157; catalog §5) ----------
// The dungeon's room graph is GRAPH-FAITHFUL: `dungeon.subflow` routes (`enter`) to the entrance
// `dungeon.room` node; rooms are wired N/E/S/W (doors = wires on directional ports — catalog §5);
// each room's *data* (cell/exits/insideEvent/improveOnce/enterRequirement/isTarget) lives in
// `library.dungeons[id].rooms` keyed by `props.roomId`. Cleared rooms are tracked per-dungeon and
// persist ACROSS heroes (contract §3.1 / catalog §5 "cleared state persists for any hero") — so the
// set lives on `state.dungeons[id].clearedRooms`, not per-hero. Walk context is `state.clock.dungeon`.

function dungeonState(state, id) {
  if (!state.dungeons[id]) state.dungeons[id] = { clearedRooms: [], improvedRooms: [] };
  if (!state.dungeons[id].improvedRooms) state.dungeons[id].improvedRooms = [];
  return state.dungeons[id];
}
function roomOf(state, dc, roomId) {
  const d = state._lib.dungeons[dc.dungeonId];
  const room = (d.rooms || []).find(r => r.id === roomId);
  if (!room) throw fault("dungeon.room references unknown room '" + roomId + "' in dungeon '" + dc.dungeonId + "'");
  return room;
}

// Resolve entry into the room a `dungeon.room` node names: gate → insideEvent → (improve boundary) →
// finalize. Returns {goto}|{await}|{terminal}.
function resolveRoomEntry(node, state, directives) {
  const dc = state.clock.dungeon;
  if (!dc) throw fault("dungeon.room walked outside an active dungeon subflow: " + node.id);
  const roomId = (node.props || {}).roomId;
  if (!roomId) throw fault("dungeon.room missing props.roomId: " + node.id);
  const room = roomOf(state, dc, roomId);
  dc.currentRoom = roomId; dc.currentRoomNode = node.id;
  dir(directives, "board.mutate", { command: "revealRoom", args: { dungeon: dc.dungeonId, room: roomId, slice: room.bitmapSlice } });
  if (room.displayText) dir(directives, "ui.update", { delta: { dungeonRoomText: room.displayText } });

  const ds = dungeonState(state, dc.dungeonId);
  if (ds.clearedRooms.includes(roomId)) {
    // already cleared (persists across heroes): reveal only, no re-resolution (catalog §5)
    if (room.isTarget) return completeDungeon(state, directives);
    return awaitDungeonMove(node, state, directives);
  }
  // enter requirement (catalog §5; glyph-gate-shaped: a condition gate and/or a spirit tax)
  const req = room.enterRequirement;
  if (req) {
    const hero = state.heroes[state.clock.activeHero];
    const blocked = (req.condition && !evalCondition(req.condition, state)) || (req.spiritCost && (hero.spirit || 0) < req.spiritCost);
    if (blocked) {
      for (const e of (req.onFail || [])) { applyEffect(e, state, directives); if (state.outcome.status !== "running") return { terminal: true }; }
      dir(directives, "log.entry", { event: "dungeonRoomBlocked", dungeon: dc.dungeonId, room: roomId });
      const left = dc.left; state.clock.dungeon = null; return { goto: left }; // gated → cannot enter → leave
    }
    if (req.spiritCost) { hero.spirit -= req.spiritCost; dir(directives, "ui.update", { delta: { hero: state.clock.activeHero, spirit: hero.spirit } }); }
  }
  // inside event — the "apply results" step (base result)
  for (const e of (room.insideEvent || [])) { applyEffect(e, state, directives); if (state.outcome.status !== "running") return { terminal: true }; }
  // improve-once boundary: 1 Advantage may improve this room's result, once per room (catalog §5)
  const canImprove = room.improveOnce && !ds.improvedRooms.includes(roomId) && (state.heroes[state.clock.activeHero].advantages || 0) >= 1;
  if (canImprove) {
    dir(directives, "ui.prompt", { kind: "advantageSpend", requestId: "dungeonRoomAdvantage", text: "Spend 1 Advantage to improve this room?", room: roomId });
    return { await: { request: { id: "dungeonRoomAdvantage", kind: "advantageSpend" } } };
  }
  return finalizeRoom(node, state, directives);
}

function finalizeRoom(node, state, directives) {
  const dc = state.clock.dungeon;
  const ds = dungeonState(state, dc.dungeonId);
  const room = roomOf(state, dc, dc.currentRoom);
  if (!ds.clearedRooms.includes(room.id)) {
    ds.clearedRooms.push(room.id);
    dir(directives, "log.entry", { event: "dungeonRoomCleared", dungeon: dc.dungeonId, room: room.id });
  }
  if (room.isTarget) return completeDungeon(state, directives);
  return awaitDungeonMove(node, state, directives);
}

function awaitDungeonMove(node, state, directives) {
  const dc = state.clock.dungeon;
  const room = roomOf(state, dc, dc.currentRoom);
  const doors = ["N", "E", "S", "W"].filter(d => (room.exits || {})[d] === "door");
  dir(directives, "ui.prompt", { kind: "choice", requestId: "dungeonMove", text: "Move through a door or leave the dungeon", room: dc.currentRoom, doors });
  return { await: { request: { id: "dungeonMove", kind: "choice" } } };
}

// Clearing the target room completes the dungeon AND its spawning quest, removing the board token.
function completeDungeon(state, directives) {
  const dc = state.clock.dungeon;
  const d = state._lib.dungeons[dc.dungeonId];
  dir(directives, "board.mutate", { command: "removeDungeonToken", args: { dungeon: dc.dungeonId } });
  dir(directives, "log.entry", { event: "dungeonComplete", dungeon: dc.dungeonId });
  if (d.spawningQuestId) completeQuest(state, directives, d.spawningQuestId); // fires questComplete (§4.4)
  const ret = dc.completed; state.clock.dungeon = null;
  if (state.outcome.status !== "running") return { terminal: true };
  return { goto: ret };
}

// ---------- glyph gate (§4.4 / §3.4) ----------
// While a REVEALED glyph faces the acting hero's HOME kingdom, the matching action requires 1 spirit,
// else it is blocked. Facing is DERIVED (not observed) from the engine's mirrored drum positions
// (UDT getGlyphsFacingDirection). The drum→facing geometry resolves via the UDT adapter; until that
// geometry is source-verified it is a tagged placeholder (cf. the headless board/tower targets and the
// Advantage-pool placeholder). The engine carries the derived facing mirror in `state.tower.glyphFacing`
// (a `{ kingdom: glyph|null }` map — only REVEALED glyphs appear), which is what the gate reads.
function homeKingdomOf(state, heroId) {
  const own = (state.kingdoms && state.kingdoms.ownership) || {};
  for (const k of Object.keys(own)) if (own[k] === heroId) return k;
  return undefined;
}
function deriveGlyphFacing(state) { return (state.tower && state.tower.glyphFacing) || {}; }
// Adapter seam (intended-design placeholder): recompute the derived facing from drum positions + the
// broken-seal set. Real impl calls UDT getGlyphsFacingDirection(drums) and reveals only seal-broken
// glyphs. Kept as a no-op stand-in so commanded rotations / seal changes have an explicit hook.
function recomputeGlyphFacing(state) { if (!state.tower) state.tower = { drums: [0, 0, 0], glyphFacing: {}, calibrated: true }; return state.tower.glyphFacing; }

// ---------- node interpretation (§4.2) ----------
// Returns {goto} | {await:{request,ctx}} | {terminal} | {end}.
function interpretNode(node, state, directives) {
  const out = (node.wires && node.wires.out) || [];
  const next = out[0];
  switch (node.kind) {
    case "lifecycle.gameStart":
      dir(directives, "log.entry", { event: "gameStart" });
      return { goto: next };
    case "lifecycle.boardSetup": {
      dir(directives, "board.mutate", { command: "setupBoard", args: {} });
      // Author-defined initial foe placement — each entry runs the shared foe.spawn effect
      // so a setup spawn is byte-identical to an authored effect.apply foe.spawn.
      const spawns = (node.props && node.props.spawns) || [];
      for (const sp of spawns)
        applyEffect({ op: "foe.spawn", foeId: sp.foeId, location: sp.location, status: sp.status }, state, directives);
      dir(directives, "ui.update", { delta: { phase: "setup" } });
      return { goto: next };
    }
    case "lifecycle.startMonth": {
      state.clock.month += 1;
      state.clock.turnInMonth = 0;
      // catalog §107: months 2+ begin with the player left of last month's final player. Continuous
      // clockwise rotation (rotateActiveHero at End Turn) leaves activeHero already pointing there.
      state.clock.firstPlayerOfMonth = state.clock.activeHero;
      // resolve month length within the authored range via the engine PRNG (§4.5, §10.1)
      const me = state._setup.monthEnd;
      const range = (me.perMonth && me.perMonth[state.clock.month]) || me.default;
      const rng = pcg32.deserialize(state.rng);
      state.clock.turnsThisMonth = me.resolution === "randomInRange"
        ? pcg32.nextRange(rng, range.minTurn, range.maxTurn) : range.maxTurn;
      state.rng = pcg32.serialize(rng);
      resetLatches(state);
      dir(directives, "log.entry", { event: "startMonth", month: state.clock.month, turns: state.clock.turnsThisMonth });
      return { goto: next };
    }
    case "lifecycle.playerTurn":
      state.clock.turnInMonth += 1;
      resetLatches(state);
      dir(directives, "log.entry", { event: "playerTurn", month: state.clock.month, turn: state.clock.turnInMonth });
      return { goto: next };
    case "lifecycle.actionStart":
      return { goto: next };
    case "lifecycle.actionMiddle": {
      // INPUT BOUNDARY: the player chooses & performs their action this turn (§5.1 choice).
      dir(directives, "ui.prompt", { kind: "choice", requestId: "action", text: "Choose your action",
        options: ["quest", "cleanse", "battle", "pass"] });
      return { await: { request: { id: "action", kind: "choice",
        options: [{ id: "quest" }, { id: "cleanse" }, { id: "battle" }, { id: "pass" }] } } };
    }
    case "lifecycle.actionEnd":
      // OBSERVED BOUNDARY: mandatory skull drop (§4.5). supply-- (loss if empty), then await skullCounter.
      if (state.skulls.supply <= 0) { loseGame(state, directives, "empty-supply"); return { terminal: true }; }
      state.skulls.supply -= 1;
      state.clock.latches.itemLock = true;
      dir(directives, "tower.program", { ops: [{ channel: "skull.dropTrigger" }] }); // NEVER a count (skull invariant)
      dir(directives, "ui.update", { delta: { supply: state.skulls.supply } });
      return { await: { request: { id: "skullCounter", kind: "observed", observed: "skullCounter" } } };
    case "lifecycle.newMonthCheck":
      // New Quests for months 2+ (companion reward / adversary advances on failure) — compact.
      if (state.clock.month >= 2 && !state.mainGoalComplete) {
        state.adversary.questProgress = (state.adversary.questProgress || 0) + 1;
        dir(directives, "log.entry", { event: "newQuests", adversaryQuestProgress: state.adversary.questProgress });
      }
      // Engine sequencing (§4.5): after month 6, evaluate end-game; else start the next month.
      return { goto: state.clock.month >= 6 ? state._spine.endEval : state._spine.startMonth };
    case "lifecycle.gameEnd":
      // Reached after month 6 (or via win route). If adversary defeated → win; else loss (out of time).
      if (state.adversary.defeated) { winGame(state, directives, "adversary-defeated"); return { terminal: true }; }
      loseGame(state, directives, "out-of-time"); return { terminal: true };
    case "effect.apply": {
      const effs = node.props.effects || (node.props.effect ? [node.props.effect] : []);
      for (const e of effs) { applyEffect(e, state, directives); if (state.outcome.status !== "running") return { terminal: true }; }
      return { goto: next };
    }
    case "tower.op":
      dir(directives, "tower.program", { ops: [node.props.towerOp] });
      return { goto: next };
    case "cond.branch": {
      const truthy = evalCondition(node.props.condition, state);
      const port = truthy ? "true" : "false";
      const tgt = node.wires[port] && node.wires[port][0];
      if (!tgt) throw fault("cond.branch missing '" + port + "' port at " + node.id);
      return { goto: tgt };
    }
    case "cond.check":
      if (!evalCondition(node.props.condition, state)) throw fault("cond.check failed at " + node.id);
      return { goto: next };
    case "winloss.mainGoal":
      return { goto: next };
    case "winloss.winCondition":
      if (evalCondition(node.props.condition, state)) { winGame(state, directives, "win-condition"); return { terminal: true }; }
      return { goto: next };
    case "winloss.lossCondition":
      if (evalCondition(node.props.condition, state)) { loseGame(state, directives, "loss-condition"); return { terminal: true }; }
      return { goto: next };
    case "action.banner":
      dir(directives, "ui.prompt", { kind: "banner", text: node.props.title });
      return { goto: next };
    // ----- turn actions & battle subflow (§4 row 156–157) -----
    case "action.battle":
    case "battle.selectFoe": // INPUT BOUNDARY: choose the foe (or adversary)
      dir(directives, "ui.prompt", { kind: "target", requestId: "target", text: "Select a foe to battle" });
      return { await: { request: { id: "target", kind: "target" } } };
    case "battle.applyAdvantage": // INPUT BOUNDARY: spend Advantages (≤10) or retreat
      return { await: { request: { id: "advantageSpend", kind: "advantageSpend" } } };
    case "battle.end":
      return { goto: next };
    case "action.trade": // INPUT BOUNDARY: the mutual-consent trade decision
      dir(directives, "ui.prompt", { kind: "choice", requestId: "trade", text: "Propose a trade" });
      return { await: { request: { id: "trade", kind: "choice" } } };
    case "action.move": // INPUT BOUNDARY: choose destination (split-move allowed)
      dir(directives, "ui.prompt", { kind: "target", requestId: "moveTarget", text: "Move to…" });
      return { await: { request: { id: "moveTarget", kind: "target" } } };
    case "action.cleanse":
      applyEffect({ op: "corruption.remove", count: 1 }, state, directives); return { goto: next };
    case "action.quest":
      if (node.props && node.props.questId) completeQuest(state, directives, node.props.questId);
      if (state.outcome.status !== "running") return { terminal: true };
      return { goto: next };
    case "action.reinforce":
      if (state.clock.latches.reinforceUsed) throw fault("reinforce already used this turn");
      state.clock.latches.reinforceUsed = true;
      applyEffect({ op: "resource.gain", resource: "warriors", amount: 2 }, state, directives); return { goto: next };
    case "media.narration":
      dir(directives, "media.play", { media: "narration", text: node.props.text });
      return { goto: next };
    // ----- dungeon subflow (§4 row 157; catalog §5) -----
    case "dungeon.subflow": {
      const dId = node.props.dungeonId;
      const d = (state._lib.dungeons || {})[dId];
      if (!d) throw fault("dungeon.subflow references unknown dungeon: " + dId);
      const ds = dungeonState(state, dId);
      const target = (d.rooms || []).find(r => r.isTarget);
      // re-entry after the dungeon is already cleared → straight to `completed` (no re-walk)
      if (target && ds.clearedRooms.includes(target.id)) return { goto: (node.wires.completed || [])[0] };
      state.clock.dungeon = { dungeonId: dId, completed: (node.wires.completed || [])[0], left: (node.wires.left || [])[0], currentRoom: null, currentRoomNode: null };
      dir(directives, "tower.program", { ops: [{ channel: "light.named", sequenceId: d.idleLight || "dungeonIdle" }, { channel: "sound", category: d.ambientSoundCategory || "Dungeon" }] });
      dir(directives, "board.mutate", { command: "enterDungeon", args: { dungeon: dId } });
      const entrance = (node.wires.enter || [])[0];
      if (!entrance) throw fault("dungeon.subflow missing 'enter' wire to its entrance room node: " + node.id);
      return { goto: entrance };
    }
    case "dungeon.room":
      return resolveRoomEntry(node, state, directives);
    // ----- glyph gate (§4.4 / §3.4): derived facing → 1-spirit tax, else blocked -----
    case "cond.glyphGate": {
      const action = node.props.action; // banner|quest|battle|reinforce|cleanse ($defs/glyph)
      const heroId = state.clock.activeHero;
      const home = homeKingdomOf(state, heroId);
      const gated = home && deriveGlyphFacing(state)[home] === action;
      if (!gated) return { goto: (node.wires.out || [])[0] };
      const hero = state.heroes[heroId];
      if ((hero.spirit || 0) >= 1) { // pay the spirit tax → proceed
        hero.spirit -= 1;
        dir(directives, "ui.update", { delta: { hero: heroId, spirit: hero.spirit } });
        dir(directives, "log.entry", { event: "glyphGatePaid", action, kingdom: home });
        return { goto: (node.wires.out || [])[0] };
      }
      // no spirit → the matching action is blocked
      dir(directives, "log.entry", { event: "glyphGateBlocked", action, kingdom: home });
      const blocked = (node.wires.blocked || [])[0];
      if (!blocked) throw fault("cond.glyphGate blocked but no 'blocked' port at " + node.id);
      return { goto: blocked };
    }
    default:
      throw fault("node kind not implemented in MVP slice: " + node.kind);
  }
}

function resetLatches(state) {
  state.clock.latches = { bannerUsed: false, heroicActionUsed: false, reinforceUsed: false, tradeUsed: false, itemLock: false };
}

// End Turn (§4.5 step 5 / catalog §132 "advances clockwise turn order"): hand the active seat to the
// next hero clockwise. Single-hero games are a no-op, which keeps 1P digests byte-stable. Continuous
// rotation also satisfies catalog §107 (months 2+ begin with the player left of last month's final
// player): after the final turn of a month the seat has already advanced one step, so recording it as
// firstPlayerOfMonth at the next Start Month yields exactly "left of last month's final player".
function rotateActiveHero(state) {
  const order = state.clock.turnOrder || [];
  if (order.length <= 1) return;
  const idx = order.indexOf(state.clock.activeHero);
  state.clock.activeHero = order[(idx + 1 + order.length) % order.length];
}

// ---------- resume from an input boundary ----------
function resume(pending, state, input, directives) {
  if (pending.request.id !== (input && input.requestId)) throw fault("input requestId mismatch: expected " + pending.request.id);
  const node = state._nodes[state.clock.cursor];
  const next = (node.wires && node.wires.out) ? node.wires.out[0] : undefined;
  switch (pending.request.id) {
    case "action": {
      const choice = input.value; // quest | cleanse | reinforce | pass | battle | trade | move
      if (choice === "battle" && state._spine.battleEntry) return { goto: state._spine.battleEntry };
      if (choice === "trade" && state._spine.tradeEntry) return { goto: state._spine.tradeEntry };
      if (choice === "move" && state._spine.moveEntry) return { goto: state._spine.moveEntry };
      if (choice === "dungeon" && state._spine.dungeonEntry) return { goto: state._spine.dungeonEntry };
      performAction(choice, state, directives);
      if (state.outcome.status !== "running") return { terminal: true };
      return { goto: next };
    }
    case "target": { // battle.selectFoe — choose the foe (or adversary) and draw cards = level
      startBattle(state, directives, input.value || {});
      return { goto: next };
    }
    case "advantageSpend": { // battle.applyAdvantage — spend Advantages (≤10/action), or retreat
      resolveBattle(state, directives, input.value || {});
      if (state.outcome.status !== "running") return { terminal: true };
      return { goto: next };
    }
    case "trade": { // action.trade — atomic, unanimous-by-construction transfer over TradeAsset (§10.9)
      applyTrade(state, directives, input.value || {});
      return { goto: next };
    }
    case "moveTarget": { // action.move — split-move allowed; Board validates the path
      const moveTo = (input.value || {}).to;
      if (moveTo != null) state.heroes[state.clock.activeHero].location = moveTo;
      dir(directives, "board.mutate", { command: "moveHero", args: { hero: state.clock.activeHero, to: moveTo } });
      return { goto: next };
    }
    case "dungeonRoomAdvantage": { // dungeon.room — spend 1 Advantage to improve this room (once)
      const dc = state.clock.dungeon; if (!dc) throw fault("dungeonRoomAdvantage with no active dungeon");
      const ds = dungeonState(state, dc.dungeonId);
      const room = roomOf(state, dc, dc.currentRoom);
      const hero = state.heroes[state.clock.activeHero];
      if ((input.value || {}).improve && room.improveOnce && !ds.improvedRooms.includes(room.id) && (hero.advantages || 0) >= 1) {
        hero.advantages -= 1; ds.improvedRooms.push(room.id);
        for (const e of room.improveOnce.effects) { applyEffect(e, state, directives); if (state.outcome.status !== "running") return { terminal: true }; }
        dir(directives, "ui.update", { delta: { hero: state.clock.activeHero, advantages: hero.advantages } });
        dir(directives, "log.entry", { event: "dungeonRoomImproved", dungeon: dc.dungeonId, room: room.id });
      }
      return finalizeRoom(node, state, directives);
    }
    case "dungeonMove": { // dungeon.room — move through a door (directional wire) or leave (catalog §5)
      const dc = state.clock.dungeon; if (!dc) throw fault("dungeonMove with no active dungeon");
      const v = input.value || {};
      if (v.leave) { const left = dc.left; state.clock.dungeon = null; dir(directives, "log.entry", { event: "dungeonLeft", dungeon: dc.dungeonId }); return { goto: left }; }
      const d4 = v.direction; // "N"|"E"|"S"|"W"
      const room = roomOf(state, dc, dc.currentRoom);
      if ((room.exits || {})[d4] !== "door") throw fault("dungeonMove: no door " + d4 + " from room " + dc.currentRoom);
      const tgt = (node.wires && node.wires[d4] || [])[0]; // doors = wires on directional ports (catalog §5)
      if (!tgt) throw fault("dungeonMove: door " + d4 + " not wired from node " + node.id);
      return { goto: tgt };
    }
    case "skullCounter": {
      // observed emergence count enters the canonical stream (§5.4). Place emergent skulls.
      const count = input.value | 0;
      dir(directives, "log.entry", { event: "emergence", count });
      for (let i = 0; i < count; i++) {
        // each emergent skull lands in a kingdom; a 4th-in-building destroys it → home owner corruption.
        // compact model: track skullsOnBoard; every 4th adds a corruption to the active hero.
        state.skulls.onBoard = (state.skulls.onBoard || 0) + 1;
        dir(directives, "board.mutate", { command: "placeSkull", args: { source: "emergence" } });
        if (state.skulls.onBoard % 4 === 0) {
          dir(directives, "board.mutate", { command: "removeBuilding", args: {} });
          gainCorruption(state, directives, "building-destroyed");
          if (state.outcome.status !== "running") return { terminal: true };
        }
      }
      // Engine sequencing (§4.5): End Turn advances clockwise turn order (catalog §132), then hands to
      // New Month Check at month-end or starts the next turn this month.
      rotateActiveHero(state);
      const endOfMonth = state.clock.turnInMonth >= state.clock.turnsThisMonth;
      return { goto: endOfMonth ? state._spine.newMonthCheck : state._spine.playerTurn };
    }
    default: throw fault("no resume handler for " + pending.request.id);
  }
}

function performAction(choice, state, directives) {
  switch (choice) {
    case "quest": {
      // advance the main goal; complete it when progress hits the threshold
      state.counters.goalProgress = (state.counters.goalProgress || 0) + 1;
      dir(directives, "ui.update", { delta: { goalProgress: state.counters.goalProgress } });
      if (state.counters.goalProgress >= state._setup.goalThreshold && !state.mainGoalComplete) {
        completeQuest(state, directives, state._setup.mainGoalId);
      }
      break;
    }
    case "cleanse": applyEffect({ op: "corruption.remove", count: 1 }, state, directives); break;
    case "reinforce": // once per turn (§4.1 latch); gain warriors
      if (state.clock.latches.reinforceUsed) throw fault("reinforce already used this turn");
      state.clock.latches.reinforceUsed = true;
      applyEffect({ op: "resource.gain", resource: "warriors", amount: 2 }, state, directives); break;
    case "pass": break;
    default: throw fault("unknown action choice: " + choice);
  }
}

// ---------- battle subflow (§4 row 157; runs on AUTHORED battleDefs.cards, §389.3) ----------
// startBattle: select foe → draw cards = foe level (2–4; adversary 5) from the authored battleDef.
function startBattle(state, directives, sel) {
  const isAdversary = sel.foeId === state.adversary.foeId || sel.adversary === true;
  const foeId = isAdversary ? state.adversary.foeId : sel.foeId;
  const def = (state._lib.battleDefs || {})[foeId] || { cards: [] };
  const level = isAdversary ? 5 : (((state._lib.foes || {})[foeId] || {}).level || 2);
  // draw `level` cards deterministically from the authored card pool (cycle if fewer)
  const pool = def.cards.slice();
  shuffleInPlace(pool, state);
  const cards = []; for (let i = 0; i < level && pool.length; i++) cards.push(pool[i % pool.length]);
  state.clock.battle = { foeId, isAdversary, level, cards, resolved: 0 };
  dir(directives, "tower.program", { ops: [{ channel: "sound", category: "Battle" }] });
  dir(directives, "ui.prompt", { kind: "advantageSpend", text: "Spend Advantages (≤10) or retreat", cards: cards.length });
}

// resolveBattle: apply spent Advantages (capped 10/action and by the hero pool), fire each cleared
// card's onResolve, tally remaining strikes as warrior loss, then defeat / escalate. The adversary
// banks applied Advantages across battles (cumulative) and allows retreat after ≥1 card.
function resolveBattle(state, directives, decision) {
  const b = state.clock.battle; if (!b) throw fault("resolveBattle with no active battle");
  const hero = state.heroes[state.clock.activeHero];
  if (decision.retreat) { // retreat after ≥1 card; foe survives, adversary keeps banked Advantages
    state.clock.battle = null; dir(directives, "log.entry", { event: "retreat", foeId: b.foeId }); return;
  }
  const spend = Math.min(decision.spend | 0, 10, hero.advantages | 0); // ≤10/action, no undo
  let pool = spend + (b.isAdversary ? (state.adversary.advantagesBanked || 0) : 0);
  let remainingStrikes = 0, cleared = 0;
  for (const card of b.cards) {
    let s = card.strikes || 0;
    if (!card.critical) { const use = Math.min(pool, s); pool -= use; s -= use; }
    if (s === 0) { cleared++; for (const e of (card.onResolve || [])) applyEffect(e, state, directives); }
    remainingStrikes += s;
  }
  if (b.isAdversary) state.adversary.advantagesBanked = (state.adversary.advantagesBanked || 0) + spend; // persists
  if (remainingStrikes > 0) applyEffect({ op: "resource.lose", resource: "warriors", amount: remainingStrikes }, state, directives);
  const defeated = cleared === b.cards.length;
  dir(directives, "ui.update", { delta: { battle: { foeId: b.foeId, cleared, remainingStrikes, defeated } } });
  if (defeated) {
    if (b.isAdversary) {
      state.adversary.defeated = true; state.flags.adversaryDefeated = true;
      dir(directives, "board.mutate", { command: "removeFoe", args: { adversary: true } });
      raiseEvent(state, directives, "foeDefeated"); winGame(state, directives, "adversary-defeated");
    } else { applyEffect({ op: "foe.remove", foeId: b.foeId }, state, directives); }
  } else if (state.outcome.status === "running") {
    applyEffect({ op: "foe.escalateStatus", foeId: b.foeId }, state, directives);
  }
  state.clock.battle = null;
}

// applyTrade: atomic, unanimous-by-construction transfer over the closed TradeAsset union (§10.9).
function applyTrade(state, directives, t) {
  const from = state.heroes[t.from], to = state.heroes[t.to];
  if (!from || !to) throw fault("trade references unknown hero");
  const move = (giver, taker, asset) => {
    switch (asset.asset) {
      case "warriors": case "spirit":
        if ((giver[asset.asset] || 0) < asset.amount) throw fault("trade: insufficient " + asset.asset);
        giver[asset.asset] -= asset.amount; taker[asset.asset] += asset.amount; break;
      case "item": {
        const buckets = ["gear", "treasure", "potions", "questItems"];
        let found = false;
        for (const bk of buckets) { const i = giver.items[bk].indexOf(asset.itemRef); if (i >= 0) { giver.items[bk].splice(i, 1); taker.items[bk].push(asset.itemRef); found = true; break; } }
        if (!found) throw fault("trade: item not held: " + asset.itemRef); break;
      }
      case "companion": {
        const i = giver.companions.indexOf(asset.companionId);
        if (i < 0) throw fault("trade: companion not held: " + asset.companionId);
        giver.companions.splice(i, 1); taker.companions.push(asset.companionId); break;
      }
      default: throw fault("trade: untradeable asset (virtues/corruptions are structurally untradeable)");
    }
  };
  // atomic: validate+apply on a working copy is overkill here since faults abort the cloned step state
  for (const a of (t.give || [])) move(from, to, a);
  for (const a of (t.receive || [])) move(to, from, a);
  state.clock.latches.tradeUsed = true;
  dir(directives, "ui.update", { delta: { trade: { from: t.from, to: t.to } } });
}

// ---------- the run loop ----------
function run(state, directives) {
  // safety bound so a malformed graph can't spin forever
  for (let guard = 0; guard < 100000; guard++) {
    if (state.outcome.status === "won" || state.outcome.status === "lost" || state.outcome.status === "ended")
      return state.outcome.status;
    const node = state._nodes[state.clock.cursor];
    if (!node) { state.outcome.status = "ended"; return "ended"; }
    const r = interpretNode(node, state, directives);
    if (r.await) { state.clock.pending = { request: r.await.request }; state.outcome.status = "awaitingInput"; return "awaitingInput"; }
    if (r.terminal) return state.outcome.status;
    if (r.end || r.goto === undefined) { state.outcome.status = "ended"; return "ended"; }
    state.clock.cursor = r.goto;
  }
  throw fault("run loop exceeded guard (graph cycle without progress?)");
}

// ---------- public API (§2.3) ----------
// Build the active/dormant kingdom split for a player count. Prefers the authored map
// (setup.playerCountScaling.dormantKingdoms.byPlayerCount, schema v0.4) and falls back to the
// canonical order (first N kingdoms active, remainder dormant; 4P → none dormant). The complement of
// the dormant set must leave exactly one active kingdom per player — otherwise it's a load fault.
function buildKingdoms(scenario, playerCount) {
  const pcs = (scenario.setup && scenario.setup.playerCountScaling) || {};
  const byPC = pcs.dormantKingdoms && pcs.dormantKingdoms.byPlayerCount;
  const dormant = (byPC && Array.isArray(byPC[String(playerCount)]))
    ? byPC[String(playerCount)].slice()
    : KINGDOMS.slice(playerCount);
  const active = KINGDOMS.filter(k => !dormant.includes(k));
  if (active.length !== playerCount)
    throw fault("playerCount " + playerCount + " needs " + playerCount + " active kingdom(s); setup yields "
      + active.length + " (dormant: [" + dormant.join(",") + "])");
  return { active, dormant };
}
function makeHero() {
  // Hero rich-data (real 7+1 split, banner, move value, 3+3 virtues, Advantage pool) is injected
  // content (§10.3, D2-blocked); the engine starts every hero from the documented placeholder.
  return { warriors: 7, spirit: 1, corruption: 0, advantages: 6, virtues: { active: [], inactive: [] },
           items: { gear: [], treasure: [], potions: [], questItems: [] }, companions: [], counters: {}, location: null };
}

function init(scenario, opts) {
  if (!opts || !opts.seed) throw fault("init requires opts.seed (engine runtime seed, §6)");
  const nodes = {}; for (const n of scenario.graph.nodes) nodes[n.id] = n;
  const byKind = (k) => { const n = scenario.graph.nodes.find(x => x.kind === k); return n && n.id; };
  // Honor opts.playerCount (§3.1): build the hero set, per-player home-kingdom ownership, the dormant
  // complement, and clockwise seating. Fail at load (§ "fail at load, never mid-game") on a bad count
  // or a dormant-set that doesn't leave exactly one active kingdom per player.
  const playerCount = (opts.playerCount | 0) || 1;
  if (playerCount < 1 || playerCount > 4) throw fault("playerCount must be 1–4 (got " + opts.playerCount + ")");
  const { active, dormant } = buildKingdoms(scenario, playerCount);
  const heroIds = []; for (let i = 1; i <= playerCount; i++) heroIds.push("hero" + i);
  const heroes = {}; for (const id of heroIds) heroes[id] = makeHero();
  const ownership = {}; active.forEach((k, i) => { ownership[k] = heroIds[i]; });
  const firstHero = heroIds[0];
  const rng = pcg32.create(opts.seed);
  const state = {
    meta: { scenarioVersion: scenario.meta.scenarioVersion, schemaVersion: scenario.schemaVersion, engine: ENGINE_VERSION },
    clock: { month: 0, turnInMonth: 0, turnsThisMonth: 0, cursor: scenario.graph.entry, pending: null,
             activeHero: firstHero, turnOrder: heroIds.slice(), firstPlayerOfMonth: firstHero, latches: {} },
    kingdoms: { ownership, dormant },
    heroes,
    foes: [],
    adversary: { foeId: scenario.setup.selections.adversaryId, spawned: false, defeated: false, advantages: [], advantagesBanked: 0, questProgress: 0, battleProgress: 0 },
    skulls: { supply: scenario.setup.difficulty.skullSupply, onBoard: 0 },
    decks: {}, market: [], monuments: [], markers: [], tokens: [],
    flags: {}, counters: {}, sealsRemoved: 0, brokenSeals: [],
    quests: {}, mainGoalComplete: false, dungeons: {},
    tower: { drums: [0, 0, 0], glyphFacing: {}, calibrated: true }, // engine-owned derived mirror (§3.4)
    rng: pcg32.serialize(rng),
    outcome: { status: "running", reason: null },
    // load-time references kept out of the digest-relevant game state but needed at run:
    _nodes: nodes,
    _lib: scenario.library,
    _spine: {
      startMonth: byKind("lifecycle.startMonth"),
      playerTurn: byKind("lifecycle.playerTurn"),
      newMonthCheck: byKind("lifecycle.newMonthCheck"),
      endEval: byKind("winloss.winCondition"),
      gameEnd: byKind("lifecycle.gameEnd"),
      battleEntry: byKind("battle.selectFoe") || byKind("action.battle"),
      tradeEntry: byKind("action.trade"),
      moveEntry: byKind("action.move"),
      dungeonEntry: byKind("dungeon.subflow")
    },
    _setup: {
      monthEnd: scenario.setup.monthEnd,
      mainGoalId: scenario.setup.selections.mainGoalId,
      goalThreshold: (scenario.meta.tuning && scenario.meta.tuning.goalThreshold) || 3,
      adversaryToughness: (scenario.meta.tuning && scenario.meta.tuning.adversaryToughness) || 2
    }
  };
  resetLatches(state);
  const directives = [];
  const status = run(state, directives);
  return { state, directives, status, awaiting: state.clock.pending ? state.clock.pending.request : undefined };
}

function step(prevState, input) {
  const state = clone(prevState);
  // _nodes/_lib/_setup survive clone (plain JSON) — fine, they're immutable references.
  const directives = [];
  if (state.clock.pending) {
    const pending = state.clock.pending;
    state.clock.pending = null;
    state.outcome.status = "running";
    const r = resume(pending, state, input, directives);
    if (r && r.await) { // resume can open a NEW input boundary (e.g. dungeon room: improve → move)
      state.clock.pending = { request: r.await.request }; state.outcome.status = "awaitingInput";
      return { state, directives, status: "awaitingInput", awaiting: r.await.request };
    }
    if (r && r.goto !== undefined) state.clock.cursor = r.goto;
    else if (r && r.terminal) { /* outcome already set */ }
  } else if (input && input.kind === "control") {
    return { state: prevState, directives: [], status: prevState.outcome.status };
  }
  const status = state.outcome.status === "running" || state.outcome.status === "awaitingInput"
    ? run(state, directives) : state.outcome.status;
  return { state, directives, status, awaiting: state.clock.pending ? state.clock.pending.request : undefined };
}

function replay(scenario, opts, inputs) {
  const results = [];
  let r = init(scenario, opts);
  results.push(r);
  for (const inp of inputs) {
    if (r.status === "won" || r.status === "lost" || r.status === "ended") break;
    r = step(r.state, inp);
    results.push(r);
  }
  return results;
}

// Test-only surface (NOT part of the §2.3 public API): lets the verb suite apply a single
// effect against a minimal EngineState and inspect the mutation + emitted directives.
function makeTestState(overrides) {
  const heroId = "hero1";
  const state = {
    clock: { month: 1, turnInMonth: 1, turnsThisMonth: 5, cursor: null, pending: null, activeHero: heroId, turnOrder: [heroId], firstPlayerOfMonth: heroId, latches: {} },
    kingdoms: { ownership: { north: heroId }, dormant: [] },
    heroes: { [heroId]: { warriors: 7, spirit: 3, corruption: 0, advantages: 6, virtues: { active: [], inactive: ["v1", "v2"] }, items: { gear: [], treasure: [], potions: [], questItems: [] }, companions: [], counters: {} } },
    foes: [{ instanceId: "foe-1", foeId: "brigands", status: "ready", traits: ["Humanoid"], location: "delmsmire" }],
    adversary: { foeId: "ashstrider", spawned: false, defeated: false, advantages: [], advantagesBanked: 0, questProgress: 0, battleProgress: 0 },
    skulls: { supply: 24, onBoard: 0 }, decks: {}, market: [], monuments: [], markers: [], tokens: [],
    flags: {}, counters: {}, sealsRemoved: 0, brokenSeals: [], quests: {}, mainGoalComplete: false, dungeons: {},
    tower: { drums: [0, 0, 0], glyphFacing: {}, calibrated: true },
    rng: pcg32.serialize(pcg32.create("test")),
    outcome: { status: "running", reason: null },
    _lib: {
      tokenTypes: { "river-of-fire": { removable: false }, spore: { removable: true, threshold: { at: 3, onReach: [{ op: "corruption.gain", source: "spore" }] } } },
      quests: {},
      foes: { brigands: { level: 2 } },
      battleDefs: {
        ashstrider: { cards: [{ advantage: "Magic", strikes: 1 }, { advantage: "Beast", strikes: 1 }, { advantage: "Humanoid", strikes: 1 }, { advantage: "Melee", strikes: 1 }, { advantage: "Undead", strikes: 1 }] },
        brigands: { cards: [{ advantage: "Humanoid", strikes: 1 }, { advantage: "Melee", strikes: 1 }] },
        crit: { cards: [{ advantage: "Magic", strikes: 1, critical: true }, { advantage: "Beast", strikes: 1 }] }
      }
    }
  };
  return Object.assign(state, overrides || {});
}
function applyOne(state, eff) { const directives = []; applyEffect(eff, state, directives); return { state, directives }; }

module.exports = {
  ENGINE_VERSION, SUPPORTED_SCHEMA_RANGE,
  init, step, replay, serialize, deserialize, digest, evalCondition,
  __internals: { applyEffect, makeTestState, applyOne, startBattle, resolveBattle, applyTrade,
    interpretNode, resolveRoomEntry, finalizeRoom, completeDungeon, deriveGlyphFacing, homeKingdomOf, recomputeGlyphFacing }
};
