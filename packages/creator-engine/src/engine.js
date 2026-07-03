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

const pcg32 = require('./pcg32');
const { KINGDOMS, canonical, serialize, deserialize, digest, clone, fault, dir } = require('./engine/core');
const { evalCondition } = require('./engine/conditions');

const ENGINE_VERSION = '0.4.0';
const SUPPORTED_SCHEMA_RANGE = '>=0.4.0 <0.5.0'; // semver-range, same-minor pre-1.0 (§8)

const {
  FOE_LADDER,
  shuffleInPlace,
  applyEffect,
  gainCorruption,
  completeQuest,
  raiseEvent,
  loseGame,
  winGame,
  buildingAt,
  capacityOf,
  pickBuildingForSkull,
} = require('./engine/effects');

const { homeKingdomOf, deriveGlyphFacing, recomputeGlyphFacing } = require('./engine/glyph');
const {
  resetLatches,
  markHeroic,
  awardHeroic,
  collectDueEvents,
  rotateActiveHero,
  performAction,
  applyTrade,
} = require('./engine/turn');
const { startBattle, resolveBattle } = require('./engine/battle');
const {
  dungeonState,
  roomOf,
  resolveRoomEntry,
  finalizeRoom,
  completeDungeon,
} = require('./engine/dungeon');
const { interpretNode } = require('./engine/nodes');
const { resume } = require('./engine/resume');

// ---------- the run loop ----------
function run(state, directives) {
  // safety bound so a malformed graph can't spin forever
  for (let guard = 0; guard < 100000; guard++) {
    if (
      state.outcome.status === 'won' ||
      state.outcome.status === 'lost' ||
      state.outcome.status === 'ended'
    )
      return state.outcome.status;
    const node = state._nodes[state.clock.cursor];
    if (!node) {
      state.outcome.status = 'ended';
      return 'ended';
    }
    const r = interpretNode(node, state, directives);
    if (r.await) {
      state.clock.pending = { request: r.await.request };
      state.outcome.status = 'awaitingInput';
      return 'awaitingInput';
    }
    if (r.terminal) return state.outcome.status;
    if (r.end || r.goto === undefined) {
      // an end-of-turn event chain ran off its last node: pop the next due chain, then resume
      // the turn spine (rotate + goto) stashed before the events fired.
      const q = state.clock.eventQueue;
      if (q && q.length) {
        state.clock.cursor = q.shift();
        continue;
      }
      const ae = state.clock.afterEvents;
      if (ae) {
        state.clock.afterEvents = null;
        state.clock.eventQueue = null;
        if (ae.rotate) rotateActiveHero(state);
        state.clock.cursor = ae.target;
        continue;
      }
      state.outcome.status = 'ended';
      return 'ended';
    }
    state.clock.cursor = r.goto;
  }
  throw fault('run loop exceeded guard (graph cycle without progress?)');
}

// ---------- public API (§2.3) ----------
// Build the active/dormant kingdom split for a player count. Prefers the authored map
// (setup.playerCountScaling.dormantKingdoms.byPlayerCount, schema v0.4) and falls back to the
// canonical order (first N kingdoms active, remainder dormant; 4P → none dormant). The complement of
// the dormant set must leave exactly one active kingdom per player — otherwise it's a load fault.
function buildKingdoms(scenario, playerCount) {
  const pcs = (scenario.setup && scenario.setup.playerCountScaling) || {};
  const byPC = pcs.dormantKingdoms && pcs.dormantKingdoms.byPlayerCount;
  const dormant =
    byPC && Array.isArray(byPC[String(playerCount)])
      ? byPC[String(playerCount)].slice()
      : KINGDOMS.slice(playerCount);
  const active = KINGDOMS.filter((k) => !dormant.includes(k));
  if (active.length !== playerCount)
    throw fault(
      'playerCount ' +
        playerCount +
        ' needs ' +
        playerCount +
        ' active kingdom(s); setup yields ' +
        active.length +
        ' (dormant: [' +
        dormant.join(',') +
        '])',
    );
  return { active, dormant };
}
function makeHero(fullTurn) {
  // Hero rich-data (real 7+1 split, banner, move value, 3+3 virtues, Advantage pool) is injected
  // content (§10.3, D2-blocked); the engine starts every hero from the documented placeholder.
  // Full-turn scenarios seed the 3+3 virtue split (rules.md §Hero Setup) with placeholder ids so
  // the citadel's enhanced Reinforce (virtue.activate) is exercisable before hero content ships.
  const virtues = fullTurn
    ? {
        active: ['virtue-1', 'virtue-2', 'virtue-3'],
        inactive: ['virtue-4', 'virtue-5', 'virtue-6'],
      }
    : { active: [], inactive: [] };
  return {
    warriors: 7,
    spirit: 1,
    corruption: 0,
    advantages: 6,
    virtues,
    items: { gear: [], treasure: [], potions: [], questItems: [] },
    companions: [],
    counters: {},
    location: null,
  };
}

function init(scenario, opts) {
  if (!opts || !opts.seed) throw fault('init requires opts.seed (engine runtime seed, §6)');
  const nodes = {};
  for (const n of scenario.graph.nodes) nodes[n.id] = n;
  const byKind = (k) => {
    const n = scenario.graph.nodes.find((x) => x.kind === k);
    return n && n.id;
  };
  // Honor opts.playerCount (§3.1): build the hero set, per-player home-kingdom ownership, the dormant
  // complement, and clockwise seating. Fail at load (§ "fail at load, never mid-game") on a bad count
  // or a dormant-set that doesn't leave exactly one active kingdom per player.
  const playerCount = opts.playerCount | 0 || 1;
  if (playerCount < 1 || playerCount > 4)
    throw fault('playerCount must be 1–4 (got ' + opts.playerCount + ')');
  const { active, dormant } = buildKingdoms(scenario, playerCount);
  // Full-turn discriminator (fidelity gate): the actionMiddle node opts in with props.turn === "full".
  // Legacy scenarios (no prop) keep the single-action-per-turn MVP loop byte-identical.
  const amidNode = scenario.graph.nodes.find((n) => n.kind === 'lifecycle.actionMiddle');
  const fullTurn = !!(amidNode && amidNode.props && amidNode.props.turn === 'full');
  const heroIds = [];
  for (let i = 1; i <= playerCount; i++) heroIds.push('hero' + i);
  const heroes = {};
  for (const id of heroIds) heroes[id] = makeHero(fullTurn);
  const ownership = {};
  active.forEach((k, i) => {
    ownership[k] = heroIds[i];
  });
  // Buildings registry + hero start locations from the authored (opaque-to-L1) boardState:
  // { home: { kingdom: location }, buildings: [{ kingdom, type, location }] }. Heroes start on
  // their home kingdom's citadel space (rules.md §Hero Setup).
  const boardState = (scenario.setup.board && scenario.setup.board.boardState) || null;
  const buildings =
    boardState && Array.isArray(boardState.buildings)
      ? boardState.buildings.map((b) => ({
          kingdom: b.kingdom,
          type: b.type,
          location: b.location,
          skulls: 0,
          destroyed: false,
        }))
      : null;
  if (boardState && boardState.home) {
    for (const k of Object.keys(ownership)) {
      if (boardState.home[k] != null) heroes[ownership[k]].location = boardState.home[k];
    }
  }
  const firstHero = heroIds[0];
  const rng = pcg32.create(opts.seed);
  const state = {
    meta: {
      scenarioVersion: scenario.meta.scenarioVersion,
      schemaVersion: scenario.schemaVersion,
      engine: ENGINE_VERSION,
    },
    clock: {
      month: 0,
      turnInMonth: 0,
      turnsThisMonth: 0,
      globalTurn: 0,
      cursor: scenario.graph.entry,
      pending: null,
      activeHero: firstHero,
      turnOrder: heroIds.slice(),
      firstPlayerOfMonth: firstHero,
      latches: {},
    },
    kingdoms: { ownership, dormant },
    heroes,
    ...(buildings ? { buildings } : {}),
    foes: [],
    adversary: {
      foeId: scenario.setup.selections.adversaryId,
      spawned: false,
      defeated: false,
      advantages: [],
      advantagesBanked: 0,
      questProgress: 0,
      battleProgress: 0,
    },
    skulls: { supply: scenario.setup.difficulty.skullSupply, onBoard: 0 },
    decks: {},
    market: [],
    monuments: [],
    markers: [],
    tokens: [],
    flags: {},
    counters: {},
    sealsRemoved: 0,
    brokenSeals: [],
    quests: {},
    mainGoalComplete: false,
    dungeons: {},
    tower: { drums: [0, 0, 0], glyphFacing: {}, calibrated: true }, // engine-owned derived mirror (§3.4)
    rng: pcg32.serialize(rng),
    outcome: { status: 'running', reason: null },
    // load-time references kept out of the digest-relevant game state but needed at run:
    _nodes: nodes,
    _lib: scenario.library,
    _spine: {
      startMonth: byKind('lifecycle.startMonth'),
      playerTurn: byKind('lifecycle.playerTurn'),
      newMonthCheck: byKind('lifecycle.newMonthCheck'),
      newQuests: byKind('lifecycle.newQuests'),
      actionMiddle: amidNode && amidNode.id,
      endEval: byKind('winloss.winCondition'),
      gameEnd: byKind('lifecycle.gameEnd'),
      battleEntry: byKind('battle.selectFoe') || byKind('action.battle'),
      tradeEntry: byKind('action.trade'),
      moveEntry: byKind('action.move'),
      dungeonEntry: byKind('dungeon.subflow'),
    },
    _setup: {
      monthEnd: scenario.setup.monthEnd,
      mainGoalId: scenario.setup.selections.mainGoalId,
      goalThreshold: (scenario.meta.tuning && scenario.meta.tuning.goalThreshold) || 3,
      adversaryToughness: (scenario.meta.tuning && scenario.meta.tuning.adversaryToughness) || 2,
      fullTurn,
      // foe level by selection tier (rules: tier1→2, tier2→3, tier3→4); adversary is always 5
      foeTiers: (() => {
        const f = scenario.setup.selections.foes || {};
        const m = {};
        if (f.tier1) m[f.tier1] = 2;
        if (f.tier2) m[f.tier2] = 3;
        if (f.tier3) m[f.tier3] = 4;
        return m;
      })(),
      // quests issued by the authored newQuests node are attemptable only while active
      monthlyQuestIds: (() => {
        const nq = scenario.graph.nodes.find((n) => n.kind === 'lifecycle.newQuests');
        const ids = [];
        if (nq && nq.props && nq.props.monthly)
          for (const m of Object.values(nq.props.monthly))
            for (const v of Object.values(m)) ids.push(v);
        return ids;
      })(),
    },
    // end-of-turn event triggers in graph order (deterministic firing order)
    _triggers: scenario.graph.nodes
      .filter((n) => n.kind === 'trigger.schedule' || n.kind === 'trigger.onState')
      .map((n) => ({
        id: n.id,
        trigger: (n.props || {}).trigger,
        next: ((n.wires || {}).out || [])[0],
      })),
  };
  resetLatches(state);
  const directives = [];
  const status = run(state, directives);
  return {
    state,
    directives,
    status,
    awaiting: state.clock.pending ? state.clock.pending.request : undefined,
  };
}

function step(prevState, input) {
  const state = clone(prevState);
  // _nodes/_lib/_setup survive clone (plain JSON) — fine, they're immutable references.
  const directives = [];
  if (state.clock.pending) {
    const pending = state.clock.pending;
    state.clock.pending = null;
    state.outcome.status = 'running';
    const r = resume(pending, state, input, directives);
    if (r && r.await) {
      // resume can open a NEW input boundary (e.g. dungeon room: improve → move)
      state.clock.pending = { request: r.await.request };
      state.outcome.status = 'awaitingInput';
      return { state, directives, status: 'awaitingInput', awaiting: r.await.request };
    }
    if (r && r.goto !== undefined) state.clock.cursor = r.goto;
    else if (r && r.terminal) {
      /* outcome already set */
    }
  } else if (input && input.kind === 'control') {
    return { state: prevState, directives: [], status: prevState.outcome.status };
  }
  const status =
    state.outcome.status === 'running' || state.outcome.status === 'awaitingInput'
      ? run(state, directives)
      : state.outcome.status;
  return {
    state,
    directives,
    status,
    awaiting: state.clock.pending ? state.clock.pending.request : undefined,
  };
}

function replay(scenario, opts, inputs) {
  const results = [];
  let r = init(scenario, opts);
  results.push(r);
  for (const inp of inputs) {
    if (r.status === 'won' || r.status === 'lost' || r.status === 'ended') break;
    r = step(r.state, inp);
    results.push(r);
  }
  return results;
}

// Test-only surface (NOT part of the §2.3 public API): lets the verb suite apply a single
// effect against a minimal EngineState and inspect the mutation + emitted directives.
function makeTestState(overrides) {
  const heroId = 'hero1';
  const state = {
    clock: {
      month: 1,
      turnInMonth: 1,
      turnsThisMonth: 5,
      cursor: null,
      pending: null,
      activeHero: heroId,
      turnOrder: [heroId],
      firstPlayerOfMonth: heroId,
      latches: {},
    },
    kingdoms: { ownership: { north: heroId }, dormant: [] },
    heroes: {
      [heroId]: {
        warriors: 7,
        spirit: 3,
        corruption: 0,
        advantages: 6,
        virtues: { active: [], inactive: ['v1', 'v2'] },
        items: { gear: [], treasure: [], potions: [], questItems: [] },
        companions: [],
        counters: {},
      },
    },
    foes: [
      {
        instanceId: 'foe-1',
        foeId: 'brigands',
        status: 'ready',
        traits: ['Humanoid'],
        location: 'delmsmire',
      },
    ],
    adversary: {
      foeId: 'ashstrider',
      spawned: false,
      defeated: false,
      advantages: [],
      advantagesBanked: 0,
      questProgress: 0,
      battleProgress: 0,
    },
    skulls: { supply: 24, onBoard: 0 },
    decks: {},
    market: [],
    monuments: [],
    markers: [],
    tokens: [],
    flags: {},
    counters: {},
    sealsRemoved: 0,
    brokenSeals: [],
    quests: {},
    mainGoalComplete: false,
    dungeons: {},
    tower: { drums: [0, 0, 0], glyphFacing: {}, calibrated: true },
    rng: pcg32.serialize(pcg32.create('test')),
    outcome: { status: 'running', reason: null },
    _lib: {
      tokenTypes: {
        'river-of-fire': { removable: false },
        spore: {
          removable: true,
          threshold: { at: 3, onReach: [{ op: 'corruption.gain', source: 'spore' }] },
        },
      },
      quests: {},
      foes: { brigands: { level: 2 } },
      battleDefs: {
        ashstrider: {
          cards: [
            { advantage: 'Magic', strikes: 1 },
            { advantage: 'Beast', strikes: 1 },
            { advantage: 'Humanoid', strikes: 1 },
            { advantage: 'Melee', strikes: 1 },
            { advantage: 'Undead', strikes: 1 },
          ],
        },
        brigands: {
          cards: [
            { advantage: 'Humanoid', strikes: 1 },
            { advantage: 'Melee', strikes: 1 },
          ],
        },
        crit: {
          cards: [
            { advantage: 'Magic', strikes: 1, critical: true },
            { advantage: 'Beast', strikes: 1 },
          ],
        },
      },
    },
  };
  return Object.assign(state, overrides || {});
}
function applyOne(state, eff) {
  const directives = [];
  applyEffect(eff, state, directives);
  return { state, directives };
}

module.exports = {
  ENGINE_VERSION,
  SUPPORTED_SCHEMA_RANGE,
  init,
  step,
  replay,
  serialize,
  deserialize,
  digest,
  evalCondition,
  __internals: {
    applyEffect,
    makeTestState,
    applyOne,
    startBattle,
    resolveBattle,
    applyTrade,
    interpretNode,
    resolveRoomEntry,
    finalizeRoom,
    completeDungeon,
    deriveGlyphFacing,
    homeKingdomOf,
    recomputeGlyphFacing,
  },
};
