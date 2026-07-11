import { LIGHT_EFFECTS } from 'ultimatedarktower';

/** Short slug labels for each LIGHT_EFFECTS value, used as the inline LED text in the readout. */
export const EFFECT_LABELS: Record<number, string> = {
  [LIGHT_EFFECTS.off]: 'off',
  [LIGHT_EFFECTS.on]: 'on',
  [LIGHT_EFFECTS.breathe]: 'breathe',
  [LIGHT_EFFECTS.breatheFast]: 'breathe-fast',
  [LIGHT_EFFECTS.breathe50percent]: 'breathe-50',
  [LIGHT_EFFECTS.flicker]: 'flicker',
};

/** Human-readable tooltip labels for each LIGHT_EFFECTS value. */
export const EFFECT_TOOLTIP_LABELS: Record<number, string> = {
  [LIGHT_EFFECTS.off]: 'Off',
  [LIGHT_EFFECTS.on]: 'On (steady)',
  [LIGHT_EFFECTS.breathe]: 'Breathe (slow)',
  [LIGHT_EFFECTS.breatheFast]: 'Breathe (fast)',
  [LIGHT_EFFECTS.breathe50percent]: 'Breathe 50%',
  [LIGHT_EFFECTS.flicker]: 'Flicker',
};

/**
 * Ordered array of LIGHT_EFFECTS values for cycling through all states.
 * Clicking an LED advances it along this sequence, wrapping at the end.
 */
export const EFFECT_CYCLE: readonly number[] = [
  LIGHT_EFFECTS.off,
  LIGHT_EFFECTS.on,
  LIGHT_EFFECTS.breathe,
  LIGHT_EFFECTS.breatheFast,
  LIGHT_EFFECTS.breathe50percent,
  LIGHT_EFFECTS.flicker,
];
