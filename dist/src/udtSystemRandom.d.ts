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
export declare class SystemRandom {
    private seedArray;
    private inext;
    private inextp;
    /**
     * Create a new PRNG instance with the given seed.
     * Matches C# `new System.Random(seed)` exactly.
     */
    constructor(seed: number);
    /**
     * Replicate .NET's System.Random constructor seeding algorithm.
     */
    private initialize;
    /**
     * Internal sample — returns value in range [0, Int32.MaxValue).
     * Matches C#'s InternalSample().
     */
    private internalSample;
    /**
     * Sample — returns a double in range [0.0, 1.0).
     * Matches C#'s Sample().
     */
    private sample;
    /**
     * Returns a non-negative random integer less than Int32.MaxValue.
     * Matches C# `Random.Next()`.
     */
    next(): number;
    /**
     * Returns a non-negative random integer less than maxValue.
     * Matches C# `Random.Next(maxValue)`.
     */
    nextMax(maxValue: number): number;
    /**
     * Returns a random integer in range [minValue, maxValue).
     * Matches C# `Random.Next(minValue, maxValue)`.
     */
    nextRange(minValue: number, maxValue: number): number;
    /**
     * Returns a random double in range [0.0, 1.0).
     * Matches C# `Random.NextDouble()`.
     */
    nextDouble(): number;
}
