import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TOWER_AUDIO_LIBRARY, TOWER_LIGHT_SEQUENCES } from "ultimatedarktower";
import { getSoundCategories, soundCategoryIndex } from "../utils/lookups.js";

type AudioEntry = { name: string; value: number; category: string };

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "dramatic_entrance",
    {
      title: "Dramatic Entrance",
      description:
        "A dramatic tower startup sequence: connect, calibrate, play adversary sound, strobe lights, random rotate drums",
      argsSchema: {
        adversary: z
          .string()
          .optional()
          .describe("Adversary name to play spawn sound (e.g. 'Ashstrider')"),
      },
    },
    (args) => {
      const adversary = args.adversary ?? "Ashstrider";
      const adversaryEntry = (TOWER_AUDIO_LIBRARY as Record<string, AudioEntry>)[
        adversary.replace(/\s+/g, "")
      ];
      const soundNote = adversaryEntry
        ? `Use tower_play_sound with index ${adversaryEntry.value} for the ${adversaryEntry.name} sound.`
        : `Look up "${adversary}" in the audio library using tower_play_sound_by_name.`;

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                "Execute a dramatic tower entrance sequence:",
                "1. Connect to the tower using tower_connect",
                "2. Calibrate with tower_calibrate",
                `3. ${soundNote}`,
                `4. Run the angryStrobe01 light sequence using tower_light_sequence with sequence ${TOWER_LIGHT_SEQUENCES.angryStrobe01}`,
                "5. Random rotate all drums with tower_random_rotate",
                "",
                "Execute each step in order, waiting for each to complete before proceeding.",
              ].join("\n"),
            },
          },
        ],
      };
    }
  );

  server.registerPrompt(
    "victory_sequence",
    {
      title: "Victory Sequence",
      description: "Play a victory celebration: victory sound, victory lights, drum rotation",
      argsSchema: {
        soundIndex: z
          .string()
          .optional()
          .describe("Custom victory sound index (default: uses Victory sound)"),
      },
    },
    (args) => {
      const victorySoundEntry = (TOWER_AUDIO_LIBRARY as Record<string, AudioEntry>)["Victory"];
      const soundIndex = args.soundIndex ?? String(victorySoundEntry?.value ?? 100);

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                "Execute a victory celebration sequence:",
                `1. Play the victory sound: tower_play_sound with index ${soundIndex}`,
                `2. Run the victory light sequence: tower_light_sequence with sequence ${TOWER_LIGHT_SEQUENCES.victory}`,
                "3. Random rotate all drums: tower_random_rotate",
                "",
                "Execute each step in order for dramatic effect.",
              ].join("\n"),
            },
          },
        ],
      };
    }
  );

  server.registerPrompt(
    "defeat_sequence",
    {
      title: "Defeat Sequence",
      description: "Play a defeat sequence: defeat sound and defeat lights",
    },
    () => {
      const defeatEntry = (TOWER_AUDIO_LIBRARY as Record<string, AudioEntry>)["Defeat"];
      const defeatSound = defeatEntry?.value ?? 101;

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                "Execute a defeat sequence:",
                `1. Play the defeat sound: tower_play_sound with index ${defeatSound}`,
                `2. Run the defeat light sequence: tower_light_sequence with sequence ${TOWER_LIGHT_SEQUENCES.defeat}`,
              ].join("\n"),
            },
          },
        ],
      };
    }
  );

  server.registerPrompt(
    "monthly_transition",
    {
      title: "Monthly Transition",
      description: "Transition between game months: end sound, rotate, start sound, month lights",
      argsSchema: {
        month: z.string().optional().describe("Month number being entered"),
      },
    },
    (args) => {
      const monthEndEntry = (TOWER_AUDIO_LIBRARY as Record<string, AudioEntry>)["MonthEnded"];
      const monthStartEntry = (TOWER_AUDIO_LIBRARY as Record<string, AudioEntry>)["MonthStarted"];

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                `Execute a monthly transition${args.month ? ` to month ${args.month}` : ""}:`,
                `1. Play the month ended sound: tower_play_sound with index ${monthEndEntry?.value ?? 104}`,
                "2. Random rotate all drums: tower_random_rotate",
                `3. Play the month started sound: tower_play_sound with index ${monthStartEntry?.value ?? 105}`,
                `4. Run the monthStarted light sequence: tower_light_sequence with sequence ${TOWER_LIGHT_SEQUENCES.monthStarted}`,
              ].join("\n"),
            },
          },
        ],
      };
    }
  );

  server.registerPrompt(
    "dungeon_run",
    {
      title: "Dungeon Run",
      description: "Set up a dungeon atmosphere: dungeon sound and idle lights",
      argsSchema: {
        type: z.string().optional().describe("Type of dungeon (for sound selection)"),
      },
    },
    (args) => {
      const dungeonNote = args.type
        ? `Look up a "${args.type}" dungeon sound using tower_play_sound_by_name.`
        : 'Play a dungeon sound using tower_play_sound_by_name with name "Dungeon Intro".';

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                "Set up a dungeon atmosphere:",
                `1. ${dungeonNote}`,
                `2. Run the dungeon idle light sequence: tower_light_sequence with sequence ${TOWER_LIGHT_SEQUENCES.dungeonIdle}`,
              ].join("\n"),
            },
          },
        ],
      };
    }
  );

  server.registerPrompt(
    "battle_start",
    {
      title: "Battle Start",
      description: "Start a battle with sound and dramatic lighting",
    },
    () => {
      const battleStartEntry = (TOWER_AUDIO_LIBRARY as Record<string, AudioEntry>)["BattleStart"];

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                "Execute a battle start sequence:",
                `1. Play the battle start sound: tower_play_sound with index ${battleStartEntry?.value ?? 19}`,
                `2. Run the flareThenFlicker light sequence: tower_light_sequence with sequence ${TOWER_LIGHT_SEQUENCES.flareThenFlicker}`,
              ].join("\n"),
            },
          },
        ],
      };
    }
  );

  server.registerPrompt(
    "game_master_setup",
    {
      title: "Game Master Setup",
      description:
        "Guide for the AI to manage a full game session — connect, calibrate, and learn available tools and resources",
    },
    () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              "You are the Game Master for Return to Dark Tower. Set up and manage a game session.",
              "",
              "SETUP:",
              "1. Connect to the tower: tower_connect",
              "2. Calibrate drums: tower_calibrate",
              "3. Check tower status: tower_status",
              "",
              "AVAILABLE TOOLS:",
              "- Connection: tower_connect, tower_disconnect, tower_calibrate, tower_status, tower_device_info",
              "- Audio: tower_play_sound, tower_play_sound_by_name, tower_list_sounds",
              "- Lights: tower_set_lights, tower_set_led, tower_light_sequence, tower_light_sequence_by_name, tower_lights_off",
              "- Drums: tower_rotate, tower_rotate_drum, tower_random_rotate, tower_get_drum_positions",
              "- Seals: tower_break_seal, tower_is_seal_broken, tower_get_broken_seals, tower_reset_seals, tower_random_seal",
              "- State: tower_get_state, tower_send_state, tower_get_glyphs, tower_get_glyph, tower_glyphs_facing, tower_skull_count, tower_reset_skull_count",
              "",
              "GAME KNOWLEDGE RESOURCES:",
              "Read the game rules (tower://game/rules), adversaries, quests, items, heroes, buildings, lore, and glossary resources to understand the game.",
              "",
              "DRAMATIC SEQUENCES:",
              "Use the prompt templates (dramatic_entrance, victory_sequence, defeat_sequence, monthly_transition, dungeon_run, battle_start) for cinematic game moments.",
              "",
              "Begin by connecting and calibrating the tower, then guide players through their game session.",
            ].join("\n"),
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "sound_browser",
    {
      title: "Sound Browser",
      description: "Browse the tower audio library, optionally filtered by category",
      argsSchema: {
        category: z.string().optional().describe("Filter by sound category"),
      },
    },
    (args) => {
      let soundList: string;
      if (args.category) {
        const sounds = soundCategoryIndex.get(args.category);
        if (sounds) {
          soundList = sounds.map((s) => `- ${s.name} (index: ${s.value})`).join("\n");
          soundList = `**${args.category} sounds:**\n${soundList}`;
        } else {
          soundList = `Category "${args.category}" not found. Available categories: ${getSoundCategories().join(", ")}`;
        }
      } else {
        const lines: string[] = [];
        for (const [cat, sounds] of soundCategoryIndex.entries()) {
          lines.push(`\n**${cat}:**`);
          for (const s of sounds) {
            lines.push(`- ${s.name} (index: ${s.value})`);
          }
        }
        soundList = lines.join("\n");
      }

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                "Here is the tower audio library. You can play any sound using tower_play_sound with the index, or tower_play_sound_by_name with the name.",
                "",
                soundList,
              ].join("\n"),
            },
          },
        ],
      };
    }
  );
}
