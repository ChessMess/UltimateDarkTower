import { describe, it, expect } from 'vitest';
import { createSeed, type SeedConfig } from '@/lib/udtData';
import { applySeedToConfig, SeedError } from './setup';
import { createDefaultConfig, createNewGameSession, homeCitadelFor } from './factory';

describe('homeCitadelFor', () => {
  it('returns the Citadel location name for each kingdom', () => {
    expect(homeCitadelFor('north')).toBe('Radiant Mountains');
    expect(homeCitadelFor('east')).toBe('Inner Kinghills');
    expect(homeCitadelFor('south')).toBe('Howling Desert');
    expect(homeCitadelFor('west')).toBe('Hissing Groves');
  });
});

describe('createNewGameSession placement', () => {
  it('places each configured hero on their home-kingdom Citadel', () => {
    const config = {
      ...createDefaultConfig(),
      playerCount: 2,
      heroes: [
        { heroId: 'brutal-warlord', homeKingdom: 'north' as const },
        { heroId: 'spymaster', homeKingdom: 'west' as const },
      ],
    };
    const session = createNewGameSession(config);
    expect(session.board.heroes['brutal-warlord']).toMatchObject({
      location: 'Radiant Mountains',
      owner: 'north',
    });
    expect(session.board.heroes['spymaster']).toMatchObject({
      location: 'Hissing Groves',
      owner: 'west',
    });
  });
});

describe('applySeedToConfig', () => {
  it('pre-fills adversary, foes, difficulty & player count from a seed (names → ids)', () => {
    // Build a known seed with the library's own encoder so the test is independent of any
    // external seed string.
    const seedConfig: SeedConfig = {
      source: 'Core',
      playerCount: 3,
      adversary: 'Ashstrider',
      ally: 'Gleb',
      difficulty: 'Gritty',
      foes: ['Shadow Wolves', 'Lemures', 'Dragons'],
      expansions: [],
    };
    const { seed } = createSeed(seedConfig);

    const base = createDefaultConfig();
    const result = applySeedToConfig(base, seed);

    expect(result.difficulty).toBe('Gritty');
    expect(result.playerCount).toBe(3);
    expect(result.adversary).toBe('ashstrider');
    expect(result.foes).toEqual({ level2: 'shadow-wolves', level3: 'lemures', level4: 'dragons' });
    expect(result.seed).toBe(seed); // normalized form echoed back
    // Heroes and main goal are NOT in the seed — they are preserved from the base config.
    expect(result.heroes).toEqual(base.heroes);
    expect(result.mainGoal).toBe(base.mainGoal);
  });

  it('throws SeedError on an invalid seed', () => {
    expect(() => applySeedToConfig(createDefaultConfig(), 'not-a-seed')).toThrow(SeedError);
  });
});
