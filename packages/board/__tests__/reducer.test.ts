import { createDefaultBoardState, applyBoardCommand } from '../src/index';

describe('board reducer (scaffold)', () => {
  it('createDefaultBoardState() has the expected shape', () => {
    const s = createDefaultBoardState();
    expect(s.version).toBe(1);
    expect(s.tokens).toEqual([]);
    expect(s.spaceMarkers).toEqual({});
  });

  it('addToken is immutable', () => {
    const s0 = createDefaultBoardState();
    const s1 = applyBoardCommand(s0, {
      type: 'addToken',
      token: { id: 't1', kind: 'hero', location: 'Broken Lands' },
    });
    expect(s1).not.toBe(s0);
    expect(s0.tokens).toHaveLength(0);
    expect(s1.tokens).toHaveLength(1);
  });

  it('reset returns a fresh default', () => {
    const s = applyBoardCommand(
      { version: 1, tokens: [{ id: 'x', kind: 'foe', location: 'Dayside' }], spaceMarkers: {} },
      { type: 'reset' }
    );
    expect(s.tokens).toEqual([]);
  });
});
