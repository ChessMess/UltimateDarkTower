/**
 * Aggregator for the nine data-driven kind schemas + the `custom`
 * escape-hatch. Each kind file exports a Zod schema; this module composes
 * them into the discriminated `Track` union.
 *
 * Handler registration lives in `SequencePlayer.ts` (which imports each kind
 * file directly), keeping this module free of any dependency on the player
 * — that breaks the schema ↔ player import cycle.
 */
import { z } from 'zod';

import { SolidTrack } from './solid';
import { LinearRampTrack } from './linearRamp';
import { ScaleAllTrack } from './scaleAll';
import { DiscreteSetTrack } from './discreteSet';
import { ExponentialRampTrack } from './exponentialRamp';
import { FlickerStepTrack } from './flickerStep';
import { BreatheTrack } from './breathe';
import { RotationChaseTrack } from './rotationChase';
import { PulseFlickerTrack } from './pulseFlicker';
import { CustomTrack } from './custom';

/**
 * Discriminated union of all track kinds. `custom` is last as the escape
 * hatch; the eight data-driven kinds cover every existing sequence.
 */
export const Track = z.discriminatedUnion('kind', [
  SolidTrack,
  LinearRampTrack,
  ScaleAllTrack,
  DiscreteSetTrack,
  ExponentialRampTrack,
  FlickerStepTrack,
  BreatheTrack,
  RotationChaseTrack,
  PulseFlickerTrack,
  CustomTrack,
]);
export type Track = z.infer<typeof Track>;
