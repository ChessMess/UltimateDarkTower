import type { Tower3DView } from '../3d/Tower3DView';
import { attachScenePlugin } from '../3d/ScenePlugin';
import type { ScenePlugin } from '../3d/ScenePlugin';
import type { TowerPhysicsHooks } from '../types';
import { PhysicsManager } from './PhysicsManager';
import type { PhysicsConfig, SkullPhysicsHandle } from './types';

export type {
  PhysicsConfig,
  ResolvedPhysicsConfig,
  SkullPhysicsHandle,
  DeepRequired,
} from './types';
export { DEFAULT_PHYSICS, resolvePhysics } from './PhysicsResolver';
export { loadSkullModel, clearSkullModelCache } from './SkullModelLoader';
export type { SkullTemplate, LoadSkullModelOptions } from './SkullModelLoader';

/**
 * Attach physics-driven skulls to a Tower3DView. Returns immediately with a
 * handle; Rapier's WASM init runs asynchronously in the background, and
 * `dropSkull()` calls made before init resolves are queued.
 *
 * Pass a partial `PhysicsConfig` to override any subset of the defaults
 * (see `DEFAULT_PHYSICS`). The returned handle exposes
 * `getPhysicsConfig()` / `applyPhysicsConfig()` for live tuning.
 *
 * Internally this is a {@link ScenePlugin} attached via `attachScenePlugin`:
 * skull physics dogfoods the generalized scene-plugin seam. The public API and
 * behavior are unchanged.
 */
export function attachSkullPhysics(
  view: Tower3DView,
  config: PhysicsConfig = {},
): SkullPhysicsHandle {
  // Holder so the synchronously-set manager survives flow narrowing across the
  // attach closure boundary.
  const state: { manager: PhysicsManager | null } = { manager: null };

  const plugin: ScenePlugin = {
    id: 'udt-skull-physics',
    attach(ctx) {
      // Express the narrow physics surface in terms of the scene-plugin context.
      const hooks: TowerPhysicsHooks = {
        scene: ctx.scene,
        drumNode: ctx.drumNode,
        onFrame: ctx.registerFrameCallback,
        onSealsApplied: ctx.onSealsApplied,
        onStateApplied: ctx.onStateApplied,
        onModelLoaded: ctx.onModelLoaded,
        modelRadius: ctx.modelRadius,
        modelBottomY: ctx.modelBottomY,
        modelTopY: ctx.modelTopY,
      };
      const manager = new PhysicsManager(hooks, config);
      state.manager = manager;

      // Fire and forget — surface errors to the console so silent failures are
      // visible during development. Consumers wanting strict error handling can
      // wrap the returned handle.
      manager.init().catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[ultimatedarktowerdisplay/physics] init failed', err);
      });
    },
    dispose() {
      state.manager?.dispose();
      state.manager = null;
    },
  };

  const handle = attachScenePlugin(view, plugin);
  // attach() runs synchronously inside attachScenePlugin, so the manager exists.
  if (!state.manager) {
    throw new Error('[ultimatedarktowerdisplay/physics] scene plugin attach did not run');
  }
  const pm = state.manager;

  return {
    dropSkull(): void {
      pm.dropSkull();
    },
    clearSkulls(): void {
      pm.clearSkulls();
    },
    getPhysicsConfig() {
      return pm.getPhysicsConfig();
    },
    applyPhysicsConfig(partial) {
      pm.applyPhysicsConfig(partial);
    },
    dispose(): void {
      handle.detach();
    },
  };
}
