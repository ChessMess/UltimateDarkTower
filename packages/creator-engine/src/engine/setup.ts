// setup.ts — scenario load + state construction (§2.3 init) and the test-only helpers. Builds the
// active/dormant kingdom split, the hero set, the buildings registry, the node index, the turn spine,
// and the trigger table, then runs to the first boundary. Depends on core, effects, turn, run, pcg32.

import pcg32 from '../pcg32';
import { ENGINE_VERSION, KINGDOMS, fault } from './core';
import { applyEffect } from './effects';
import { resetLatches } from './turn';
import { run } from './run';
import type { EngineState, Scenario, InitOpts, StepResult, Kingdom, HeroState, Effect, Directive } from './types';

// ---------- public API: init (§2.3) ----------
export function buildKingdoms(scenario: Scenario, playerCount: number): { active: Kingdom[]; dormant: Kingdom[] } {
  const pcs = (scenario.setup && scenario.setup.playerCountScaling) || {};
  const byPC = pcs.dormantKingdoms && pcs.dormantKingdoms.byPlayerCount;
  const dormant: Kingdom[] =
    byPC && Array.isArray(byPC[String(playerCount)]) ? byPC[String(playerCount)].slice() : KINGDOMS.slice(playerCount);
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
export function makeHero(fullTurn: boolean): HeroState {
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
    heroRef: null,
  };
}

// scenario stays `unknown` at this public boundary (matching the pre-port contract) — the engine
// trusts nothing about scenario shape until L1-L4 validation has run externally; Scenario itself
// is an internal modeling convenience for this function's body, not a public authoring contract.
export function init(scenario: unknown, opts: InitOpts): StepResult {
  if (!opts || !opts.seed) throw fault('init requires opts.seed (engine runtime seed, §6)');
  const sc = scenario as Scenario;
  const nodes: EngineState['_nodes'] = {};
  for (const n of sc.graph.nodes) nodes[n.id] = n;
  const byKind = (k: string) => {
    const n = sc.graph.nodes.find((x) => x.kind === k);
    return n && n.id;
  };
  // Honor opts.playerCount (§3.1): build the hero set, per-player home-kingdom ownership, the dormant
  // complement, and clockwise seating. Fail at load (§ "fail at load, never mid-game") on a bad count
  // or a dormant-set that doesn't leave exactly one active kingdom per player.
  const playerCount = (opts.playerCount as number) | 0 || 1;
  if (playerCount < 1 || playerCount > 4) throw fault('playerCount must be 1–4 (got ' + opts.playerCount + ')');
  const { active, dormant } = buildKingdoms(sc, playerCount);
  // Full-turn discriminator (fidelity gate): the actionMiddle node opts in with props.turn === "full".
  // Legacy scenarios (no prop) keep the single-action-per-turn MVP loop byte-identical.
  const amidNode = sc.graph.nodes.find((n) => n.kind === 'lifecycle.actionMiddle');
  const fullTurn = !!(amidNode && amidNode.props && amidNode.props.turn === 'full');
  const heroIds: string[] = [];
  for (let i = 1; i <= playerCount; i++) heroIds.push('hero' + i);
  const heroes: Record<string, HeroState> = {};
  for (const id of heroIds) heroes[id] = makeHero(fullTurn);
  const ownership: Record<string, string> = {};
  active.forEach((k, i) => {
    ownership[k] = heroIds[i];
  });
  // Buildings registry + hero start locations from the authored (opaque-to-L1) boardState:
  // { home: { kingdom: location }, buildings: [{ kingdom, type, location }] }. Heroes start on
  // their home kingdom's citadel space (rules.md §Hero Setup).
  const boardState = (sc.setup.board && sc.setup.board.boardState) || null;
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
      scenarioVersion: sc.meta.scenarioVersion,
      schemaVersion: sc.schemaVersion,
      engine: ENGINE_VERSION,
    },
    clock: {
      month: 0,
      turnInMonth: 0,
      turnsThisMonth: 0,
      globalTurn: 0,
      cursor: sc.graph.entry,
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
      foeId: sc.setup.selections.adversaryId ?? '', // optional since 0.4.1; '' never matches a real foe id

      spawned: false,
      defeated: false,
      advantages: [],
      advantagesBanked: 0,
      questProgress: 0,
      battleProgress: 0,
    },
    skulls: { supply: sc.setup.difficulty.skullSupply, onBoard: 0 },
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
    tower: { drums: [0, 0, 0] as [number, number, number], glyphFacing: {}, calibrated: true }, // engine-owned derived mirror (§3.4)
    rng: pcg32.serialize(rng),
    outcome: { status: 'running', reason: null },
    // load-time references kept out of the digest-relevant game state but needed at run:
    _nodes: nodes,
    _lib: sc.library,
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
      monthEnd: sc.setup.monthEnd,
      mainGoalId: sc.setup.selections.mainGoalId ?? '', // optional since 0.4.1; '' never matches a real quest id
      goalThreshold: (sc.meta.tuning && sc.meta.tuning.goalThreshold) || 3,
      adversaryToughness: (sc.meta.tuning && sc.meta.tuning.adversaryToughness) || 2,
      fullTurn,
      // foe level by selection tier (rules: tier1→2, tier2→3, tier3→4); adversary is always 5
      foeTiers: (() => {
        const f = sc.setup.selections.foes || {};
        const m: Record<string, number> = {};
        if (f.tier1) m[f.tier1] = 2;
        if (f.tier2) m[f.tier2] = 3;
        if (f.tier3) m[f.tier3] = 4;
        return m;
      })(),
      // quests issued by the authored newQuests node are attemptable only while active
      monthlyQuestIds: (() => {
        const nq = sc.graph.nodes.find((n) => n.kind === 'lifecycle.newQuests');
        const ids: string[] = [];
        const monthly = (nq?.props || {}).monthly;
        if (monthly) for (const m of Object.values(monthly)) for (const v of Object.values(m)) ids.push(v);
        return ids;
      })(),
    },
    // end-of-turn event triggers in graph order (deterministic firing order)
    _triggers: sc.graph.nodes
      .filter((n) => n.kind === 'trigger.schedule' || n.kind === 'trigger.onState')
      .map((n) => ({
        id: n.id,
        trigger: (n.props || {}).trigger,
        next: ((n.wires || {}).out || [])[0],
      })),
  } as unknown as EngineState;
  resetLatches(state);
  const directives: StepResult['directives'] = [];
  const status = run(state, directives);
  return {
    state,
    directives,
    status,
    awaiting: state.clock.pending ? state.clock.pending.request : undefined,
  };
}

// Test-only surface (NOT part of the §2.3 public API): lets the verb suite apply a single
// effect against a minimal EngineState and inspect the mutation + emitted directives.
export function makeTestState(overrides?: Partial<EngineState>): EngineState {
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
          threshold: { at: 3, onReach: [{ op: 'corruption.gain', source: 'spore' } as Effect] },
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
  } as unknown as EngineState;
  return Object.assign(state, overrides || {});
}
export function applyOne(state: EngineState, eff: Effect): { state: EngineState; directives: Directive[] } {
  const directives: Directive[] = [];
  applyEffect(eff, state, directives);
  return { state, directives };
}
