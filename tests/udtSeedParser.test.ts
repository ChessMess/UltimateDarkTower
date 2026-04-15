/**
 * Tests for udtSeedParser — base-34 seed validation, encoding, decoding,
 * comparison, and dump utilities.
 */

import {
  charToValue,
  valueToChar,
  validateSeed,
  decodeSeed,
  decodeRngSeed,
  createSeed,
  encodeSeed,
  compareSeedsRaw,
  dumpSeedChars,
  TIER1_FOES,
  TIER2_FOES,
  TIER3_FOES,
  ADVERSARIES,
  ALLIES,
} from '../src/udtSeedParser';
import type { SeedConfig } from '../src/udtSeedParser';

// ── charToValue / valueToChar ──────────────────────────────────────────────

describe('charToValue / valueToChar', () => {
  const expectedMappings: [string, number][] = [
    ['a', 0], ['1', 1], ['2', 2], ['3', 3], ['4', 4], ['5', 5],
    ['6', 6], ['7', 7], ['8', 8], ['9', 9], ['b', 10], ['c', 11],
    ['d', 12], ['e', 13], ['f', 14], ['g', 15], ['h', 16], ['i', 17],
    ['j', 18], ['k', 19], ['l', 20], ['m', 21], ['n', 22], ['p', 23],
    ['q', 24], ['r', 25], ['s', 26], ['t', 27], ['u', 28], ['v', 29],
    ['w', 30], ['x', 31], ['y', 32], ['z', 33],
  ];

  test.each(expectedMappings)("charToValue('%s') === %i", (char, value) => {
    expect(charToValue(char)).toBe(value);
  });

  test.each(expectedMappings)("valueToChar(%i) === '%s'", (char, value) => {
    expect(valueToChar(value)).toBe(char);
  });

  test('roundtrip for all 34 characters', () => {
    for (let v = 0; v < 34; v++) {
      expect(charToValue(valueToChar(v))).toBe(v);
    }
  });

  test("'0' (zero) is invalid", () => {
    expect(() => charToValue('0')).toThrow('Invalid seed character');
  });

  test("'o' (letter) is invalid", () => {
    expect(() => charToValue('o')).toThrow('Invalid seed character');
  });

  test('uppercase char works (case-insensitive)', () => {
    expect(charToValue('A')).toBe(0);
    expect(charToValue('Z')).toBe(33);
  });

  test('valueToChar rejects out-of-range values', () => {
    expect(() => valueToChar(-1)).toThrow('Invalid seed value');
    expect(() => valueToChar(34)).toThrow('Invalid seed value');
  });
});

// ── validateSeed ───────────────────────────────────────────────────────────

describe('validateSeed', () => {
  test('accepts valid formatted seed (uppercase)', () => {
    expect(validateSeed('AA9A-AAGS-W634')).toBe('AA9A-AAGS-W634');
  });

  test('normalizes lowercase to uppercase', () => {
    expect(validateSeed('aa9a-aags-w634')).toBe('AA9A-AAGS-W634');
  });

  test('accepts seed without dashes', () => {
    expect(validateSeed('aa9aaagsw634')).toBe('AA9A-AAGS-W634');
  });

  test('accepts mixed case', () => {
    expect(validateSeed('Aa9aAaGsW634')).toBe('AA9A-AAGS-W634');
  });

  test('rejects seeds with 0 (zero)', () => {
    expect(() => validateSeed('0A9A-AAGS-W634')).toThrow('Invalid seed character');
  });

  test('rejects seeds with o (letter)', () => {
    expect(() => validateSeed('oA9A-AAGS-W634')).toThrow('Invalid seed character');
  });

  test('rejects too-short seed', () => {
    expect(() => validateSeed('AA9A-AAGS')).toThrow('Invalid seed length');
  });

  test('rejects too-long seed', () => {
    expect(() => validateSeed('AA9A-AAGS-W634-XXXX')).toThrow('Invalid seed length');
  });

  test('rejects empty string', () => {
    expect(() => validateSeed('')).toThrow('Invalid seed length');
  });

  test('accepts all-a seed', () => {
    expect(validateSeed('AAAA-AAAA-AAAA')).toBe('AAAA-AAAA-AAAA');
  });

  test('accepts all-z seed', () => {
    expect(validateSeed('ZZZZ-ZZZZ-ZZZZ')).toBe('ZZZZ-ZZZZ-ZZZZ');
  });

  test('strips spaces', () => {
    expect(validateSeed('AA9A AAGS W634')).toBe('AA9A-AAGS-W634');
  });
});

// ── decodeSeed ─────────────────────────────────────────────────────────────

describe('decodeSeed', () => {
  describe('known seed AA9A-AAGS-W634', () => {
    // Lowercase: a,a,9,a,a,a,g,s,w,6,3,4
    // setup[0]=0(a), setup[1]=0(a), setup[2]=9(char '9'=val 9),
    // setup[3]=0(a), setup[4]=0(a), setup[5]=0(a)
    // Wait: char '9' has value 9. But Ally index 9 = Zaida.
    // RNG chars: g(15), s(26), w(30), 6(6), 3(3), 4(4)
    // RNG = 15*1 + 26*34 + 30*1156 + 6*39304 + 3*1336336 + 4*45435424
    //     = 15 + 884 + 34680 + 235824 + 4009008 + 181741696 = 186022107

    const decoded = decodeSeed('AA9A-AAGS-W634');

    test('seed is normalized', () => {
      expect(decoded.seed).toBe('AA9A-AAGS-W634');
    });

    test('Tier 1 foe: Brigands', () => {
      expect(decoded.tier1Foe).toBe('Brigands');
    });

    test('Tier 2 foe: Frost Trolls', () => {
      expect(decoded.tier2Foe).toBe('Frost Trolls');
    });

    test('Tier 3 foe: Dragons', () => {
      expect(decoded.tier3Foe).toBe('Dragons');
    });

    test('Adversary: Ashstrider', () => {
      expect(decoded.adversary).toBe('Ashstrider');
    });

    test('Ally: Zaida (value 9)', () => {
      expect(decoded.ally).toBe('Zaida');
    });

    test('Difficulty: Heroic', () => {
      expect(decoded.difficulty).toBe('Heroic');
    });

    test('Source: Core', () => {
      expect(decoded.source).toBe('Core');
    });

    test('Expansions: none', () => {
      expect(decoded.expansions).toEqual([]);
    });

    test('Player Count: 1', () => {
      expect(decoded.playerCount).toBe(1);
    });

    test('RNG seed: 186022107', () => {
      expect(decoded.rngSeed).toBe(186022107);
    });

    test('SeedBank values', () => {
      expect(decoded.seedBank.initializationSeed).toBe(186022107);
      expect(decoded.seedBank.questSeed).toBe(186022106);
      expect(decoded.seedBank.seedString).toBe('AA9A-AAGS-W634');
    });

    test('raw setup values', () => {
      expect(decoded.setup).toEqual([0, 0, 9, 0, 0, 0]);
    });
  });

  describe('Tier 3 foe split encoding', () => {
    // Tier 3 uses bit 4 of setup[0] (low) and bit 4 of setup[1] (high)
    // To set specific bits, we construct setup values:
    //   Dragons  (0b00): setup[0]=0,  setup[1]=0
    //   Mormos   (0b01): setup[0]=16, setup[1]=0
    //   Striga   (0b10): setup[0]=0,  setup[1]=16
    //   Titans   (0b11): setup[0]=16, setup[1]=16

    test('Dragons: setup[0] bit4=0, setup[1] bit4=0', () => {
      // setup[0]=0 (a), setup[1]=0 (a), rest=a
      const seed = encodeSeed(
        { source: 'Core', playerCount: 1, adversary: 'Ashstrider', ally: 'Gleb',
          difficulty: 'Heroic', foes: ['Brigands', 'Frost Trolls', 'Dragons'], expansions: [] },
        0,
      );
      expect(decodeSeed(seed).tier3Foe).toBe('Dragons');
    });

    test('Mormos: setup[0] bit4=1, setup[1] bit4=0', () => {
      const seed = encodeSeed(
        { source: 'Core', playerCount: 1, adversary: 'Ashstrider', ally: 'Gleb',
          difficulty: 'Heroic', foes: ['Brigands', 'Frost Trolls', 'Mormos'], expansions: [] },
        0,
      );
      expect(decodeSeed(seed).tier3Foe).toBe('Mormos');
    });

    test('Striga: setup[0] bit4=0, setup[1] bit4=1', () => {
      const seed = encodeSeed(
        { source: 'Core', playerCount: 1, adversary: 'Ashstrider', ally: 'Gleb',
          difficulty: 'Heroic', foes: ['Brigands', 'Frost Trolls', 'Striga'], expansions: [] },
        0,
      );
      expect(decodeSeed(seed).tier3Foe).toBe('Striga');
    });

    test('Titans: setup[0] bit4=1, setup[1] bit4=1', () => {
      const seed = encodeSeed(
        { source: 'Core', playerCount: 1, adversary: 'Ashstrider', ally: 'Gleb',
          difficulty: 'Heroic', foes: ['Brigands', 'Frost Trolls', 'Titans'], expansions: [] },
        0,
      );
      expect(decodeSeed(seed).tier3Foe).toBe('Titans');
    });
  });

  describe('all Tier 1 foes', () => {
    test.each(TIER1_FOES.map((f, i) => [f, i] as const))('%s (index %i)', (foe) => {
      const seed = encodeSeed(
        { source: 'Core', playerCount: 1, adversary: 'Ashstrider', ally: 'Gleb',
          difficulty: 'Heroic', foes: [foe, 'Frost Trolls', 'Dragons'], expansions: [] },
        0,
      );
      expect(decodeSeed(seed).tier1Foe).toBe(foe);
    });
  });

  describe('all Tier 2 foes', () => {
    test.each(TIER2_FOES.map((f, i) => [f, i] as const))('%s (index %i)', (foe) => {
      const seed = encodeSeed(
        { source: 'Core', playerCount: 1, adversary: 'Ashstrider', ally: 'Gleb',
          difficulty: 'Heroic', foes: ['Brigands', foe, 'Dragons'], expansions: [] },
        0,
      );
      expect(decodeSeed(seed).tier2Foe).toBe(foe);
    });
  });

  describe('all adversaries', () => {
    test.each(ADVERSARIES.map((a, i) => [a, i] as const))('%s (index %i)', (adversary) => {
      const seed = encodeSeed(
        { source: 'Core', playerCount: 1, adversary, ally: 'Gleb',
          difficulty: 'Heroic', foes: ['Brigands', 'Frost Trolls', 'Dragons'], expansions: [] },
        0,
      );
      expect(decodeSeed(seed).adversary).toBe(adversary);
    });
  });

  describe('all allies', () => {
    test.each(ALLIES.map((a, i) => [a, i] as const))('%s (index %i)', (ally) => {
      const seed = encodeSeed(
        { source: 'Core', playerCount: 1, adversary: 'Ashstrider', ally,
          difficulty: 'Heroic', foes: ['Brigands', 'Frost Trolls', 'Dragons'], expansions: [] },
        0,
      );
      expect(decodeSeed(seed).ally).toBe(ally);
    });
  });

  describe('extra byte (setup[3]) combinations', () => {
    test('Heroic / no expansions / Core', () => {
      const seed = encodeSeed(
        { source: 'Core', playerCount: 1, adversary: 'Ashstrider', ally: 'Gleb',
          difficulty: 'Heroic', foes: ['Brigands', 'Frost Trolls', 'Dragons'], expansions: [] },
        0,
      );
      const d = decodeSeed(seed);
      expect(d.difficulty).toBe('Heroic');
      expect(d.expansions).toEqual([]);
      expect(d.source).toBe('Core');
    });

    test('Gritty / no expansions / Core', () => {
      const seed = encodeSeed(
        { source: 'Core', playerCount: 1, adversary: 'Ashstrider', ally: 'Gleb',
          difficulty: 'Gritty', foes: ['Brigands', 'Frost Trolls', 'Dragons'], expansions: [] },
        0,
      );
      const d = decodeSeed(seed);
      expect(d.difficulty).toBe('Gritty');
      expect(d.source).toBe('Core');
    });

    test('Heroic / Monuments / Core', () => {
      const seed = encodeSeed(
        { source: 'Core', playerCount: 1, adversary: 'Ashstrider', ally: 'Gleb',
          difficulty: 'Heroic', foes: ['Brigands', 'Frost Trolls', 'Dragons'], expansions: ['Monuments'] },
        0,
      );
      const d = decodeSeed(seed);
      expect(d.expansions).toEqual(['Monuments']);
    });

    test('Heroic / Alliances / Core', () => {
      const seed = encodeSeed(
        { source: 'Core', playerCount: 1, adversary: 'Ashstrider', ally: 'Gleb',
          difficulty: 'Heroic', foes: ['Brigands', 'Frost Trolls', 'Dragons'], expansions: ['Alliances'] },
        0,
      );
      const d = decodeSeed(seed);
      expect(d.expansions).toEqual(['Alliances']);
    });

    test('Heroic / Alliances + Monuments / Core', () => {
      const seed = encodeSeed(
        { source: 'Core', playerCount: 1, adversary: 'Ashstrider', ally: 'Gleb',
          difficulty: 'Heroic', foes: ['Brigands', 'Frost Trolls', 'Dragons'],
          expansions: ['Alliances', 'Monuments'] },
        0,
      );
      const d = decodeSeed(seed);
      expect(d.expansions).toContain('Alliances');
      expect(d.expansions).toContain('Monuments');
    });

    test('Heroic / no expansions / Competitive', () => {
      const seed = encodeSeed(
        { source: 'Competitive', playerCount: 1, adversary: 'Ashstrider', ally: 'Gleb',
          difficulty: 'Heroic', foes: ['Brigands', 'Frost Trolls', 'Dragons'], expansions: [] },
        0,
      );
      expect(decodeSeed(seed).source).toBe('Competitive');
    });

    test('Gritty / no expansions / Competitive', () => {
      const seed = encodeSeed(
        { source: 'Competitive', playerCount: 1, adversary: 'Ashstrider', ally: 'Gleb',
          difficulty: 'Gritty', foes: ['Brigands', 'Frost Trolls', 'Dragons'], expansions: [] },
        0,
      );
      const d = decodeSeed(seed);
      expect(d.difficulty).toBe('Gritty');
      expect(d.source).toBe('Competitive');
    });
  });

  describe('player count', () => {
    test.each([1, 2, 3, 4])('%i player(s)', (count) => {
      const seed = encodeSeed(
        { source: 'Core', playerCount: count, adversary: 'Ashstrider', ally: 'Gleb',
          difficulty: 'Heroic', foes: ['Brigands', 'Frost Trolls', 'Dragons'], expansions: [] },
        0,
      );
      expect(decodeSeed(seed).playerCount).toBe(count);
    });
  });

  test('consistent results for same seed', () => {
    const r1 = decodeSeed('AA9A-AAGS-W634');
    const r2 = decodeSeed('AA9A-AAGS-W634');
    expect(r1).toEqual(r2);
  });
});

// ── decodeRngSeed ──────────────────────────────────────────────────────────

describe('decodeRngSeed', () => {
  test('known seed AA9A-AAGS-W634 → 186022107', () => {
    expect(decodeRngSeed('AA9A-AAGS-W634')).toBe(186022107);
  });

  test('all-a RNG → 0', () => {
    // Seed with RNG chars all 'a' (value 0)
    expect(decodeRngSeed('AAAA-AAAA-AAAA')).toBe(0);
  });

  test('all-z RNG → 34^6 - 1 = 1544804415', () => {
    // Seed with RNG chars all 'z' (value 33)
    expect(decodeRngSeed('AAAA-AAZZ-ZZZZ')).toBe(1544804415);
  });

  test('matches decodeSeed().rngSeed', () => {
    expect(decodeRngSeed('AA9A-AAGS-W634')).toBe(decodeSeed('AA9A-AAGS-W634').rngSeed);
  });
});

// ── createSeed ─────────────────────────────────────────────────────────────

describe('createSeed', () => {
  const baseConfig: SeedConfig = {
    source: 'Core',
    playerCount: 1,
    adversary: 'Ashstrider',
    ally: 'Gleb',
    difficulty: 'Heroic',
    foes: ['Brigands', 'Frost Trolls', 'Dragons'],
    expansions: [],
  };

  test('generates a valid 12-char seed', () => {
    const { seed } = createSeed(baseConfig);
    expect(() => validateSeed(seed)).not.toThrow();
  });

  test('setup portion is deterministic for same config', () => {
    const { seed: seed1 } = createSeed(baseConfig);
    const { seed: seed2 } = createSeed(baseConfig);
    // Setup chars (first 6, in XXXX-XXXX-XXXX format = first 4 + first 2 of second group)
    const setup1 = seed1.replace(/-/g, '').slice(0, 6);
    const setup2 = seed2.replace(/-/g, '').slice(0, 6);
    expect(setup1).toBe(setup2);
  });

  test('rngValue matches decoded RNG from seed', () => {
    const { seed, rngValue } = createSeed(baseConfig);
    expect(decodeRngSeed(seed)).toBe(rngValue);
  });

  test('rejects invalid foe', () => {
    expect(() => createSeed({ ...baseConfig, foes: ['InvalidFoe' as any, 'Frost Trolls', 'Dragons'] }))
      .toThrow('Invalid Tier 1 foe');
  });

  test('rejects invalid adversary', () => {
    expect(() => createSeed({ ...baseConfig, adversary: 'InvalidAdversary' as any }))
      .toThrow('Invalid adversary');
  });

  test('rejects invalid ally', () => {
    expect(() => createSeed({ ...baseConfig, ally: 'InvalidAlly' as any }))
      .toThrow('Invalid ally');
  });
});

// ── encodeSeed (deterministic) ─────────────────────────────────────────────

describe('encodeSeed', () => {
  const baseConfig: SeedConfig = {
    source: 'Core',
    playerCount: 1,
    adversary: 'Ashstrider',
    ally: 'Gleb',
    difficulty: 'Heroic',
    foes: ['Brigands', 'Frost Trolls', 'Dragons'],
    expansions: [],
  };

  test('produces deterministic output', () => {
    const seed1 = encodeSeed(baseConfig, 12345);
    const seed2 = encodeSeed(baseConfig, 12345);
    expect(seed1).toBe(seed2);
  });

  test('RNG value roundtrips through decode', () => {
    const rngValue = 186022107;
    const seed = encodeSeed(baseConfig, rngValue);
    expect(decodeRngSeed(seed)).toBe(rngValue);
  });

  test('RNG value 0 roundtrips', () => {
    const seed = encodeSeed(baseConfig, 0);
    expect(decodeRngSeed(seed)).toBe(0);
  });

  test('RNG value max (1544804415) roundtrips', () => {
    const seed = encodeSeed(baseConfig, 1544804415);
    expect(decodeRngSeed(seed)).toBe(1544804415);
  });
});

// ── createSeed → decodeSeed roundtrip ──────────────────────────────────────

describe('createSeed → decodeSeed roundtrip', () => {
  test('all fields survive roundtrip', () => {
    const config: SeedConfig = {
      source: 'Competitive',
      playerCount: 3,
      adversary: 'Gravemaw',
      ally: 'Yana',
      difficulty: 'Gritty',
      foes: ['Spine Fiends', 'Widowmade Spiders', 'Titans'],
      expansions: ['Alliances', 'Monuments'],
    };

    const { seed } = createSeed(config);
    const decoded = decodeSeed(seed);

    expect(decoded.tier1Foe).toBe('Spine Fiends');
    expect(decoded.tier2Foe).toBe('Widowmade Spiders');
    expect(decoded.tier3Foe).toBe('Titans');
    expect(decoded.adversary).toBe('Gravemaw');
    expect(decoded.ally).toBe('Yana');
    expect(decoded.difficulty).toBe('Gritty');
    expect(decoded.source).toBe('Competitive');
    expect(decoded.expansions).toContain('Alliances');
    expect(decoded.expansions).toContain('Monuments');
    expect(decoded.playerCount).toBe(3);
  });

  test('encodeSeed → decodeSeed roundtrip preserves all fields', () => {
    const config: SeedConfig = {
      source: 'Core',
      playerCount: 4,
      adversary: "Utuk'Ku",
      ally: 'Zaida',
      difficulty: 'Heroic',
      foes: ['Oreks', 'Lemures', 'Striga'],
      expansions: ['Monuments'],
    };
    const rngValue = 999999;
    const seed = encodeSeed(config, rngValue);
    const decoded = decodeSeed(seed);

    expect(decoded.tier1Foe).toBe('Oreks');
    expect(decoded.tier2Foe).toBe('Lemures');
    expect(decoded.tier3Foe).toBe('Striga');
    expect(decoded.adversary).toBe("Utuk'Ku");
    expect(decoded.ally).toBe('Zaida');
    expect(decoded.difficulty).toBe('Heroic');
    expect(decoded.source).toBe('Core');
    expect(decoded.expansions).toEqual(['Monuments']);
    expect(decoded.playerCount).toBe(4);
    expect(decoded.rngSeed).toBe(rngValue);
  });
});

// ── compareSeedsRaw ────────────────────────────────────────────────────────

describe('compareSeedsRaw', () => {
  test('identical seeds produce no diffs', () => {
    const result = compareSeedsRaw('AA9A-AAGS-W634', 'AA9A-AAGS-W634');
    expect(result.diffs).toHaveLength(0);
    expect(result.setupDiffs).toHaveLength(0);
    expect(result.rngDiffs).toHaveLength(0);
  });

  test('seeds differing only in setup have setupDiffs but no rngDiffs', () => {
    // Same RNG, different setup[0] (different Tier 1 foe)
    const config1: SeedConfig = {
      source: 'Core', playerCount: 1, adversary: 'Ashstrider', ally: 'Gleb',
      difficulty: 'Heroic', foes: ['Brigands', 'Frost Trolls', 'Dragons'], expansions: [],
    };
    const config2: SeedConfig = { ...config1, foes: ['Oreks', 'Frost Trolls', 'Dragons'] };
    const rng = 100000;
    const seed1 = encodeSeed(config1, rng);
    const seed2 = encodeSeed(config2, rng);

    const result = compareSeedsRaw(seed1, seed2);
    expect(result.setupDiffs.length).toBeGreaterThan(0);
    expect(result.rngDiffs).toHaveLength(0);
  });

  test('seeds differing only in RNG have rngDiffs but no setupDiffs', () => {
    const config: SeedConfig = {
      source: 'Core', playerCount: 1, adversary: 'Ashstrider', ally: 'Gleb',
      difficulty: 'Heroic', foes: ['Brigands', 'Frost Trolls', 'Dragons'], expansions: [],
    };
    const seed1 = encodeSeed(config, 100000);
    const seed2 = encodeSeed(config, 200000);

    const result = compareSeedsRaw(seed1, seed2);
    expect(result.setupDiffs).toHaveLength(0);
    expect(result.rngDiffs.length).toBeGreaterThan(0);
  });

  test('diffs include character info', () => {
    const config: SeedConfig = {
      source: 'Core', playerCount: 1, adversary: 'Ashstrider', ally: 'Gleb',
      difficulty: 'Heroic', foes: ['Brigands', 'Frost Trolls', 'Dragons'], expansions: [],
    };
    const seed1 = encodeSeed(config, 0);
    const seed2 = encodeSeed(config, 1);

    const result = compareSeedsRaw(seed1, seed2);
    expect(result.rngDiffs.length).toBeGreaterThan(0);
    const diff = result.rngDiffs[0];
    expect(diff.charIndex).toBeGreaterThanOrEqual(6);
    expect(typeof diff.char1).toBe('string');
    expect(typeof diff.char2).toBe('string');
  });

  test('returns normalized seeds', () => {
    const result = compareSeedsRaw('aa9a-aags-w634', 'AA9A-AAGS-W634');
    expect(result.seed1).toBe('AA9A-AAGS-W634');
    expect(result.seed2).toBe('AA9A-AAGS-W634');
  });
});

// ── dumpSeedChars ──────────────────────────────────────────────────────────

describe('dumpSeedChars', () => {
  test('returns 12 entries', () => {
    const dump = dumpSeedChars('AA9A-AAGS-W634');
    expect(dump.chars).toHaveLength(12);
  });

  test('first 6 are setup, last 6 are rng', () => {
    const dump = dumpSeedChars('AA9A-AAGS-W634');
    for (let i = 0; i < 6; i++) {
      expect(dump.chars[i].section).toBe('setup');
    }
    for (let i = 6; i < 12; i++) {
      expect(dump.chars[i].section).toBe('rng');
    }
  });

  test('setup chars have field labels', () => {
    const dump = dumpSeedChars('AA9A-AAGS-W634');
    for (let i = 0; i < 6; i++) {
      expect(dump.chars[i].field).toBeDefined();
    }
  });

  test('rng chars have no field labels', () => {
    const dump = dumpSeedChars('AA9A-AAGS-W634');
    for (let i = 6; i < 12; i++) {
      expect(dump.chars[i].field).toBeUndefined();
    }
  });

  test('character values match charToValue', () => {
    const dump = dumpSeedChars('AA9A-AAGS-W634');
    for (const c of dump.chars) {
      expect(c.value).toBe(charToValue(c.char));
    }
  });

  test('returns normalized seed', () => {
    const dump = dumpSeedChars('aa9a-aags-w634');
    expect(dump.seed).toBe('AA9A-AAGS-W634');
  });
});
