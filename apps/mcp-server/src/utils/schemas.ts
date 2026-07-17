import { z } from 'zod';
import { TOWER_SIDES } from 'ultimatedarktower';
import { TOWER_LIGHT_SEQUENCES } from 'ultimatedarktowerdata';

// Tower navigation
export const TowerSideSchema = z.enum(['north', 'south', 'east', 'west']);
export const TowerLevelsSchema = z.enum(['top', 'middle', 'bottom']);
export const TowerCornerSchema = z.enum(['northeast', 'southeast', 'southwest', 'northwest']);

// Light effects — style is a string key into LIGHT_EFFECTS
export const LightEffectNameSchema = z
  .enum(['off', 'on', 'breathe', 'breatheFast', 'breathe50percent', 'flicker'])
  .describe('Light effect name');

// Base light levels
export const BaseLightLevelSchema = z.enum(['top', 'bottom', 'a', 'b']);

// Light configuration schemas
export const DoorwayLightSchema = z.object({
  position: TowerSideSchema,
  level: TowerLevelsSchema,
  style: LightEffectNameSchema,
});

export const LedgeLightSchema = z.object({
  position: TowerCornerSchema,
  style: LightEffectNameSchema,
});

export const BaseLightPositionSchema = z.object({
  side: TowerSideSchema,
  level: BaseLightLevelSchema,
});

export const BaseLightSchema = z.object({
  position: BaseLightPositionSchema,
  style: LightEffectNameSchema,
});

export const LightsSchema = z.object({
  doorway: z.array(DoorwayLightSchema).optional(),
  ledge: z.array(LedgeLightSchema).optional(),
  base: z.array(BaseLightSchema).optional(),
});

// Seals
export const SealIdentifierSchema = z.object({
  side: TowerSideSchema,
  level: TowerLevelsSchema,
});

// Glyphs
export const GlyphSchema = z.enum(['cleanse', 'quest', 'battle', 'banner', 'reinforce']);

// Audio
export const SoundIndexSchema = z
  .number()
  .int()
  .min(1)
  .max(113)
  .describe('Sound index (1-113) from tower audio library');

export const VolumeSchema = z
  .number()
  .int()
  .min(0)
  .max(3)
  .describe('0=Loud, 1=Medium, 2=Quiet, 3=Mute');

export const StatefulVolumeSchema = z
  .number()
  .int()
  .min(0)
  .max(3)
  .describe('0=Loud, 1=Medium, 2=Quiet, 3=Soft');

// Drums
export const DrumLevelSchema = z.enum(['top', 'middle', 'bottom']);

// Light sequences
//
// Derived from core rather than hardcoded: the previous 0x13 ceiling was written when
// there were 19 sequences and silently went stale when core added wholeTowerBreathing
// (0x14) and slowFlareThenFade (0x15), making them unreachable by ID while
// tower_light_sequence_by_name still played them. The values are contiguous, so a
// range check is exact.
const lightSequenceValues = Object.values(TOWER_LIGHT_SEQUENCES);
export const LIGHT_SEQUENCE_MIN = Math.min(...lightSequenceValues);
export const LIGHT_SEQUENCE_MAX = Math.max(...lightSequenceValues);
export const LIGHT_SEQUENCE_COUNT = lightSequenceValues.length;

export const LightSequenceSchema = z
  .number()
  .int()
  .min(LIGHT_SEQUENCE_MIN)
  .max(LIGHT_SEQUENCE_MAX)
  .describe(
    `Light sequence ID (${LIGHT_SEQUENCE_MIN}-${LIGHT_SEQUENCE_MAX}) from TOWER_LIGHT_SEQUENCES`,
  );

// --- Tower state ---
//
// Mirrors the TowerState interface from ultimatedarktower. Bounds come from what
// rtdt_pack_state does with each field: it indexes fixed-length tuples and masks
// values into bit fields, so an out-of-range number is not rejected there — it is
// silently truncated (a drum position of 999 masks to 3 and rotates the wrong way).
// The fixed lengths matter as much as the types: the packer reads drum[0..2] and
// layer[0..5].light[0..3] unconditionally and throws on a short array.

const DrumStateSchema = z.object({
  jammed: z.boolean(),
  calibrated: z.boolean(),
  position: z
    .number()
    .int()
    .min(0)
    .max(TOWER_SIDES.length - 1)
    .describe('Index into TOWER_SIDES (0=north, 1=east, 2=south, 3=west)'),
  playSound: z.boolean(),
  reverse: z.boolean(),
});

// effect is packed into 3 bits; LIGHT_EFFECTS currently defines 0-5.
const LightStateSchema = z.object({
  effect: z.number().int().min(0).max(7).describe('Light effect value from LIGHT_EFFECTS'),
  loop: z.boolean(),
});

const LayerStateSchema = z.object({
  light: z.tuple([LightStateSchema, LightStateSchema, LightStateSchema, LightStateSchema]),
});

export const TowerStateSchema = z
  .object({
    drum: z
      .tuple([DrumStateSchema, DrumStateSchema, DrumStateSchema])
      .describe('Exactly three drums, in TOWER_LEVELS order (top, middle, bottom)'),
    layer: z
      .tuple([
        LayerStateSchema,
        LayerStateSchema,
        LayerStateSchema,
        LayerStateSchema,
        LayerStateSchema,
        LayerStateSchema,
      ])
      .describe('Exactly six LED layers, in TOWER_LAYERS order'),
    audio: z.object({
      sample: z.number().int().min(0).max(0x7f).describe('Audio sample index (7 bits)'),
      loop: z.boolean(),
      volume: z.number().int().min(0).max(3).describe('0=Loud, 1=Medium, 2=Quiet, 3=Mute'),
    }),
    beam: z.object({
      count: z.number().int().min(0).max(0xffff).describe('Beam-break counter (16 bits)'),
      fault: z.boolean(),
    }),
    led_sequence: z.number().int().min(0).max(0xff).describe('LED sequence ID'),
  })
  .describe('Complete TowerState object to send to the tower');
