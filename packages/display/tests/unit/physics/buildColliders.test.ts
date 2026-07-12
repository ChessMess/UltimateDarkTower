import { buildStaticColliderSpecs, DRUM_ROW_Y_FACTORS } from '../../../src/physics/buildColliders';
import { DEFAULT_PHYSICS, resolvePhysics } from '../../../src/physics/PhysicsResolver';
import type { PhysicsConfig } from '../../../src/physics/types';

function opts(modelRadius: number, overrides?: PhysicsConfig) {
  return {
    modelRadius,
    modelBottomY: -modelRadius,
    modelTopY: modelRadius,
    config: resolvePhysics(overrides),
  };
}

describe('buildStaticColliderSpecs', () => {
  it('returns three drum-wall specs at the LED-layout row centers', () => {
    const { drumWalls } = buildStaticColliderSpecs(opts(1));

    expect(drumWalls).toHaveLength(3);
    expect(drumWalls.map((w) => w.level)).toEqual(['top', 'middle', 'bottom']);

    expect(drumWalls[0].y).toBeCloseTo(DRUM_ROW_Y_FACTORS.top); // 0.83
    expect(drumWalls[1].y).toBeCloseTo(DRUM_ROW_Y_FACTORS.middle); // 0.53
    expect(drumWalls[2].y).toBeCloseTo(DRUM_ROW_Y_FACTORS.bottom); // 0.23
  });

  it('uses the default drum inner-radius factor (0.30) when not overridden', () => {
    const { drumWalls } = buildStaticColliderSpecs(opts(1));
    for (const w of drumWalls) {
      expect(w.radius).toBeCloseTo(DEFAULT_PHYSICS.drum.innerRadiusFactor);
    }
  });

  it('honors drum.innerRadiusFactor override from the resolved config', () => {
    const { drumWalls } = buildStaticColliderSpecs(opts(1, { drum: { innerRadiusFactor: 0.35 } }));
    for (const w of drumWalls) {
      expect(w.radius).toBeCloseTo(0.35);
    }
  });

  it('scales spec dimensions linearly with modelRadius', () => {
    const { drumWalls, boardFloor, oobSensor } = buildStaticColliderSpecs(opts(4));

    expect(drumWalls[0].radius).toBeCloseTo(4 * DEFAULT_PHYSICS.drum.innerRadiusFactor);
    expect(drumWalls[0].y).toBeCloseTo(4 * DRUM_ROW_Y_FACTORS.top);
    expect(boardFloor.radius).toBeCloseTo(4 * DEFAULT_PHYSICS.board.radiusFactor);
    expect(oobSensor.size).toBeCloseTo(16);
  });

  it('builds a board floor at modelBottomY using config.board.radiusFactor', () => {
    const { boardFloor } = buildStaticColliderSpecs(opts(1, { board: { radiusFactor: 5 } }));

    expect(boardFloor.kind).toBe('board-floor');
    expect(boardFloor.y).toBe(-1);
    expect(boardFloor.radius).toBeCloseTo(5);
    expect(boardFloor.thickness).toBeGreaterThan(0);
  });

  it('builds an out-of-bounds sensor strictly below the board', () => {
    const { boardFloor, oobSensor } = buildStaticColliderSpecs(opts(1));

    expect(oobSensor.kind).toBe('oob-sensor');
    expect(oobSensor.y).toBeLessThan(boardFloor.y);
    expect(oobSensor.size).toBeGreaterThan(0);
  });
});
