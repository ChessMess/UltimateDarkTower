import { saveState, loadState, createDefaultBoardState } from '../src/index';

describe('serialize round-trip (scaffold)', () => {
  it('loadState(saveState(s)) deep-equals s', () => {
    const s = createDefaultBoardState();
    expect(loadState(saveState(s))).toEqual(s);
  });

  it('round-trips a populated state', () => {
    const s = {
      version: 1 as const,
      tokens: [{ id: 't1', kind: 'hero' as const, location: 'Broken Lands' }],
      spaceMarkers: { Dayside: ['blight'] },
    };
    expect(loadState(saveState(s))).toEqual(s);
  });

  it('rejects malformed input', () => {
    expect(() => loadState('{"version":2}')).toThrow();
  });
});
