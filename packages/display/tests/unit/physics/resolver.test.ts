import { DEFAULT_PHYSICS, resolvePhysics } from '../../../src/physics/PhysicsResolver';

describe('resolvePhysics', () => {
  it('returns a deep-equal copy of DEFAULT_PHYSICS for an empty input', () => {
    expect(resolvePhysics({})).toEqual(DEFAULT_PHYSICS);
    expect(resolvePhysics(undefined)).toEqual(DEFAULT_PHYSICS);
  });

  it('does not mutate the inputs', () => {
    const frozen = Object.freeze({ drum: Object.freeze({ friction: 0.4 }) });
    expect(() => resolvePhysics(frozen)).not.toThrow();
    expect(frozen.drum.friction).toBe(0.4);
  });

  it('returns a fresh object — not the same reference as the base', () => {
    const out = resolvePhysics({});
    expect(out).not.toBe(DEFAULT_PHYSICS);
    expect(out.skull).not.toBe(DEFAULT_PHYSICS.skull);
  });

  it('honors a single overridden leaf and leaves the rest at defaults', () => {
    const out = resolvePhysics({ drum: { friction: 0.4 } });

    expect(out.drum.friction).toBe(0.4);
    expect(out.drum.innerRadiusFactor).toBe(DEFAULT_PHYSICS.drum.innerRadiusFactor);
    expect(out.drum.halfHeightFactor).toBe(DEFAULT_PHYSICS.drum.halfHeightFactor);
    expect(out.skull).toEqual(DEFAULT_PHYSICS.skull);
    expect(out.board).toEqual(DEFAULT_PHYSICS.board);
  });

  it('merges patches on top of a non-default base', () => {
    const base = resolvePhysics({ drum: { friction: 0.4 } });
    const out = resolvePhysics({ seal: { friction: 0.1 } }, base);

    expect(out.drum.friction).toBe(0.4);
    expect(out.seal.friction).toBe(0.1);
  });

  it('supports overrides in every domain', () => {
    const out = resolvePhysics({
      debug: { colliders: true },
      skull: { radiusFactor: 0.05, angularDamping: 2.5 },
      drum: { innerRadiusFactor: 0.4 },
      seal: { friction: 0.2 },
      static: { friction: 0.3 },
      board: { radiusFactor: 5, friction: 0.7 },
      oob: { depthFactor: 10 },
    });

    expect(out.debug.colliders).toBe(true);
    expect(out.debug.sealColliders).toBe(false);
    expect(out.skull.radiusFactor).toBe(0.05);
    expect(out.skull.angularDamping).toBe(2.5);
    expect(out.drum.innerRadiusFactor).toBe(0.4);
    expect(out.seal.friction).toBe(0.2);
    expect(out.static.friction).toBe(0.3);
    expect(out.board.radiusFactor).toBe(5);
    expect(out.board.friction).toBe(0.7);
    expect(out.oob.depthFactor).toBe(10);
  });

  it('preserves DEFAULT_PHYSICS as a stable reference', () => {
    const before = JSON.stringify(DEFAULT_PHYSICS);
    resolvePhysics({ board: { friction: 0.9 } });
    expect(JSON.stringify(DEFAULT_PHYSICS)).toBe(before);
  });

  it('defaults skull.meshFactory to undefined', () => {
    expect(DEFAULT_PHYSICS.skull.meshFactory).toBeUndefined();
    expect(resolvePhysics({}).skull.meshFactory).toBeUndefined();
  });

  it('carries skull.meshFactory by reference', () => {
    const fn = (_r: number): unknown => ({});
    const out = resolvePhysics({ skull: { meshFactory: fn as never } });
    expect(out.skull.meshFactory).toBe(fn);
  });

  it('defaults skull.modelUrl to undefined and skull.colliderShape to "sphere"', () => {
    expect(DEFAULT_PHYSICS.skull.modelUrl).toBeUndefined();
    expect(DEFAULT_PHYSICS.skull.colliderShape).toBe('sphere');
    const out = resolvePhysics({});
    expect(out.skull.modelUrl).toBeUndefined();
    expect(out.skull.colliderShape).toBe('sphere');
  });

  it('carries skull.modelUrl and leaves colliderShape at default', () => {
    const out = resolvePhysics({ skull: { modelUrl: '/foo.glb' } });
    expect(out.skull.modelUrl).toBe('/foo.glb');
    expect(out.skull.colliderShape).toBe('sphere');
  });

  it('honors a colliderShape override', () => {
    const out = resolvePhysics({ skull: { modelUrl: '/foo.glb', colliderShape: 'hull' } });
    expect(out.skull.colliderShape).toBe('hull');
  });

  it('defaults skull.density to undefined and carries an override', () => {
    expect(DEFAULT_PHYSICS.skull.density).toBeUndefined();
    const out = resolvePhysics({ skull: { density: 2.5 } });
    expect(out.skull.density).toBe(2.5);
  });

  it('defaults skull.autoDropOnSkullCountIncrease to false and carries an override', () => {
    expect(DEFAULT_PHYSICS.skull.autoDropOnSkullCountIncrease).toBe(false);
    const out = resolvePhysics({ skull: { autoDropOnSkullCountIncrease: true } });
    expect(out.skull.autoDropOnSkullCountIncrease).toBe(true);
  });

  it('defaults skull.canSleep to true and carries an override', () => {
    expect(DEFAULT_PHYSICS.skull.canSleep).toBe(true);
    const out = resolvePhysics({ skull: { canSleep: false } });
    expect(out.skull.canSleep).toBe(false);
  });

  it('defaults skull.additionalSolverIterations to 0 and carries an override', () => {
    expect(DEFAULT_PHYSICS.skull.additionalSolverIterations).toBe(0);
    const out = resolvePhysics({ skull: { additionalSolverIterations: 4 } });
    expect(out.skull.additionalSolverIterations).toBe(4);
  });

  it('defaults skull.shakeStrength to 3 and carries an override', () => {
    expect(DEFAULT_PHYSICS.skull.shakeStrength).toBe(3);
    const out = resolvePhysics({ skull: { shakeStrength: 7 } });
    expect(out.skull.shakeStrength).toBe(7);
  });

  it('defaults skull.clickToShake to false and carries an override', () => {
    expect(DEFAULT_PHYSICS.skull.clickToShake).toBe(false);
    const out = resolvePhysics({ skull: { clickToShake: true } });
    expect(out.skull.clickToShake).toBe(true);
  });

  it('defaults skull.shakeHorizontalFactor to 0.5 and carries an override', () => {
    expect(DEFAULT_PHYSICS.skull.shakeHorizontalFactor).toBe(0.5);
    const out = resolvePhysics({ skull: { shakeHorizontalFactor: 0.8 } });
    expect(out.skull.shakeHorizontalFactor).toBe(0.8);
  });

  it('defaults skull.shakeUpwardFactor to 0.45 and carries an override', () => {
    expect(DEFAULT_PHYSICS.skull.shakeUpwardFactor).toBe(0.45);
    const out = resolvePhysics({ skull: { shakeUpwardFactor: 0.2 } });
    expect(out.skull.shakeUpwardFactor).toBe(0.2);
  });

  it('defaults seal.attributionRadiusFactor to 0.25 and carries an override', () => {
    expect(DEFAULT_PHYSICS.seal.attributionRadiusFactor).toBe(0.25);
    const out = resolvePhysics({ seal: { attributionRadiusFactor: 0.4 } });
    expect(out.seal.attributionRadiusFactor).toBe(0.4);
  });

  it('defaults seal.shakeSkullsOnSealRemoval to true and carries a boolean override', () => {
    expect(DEFAULT_PHYSICS.seal.shakeSkullsOnSealRemoval).toBe(true);
    const out = resolvePhysics({ seal: { shakeSkullsOnSealRemoval: false } });
    expect(out.seal.shakeSkullsOnSealRemoval).toBe(false);
  });

  it('defaults seal.shakeSkullsOnSealRemovalDelaySeconds to 0.25 and carries an override', () => {
    expect(DEFAULT_PHYSICS.seal.shakeSkullsOnSealRemovalDelaySeconds).toBe(0.25);
    const out = resolvePhysics({ seal: { shakeSkullsOnSealRemovalDelaySeconds: 1.5 } });
    expect(out.seal.shakeSkullsOnSealRemovalDelaySeconds).toBe(1.5);
  });

  it('carries an object-form seal.shakeSkullsOnSealRemoval override as-is', () => {
    const out = resolvePhysics({
      seal: { shakeSkullsOnSealRemoval: { mode: 'all', shake: { strength: 9 } } },
    });
    expect(out.seal.shakeSkullsOnSealRemoval).toEqual({ mode: 'all', shake: { strength: 9 } });
  });
});
