/**
 * Pure math helpers that mirror primitives in the firmware's `light_manager.c`.
 *
 * Kept dependency-free so they can be unit-tested in isolation.
 */

const PWM_MAX = 255;

/**
 * One step of the firmware's `lights_decay_all(multiplier, divisor)` applied to
 * a single normalized level. The firmware operates on 8-bit PWM values via
 * integer division (`pwm = pwm * multiplier / divisor`); we mirror that math
 * in normalized 0..1 space, rounded to PWM granularity so the asymptote
 * reaches 0 (rather than getting stuck at a tiny float).
 */
export function decayLevel(level: number, multiplier: number, divisor: number): number {
  if (level <= 0) return 0;
  const pwm = Math.round(level * PWM_MAX);
  const next = Math.min(PWM_MAX, Math.max(0, Math.floor((pwm * multiplier) / divisor)));
  return next / PWM_MAX;
}

/**
 * Firmware's `map(value, in_low, in_high, out_low, out_high)` with input
 * clamping. Used for the rise/fall ramps in Defeat, MonthStart, and
 * SlowFlareThenFade.
 */
export function mapClamped(
  value: number,
  inLow: number,
  inHigh: number,
  outLow: number,
  outHigh: number,
): number {
  const clamped = value < inLow ? inLow : value > inHigh ? inHigh : value;
  if (inHigh === inLow) return outLow;
  return ((clamped - inLow) * (outHigh - outLow)) / (inHigh - inLow) + outLow;
}

/**
 * Firmware's bit-masked random target generator from `Effect_Flicker` and
 * `Sequence_AngryStrobe_*`:
 *
 *   if ((rand & 0xff) > 0xc0) {
 *     int entropy = rand();
 *     target = (entropy & ((entropy & 0xf00) == 0xf00 ? 0xff : 0xdf)) >> 1;
 *   }
 *
 * This call only generates the target value (the 25%-probability gate lives
 * in `applyFlickerStep`). 15/16 of draws use the 0xdf mask which clears bit 5,
 * biasing the distribution away from mid-high values; 1/16 use 0xff (full
 * range). After the `>> 1`, target is in [0, 127] PWM = [0, 0.498] normalized.
 */
export function randomFlickerTarget(rng: () => number = Math.random): number {
  const entropy = Math.floor(rng() * 0x10000);
  const wideMaskRoll = (entropy & 0xf00) === 0xf00;
  const mask = wideMaskRoll ? 0xff : 0xdf;
  const targetPwm = (entropy & mask) >> 1;
  return targetPwm / PWM_MAX;
}
