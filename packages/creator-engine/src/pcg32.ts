// pcg32.ts — the engine-local PRNG (rules-engine contract §6, decision #2).
// NOT UDT's SystemRandom (that stays confined to official-seed parsing). The official
// 12-char seed never seeds this generator. State (state+inc) serializes into EngineState
// so checkpoints/replays reproduce draws bit-identically.
//
// Reference: PCG32 (O'Neill). 64-bit LCG state, 32-bit xsh-rr output. BigInt math.

import type { RngState } from './engine/types';

const MASK64 = (1n << 64n) - 1n;
const MULT = 6364136223846793005n;

// the live generator: BigInt state, distinct from the JSON-safe serialized RngState (string fields)
export interface Pcg32 {
  state: bigint;
  inc: bigint;
}

// FNV-1a 64-bit over a string → BigInt, to derive seed/seq from a runtime seed string.
export function fnv1a64(str: string): bigint {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < str.length; i++) {
    h ^= BigInt(str.charCodeAt(i) & 0xff);
    h = (h * 0x100000001b3n) & MASK64;
  }
  return h;
}

export function nextUint32(rng: Pcg32): number {
  const oldstate = rng.state;
  rng.state = (oldstate * MULT + rng.inc) & MASK64;
  const xorshifted = Number((((oldstate >> 18n) ^ oldstate) >> 27n) & 0xffffffffn);
  const rot = Number(oldstate >> 59n);
  // 32-bit rotate-right
  const out = ((xorshifted >>> rot) | (xorshifted << ((-rot >>> 0) & 31))) >>> 0;
  return out;
}

// Create from a runtime seed string (opts.seed). Deterministic.
export function create(seedStr: string): Pcg32 {
  const initstate = fnv1a64('state:' + seedStr);
  const initseq = fnv1a64('seq:' + seedStr);
  const rng: Pcg32 = { state: 0n, inc: ((initseq << 1n) | 1n) & MASK64 };
  nextUint32(rng);
  rng.state = (rng.state + initstate) & MASK64;
  nextUint32(rng);
  return rng;
}

// Uniform integer in [min, max] inclusive, via rejection sampling (no modulo bias).
export function nextRange(rng: Pcg32, min: number, max: number): number {
  if (max < min) throw new Error('pcg32.nextRange: max < min');
  const span = (max - min + 1) >>> 0;
  if (span === 0) return min; // full 32-bit span
  const threshold = 0x100000000 % span;
  let r;
  do {
    r = nextUint32(rng);
  } while (r < threshold);
  return min + (r % span);
}

// Serialize/deserialize the generator state for EngineState (BigInt → string).
export function serialize(rng: Pcg32): RngState {
  return { state: rng.state.toString(), inc: rng.inc.toString() };
}
export function deserialize(obj: RngState): Pcg32 {
  return { state: BigInt(obj.state), inc: BigInt(obj.inc) };
}

export default { create, nextUint32, nextRange, serialize, deserialize, fnv1a64 };
