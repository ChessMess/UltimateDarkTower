import { BoardReadout, createDefaultBoardState } from '../src/index';
import type { BoardState } from '../src/index';

describe('BoardReadout', () => {
  it('matches the default-state readout', () => {
    expect(BoardReadout.toText(createDefaultBoardState())).toMatchSnapshot();
  });

  it('matches a populated readout', () => {
    const s: BoardState = {
      heroes: { h2: { location: 'Dayside' }, h1: { location: 'Broken Lands', owner: 'north' } },
      foes: { f1: { foe: 'Brigands', location: 'Dayside', status: 'lethal' } },
      adversary: { id: 'utuk-ku', location: 'Dayside' },
      buildings: {
        Dayside: { skulls: 3, destroyed: true },
        "Egan's End": { skulls: 0, destroyed: false, monument: 'argent-oak' },
      },
      spaceMarkers: { 'Broken Lands': ['wasteland'] },
      questMarkers: {},
    };
    expect(BoardReadout.toText(s)).toMatchSnapshot();
  });

  it('narrows to a single kingdom when focus.kingdom is set', () => {
    // Broken Lands = north, Big Sister = east. The filter keeps only in-kingdom entries.
    const s: BoardState = {
      heroes: { hn: { location: 'Broken Lands' }, he: { location: 'Big Sister' } },
      foes: {
        fn: { foe: 'Brigands', location: 'Broken Lands', status: 'ready' },
        fe: { foe: 'Dragons', location: 'Big Sister', status: 'ready' },
      },
      adversary: { id: 'utuk-ku', location: 'Big Sister' },
      buildings: { Duwani: { skulls: 1, destroyed: false } }, // east
      spaceMarkers: { 'Broken Lands': ['wasteland'], 'Big Sister': ['power-skull'] },
      questMarkers: {},
    };
    expect(BoardReadout.toText(s, { kingdom: 'north', angle: 'overhead' })).toMatchSnapshot();
  });

  it('is deterministic regardless of hero insertion order', () => {
    const base = (): BoardState => ({
      heroes: {},
      foes: {},
      buildings: {},
      spaceMarkers: {},
      questMarkers: {},
    });
    const a = base();
    a.heroes = { b: { location: 'Dayside' }, a: { location: 'Broken Lands' } };
    const b = base();
    b.heroes = { a: { location: 'Broken Lands' }, b: { location: 'Dayside' } };
    expect(BoardReadout.toText(a)).toBe(BoardReadout.toText(b));
  });
});
