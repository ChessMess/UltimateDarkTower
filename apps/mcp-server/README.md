# mcp-server-return-to-dark-tower

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)

An MCP (Model Context Protocol) server that wraps the [UltimateDarkTower](https://github.com/ChessMess/UltimateDarkTower) BLE library (v2.0.0) so AI assistants like Claude can control the physical Return to Dark Tower board game tower via Bluetooth. Connect, calibrate, play sounds, animate lights, rotate drums, break seals, and run dramatic game sequences — all through natural language.

## Features

- **31 MCP tools** across 6 domains — connection, audio, lights, drums, seals, state & glyphs
- **15 tower state resources** — connection status, battery, drum positions, glyphs, seals, audio library, light effects
- **8 game knowledge resources** — rules, heroes, items, quests, adversaries, buildings, lore, glossary
- **6 glyph SVG icon resources** — visual references for the 5 glyph types plus a combined sheet
- **8 prompt templates** — dramatic entrance, victory/defeat sequences, monthly transitions, dungeon runs, battle starts, game master setup, sound browser
- **Dual transport** — stdio for Claude Desktop, Streamable HTTP for web apps
- **Zero custom BLE code** — built on UltimateDarkTower v2.0.0's adapter pattern

## Prerequisites

- Node.js 18+
- Bluetooth Low Energy (BLE) hardware
- A physical Return to Dark Tower tower

### Platform Notes

| Platform | Notes |
|----------|-------|
| **macOS** | Works out of the box. Grant Bluetooth permission to Terminal/Claude in System Settings > Privacy & Security > Bluetooth. |
| **Linux** | Requires BlueZ: `sudo apt install bluetooth bluez libbluetooth-dev` |
| **Windows** | Requires Windows 10+ with BLE support |

## Installation

```bash
npm install
npm run build
```

## Usage

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "dark-tower": {
      "command": "node",
      "args": ["path/to/dist/index.js", "--stdio-only"]
    }
  }
}
```

### HTTP Mode

```bash
node dist/index.js --http-only --port 3001
```

### Both Transports

```bash
node dist/index.js
```

### CLI Options

| Flag | Description |
|------|-------------|
| `--stdio-only` | Run stdio transport only (for Claude Desktop) |
| `--http-only` | Run HTTP transport only (for web apps) |
| `--port <n>` | HTTP port (default: 3001) |

## Available Tools

### Connection (8 tools)

| Tool | Description |
|------|-------------|
| `tower_connect` | Connect to the tower via BLE |
| `tower_disconnect` | Disconnect from the tower |
| `tower_calibrate` | Calibrate drum positions |
| `tower_status` | Get connection status, calibration state, battery |
| `tower_device_info` | Get manufacturer, model, firmware info |
| `tower_is_responsive` | Active connectivity check |
| `tower_cleanup` | Clean up resources |
| `tower_set_monitoring` | Configure connection monitoring |

### Audio (3 tools)

| Tool | Description |
|------|-------------|
| `tower_play_sound` | Play a sound by index (1-113) |
| `tower_play_sound_by_name` | Play a sound by name (e.g., "Ashstrider") |
| `tower_list_sounds` | List available sounds, optionally filtered by category |

### Lights (5 tools)

| Tool | Description |
|------|-------------|
| `tower_set_lights` | Set doorway, ledge, and base lights |
| `tower_set_led` | Set individual LED by layer and index |
| `tower_light_sequence` | Run a named light sequence by ID |
| `tower_light_sequence_by_name` | Run a light sequence by name (e.g., "victory") |
| `tower_lights_off` | Turn all lights off |

### Drums (4 tools)

| Tool | Description |
|------|-------------|
| `tower_rotate` | Rotate all drums to specific positions |
| `tower_rotate_drum` | Rotate a single drum to a position |
| `tower_random_rotate` | Randomly rotate drums |
| `tower_get_drum_positions` | Get current drum positions |

### Seals (5 tools)

| Tool | Description |
|------|-------------|
| `tower_break_seal` | Break a seal at a specific side and level |
| `tower_is_seal_broken` | Check if a specific seal is broken |
| `tower_get_broken_seals` | Get all broken seals |
| `tower_reset_seals` | Reset all seals |
| `tower_random_seal` | Get a random unbroken seal |

### State & Glyphs (7 tools)

| Tool | Description |
|------|-------------|
| `tower_get_state` | Get current tower state |
| `tower_send_state` | Send a tower state update |
| `tower_get_glyphs` | Get all glyph positions |
| `tower_get_glyph` | Get a specific glyph's position |
| `tower_glyphs_facing` | Get glyphs facing a direction |
| `tower_skull_count` | Get skull drop count |
| `tower_reset_skull_count` | Reset skull drop count |

## Available Resources

### Tower State Resources

| Resource | URI | Description |
|----------|-----|-------------|
| Tower Connection | `tower://connection` | Connection status, calibration, busy state |
| Device Info | `tower://device-info` | Manufacturer, model, firmware revisions |
| Battery | `tower://battery` | Millivolts, percentage, previous values |
| Drum Positions | `tower://drums` | All 3 drum positions |
| Glyph Positions | `tower://glyphs` | All 5 glyph positions and directions |
| Seal State | `tower://seals` | Broken/unbroken seals |
| Tower State | `tower://state` | Full tower state snapshot |
| Audio Library | `tower://audio-library` | All 113 sounds with categories |
| Light Effects | `tower://light-effects` | 6 effects + 19 named sequences |

### Game Knowledge Resources

| Resource | URI | Description |
|----------|-----|-------------|
| Rules | `tower://game/rules` | Setup, turn phases, win/loss conditions |
| Adversaries | `tower://game/adversaries` | Abilities, spawn mechanics, escalation |
| Quests | `tower://game/quests` | Quest types, conditions, rewards |
| Items | `tower://game/items` | Equipment, potions, relics |
| Heroes | `tower://game/heroes` | Classes, stats, abilities |
| Buildings | `tower://game/buildings` | Citadel, sanctuary, village, bazaar |
| Lore | `tower://game/lore` | World lore, tower history, flavor |
| Glossary | `tower://game/glossary` | Key terms and concepts |

### Glyph Icon Resources

| Resource | URI | Description |
|----------|-----|-------------|
| Cleanse | `tower://glyphs/cleanse` | Cleanse glyph SVG |
| Quest | `tower://glyphs/quest` | Quest glyph SVG |
| Battle | `tower://glyphs/battle` | Battle glyph SVG |
| Banner | `tower://glyphs/banner` | Banner glyph SVG |
| Reinforce | `tower://glyphs/reinforce` | Reinforce glyph SVG |
| All Glyphs | `tower://glyphs/all` | Combined SVG sheet |

## Available Prompts

| Prompt | Args | Description |
|--------|------|-------------|
| `dramatic_entrance` | `adversary?` | Connect, calibrate, spawn sound, strobe lights, random drums |
| `victory_sequence` | `soundIndex?` | Victory sound + victory light sequence |
| `defeat_sequence` | — | Defeat sound + defeat lights |
| `monthly_transition` | `month?` | Month end/start sounds and lights |
| `dungeon_run` | `type?` | Dungeon sound + idle lights |
| `battle_start` | — | Battle sound + flicker lights |
| `game_master_setup` | — | Full game session setup guide |
| `sound_browser` | `category?` | Browse audio library by category |

## Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  Claude Desktop │────▶│  stdio transport  │──┐
└─────────────────┘     └──────────────────┘  │    ┌───────────────────┐     ┌─────────┐
                                               ├───▶│ TowerController   │────▶│  Tower  │
┌─────────────────┐     ┌──────────────────┐  │    │ (singleton)       │ BLE │  (HW)   │
│   React App     │────▶│  HTTP transport   │──┘    └───────────────────┘     └─────────┘
└─────────────────┘     └──────────────────┘
```

The `TowerController` singleton wraps `UltimateDarkTower` (v2.0.0) and is shared by both transports. The library's `BluetoothAdapterFactory` auto-detects the Node.js environment and uses `@stoprocent/noble` for BLE communication.

## Dependencies

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP server and transport |
| `ultimatedarktower` | Tower BLE control library |
| `@stoprocent/noble` | Node.js BLE backend |
| `zod` | Schema validation |
| `express` | HTTP transport server |

## Development

```bash
npm run dev      # Watch mode with tsx
npm run build    # Compile TypeScript
npm run lint     # Run ESLint + Prettier check
npm test         # Run tests
```

## License

MIT — see [LICENSE](LICENSE).

## Acknowledgments

- [UltimateDarkTower](https://github.com/ChessMess/UltimateDarkTower) — the BLE library that makes this possible
- [Return to Dark Tower](https://restorationgames.com/return-to-dark-tower/) by Restoration Games
- The original [Dark Tower](https://en.wikipedia.org/wiki/Dark_Tower_(game)) (1981) by Milton Bradley
