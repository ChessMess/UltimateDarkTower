import type { PhysicsConfig, ResolvedPhysicsConfig } from './types';

/**
 * Defaults match the tuned values validated during MVP build-out. Every
 * leaf has a value so consumers can read the resolved config without
 * defensive `??` chains. Mirrors `DEFAULT_LIGHTING` from the core's
 * `LightingResolver`.
 */
export const DEFAULT_PHYSICS: ResolvedPhysicsConfig = {
  debug: {
    colliders: false,
    sealColliders: false,
  },
  skull: {
    radiusFactor: 0.025,
    friction: 0.8,
    restitution: 0.2,
    // Rapier has no rolling resistance — without angular damping a sphere
    // resting on a flat surface would spin forever. ~1.0 stops a rolling
    // skull in a couple of seconds without affecting falls/slides.
    angularDamping: 1.0,
    linearDamping: 0.0,
    maxCount: 10,
    modelUrl: undefined,
    colliderShape: 'sphere',
    density: undefined,
    meshFactory: undefined,
    autoDropOnSkullCountIncrease: false,
  },
  drum: {
    innerRadiusFactor: 0.30,
    halfHeightFactor: 0.15,
    // arctan(0.15) ≈ 8.5° release angle; still above the rotation-drag
    // threshold so a skull on a flat drum floor rides along.
    friction: 0.15,
  },
  seal: {
    // arctan(0.05) ≈ 3° — virtually any tilt on the seal surface releases
    // the skull. The drum's interior surface carries the skull during
    // rotation, not the closed seal panel.
    friction: 0.05,
  },
  static: {
    // arctan(0.1) ≈ 5.7° release angle on cone/base/shell surfaces.
    friction: 0.1,
  },
  board: {
    // Matches the visual board disc's default `groundDisc.radiusFactor`.
    radiusFactor: 3.0,
    // Generous thickness so a fast-bouncing skull can't tunnel through.
    thicknessFactor: 0.3,
    friction: 0.5,
  },
  oob: {
    depthFactor: 5.0,
  },
};

/**
 * Merge a partial user config on top of `base` (defaulting to
 * `DEFAULT_PHYSICS`). Pure: returns a fresh object; never mutates input.
 * Mirrors `resolveLighting` from the core's `LightingResolver`.
 */
export function resolvePhysics(
  user?: PhysicsConfig,
  base: ResolvedPhysicsConfig = DEFAULT_PHYSICS,
): ResolvedPhysicsConfig {
  return {
    debug: {
      colliders: user?.debug?.colliders ?? base.debug.colliders,
      sealColliders: user?.debug?.sealColliders ?? base.debug.sealColliders,
    },
    skull: {
      radiusFactor: user?.skull?.radiusFactor ?? base.skull.radiusFactor,
      friction: user?.skull?.friction ?? base.skull.friction,
      restitution: user?.skull?.restitution ?? base.skull.restitution,
      angularDamping: user?.skull?.angularDamping ?? base.skull.angularDamping,
      linearDamping: user?.skull?.linearDamping ?? base.skull.linearDamping,
      maxCount: user?.skull?.maxCount ?? base.skull.maxCount,
      modelUrl: user?.skull?.modelUrl ?? base.skull.modelUrl,
      colliderShape: user?.skull?.colliderShape ?? base.skull.colliderShape,
      density: user?.skull?.density ?? base.skull.density,
      meshFactory: user?.skull?.meshFactory ?? base.skull.meshFactory,
      autoDropOnSkullCountIncrease:
        user?.skull?.autoDropOnSkullCountIncrease ?? base.skull.autoDropOnSkullCountIncrease,
    },
    drum: {
      innerRadiusFactor: user?.drum?.innerRadiusFactor ?? base.drum.innerRadiusFactor,
      halfHeightFactor: user?.drum?.halfHeightFactor ?? base.drum.halfHeightFactor,
      friction: user?.drum?.friction ?? base.drum.friction,
    },
    seal: {
      friction: user?.seal?.friction ?? base.seal.friction,
    },
    static: {
      friction: user?.static?.friction ?? base.static.friction,
    },
    board: {
      radiusFactor: user?.board?.radiusFactor ?? base.board.radiusFactor,
      thicknessFactor: user?.board?.thicknessFactor ?? base.board.thicknessFactor,
      friction: user?.board?.friction ?? base.board.friction,
    },
    oob: {
      depthFactor: user?.oob?.depthFactor ?? base.oob.depthFactor,
    },
  };
}
