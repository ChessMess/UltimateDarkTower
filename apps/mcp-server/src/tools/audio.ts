import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TowerController, wrapToolHandler } from "../tower-controller.js";
import { SoundIndexSchema, StatefulVolumeSchema } from "../utils/schemas.js";
import {
  soundNameToIndex,
  soundCategoryIndex,
  getAudioLibrary,
  getSoundCategories,
} from "../utils/lookups.js";

export function registerAudioTools(server: McpServer, tower: TowerController): void {
  server.registerTool(
    "tower_play_sound",
    {
      title: "Play Sound",
      description:
        "Play a sound from the tower audio library by index number (1-113). Volume is 0 (loudest) to 3 (soft).",
      inputSchema: {
        soundIndex: SoundIndexSchema,
        loop: z.boolean().optional().describe("Loop the sound continuously"),
        volume: StatefulVolumeSchema.optional().describe(
          "Volume level: 0=Loud, 1=Medium, 2=Quiet, 3=Soft"
        ),
      },
    },
    (args) =>
      wrapToolHandler(async () => {
        await tower.playSoundStateful(args.soundIndex, args.loop, args.volume);
        return `Playing sound ${args.soundIndex}`;
      })
  );

  server.registerTool(
    "tower_play_sound_by_name",
    {
      title: "Play Sound by Name",
      description:
        "Play a sound by name (e.g. 'Ashstrider', 'Battle Start'). Case-insensitive lookup.",
      inputSchema: {
        name: z.string().describe("Sound name from the audio library"),
        loop: z.boolean().optional().describe("Loop the sound continuously"),
        volume: StatefulVolumeSchema.optional().describe(
          "Volume level: 0=Loud, 1=Medium, 2=Quiet, 3=Soft"
        ),
      },
    },
    (args) =>
      wrapToolHandler(async () => {
        const index = soundNameToIndex.get(args.name.toLowerCase());
        if (index === undefined) {
          const categories = getSoundCategories();
          throw new Error(
            `Sound "${args.name}" not found. Use tower_list_sounds to see available sounds. Categories: ${categories.join(", ")}`
          );
        }
        await tower.playSoundStateful(index, args.loop, args.volume);
        return `Playing sound "${args.name}" (index ${index})`;
      })
  );

  server.registerTool(
    "tower_list_sounds",
    {
      title: "List Sounds",
      description:
        "List all available sounds from the tower audio library, optionally filtered by category",
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe(
            "Filter by category: Adversary, Ally, Battle, Classic, Unlisted, Dungeon, Foe, Spawn, Quest, Glyph, State, Seals"
          ),
      },
    },
    (args) =>
      wrapToolHandler(async () => {
        if (args.category) {
          const sounds = soundCategoryIndex.get(args.category);
          if (!sounds) {
            const categories = getSoundCategories();
            throw new Error(
              `Category "${args.category}" not found. Available: ${categories.join(", ")}`
            );
          }
          return { category: args.category, sounds };
        }
        return {
          categories: getSoundCategories(),
          sounds: getAudioLibrary(),
        };
      })
  );
}
