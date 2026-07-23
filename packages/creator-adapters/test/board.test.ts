import { describe, it, expect } from 'vitest';
import { createBoardAdapter } from '../src/board';

/** Wait for the adapter's async `ultimatedarktowerboard` import to resolve. */
function ready(adapter: ReturnType<typeof createBoardAdapter>): Promise<void> {
  return new Promise((resolve) => adapter.onReady(resolve));
}

describe('createBoardAdapter — board.mutate placeToken/removeToken', () => {
  it('placeToken mints an instance and adds a token of the given type at the target location', async () => {
    const adapter = createBoardAdapter();
    await ready(adapter);

    adapter.mutate({
      command: 'placeToken',
      args: { tokenTypeId: 'trap', target: 'Dayside' },
    });

    const tokens = Object.values(adapter.getState().tokens);
    const trap = tokens.find((t) => t.typeId === 'trap');
    expect(trap).toBeDefined();
    expect(trap?.location).toBe('Dayside');
  });

  it('removeToken removes EVERY token of that type at that location (no instance id in the directive)', async () => {
    const adapter = createBoardAdapter();
    await ready(adapter);

    adapter.mutate({ command: 'placeToken', args: { tokenTypeId: 'trap', target: 'Dayside' } });
    adapter.mutate({ command: 'placeToken', args: { tokenTypeId: 'trap', target: 'Dayside' } });
    expect(
      Object.values(adapter.getState().tokens).filter((t) => t.typeId === 'trap'),
    ).toHaveLength(2);

    adapter.mutate({ command: 'removeToken', args: { tokenTypeId: 'trap', target: 'Dayside' } });
    expect(
      Object.values(adapter.getState().tokens).filter((t) => t.typeId === 'trap'),
    ).toHaveLength(0);
  });

  it('removeToken only removes matches at the named location, leaving others untouched', async () => {
    const adapter = createBoardAdapter();
    await ready(adapter);

    adapter.mutate({ command: 'placeToken', args: { tokenTypeId: 'trap', target: 'Dayside' } });
    adapter.mutate({
      command: 'placeToken',
      args: { tokenTypeId: 'trap', target: "Egan's End" },
    });
    adapter.mutate({ command: 'removeToken', args: { tokenTypeId: 'trap', target: 'Dayside' } });

    const remaining = Object.values(adapter.getState().tokens).filter((t) => t.typeId === 'trap');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].location).toBe("Egan's End");
  });

  it('mutations queued before the async import resolves are still applied in order', () => {
    const adapter = createBoardAdapter();
    // No `await ready` here — this exercises the pendingMutations queue.
    adapter.mutate({ command: 'placeToken', args: { tokenTypeId: 'trap', target: 'Dayside' } });
    return ready(adapter).then(() => {
      const trap = Object.values(adapter.getState().tokens).find((t) => t.typeId === 'trap');
      expect(trap?.location).toBe('Dayside');
    });
  });
});
