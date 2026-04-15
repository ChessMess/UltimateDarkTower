/**
 * Tests for udtSystemRandom — verifies TypeScript implementation
 * produces identical output to C# System.Random (.NET Framework algorithm).
 *
 * Test vectors generated from the actual .NET algorithm.
 */

import { SystemRandom } from '../src/udtSystemRandom';

// ── Test Vectors ───────────────────────────────────────────────────────────
// Generated using .NET Framework's System.Random algorithm (Knuth subtractive).

describe('SystemRandom', () => {
  describe('game seed 186022107 (InitializationSeed from AA9A-AAGS-W634)', () => {
    test('Next() sequence matches C#', () => {
      const rng = new SystemRandom(186022107);
      const expected = [
        905900453, 632338475, 1126051326, 493750464, 1712952614,
        1848245383, 1818683628, 220859879, 557619172, 892656879,
        839241645, 1127367143, 128645597, 1793117455, 611271626,
        52411329, 1689882546, 327620538, 2110791698, 815982906,
      ];
      for (let i = 0; i < expected.length; i++) {
        expect(rng.next()).toBe(expected[i]);
      }
    });

    test('NextDouble() matches C#', () => {
      const rng = new SystemRandom(186022107);
      expect(rng.nextDouble()).toBeCloseTo(0.42184277131308, 12);
    });

    test('Next(100) matches C#', () => {
      const rng = new SystemRandom(186022107);
      expect(rng.nextMax(100)).toBe(42);
    });

    test('Next(10, 50) matches C#', () => {
      const rng = new SystemRandom(186022107);
      expect(rng.nextRange(10, 50)).toBe(26);
    });
  });

  describe('game seed 186022106 (QuestSeed from AA9A-AAGS-W634)', () => {
    test('Next() sequence matches C#', () => {
      const rng = new SystemRandom(186022106);
      const expected = [
        1931484281, 2226792, 1772469694, 35385261, 743394371,
        2119047781, 856489197, 1290984475, 291939581, 100769927,
        1404608531, 1598279286, 799839337, 675877772, 1255577138,
        858746564, 787168317, 1143665769, 2052658486, 2131950400,
      ];
      for (let i = 0; i < expected.length; i++) {
        expect(rng.next()).toBe(expected[i]);
      }
    });

    test('NextDouble() matches C#', () => {
      const rng = new SystemRandom(186022106);
      expect(rng.nextDouble()).toBeCloseTo(0.899417457123947, 12);
    });

    test('Next(100) matches C#', () => {
      const rng = new SystemRandom(186022106);
      expect(rng.nextMax(100)).toBe(89);
    });

    test('Next(10, 50) matches C#', () => {
      const rng = new SystemRandom(186022106);
      expect(rng.nextRange(10, 50)).toBe(45);
    });
  });

  describe('seed 0', () => {
    test('Next() sequence matches C#', () => {
      const rng = new SystemRandom(0);
      const expected = [
        1559595546, 1755192844, 1649316166, 1198642031, 442452829,
        1200195957, 1945678308, 949569752, 2099272109, 587775847,
      ];
      for (let i = 0; i < expected.length; i++) {
        expect(rng.next()).toBe(expected[i]);
      }
    });
  });

  describe('seed -1 (negative)', () => {
    test('Next() sequence matches C#', () => {
      const rng = new SystemRandom(-1);
      const expected = [
        534011718, 237820880, 1002897798, 1657007234, 1412011072,
        929393559, 760389092, 2026928803, 217468053, 1379662799,
      ];
      for (let i = 0; i < expected.length; i++) {
        expect(rng.next()).toBe(expected[i]);
      }
    });
  });

  describe('seed 1', () => {
    test('produces same sequence as seed -1 (Math.Abs)', () => {
      const rng1 = new SystemRandom(1);
      const rngNeg = new SystemRandom(-1);
      for (let i = 0; i < 10; i++) {
        expect(rng1.next()).toBe(rngNeg.next());
      }
    });
  });

  describe('seed 42', () => {
    test('Next() sequence matches C#', () => {
      const rng = new SystemRandom(42);
      const expected = [
        1434747710, 302596119, 269548474, 1122627734, 361709742,
        563913476, 1555655117, 1101493307, 372913049, 1634773126,
      ];
      for (let i = 0; i < expected.length; i++) {
        expect(rng.next()).toBe(expected[i]);
      }
    });

    test('NextDouble() matches C#', () => {
      const rng = new SystemRandom(42);
      expect(rng.nextDouble()).toBeCloseTo(0.6681064659115423, 12);
    });

    test('Next(100) matches C#', () => {
      const rng = new SystemRandom(42);
      expect(rng.nextMax(100)).toBe(66);
    });

    test('Next(10, 50) matches C#', () => {
      const rng = new SystemRandom(42);
      expect(rng.nextRange(10, 50)).toBe(36);
    });
  });

  describe('Int32.MaxValue (2147483647)', () => {
    test('Next() sequence matches C#', () => {
      const rng = new SystemRandom(2147483647);
      const expected = [
        1559595546, 1755192844, 1649316172, 1198642031, 442452829,
        1200195955, 1945678308, 949569752, 2099272109, 587775835,
      ];
      for (let i = 0; i < expected.length; i++) {
        expect(rng.next()).toBe(expected[i]);
      }
    });
  });

  describe('Int32.MinValue (-2147483648)', () => {
    test('produces same sequence as Int32.MaxValue', () => {
      const rngMin = new SystemRandom(-2147483648);
      const rngMax = new SystemRandom(2147483647);
      for (let i = 0; i < 10; i++) {
        expect(rngMin.next()).toBe(rngMax.next());
      }
    });
  });

  describe('edge cases', () => {
    test('Next() always returns non-negative', () => {
      const rng = new SystemRandom(186022107);
      for (let i = 0; i < 1000; i++) {
        const val = rng.next();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(2147483647);
      }
    });

    test('NextDouble() returns values in [0, 1)', () => {
      const rng = new SystemRandom(186022107);
      for (let i = 0; i < 1000; i++) {
        const val = rng.nextDouble();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    test('nextMax(0) returns 0', () => {
      const rng = new SystemRandom(42);
      expect(rng.nextMax(0)).toBe(0);
    });

    test('nextMax throws on negative', () => {
      const rng = new SystemRandom(42);
      expect(() => rng.nextMax(-1)).toThrow('maxValue must be non-negative');
    });

    test('nextRange throws when min > max', () => {
      const rng = new SystemRandom(42);
      expect(() => rng.nextRange(50, 10)).toThrow('minValue must be less than or equal to maxValue');
    });

    test('nextRange with equal min and max returns min', () => {
      const rng = new SystemRandom(42);
      expect(rng.nextRange(5, 5)).toBe(5);
    });

    test('two instances with same seed produce identical sequences', () => {
      const rng1 = new SystemRandom(12345);
      const rng2 = new SystemRandom(12345);
      for (let i = 0; i < 100; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });

    test('different seeds produce different sequences', () => {
      const rng1 = new SystemRandom(1);
      const rng2 = new SystemRandom(2);
      let allSame = true;
      for (let i = 0; i < 10; i++) {
        if (rng1.next() !== rng2.next()) allSame = false;
      }
      expect(allSame).toBe(false);
    });
  });
});
