import {
  saveState,
  loadState,
  createDefaultBoardState,
  BoardStateLoadError,
  BOARD_STATE_SCHEMA_VERSION,
} from '../src/index';
import type { BoardState } from '../src/index';

describe('serialize round-trip', () => {
  it('loadState(saveState(s)) deep-equals the default state', () => {
    const s = createDefaultBoardState();
    expect(loadState(saveState(s))).toEqual(s);
  });

  it('round-trips a fully-populated state (optional fields included)', () => {
    const s: BoardState = {
      heroes: { h1: { location: 'Broken Lands', owner: 'north', meta: { note: 'lead' } } },
      foes: { f1: { foe: 'Brigands', location: 'Dayside', status: 'savage' } },
      adversary: { id: 'utuk-ku', location: 'Dayside' },
      buildings: { Dayside: { skulls: 3, destroyed: true, monument: 'argent-oak' } },
      spaceMarkers: { 'Broken Lands': ['wasteland', 'power-skull'] },
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
    const bad = JSON.stringify({ version: BOARD_STATE_SCHEMA_VERSION, state: { heroes: 'nope' } });
    expect(() => loadState(bad)).toThrow(BoardStateLoadError);
  });

  it('throws BoardStateLoadError on an unsupported schema version', () => {
    expect(() => loadState('{"version":2,"state":{}}')).toThrow(BoardStateLoadError);
  });
});
