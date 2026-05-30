import type { TowerSide } from '../types';

// --- Tower Sides ---

export const SIDES: TowerSide[] = ['north', 'east', 'south', 'west'];

export const SIDE_LABELS: Record<TowerSide, string> = {
  north: 'N',
  east: 'E',
  south: 'S',
  west: 'W',
};

export const SIDE_AZIMUTH: Record<TowerSide, number> = {
  north: 0,
  east: Math.PI / 2,
  south: Math.PI,
  west: -Math.PI / 2,
};

// --- LED Layer Layout ---

/** Number of LED layers on the tower (TOP/MIDDLE/BOTTOM_RING, LEDGE, BASE1, BASE2). */
export const TOWER_LAYER_COUNT = 6;
/** Lights per layer — cardinal for rings, corners for ledge/base. */
export const LIGHTS_PER_LAYER = 4;

/** Cardinal azimuths (rad) for ring lights. Indexed by RING_LIGHT_POSITIONS (N=0, E=1, S=2, W=3). */
export const RING_AZIMUTH: readonly number[] = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

/** Layer-index (0/1/2) → seal level string. Aligned with LED_LAYOUT.topY/middleY/bottomY. */
export const RING_LEVEL_BY_LAYER_INDEX: readonly ('top' | 'middle' | 'bottom')[] = [
  'top',
  'middle',
  'bottom',
];

// --- Drum Rotation ---

/** Drum-array index (0/1/2) → drum level. Matches `state.drum[i]`. */
export const DRUM_LEVELS_BY_INDEX: readonly ('top' | 'middle' | 'bottom')[] = [
  'top',
  'middle',
  'bottom',
];

/** Radians of Y-rotation per cardinal step (N→E→S→W). Sign chosen so position 0 = base orientation. Flip if drums rotate the wrong way visually. */
export const DRUM_RADIANS_PER_SIDE = -Math.PI / 2;

/** Rotation tween duration when a drum's `position` changes via applyState. */
export const DRUM_ROTATION_DURATION_S = 0.6;

/** Easing curve for drum rotation tweens. */
export const DRUM_ROTATION_EASE = 'power2.inOut';

/** Corner azimuths (rad) for ledge/base lights. Indexed by LEDGE_BASE_LIGHT_POSITIONS (NE=0, SE=1, SW=2, NW=3). */
export const CORNER_AZIMUTH: readonly number[] = [
  Math.PI / 4,
  (3 * Math.PI) / 4,
  (5 * Math.PI) / 4,
  (7 * Math.PI) / 4,
];

/**
 * LED geometry constants, all expressed as fractions of the model's bounding
 * sphere radius so the layout scales if the GLB is swapped. Initial values are
 * educated guesses — tuning is expected with `debug3D: true`.
 */

/**
 * Radial placement of the seal LED proxy mesh, as a fraction of modelRadius.
 * Must sit between the central axis and the drum's inner wall so light travels
 * drum-interior → glyph/chute → seal → camera in the correct order.
 * (The red ring halo lights use ringInsetRadius = 0.35; seal LEDs go deeper.)
 */
export const SEAL_LED_RADIUS_FACTOR = 0.15;

export const LED_LAYOUT = {
  topY: 0.83,
  middleY: 0.53,
  bottomY: 0.23,
} as const;

/**
 * Position of the 4 ledge-ring LEDs, as fractions of modelRadius.
 * `y` is the vertical height; `radius` is the outward distance from the tower axis.
 * `azimuthOffset` rotates all 4 lights around the tower axis (radians, positive = CCW from above).
 */
export const LEDGE_LED_LAYOUT = {
  y: 0.08,
  radius: 0.35,
  /** Rotation (radians) applied to all 4 corner azimuths. Positive = counter-clockwise from above. */
  azimuthOffset: 0.0,
} as const;

/**
 * Position of the 4 BASE1 LEDs (layer 4), as fractions of modelRadius.
 * `y` is the vertical height; `radius` is the outward distance from the tower axis.
 * `azimuthOffset` rotates all 4 lights around the tower axis (radians, positive = CCW from above).
 */
export const BASE1_LED_LAYOUT = {
  y: -0.02,
  radius: 0.44,
  /** Rotation (radians) applied to all 4 corner azimuths. Positive = counter-clockwise from above. */
  azimuthOffset: 0.0,
} as const;

/**
 * Position of the 4 BASE2 LEDs (layer 5), as fractions of modelRadius.
 * `y` is the vertical height; `radius` is the outward distance from the tower axis.
 * `azimuthOffset` rotates all 4 lights around the tower axis (radians, positive = CCW from above).
 */
export const BASE2_LED_LAYOUT = {
  y: -0.26,
  radius: 0.44,
  /** Rotation (radians) applied to all 4 corner azimuths. Positive = counter-clockwise from above. */
  azimuthOffset: 0.0,
} as const;

/**
 * Red light positions are independent from the amber proxy positions.
 * Ring layers (0–2): inset inside the drum so light shines outward through doors/seals.
 * Values are initial guesses; expected tuning with debug3D: true.
 */
export const RED_LIGHT_LAYOUT = {
  ringInsetRadius: 0.35,
  cornerNearSurfaceRadius: 0.52,
} as const;

/** Three.js layer reserved for objects that receive selective bloom. */
export const BLOOM_LAYER = 1;

/**
 * Multiplier applied to proxy + halo material colors to push them above the
 * UnrealBloomPass.threshold (1.0). Combined with `toneMapped: false`, this is
 * how the LED proxies select which pixels bloom: only HDR-bright pixels
 * (color × opacity > threshold) get bloom-amplified. Bloom drives the perceived
 * LED brightness — there are no per-LED PointLights.
 */
export const HDR_PROXY_SCALE = 3.0;
