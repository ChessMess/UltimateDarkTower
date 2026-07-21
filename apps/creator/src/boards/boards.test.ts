import { describe, it, expect, beforeEach } from 'vitest';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { scenarioSchema } from '@udtc/schema';
import { BUILTIN_BOARD_IMAGE_REF } from '@udtc/adapters';
import { useCreatorStore } from '../store';
import { buildRtdtPreset } from './presetRtdt';
import {
  BUILTIN_BOARD_ART_URL,
  NO_BUILDING,
  activeBoardId,
  boardsOf,
  clientToNormalized,
  hasAnchorSlot,
  hasStoredArt,
  isPlaced,
  locationsInScope,
  pruneToLocations,
  removeLocationsInScope,
  resolveBoardArt,
  scopeChoices,
  suggestAdjacency,
  bfsDistance,
  terrainChoices,
  unplacedLocations,
  validateBoard,
  viewportFit,
} from './shared';
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

  it('REFERENCES the built-in art rather than embedding it (4096²/22 MB of board image)', () => {
    expect(buildRtdtPreset('rtdt-copy').imageRef).toBe(BUILTIN_BOARD_IMAGE_REF);
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

describe('resolveBoardArt / hasStoredArt', () => {
  /** A doc carrying one stored board image. */
  function docWithArt(): ScenarioDoc {
    const doc = scaffold() as unknown as Record<string, unknown>;
    doc.library = {
      ...(doc.library as Record<string, unknown>),
      resources: { images: { 'board-custom': 'data:image/webp;base64,AAAA' } },
    };
    return doc as unknown as ScenarioDoc;
  }

  it('resolves the built-in ref to this app’s backdrop, with no bytes in the document', () => {
    const preset = buildRtdtPreset('rtdt-copy');
    expect(resolveBoardArt(scaffold(), preset)).toBe(BUILTIN_BOARD_ART_URL);
    expect(hasStoredArt(scaffold(), preset)).toBe(false);
  });

  it('prefers stored art — an upload overwrites the built-in ref', () => {
    const doc = docWithArt();
    const board: Board = { ...buildRtdtPreset('custom'), imageRef: 'board-custom' };
    expect(resolveBoardArt(doc, board)).toBe('data:image/webp;base64,AAAA');
    expect(hasStoredArt(doc, board)).toBe(true);
  });

  it('leaves an art-less board blank (a bare custom board renders on nothing)', () => {
    const board: Board = { ...buildRtdtPreset('bare'), imageRef: undefined };
    expect(resolveBoardArt(scaffold(), board)).toBeUndefined();
    expect(hasStoredArt(scaffold(), board)).toBe(false);
  });

  it('treats a dangling ref as blank rather than falling back to the built-in art', () => {
    const board: Board = { ...buildRtdtPreset('dangling'), imageRef: 'board-missing' };
    expect(resolveBoardArt(scaffold(), board)).toBeUndefined();
  });
});

describe('bulk location removal', () => {
  /** Four locations spanning two kingdoms, two terrains, one citadel and one building-less. */
  function mixed(): Board {
    return {
      id: 'mixed',
      name: 'Mixed',
      imageInfo: { width: 100, height: 100 },
      locations: [
        { name: 'A', kingdom: 'north', terrain: 'Hills', building: 'citadel' },
        { name: 'B', kingdom: 'north', terrain: 'Lake' },
        { name: 'C', kingdom: 'south', terrain: 'Hills', building: 'bazaar' },
        { name: 'D', kingdom: 'south', terrain: 'Hills' },
      ],
      anchors: {
        A: { hero: { x: 0.1, y: 0.1 } },
        B: { hero: { x: 0.2, y: 0.2 } },
        C: { hero: { x: 0.3, y: 0.3 } },
        D: { hero: { x: 0.4, y: 0.4 } },
      },
      adjacency: { A: ['B', 'C'], B: ['A'], C: ['A', 'D'], D: ['C'] },
    };
  }

  it('scopes by kingdom, terrain, building — and "no building" is its own choice', () => {
    const b = mixed();
    const names = (s: Parameters<typeof locationsInScope>[1]) =>
      locationsInScope(b, s).map((l) => l.name);
    expect(names({ kind: 'all' })).toEqual(['A', 'B', 'C', 'D']);
    expect(names({ kind: 'kingdom', value: 'north' })).toEqual(['A', 'B']);
    expect(names({ kind: 'terrain', value: 'Hills' })).toEqual(['A', 'C', 'D']);
    expect(names({ kind: 'building', value: 'citadel' })).toEqual(['A']);
    expect(names({ kind: 'building', value: NO_BUILDING })).toEqual(['B', 'D']);
  });

  it('offers only values the board actually has, with counts and canonical order', () => {
    const b = mixed();
    expect(scopeChoices(b, 'kingdom')).toEqual([
      { value: 'north', n: 2 },
      { value: 'south', n: 2 },
    ]);
    // BUILDING_TYPES order, which is A-Z — and (none) always last, however it sorts.
    expect(scopeChoices(b, 'building')).toEqual([
      { value: 'bazaar', n: 1 },
      { value: 'citadel', n: 1 },
      { value: NO_BUILDING, n: 2 },
    ]);
    expect(scopeChoices(b, 'terrain')).toEqual([
      { value: 'Hills', n: 3 },
      { value: 'Lake', n: 1 },
    ]);
  });

  it('drops the removed locations AND every anchor/adjacency edge touching them', () => {
    const next = removeLocationsInScope(mixed(), { kind: 'kingdom', value: 'north' });
    expect(next.locations.map((l) => l.name)).toEqual(['C', 'D']);
    expect(Object.keys(next.anchors ?? {})).toEqual(['C', 'D']);
    // C listed A (now gone) and D (still here) — the dangling half of the edge is pruned.
    expect(next.adjacency).toEqual({ C: ['D'], D: ['C'] });
  });

  it('leaves a board that still validates — no dangling refs to removed locations', () => {
    const next = removeLocationsInScope(mixed(), { kind: 'terrain', value: 'Hills' });
    const errors = validateBoard(next).filter((p) => p.level === 'error');
    expect(errors).toEqual([]);
    expect(next.locations.map((l) => l.name)).toEqual(['B']);
    expect(next.adjacency).toEqual({});
  });

  it('removing everything empties the board without stranding anchors', () => {
    const next = removeLocationsInScope(mixed(), { kind: 'all' });
    expect(next.locations).toEqual([]);
    expect(next.anchors).toEqual({});
    expect(next.adjacency).toEqual({});
  });

  it('pruneToLocations keeps a duplicated name’s anchors while one row still carries it', () => {
    const b = mixed();
    b.locations.push({ name: 'A', kingdom: 'west', terrain: 'Desert' });
    // Remove the FIRST 'A' row; the duplicate survives, so 'A' keeps its anchors and edges.
    const next = pruneToLocations(
      b,
      b.locations.filter((_, i) => i !== 0),
    );
    expect(next.anchors?.A).toEqual({ hero: { x: 0.1, y: 0.1 } });
    expect(next.adjacency?.A).toEqual(['B', 'C']);
  });

  it('the RtDT preset survives a kingdom purge with 45 of its 60 locations', () => {
    const next = removeLocationsInScope(buildRtdtPreset('rtdt-copy'), {
      kind: 'kingdom',
      value: 'north',
    });
    expect(next.locations).toHaveLength(45);
    expect(next.locations.every((l) => l.kingdom !== 'north')).toBe(true);
    const names = new Set(next.locations.map((l) => l.name));
    for (const [from, tos] of Object.entries(next.adjacency ?? {})) {
      expect(names.has(from)).toBe(true);
      for (const to of tos) expect(names.has(to)).toBe(true);
    }
  });

  describe('isPlaced / unplacedLocations', () => {
    it('a location is placed once ANY slot has a point', () => {
      const b = mixed();
      b.anchors = { A: { skull: { x: 0.5, y: 0.5 } } };
      expect(isPlaced(b, 'A')).toBe(true);
      expect(unplacedLocations(b).map((l) => l.name)).toEqual(['B', 'C', 'D']);
    });

    it('an EMPTY anchors entry is not placed — the row exists but sits nowhere', () => {
      const b = mixed();
      b.anchors = { A: {} };
      expect(isPlaced(b, 'A')).toBe(false);
      expect(unplacedLocations(b)).toHaveLength(4);
    });

    it('a freshly added location is unplaced; the RtDT preset is fully placed', () => {
      const b = mixed();
      b.locations.push({ name: 'New', kingdom: 'west', terrain: 'Desert' });
      expect(isPlaced(b, 'New')).toBe(false);
      expect(unplacedLocations(b).map((l) => l.name)).toEqual(['New']);
      expect(unplacedLocations(buildRtdtPreset('rtdt-copy'))).toEqual([]);
    });

    it('removing a location leaves the survivors placed (prune drops only its own anchors)', () => {
      const next = removeLocationsInScope(mixed(), { kind: 'kingdom', value: 'north' });
      expect(unplacedLocations(next)).toEqual([]);
    });
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

// The canvas is `preserveAspectRatio="xMidYMid meet"`, so the viewBox is uniformly scaled and
// CENTRED — leaving letterbox bands the old rect-relative maths ignored, which threw placement
// off by up to ~85px. Ground truth below is computed by hand from the fit, not from the
// implementation: a square 4096 board in an 880x650 pane fits by HEIGHT (scale 650/4096), so the
// drawn art is 650x650 with 115px of dead space either side and none top/bottom.
describe('viewportFit / clientToNormalized', () => {
  const IMAGE = { width: 4096, height: 4096 };
  const LANDSCAPE = { left: 0, top: 0, width: 880, height: 650 };
  const FULL = { x: 0, y: 0, w: 4096, h: 4096 };

  describe('viewportFit', () => {
    it('fits a square viewBox by the short axis and centres the slack', () => {
      const fit = viewportFit(LANDSCAPE, 4096, 4096);
      expect(fit.scale).toBeCloseTo(650 / 4096, 10);
      expect(fit.padX).toBeCloseTo(115, 10);
      expect(fit.padY).toBe(0);
    });

    it('transposes for a portrait pane', () => {
      const fit = viewportFit({ width: 650, height: 880 }, 4096, 4096);
      expect(fit.scale).toBeCloseTo(650 / 4096, 10);
      expect(fit.padX).toBe(0);
      expect(fit.padY).toBeCloseTo(115, 10);
    });

    it('leaves no pads when the aspects already agree', () => {
      const fit = viewportFit({ width: 650, height: 650 }, 4096, 4096);
      expect(fit.padX).toBe(0);
      expect(fit.padY).toBe(0);
    });

    it('degrades to the identity for a zero-size rect (jsdom / hidden element) — never NaN', () => {
      expect(viewportFit({ width: 0, height: 0 }, 4096, 4096)).toEqual({
        scale: 1,
        padX: 0,
        padY: 0,
      });
      expect(viewportFit(LANDSCAPE, 0, 0)).toEqual({ scale: 1, padX: 0, padY: 0 });
    });
  });

  describe('clientToNormalized', () => {
    const at = (x: number, y: number, view = FULL, rect = LANDSCAPE) =>
      clientToNormalized({ x, y }, rect, view, IMAGE);

    it('maps the pane centre to the image centre', () => {
      const p = at(440, 325);
      expect(p.x).toBeCloseTo(0.5, 10);
      expect(p.y).toBeCloseTo(0.5, 10);
    });

    it('maps the drawn art’s edges to 0 and 1 — the case the old maths got wrong', () => {
      expect(at(115, 0).x).toBeCloseTo(0, 10); // left edge of the art, 115px in
      expect(at(765, 0).x).toBeCloseTo(1, 10); // right edge
      expect(at(440, 0).y).toBeCloseTo(0, 10); // no vertical letterbox here
      expect(at(440, 650).y).toBeCloseTo(1, 10);
    });

    it('clamps a click in the letterbox band instead of going out of range', () => {
      expect(at(50, 325).x).toBe(0); // left dead zone
      expect(at(870, 325).x).toBe(1); // right dead zone
    });

    it('honours pan + zoom: a view window centred on the image still reads 0.5', () => {
      const p = at(440, 325, { x: 1024, y: 1024, w: 2048, h: 2048 });
      expect(p.x).toBeCloseTo(0.5, 10);
      expect(p.y).toBeCloseTo(0.5, 10);
    });

    it('places a zoomed view’s top-left corner at its pan origin', () => {
      const p = at(115, 0, { x: 1024, y: 1024, w: 2048, h: 2048 });
      expect(p.x).toBeCloseTo(0.25, 10); // 1024 / 4096
      expect(p.y).toBeCloseTo(0.25, 10);
    });

    it('REGRESSION: the old rect-relative formula disagrees at the edges, agrees at the centre', () => {
      // What BoardMapCanvas used to do — no letterbox term at all.
      const old = (clientX: number) => ((clientX - LANDSCAPE.left) / LANDSCAPE.width) * FULL.w;
      const scale = 650 / 4096;

      expect(old(440) / IMAGE.width).toBeCloseTo(at(440, 325).x, 10);
      // At the art's left edge the old maths is off by ~85 screen px.
      const errPx = (old(115) - at(115, 325).x * IMAGE.width) * scale;
      expect(errPx).toBeGreaterThan(80);
      expect(errPx).toBeLessThan(90);
    });
  });
});

describe('terrainChoices', () => {
  const withTerrains = (...terrains: string[]): Board => ({
    id: 'b',
    name: 'B',
    imageInfo: { width: 100, height: 100 },
    locations: terrains.map((terrain, i) => ({
      name: `L${i}`,
      kingdom: 'north' as const,
      terrain,
    })),
  });

  it('always offers RtDT’s six, A-Z', () => {
    expect(terrainChoices(withTerrains())).toEqual([
      'Desert',
      'Forest',
      'Grasslands',
      'Hills',
      'Lake',
      'Mountains',
    ]);
  });

  it('merges the board’s own terrains into the same A-Z list, deduplicated', () => {
    const choices = terrainChoices(withTerrains('Hills', 'Swamp', 'Ashlands', 'Swamp', 'Forest'));
    expect(choices).toEqual([
      'Ashlands',
      'Desert',
      'Forest',
      'Grasslands',
      'Hills',
      'Lake',
      'Mountains',
      'Swamp',
    ]);
  });

  it('ignores blank terrains rather than offering an empty option', () => {
    expect(terrainChoices(withTerrains('', '   '))).toHaveLength(6);
  });

  it('covers every terrain the RtDT preset uses, so no row falls off the list', () => {
    const preset = buildRtdtPreset('rtdt-copy');
    const choices = new Set(terrainChoices(preset));
    for (const loc of preset.locations) expect(choices.has(loc.terrain)).toBe(true);
  });
});

describe('hasAnchorSlot', () => {
  const board: Board = {
    id: 'b',
    name: 'B',
    imageInfo: { width: 100, height: 100 },
    locations: [{ name: 'A', kingdom: 'north', terrain: 'Hills' }],
    anchors: { A: { hero: { x: 0.1, y: 0.1 } }, B: {} },
  };

  it('is true only for a slot that carries a point', () => {
    expect(hasAnchorSlot(board, 'A', 'hero')).toBe(true);
    expect(hasAnchorSlot(board, 'A', 'foe')).toBe(false);
    expect(hasAnchorSlot(board, 'B', 'hero')).toBe(false); // empty anchors entry
    expect(hasAnchorSlot(board, 'Nowhere', 'hero')).toBe(false);
  });
});
