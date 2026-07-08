import { describe, it, expect } from 'vitest';
import { validateRefs } from '../src/validate-refs';
import { validateGraph } from '../src/validate-graph';
import { createResolver } from '../src/resolver';

// Minimal golden fixture (matches packages/schema/test/fixtures.js `base`)
const golden = {
  schemaVersion: '0.4.0',
  meta: {
    title: "Recover Azkol's Treasures",
    description: 'MVP golden fixture.',
    scenarioVersion: '0.1.0',
    designer: { name: 'ChessMess' },
    pins: { udt: '5.0.0' },
    provenance: {
      importedSeed: {
        seed: 'AA9A-AAGS-W634',
        decodedSetup: {
          tier1Foe: 'Brigands',
          tier2Foe: 'Frost Trolls',
          tier3Foe: 'Dragons',
          adversary: 'Ashstrider',
          ally: 'Zaida',
          difficulty: 'Heroic',
          source: 'Core',
          playerCount: 1,
        },
      },
    },
  },
  setup: {
    mode: 'coop',
    difficulty: { profile: 'heroic', skullSupply: 24 },
    playerCountScaling: { turnsPerMonth: { '1': 6, '2': 7, '3': 8, '4': 9 } },
    monthEnd: { resolution: 'randomInRange', default: { minTurn: 3, maxTurn: 6 } },
    selections: {
      adversaryId: 'ashstrider',
      foes: { tier1: 'brigands', tier2: 'frost-trolls', tier3: 'dragons' },
      mainGoalId: 'recover-azkols-treasures',
      allyId: 'zaida',
    },
    board: { boardStateRef: 'board-main' },
  },
  library: {
    buildingTypes: {
      citadel: {
        free: [{ op: 'resource.gain', resource: 'warriors', amount: 1 }],
        enhanced: {
          cost: { resource: 'spirit', amount: 1 },
          effects: [{ op: 'resource.gain', resource: 'warriors', amount: 2 }],
        },
        skullCapacity: 3,
      },
      sanctuary: {
        free: [{ op: 'resource.gain', resource: 'warriors', amount: 1 }],
        enhanced: {
          cost: { resource: 'spirit', amount: 1 },
          effects: [{ op: 'corruption.remove', all: true }],
        },
        skullCapacity: 3,
      },
      village: {
        free: [{ op: 'resource.gain', resource: 'warriors', amount: 1 }],
        enhanced: {
          cost: { resource: 'spirit', amount: 1 },
          effects: [{ op: 'resource.gain', resource: 'spirit', amount: 1 }],
        },
        skullCapacity: 3,
      },
      bazaar: {
        free: [{ op: 'resource.gain', resource: 'warriors', amount: 1 }],
        enhanced: {
          cost: { resource: 'spirit', amount: 1 },
          effects: [{ op: 'market.refresh' }],
        },
        skullCapacity: 3,
      },
    },
  },
  graph: {
    entry: 'n-start',
    nodes: [
      { id: 'n-start', kind: 'lifecycle.gameStart', wires: { out: ['n-import'] } },
      { id: 'n-import', kind: 'lifecycle.importSeed', wires: { out: ['n-eff'] } },
      {
        id: 'n-eff',
        kind: 'effect.apply',
        props: { effects: [{ op: 'resource.gain', resource: 'warriors', amount: 2 }] },
        wires: { out: ['n-tower'] },
      },
      {
        id: 'n-tower',
        kind: 'tower.op',
        props: { towerOp: { channel: 'skull.dropTrigger' } },
      },
    ],
  },
};

// ---- L2 tests ----

describe('validateRefs (L2)', () => {
  it('accepts the golden fixture', () => {
    const result = validateRefs(golden);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects an out-of-roster adversaryId', () => {
    const bad = structuredClone(golden);
    bad.setup.selections.adversaryId = 'giant-spider';
    const result = validateRefs(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('adversaryId') && e.includes('giant-spider'))).toBe(
      true,
    );
  });

  it('rejects an out-of-roster tier1 foe', () => {
    const bad = structuredClone(golden);
    bad.setup.selections.foes.tier1 = 'unknown-foe';
    const result = validateRefs(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('tier1') && e.includes('unknown-foe'))).toBe(true);
  });

  it('rejects a foe at the wrong tier', () => {
    // frost-trolls is tier 2; putting it in tier1 slot should fail
    const bad = structuredClone(golden);
    bad.setup.selections.foes.tier1 = 'frost-trolls';
    const result = validateRefs(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('tier1'))).toBe(true);
  });

  it('rejects an unknown allyId', () => {
    const bad = structuredClone(golden);
    bad.setup.selections.allyId = 'merlin';
    const result = validateRefs(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('allyId') && e.includes('merlin'))).toBe(true);
  });

  it('rejects a light.named node with an unknown sequenceId', () => {
    const bad = structuredClone(golden);
    (bad.graph.nodes[3] as Record<string, unknown>).props = {
      towerOp: { channel: 'light.named', sequenceId: 'notARealSequence' },
    };
    const result = validateRefs(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('notARealSequence'))).toBe(true);
  });

  it('accepts a light.named node with a valid sequenceId', () => {
    const good = structuredClone(golden);
    (good.graph.nodes[3] as Record<string, unknown>).props = {
      towerOp: { channel: 'light.named', sequenceId: 'dungeonIdle' },
    };
    const result = validateRefs(good);
    expect(result.ok).toBe(true);
  });

  it('accepts a boardSetup node with valid spawns', () => {
    const good = structuredClone(golden);
    (good.graph.nodes as unknown[]).push({
      id: 'n-setup',
      kind: 'lifecycle.boardSetup',
      props: { spawns: [{ foeId: 'brigands', location: 'Delmsmire', status: 'ready' }] },
    });
    const result = validateRefs(good);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects a boardSetup spawn at an unknown location', () => {
    const bad = structuredClone(golden);
    (bad.graph.nodes as unknown[]).push({
      id: 'n-setup',
      kind: 'lifecycle.boardSetup',
      props: { spawns: [{ foeId: 'brigands', location: 'Narnia' }] },
    });
    const result = validateRefs(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('n-setup') && e.includes('Narnia'))).toBe(true);
  });

  it('rejects a boardSetup spawn with an out-of-roster foe', () => {
    const bad = structuredClone(golden);
    (bad.graph.nodes as unknown[]).push({
      id: 'n-setup',
      kind: 'lifecycle.boardSetup',
      props: { spawns: [{ foeId: 'giant-spider', location: 'Delmsmire' }] },
    });
    const result = validateRefs(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('n-setup') && e.includes('giant-spider'))).toBe(
      true,
    );
  });

  it('rejects a foe.spawn effect at an unknown location', () => {
    const bad = structuredClone(golden);
    (bad.graph.nodes[2] as Record<string, unknown>).props = {
      effects: [{ op: 'foe.spawn', foeId: 'brigands', location: 'Narnia' }],
    };
    const result = validateRefs(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('foe.spawn') && e.includes('Narnia'))).toBe(true);
  });

  it('accepts a selectHero node whose pool resolves in both the roster and library.heroes', () => {
    const good = structuredClone(golden) as Record<string, unknown>;
    (good.library as Record<string, unknown>).heroes = {
      'brutal-warlord': { heroId: 'brutal-warlord', source: 'base' },
      'orphaned-scion': { heroId: 'orphaned-scion', source: 'base' },
    };
    ((good.graph as Record<string, unknown>).nodes as unknown[]).push({
      id: 'n-hero',
      kind: 'lifecycle.selectHero',
      props: { heroIds: ['brutal-warlord', 'orphaned-scion'] },
    });
    const result = validateRefs(good);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects a selectHero heroId that is not in the UDT roster', () => {
    const bad = structuredClone(golden) as Record<string, unknown>;
    (bad.library as Record<string, unknown>).heroes = {
      'not-a-hero': { heroId: 'not-a-hero', source: 'base' },
    };
    ((bad.graph as Record<string, unknown>).nodes as unknown[]).push({
      id: 'n-hero',
      kind: 'lifecycle.selectHero',
      props: { heroIds: ['not-a-hero'] },
    });
    const result = validateRefs(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('n-hero') && e.includes('not-a-hero') && e.includes('roster'))).toBe(true);
  });

  it('rejects a valid UDT hero missing from library.heroes', () => {
    const bad = structuredClone(golden) as Record<string, unknown>;
    // library.heroes intentionally absent
    ((bad.graph as Record<string, unknown>).nodes as unknown[]).push({
      id: 'n-hero',
      kind: 'lifecycle.selectHero',
      props: { heroIds: ['brutal-warlord'] },
    });
    const result = validateRefs(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('n-hero') && e.includes('brutal-warlord') && e.includes('library.heroes'))).toBe(true);
  });
});

// ---- L3 tests ----

describe('validateGraph (L3)', () => {
  it('accepts the golden fixture', () => {
    const result = validateGraph(golden);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects a wire to a nonexistent node', () => {
    const bad = structuredClone(golden);
    bad.graph.nodes[0].wires = { out: ['n-does-not-exist'] };
    const result = validateGraph(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('n-does-not-exist'))).toBe(true);
  });

  it('rejects a missing entry node', () => {
    const bad = structuredClone(golden);
    bad.graph.entry = 'no-such-node';
    const result = validateGraph(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('no-such-node'))).toBe(true);
  });

  it('rejects an orphan node (unreachable from entry)', () => {
    const bad = structuredClone(golden);
    (bad.graph.nodes as unknown[]).push({ id: 'n-orphan', kind: 'lifecycle.gameStart' });
    const result = validateGraph(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('n-orphan') && e.includes('unreachable'))).toBe(
      true,
    );
  });

  it('rejects skull.dropTrigger carrying a count (skull invariant)', () => {
    const bad = structuredClone(golden);
    (bad.graph.nodes[3] as Record<string, unknown>).props = {
      towerOp: { channel: 'skull.dropTrigger', count: 3 },
    };
    const result = validateGraph(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('skull invariant'))).toBe(true);
  });

  it('rejects skull supply of 0', () => {
    const bad = structuredClone(golden);
    bad.setup.difficulty.skullSupply = 0;
    const result = validateGraph(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('skullSupply'))).toBe(true);
  });

  it('accepts unwired util.comment and util.group nodes (exempt from reachability)', () => {
    const ok = structuredClone(golden);
    (ok.graph.nodes as unknown[]).push(
      { id: 'n-note', kind: 'util.comment', label: 'Setup phase', description: 'Spawns the L2 foe.' },
      { id: 'n-group', kind: 'util.group', props: { color: '#3D5A80', nodeIds: [golden.graph.nodes[0].id] } },
    );
    const result = validateGraph(ok);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects a util.group whose props.nodeIds references a nonexistent node', () => {
    const bad = structuredClone(golden);
    (bad.graph.nodes as unknown[]).push({
      id: 'n-group',
      kind: 'util.group',
      props: { nodeIds: ['n-missing'] },
    });
    const result = validateGraph(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('n-group') && e.includes('n-missing'))).toBe(true);
  });

  it('rejects a util.group nesting another util.group', () => {
    const bad = structuredClone(golden);
    (bad.graph.nodes as unknown[]).push(
      { id: 'n-group-inner', kind: 'util.group', props: { nodeIds: [] } },
      { id: 'n-group-outer', kind: 'util.group', props: { nodeIds: ['n-group-inner'] } },
    );
    const result = validateGraph(bad);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some((e) => e.includes('n-group-outer') && e.includes('n-group-inner')),
    ).toBe(true);
  });

  it('rejects a util.group missing props.nodeIds', () => {
    const bad = structuredClone(golden);
    (bad.graph.nodes as unknown[]).push({ id: 'n-group', kind: 'util.group', props: {} });
    const result = validateGraph(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('n-group') && e.includes('nodeIds'))).toBe(true);
  });

  it('rejects a wired util.comment node', () => {
    const bad = structuredClone(golden);
    (bad.graph.nodes as unknown[]).push({
      id: 'n-note',
      kind: 'util.comment',
      wires: { out: [golden.graph.nodes[0].id] },
    });
    const result = validateGraph(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('n-note') && e.includes('annotation'))).toBe(true);
  });

  it('rejects a wire that targets an annotation node', () => {
    const bad = structuredClone(golden);
    (bad.graph.nodes as unknown[]).push({ id: 'n-note', kind: 'util.comment' });
    bad.graph.nodes[0].wires = { out: ['n-note'] };
    const result = validateGraph(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('n-note') && e.includes('annotation'))).toBe(true);
  });
});

// ---- dungeon validation (L2 refs + L3 structural/graph) ----

// A minimal L2+L3-valid dungeon-bearing scenario: a 2x1 dungeon (entrance → target) wired into the
// golden graph via a dungeon.subflow + two dungeon.room nodes. Tests clone and mutate this.
function makeDungeonScenario() {
  const doc = structuredClone(golden) as Record<string, unknown>;
  const library = doc.library as Record<string, unknown>;
  library.quests = { 'find-relic': { id: 'find-relic', name: 'Find the Relic' } };
  library.dungeons = {
    'crypt': {
      id: 'crypt',
      name: 'The Crypt',
      trait: 'Undead',
      grid: { cols: 2, rows: 1 },
      masterBitmap: 'crypt-map',
      spawningQuestId: 'find-relic',
      rooms: [
        { id: 'room-a', cell: { col: 0, row: 0 }, exits: { E: 'door' }, isEntrance: true },
        { id: 'room-b', cell: { col: 1, row: 0 }, exits: { W: 'door' }, isTarget: true },
      ],
    },
  };
  const nodes = (doc.graph as { nodes: Array<Record<string, unknown>> }).nodes;
  // n-tower is terminal in golden; route it into the dungeon so the subflow + rooms are reachable.
  nodes[3].wires = { out: ['n-dsub'] };
  nodes.push(
    { id: 'n-dsub', kind: 'dungeon.subflow', props: { dungeonId: 'crypt' }, wires: { enter: ['n-room-a'] } },
    { id: 'n-room-a', kind: 'dungeon.room', props: { roomId: 'room-a' }, wires: { E: ['n-room-b'] } },
    { id: 'n-room-b', kind: 'dungeon.room', props: { roomId: 'room-b' }, wires: { W: ['n-room-a'] } },
  );
  return doc;
}

describe('dungeon L2 references', () => {
  it('accepts a well-formed dungeon scenario', () => {
    const result = validateRefs(makeDungeonScenario());
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects a dungeon.subflow whose dungeonId is not in library.dungeons', () => {
    const bad = makeDungeonScenario();
    const nodes = (bad.graph as { nodes: Array<Record<string, unknown>> }).nodes;
    (nodes.find((n) => n.id === 'n-dsub')!.props as Record<string, unknown>).dungeonId = 'nope';
    const result = validateRefs(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('n-dsub') && e.includes('nope'))).toBe(true);
  });

  it('rejects a dungeon spawningQuestId with no matching library.quests entry', () => {
    const bad = makeDungeonScenario();
    ((bad.library as Record<string, unknown>).dungeons as Record<string, Record<string, unknown>>).crypt.spawningQuestId = 'ghost-quest';
    const result = validateRefs(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('crypt') && e.includes('ghost-quest'))).toBe(true);
  });
});

describe('dungeon L3 structural + graph checks', () => {
  const dungeonOf = (doc: Record<string, unknown>) =>
    ((doc.library as Record<string, unknown>).dungeons as Record<string, Record<string, unknown>>).crypt;
  const roomsOf = (doc: Record<string, unknown>) =>
    dungeonOf(doc).rooms as Array<Record<string, unknown>>;

  it('accepts a well-formed dungeon scenario', () => {
    const result = validateGraph(makeDungeonScenario());
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects zero or multiple entrance rooms', () => {
    const bad = makeDungeonScenario();
    roomsOf(bad)[1].isEntrance = true; // now two entrances
    const result = validateGraph(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('isEntrance'))).toBe(true);
  });

  it('rejects zero or multiple target rooms', () => {
    const bad = makeDungeonScenario();
    delete roomsOf(bad)[1].isTarget; // now no target
    const result = validateGraph(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('isTarget'))).toBe(true);
  });

  it('rejects a room cell outside the grid', () => {
    const bad = makeDungeonScenario();
    (roomsOf(bad)[1].cell as Record<string, number>).col = 5;
    const result = validateGraph(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('outside') && e.includes('grid'))).toBe(true);
  });

  it('rejects two rooms sharing a cell', () => {
    const bad = makeDungeonScenario();
    (roomsOf(bad)[1].cell as Record<string, number>).col = 0;
    const result = validateGraph(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('shares cell'))).toBe(true);
  });

  it('rejects a non-reciprocated door', () => {
    const bad = makeDungeonScenario();
    roomsOf(bad)[1].exits = {}; // room-b no longer has the reciprocal W door
    const result = validateGraph(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('reciprocated') || e.includes('facing no room'))).toBe(true);
  });

  it('rejects a target unreachable from the entrance', () => {
    const bad = makeDungeonScenario();
    // Sever both doors so the target is isolated (also removes the door mismatch noise).
    roomsOf(bad)[0].exits = {};
    roomsOf(bad)[1].exits = {};
    const nodes = (bad.graph as { nodes: Array<Record<string, unknown>> }).nodes;
    nodes.find((n) => n.id === 'n-room-a')!.wires = {};
    nodes.find((n) => n.id === 'n-room-b')!.wires = {};
    const result = validateGraph(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('not reachable'))).toBe(true);
  });

  it('rejects a referenced dungeon whose room has no dungeon.room node', () => {
    const bad = makeDungeonScenario();
    const nodes = (bad.graph as { nodes: Array<Record<string, unknown>> }).nodes;
    (bad.graph as { nodes: Array<Record<string, unknown>> }).nodes = nodes.filter(
      (n) => n.id !== 'n-room-b',
    );
    // repoint room-a's E wire so we isolate the "missing node" error (not a dangling-wire error)
    nodes.find((n) => n.id === 'n-room-a')!.wires = {};
    roomsOf(bad)[0].exits = {};
    roomsOf(bad)[1].exits = {};
    const result = validateGraph(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('no dungeon.room node') && e.includes('room-b'))).toBe(true);
  });

  it('rejects a subflow enter wire that does not target the entrance room node', () => {
    const bad = makeDungeonScenario();
    const nodes = (bad.graph as { nodes: Array<Record<string, unknown>> }).nodes;
    nodes.find((n) => n.id === 'n-dsub')!.wires = { enter: ['n-room-b'] };
    const result = validateGraph(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('enter wire') && e.includes('n-room-a'))).toBe(true);
  });

  it('does NOT require room nodes for a library-only dungeon (no referencing subflow)', () => {
    // A dungeon defined in library.dungeons with no dungeon.subflow node stays nodeless and valid —
    // this is the subflow-gated rule that keeps the Creator Problems panel clean before wiring.
    const ok = structuredClone(golden) as Record<string, unknown>;
    (ok.library as Record<string, unknown>).dungeons = {
      'crypt': {
        id: 'crypt',
        name: 'The Crypt',
        trait: 'Undead',
        grid: { cols: 2, rows: 1 },
        masterBitmap: 'crypt-map',
        rooms: [
          { id: 'room-a', cell: { col: 0, row: 0 }, exits: { E: 'door' }, isEntrance: true },
          { id: 'room-b', cell: { col: 1, row: 0 }, exits: { W: 'door' }, isTarget: true },
        ],
      },
    };
    const result = validateGraph(ok);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ---- resolver tests ----

describe('createResolver', () => {
  const resolver = createResolver();

  it('resolves a known foe', () => {
    const foe = resolver.resolveFoe('brigands');
    expect(foe).not.toBeNull();
    expect(foe!.id).toBe('brigands');
    expect(foe!.kind).toBe('foe');
  });

  it('returns null for an unknown foe id', () => {
    expect(resolver.resolveFoe('giant-spider')).toBeNull();
  });

  it('resolves a known adversary', () => {
    const adv = resolver.resolveAdversary('ashstrider');
    expect(adv).not.toBeNull();
    expect(adv!.kind).toBe('adversary');
  });

  it('returns null for a foe id passed to resolveAdversary', () => {
    expect(resolver.resolveAdversary('brigands')).toBeNull();
  });

  it('resolves a known light sequence key', () => {
    const val = resolver.resolveLightSequence('dungeonIdle');
    expect(typeof val).toBe('number');
  });

  it('returns null for unknown light sequence', () => {
    expect(resolver.resolveLightSequence('notReal')).toBeNull();
  });
});

// ---- the shipped goldenFull scenario resolves clean through L2 + L3 ----

describe('goldenFull (base-game fidelity scenario)', () => {
  it('passes L2 reference resolution', async () => {
    const { goldenFull } = await import('@udtc/engine');
    const result = validateRefs(goldenFull);
    expect(result.errors).toHaveLength(0);
    expect(result.ok).toBe(true);
  });

  it('passes L3 graph checks (trigger/newQuests chains are engine-fired roots)', async () => {
    const { goldenFull } = await import('@udtc/engine');
    const result = validateGraph(goldenFull);
    expect(result.errors).toHaveLength(0);
    expect(result.ok).toBe(true);
  });

  it('still flags a genuinely orphaned node', async () => {
    const { goldenFull } = await import('@udtc/engine');
    const bad = structuredClone(goldenFull) as { graph: { nodes: Array<Record<string, unknown>> } };
    bad.graph.nodes.push({ id: 'n-orphan', kind: 'media.narration', props: { text: 'lost' } });
    const result = validateGraph(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('n-orphan'))).toBe(true);
  });
});
