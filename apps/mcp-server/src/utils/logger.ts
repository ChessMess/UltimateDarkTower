import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LogOutput, LogLevel } from "ultimatedarktower";

type McpLogLevel =
  | "debug"
  | "info"
  | "notice"
  | "warning"
  | "error"
  | "critical"
  | "alert"
  | "emergency";

// Map UDT log levels to MCP log levels
const LOG_LEVEL_MAP: Record<string, McpLogLevel> = {
  debug: "debug",
  info: "info",
  warn: "warning",
  error: "error",
  all: "debug",
};

/**
 * Custom LogOutput that forwards UDT log messages to the MCP server.
 */
export class McpLogOutput implements LogOutput {
  constructor(private server: McpServer) {}

  write(level: LogLevel, message: string, _timestamp: Date): void {
    const mcpLevel: McpLogLevel = LOG_LEVEL_MAP[level] ?? "info";
    this.server
      .sendLoggingMessage({
        level: mcpLevel,
        data: message,
      })
      .catch(() => {
        // Ignore errors from logging (e.g., disconnected client)
      });
  }
}
