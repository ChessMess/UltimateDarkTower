// pcg32.js — the engine-local PRNG (rules-engine contract §6, decision #2).
// NOT UDT's SystemRandom (that stays confined to official-seed parsing). The official
// 12-char seed never seeds this generator. State (state+inc) serializes into EngineState
// so checkpoints/replays reproduce draws bit-identically.
//
// Reference: PCG32 (O'Neill). 64-bit LCG state, 32-bit xsh-rr output. BigInt math.

const MASK64 = (1n << 64n) - 1n;
const MULT = 6364136223846793005n;

// FNV-1a 64-bit over a string → BigInt, to derive seed/seq from a runtime seed string.
function fnv1a64(str) {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < str.length; i++) {
    h ^= BigInt(str.charCodeAt(i) & 0xff);
    h = (h * 0x100000001b3n) & MASK64;
  }
  return h;
}

function nextUint32(rng) {
  const oldstate = rng.state;
  rng.state = (oldstate * MULT + rng.inc) & MASK64;
  const xorshifted = Number(((oldstate >> 18n) ^ oldstate) >> 27n & 0xffffffffn);
  const rot = Number(oldstate >> 59n);
  // 32-bit rotate-right
  const out = ((xorshifted >>> rot) | (xorshifted << ((-rot >>> 0) & 31))) >>> 0;
  return out;
}

// Create from a runtime seed string (opts.seed). Deterministic.
function create(seedStr) {
  const initstate = fnv1a64("state:" + seedStr);
  const initseq = fnv1a64("seq:" + seedStr);
  const rng = { state: 0n, inc: ((initseq << 1n) | 1n) & MASK64 };
  nextUint32(rng);
  rng.state = (rng.state + initstate) & MASK64;
  nextUint32(rng);
  return rng;
}

// Uniform integer in [min, max] inclusive, via rejection sampling (no modulo bias).
function nextRange(rng, min, max) {
  if (max < min) throw new Error("pcg32.nextRange: max < min");
  const span = (max - min + 1) >>> 0;
  if (span === 0) return min; // full 32-bit span
  const threshold = (0x100000000 % span);
  let r;
  do { r = nextUint32(rng); } while (r < threshold);
  return min + (r % span);
}

// Serialize/deserialize the generator state for EngineState (BigInt → string).
function serialize(rng) { return { state: rng.state.toString(), inc: rng.inc.toString() }; }
function deserialize(obj) { return { state: BigInt(obj.state), inc: BigInt(obj.inc) }; }

module.exports = { create, nextUint32, nextRange, serialize, deserialize, fnv1a64 };
