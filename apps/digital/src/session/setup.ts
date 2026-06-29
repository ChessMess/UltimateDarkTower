/**
 * New-game setup helpers (PRD-04 FR-04.2): turn an official **seed string** into a
 * partially-filled `GameConfig`. The seed encodes the adversary, the three tiered foes,
 * difficulty, and player count — but NOT the heroes, their home kingdoms, or the main
 * goal, so those are preserved from the caller's base config and entered by hand.
 *
 * `decodeSeed` returns display *names* (e.g. "Shadow Wolves", "Ashstrider"); the session
 * stores stable *ids* (e.g. "shadow-wolves"), so we map through `FOE_BY_NAME`.
 */
import { decodeSeed, FOE_BY_NAME, type Difficulty as SeedDifficulty } from '@/lib/udtData';
import type { Difficulty, GameConfig } from './types';

/** Thrown when a pasted seed can't be decoded; carries a player-facing message. */
export class SeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedError';
  }
}

/** Map a foe/adversary display name to its stable roster id. */
function idForName(name: string): string | null {
  return FOE_BY_NAME[name as keyof typeof FOE_BY_NAME]?.id ?? null;
}

/** The seed parser and the session share the same difficulty literals; keep them aligned. */
function asDifficulty(d: SeedDifficulty): Difficulty {
  return d; // 'Heroic' | 'Gritty' in both
}

/**
 * Decode `seed` and fold its setup fields into `base`, returning a new config. Heroes,
 * home kingdoms, and the main goal are carried over unchanged. Player count is clamped to
 * 1–4. Throws `SeedError` (with the parser's message) on an invalid seed — callers report
 * it without crashing.
 */
export function applySeedToConfig(base: GameConfig, seed: string): GameConfig {
  let decoded;
  try {
    decoded = decodeSeed(seed);
  } catch (err) {
    throw new SeedError(err instanceof Error ? err.message : 'Invalid seed.');
  }

  const playerCount = Math.min(4, Math.max(1, decoded.playerCount));

  return {
    ...base,
    difficulty: asDifficulty(decoded.difficulty),
    playerCount,
    adversary: idForName(decoded.adversary) ?? base.adversary,
    foes: {
      level2: idForName(decoded.tier1Foe) ?? base.foes.level2,
      level3: idForName(decoded.tier2Foe) ?? base.foes.level3,
      level4: idForName(decoded.tier3Foe) ?? base.foes.level4,
    },
    seed: decoded.seed, // normalized XXXX-XXXX-XXXX
  };
}
