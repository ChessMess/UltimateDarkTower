import type { ScenePlugin } from 'ultimatedarktowerdisplay';
import { Board3DPlugin } from '../src/plugin/index';

describe('Board3DPlugin ScenePlugin contract', () => {
  it('satisfies Display ScenePlugin shape (type-level + required members)', () => {
    const plugin = new Board3DPlugin();
    // Compile-time contract: a Board3DPlugin must be assignable to ScenePlugin.
    const asContract: ScenePlugin = plugin;

    expect(typeof asContract.id).toBe('string');
    expect(typeof asContract.attach).toBe('function');
    expect(typeof asContract.dispose).toBe('function');
  });

  it('attach/dispose run against a mock context without throwing', () => {
    const plugin = new Board3DPlugin({ assetBaseUrl: '/tokens/' });
    const unsubscribe = jest.fn();
    const ctx = {
      onModelLoaded: jest.fn(() => unsubscribe),
    } as unknown as Parameters<ScenePlugin['attach']>[0];

    plugin.attach(ctx);
    expect((ctx as { onModelLoaded: jest.Mock }).onModelLoaded).toHaveBeenCalledTimes(1);

    plugin.dispose();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
