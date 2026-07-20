import { describe, it, expect, vi } from 'vitest';
import { runScenarioValidation } from '../src/validate-scenario';

// Regression guard for the Creator/Player validation de-fork (apps quality plan, item 1).
// Both apps used to carry parallel L1→L2→L3(→L4) pipelines that had drifted; the worst drift
// was Player SHORT-CIRCUITING L3 when L2 failed ("l3: ['L2 must pass']"), so the same malformed
// document produced different problem lists in the two apps. The merged pipeline runs L2 and L3
// independently whenever L1 passes. These tests lock that contract.

// A minimal but fully valid scenario — schema-valid (L1), refs resolve (L2), graph is connected
// and structurally sound (L3). Wires connect the linear spine so no node is orphaned.
function validBase(): Record<string, unknown> {
  return {
    schemaVersion: '0.4.0',
    meta: {
      title: "Recover Azkol's Treasures",
      description: 'Regression fixture.',
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
        { id: 'n-tower', kind: 'tower.op', props: { towerOp: { channel: 'skull.dropTrigger' } } },
      ],
    },
  };
}

describe('runScenarioValidation — merged pipeline (item 1 de-fork)', () => {
  it('accepts a fully valid scenario at L1–L3', () => {
    const r = runScenarioValidation(validBase());
    expect(r.l1.ok).toBe(true);
    expect(r.l2.ok).toBe(true);
    expect(r.l3.ok).toBe(true);
    expect(r.allOk).toBe(true);
  });

  it('runs L2 AND L3 independently when L1 passes — a doc that breaks both reports both', () => {
    const bad = validBase();
    // L2 break: an adversary that is not in the UDT roster (still a schema-valid string).
    (
      (bad.setup as Record<string, unknown>).selections as Record<string, unknown> as {
        adversaryId: string;
      }
    ).adversaryId = 'giant-spider';
    // L3 break: point entry at a node id that does not exist (schema-valid string).
    (bad.graph as Record<string, unknown>).entry = 'n-nonexistent';

    const r = runScenarioValidation(bad);
    expect(r.l1.ok).toBe(true);
    expect(r.l2.ok).toBe(false);
    expect(r.l3.ok).toBe(false);
    // The regression: L3 must carry the REAL graph error, not the old "L2 must pass" placeholder.
    expect(r.l2.errors.some((e) => e.includes('giant-spider'))).toBe(true);
    expect(r.l3.errors.some((e) => e.includes('n-nonexistent'))).toBe(true);
    expect(r.l3.errors).not.toContain('L2 must pass');
    expect(r.allOk).toBe(false);
  });

  it('gates L2/L3 with a placeholder and never runs L4 when L1 fails', () => {
    const l4 = vi.fn(() => ({ ok: true, errors: [] }));
    const r = runScenarioValidation({ not: 'a scenario' }, { l4 });
    expect(r.l1.ok).toBe(false);
    expect(r.l2.errors).toEqual(['L1 must pass first']);
    expect(r.l3.errors).toEqual(['L1 must pass first']);
    expect(r.l4).toEqual({ ok: false, errors: [] });
    expect(l4).not.toHaveBeenCalled();
    expect(r.allOk).toBe(false);
  });

  it('omits l4 entirely when no L4 runner is supplied (Creator shape)', () => {
    const r = runScenarioValidation(validBase());
    expect('l4' in r).toBe(false);
  });

  it('runs the opt-in L4 runner only after L1–L3 pass, and folds it into allOk (Player shape)', () => {
    const passing = vi.fn(() => ({ ok: true, errors: [] }));
    const rOk = runScenarioValidation(validBase(), { l4: passing });
    expect(passing).toHaveBeenCalledTimes(1);
    expect(rOk.l4).toEqual({ ok: true, errors: [] });
    expect(rOk.allOk).toBe(true);

    const failing = vi.fn(() => ({ ok: false, errors: ['engine.init blew up'] }));
    const rBad = runScenarioValidation(validBase(), { l4: failing });
    expect(failing).toHaveBeenCalledTimes(1);
    expect(rBad.l4.ok).toBe(false);
    expect(rBad.allOk).toBe(false);
  });
});
