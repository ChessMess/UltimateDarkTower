import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TowerSide, Glyphs } from "ultimatedarktower";
import { TowerController, wrapToolHandler } from "../tower-controller.js";
import { TowerSideSchema, GlyphSchema } from "../utils/schemas.js";

export function registerStateTools(server: McpServer, tower: TowerController): void {
  server.registerTool(
    "tower_get_state",
    {
      title: "Get Tower State",
      description:
        "Get the full current tower state including drums, lights, audio, and beam sensor data",
    },
    () =>
      wrapToolHandler(async () => {
        const state = tower.getCurrentTowerState();
        if (!state) return "No tower state available. Connect and interact with the tower first.";
        return state;
      })
  );

  server.registerTool(
    "tower_send_state",
    {
      title: "Send Tower State",
      description:
        "Send a complete tower state to the tower. Advanced: directly sets all tower hardware state.",
      inputSchema: {
        state: z.any().describe("Complete TowerState object to send to the tower"),
      },
    },
    (args) =>
      wrapToolHandler(async () => {
        await tower.sendTowerState(args.state);
        return "Tower state sent successfully";
      })
  );

  server.registerTool(
    "tower_get_glyphs",
    {
      title: "Get All Glyph Positions",
      description:
        "Get the current facing direction of all 5 glyphs (cleanse, quest, battle, banner, reinforce)",
    },
    () =>
      wrapToolHandler(async () => {
        return tower.getAllGlyphPositions();
      })
  );

  server.registerTool(
    "tower_get_glyph",
    {
      title: "Get Glyph Position",
      description: "Get the current facing direction of a specific glyph",
      inputSchema: {
        glyph: GlyphSchema.describe("The glyph to look up"),
      },
    },
    (args) =>
      wrapToolHandler(async () => {
        const position = tower.getGlyphPosition(args.glyph as Glyphs);
        return { glyph: args.glyph, facing: position };
      })
  );

  server.registerTool(
    "tower_glyphs_facing",
    {
      title: "Glyphs Facing Direction",
      description: "Get all glyphs currently facing a given direction",
      inputSchema: {
        direction: TowerSideSchema.describe("The direction to check"),
      },
    },
    (args) =>
      wrapToolHandler(async () => {
        const glyphs = tower.getGlyphsFacingDirection(args.direction as TowerSide);
        return { direction: args.direction, glyphs };
      })
  );

  server.registerTool(
    "tower_skull_count",
    {
      title: "Skull Drop Count",
      description: "Get the cumulative number of skulls that have dropped into the tower",
    },
    () =>
      wrapToolHandler(async () => {
        return { skullCount: tower.towerSkullDropCount };
      })
  );

  server.registerTool(
    "tower_reset_skull_count",
    {
      title: "Reset Skull Count",
      description: "Reset the skull drop counter to zero",
    },
    () =>
      wrapToolHandler(async () => {
        await tower.resetTowerSkullCount();
        return "Skull count reset to 0";
      })
  );
}
