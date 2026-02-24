import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TOWER_AUDIO_LIBRARY, TOWER_LIGHT_SEQUENCES, LIGHT_EFFECTS } from "ultimatedarktower";
import { TowerController } from "../tower-controller.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadAsset(relativePath: string): string {
  try {
    return readFileSync(join(__dirname, "..", relativePath), "utf-8");
  } catch {
    return `[File not found: ${relativePath}]`;
  }
}

export function registerResources(server: McpServer, tower: TowerController): void {
  // --- Tower state resources ---

  server.registerResource(
    "tower-connection",
    "tower://connection",
    {
      title: "Tower Connection Status",
      description: "Current connection state, calibration, and command status",
      mimeType: "application/json",
    },
    () => ({
      contents: [
        {
          uri: "tower://connection",
          mimeType: "application/json",
          text: JSON.stringify(
            {
              connected: tower.isConnected,
              calibrated: tower.isCalibrated,
              performingLongCommand: tower.performingLongCommand,
              performingCalibration: tower.performingCalibration,
              connectionStatus: tower.getConnectionStatus(),
            },
            null,
            2
          ),
        },
      ],
    })
  );

  server.registerResource(
    "tower-device-info",
    "tower://device-info",
    {
      title: "Tower Device Information",
      description: "Manufacturer, model, serial, firmware, hardware revisions",
      mimeType: "application/json",
    },
    () => ({
      contents: [
        {
          uri: "tower://device-info",
          mimeType: "application/json",
          text: JSON.stringify(tower.getDeviceInformation(), null, 2),
        },
      ],
    })
  );

  server.registerResource(
    "tower-battery",
    "tower://battery",
    {
      title: "Tower Battery Status",
      description: "Battery voltage, percentage, and monitoring configuration",
      mimeType: "application/json",
    },
    () => {
      const snapshot = tower.getSnapshot();
      return {
        contents: [
          {
            uri: "tower://battery",
            mimeType: "application/json",
            text: JSON.stringify(snapshot.battery, null, 2),
          },
        ],
      };
    }
  );

  server.registerResource(
    "tower-drums",
    "tower://drums",
    {
      title: "Tower Drum Positions",
      description: "Current position of all three drums",
      mimeType: "application/json",
    },
    () => {
      const snapshot = tower.getSnapshot();
      return {
        contents: [
          {
            uri: "tower://drums",
            mimeType: "application/json",
            text: JSON.stringify(snapshot.drumPositions, null, 2),
          },
        ],
      };
    }
  );

  server.registerResource(
    "tower-glyphs",
    "tower://glyphs",
    {
      title: "Tower Glyph Positions",
      description: "All 5 glyph positions and facing directions",
      mimeType: "application/json",
    },
    () => ({
      contents: [
        {
          uri: "tower://glyphs",
          mimeType: "application/json",
          text: JSON.stringify(tower.getAllGlyphPositions(), null, 2),
        },
      ],
    })
  );

  server.registerResource(
    "tower-seals",
    "tower://seals",
    {
      title: "Tower Seals",
      description: "Broken and unbroken seal status",
      mimeType: "application/json",
    },
    () => {
      const broken = tower.getBrokenSeals();
      return {
        contents: [
          {
            uri: "tower://seals",
            mimeType: "application/json",
            text: JSON.stringify(
              {
                brokenSeals: broken,
                brokenCount: broken.length,
                totalSeals: 12,
                unbrokenCount: 12 - broken.length,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerResource(
    "tower-state",
    "tower://state",
    {
      title: "Tower State",
      description: "Full tower state including drums, lights, audio, beam",
      mimeType: "application/json",
    },
    () => ({
      contents: [
        {
          uri: "tower://state",
          mimeType: "application/json",
          text: JSON.stringify(tower.getCurrentTowerState(), null, 2),
        },
      ],
    })
  );

  server.registerResource(
    "tower-audio-library",
    "tower://audio-library",
    {
      title: "Tower Audio Library",
      description: "Complete list of all 113 sounds with names, indices, and categories",
      mimeType: "application/json",
    },
    () => ({
      contents: [
        {
          uri: "tower://audio-library",
          mimeType: "application/json",
          text: JSON.stringify(TOWER_AUDIO_LIBRARY, null, 2),
        },
      ],
    })
  );

  server.registerResource(
    "tower-light-effects",
    "tower://light-effects",
    {
      title: "Tower Light Effects & Sequences",
      description: "Available light effects (6) and predefined light sequences (19)",
      mimeType: "application/json",
    },
    () => ({
      contents: [
        {
          uri: "tower://light-effects",
          mimeType: "application/json",
          text: JSON.stringify(
            { effects: LIGHT_EFFECTS, sequences: TOWER_LIGHT_SEQUENCES },
            null,
            2
          ),
        },
      ],
    })
  );

  // --- Game content resources ---

  const gameContent = [
    {
      name: "game-rules",
      uri: "tower://game/rules",
      file: "rules.md",
      title: "Game Rules",
      desc: "Core rules — setup, turn structure, quests, battle, win/loss",
    },
    {
      name: "game-adversaries",
      uri: "tower://game/adversaries",
      file: "adversaries.md",
      title: "Adversaries",
      desc: "All adversaries — abilities, spawn mechanics, escalation",
    },
    {
      name: "game-quests",
      uri: "tower://game/quests",
      file: "quests.md",
      title: "Quests",
      desc: "Quest types, completion conditions, rewards",
    },
    {
      name: "game-items",
      uri: "tower://game/items",
      file: "items.md",
      title: "Items",
      desc: "Equipment, potions, relics — names, effects, costs",
    },
    {
      name: "game-heroes",
      uri: "tower://game/heroes",
      file: "heroes.md",
      title: "Heroes",
      desc: "Hero classes, starting stats, special abilities",
    },
    {
      name: "game-buildings",
      uri: "tower://game/buildings",
      file: "buildings.md",
      title: "Buildings",
      desc: "Kingdom buildings — citadel, sanctuary, village, bazaar",
    },
    {
      name: "game-lore",
      uri: "tower://game/lore",
      file: "lore.md",
      title: "Lore",
      desc: "World lore, tower history, thematic flavor",
    },
    {
      name: "game-glossary",
      uri: "tower://game/glossary",
      file: "glossary.md",
      title: "Glossary",
      desc: "Key terms — virtues, corruption, skulls, seals, glyphs",
    },
  ] as const;

  for (const gc of gameContent) {
    server.registerResource(
      gc.name,
      gc.uri,
      {
        title: gc.title,
        description: gc.desc,
        mimeType: "text/markdown",
      },
      () => ({
        contents: [
          {
            uri: gc.uri,
            mimeType: "text/markdown",
            text: loadAsset(`game-content/${gc.file}`),
          },
        ],
      })
    );
  }
}
