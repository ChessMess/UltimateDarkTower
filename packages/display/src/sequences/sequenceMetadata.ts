import { TOWER_LIGHT_SEQUENCES } from 'ultimatedarktowerdata';

export type SequenceConfidence = 'unknown' | 'approximate' | 'observed' | 'implemented';

export type SequenceLoopMode = 'one-shot' | 'looping' | 'hold';

export type SequenceEndStatePolicy = 'restore-base' | 'hold-last' | 'all-off';

export type SequenceLayerMask = readonly number[];

export interface SequenceMetadata {
  readonly name: keyof typeof TOWER_LIGHT_SEQUENCES;
  readonly id: number;
  readonly confidence: SequenceConfidence;
  readonly layers: SequenceLayerMask | 'all';
  readonly sideSpecific: boolean;
  readonly autoFaceSide: boolean;
  readonly loopMode: SequenceLoopMode;
  readonly endStatePolicy: SequenceEndStatePolicy;
  readonly approxDurationMs?: number;
  readonly notes?: string;
}

export const FIRMWARE_TICK_HZ = 50;

const tickToMs = (ticks: number): number => Math.round((ticks * 1000) / FIRMWARE_TICK_HZ);

export const SEQUENCE_METADATA: Readonly<
  Record<keyof typeof TOWER_LIGHT_SEQUENCES, SequenceMetadata>
> = {
  twinkle: {
    name: 'twinkle',
    id: TOWER_LIGHT_SEQUENCES.twinkle,
    confidence: 'observed',
    layers: 'all',
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'looping',
    endStatePolicy: 'restore-base',
    notes:
      'Every tick: (1) ~50% chance to spawn a random LED at random PWM if its current PWM is < 20 (dark LEDs only); (2) global slow decay via lights_decay_all(768, 769) ≈ × 0.9987/tick. Lit LEDs gradually fade rather than holding forever. Loops indefinitely (no completion flag).',
  },
  flareThenFade: {
    name: 'flareThenFade',
    id: TOWER_LIGHT_SEQUENCES.flareThenFade,
    confidence: 'observed',
    layers: 'all',
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'one-shot',
    endStatePolicy: 'restore-base',
    approxDurationMs: tickToMs(95),
    notes:
      'Phase 1 (ticks 0-24, 0.5s): per-LED exponential rise (x1.25 per tick, floor 5/255, saturate 255) on all 6 layers. Phase 2 (ticks 25+): in-sequence exponential decay via lights_decay_all(768, 800) ≈ × 0.96/tick on all layers, until every LED reaches 0 (~70 ticks). Total ~95 ticks (~1.9s).',
  },
  flareThenFadeBase: {
    name: 'flareThenFadeBase',
    id: TOWER_LIGHT_SEQUENCES.flareThenFadeBase,
    confidence: 'observed',
    layers: [3, 4, 5],
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'one-shot',
    endStatePolicy: 'restore-base',
    approxDurationMs: tickToMs(95),
    notes:
      'Same algorithm as flareThenFade but the phase-1 ramp is scoped to layers 3-5 (ledge + base1 + base2). Phase 2 (lights_decay_all) still touches every layer, matching the firmware unscoped decay loop.',
  },
  flareThenFlicker: {
    name: 'flareThenFlicker',
    id: TOWER_LIGHT_SEQUENCES.flareThenFlicker,
    confidence: 'observed',
    layers: 'all',
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'looping',
    endStatePolicy: 'restore-base',
    notes:
      'Phase 1 (ticks 0-79, 1.6s): same x1.25 ramp as flareThenFade across all 6 layers (held longer so everything saturates). Phase 2 (ticks 80+): per-LED random-target lerp at alpha 0.15 — slow chaotic flicker on every LED. Loops indefinitely (no completion flag).',
  },
  angryStrobe01: {
    name: 'angryStrobe01',
    id: TOWER_LIGHT_SEQUENCES.angryStrobe01,
    confidence: 'observed',
    layers: 'all',
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'one-shot',
    endStatePolicy: 'restore-base',
    approxDurationMs: tickToMs(160),
    notes:
      'Phase 1 (ticks 0-120): per-LED random-target lerp at alpha 0.4 — chaotic flicker, mean ≈0.25 normalized with occasional kicks toward 0.5. Phase 2 (ticks 121+): no flicker writes; lights_decay_all(766, 769) ≈ × 0.996/tick smoothly drains the strobe tail. Sequence ends once tick > 160 AND every LED reaches 0.',
  },
  angryStrobe02: {
    name: 'angryStrobe02',
    id: TOWER_LIGHT_SEQUENCES.angryStrobe02,
    confidence: 'observed',
    layers: 'all',
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'one-shot',
    endStatePolicy: 'restore-base',
    approxDurationMs: tickToMs(135),
    notes:
      'Same algorithm as angryStrobe01 with a 95-tick phase 1 + slow tail-decay phase 2 (lights_decay_all(766, 769)) until every LED hits 0.',
  },
  angryStrobe03: {
    name: 'angryStrobe03',
    id: TOWER_LIGHT_SEQUENCES.angryStrobe03,
    confidence: 'observed',
    layers: 'all',
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'one-shot',
    endStatePolicy: 'restore-base',
    approxDurationMs: tickToMs(180),
    notes:
      'Same algorithm as angryStrobe01 with a 140-tick phase 1 + slow tail-decay phase 2 (lights_decay_all(766, 769)) until every LED hits 0.',
  },
  gloat01: {
    name: 'gloat01',
    id: TOWER_LIGHT_SEQUENCES.gloat01,
    confidence: 'observed',
    layers: 'all',
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'one-shot',
    endStatePolicy: 'restore-base',
    approxDurationMs: tickToMs(220),
    notes:
      '5 chortles at ticks [15, 35, 60, 80, 100] (300/700/1200/1600/2000 ms). On each chortle every LED snaps to PWM 160; every tick lights_decay_all(700, 769) ≈ × 0.910/tick drains between flashes. Ends after tick 200 once everything has decayed to 0.',
  },
  gloat02: {
    name: 'gloat02',
    id: TOWER_LIGHT_SEQUENCES.gloat02,
    confidence: 'observed',
    layers: 'all',
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'one-shot',
    endStatePolicy: 'restore-base',
    approxDurationMs: tickToMs(220),
    notes:
      'Same algorithm as gloat01 with 4 chortles at ticks [15, 40, 60, 85] (300/800/1200/1700 ms).',
  },
  gloat03: {
    name: 'gloat03',
    id: TOWER_LIGHT_SEQUENCES.gloat03,
    confidence: 'observed',
    layers: 'all',
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'one-shot',
    endStatePolicy: 'restore-base',
    approxDurationMs: tickToMs(220),
    notes:
      'Same algorithm as gloat01 with 4 chortles at ticks [25, 50, 67, 92] (500/1000/1350/1850 ms; firmware integer division gives 1350/20 = 67, not 67.5).',
  },
  defeat: {
    name: 'defeat',
    id: TOWER_LIGHT_SEQUENCES.defeat,
    confidence: 'observed',
    layers: 'all',
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'one-shot',
    endStatePolicy: 'restore-base',
    approxDurationMs: tickToMs(651),
    notes:
      'Bottom-up rise-and-hold: each layer rises 0->255 linearly over 100 ticks (2s), then saturates. Layer N onset = tick 500 - 100*N (layer 5 first at tick 0, layer 0 last at tick 500). Expires at tick 651 (~13s); all 6 layers hold at full from tick 600 onward.',
  },
  victory: {
    name: 'victory',
    id: TOWER_LIGHT_SEQUENCES.victory,
    confidence: 'observed',
    layers: 'all',
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'one-shot',
    endStatePolicy: 'restore-base',
    approxDurationMs: tickToMs(1025),
    notes:
      'Threshold-driven 9-phase build (table at firmware 0x00044ea0): reset, bottom-up rise (base → ledge → ring 2 → ring 1 → ring 0 at PWM 0xa5, ~2.6s each), then ticks 649-712 dramatic flurry (every 4th tick a random LED is dropped to PWM 128 while lights_decay_all(200, 198) ≈ × 1.01/tick ramps everything up), hold ticks 713-844, all-off at tick 845, complete near tick 1025 (~20.5s).',
  },
  dungeonIdle: {
    name: 'dungeonIdle',
    id: TOWER_LIGHT_SEQUENCES.dungeonIdle,
    confidence: 'observed',
    layers: 'all',
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'looping',
    endStatePolicy: 'restore-base',
    notes:
      'Torch-like idle. Per tick: layer 3 (ledge) cleared to 0; layers 4 and 5 (base) held at PWM 70; layer 0 (top ring) per-LED random-target lerp at alpha 0.15. Layers 1 and 2 untouched (retain prior state). Loops indefinitely.',
  },
  sealReveal: {
    name: 'sealReveal',
    id: TOWER_LIGHT_SEQUENCES.sealReveal,
    confidence: 'observed',
    layers: [0, 1, 2],
    sideSpecific: true,
    autoFaceSide: true,
    loopMode: 'one-shot',
    endStatePolicy: 'restore-base',
    approxDurationMs: tickToMs(91),
    notes:
      'Two-phase: ticks 0-59 random flicker (re-seeded every 30 ticks with decreasing magnitude); ticks 60-90 solid PWM 200; tick 91+ writes Sequence_CompletedAndNotifyApp.',
  },
  rotationAllDrums: {
    name: 'rotationAllDrums',
    id: TOWER_LIGHT_SEQUENCES.rotationAllDrums,
    confidence: 'observed',
    layers: [0, 1, 2, 3],
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'looping',
    endStatePolicy: 'restore-base',
    notes:
      'Spinning chase across all three rings. Per tick: layer 3 (DO) → PWM 180; for each chase layer, phase = (tick + 16*layer) % 48; if phase == 12*light → set to 1.0, else multiply by 700/768 ≈ × 0.911/tick (tail). 1/3-phase shift between rings; one revolution per ~48 ticks (~0.96s). Loops indefinitely.',
  },
  rotationDrumTop: {
    name: 'rotationDrumTop',
    id: TOWER_LIGHT_SEQUENCES.rotationDrumTop,
    confidence: 'observed',
    layers: [0, 3],
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'looping',
    endStatePolicy: 'restore-base',
    notes:
      'Same chase pattern as rotationAllDrums but only the top ring (layer 0) is animated. Layer 3 (DO) still steady at PWM 180. Loops indefinitely.',
  },
  rotationDrumMiddle: {
    name: 'rotationDrumMiddle',
    id: TOWER_LIGHT_SEQUENCES.rotationDrumMiddle,
    confidence: 'observed',
    layers: [1, 3],
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'looping',
    endStatePolicy: 'restore-base',
    notes:
      'Same chase pattern as rotationAllDrums but only the middle ring (layer 1) is animated. Layer 3 (DO) still steady at PWM 180. Loops indefinitely.',
  },
  rotationDrumBottom: {
    name: 'rotationDrumBottom',
    id: TOWER_LIGHT_SEQUENCES.rotationDrumBottom,
    confidence: 'observed',
    layers: [2, 3],
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'looping',
    endStatePolicy: 'restore-base',
    notes:
      'Same chase pattern as rotationAllDrums but only the bottom ring (layer 2) is animated. Layer 3 (DO) still steady at PWM 180. Loops indefinitely.',
  },
  monthStarted: {
    name: 'monthStarted',
    id: TOWER_LIGHT_SEQUENCES.monthStarted,
    confidence: 'observed',
    layers: 'all',
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'one-shot',
    endStatePolicy: 'restore-base',
    approxDurationMs: tickToMs(426),
    notes:
      'Two-phase: 175-tick bottom-up rise-and-hold sweep (defeat compressed 4x; layer N onset = tick 125 - 25*N, 25-tick rise), then 9 discrete pulses at 25-tick intervals (thresholds at firmware 0x00044ec8) writing per-LED PWM from a lookup table. Expires at tick 426 (~8.5s).',
  },
  wholeTowerBreathing: {
    name: 'wholeTowerBreathing',
    id: TOWER_LIGHT_SEQUENCES.wholeTowerBreathing,
    confidence: 'observed',
    layers: 'all',
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'looping',
    endStatePolicy: 'restore-base',
    notes:
      'Whole-tower symmetric triangle breathe. dt2 = (2 * elapsedTicks) & 0x1FF; intensity = dt2 > 0xFF ? (0x1FF - dt2) : dt2; every LED set to (intensity / 6) / 255. Period 256 ticks (~5.12s); peak ~0.167 normalized. Loops indefinitely.',
  },
  slowFlareThenFade: {
    name: 'slowFlareThenFade',
    id: TOWER_LIGHT_SEQUENCES.slowFlareThenFade,
    confidence: 'observed',
    layers: 'all',
    sideSpecific: false,
    autoFaceSide: false,
    loopMode: 'one-shot',
    endStatePolicy: 'restore-base',
    approxDurationMs: 7000,
    notes:
      'All LEDs ramp linearly 0->255 over 3s, then 255->0 over 4s. Total 7s. Firmware case lacks a `break`, so on every active tick it also runs the FlareThenFade case body — we implement only the documented intent, not the fall-through bug.',
  },
};

export const SEQUENCE_METADATA_BY_ID: ReadonlyMap<number, SequenceMetadata> = new Map(
  Object.values(SEQUENCE_METADATA).map((entry) => [entry.id, entry]),
);

export function getSequenceMetadata(id: number): SequenceMetadata | undefined {
  return SEQUENCE_METADATA_BY_ID.get(id);
}
