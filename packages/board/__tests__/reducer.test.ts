import { createDefaultBoardState, applyBoardCommand } from '../src/index';
import type { BoardState } from '../src/index';

const BUILDING = 'Dayside'; // a real building location
const GENERIC = 'Broken Lands'; // a real non-building location

describe('createDefaultBoardState', () => {
  it('seeds a building + skull token pair for all 16 building spaces and nothing else', () => {
    const s = createDefaultBoardState();
    const ids = Object.keys(s.tokens);
    expect(ids).toHaveLength(32); // 16 building + 16 skull

    const buildings = Object.values(s.tokens).filter((t) => t.typeId === 'building');
    const skulls = Object.values(s.tokens).filter((t) => t.typeId === 'skull');
    expect(buildings).toHaveLength(16);
    expect(skulls).toHaveLength(16);
    for (const b of buildings) expect(b.data).toEqual({ destroyed: false });
    for (const sk of skulls) expect(sk.n).toBe(0);

    expect(s.selections).toBeUndefined();
    expect(s.meta).toBeUndefined();
  });

  it('the building token is keyed by location, the skull token by `skull:{location}`', () => {
    const s = createDefaultBoardState();
    expect(s.tokens[BUILDING]).toMatchObject({ typeId: 'building', location: BUILDING });
    expect(s.tokens[`skull:${BUILDING}`]).toMatchObject({
      typeId: 'skull',
      location: BUILDING,
      n: 0,
    });
  });
});

describe('reducer — placeToken', () => {
  it('adds an entry without mutating the input; the fields carried are exactly what was given', () => {
    const s0 = createDefaultBoardState();
    const s1 = applyBoardCommand(s0, {
      type: 'placeToken',
      id: 'h1',
      typeId: 'hero',
      location: GENERIC,
      art: 'h1',
      data: { owner: 'north' },
    });
    expect(s1).not.toBe(s0);
    expect(s0.tokens.h1).toBeUndefined();
    expect(s1.tokens.h1).toEqual({
      id: 'h1',
      typeId: 'hero',
      location: GENERIC,
      art: 'h1',
      data: { owner: 'north' },
    });
  });

  it('upserts — placing an existing id overwrites it wholesale (no field merge)', () => {
    let s = applyBoardCommand(createDefaultBoardState(), {
      type: 'placeToken',
      id: 't1',
      typeId: 'foe',
      location: GENERIC,
      art: 'Brigands',
      data: { status: 'ready' },
    });
    s = applyBoardCommand(s, { type: 'placeToken', id: 't1', typeId: 'foe', location: BUILDING });
    expect(s.tokens.t1).toEqual({ id: 't1', typeId: 'foe', location: BUILDING });
  });
});

describe('reducer — moveToken', () => {
  it('updates location; unknown id is a no-op (same reference)', () => {
    const s1 = applyBoardCommand(createDefaultBoardState(), {
      type: 'placeToken',
      id: 'h1',
      typeId: 'hero',
      location: GENERIC,
    });
    const s2 = applyBoardCommand(s1, { type: 'moveToken', id: 'h1', location: BUILDING });
    expect(s2.tokens.h1.location).toBe(BUILDING);

    const s3 = applyBoardCommand(s2, { type: 'moveToken', id: 'nope', location: GENERIC });
    expect(s3).toBe(s2);
  });

  it('drops an explicit spotId on move (it is location-scoped)', () => {
    const s1 = applyBoardCommand(createDefaultBoardState(), {
      type: 'placeToken',
      id: 'h1',
      typeId: 'hero',
      location: GENERIC,
      spotId: 'hero',
    });
    const s2 = applyBoardCommand(s1, { type: 'moveToken', id: 'h1', location: BUILDING });
    expect(s2.tokens.h1.spotId).toBeUndefined();
  });
});

describe('reducer — removeToken', () => {
  it('deletes the key; unknown id is a no-op (same reference)', () => {
    const s1 = applyBoardCommand(createDefaultBoardState(), {
      type: 'placeToken',
      id: 'h1',
      typeId: 'hero',
      location: GENERIC,
    });
    const s2 = applyBoardCommand(s1, { type: 'removeToken', id: 'h1' });
    expect(s2.tokens.h1).toBeUndefined();
    expect(s1.tokens.h1).toBeDefined(); // input unchanged

    const s3 = applyBoardCommand(s2, { type: 'removeToken', id: 'nope' });
    expect(s3).toBe(s2);
  });
});

describe('reducer — updateToken', () => {
  it('shallow-merges `data`, replaces other patched fields; unknown id is a no-op', () => {
    const s1 = applyBoardCommand(createDefaultBoardState(), {
      type: 'placeToken',
      id: 'f1',
      typeId: 'foe',
      location: GENERIC,
      art: 'Brigands',
      data: { status: 'ready', wounded: false },
    });
    const s2 = applyBoardCommand(s1, {
      type: 'updateToken',
      id: 'f1',
      patch: { data: { status: 'savage' } },
    });
    expect(s2.tokens.f1.data).toEqual({ status: 'savage', wounded: false });

    const s3 = applyBoardCommand(s2, { type: 'updateToken', id: 'f1', patch: { n: 3 } });
    expect(s3.tokens.f1.n).toBe(3);
    expect(s3.tokens.f1.data).toEqual({ status: 'savage', wounded: false }); // untouched

    const s4 = applyBoardCommand(s3, { type: 'updateToken', id: 'nope', patch: { n: 1 } });
    expect(s4).toBe(s3);
  });

  it('a skull token: addSkull-style arithmetic composed by the caller is not clamped by the reducer', () => {
    // The reducer itself performs no arithmetic — `updateToken` writes exactly what it's given.
    // Clamping (removeSkull floors at 0) is the controller's job; see controller.test.ts.
    const s = applyBoardCommand(createDefaultBoardState(), {
      type: 'updateToken',
      id: `skull:${BUILDING}`,
      patch: { n: -5 },
    });
    expect(s.tokens[`skull:${BUILDING}`].n).toBe(-5);
  });
});

describe('reducer — unknown location', () => {
  it('a command targeting an unknown location still applies (stores it) and only warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const s = applyBoardCommand(createDefaultBoardState(), {
      type: 'placeToken',
      id: 't1',
      typeId: 'marker',
      location: 'Nowhere Real',
    });
    expect(s.tokens.t1.location).toBe('Nowhere Real');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Nowhere Real'));
    warn.mockRestore();
  });
});

describe('reducer — selections / replace / reset', () => {
  it('setSelections shallow-merges', () => {
    let s = applyBoardCommand(createDefaultBoardState(), {
      type: 'setSelections',
      selections: { difficulty: 'Heroic', allies: ['a1'] },
    });
    s = applyBoardCommand(s, { type: 'setSelections', selections: { difficulty: 'Gritty' } });
    expect(s.selections).toEqual({ difficulty: 'Gritty', allies: ['a1'] });
  });

  it('replaceState returns the given state; reset returns a fresh default', () => {
    const replacement: BoardState = {
      tokens: { x: { id: 'x', typeId: 'hero', location: GENERIC } },
    };
    expect(
      applyBoardCommand(createDefaultBoardState(), { type: 'replaceState', state: replacement }),
    ).toBe(replacement);

    const reset = applyBoardCommand(replacement, { type: 'reset' });
    expect(reset).toEqual(createDefaultBoardState());
  });
});
