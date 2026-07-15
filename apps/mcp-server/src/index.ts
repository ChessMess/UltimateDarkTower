#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { localhostHostValidation } from "@modelcontextprotocol/sdk/server/middleware/hostHeaderValidation.js";
import express from "express";
import { randomUUID } from "node:crypto";

import { TowerController } from "./tower-controller.js";
import { McpLogOutput } from "./utils/logger.js";
import { registerConnectionTools } from "./tools/connection.js";
import { registerAudioTools } from "./tools/audio.js";
import { registerLightTools } from "./tools/lights.js";
import { registerDrumTools } from "./tools/drums.js";
import { registerSealTools } from "./tools/seals.js";
import { registerStateTools } from "./tools/state.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

const VERSION = "0.1.0";

function registerAll(server: McpServer, tower: TowerController): void {
  registerConnectionTools(server, tower);
  registerAudioTools(server, tower);
  registerLightTools(server, tower);
  registerDrumTools(server, tower);
  registerSealTools(server, tower);
  registerStateTools(server, tower);
  registerResources(server, tower);
  registerPrompts(server);
}

// Parse CLI args
const args = process.argv.slice(2);
const stdioOnly = args.includes("--stdio-only");
const httpOnly = args.includes("--http-only");
const portIndex = args.indexOf("--port");
const httpPort = portIndex !== -1 ? parseInt(args[portIndex + 1], 10) : 3001;

// Shared tower controller singleton
const tower = TowerController.getInstance();

// Track transports for cleanup
const transports: Map<string, StreamableHTTPServerTransport> = new Map();
let stdioServer: McpServer | null = null;
let httpServer: McpServer | null = null;

async function startStdio(): Promise<void> {
  stdioServer = new McpServer(
    { name: "return-to-dark-tower", version: VERSION },
    { capabilities: { logging: {} } }
  );

  registerAll(stdioServer, tower);

  // Set up MCP log forwarding
  tower.setLoggerOutputs([new McpLogOutput(stdioServer)]);

  const transport = new StdioServerTransport();
  await stdioServer.connect(transport);
}

async function startHttp(): Promise<void> {
  httpServer = new McpServer(
    { name: "return-to-dark-tower-http", version: VERSION },
    { capabilities: { logging: {} } }
  );

  registerAll(httpServer, tower);

  const app = express();
  app.use(express.json());
  app.use(localhostHostValidation());

  // POST /mcp — main JSON-RPC endpoint
  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    const sessionId = transport.sessionId;
    if (sessionId) {
      transports.set(sessionId, transport);
      transport.onclose = () => {
        transports.delete(sessionId);
      };
    }

    await httpServer!.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // GET /mcp — SSE stream for server-initiated notifications
  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing session ID" });
      return;
    }
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  // DELETE /mcp — session teardown
  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing session ID" });
      return;
    }
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  // Health check
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      towerConnected: tower.isConnected,
      towerCalibrated: tower.isCalibrated,
    });
  });

  app.listen(httpPort, () => {
    console.error(`Dark Tower MCP HTTP server listening on http://localhost:${httpPort}/mcp`);
  });
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  console.error("Shutting down...");
  await tower.cleanup();

  for (const transport of transports.values()) {
    await transport.close();
  }

  if (stdioServer) await stdioServer.close();
  if (httpServer) await httpServer.close();

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Start
async function main(): Promise<void> {
  if (!httpOnly) {
    await startStdio();
    if (!stdioOnly) {
      console.error("Stdio transport started");
    }
  }

  if (!stdioOnly) {
    await startHttp();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
