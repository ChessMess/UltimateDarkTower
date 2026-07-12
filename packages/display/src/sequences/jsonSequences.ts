import { TOWER_LIGHT_SEQUENCES } from 'ultimatedarktower';
import { Sequence } from './schema';

import defeatJson from './data/defeat.json';
import monthStartedJson from './data/monthStarted.json';
import slowFlareThenFadeJson from './data/slowFlareThenFade.json';
import victoryJson from './data/victory.json';
import flareThenFadeJson from './data/flareThenFade.json';
import flareThenFadeBaseJson from './data/flareThenFadeBase.json';
import gloat01Json from './data/gloat01.json';
import gloat02Json from './data/gloat02.json';
import gloat03Json from './data/gloat03.json';
import wholeTowerBreathingJson from './data/wholeTowerBreathing.json';
import rotationAllDrumsJson from './data/rotationAllDrums.json';
import rotationDrumTopJson from './data/rotationDrumTop.json';
import rotationDrumMiddleJson from './data/rotationDrumMiddle.json';
import rotationDrumBottomJson from './data/rotationDrumBottom.json';
import dungeonIdleJson from './data/dungeonIdle.json';
import twinkleJson from './data/twinkle.json';
import flareThenFlickerJson from './data/flareThenFlicker.json';
import angryStrobe01Json from './data/angryStrobe01.json';
import angryStrobe02Json from './data/angryStrobe02.json';
import angryStrobe03Json from './data/angryStrobe03.json';
import sealRevealJson from './data/sealReveal.json';

/**
 * Lookup tables for the data-driven sequence player.
 *
 * `JSON_SEQUENCE_DATA` holds per-id parsed JSON for the 21 firmware sequences.
 * Each entry is wrapped in `parseSafe` so a malformed JSON only loses its own
 * sequence — the dispatcher returns `false` for the affected id and the
 * renderer plays nothing (the `console.error` from `parseSafe` is the runtime
 * signal). The parity test in `tests/sequenceSnapshots/parity.test.ts` has a
 * completeness assertion that fails CI if a `SEQUENCES`-listed id is missing.
 */

/**
 * Safe-parse a JSON sequence. Returns `null` and logs (with the file label
 * and Zod error path) on schema failure, so a typo in one sequence file
 * doesn't crash the whole module — the failed id is simply dropped from
 * `JSON_SEQUENCE_DATA` and the renderer plays nothing for it.
 */
export function parseSafe(label: string, raw: unknown): Sequence | null {
  const result = Sequence.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('\n');
    console.error(`[jsonSequences] Failed to parse '${label}':\n${issues}`);
    return null;
  }
  return result.data;
}

/**
 * Per-id parsed JSON data. Each entry is wrapped in `parseSafe` so a
 * malformed JSON only loses its own sequence — a missing id makes
 * `SequenceAnimator.apply(id)` return `false` and the renderer plays nothing.
 */
export const JSON_SEQUENCE_DATA: ReadonlyMap<number, Sequence> = new Map(
  (
    [
      [TOWER_LIGHT_SEQUENCES.defeat, parseSafe('defeat', defeatJson)],
      [TOWER_LIGHT_SEQUENCES.monthStarted, parseSafe('monthStarted', monthStartedJson)],
      [
        TOWER_LIGHT_SEQUENCES.slowFlareThenFade,
        parseSafe('slowFlareThenFade', slowFlareThenFadeJson),
      ],
      [TOWER_LIGHT_SEQUENCES.victory, parseSafe('victory', victoryJson)],
      [TOWER_LIGHT_SEQUENCES.flareThenFade, parseSafe('flareThenFade', flareThenFadeJson)],
      [
        TOWER_LIGHT_SEQUENCES.flareThenFadeBase,
        parseSafe('flareThenFadeBase', flareThenFadeBaseJson),
      ],
      [TOWER_LIGHT_SEQUENCES.gloat01, parseSafe('gloat01', gloat01Json)],
      [TOWER_LIGHT_SEQUENCES.gloat02, parseSafe('gloat02', gloat02Json)],
      [TOWER_LIGHT_SEQUENCES.gloat03, parseSafe('gloat03', gloat03Json)],
      [
        TOWER_LIGHT_SEQUENCES.wholeTowerBreathing,
        parseSafe('wholeTowerBreathing', wholeTowerBreathingJson),
      ],
      [TOWER_LIGHT_SEQUENCES.rotationAllDrums, parseSafe('rotationAllDrums', rotationAllDrumsJson)],
      [TOWER_LIGHT_SEQUENCES.rotationDrumTop, parseSafe('rotationDrumTop', rotationDrumTopJson)],
      [
        TOWER_LIGHT_SEQUENCES.rotationDrumMiddle,
        parseSafe('rotationDrumMiddle', rotationDrumMiddleJson),
      ],
      [
        TOWER_LIGHT_SEQUENCES.rotationDrumBottom,
        parseSafe('rotationDrumBottom', rotationDrumBottomJson),
      ],
      [TOWER_LIGHT_SEQUENCES.dungeonIdle, parseSafe('dungeonIdle', dungeonIdleJson)],
      [TOWER_LIGHT_SEQUENCES.twinkle, parseSafe('twinkle', twinkleJson)],
      [TOWER_LIGHT_SEQUENCES.flareThenFlicker, parseSafe('flareThenFlicker', flareThenFlickerJson)],
      [TOWER_LIGHT_SEQUENCES.angryStrobe01, parseSafe('angryStrobe01', angryStrobe01Json)],
      [TOWER_LIGHT_SEQUENCES.angryStrobe02, parseSafe('angryStrobe02', angryStrobe02Json)],
      [TOWER_LIGHT_SEQUENCES.angryStrobe03, parseSafe('angryStrobe03', angryStrobe03Json)],
      [TOWER_LIGHT_SEQUENCES.sealReveal, parseSafe('sealReveal', sealRevealJson)],
    ] as ReadonlyArray<[number, Sequence | null]>
  ).filter((kv): kv is [number, Sequence] => kv[1] !== null),
);

/**
 * `true` iff the sequence id has a JSON entry the player can build. Internal
 * predicate for gating on whether a given `led_sequence` will produce a
 * renderable timeline. Not part of the package's public API.
 */
export function hasSequenceAnimation(sequenceId: number): boolean {
  return JSON_SEQUENCE_DATA.has(sequenceId);
}
