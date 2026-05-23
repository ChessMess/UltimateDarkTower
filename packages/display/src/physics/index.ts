import type { Tower3DView } from '../3d/Tower3DView';
import { PhysicsManager } from './PhysicsManager';
import type { PhysicsConfig, SkullPhysicsHandle } from './types';

export type {
  PhysicsConfig,
  ResolvedPhysicsConfig,
  SkullPhysicsHandle,
  DeepRequired,
} from './types';
export { DEFAULT_PHYSICS, resolvePhysics } from './PhysicsResolver';
export type { SkullTemplate } from './SkullModelLoader';

/**
 * Attach physics-driven skulls to a Tower3DView. Returns immediately with a
 * handle; Rapier's WASM init runs asynchronously in the background, and
 * `dropSkull()` calls made before init resolves are queued.
 *
 * Pass a partial `PhysicsConfig` to override any subset of the defaults
 * (see `DEFAULT_PHYSICS`). The returned handle exposes
 * `getPhysicsConfig()` / `applyPhysicsConfig()` for live tuning.
 */
export function attachSkullPhysics(
  view: Tower3DView,
  config: PhysicsConfig = {},
): SkullPhysicsHandle {
  const hooks = view.getPhysicsHooks();
  const manager = new PhysicsManager(hooks, config);

  // Fire and forget — surface errors to the console so silent failures are
  // visible during development. Consumers wanting strict error handling can
  // wrap the returned handle.
  manager.init().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[ultimatedarktowerdisplay/physics] init failed', err);
  });

  return {
    dropSkull(): void {
      manager.dropSkull();
    },
    clearSkulls(): void {
      manager.clearSkulls();
    },
    getPhysicsConfig() {
      return manager.getPhysicsConfig();
    },
    applyPhysicsConfig(partial) {
      manager.applyPhysicsConfig(partial);
    },
    dispose(): void {
      manager.dispose();
    },
  };
}
