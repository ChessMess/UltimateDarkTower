import gsap from 'gsap';
import { FIRMWARE_TICK_HZ } from './sequenceMetadata';
import type { SequenceAnimatorDeps } from './builders/types';
import { setAll } from './builders/ledSequenceOps';
import type { Sequence, Track } from './schema';

import { solidHandler } from './playerKinds/solid';
import { linearRampHandler } from './playerKinds/linearRamp';
import { scaleAllHandler } from './playerKinds/scaleAll';
import { discreteSetHandler } from './playerKinds/discreteSet';
import { exponentialRampHandler } from './playerKinds/exponentialRamp';
import { flickerStepHandler } from './playerKinds/flickerStep';
import { breatheHandler } from './playerKinds/breathe';
import { rotationChaseHandler } from './playerKinds/rotationChase';
import { pulseFlickerHandler } from './playerKinds/pulseFlicker';

/**
 * Data-driven sequence player. Takes a parsed JSON sequence and produces a
 * GSAP timeline reproducing the firmware's LED behavior. Reuses the firmware
 * primitives in `builders/ledSequenceOps.ts` and `builders/ledMath.ts` so the
 * math matches the reference behavior captured in the parity snapshots.
 */

const TICK_S = 1 / FIRMWARE_TICK_HZ;

/**
 * A kind handler schedules `tl.call` / `tl.to` operations onto the supplied
 * timeline at firmware-tick offsets. Allocates per-track state (e.g.
 * shadow arrays, flicker target buffers) inside the handler closure.
 */
export type KindHandler<TKind extends Track['kind']> = (
  track: Extract<Track, { kind: TKind }>,
  tl: gsap.core.Timeline,
  deps: SequenceAnimatorDeps,
) => void;

/**
 * Registry of kind handlers, populated at module load via `registerKindHandler`.
 *
 * Stored as an opaque (track, tl, deps) => void to keep the dispatch typed at
 * the registration site without fighting TS's variance on discriminated
 * generics; the runtime `track.kind` lookup guarantees we hand the right
 * shape to the handler.
 */
type AnyHandler = (track: Track, tl: gsap.core.Timeline, deps: SequenceAnimatorDeps) => void;
const KIND_HANDLERS = new Map<Track['kind'], AnyHandler>();

export function registerKindHandler<TKind extends Track['kind']>(
  kind: TKind,
  handler: KindHandler<TKind>,
): void {
  KIND_HANDLERS.set(kind, handler as AnyHandler);
}

// Register the nine data-driven kind handlers at module load. `custom` is
// dispatched separately below via CUSTOM_HANDLERS.
registerKindHandler('solid', solidHandler);
registerKindHandler('linearRamp', linearRampHandler);
registerKindHandler('scaleAll', scaleAllHandler);
registerKindHandler('discreteSet', discreteSetHandler);
registerKindHandler('exponentialRamp', exponentialRampHandler);
registerKindHandler('flickerStep', flickerStepHandler);
registerKindHandler('breathe', breatheHandler);
registerKindHandler('rotationChase', rotationChaseHandler);
registerKindHandler('pulseFlicker', pulseFlickerHandler);

/**
 * Custom-track handlers are resolved by string id against this registry.
 * Sequences that need bespoke procedural logic can register a function here
 * from outside the player. None are registered initially.
 */
const CUSTOM_HANDLERS = new Map<
  string,
  (
    params: Record<string, unknown> | undefined,
    tl: gsap.core.Timeline,
    deps: SequenceAnimatorDeps,
  ) => void
>();

export function registerCustomHandler(
  handlerId: string,
  fn: (
    params: Record<string, unknown> | undefined,
    tl: gsap.core.Timeline,
    deps: SequenceAnimatorDeps,
  ) => void,
): void {
  CUSTOM_HANDLERS.set(handlerId, fn);
}

/**
 * Build a GSAP timeline from a parsed sequence. Returns `null` if `sequence`
 * is null/undefined (e.g. the JSON parse failed earlier and `parseSafe`
 * returned null). `SequenceAnimator.apply` treats a `null` timeline as an
 * unknown sequence and returns `false` (the renderer plays nothing).
 */
export function build(
  sequence: Sequence | null | undefined,
  deps: SequenceAnimatorDeps,
  onComplete: () => void,
): gsap.core.Timeline | null {
  if (!sequence) return null;

  const tl = gsap.timeline({ onComplete, repeat: sequence.loop ? -1 : 0 });

  for (const track of sequence.tracks) {
    if (track.kind === 'custom') {
      const handler = CUSTOM_HANDLERS.get(track.handlerId);
      if (!handler) {
        console.warn(
          `[SequencePlayer] Unknown custom handlerId '${track.handlerId}' in sequence '${sequence.name}'; track skipped.`,
        );
        continue;
      }
      handler(track.params, tl, deps);
      continue;
    }
    const dispatcher = KIND_HANDLERS.get(track.kind);
    if (!dispatcher) {
      console.warn(
        `[SequencePlayer] No handler for kind '${track.kind}' in sequence '${sequence.name}'; track skipped.`,
      );
      continue;
    }
    dispatcher(track, tl, deps);
  }

  // End anchor — schedule at totalTicks so onComplete fires at the right time.
  // For loop sequences, the schema rejects cutToBlack at parse time (would
  // zero LEDs every iteration); the `!sequence.loop` check is a defensive
  // belt-and-suspenders.
  const endTime = sequence.totalTicks * TICK_S;
  if (!sequence.loop && sequence.endBehavior === 'cutToBlack') {
    tl.call(() => setAll(deps.ledAnimator, 0), undefined, endTime);
  } else {
    // 'hold' (or any loop) — pad the timeline to totalTicks without writing.
    tl.to({}, { duration: 0 }, endTime);
  }

  return tl;
}
