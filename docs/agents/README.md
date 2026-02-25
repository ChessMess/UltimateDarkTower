# Return to Dark Tower — AI Agents

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Two AI coding agents for the [Return to Dark Tower](https://restorationgames.com/return-to-dark-tower/) ecosystem.

## Table of Contents

- [What is an AI agent?](#what-is-an-ai-agent)
- [Agents in this repo](#agents-in-this-repo)
- [Ultimate Dark Tower — VS Code Coding Agent](#ultimate-dark-tower--vs-code-coding-agent)
- [Return to Dark Tower — Web-Based AI Agent](#return-to-dark-tower--web-based-ai-agent)
- [Related](#related)

---

## What is an AI agent?

An AI agent is an AI assistant that has been given a specific role, context, and set of tools.
Where a general-purpose AI like Claude or ChatGPT can answer almost any question, an agent is
configured upfront — with a system prompt, domain knowledge, and sometimes direct access to
external tools or APIs — so that it behaves as a specialist for a particular task.

In practice, an agent is usually just a markdown file (or a short block of text) that gets
loaded as the AI's instructions before your conversation starts. That file tells the AI who it
is, what it knows, and what it can do.

**The agents in this repo:**

- The **VS Code coding agent** is a `.agent.md` file that GitHub Copilot picks up automatically.
  When you address it with `@ultimate-dark-tower`, Copilot loads those instructions and the AI
  answers as a specialist in the `ultimatedarktower` TypeScript library.

- The **web-based agent** is a system prompt you paste into Claude.ai, ChatGPT, or any other
  AI chat tool. It also wires up an MCP server, giving the AI the ability to call live tool
  endpoints (connect to the physical tower, play sounds, rotate drums, etc.) rather than just
  talk about code.

Neither agent is a separate model or application — they are instructions that shape how an
existing AI model behaves for this specific domain.

---

## Agents in this repo

| Agent | Platform | Use when... |
|-------|----------|-------------|
| [Ultimate Dark Tower](#ultimate-dark-tower--vs-code-coding-agent) | VS Code | Writing TypeScript/JS apps with the [`ultimatedarktower`](https://www.npmjs.com/package/ultimatedarktower) npm library |
| [Return to Dark Tower](#return-to-dark-tower--web-based-ai-agent) | Web AI tools | Controlling or querying the tower via Claude.ai, ChatGPT, or any AI chat interface |

---

## Ultimate Dark Tower — VS Code Coding Agent

A GitHub Copilot custom agent that knows the full `ultimatedarktower` TypeScript API:
class methods, event callbacks, typed errors, constants, and recommended patterns.

### Prerequisites

- [VS Code](https://code.visualstudio.com/) 1.99 or later
- [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) extension
- A GitHub Copilot subscription ([plans](https://github.com/features/copilot))

### Installation

Choose one of the following methods. See the
[VS Code custom agents documentation](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
for full details.

#### Option A — Workspace agent (scoped to one project)

1. In your project, create the folder `.github/agents/` if it doesn't exist
2. Copy [`.github/agents/ultimate-dark-tower.agent.md`](.github/agents/ultimate-dark-tower.agent.md)
   into that folder
3. VS Code auto-discovers it — no restart needed

This scopes the agent to that workspace only.

#### Option B — Profile agent (available in all workspaces)

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **Chat: New Custom Agent** — VS Code opens your profile agents folder
3. Copy `ultimate-dark-tower.agent.md` into that folder

See [agent locations](https://code.visualstudio.com/docs/copilot/customization/custom-agents#_agent-location)
for the exact profile folder path on your OS.

#### Option C — Install button (one click)

Click the button below to install directly into VS Code:

[Install in VS Code](vscode://ms-vscode.chat/openAgentFile?url=https://raw.githubusercontent.com/ChessMess/return-to-dark-tower-agents/main/.github/agents/ultimate-dark-tower.agent.md)

See [sharing custom agents](https://code.visualstudio.com/docs/copilot/customization/custom-agents#_share-custom-agents) for details.

### Usage

1. Open **VS Code Chat** (`Ctrl+Alt+I` / `Cmd+Alt+I`)
2. Type `@` and select **Ultimate Dark Tower** from the dropdown
3. Ask coding questions:

```
@ultimate-dark-tower Scaffold a TypeScript app that connects to the tower and plays a sound
@ultimate-dark-tower How do I rotate the top drum to face east after calibration?
@ultimate-dark-tower Show me the event callback setup for skull drops
@ultimate-dark-tower What error should I catch when the tower isn't found?
```

---

## Return to Dark Tower — Web-Based AI Agent

A system prompt for web-based AI tools (Claude.ai, ChatGPT, Gemini, etc.) that gives the AI
full knowledge of the MCP server's 31 tools, 15 resources, and 8 prompt templates.

### Prerequisites

The MCP server must be running and reachable at `localhost:3001` before the AI can call tools:

```bash
npx -y mcp-server-return-to-dark-tower --http-only --port 3001
```

Keep this terminal open for the duration of your session. See the
[mcp-server-return-to-dark-tower](https://github.com/ChessMess/mcp-server-return-to-dark-tower)
README for full setup instructions including Bluetooth requirements.

> **Web tools and localhost:** Web-based AI services cannot reach `localhost` directly.
> To expose the server, use a tunnel such as
> [ngrok](https://ngrok.com/docs/getting-started/) (`ngrok http 3001`) or
> [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/).
> Replace `localhost:3001` with your tunnel URL in the instructions below.

### Adding to Claude.ai (Projects)

Claude.ai Projects let you attach persistent instructions and an MCP server connection.

1. Go to [Claude.ai](https://claude.ai) and create or open a **Project**
2. Open **Project Settings** → **Instructions**
3. Open [`.github/agents/return-to-dark-tower.agent.md`](.github/agents/return-to-dark-tower.agent.md),
   copy everything **below** the `---` YAML frontmatter block, and paste it into the Instructions field
4. In **Project Settings** → **Integrations**, click **Add integration** → **Model Context Protocol (MCP)**
5. Enter your server URL (e.g. `http://localhost:3001/mcp` or your tunnel URL) and save

See the [Claude.ai Projects help article](https://support.anthropic.com/en/articles/9517075-what-are-projects)
for more details.

### Adding to ChatGPT (Custom GPT)

1. Go to [ChatGPT](https://chatgpt.com) → your profile → **My GPTs** → **Create a GPT**
2. In the **Instructions** field, paste the agent body (same as above — everything below the frontmatter)
3. Under **Actions**, click **Create new action**
4. Set the server URL to `http://localhost:3001/mcp` (or your tunnel URL)
5. ChatGPT will fetch the MCP server's OpenAPI schema automatically

See the [ChatGPT Actions documentation](https://platform.openai.com/docs/actions/getting-started)
for schema configuration details.

### Adding to other AI tools

Most AI tools that support custom system prompts or instructions work the same way:
paste the agent body as the system prompt and configure the MCP server URL in the tool's settings.

Tools that support the [AGENTS.md standard](https://agents.md) (Cursor, Aider, Zed, Warp, Devin,
and [20+ others](https://agents.md/#tools)) will automatically read `AGENTS.md` from this repo
when it is present in your workspace — no additional setup needed.

---

## Related

- [`mcp-server-return-to-dark-tower`](https://www.npmjs.com/package/mcp-server-return-to-dark-tower) — The MCP server
- [`ultimatedarktower`](https://www.npmjs.com/package/ultimatedarktower) — The Bluetooth library
- [UltimateDarkTower on GitHub](https://github.com/chessmess/UltimateDarkTower) — Library source

## License

MIT
