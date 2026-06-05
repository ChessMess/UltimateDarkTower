import { BoardReadout, createDefaultBoardState } from '../src/index';

describe('BoardReadout snapshot (scaffold)', () => {
  it('matches the default-state readout', () => {
    expect(BoardReadout.toText(createDefaultBoardState())).toMatchSnapshot();
  });

  it('is deterministic regardless of token insertion order', () => {
    const a = BoardReadout.toText({
      version: 1,
      tokens: [
        { id: 'b', kind: 'foe', location: 'Dayside' },
        { id: 'a', kind: 'hero', location: 'Broken Lands' },
      ],
      spaceMarkers: {},
    });
    const b = BoardReadout.toText({
      version: 1,
      tokens: [
        { id: 'a', kind: 'hero', location: 'Broken Lands' },
        { id: 'b', kind: 'foe', location: 'Dayside' },
      ],
      spaceMarkers: {},
    });
    expect(a).toBe(b);
  });
});
