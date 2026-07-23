import {
  BOARD_LOCATIONS,
  BoardMap2D,
  RTDT_BOARD_DEFINITION,
  boardScaleFactor,
  createDefaultBoardState,
  isBoardCalibrated,
  resolveBoard,
  resolveSpot,
  spotPxFor,
} from '../src/index';
import type { BoardDefinition, BoardState, PlacedToken } from '../src/index';

/** A small custom board: 2048² (half the RtDT reference), one citadel, one plain space. */
function customBoard(overrides: Partial<BoardDefinition> = {}): BoardDefinition {
  return {
    id: 'shattered-reach',
    name: 'The Shattered Reach',
    imageInfo: {
      width: 2048,
      height: 2048,
      centerX: 0.5,
      centerY: 0.5,
      radius: 0.5,
      northHeadingDegrees: 135,
    },
    locations: [
      { name: 'Emberfall', kingdom: 'north', terrain: 'Ash Flats', building: 'citadel' },
      { name: 'Coldwatch', kingdom: 'north', terrain: 'Tundra' },
    ],
    spots: {
      Emberfall: [
        { id: 'building', at: { x: 0.25, y: 0.25 }, accepts: ['building'] },
        { id: 'skull', at: { x: 0.26, y: 0.26 }, accepts: ['skull'] },
        { id: 'hero', at: { x: 0.2, y: 0.2 }, accepts: ['hero'] },
      ],
      Coldwatch: [{ id: 'hero', at: { x: 0.75, y: 0.75 }, accepts: ['hero'] }],
    },
    ...overrides,
  };
}

function withTokens(state: BoardState, tokens: PlacedToken[]): BoardState {
  const next = { ...state, tokens: { ...state.tokens } };
  for (const token of tokens) next.tokens[token.id] = token;
  return next;
}

function render(
  state: BoardState,
  options: ConstructorParameters<typeof BoardMap2D>[1] = {},
): string {
  const host = document.createElement('div');
  new BoardMap2D(host, options).render(state);
  return host.innerHTML;
}

describe('resolveBoard', () => {
  it('defaults to the built-in RtDT board', () => {
    const resolved = resolveBoard();
    expect(resolved.def.id).toBe('rtdt');
    expect(resolved.def.locations).toHaveLength(BOARD_LOCATIONS.length);
    expect(resolved.locationByName['Broken Lands']?.kingdom).toBe('north');
  });

  it('indexes a custom board by name and collects its building locations', () => {
    const resolved = resolveBoard(customBoard());
    expect(resolved.locationByName['Coldwatch']?.terrain).toBe('Tundra');
    expect(resolved.buildingLocations).toEqual(['Emberfall']);
  });

  it('RtDT has 16 building spaces', () => {
    expect(resolveBoard().buildingLocations).toHaveLength(16);
  });

  it('indexes spots by every type id they accept', () => {
    const resolved = resolveBoard(customBoard());
    expect(resolved.spotsAccepting.get('Emberfall')?.get('building')?.[0]?.id).toBe('building');
    expect(resolved.spotsAccepting.get('Emberfall')?.get('hero')?.[0]?.id).toBe('hero');
  });
});

describe('resolveSpot / spotPxFor', () => {
  it('resolves via accepts when no explicit spotId is given', () => {
    const board = resolveBoard(customBoard());
    expect(resolveSpot(board, 'Emberfall', 'building')?.id).toBe('building');
  });

  it('an explicit spotId wins over the accepts-based match', () => {
    const board = resolveBoard(customBoard());
    expect(resolveSpot(board, 'Emberfall', 'building', 'hero')?.id).toBe('hero');
  });

  it('falls back to a spot whose id literally equals the type id', () => {
    // A hand-authored board that named a spot after a reserved type without listing it in
    // `accepts` — a defensive fallback, not the primary path.
    const board = resolveBoard({
      ...customBoard(),
      spots: { Emberfall: [{ id: 'quest', at: { x: 0.5, y: 0.5 }, accepts: ['marker'] }] },
    });
    expect(resolveSpot(board, 'Emberfall', 'quest')?.id).toBe('quest');
  });

  it('returns undefined when the location has no matching spot', () => {
    const board = resolveBoard(customBoard());
    expect(resolveSpot(board, 'Coldwatch', 'building')).toBeUndefined();
    expect(resolveSpot(board, 'Nowhere', 'hero')).toBeUndefined();
  });

  it('returns undefined when the location has no spots at all (nothing to draw at)', () => {
    const board = resolveBoard({ ...customBoard(), spots: { Emberfall: [] } });
    expect(resolveSpot(board, 'Emberfall', 'hero')).toBeUndefined();
  });

  it('the first spot wins when several accept the same type', () => {
    const board = resolveBoard({
      ...customBoard(),
      spots: {
        Emberfall: [
          { id: 'a', at: { x: 0.1, y: 0.1 }, accepts: ['marker'] },
          { id: 'b', at: { x: 0.2, y: 0.2 }, accepts: ['marker'] },
        ],
      },
    });
    expect(resolveSpot(board, 'Emberfall', 'marker')?.id).toBe('a');
  });

  it('a spot with an empty `accepts` is never selected — not even via the id-equality fallback', () => {
    const board = resolveBoard({
      ...customBoard(),
      spots: { Emberfall: [{ id: 'dead', at: { x: 0.5, y: 0.5 }, accepts: [] }] },
    });
    expect(resolveSpot(board, 'Emberfall', 'dead')).toBeUndefined();
  });

  it('spotPxFor converts the resolved spot to image-space px', () => {
    const board = resolveBoard(customBoard());
    expect(spotPxFor(board, 'Coldwatch', 'hero')).toEqual({ x: 0.75 * 2048, y: 0.75 * 2048 });
  });
});

describe('isBoardCalibrated', () => {
  it('accepts the built-in board (it carries a full circle)', () => {
    expect(isBoardCalibrated(RTDT_BOARD_DEFINITION.imageInfo)).toBe(true);
  });

  it('rejects width/height-only and partially-calibrated boards', () => {
    expect(isBoardCalibrated({ width: 100, height: 100 })).toBe(false);
    expect(isBoardCalibrated({ width: 100, height: 100, centerX: 0.5, centerY: 0.5 })).toBe(false);
    expect(
      isBoardCalibrated({ width: 100, height: 100, centerX: 0.5, centerY: 0.5, radius: 0 }),
    ).toBe(false);
  });

  it('accepts a fully-calibrated custom board', () => {
    expect(isBoardCalibrated(customBoard().imageInfo)).toBe(true);
  });
});

describe('createDefaultBoardState', () => {
  it('seeds RtDT building spaces when no board is passed', () => {
    const state = createDefaultBoardState();
    const buildings = Object.values(state.tokens).filter((t) => t.typeId === 'building');
    expect(buildings).toHaveLength(16);
    expect(state.tokens['Radiant Mountains']).toMatchObject({
      typeId: 'building',
      data: { destroyed: false },
    });
  });

  it("seeds a custom board's building spaces only", () => {
    const state = createDefaultBoardState(customBoard());
    const buildings = Object.values(state.tokens).filter((t) => t.typeId === 'building');
    expect(buildings.map((t) => t.location)).toEqual(['Emberfall']);
    expect(state.tokens['Emberfall'].data).toEqual({ destroyed: false });
    expect(state.tokens['skull:Emberfall'].n).toBe(0);
  });
});

describe('boardScaleFactor', () => {
  it('is exactly 1 for the 4096² reference board', () => {
    expect(boardScaleFactor(RTDT_BOARD_DEFINITION.imageInfo)).toBe(1);
  });

  it('scales by the SHORTER side, so a portrait board keeps tokens in proportion', () => {
    // width/4096 would give 1 here and render tokens 4x oversized against the visible board.
    expect(boardScaleFactor({ width: 4096, height: 1024 })).toBe(0.25);
    expect(boardScaleFactor({ width: 1024, height: 4096 })).toBe(0.25);
  });
});

describe('BoardMap2D board injection', () => {
  it('renders a custom board at its own spots and viewBox', () => {
    const board = customBoard();
    const state = withTokens(createDefaultBoardState(board), [
      { id: 'h1', typeId: 'hero', location: 'Coldwatch' },
    ]);
    const html = render(state, { board, assetBaseUrl: '/t/' });

    // viewBox is the custom image size, not RtDT's 4096².
    expect(html).toContain('viewBox="0 0 2048 2048"');
    // The hero lands on Coldwatch's spot: 0.75 * 2048 = 1536.
    expect(html).toContain('translate(1536 1536)');
  });

  it('scales token geometry to a NON-SQUARE board by min(w,h)/4096', () => {
    const board = customBoard({
      imageInfo: { width: 4096, height: 1024 },
      spots: { Coldwatch: [{ id: 'hero', at: { x: 0.5, y: 0.5 }, accepts: ['hero'] }] },
    });
    const state = withTokens(createDefaultBoardState(board), [
      { id: 'h1', typeId: 'hero', location: 'Coldwatch' },
    ]);
    const html = render(state, { board, assetBaseUrl: '/t/' });

    // factor = min(4096,1024)/4096 = 0.25 ⇒ SLOT_SIZE 150 → 37.5. The token has no art, so it
    // draws the fallback disc at size*0.42 = 15.75. Scaling on width alone would give factor 1
    // and a full-size 63 — four times too big for a board only 1024px tall.
    expect(html).toContain('r="15.75"');
    expect(html).toContain('viewBox="0 0 4096 1024"');
  });

  it('uses full-size token geometry on the 4096² reference board', () => {
    const state = withTokens(createDefaultBoardState(), [
      { id: 'h1', typeId: 'hero', location: 'Radiant Mountains' },
    ]);
    // SLOT_SIZE 150 unscaled ⇒ fallback disc r = 150 * 0.42 = 63.
    expect(render(state, { assetBaseUrl: '/t/' })).toContain('r="63"');
  });

  // THE back-compat proof for the published package: injecting the built-in board explicitly
  // must be indistinguishable from omitting the option, byte for byte.
  it('identity regression — no board option renders identically to RTDT_BOARD_DEFINITION', () => {
    const state = withTokens(createDefaultBoardState(), [
      { id: 'h1', typeId: 'hero', location: 'Radiant Mountains' },
      { id: 'h2', typeId: 'hero', location: 'Broken Lands' },
      {
        id: 'f1',
        typeId: 'foe',
        location: 'Yellowpike',
        art: 'Brigands',
        data: { status: 'ready' },
      },
      {
        id: 'Radiant Mountains',
        typeId: 'building',
        location: 'Radiant Mountains',
        data: { destroyed: false },
      },
      { id: 'skull:Radiant Mountains', typeId: 'skull', location: 'Radiant Mountains', n: 3 },
      { id: 'Duwani', typeId: 'building', location: 'Duwani', data: { destroyed: true } },
      { id: 'marker:Arkartus:wasteland', typeId: 'marker', location: 'Arkartus', art: 'wasteland' },
      { id: 'quest:Dayside:main-goal', typeId: 'quest', location: 'Dayside', art: 'main-goal' },
      { id: 'adversary', typeId: 'adversary', location: 'Fivepint', art: 'the-baron' },
    ]);

    const opts = { assetBaseUrl: '/t/', boardImageUrl: '/board.png' };
    const withoutOption = render(state, opts);
    const withExplicitBoard = render(state, { ...opts, board: RTDT_BOARD_DEFINITION });
    expect(withExplicitBoard).toBe(withoutOption);

    // …and again through a STRUCTURAL CLONE. `resolveBoard` fast-paths the RTDT singleton by
    // identity, so the assertion above alone would not exercise the generic custom-board path.
    // A clone has a different identity, so this proves that path reproduces the built-in board
    // byte for byte — which is what makes the new option safe for existing consumers.
    const clone: BoardDefinition = { ...RTDT_BOARD_DEFINITION, id: 'rtdt-clone' };
    expect(render(state, { ...opts, board: clone })).toBe(withoutOption);
  });

  // A kingdom focus is the case that actually reads the resolved location INDEX (it drives both
  // the focus viewBox and per-token dimming), so this is where an injected board is compared
  // against the default — including through a structural clone, which bypasses `resolveBoard`'s
  // identity fast-path and therefore exercises the generic index-building path end to end.
  it('identity regression holds under a kingdom focus (viewBox + dimming), incl. via a clone', () => {
    const state = withTokens(createDefaultBoardState(), [
      { id: 'h1', typeId: 'hero', location: 'Radiant Mountains' },
      { id: 'h2', typeId: 'hero', location: 'Big Sister' },
    ]);
    const focus = { kingdom: 'north', angle: 'top' } as const;

    const renderFocused = (board?: BoardDefinition): string => {
      const host = document.createElement('div');
      new BoardMap2D(host, { assetBaseUrl: '/t/', board }).render(state, focus);
      return host.innerHTML;
    };

    const baseline = renderFocused();
    expect(renderFocused(RTDT_BOARD_DEFINITION)).toBe(baseline);
    expect(renderFocused({ ...RTDT_BOARD_DEFINITION, id: 'rtdt-clone' })).toBe(baseline);
  });
});
