import { describe, it, expect, beforeEach } from 'vitest';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { scenarioSchema } from '@udtc/schema';
import { useCreatorStore } from '../store';
import { buildRtdtPreset } from './presetRtdt';
import { activeBoardId, boardsOf, suggestAdjacency, bfsDistance, validateBoard } from './shared';
import type { Board } from './shared';
import { activeBoardLocationNames } from './vocabulary';
import { scaffoldScenario } from '../utils/scaffold';
import type { ScenarioDoc } from '../types';

function scaffold(): ScenarioDoc {
  return scaffoldScenario({
    title: 'Board test',
    designer: 'Test',
    mode: 'coop',
    difficultyProfile: 'heroic',
    skullSupply: 30,
    monthEndMin: 5,
    monthEndMax: 8,
  });
}

function load(doc: ScenarioDoc): void {
  useCreatorStore.getState().loadScenario(doc, false);
}

const store = () => useCreatorStore.getState();

beforeEach(() => {
  useCreatorStore.getState().clearScenario();
});

describe('buildRtdtPreset', () => {
  it('clones the built-in board with all 60 locations and its calibration', () => {
    const preset = buildRtdtPreset('rtdt-copy');
    expect(preset.id).toBe('rtdt-copy');
    expect(preset.locations).toHaveLength(60);
    expect(preset.imageInfo).toEqual({
      width: 4096,
      height: 4096,
      centerX: 0.5,
      centerY: 0.5,
      radius: 0.5,
      northHeadingDegrees: 135,
    });
  });

  it('LOWERCASES building types — core says Citadel, the schema enum says citadel', () => {
    const preset = buildRtdtPreset('rtdt-copy');
    const buildings = preset.locations.map((l) => l.building).filter(Boolean);
    expect(buildings.length).toBe(16);
    for (const b of buildings) expect(b).toBe(b!.toLowerCase());
    expect(preset.locations.find((l) => l.name === 'Radiant Mountains')?.building).toBe('citadel');
  });

  it('carries no imageRef (RtDT art is not bundled into documents)', () => {
    expect(buildRtdtPreset('rtdt-copy').imageRef).toBeUndefined();
  });

  it('has no validation problems beyond the "no anchors"/calibration advisories', () => {
    const errors = validateBoard(buildRtdtPreset('rtdt-copy')).filter((p) => p.level === 'error');
    expect(errors).toEqual([]);
  });

  // THE preset trap: a spread of RTDT_BOARD_DEFINITION would fail L1 on capitalized buildings.
  // Assert FULL schema validity, not just casing.
  it('produces a document that passes L1 schema validation', () => {
    const doc = scaffold() as unknown as Record<string, unknown>;
    doc.schemaVersion = '0.4.6';
    const preset = buildRtdtPreset('rtdt-copy');
    (doc.library as Record<string, unknown>).boards = { 'rtdt-copy': preset };
    (doc.setup as Record<string, unknown>).board = { boardRef: 'rtdt-copy' };

    const ajv = new Ajv({ allErrors: true, strict: true });
    addFormats(ajv);
    const validate = ajv.compile(scenarioSchema);
    const valid = validate(doc);
    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
  });
});

describe('store — commitBoards / setActiveBoard', () => {
  it('writes and clears library.boards', () => {
    load(scaffold());
    const preset = buildRtdtPreset('b1');
    store().commitBoards({ b1: preset });
    expect(Object.keys(boardsOf(store().schemaDoc))).toEqual(['b1']);

    store().commitBoards({});
    expect((store().schemaDoc!.library as Record<string, unknown>).boards).toBeUndefined();
  });

  it('setActiveBoard points setup.board at the board, and null goes back to the default', () => {
    load(scaffold());
    store().commitBoards({ b1: buildRtdtPreset('b1') });

    store().setActiveBoard('b1');
    expect(activeBoardId(store().schemaDoc)).toBe('b1');
    expect(store().schemaDoc!.setup.board).toEqual({ boardRef: 'b1' });

    store().setActiveBoard(null);
    expect(activeBoardId(store().schemaDoc)).toBeNull();
  });

  // THE Phase 5 trap: setup.board is a oneOf, so {boardRef} and {boardState} are mutually
  // exclusive — a naive setActiveBoard silently destroys a hand-authored inline boardState.
  it('ROUND-TRIP: an inline boardState survives custom-board → back', () => {
    const doc = scaffold();
    const authored = {
      home: { north: 'Radiant Mountains' },
      buildings: [{ kingdom: 'north', type: 'citadel', location: 'Radiant Mountains' }],
    };
    (doc.setup as Record<string, unknown>).board = { boardState: authored };
    load(doc);

    store().commitBoards({ b1: buildRtdtPreset('b1') });
    store().setActiveBoard('b1');
    expect(store().schemaDoc!.setup.board).toEqual({ boardRef: 'b1' });

    store().setActiveBoard(null);
    expect(store().schemaDoc!.setup.board).toEqual({ boardState: authored });
  });

  it('ROUND-TRIP: custom → another custom → back still restores the ORIGINAL boardState', () => {
    const doc = scaffold();
    const authored = { home: { north: 'Radiant Mountains' }, buildings: [] };
    (doc.setup as Record<string, unknown>).board = { boardState: authored };
    load(doc);

    store().commitBoards({ b1: buildRtdtPreset('b1'), b2: buildRtdtPreset('b2') });
    store().setActiveBoard('b1');
    store().setActiveBoard('b2'); // must NOT overwrite the stash with {boardRef:'b1'}
    store().setActiveBoard(null);
    expect(store().schemaDoc!.setup.board).toEqual({ boardState: authored });
  });

  it('deleting the ACTIVE board restores the previous setup.board rather than dangling', () => {
    const doc = scaffold();
    const authored = { home: { north: 'Radiant Mountains' }, buildings: [] };
    (doc.setup as Record<string, unknown>).board = { boardState: authored };
    load(doc);

    store().commitBoards({ b1: buildRtdtPreset('b1') });
    store().setActiveBoard('b1');
    store().commitBoards({}); // delete it while active

    expect(activeBoardId(store().schemaDoc)).toBeNull();
    expect(store().schemaDoc!.setup.board).toEqual({ boardState: authored });
  });

  it('deleting an INACTIVE board leaves setup.board alone', () => {
    load(scaffold());
    store().commitBoards({ b1: buildRtdtPreset('b1'), b2: buildRtdtPreset('b2') });
    store().setActiveBoard('b1');
    store().commitBoards({ b1: buildRtdtPreset('b1') }); // drop b2
    expect(activeBoardId(store().schemaDoc)).toBe('b1');
  });

  it('scaffold: with no custom board, setup.board keeps its original branch', () => {
    load(scaffold());
    expect(activeBoardId(store().schemaDoc)).toBeNull();
    expect(store().schemaDoc!.setup.board).toEqual({ boardStateRef: 'board-main' });
  });
});

describe('vocabulary', () => {
  it('falls back to the RtDT roster with no custom board', () => {
    load(scaffold());
    const names = activeBoardLocationNames(store().schemaDoc);
    expect(names).toHaveLength(60);
    expect(names).toContain('Broken Lands');
  });

  it('offers the custom board’s names once it is active', () => {
    load(scaffold());
    const board: Board = {
      id: 'b1',
      name: 'B1',
      imageInfo: { width: 100, height: 100 },
      locations: [
        { name: 'Emberfall', kingdom: 'north', terrain: 'Ash' },
        { name: 'Coldwatch', kingdom: 'north', terrain: 'Tundra' },
      ],
    };
    store().commitBoards({ b1: board });
    store().setActiveBoard('b1');
    expect(activeBoardLocationNames(store().schemaDoc)).toEqual(['Emberfall', 'Coldwatch']);
  });

  it('falls back to RtDT for a dangling boardRef rather than offering an empty list', () => {
    load(scaffold());
    store().commitBoards({ b1: buildRtdtPreset('b1') });
    store().setActiveBoard('b1');
    // Force a dangle the UI would normally prevent.
    const doc = store().schemaDoc!;
    (doc.library as Record<string, unknown>).boards = {};
    expect(activeBoardLocationNames(doc)).toHaveLength(60);
  });

  it('returns the RtDT roster for a null doc', () => {
    expect(activeBoardLocationNames(null)).toHaveLength(60);
  });
});

describe('adjacency helpers', () => {
  const board: Board = {
    id: 'b',
    name: 'b',
    imageInfo: { width: 100, height: 100 },
    locations: [
      { name: 'A', kingdom: 'north', terrain: 't' },
      { name: 'B', kingdom: 'north', terrain: 't' },
      { name: 'C', kingdom: 'north', terrain: 't' },
      { name: 'D', kingdom: 'north', terrain: 't' },
    ],
    anchors: {
      A: { hero: { x: 0.1, y: 0.1 } },
      B: { hero: { x: 0.15, y: 0.1 } }, // within the default radius of A
      C: { hero: { x: 0.9, y: 0.9 } },
      D: { hero: { x: 0.95, y: 0.9 } }, // within the default radius of C
    },
    adjacency: { A: ['B'], B: ['A', 'C'], C: ['B'], D: [] },
  };

  it('bfsDistance walks the graph and reports unreachable as null', () => {
    expect(bfsDistance(board, 'A', 'A')).toBe(0);
    expect(bfsDistance(board, 'A', 'B')).toBe(1);
    expect(bfsDistance(board, 'A', 'C')).toBe(2);
    expect(bfsDistance(board, 'A', 'D')).toBeNull();
  });

  it('suggestAdjacency links only nearby anchors, symmetrically', () => {
    const adj = suggestAdjacency(board);
    expect(adj.A).toEqual(['B']);
    expect(adj.B).toEqual(['A']);
    expect(adj.C).toEqual(['D']);
    expect(adj.D).toEqual(['C']);
  });
});

describe('validateBoard', () => {
  const base: Board = {
    id: 'b',
    name: 'B',
    imageInfo: { width: 100, height: 100 },
    locations: [{ name: 'A', kingdom: 'north', terrain: 't', building: 'citadel' }],
    anchors: { A: { hero: { x: 0.1, y: 0.1 } } },
  };

  it('flags asymmetric adjacency as an error', () => {
    const problems = validateBoard({ ...base, adjacency: { A: ['A'] } });
    // A→A is symmetric by definition; use a real asymmetry instead.
    expect(problems.some((p) => p.level === 'error' && p.message.includes('not symmetric'))).toBe(
      false,
    );

    const two: Board = {
      ...base,
      locations: [...base.locations, { name: 'B', kingdom: 'north', terrain: 't' }],
      adjacency: { A: ['B'] },
    };
    expect(
      validateBoard(two).some((p) => p.level === 'error' && p.message.includes('not symmetric')),
    ).toBe(true);
  });

  it('flags duplicate names and anchors that name no location', () => {
    const dup: Board = {
      ...base,
      locations: [...base.locations, { name: 'A', kingdom: 'south', terrain: 't' }],
    };
    expect(validateBoard(dup).some((p) => p.message.includes('duplicate location name'))).toBe(
      true,
    );

    const badAnchor: Board = { ...base, anchors: { Nowhere: { hero: { x: 0, y: 0 } } } };
    expect(validateBoard(badAnchor).some((p) => p.message.includes('is not a location'))).toBe(
      true,
    );
  });

  it('warns (not errors) about an uncalibrated board', () => {
    const p = validateBoard(base).find((x) => x.message.includes('not calibrated'));
    expect(p?.level).toBe('warn');
  });

  it('reports no errors for the RtDT preset', () => {
    expect(validateBoard(buildRtdtPreset('x')).filter((p) => p.level === 'error')).toEqual([]);
  });
});
