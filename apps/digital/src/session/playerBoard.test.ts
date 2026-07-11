import { describe, it, expect } from 'vitest';
import { createPlayerBoard } from './factory';
import {
  CORRUPTION_LOSS,
  GEAR_CAP,
  TREASURE_CAP,
  activeVirtueCount,
  isCorruptionLoss,
  listIsFull,
  withListAdded,
  withListRemoved,
  withResource,
  withVirtueToggled,
} from './playerBoard';

const board = () => createPlayerBoard('relic-hunter', 'east');

describe('createPlayerBoard', () => {
  it('starts with base-game resources and empty collections', () => {
    const pb = board();
    expect(pb).toMatchObject({ warriors: 7, spirit: 1, corruption: 0, potions: 0 });
    expect(pb.treasures).toEqual([]);
    expect(pb.gear).toEqual([]);
    expect(pb.questItems).toEqual([]);
    expect(pb.companions).toEqual([]);
    expect(pb.virtues.hero).toHaveLength(3);
    expect(pb.virtues.hero.every((v) => !v.active)).toBe(true);
    expect(pb.virtues.kingdom).toEqual({ id: 'kingdom', active: false });
  });
});

describe('withResource', () => {
  it('adjusts a pool and never goes below zero', () => {
    expect(withResource(board(), 'warriors', 2).warriors).toBe(9);
    expect(withResource(board(), 'spirit', -5).spirit).toBe(0);
  });
  it('caps corruption at the loss threshold', () => {
    const pb = withResource(
      withResource(withResource(board(), 'corruption', 2), 'corruption', 2),
      'corruption',
      2,
    );
    expect(pb.corruption).toBe(CORRUPTION_LOSS);
    expect(isCorruptionLoss(pb)).toBe(true);
  });
  it('does not treat 2 corruption as a loss', () => {
    expect(isCorruptionLoss(withResource(board(), 'corruption', 2))).toBe(false);
  });
});

describe('labeled lists', () => {
  it('adds trimmed labels and ignores blanks', () => {
    let pb = withListAdded(board(), 'gear', '  Sword  ');
    pb = withListAdded(pb, 'gear', '   ');
    expect(pb.gear).toEqual(['Sword']);
  });
  it('enforces the treasure and gear caps', () => {
    let pb = board();
    for (let i = 0; i < TREASURE_CAP + 2; i++) pb = withListAdded(pb, 'treasures', `T${i}`);
    expect(pb.treasures).toHaveLength(TREASURE_CAP);
    expect(listIsFull(pb, 'treasures')).toBe(true);

    let g = board();
    for (let i = 0; i < GEAR_CAP + 2; i++) g = withListAdded(g, 'gear', `G${i}`);
    expect(g.gear).toHaveLength(GEAR_CAP);
  });
  it('leaves quest items and companions uncapped', () => {
    let pb = board();
    for (let i = 0; i < 9; i++) pb = withListAdded(pb, 'questItems', `Q${i}`);
    expect(pb.questItems).toHaveLength(9);
    expect(listIsFull(pb, 'questItems')).toBe(false);
  });
  it('removes by index', () => {
    let pb = withListAdded(withListAdded(board(), 'companions', 'A'), 'companions', 'B');
    pb = withListRemoved(pb, 'companions', 0);
    expect(pb.companions).toEqual(['B']);
  });
});

describe('withVirtueToggled', () => {
  it('flips a hero tile by index and the kingdom tile', () => {
    let pb = withVirtueToggled(board(), 1);
    expect(pb.virtues.hero[1].active).toBe(true);
    expect(activeVirtueCount(pb)).toBe(1);

    pb = withVirtueToggled(pb, 'kingdom');
    expect(pb.virtues.kingdom.active).toBe(true);
    expect(activeVirtueCount(pb)).toBe(2);

    pb = withVirtueToggled(pb, 1);
    expect(pb.virtues.hero[1].active).toBe(false);
    expect(activeVirtueCount(pb)).toBe(1);
  });
});
