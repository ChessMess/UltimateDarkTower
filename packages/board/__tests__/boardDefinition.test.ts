import {
  BOARD_LOCATIONS,
  BoardMap2D,
  RTDT_BOARD_DEFINITION,
  boardScaleFactor,
  createDefaultBoardState,
  isBoardCalibrated,
  resolveBoard,
} from '../src/index';
import type { BoardDefinition, BoardState } from '../src/index';

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
    anchors: {
      Emberfall: { building: { x: 0.25, y: 0.25 }, hero: { x: 0.2, y: 0.2 } },
      Coldwatch: { hero: { x: 0.75, y: 0.75 } },
    },
    ...overrides,
  };
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
    expect(Object.keys(state.buildings)).toHaveLength(16);
    expect(state.buildings['Radiant Mountains']).toEqual({ skulls: 0, destroyed: false });
  });

  it("seeds a custom board's building spaces only", () => {
    const state = createDefaultBoardState(customBoard());
    expect(Object.keys(state.buildings)).toEqual(['Emberfall']);
    expect(state.buildings['Emberfall']).toEqual({ skulls: 0, destroyed: false });
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
  it('renders a custom board at its own anchors and viewBox', () => {
    const board = customBoard();
    const state = createDefaultBoardState(board);
    state.heroes = { h1: { location: 'Coldwatch' } };
    const html = render(state, { board, assetBaseUrl: '/t/' });

    // viewBox is the custom image size, not RtDT's 4096².
    expect(html).toContain('viewBox="0 0 2048 2048"');
    // The hero lands on Coldwatch's anchor: 0.75 * 2048 = 1536.
    expect(html).toContain('translate(1536 1536)');
  });

  it('scales token geometry to a NON-SQUARE board by min(w,h)/4096', () => {
    const board = customBoard({
      imageInfo: { width: 4096, height: 1024 },
      anchors: { Coldwatch: { hero: { x: 0.5, y: 0.5 } } },
    });
    const state = createDefaultBoardState(board);
    state.heroes = { h1: { location: 'Coldwatch' } };
    const html = render(state, { board, assetBaseUrl: '/t/' });

    // factor = min(4096,1024)/4096 = 0.25 ⇒ SLOT_SIZE 150 → 37.5. The token has no art, so it
    // draws the fallback disc at size*0.42 = 15.75. Scaling on width alone would give factor 1
    // and a full-size 63 — four times too big for a board only 1024px tall.
    expect(html).toContain('r="15.75"');
    expect(html).toContain('viewBox="0 0 4096 1024"');
  });

  it('uses full-size token geometry on the 4096² reference board', () => {
    const state = createDefaultBoardState();
    state.heroes = { h1: { location: 'Radiant Mountains' } };
    // SLOT_SIZE 150 unscaled ⇒ fallback disc r = 150 * 0.42 = 63.
    expect(render(state, { assetBaseUrl: '/t/' })).toContain('r="63"');
  });

  // THE back-compat proof for the published package: injecting the built-in board explicitly
  // must be indistinguishable from omitting the option, byte for byte.
  it('identity regression — no board option renders identically to RTDT_BOARD_DEFINITION', () => {
    const state = createDefaultBoardState();
    state.heroes = { h1: { location: 'Radiant Mountains' }, h2: { location: 'Broken Lands' } };
    state.foes = { f1: { foe: 'Brigands', location: 'Yellowpike', status: 'ready' } };
    state.buildings['Radiant Mountains'] = { skulls: 3, destroyed: false };
    state.buildings['Duwani'] = { skulls: 0, destroyed: true };
    state.spaceMarkers = { Arkartus: ['wasteland'] };
    state.questMarkers = { Dayside: ['main-goal'] };
    state.adversary = { id: 'the-baron', location: 'Fivepint' };

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
    const state = createDefaultBoardState();
    state.heroes = { h1: { location: 'Radiant Mountains' }, h2: { location: 'Big Sister' } };
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
