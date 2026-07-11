import type gsap from 'gsap';
import { RecordingAnimator } from './recordingAnimator';

const FIRMWARE_TICK_HZ = 50;
const TICK_S = 1 / FIRMWARE_TICK_HZ;
const TOTAL_LEDS = 24;

export interface DriveResult {
  /** Per-tick LED levels, layer-major-light-minor. `samples[tick][ledIndex]` */
  samples: number[][];
  /**
   * Tick index at which `onComplete` fired during the drive, or `null` if the
   * timeline did not complete within `totalTicks` (e.g. loop sequences with
   * `repeat: -1`).
   */
  completionTick: number | null;
}

/**
 * Drives a GSAP timeline forward by `totalTicks` firmware ticks (50 Hz),
 * sampling all 24 LEDs from `animator` after each seek.
 *
 * Uses `tl.totalTime(t)` to seek deterministically — the result does not
 * depend on `gsap.ticker` cadence or RAF. Loop sequences (`repeat: -1`) are
 * run for the requested window only; their `completionTick` is `null`.
 *
 * The caller is responsible for resetting `animator` (or building a fresh
 * one) before calling.
 */
export function driveSequence(
  build: (onComplete: () => void) => gsap.core.Timeline | null,
  animator: RecordingAnimator,
  totalTicks: number,
): DriveResult {
  let completionTick: number | null = null;
  const tl = build(() => {
    if (completionTick === null) completionTick = currentTick;
  });
  if (!tl) {
    throw new Error('driveSequence: builder returned null');
  }
  // Pause so we can seek deterministically. The TS builders construct
  // timelines that auto-play; pausing immediately after returns control to us.
  tl.pause();

  const samples: number[][] = new Array(totalTicks);
  let currentTick = 0;
  for (let tick = 0; tick < totalTicks; tick++) {
    currentTick = tick;
    tl.totalTime(tick * TICK_S);
    samples[tick] = animator.snapshot();
  }
  // Seek one tick past the end so onComplete fires on non-loop sequences.
  // For loop sequences (repeat: -1), totalDuration is Infinity and onComplete
  // never fires, so the seek is effectively a no-op for them.
  if (Number.isFinite(tl.totalDuration())) {
    tl.totalTime(tl.totalDuration() + TICK_S);
  }
  tl.kill();

  if (samples.length !== totalTicks || samples.some((s) => s.length !== TOTAL_LEDS)) {
    throw new Error('driveSequence: sample shape mismatch');
  }
  return { samples, completionTick };
}
