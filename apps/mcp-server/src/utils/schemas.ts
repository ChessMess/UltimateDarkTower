import { z } from "zod";

// Tower navigation
export const TowerSideSchema = z.enum(["north", "south", "east", "west"]);
export const TowerLevelsSchema = z.enum(["top", "middle", "bottom"]);
export const TowerCornerSchema = z.enum(["northeast", "southeast", "southwest", "northwest"]);

// Light effects — style is a string key into LIGHT_EFFECTS
export const LightEffectNameSchema = z
  .enum(["off", "on", "breathe", "breatheFast", "breathe50percent", "flicker"])
  .describe("Light effect name");

// Base light levels
export const BaseLightLevelSchema = z.enum(["top", "bottom", "a", "b"]);

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
export const GlyphSchema = z.enum(["cleanse", "quest", "battle", "banner", "reinforce"]);

// Audio
export const SoundIndexSchema = z
  .number()
  .int()
  .min(1)
  .max(113)
  .describe("Sound index (1-113) from tower audio library");

export const VolumeSchema = z
  .number()
  .int()
  .min(0)
  .max(3)
  .describe("0=Loud, 1=Medium, 2=Quiet, 3=Mute");

export const StatefulVolumeSchema = z
  .number()
  .int()
  .min(0)
  .max(3)
  .describe("0=Loud, 1=Medium, 2=Quiet, 3=Soft");

// Drums
export const DrumLevelSchema = z.enum(["top", "middle", "bottom"]);

// Light sequences
export const LightSequenceSchema = z
  .number()
  .int()
  .min(0x01)
  .max(0x13)
  .describe("Light sequence ID from TOWER_LIGHT_SEQUENCES");
