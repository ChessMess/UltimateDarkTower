import { describe, it, expect } from 'vitest';
import {
  resolveActiveBoardDef,
  boardDefFromLibrary,
  validateRefs,
  isBuiltinBoardImageRef,
  BUILTIN_BOARD_IMAGE_REF,
} from '../src/index';

const BOARD = {
  id: 'shattered-reach',
  name: 'The Shattered Reach',
  imageRef: 'board-shattered-reach',
  imageInfo: { width: 2048, height: 2048 },
  locations: [
    { name: 'Emberfall', kingdom: 'north', terrain: 'Ash Flats', building: 'citadel' },
    { name: 'Coldwatch', kingdom: 'north', terrain: 'Tundra' },
  ],
  spots: { Emberfall: [{ id: 'hero', at: { x: 0.2, y: 0.2 }, accepts: ['hero'] }] },
  adjacency: { Emberfall: ['Coldwatch'], Coldwatch: ['Emberfall'] },
};

/** A scenario shell that is only as complete as these tests need. */
function scenario(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: '0.5.0',
    setup: { board: { boardRef: 'shattered-reach' } },
    library: { boards: { 'shattered-reach': BOARD } },
    graph: { nodes: [] },
    ...over,
  };
}

describe('resolveActiveBoardDef', () => {
  it('resolves an authored boardRef to its definition', () => {
    const active = resolveActiveBoardDef(scenario());
    expect(active).not.toBeNull();
    expect(active?.boardId).toBe('shattered-reach');
    expect(active?.imageRef).toBe('board-shattered-reach');
    expect(active?.def.locations.map((l) => l.name)).toEqual(['Emberfall', 'Coldwatch']);
  });

  it('returns null for the implicit RtDT board (boardStateRef / boardState branches)', () => {
    expect(
      resolveActiveBoardDef(scenario({ setup: { board: { boardStateRef: 'board-main' } } })),
    ).toBeNull();
    expect(
      resolveActiveBoardDef(scenario({ setup: { board: { boardState: { home: {} } } } })),
    ).toBeNull();
  });

  it('returns null (not a throw) for a DANGLING boardRef — L2 reports it separately', () => {
    const doc = scenario({ library: { boards: {} } });
    expect(resolveActiveBoardDef(doc)).toBeNull();
  });

  it('returns null for junk input', () => {
    expect(resolveActiveBoardDef(null)).toBeNull();
    expect(resolveActiveBoardDef({})).toBeNull();
    expect(resolveActiveBoardDef({ setup: {} })).toBeNull();
  });
});

describe('isBuiltinBoardImageRef', () => {
  it('matches only the sentinel — a stored key and no ref are both "not built-in"', () => {
    expect(isBuiltinBoardImageRef(BUILTIN_BOARD_IMAGE_REF)).toBe(true);
    expect(isBuiltinBoardImageRef(BOARD.imageRef)).toBe(false); // 'board-shattered-reach'
    expect(isBuiltinBoardImageRef(undefined)).toBe(false);
    expect(isBuiltinBoardImageRef('')).toBe(false);
  });

  it('surfaces the sentinel through resolveActiveBoardDef unchanged', () => {
    const board = { ...BOARD, imageRef: BUILTIN_BOARD_IMAGE_REF };
    const doc = scenario({ library: { boards: { 'shattered-reach': board } } });
    const active = resolveActiveBoardDef(doc);
    expect(active?.imageRef).toBe(BUILTIN_BOARD_IMAGE_REF);
    expect(isBuiltinBoardImageRef(active?.imageRef)).toBe(true);
  });
});

describe('boardDefFromLibrary', () => {
  it('falls back to the registry key when the entry has no id', () => {
    const def = boardDefFromLibrary('my-key', { ...BOARD, id: undefined });
    expect(def?.id).toBe('my-key');
  });

  it('rejects entries missing imageInfo or locations', () => {
    expect(boardDefFromLibrary('x', { imageInfo: { width: 1, height: 1 } })).toBeNull();
    expect(boardDefFromLibrary('x', { locations: [] })).toBeNull();
    expect(boardDefFromLibrary('x', 'nope')).toBeNull();
  });

  it('defaults spots to an empty map so consumers can index it safely', () => {
    const def = boardDefFromLibrary('x', { ...BOARD, spots: undefined });
    expect(def?.spots).toEqual({});
  });
});

describe('validateRefs — board vocabulary', () => {
  // lifecycle.boardSetup is the node whose `spawns[]` resolve foeId + location (validate-refs
  // also checks a foe.spawn EFFECT; both go through the same checkSpawn).
  const spawnNode = (location: string) => ({
    id: 'n1',
    kind: 'lifecycle.boardSetup',
    props: { spawns: [{ foeId: 'brigands', location }] },
  });

  it("accepts a spawn at the CUSTOM board's location", () => {
    const doc = scenario({ graph: { nodes: [spawnNode('Emberfall')] } });
    const res = validateRefs(doc);
    expect(res.errors.filter((e) => e.includes('Emberfall'))).toEqual([]);
  });

  it('rejects an RtDT location once a custom board is active, naming the board as the source', () => {
    const doc = scenario({ graph: { nodes: [spawnNode('Broken Lands')] } });
    const res = validateRefs(doc);
    const err = res.errors.find((e) => e.includes('Broken Lands'));
    expect(err).toContain('library.boards.shattered-reach');
  });

  it('still validates against the UDT roster when no custom board is active', () => {
    const doc = scenario({
      setup: { board: { boardStateRef: 'board-main' } },
      library: {},
      graph: { nodes: [spawnNode('Broken Lands')] },
    });
    expect(validateRefs(doc).errors.filter((e) => e.includes('Broken Lands'))).toEqual([]);

    const bad = scenario({
      setup: { board: { boardStateRef: 'board-main' } },
      library: {},
      graph: { nodes: [spawnNode('Emberfall')] },
    });
    expect(validateRefs(bad).errors.find((e) => e.includes('Emberfall'))).toContain(
      'UDT BOARD_LOCATIONS',
    );
  });

  it('flags a dangling boardRef', () => {
    const doc = scenario({ library: { boards: {} } });
    expect(validateRefs(doc).errors).toContain(
      'setup.board.boardRef "shattered-reach" is not a key in library.boards',
    );
  });
});

describe('validateRefs — per-board integrity', () => {
  const withBoard = (patch: Record<string, unknown>) =>
    scenario({ library: { boards: { 'shattered-reach': { ...BOARD, ...patch } } } });

  it('accepts a well-formed board', () => {
    expect(validateRefs(scenario()).errors).toEqual([]);
  });

  it('flags duplicate location names', () => {
    const doc = withBoard({
      locations: [...BOARD.locations, { name: 'Emberfall', kingdom: 'south', terrain: 'Bog' }],
    });
    expect(validateRefs(doc).errors).toContain(
      'board "shattered-reach" has duplicate location name "Emberfall"',
    );
  });

  it('flags spots keyed to a non-location', () => {
    const doc = withBoard({
      spots: { Nowhere: [{ id: 'hero', at: { x: 0.1, y: 0.1 }, accepts: ['hero'] }] },
    });
    expect(validateRefs(doc).errors).toContain(
      'board "shattered-reach" spots key "Nowhere" is not a location on that board',
    );
  });

  it('flags duplicate spot ids within a location', () => {
    const doc = withBoard({
      spots: {
        Emberfall: [
          { id: 'hero', at: { x: 0.1, y: 0.1 }, accepts: ['hero'] },
          { id: 'hero', at: { x: 0.2, y: 0.2 }, accepts: ['foe'] },
        ],
      },
    });
    expect(validateRefs(doc).errors).toContain(
      'board "shattered-reach" location "Emberfall" has duplicate spot id "hero"',
    );
  });

  it('flags adjacency pointing off-board', () => {
    const doc = withBoard({ adjacency: { Emberfall: ['Atlantis'] } });
    expect(validateRefs(doc).errors.some((e) => e.includes('"Emberfall" → "Atlantis"'))).toBe(true);
  });

  it('flags ASYMMETRIC adjacency', () => {
    const doc = withBoard({ adjacency: { Emberfall: ['Coldwatch'] } }); // no reverse edge
    expect(
      validateRefs(doc).errors.some(
        (e) => e.includes('not symmetric') && e.includes('Emberfall') && e.includes('Coldwatch'),
      ),
    ).toBe(true);
  });

  it('checks EVERY authored board, not just the active one', () => {
    const doc = scenario({
      library: {
        boards: {
          'shattered-reach': BOARD,
          spare: { ...BOARD, id: 'spare', adjacency: { Emberfall: ['Coldwatch'] } },
        },
      },
    });
    expect(validateRefs(doc).errors.some((e) => e.includes('board "spare"'))).toBe(true);
  });
});

// Schema 0.4.7 opened `library.buildingTypes` into a registry, so L1's enum no longer guarantees
// a location's `building` means anything — L2 resolves it, exactly like every other typed ref.
describe('validateRefs — a location building must resolve to a building type', () => {
  /** A scenario whose board uses `building`, with an explicit buildingTypes registry.
   *  Adjacency is dropped along with the second location so only building errors can surface. */
  const withTypes = (
    buildingTypes: Record<string, unknown> | undefined,
    locationBuilding = 'citadel',
  ) =>
    scenario({
      library: {
        boards: {
          'shattered-reach': {
            ...BOARD,
            locations: [{ ...BOARD.locations[0], building: locationBuilding }],
            adjacency: {},
          },
        },
        ...(buildingTypes ? { buildingTypes } : {}),
      },
    });

  it('accepts a building naming an authored type', () => {
    expect(validateRefs(withTypes({ citadel: { free: [] } })).errors).toEqual([]);
  });

  it('accepts a CUSTOM type — the whole point of the open registry', () => {
    const doc = withTypes({ watchtower: { name: 'Watchtower', free: [] } }, 'watchtower');
    expect(validateRefs(doc).errors).toEqual([]);
  });

  it('flags a building that names no type in the registry', () => {
    const doc = withTypes({ citadel: { free: [] } }, 'watchtower');
    expect(validateRefs(doc).errors).toContain(
      'board "shattered-reach" location "Emberfall" building "watchtower" is not a key in library.buildingTypes',
    );
  });

  it('matches case-insensitively, like the engine does', () => {
    const doc = withTypes({ watchtower: { free: [] } }, 'Watchtower');
    expect(validateRefs(doc).errors).toEqual([]);
  });

  it('SKIPS the check entirely when no registry is authored', () => {
    // Pre-0.4.7 documents without a buildingTypes map loaded fine at L2 (they fault at play
    // instead); turning that into a load-time error would reject documents that used to work.
    expect(validateRefs(withTypes(undefined, 'watchtower')).errors).toEqual([]);
  });

  it('treats an EMPTY registry as unauthored, matching the editor', () => {
    // `{}` is authored-but-empty. Failing it here would contradict the Creator, whose
    // `buildingTypesOf` returns `{}` for an absent map and so reports no problem at all — the
    // export would reject a board the Problems panel called clean.
    expect(validateRefs(withTypes({}, 'watchtower')).errors).toEqual([]);
  });
});

// Schema 0.5.0: a board spot's `accepts` list names either a reserved built-in type or a
// library.tokenTypes key — gated exactly like the buildingTypes check above.
describe('validateRefs — a spot accepts entry must resolve to a reserved id or a tokenType', () => {
  const withAccepts = (accepts: string[], tokenTypes?: Record<string, unknown>) =>
    scenario({
      library: {
        boards: {
          'shattered-reach': {
            ...BOARD,
            spots: { Emberfall: [{ id: 'marker', at: { x: 0.1, y: 0.1 }, accepts }] },
          },
        },
        ...(tokenTypes ? { tokenTypes } : {}),
      },
    });

  it('accepts every reserved built-in type with no registry authored', () => {
    expect(
      validateRefs(
        withAccepts([
          'hero',
          'foe',
          'adversary',
          'building',
          'skull',
          'monument',
          'marker',
          'quest',
        ]),
      ).errors,
    ).toEqual([]);
  });

  it('accepts a CUSTOM type that IS in the registry', () => {
    const doc = withAccepts(['trap'], { trap: { id: 'trap', name: 'Trap' } });
    expect(validateRefs(doc).errors).toEqual([]);
  });

  it('flags a custom type that names no entry in the registry', () => {
    const doc = withAccepts(['trap'], { snare: { id: 'snare', name: 'Snare' } });
    expect(validateRefs(doc).errors).toContain(
      'board "shattered-reach" location "Emberfall" spot "marker" accepts unknown type "trap" (not a reserved type or a key in library.tokenTypes)',
    );
  });

  it('SKIPS the check entirely when no tokenTypes registry is authored (matches buildingTypes gating)', () => {
    expect(validateRefs(withAccepts(['trap'])).errors).toEqual([]);
  });

  it('treats an EMPTY registry as unauthored too', () => {
    expect(validateRefs(withAccepts(['trap'], {})).errors).toEqual([]);
  });
});
