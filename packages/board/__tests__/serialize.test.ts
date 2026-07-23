import {
  saveState,
  loadState,
  createDefaultBoardState,
  BoardStateLoadError,
  BOARD_STATE_SCHEMA_VERSION,
} from '../src/index';
import type { BoardState } from '../src/index';

describe('serialize round-trip (v2)', () => {
  it('loadState(saveState(s)) deep-equals the default state', () => {
    const s = createDefaultBoardState();
    expect(loadState(saveState(s))).toEqual(s);
  });

  it('round-trips a fully-populated state (optional fields included)', () => {
    const s: BoardState = {
      tokens: {
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
          data: { status: 'savage' },
        },
        adversary: { id: 'adversary', typeId: 'adversary', location: 'Dayside', art: 'utuk-ku' },
        Dayside: {
          id: 'Dayside',
          typeId: 'building',
          location: 'Dayside',
          data: { destroyed: true },
        },
        'skull:Dayside': { id: 'skull:Dayside', typeId: 'skull', location: 'Dayside', n: 3 },
        'monument:Dayside': {
          id: 'monument:Dayside',
          typeId: 'monument',
          location: 'Dayside',
          art: 'argent-oak',
        },
        'marker:Broken Lands:wasteland': {
          id: 'marker:Broken Lands:wasteland',
          typeId: 'marker',
          location: 'Broken Lands',
          art: 'wasteland',
          spotId: 'marker',
        },
      },
      selections: { difficulty: 'Heroic', allies: ['a1'], expansions: ['covenant'] },
      meta: { seed: 'ABC123' },
    };
    expect(loadState(saveState(s))).toEqual(s);
  });

  it('stamps the version into the envelope (not inside the state)', () => {
    const envelope = JSON.parse(saveState(createDefaultBoardState()));
    expect(envelope.version).toBe(BOARD_STATE_SCHEMA_VERSION);
    expect(envelope.state.version).toBeUndefined();
  });

  it('throws BoardStateLoadError on invalid JSON', () => {
    expect(() => loadState('not json')).toThrow(BoardStateLoadError);
  });

  it('throws BoardStateLoadError on a state that fails the schema', () => {
    const bad = JSON.stringify({ version: BOARD_STATE_SCHEMA_VERSION, state: { tokens: 'nope' } });
    expect(() => loadState(bad)).toThrow(BoardStateLoadError);
  });
});

describe('serialize — refuse, don’t migrate', () => {
  it('rejects a v1 (pre-0.5.0) envelope, naming the version it found', () => {
    const v1 = JSON.stringify({
      version: 1,
      state: { heroes: {}, foes: {}, buildings: {}, spaceMarkers: {}, questMarkers: {} },
    });
    let caught: unknown;
    try {
      loadState(v1);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(BoardStateLoadError);
    const err = caught as BoardStateLoadError;
    expect(err.foundVersion).toBe(1);
    expect(err.message).toContain('1');
  });

  it('rejects an unknown future version the same way', () => {
    let caught: unknown;
    try {
      loadState('{"version":99,"state":{}}');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(BoardStateLoadError);
    expect((caught as BoardStateLoadError).foundVersion).toBe(99);
  });

  it('never partially loads on a rejected version — no state leaks out', () => {
    expect(() => loadState('{"version":1,"state":{"heroes":{}}}')).toThrow(BoardStateLoadError);
  });
});
