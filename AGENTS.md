# Return to Dark Tower — AI Agents

This repository contains two AI coding agents for the Return to Dark Tower ecosystem:

| Agent | File | Use when... |
|-------|------|------------|
| **Ultimate Dark Tower** | `.github/agents/ultimate-dark-tower.agent.md` | Writing TypeScript/JS apps using the `ultimatedarktower` npm library directly |
| **Return to Dark Tower** | `.github/agents/return-to-dark-tower.agent.md` | Controlling or querying the tower via an AI chat interface (Claude.ai, ChatGPT, etc.) |

---

## The Ecosystem

**Return to Dark Tower** is a cooperative/competitive board game featuring a motorized
Bluetooth-enabled tower with:

- 3 rotating drums (top / middle / bottom), each positionable to north / south / east / west
- 16 individually addressable LEDs across 6 layers (doorway rings, ledge, base)
- 56mm speaker with 113 sound effects
- Infrared beam sensors for skull detection
- 5 glyphs (cleanse, quest, battle, banner, reinforce) and 12 breakable seals

**Two layers of programmatic control:**

```
ultimatedarktower (npm)           ← TypeScript library, reverse-engineered BLE protocol
         ↓
mcp-server-return-to-dark-tower   ← MCP server wrapping the library for AI tool access
         ↓
AI tools (Claude, Copilot, etc.)  ← Natural language tower control via chat
```

---

## Shared TypeScript Conventions

Both agents assume TypeScript strict-mode projects targeting Node.js 18+:

- **Validation**: Zod schemas for all hardware inputs (sides, levels, sound indices, effects)
- **Async**: All BLE / tower operations are `async/await` — never fire-and-forget
- **Error handling**: Catch the four typed error classes from `ultimatedarktower`
- **Singleton**: One `UltimateDarkTower` instance per process; re-use it across commands
- **Calibration**: Must call `calibrate()` before any drum rotation; drums will be wrong otherwise

---

## Tower Layout Reference

### Directions & Levels

| Concept | Valid values |
|---------|-------------|
| `TowerSide` | `"north"` \| `"south"` \| `"east"` \| `"west"` |
| `TowerLevels` | `"top"` \| `"middle"` \| `"bottom"` |
| `TowerCorner` | `"northeast"` \| `"southeast"` \| `"southwest"` \| `"northwest"` |
| `Glyphs` | `"cleanse"` \| `"quest"` \| `"battle"` \| `"banner"` \| `"reinforce"` |

### LED Layers (setLED layer index)

| Index | Layer | LEDs |
|-------|-------|------|
| `0` | Top drum ring | 4 (N=0, E=1, S=2, W=3) |
| `1` | Middle drum ring | 4 |
| `2` | Bottom drum ring | 4 |
| `3` | Ledge (corners) | 4 (NE=0, SE=1, SW=2, NW=3) |
| `4` | Base lower | 4 |
| `5` | Base upper | 4 |

### Light Effects

| Value | Name | Description |
|-------|------|-------------|
| `0` | off | All off |
| `1` | on | Solid on |
| `2` | breathe | Slow pulse |
| `3` | breatheFast | Fast pulse |
| `4` | breathe50percent | 50% pulse |
| `5` | flicker | Flicker |

### Volume

| Value | Description |
|-------|-------------|
| `0` | Loud |
| `1` | Medium |
| `2` | Quiet |
| `3` | Mute |

---

## Related Packages

- [`ultimatedarktower`](https://www.npmjs.com/package/ultimatedarktower) — BLE library (v2.3.0)
- [`mcp-server-return-to-dark-tower`](https://www.npmjs.com/package/mcp-server-return-to-dark-tower) — MCP server
- [UltimateDarkTower on GitHub](https://github.com/chessmess/UltimateDarkTower) — library source
