// Pure, DOM-free logic extracted from TowerController.ts so it can be unit-tested.
//
// TowerController.ts is one ~3k-line module of window-assigned handlers wired to inline
// `onclick=` attributes, so nothing in it was reachable from a test. These three helpers are the
// highest-risk arithmetic in that file — they drive physical hardware — so they live here as
// exported functions the DOM handlers call. Keeping them pure (inputs → outputs, no Tower / no
// document) is what makes them testable.

import {
  type TowerSide,
  type TowerCorner,
  type TowerLevels,
  TOWER_LAYERS,
  getTowerLayerForLevel,
  getLightIndexForSide,
  getLedgeLightIndexForSide,
  getBaseLightIndexForSide,
} from 'ultimatedarktower';

// ---- Glyph rotation math (moveGlyph) ----

// Drum sides in clockwise order. Rotating a drum level one step clockwise advances every glyph on
// that level by one side, so "steps to move a glyph" and "steps to advance its drum" are the same
// number — which is why the old moveGlyph computed the same quantity twice (rotationSteps, then
// glyphSteps). This module computes it once.
export const SIDES = ['north', 'east', 'south', 'west'] as const;
export type SideName = (typeof SIDES)[number];

export type GlyphMove =
  | { ok: true; rotationSteps: number; targetDrumPosition: SideName }
  | { ok: false; reason: 'invalid-side' | 'already-at-target' };

/**
 * Compute the drum rotation that moves a single glyph to `targetSide`.
 *
 * A glyph is fixed to one drum level. Advancing that drum by N clockwise steps moves the glyph N
 * sides clockwise, so the steps needed equal `(targetSide - currentGlyphSide) mod 4`, and the
 * drum's new facing is its current facing advanced by that same amount.
 *
 * @param currentGlyphSide the side the glyph currently faces
 * @param targetSide       the side we want the glyph to face
 * @param currentDrumSide  the current facing of the glyph's drum level
 */
export function computeGlyphMove(
  currentGlyphSide: string,
  targetSide: string,
  currentDrumSide: string,
): GlyphMove {
  const currentGlyphIndex = SIDES.indexOf(currentGlyphSide as SideName);
  const targetIndex = SIDES.indexOf(targetSide as SideName);
  const currentDrumIndex = SIDES.indexOf(currentDrumSide as SideName);
  if (currentGlyphIndex === -1 || targetIndex === -1 || currentDrumIndex === -1) {
    return { ok: false, reason: 'invalid-side' };
  }

  const rotationSteps = (targetIndex - currentGlyphIndex + 4) % 4;
  if (rotationSteps === 0) return { ok: false, reason: 'already-at-target' };

  const targetDrumPosition = SIDES[(currentDrumIndex + rotationSteps) % 4];
  return { ok: true, rotationSteps, targetDrumPosition };
}

// ---- Volume stepping (volumeUp / volumeDown) ----

// The firmware volume scale is inverted: 0 = Loud … 3 = Mute (see VOLUME_DESCRIPTIONS).
export const MUTE_VOLUME = 3;

export interface VolumeStep {
  /** The new, clamped volume. */
  volume: number;
  /** False when already at the clamp boundary — the handler should no-op. */
  changed: boolean;
  /** Whether to play the feedback sound at the new volume (suppressed at Mute — inaudible). */
  playFeedback: boolean;
}

/**
 * Step the volume one notch in `direction`, clamped to [0, MUTE_VOLUME].
 *
 * The mute-guard (no feedback sound at Mute) is unified here for both directions. It can only ever
 * fire going up — down never reaches Mute — but expressing it once, direction-agnostic, is what
 * makes it exercisable in a test. A bug in this guard previously lived undetected in volumeDown.
 */
export function stepVolume(current: number, direction: 'up' | 'down'): VolumeStep {
  const volume = direction === 'up' ? Math.min(current + 1, MUTE_VOLUME) : Math.max(current - 1, 0);
  const changed = volume !== current;
  return { volume, changed, playFeedback: changed && volume < MUTE_VOLUME };
}

// ---- Light checkbox ↔ tower-state address mapping (singleLight / updateLightCheckboxesFromState) ----

/** The raw light-addressing attributes a checkbox carries (as read via getAttribute). */
export interface LightAttributes {
  lightType: string | null;
  lightLocation: string | null;
  lightLevel: string | null;
  lightBaseLocation: string | null;
}

/** A resolved position in tower state: which layer, which light within it. */
export interface LightAddress {
  layerIndex: number;
  lightIndex: number;
}

/**
 * Map a checkbox's light attributes to its (layerIndex, lightIndex) in tower state.
 *
 * `singleLight` (write) and `updateLightCheckboxesFromState` (read) are declared inverses, and used
 * to carry this mapping as two verbatim copies — which is how a `TowerSide` vs `TowerCorner`
 * mismatch on the ledge branch slipped in on one side only. Routing both through this one function
 * makes them mechanically consistent: `data-light-location` is a cardinal side for doorway/base
 * rows but an ordinal corner for ledge rows, narrowed per branch below (never cast once).
 *
 * Returns null for an unknown/absent light type (the handlers bail).
 */
export function resolveLightAddress(attrs: LightAttributes): LightAddress | null {
  const { lightType, lightLocation, lightLevel, lightBaseLocation } = attrs;
  if (lightType === 'doorway') {
    return {
      layerIndex: getTowerLayerForLevel(lightLevel as TowerLevels),
      lightIndex: getLightIndexForSide(lightLocation as TowerSide),
    };
  }
  if (lightType === 'ledge') {
    return {
      layerIndex: TOWER_LAYERS.LEDGE,
      lightIndex: getLedgeLightIndexForSide(lightLocation as TowerCorner),
    };
  }
  if (lightType === 'base') {
    return {
      layerIndex: lightBaseLocation === 'b' ? TOWER_LAYERS.BASE2 : TOWER_LAYERS.BASE1,
      lightIndex: getBaseLightIndexForSide(lightLocation as TowerSide),
    };
  }
  return null;
}
