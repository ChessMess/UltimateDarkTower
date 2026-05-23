import gsap from 'gsap';
import type { SequenceAnimatorDeps } from './builders/types';
import { JSON_SEQUENCE_DATA, hasSequenceAnimation } from './jsonSequences';
import * as SequencePlayer from './SequencePlayer';

export type { SequenceAnimatorDeps } from './builders/types';
export { hasSequenceAnimation };

type GSAPTimeline = ReturnType<typeof gsap.timeline>;

/**
 * Drives the active firmware-style led_sequence on top of the per-LED renderer.
 * One active timeline at a time; identical-id reapplies are no-ops, distinct
 * ids cancel-and-restart. Returns whether a sequence is currently driving the
 * LEDs so callers can suppress their normal per-LED replay.
 *
 * Backed exclusively by the JSON-driven `SequencePlayer`. Sequence data lives
 * in `src/sequences/data/*.json`, parsed at module load into
 * `JSON_SEQUENCE_DATA`.
 */
export class SequenceAnimator {
  private currentTimeline: GSAPTimeline | null = null;
  private currentSequenceId = 0;
  /**
   * When true, the currently-playing sequence was started by a transient
   * caller (e.g. `playSequence()`), not by a state-mirror `apply(seqId)` call.
   * `apply(0)` becomes a no-op while this is true, so subsequent state-driven
   * `applyState` calls (which always carry `led_sequence === 0` for consumers
   * driving from fire-and-forget command channels) do not kill the sequence
   * mid-playback. Cleared automatically when the timeline completes.
   */
  private currentIsTransient = false;

  constructor(private readonly deps: SequenceAnimatorDeps) {}

  apply(sequenceId: number, onComplete: () => void): boolean {
    if (sequenceId === 0) {
      // Don't kill a transient-driven sequence with state-mirror resets.
      if (this.currentIsTransient && this.currentTimeline) {
        return true;
      }
      this.stop();
      return false;
    }
    if (sequenceId === this.currentSequenceId && this.currentTimeline) {
      return true;
    }
    this.stop();

    const json = JSON_SEQUENCE_DATA.get(sequenceId);
    if (!json) return false;
    const timeline = SequencePlayer.build(
      json,
      this.deps,
      this.wrapComplete(onComplete),
    );
    if (!timeline) return false;
    this.currentSequenceId = sequenceId;
    this.currentTimeline = timeline;
    this.currentIsTransient = false;
    return true;
  }

  /**
   * Fire a sequence as a transient command — independent of the state-driven
   * `apply()` pipeline. While the sequence is playing, subsequent `apply(0)`
   * calls (the typical state-mirror reset shape) become no-ops, so the
   * sequence plays to completion even if state-driven calls arrive with
   * `led_sequence === 0` immediately afterward.
   *
   * Distinct-id transient calls replace any active sequence (transient or
   * state-driven), matching the existing one-active-timeline semantic. Same-id
   * calls while active are no-ops.
   *
   * Returns true if the sequence started (or was already running), false for
   * an unknown sequence id.
   */
  applyTransient(sequenceId: number, onComplete?: () => void): boolean {
    if (sequenceId === 0) return false;
    if (sequenceId === this.currentSequenceId && this.currentTimeline) {
      this.currentIsTransient = true;
      return true;
    }
    this.stop();
    const json = JSON_SEQUENCE_DATA.get(sequenceId);
    if (!json) return false;
    const timeline = SequencePlayer.build(
      json,
      this.deps,
      this.wrapComplete(onComplete ?? (() => { /* no-op */ })),
    );
    if (!timeline) return false;
    this.currentSequenceId = sequenceId;
    this.currentTimeline = timeline;
    this.currentIsTransient = true;
    return true;
  }

  stop(): void {
    this.currentTimeline?.kill();
    this.currentTimeline = null;
    this.currentSequenceId = 0;
    this.currentIsTransient = false;
  }

  isActive(sequenceId: number): boolean {
    return this.currentSequenceId === sequenceId && this.currentTimeline !== null;
  }

  dispose(): void {
    this.stop();
  }

  private wrapComplete(onComplete: () => void): () => void {
    return () => {
      this.currentSequenceId = 0;
      this.currentTimeline = null;
      this.currentIsTransient = false;
      onComplete();
    };
  }
}
