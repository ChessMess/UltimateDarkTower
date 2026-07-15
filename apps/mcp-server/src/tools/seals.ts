import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TowerSide, TowerLevels } from "ultimatedarktower";
import { TowerController, wrapToolHandler } from "../tower-controller.js";
import { TowerSideSchema, TowerLevelsSchema, VolumeSchema } from "../utils/schemas.js";

export function registerSealTools(server: McpServer, tower: TowerController): void {
  server.registerTool(
    "tower_break_seal",
    {
      title: "Break Seal",
      description:
        "Break a seal at the specified side and level. Plays the seal-breaking animation and sound.",
      inputSchema: {
        side: TowerSideSchema.describe("Side of the tower"),
        level: TowerLevelsSchema.describe("Level of the seal"),
        volume: VolumeSchema.optional().describe("Volume: 0=Loud, 1=Medium, 2=Quiet, 3=Mute"),
      },
    },
    (args) =>
      wrapToolHandler(async () => {
        await tower.breakSeal(
          { side: args.side as TowerSide, level: args.level as TowerLevels },
          args.volume
        );
        return `Seal broken at ${args.side} ${args.level}`;
      })
  );

  server.registerTool(
    "tower_is_seal_broken",
    {
      title: "Check Seal Status",
      description: "Check if a specific seal has been broken",
      inputSchema: {
        side: TowerSideSchema.describe("Side of the tower"),
        level: TowerLevelsSchema.describe("Level of the seal"),
      },
    },
    (args) =>
      wrapToolHandler(async () => {
        const broken = tower.isSealBroken({
          side: args.side as TowerSide,
          level: args.level as TowerLevels,
        });
        return { side: args.side, level: args.level, broken };
      })
  );

  server.registerTool(
    "tower_get_broken_seals",
    {
      title: "Get Broken Seals",
      description: "Get a list of all broken seals",
    },
    () =>
      wrapToolHandler(async () => {
        const seals = tower.getBrokenSeals();
        return {
          brokenSeals: seals,
          brokenCount: seals.length,
          totalSeals: 12,
          unbrokenCount: 12 - seals.length,
        };
      })
  );

  server.registerTool(
    "tower_reset_seals",
    {
      title: "Reset Seals",
      description: "Reset all seals to unbroken state (in software tracking only)",
    },
    () =>
      wrapToolHandler(async () => {
        tower.resetBrokenSeals();
        return "All seals reset to unbroken state";
      })
  );

  server.registerTool(
    "tower_random_seal",
    {
      title: "Random Unbroken Seal",
      description: "Get a random unbroken seal location",
    },
    () =>
      wrapToolHandler(async () => {
        const seal = tower.getRandomUnbrokenSeal();
        if (!seal) {
          return "All seals are already broken";
        }
        return { seal };
      })
  );
}
