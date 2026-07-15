import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TowerController, wrapToolHandler } from "../tower-controller.js";
import { LightsSchema, LightSequenceSchema, SoundIndexSchema } from "../utils/schemas.js";
import { lightSequenceNameToValue } from "../utils/lookups.js";
import { TOWER_LIGHT_SEQUENCES } from "ultimatedarktower";

export function registerLightTools(server: McpServer, tower: TowerController): void {
  server.registerTool(
    "tower_set_lights",
    {
      title: "Set Lights",
      description:
        "Control tower lights. Set doorway lights (north/south/east/west at top/middle/bottom), ledge lights (corner positions), and base lights. Effects: off, on, breathe, breatheFast, breathe50percent, flicker.",
      inputSchema: {
        lights: LightsSchema,
      },
    },
    (args) =>
      wrapToolHandler(async () => {
        await tower.lights(args.lights);
        return "Lights updated";
      })
  );

  server.registerTool(
    "tower_set_led",
    {
      title: "Set Individual LED",
      description:
        "Set a single LED by layer and light index. Layers: 0=top ring, 1=middle ring, 2=bottom ring, 3=ledge, 4=base1, 5=base2. Light index 0-3.",
      inputSchema: {
        layer: z.number().int().min(0).max(5).describe("Layer index 0-5"),
        lightIndex: z.number().int().min(0).max(3).describe("Light index 0-3 within the layer"),
        effect: z
          .number()
          .int()
          .min(0)
          .max(5)
          .describe("Effect: 0=off, 1=on, 2=breathe, 3=breatheFast, 4=breathe50%, 5=flicker"),
        loop: z.boolean().optional().describe("Loop the effect"),
      },
    },
    (args) =>
      wrapToolHandler(async () => {
        await tower.setLED(args.layer, args.lightIndex, args.effect, args.loop);
        return `LED set: layer=${args.layer}, light=${args.lightIndex}, effect=${args.effect}`;
      })
  );

  server.registerTool(
    "tower_light_sequence",
    {
      title: "Play Light Sequence",
      description:
        "Play a predefined light sequence by ID (1-19). Optionally play a sound simultaneously.",
      inputSchema: {
        sequence: LightSequenceSchema,
        soundIndex: SoundIndexSchema.optional().describe("Optional sound to play with sequence"),
      },
    },
    (args) =>
      wrapToolHandler(async () => {
        await tower.lightOverrides(args.sequence, args.soundIndex);
        return `Light sequence ${args.sequence} started`;
      })
  );

  server.registerTool(
    "tower_light_sequence_by_name",
    {
      title: "Play Light Sequence by Name",
      description:
        "Play a predefined light sequence by name (e.g. 'victory', 'defeat', 'dungeonIdle', 'twinkle'). Case-insensitive.",
      inputSchema: {
        name: z.string().describe("Sequence name from TOWER_LIGHT_SEQUENCES"),
        soundIndex: SoundIndexSchema.optional().describe("Optional sound to play with sequence"),
      },
    },
    (args) =>
      wrapToolHandler(async () => {
        const value = lightSequenceNameToValue.get(args.name.toLowerCase());
        if (value === undefined) {
          const names = Object.keys(TOWER_LIGHT_SEQUENCES).join(", ");
          throw new Error(`Light sequence "${args.name}" not found. Available: ${names}`);
        }
        await tower.lightOverrides(value, args.soundIndex);
        return `Light sequence "${args.name}" (0x${value.toString(16).padStart(2, "0")}) started`;
      })
  );

  server.registerTool(
    "tower_lights_on",
    {
      title: "All Lights On",
      description:
        "Turn on all 24 tower LEDs with a single command. Optionally specify an effect (0=off, 1=on, 2=breathe, 3=breatheFast, 4=breathe50%, 5=flicker); defaults to on.",
      inputSchema: {
        effect: z
          .number()
          .int()
          .min(0)
          .max(5)
          .optional()
          .describe("Effect to apply to all LEDs (default: 1=on)"),
      },
    },
    (args) =>
      wrapToolHandler(async () => {
        await tower.allLightsOn(args.effect);
        return "All lights turned on";
      })
  );

  server.registerTool(
    "tower_lights_off",
    {
      title: "All Lights Off",
      description: "Turn off all 24 tower LEDs with a single command",
    },
    () =>
      wrapToolHandler(async () => {
        await tower.allLightsOff();
        return "All lights turned off";
      })
  );
}
