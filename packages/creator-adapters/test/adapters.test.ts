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
