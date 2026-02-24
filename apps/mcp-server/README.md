# Return to Dark Tower — AI MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/npm/v/mcp-server-return-to-dark-tower.svg)](https://www.npmjs.com/package/mcp-server-return-to-dark-tower)

An MCP server that lets AI assistants like Claude, ChatGPT, and Gemini control the physical [Return to Dark Tower](https://restorationgames.com/return-to-dark-tower/) board game tower via Bluetooth. Connect, calibrate, play sounds, animate lights, rotate drums, break seals, and run dramatic game sequences — all through natural language.

### Features <!-- omit in toc -->

- **31 MCP tools** across 6 domains — connection, audio, lights, drums, seals, state & glyphs
- **15 tower state resources** — connection status, battery, drum positions, glyphs, seals, audio library, light effects
- **8 game knowledge resources** — rules, heroes, items, quests, adversaries, buildings, lore, glossary
- **8 prompt templates** — dramatic entrance, victory/defeat sequences, monthly transitions, dungeon runs, battle starts, game master setup, sound browser
- **Dual transport** — stdio for desktop AI tools, Streamable HTTP for web apps
- **Zero custom BLE code** — built on UltimateDarkTower adapter pattern

---

## 📚 Table of Contents <!-- omit in toc -->

- [Return to Dark Tower — AI MCP Server](#return-to-dark-tower--ai-mcp-server)
  - [⚡ Quick Start](#-quick-start)
    - [🌐 For Web AI Chat Apps (Claude.ai, ChatGPT, etc.)](#-for-web-ai-chat-apps-claudeai-chatgpt-etc)
    - [🖥️ For Desktop AI Tools (Claude Desktop, Cursor, VS Code, etc.)](#️-for-desktop-ai-tools-claude-desktop-cursor-vs-code-etc)
  - [What is MCP?](#what-is-mcp)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Install](#install)
  - [🖥️ Setup with Your AI Tool](#️-setup-with-your-ai-tool)
    - [Claude Desktop](#claude-desktop)
    - [🎯 Cursor](#-cursor)
    - [🐙 VS Code (GitHub Copilot)](#-vs-code-github-copilot)
    - [🌊 Windsurf](#-windsurf)
    - [⚡ Zed](#-zed)
    - [🔎 Perplexity (macOS App)](#-perplexity-macos-app)
    - [🐋 DeepSeek](#-deepseek)
    - [Summary](#summary)
  - [🌐 Web-Based AI Chat Apps](#-web-based-ai-chat-apps)
    - [Start the HTTP Server](#start-the-http-server)
    - [Claude.ai (Web)](#claudeai-web)
    - [ChatGPT / OpenAI](#chatgpt--openai)
    - [Custom Web Applications](#custom-web-applications)
  - [Available Tools](#available-tools)
    - [Connection (8 tools)](#connection-8-tools)
    - [Audio (3 tools)](#audio-3-tools)
    - [Lights (5 tools)](#lights-5-tools)
    - [Drums (4 tools)](#drums-4-tools)
    - [Seals (5 tools)](#seals-5-tools)
    - [State \& Glyphs (7 tools)](#state--glyphs-7-tools)
  - [Available Resources](#available-resources)
    - [Tower State Resources](#tower-state-resources)
    - [Game Knowledge Resources](#game-knowledge-resources)
    - [Glyph Icon Resources](#glyph-icon-resources)
  - [Available Prompts](#available-prompts)
  - [Architecture](#architecture)
  - [CLI Options](#cli-options)
  - [Dependencies](#dependencies)
  - [Development](#development)
  - [License](#license)
  - [Acknowledgments](#acknowledgments)

---

## ⚡ Quick Start

> Requires [Node.js 18+](https://nodejs.org). Run `node --version` to check.

### 🌐 For Web AI Chat Apps (Claude.ai, ChatGPT, etc.)

**Step 1 — Open a terminal and start the server:**

```bash
npx -y mcp-server-return-to-dark-tower --http-only --port 3001
```

`npx` fetches the package from npm on first run (cached after that) and starts the server. **Keep this terminal open** — the server runs as long as the window is open.

**Step 2 — Connect your web AI app to the server.**

In your AI app's settings, add a new MCP connection pointing at:

```
http://localhost:3001/mcp
```

See [Web-Based AI Chat Apps](#-web-based-ai-chat-apps) for step-by-step instructions for Claude.ai and ChatGPT.

**Step 3 — Ask it something like:**

> _"Connect to the tower, calibrate it, then turn on all the north doorway lights."_

---

### 🖥️ For Desktop AI Tools (Claude Desktop, Cursor, VS Code, etc.)

**Step 1 — Add this to your AI tool's config file** (find the exact file path for your tool in [Setup with Your AI Tool](#️-setup-with-your-ai-tool)):

```json
{
  "mcpServers": {
    "return-to-dark-tower": {
      "command": "npx",
      "args": ["-y", "mcp-server-return-to-dark-tower", "--stdio-only"]
    }
  }
}
```

**Step 2 — Restart your AI tool.**

When it starts, it runs the `npx` command above — `npx` fetches the package from npm (first run only, cached after that) and launches the server as a background process. No separate terminal needed.

**Step 3 — Ask it something like:**

> _"Connect to the tower, calibrate it, then turn on all the north doorway lights."_

---

## What is MCP?

**MCP (Model Context Protocol)** is an open standard that lets AI assistants use tools and access data from external systems — similar to how a browser loads plugins. Instead of the AI just knowing about your tower, it can _control_ it.

This server implements the MCP standard. Once configured, your AI assistant gains 31 tools it can call by name — things like `tower_play_sound`, `tower_break_seal`, or `tower_rotate_drum` — and it can chain them together to run full dramatic game sequences on command.

**Two ways to connect:**

| Transport | Best for                                                | How it works                                                                               |
| --------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **stdio** | Desktop AI apps (Claude Desktop, Cursor, VS Code, etc.) | The AI app launches this server as a background process and communicates over stdin/stdout |
| **HTTP**  | Web-based AI apps (Claude.ai, ChatGPT web)              | You start the server manually; the AI app connects to it over HTTP                         |

---

## Getting Started

### Prerequisites

Before you begin, make sure you have:

1. **Node.js 18 or newer** — Download from [nodejs.org](https://nodejs.org). To check your version, run `node --version` in a terminal.
2. **Bluetooth Low Energy (BLE) hardware** — Built into most Macs made after 2011 and most modern Windows PCs.
3. **A physical Return to Dark Tower tower**, though you could use the resources in the server without a tower.

**Platform-specific setup:**

| Platform    | What you need to do                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **macOS**   | Nothing extra. After first use, grant Bluetooth permission: System Settings → Privacy & Security → Bluetooth → allow Terminal (or your AI app). |
| **Linux**   | Install BlueZ first: `sudo apt install bluetooth bluez libbluetooth-dev`                                                                        |
| **Windows** | Windows 10 or newer with Bluetooth is required. No extra setup needed.                                                                          |

### Install

The easiest way is to use `npx`, which runs the package directly from npm without any installation step:

```bash
# Test that it works — this starts the server in stdio mode
npx -y mcp-server-return-to-dark-tower --stdio-only
```

> **What is `npx`?** It's a tool that comes bundled with Node.js. It downloads and runs a package from the [npm registry](https://npmjs.com) on demand, so you don't have to install anything globally.

If you'd rather install it globally (for faster startup after the first run):

```bash
npm install -g mcp-server-return-to-dark-tower
```

Pick your AI tool below for the exact config to paste in. You do **not** need to run the server yourself — your AI tool will start it for you using stdio.

<details>
<summary>Prefer to build from source?</summary>

```bash
git clone https://github.com/your-org/mcp-server-return-to-dark-tower.git
cd mcp-server-return-to-dark-tower
npm install
npm run build
```

Then in all config snippets below, replace:

```json
"command": "npx",
"args": ["-y", "mcp-server-return-to-dark-tower", "--stdio-only"]
```

with:

```json
"command": "node",
"args": ["/absolute/path/to/dist/index.js", "--stdio-only"]
```

</details>

---

## 🖥️ Setup with Your AI Tool

Each section is self-contained — jump straight to the tool you use.

All desktop AI tools use **stdio transport**. The config tells the AI app how to launch this server; the app handles the rest. You just edit a JSON (or YAML) config file, save it, and restart your AI app.

> **If the config file doesn't exist yet**, create it as a new empty file at the path shown. All configs shown below are complete and valid — you can paste them as-is if you're starting fresh.
>
> **If the file already exists**, add the `"return-to-dark-tower"` block inside the existing `"mcpServers"` (or equivalent) object. Don't replace the whole file.

---

### Claude Desktop

Claude Desktop reads its config file at startup. After saving changes, you must **fully quit and reopen** the app (⌘Q on Mac, not just closing the window).

**Config file location:**

| OS      | Path                                                              |
| ------- | ----------------------------------------------------------------- |
| macOS   | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json`                     |

> **Tip (macOS):** Open the file quickly in Terminal: `open -e ~/Library/Application\ Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "return-to-dark-tower": {
      "command": "npx",
      "args": ["-y", "mcp-server-return-to-dark-tower", "--stdio-only"]
    }
  }
}
```

After restarting Claude, you should see a hammer icon (🔨) in the chat input area indicating MCP tools are available.

> **Windows note:** If `npx` doesn't work, try replacing `"command": "npx"` with `"command": "node"` and adding the full path to `node_modules/.bin/mcp-server-dark-tower.js` as the first arg, or install globally first.

---

### 🎯 Cursor

Cursor can load MCP config from a project-specific file or a global file.

**Config file locations:**

| Scope             | Path                                          |
| ----------------- | --------------------------------------------- |
| This project only | `.cursor/mcp.json` (in your project root)     |
| All projects      | `~/.cursor/mcp.json` (in your home directory) |

```json
{
  "mcpServers": {
    "return-to-dark-tower": {
      "command": "npx",
      "args": ["-y", "mcp-server-return-to-dark-tower", "--stdio-only"]
    }
  }
}
```

Cursor picks up changes automatically — no restart required.

> **Important:** MCP tools only appear when you're in **Agent mode**. In the Cursor chat panel, look for the mode selector and switch from "Normal" to "Agent" before asking the AI to use the tower.

---

### 🐙 VS Code (GitHub Copilot)

VS Code supports two config locations. The `.vscode/mcp.json` file can be committed to your repo so your whole team shares the same MCP setup.

> **Requires:** VS Code 1.99 or newer. Update via Help → Check for Updates.

**Option A — Workspace config** (recommended, shareable with your team):

Create or edit `.vscode/mcp.json` in your project root:

```json
{
  "servers": {
    "return-to-dark-tower": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-server-return-to-dark-tower", "--stdio-only"]
    }
  }
}
```

**Option B — User settings** (applies to all your projects):

Open `settings.json` (Cmd/Ctrl+Shift+P → "Open User Settings JSON") and add:

```json
{
  "mcp": {
    "servers": {
      "return-to-dark-tower": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "mcp-server-return-to-dark-tower", "--stdio-only"]
      }
    }
  }
}
```

> **Important:** Switch the Copilot Chat panel to **Agent mode** (look for the mode dropdown in the chat panel). MCP tools are not available in Ask or Edit modes.

---

### 🌊 Windsurf

Windsurf uses a single global config file for all MCP servers.

**Config file location:**

| OS            | Path                                              |
| ------------- | ------------------------------------------------- |
| macOS / Linux | `~/.codeium/windsurf/mcp_config.json`             |
| Windows       | `%USERPROFILE%\.codeium\windsurf\mcp_config.json` |

You can also open it from within Windsurf: click the **MCP icon** in the top-right of the Cascade panel → Configure.

```json
{
  "mcpServers": {
    "return-to-dark-tower": {
      "command": "npx",
      "args": ["-y", "mcp-server-return-to-dark-tower", "--stdio-only"]
    }
  }
}
```

Restart Windsurf after saving. The tower tools will appear in the **Cascade** agent panel.

---

### ⚡ Zed

Zed's MCP servers are configured in its global settings file.

**Config file location:**

| OS            | Path                          |
| ------------- | ----------------------------- |
| macOS / Linux | `~/.config/zed/settings.json` |
| Windows       | `%APPDATA%\Zed\settings.json` |

Add the `context_servers` block (alongside any existing settings in the file):

```json
{
  "context_servers": {
    "return-to-dark-tower": {
      "source": "custom",
      "command": "npx",
      "args": ["-y", "mcp-server-return-to-dark-tower", "--stdio-only"],
      "env": {}
    }
  }
}
```

Restart Zed after saving. Open the **Agent Panel** and look for a green dot next to the server name — that means it connected successfully.

---

### 🔎 Perplexity (macOS App)

Perplexity's native MCP support is available in the **Mac App** (download from the App Store). The web interface does not support MCP.

**Requirements:**

- macOS only
- Paid Perplexity plan (Pro or higher)
- The free tier does not include MCP

**Setup:**

1. Install the **Perplexity Mac App** from the App Store if you haven't already
2. Open the app and go to **Account Settings** → **Connectors**
3. Click **"Install Helper"** and install the **PerplexityXPC** helper app when prompted — this is a one-time step required by macOS's App Store sandbox rules
4. Click **"Add Connector"** → **Simple** → **"Add MCP Connector"**
5. Fill in:
   - **Server Name:** `return-to-dark-tower` (or anything you like)
   - **Command:** `npx`
   - **Arguments:** `-y mcp-server-return-to-dark-tower --stdio-only`
6. Click **Save** and wait for the status indicator to show **Running**
7. In a Perplexity chat, click **Sources** and enable the `return-to-dark-tower` connector

There is no config file to edit — everything is done through Perplexity's UI.

> **Note:** Remote MCP support (for the web interface) is on Perplexity's roadmap but not yet available.

---

### 🐋 DeepSeek

DeepSeek's web chat (`chat.deepseek.com`) and API do not currently support MCP — there is no config file or UI to connect an MCP server to DeepSeek directly.

**If you're using DeepSeek through an IDE that supports it** (Cursor and VS Code both allow you to switch the underlying AI model to DeepSeek while keeping their MCP layer), MCP tools work fine. The IDE handles the MCP connection; it's independent of which AI model is powering the responses. Configure the tower using the [Cursor](#-cursor) or [VS Code](#-vs-code-github-copilot) section above, then switch your model to DeepSeek in that IDE's settings.

**If you use DeepSeek's own web or API interface**, MCP is not available at this time. Check [DeepSeek's documentation](https://platform.deepseek.com/docs) for updates.

---

### Summary

| Tool              | Config file                  | Root key          | Agent mode required?   |
| ----------------- | ---------------------------- | ----------------- | ---------------------- |
| Claude Desktop    | `claude_desktop_config.json` | `mcpServers`      | No (always on)         |
| Cursor            | `.cursor/mcp.json`           | `mcpServers`      | **Yes**                |
| VS Code (Copilot) | `.vscode/mcp.json`           | `servers`         | **Yes**                |
| Windsurf          | `mcp_config.json`            | `mcpServers`      | No (Cascade only)      |
| Zed               | `settings.json`              | `context_servers` | No                     |
| Perplexity        | App UI (no file)             | —                 | macOS + paid plan only |
| DeepSeek          | —                            | —                 | Not supported natively |

---

## 🌐 Web-Based AI Chat Apps

Web-based AI tools can't launch processes on your machine the way desktop apps can. Instead, you start the HTTP server yourself and point the web app at it.

### Start the HTTP Server

Open a terminal and run:

```bash
npx mcp-server-return-to-dark-tower --http-only --port 3001
```

**Keep this terminal window open** while you use your web AI tool. The server exposes:

- `http://localhost:3001/mcp` — the main MCP endpoint
- `http://localhost:3001/health` — returns `{"status":"ok"}` if it's running

To verify it's up, open [http://localhost:3001/health](http://localhost:3001/health) in your browser. You should see `{"status":"ok"}`.

> **What is `localhost`?** It means "this computer". The server is running on your machine and is only accessible from your own browser — it's not exposed to the internet by default.

---

### Claude.ai (Web)

Remote MCP connections are available on **Pro, Max, Team, and Enterprise** plans (not the free tier).

1. Go to [claude.ai](https://claude.ai) and open **Settings** → **Integrations**
2. Click **Add Integration** (or **Add MCP Server**)
3. Enter the URL: `http://localhost:3001/mcp`
4. Save. The tower tools will appear in your next conversation.

> **Heads up:** Claude.ai connects from your browser to `localhost`, which works as long as your browser and the server are on the same machine. If you want to use it from another device (like a phone), you'll need to expose the server publicly — see the note below.

<details>
<summary>Accessing from another device or sharing with others</summary>

Use a tunneling tool like [ngrok](https://ngrok.com) to create a public URL for your local server:

```bash
# In a second terminal (while the server is running)
ngrok http 3001
```

ngrok will print a public URL like `https://abc123.ngrok.io`. Use that URL instead of `http://localhost:3001` in your AI app's settings.

⚠️ Anyone with that URL can send commands to your tower. Use ngrok's auth features or keep the session short.

</details>

---

### ChatGPT / OpenAI

ChatGPT added MCP support in late 2025, available through **Developer Mode** (requires ChatGPT Plus or higher).

1. In ChatGPT, open **Settings** → **Developer Mode** (enable it if you haven't)
2. Go to **Connectors** → **Add Connector**
3. Select **Streamable HTTP** as the transport type
4. Enter the URL: `http://localhost:3001/mcp`
5. Save and start a new conversation. Tower tools will be available.

> **Note:** OpenAI's MCP UI is evolving quickly. If "Connectors" has been renamed to "Apps" or similar, look for the MCP integration option there. Check [OpenAI's help docs](https://help.openai.com) for the latest steps.

---

### Custom Web Applications

Building your own web app to control the tower? Use the HTTP endpoint directly.

**Start the server** with both transports running simultaneously:

```bash
npx mcp-server-return-to-dark-tower
# stdio on stdin/stdout  +  HTTP on http://localhost:3001/mcp
```

**Send a command with fetch:**

```javascript
// Generate a session ID once per user session
const sessionId = crypto.randomUUID();

const response = await fetch("http://localhost:3001/mcp", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "mcp-session-id": sessionId, // keeps this session's context consistent
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "tower_play_sound_by_name",
      arguments: { name: "Ashstrider" },
    },
  }),
});

const result = await response.json();
console.log(result);
```

**Subscribe to streaming events (SSE):**

```javascript
const eventSource = new EventSource("http://localhost:3001/mcp");
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Tower event:", data);
};
```

> **CORS:** If your web app runs on a different port (e.g., `localhost:5173`), the browser will block requests to `localhost:3001` due to CORS. Configure your dev server to proxy `/mcp` requests, or add a CORS header to the MCP server. See the [Architecture](#architecture) section for details on how HTTP and stdio share a single tower connection.

---

## Available Tools

### Connection (8 tools)

| Tool                   | Description                                       |
| ---------------------- | ------------------------------------------------- |
| `tower_connect`        | Connect to the tower via BLE                      |
| `tower_disconnect`     | Disconnect from the tower                         |
| `tower_calibrate`      | Calibrate drum positions                          |
| `tower_status`         | Get connection status, calibration state, battery |
| `tower_device_info`    | Get manufacturer, model, firmware info            |
| `tower_is_responsive`  | Active connectivity check                         |
| `tower_cleanup`        | Clean up resources                                |
| `tower_set_monitoring` | Configure connection monitoring                   |

### Audio (3 tools)

| Tool                       | Description                                            |
| -------------------------- | ------------------------------------------------------ |
| `tower_play_sound`         | Play a sound by index (1-113)                          |
| `tower_play_sound_by_name` | Play a sound by name (e.g., "Ashstrider")              |
| `tower_list_sounds`        | List available sounds, optionally filtered by category |

### Lights (5 tools)

| Tool                           | Description                                    |
| ------------------------------ | ---------------------------------------------- |
| `tower_set_lights`             | Set doorway, ledge, and base lights            |
| `tower_set_led`                | Set individual LED by layer and index          |
| `tower_light_sequence`         | Run a named light sequence by ID               |
| `tower_light_sequence_by_name` | Run a light sequence by name (e.g., "victory") |
| `tower_lights_off`             | Turn all lights off                            |

### Drums (4 tools)

| Tool                       | Description                            |
| -------------------------- | -------------------------------------- |
| `tower_rotate`             | Rotate all drums to specific positions |
| `tower_rotate_drum`        | Rotate a single drum to a position     |
| `tower_random_rotate`      | Randomly rotate drums                  |
| `tower_get_drum_positions` | Get current drum positions             |

### Seals (5 tools)

| Tool                     | Description                               |
| ------------------------ | ----------------------------------------- |
| `tower_break_seal`       | Break a seal at a specific side and level |
| `tower_is_seal_broken`   | Check if a specific seal is broken        |
| `tower_get_broken_seals` | Get all broken seals                      |
| `tower_reset_seals`      | Reset all seals                           |
| `tower_random_seal`      | Get a random unbroken seal                |

### State & Glyphs (7 tools)

| Tool                      | Description                     |
| ------------------------- | ------------------------------- |
| `tower_get_state`         | Get current tower state         |
| `tower_send_state`        | Send a tower state update       |
| `tower_get_glyphs`        | Get all glyph positions         |
| `tower_get_glyph`         | Get a specific glyph's position |
| `tower_glyphs_facing`     | Get glyphs facing a direction   |
| `tower_skull_count`       | Get skull drop count            |
| `tower_reset_skull_count` | Reset skull drop count          |

---

## Available Resources

Resources are read-only data the AI can pull in for context (e.g., checking battery level before a long sequence).

### Tower State Resources

| Resource         | URI                     | Description                                |
| ---------------- | ----------------------- | ------------------------------------------ |
| Tower Connection | `tower://connection`    | Connection status, calibration, busy state |
| Device Info      | `tower://device-info`   | Manufacturer, model, firmware revisions    |
| Battery          | `tower://battery`       | Millivolts, percentage, previous values    |
| Drum Positions   | `tower://drums`         | All 3 drum positions                       |
| Glyph Positions  | `tower://glyphs`        | All 5 glyph positions and directions       |
| Seal State       | `tower://seals`         | Broken/unbroken seals                      |
| Tower State      | `tower://state`         | Full tower state snapshot                  |
| Audio Library    | `tower://audio-library` | All 113 sounds with categories             |
| Light Effects    | `tower://light-effects` | 6 effects + 19 named sequences             |

### Game Knowledge Resources

| Resource    | URI                        | Description                             |
| ----------- | -------------------------- | --------------------------------------- |
| Rules       | `tower://game/rules`       | Setup, turn phases, win/loss conditions |
| Adversaries | `tower://game/adversaries` | Abilities, spawn mechanics, escalation  |
| Quests      | `tower://game/quests`      | Quest types, conditions, rewards        |
| Items       | `tower://game/items`       | Equipment, potions, relics              |
| Heroes      | `tower://game/heroes`      | Classes, stats, abilities               |
| Buildings   | `tower://game/buildings`   | Citadel, sanctuary, village, bazaar     |
| Lore        | `tower://game/lore`        | World lore, tower history, flavor       |
| Glossary    | `tower://game/glossary`    | Key terms and concepts                  |

### Glyph Icon Resources

| Resource   | URI                        | Description         |
| ---------- | -------------------------- | ------------------- |
| Cleanse    | `tower://glyphs/cleanse`   | Cleanse glyph SVG   |
| Quest      | `tower://glyphs/quest`     | Quest glyph SVG     |
| Battle     | `tower://glyphs/battle`    | Battle glyph SVG    |
| Banner     | `tower://glyphs/banner`    | Banner glyph SVG    |
| Reinforce  | `tower://glyphs/reinforce` | Reinforce glyph SVG |
| All Glyphs | `tower://glyphs/all`       | Combined SVG sheet  |

---

## Available Prompts

Prompts are pre-built instruction templates you can invoke by name. They chain multiple tools together into a single dramatic sequence.

| Prompt               | Args          | Description                                                  |
| -------------------- | ------------- | ------------------------------------------------------------ |
| `dramatic_entrance`  | `adversary?`  | Connect, calibrate, spawn sound, strobe lights, random drums |
| `victory_sequence`   | `soundIndex?` | Victory sound + victory light sequence                       |
| `defeat_sequence`    | —             | Defeat sound + defeat lights                                 |
| `monthly_transition` | `month?`      | Month end/start sounds and lights                            |
| `dungeon_run`        | `type?`       | Dungeon sound + idle lights                                  |
| `battle_start`       | —             | Battle sound + flicker lights                                |
| `game_master_setup`  | —             | Full game session setup guide                                |
| `sound_browser`      | `category?`   | Browse audio library by category                             |

---

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

---

## CLI Options

| Flag           | Description                                     |
| -------------- | ----------------------------------------------- |
| `--stdio-only` | Run stdio transport only (for desktop AI tools) |
| `--http-only`  | Run HTTP transport only (for web apps)          |
| `--port <n>`   | HTTP port (default: 3001)                       |

---

## Dependencies

| Package                     | Purpose                   |
| --------------------------- | ------------------------- |
| `@modelcontextprotocol/sdk` | MCP server and transport  |
| `ultimatedarktower`         | Tower BLE control library |
| `@stoprocent/noble`         | Node.js BLE backend       |
| `zod`                       | Schema validation         |
| `express`                   | HTTP transport server     |

---

## Development

```bash
npm run dev      # Watch mode with tsx
npm run build    # Compile TypeScript
npm run lint     # Run ESLint + Prettier check
npm test         # Run tests
```

---

## License

MIT — see [LICENSE](LICENSE).

---

## Acknowledgments

- [UltimateDarkTower](https://github.com/ChessMess/UltimateDarkTower) — the BLE library that makes this possible
- [Return to Dark Tower](https://restorationgames.com/return-to-dark-tower/) by Restoration Games
- The original [Dark Tower](<https://en.wikipedia.org/wiki/Dark_Tower_(game)>) (1981) by Milton Bradley
