import type { ScenePlugin, Tower3DView } from 'ultimatedarktowerdisplay';
import { Board3DPlugin, attachBoard3D } from '../src/plugin/index';

// Type-level + shape contract only. The full attach → model-load → select → focus
// lifecycle (against a REAL Tower3DView) lives in plugin.integration.test.ts.
describe('Board3DPlugin ScenePlugin contract', () => {
  it('satisfies the Display ScenePlugin shape (type-level + required members)', () => {
    // A cast mock view: this test never attaches, so the view is untouched.
    const view = {} as Tower3DView;
    const plugin = new Board3DPlugin(view, { assetBaseUrl: '/tokens/' });
    // Compile-time contract: a Board3DPlugin must be assignable to ScenePlugin.
    const asContract: ScenePlugin = plugin;

    expect(asContract.id).toBe('ultimatedarktowerboard:board3d');
    expect(typeof asContract.attach).toBe('function');
    expect(typeof asContract.onModelLoaded).toBe('function');
    expect(typeof asContract.dispose).toBe('function');
  });

  it('exposes attachBoard3D as the primary entry point', () => {
    expect(typeof attachBoard3D).toBe('function');
  });
});
