import { BoardReadout, createDefaultBoardState } from '../src/index';
import type { BoardState } from '../src/index';

describe('BoardReadout', () => {
  it('matches the default-state readout', () => {
    expect(BoardReadout.toText(createDefaultBoardState())).toMatchSnapshot();
  });

  it('matches a populated readout', () => {
    const s: BoardState = {
      tokens: {
        h2: { id: 'h2', typeId: 'hero', location: 'Dayside', art: 'h2' },
        h1: {
          id: 'h1',
          typeId: 'hero',
          location: 'Broken Lands',
          art: 'h1',
          data: { owner: 'north' },
        },
        f1: {
          id: 'f1',
          typeId: 'foe',
          location: 'Dayside',
          art: 'Brigands',
          data: { status: 'lethal' },
        },
        adversary: { id: 'adversary', typeId: 'adversary', location: 'Dayside', art: 'utuk-ku' },
        Dayside: {
          id: 'Dayside',
          typeId: 'building',
          location: 'Dayside',
          data: { destroyed: true },
        },
        'skull:Dayside': { id: 'skull:Dayside', typeId: 'skull', location: 'Dayside', n: 3 },
        "Egan's End": {
          id: "Egan's End",
          typeId: 'building',
          location: "Egan's End",
          data: { destroyed: false },
        },
        "monument:Egan's End": {
          id: "monument:Egan's End",
          typeId: 'monument',
          location: "Egan's End",
          art: 'argent-oak',
        },
        'marker:Broken Lands:wasteland': {
          id: 'marker:Broken Lands:wasteland',
          typeId: 'marker',
          location: 'Broken Lands',
          art: 'wasteland',
        },
      },
    };
    expect(BoardReadout.toText(s)).toMatchSnapshot();
  });

  it('narrows to a single kingdom when focus.kingdom is set', () => {
    // Broken Lands = north, Big Sister = east. The filter keeps only in-kingdom entries.
    const s: BoardState = {
      tokens: {
        hn: { id: 'hn', typeId: 'hero', location: 'Broken Lands', art: 'hn' },
        he: { id: 'he', typeId: 'hero', location: 'Big Sister', art: 'he' },
        fn: {
          id: 'fn',
          typeId: 'foe',
          location: 'Broken Lands',
          art: 'Brigands',
          data: { status: 'ready' },
        },
        fe: {
          id: 'fe',
          typeId: 'foe',
          location: 'Big Sister',
          art: 'Dragons',
          data: { status: 'ready' },
        },
        adversary: { id: 'adversary', typeId: 'adversary', location: 'Big Sister', art: 'utuk-ku' },
        Duwani: {
          id: 'Duwani',
          typeId: 'building',
          location: 'Duwani',
          data: { destroyed: false },
        }, // east
        'skull:Duwani': { id: 'skull:Duwani', typeId: 'skull', location: 'Duwani', n: 1 },
        'marker:Broken Lands:wasteland': {
          id: 'marker:Broken Lands:wasteland',
          typeId: 'marker',
          location: 'Broken Lands',
          art: 'wasteland',
        },
        'marker:Big Sister:power-skull': {
          id: 'marker:Big Sister:power-skull',
          typeId: 'marker',
          location: 'Big Sister',
          art: 'power-skull',
        },
      },
    };
    expect(BoardReadout.toText(s, { kingdom: 'north', angle: 'overhead' })).toMatchSnapshot();
  });

  it('is deterministic regardless of hero insertion order', () => {
    const base = (): BoardState => ({ tokens: {} });
    const a = base();
    a.tokens = {
      b: { id: 'b', typeId: 'hero', location: 'Dayside', art: 'b' },
      a: { id: 'a', typeId: 'hero', location: 'Broken Lands', art: 'a' },
    };
    const b = base();
    b.tokens = {
      a: { id: 'a', typeId: 'hero', location: 'Broken Lands', art: 'a' },
      b: { id: 'b', typeId: 'hero', location: 'Dayside', art: 'b' },
    };
    expect(BoardReadout.toText(a)).toBe(BoardReadout.toText(b));
  });
});
