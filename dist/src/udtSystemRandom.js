"use strict";
/**
 * udtSystemRandom.ts — TypeScript replica of C# System.Random.
 *
 * Implements the .NET Framework System.Random PRNG algorithm exactly,
 * producing identical sequences for identical seeds. This is necessary
 * because Return to Dark Tower (Unity/.NET) uses System.Random for all
 * procedural generation.
 *
 * Algorithm: Modified Knuth subtractive generator.
 * Reference: .NET Framework 4.x source (unchanged since .NET 1.0).
 *
 * All arithmetic uses 32-bit signed integer semantics via (value | 0)
 * to match C#'s int overflow behavior.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemRandom = void 0;
const INT32_MAX = 0x7fffffff; // 2147483647
const MSEED = 161803398;
/**
 * Truncate a JavaScript number to a 32-bit signed integer,
 * matching C# int overflow behavior.
 */
function toInt32(n) {
    return n | 0;
}
class SystemRandom {
    /**
     * Create a new PRNG instance with the given seed.
     * Matches C# `new System.Random(seed)` exactly.
     */
    constructor(seed) {
        this.seedArray = new Array(56).fill(0);
        this.inext = 0;
        this.inextp = 0;
        this.initialize(seed);
    }
    /**
     * Replicate .NET's System.Random constructor seeding algorithm.
     */
    initialize(seed) {
        // C#: int ii; int mj, mk;
        // int subtraction = (Seed == Int32.MinValue) ? Int32.MaxValue : Math.Abs(Seed);
        let subtraction;
        if (seed === -2147483648) {
            // Int32.MinValue — Math.Abs would overflow in C#
            subtraction = INT32_MAX;
        }
        else {
            subtraction = Math.abs(seed);
        }
        // mj = MSEED - subtraction;
        let mj = toInt32(MSEED - subtraction);
        this.seedArray[55] = mj;
        // mk = 1;
        let mk = 1;
        // for (int i = 1; i < 55; i++)
        for (let i = 1; i < 55; i++) {
            // int ii = (21*i)%55;
            const ii = (21 * i) % 55;
            this.seedArray[ii] = mk;
            // mk = mj - mk;
            mk = toInt32(mj - mk);
            // if (mk<0) mk += MBIG;
            if (mk < 0)
                mk = toInt32(mk + INT32_MAX);
            mj = this.seedArray[ii];
        }
        // for (int k = 1; k < 5; k++)
        for (let k = 1; k < 5; k++) {
            // for (int i = 1; i < 56; i++)
            for (let i = 1; i < 56; i++) {
                // SeedArray[i] -= SeedArray[1+(i+30)%55];
                this.seedArray[i] = toInt32(this.seedArray[i] - this.seedArray[1 + ((i + 30) % 55)]);
                // if (SeedArray[i]<0) SeedArray[i] += MBIG;
                if (this.seedArray[i] < 0) {
                    this.seedArray[i] = toInt32(this.seedArray[i] + INT32_MAX);
                }
            }
        }
        this.inext = 0;
        this.inextp = 21;
    }
    /**
     * Internal sample — returns value in range [0, Int32.MaxValue).
     * Matches C#'s InternalSample().
     */
    internalSample() {
        let retVal;
        let locINext = this.inext;
        let locINextp = this.inextp;
        if (++locINext >= 56)
            locINext = 1;
        if (++locINextp >= 56)
            locINextp = 1;
        retVal = toInt32(this.seedArray[locINext] - this.seedArray[locINextp]);
        if (retVal === INT32_MAX)
            retVal--;
        if (retVal < 0)
            retVal = toInt32(retVal + INT32_MAX);
        this.seedArray[locINext] = retVal;
        this.inext = locINext;
        this.inextp = locINextp;
        return retVal;
    }
    /**
     * Sample — returns a double in range [0.0, 1.0).
     * Matches C#'s Sample().
     */
    sample() {
        return this.internalSample() * (1.0 / INT32_MAX);
    }
    /**
     * Returns a non-negative random integer less than Int32.MaxValue.
     * Matches C# `Random.Next()`.
     */
    next() {
        return this.internalSample();
    }
    /**
     * Returns a non-negative random integer less than maxValue.
     * Matches C# `Random.Next(maxValue)`.
     */
    nextMax(maxValue) {
        if (maxValue < 0) {
            throw new Error('maxValue must be non-negative');
        }
        return toInt32(this.sample() * maxValue);
    }
    /**
     * Returns a random integer in range [minValue, maxValue).
     * Matches C# `Random.Next(minValue, maxValue)`.
     */
    nextRange(minValue, maxValue) {
        if (minValue > maxValue) {
            throw new Error('minValue must be less than or equal to maxValue');
        }
        const range = maxValue - minValue;
        if (range <= INT32_MAX) {
            return toInt32(this.sample() * range) + minValue;
        }
        // Large range — use double precision
        return toInt32(this.internalSample() * (1.0 / INT32_MAX) * range) + minValue;
    }
    /**
     * Returns a random double in range [0.0, 1.0).
     * Matches C# `Random.NextDouble()`.
     */
    nextDouble() {
        return this.sample();
    }
}
exports.SystemRandom = SystemRandom;
//# sourceMappingURL=udtSystemRandom.js.map