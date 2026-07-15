import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TowerSide } from "ultimatedarktower";
import { TowerController, wrapToolHandler } from "../tower-controller.js";
import { TowerSideSchema, SoundIndexSchema } from "../utils/schemas.js";

const SIDE_TO_INDEX: Record<string, number> = {
  north: 0,
  east: 1,
  south: 2,
  west: 3,
};

const DRUM_TO_INDEX: Record<string, number> = {
  top: 0,
  middle: 1,
  bottom: 2,
};

export function registerDrumTools(server: McpServer, tower: TowerController): void {
  server.registerTool(
    "tower_rotate",
    {
      title: "Rotate All Drums",
      description:
        "Rotate all three drums to specified positions. Requires calibration. Optionally plays a sound.",
      inputSchema: {
        top: TowerSideSchema.describe("Target position for top drum"),
        middle: TowerSideSchema.describe("Target position for middle drum"),
        bottom: TowerSideSchema.describe("Target position for bottom drum"),
        soundIndex: SoundIndexSchema.optional().describe("Optional sound to play during rotation"),
      },
    },
    (args) =>
      wrapToolHandler(async () => {
        await tower.rotateWithState(
          args.top as TowerSide,
          args.middle as TowerSide,
          args.bottom as TowerSide,
          args.soundIndex
        );
        return `Drums rotated: top=${args.top}, middle=${args.middle}, bottom=${args.bottom}`;
      })
  );

  server.registerTool(
    "tower_rotate_drum",
    {
      title: "Rotate Single Drum",
      description: "Rotate a single drum to a specified position. Requires calibration.",
      inputSchema: {
        drum: z.enum(["top", "middle", "bottom"]).describe("Which drum to rotate"),
        position: TowerSideSchema.describe("Target position for the drum"),
        playSound: z.boolean().optional().describe("Play sound during rotation (default: true)"),
      },
    },
    (args) =>
      wrapToolHandler(async () => {
        const drumIndex = DRUM_TO_INDEX[args.drum];
        const posIndex = SIDE_TO_INDEX[args.position];
        await tower.rotateDrumStateful(drumIndex, posIndex, args.playSound);
        return `${args.drum} drum rotated to ${args.position}`;
      })
  );

  server.registerTool(
    "tower_random_rotate",
    {
      title: "Random Rotate",
      description:
        "Randomly rotate drum levels. level: 0=all, 1=top, 2=middle, 3=bottom, 4=top+middle, 5=top+bottom, 6=middle+bottom",
      inputSchema: {
        level: z
          .number()
          .int()
          .min(0)
          .max(6)
          .optional()
          .describe("Which drums to rotate randomly (0=all, default)"),
      },
    },
    (args) =>
      wrapToolHandler(async () => {
        await tower.randomRotateLevels(args.level);
        return `Random rotation applied (level=${args.level ?? 0})`;
      })
  );

  server.registerTool(
    "tower_get_drum_positions",
    {
      title: "Get Drum Positions",
      description: "Get the current position of all three drums",
    },
    () =>
      wrapToolHandler(async () => {
        return {
          top: tower.getCurrentDrumPosition("top"),
          middle: tower.getCurrentDrumPosition("middle"),
          bottom: tower.getCurrentDrumPosition("bottom"),
        };
      })
  );
}
