import { z } from "zod";
import { BluetoothConnectionError } from "ultimatedarktower";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TowerController, wrapToolHandler } from "../tower-controller.js";

export function registerConnectionTools(server: McpServer, tower: TowerController): void {
  server.registerTool(
    "tower_connect",
    {
      title: "Connect to Tower",
      description: "Connect to the Return to Dark Tower via Bluetooth LE",
    },
    () =>
      wrapToolHandler(async () => {
        await tower.connect();
        // Verify the tower is actually connected and responsive; if not, surface an error
        const responsive = await tower.isConnectedAndResponsive();
        if (!tower.isConnected || !responsive) {
          throw new Error("Failed to connect: tower is not responding");
        }
        return "Connected to tower successfully";
      })
  );

  server.registerTool(
    "tower_disconnect",
    {
      title: "Disconnect from Tower",
      description: "Disconnect from the Return to Dark Tower",
    },
    () =>
      wrapToolHandler(async () => {
        // If we were never connected, return a clear informative result rather than
        // claiming success. Otherwise attempt disconnect and verify.
        if (!tower.isConnected) {
          return "Tower was not previously connected";
        }
        await tower.disconnect();
        const responsive = await tower.isConnectedAndResponsive();
        if (tower.isConnected || responsive) {
          throw new Error("Failed to disconnect: tower still appears connected");
        }
        return "Disconnected from tower";
      })
  );

  server.registerTool(
    "tower_calibrate",
    {
      title: "Calibrate Tower",
      description:
        "Calibrate the tower drums. Must be connected first. The tower will rotate all drums to their home positions.",
    },
    () =>
      wrapToolHandler(async () => {
        await tower.calibrate();
        return "Tower calibrated successfully";
      })
  );

  server.registerTool(
    "tower_status",
    {
      title: "Tower Status",
      description: "Get the current tower connection status, calibration state, and battery info",
    },
    () =>
      wrapToolHandler(async () => {
        const status = tower.getConnectionStatus();
        return {
          connected: tower.isConnected,
          calibrated: tower.isCalibrated,
          performingLongCommand: tower.performingLongCommand,
          performingCalibration: tower.performingCalibration,
          connectionStatus: status,
        };
      })
  );

  server.registerTool(
    "tower_device_info",
    {
      title: "Tower Device Info",
      description:
        "Get device information: manufacturer, model, firmware/hardware revision, serial number",
    },
    () =>
      wrapToolHandler(async () => {
        if (!tower.isConnected) {
          throw new BluetoothConnectionError("Tower is not connected. Call tower_connect first.");
        }
        const info = tower.getDeviceInformation();
        return info;
      })
  );

  server.registerTool(
    "tower_is_responsive",
    {
      title: "Check Tower Responsive",
      description: "Active connectivity check — verifies the tower is connected and responding",
    },
    () =>
      wrapToolHandler(async () => {
        const responsive = await tower.isConnectedAndResponsive();
        return { responsive };
      })
  );

  server.registerTool(
    "tower_reconnect",
    {
      title: "Reconnect to Tower",
      description:
        "Clean up, reconnect, and recalibrate the tower in one step. Use this when tower_is_responsive returns false or the tower stops responding after going idle.",
    },
    () =>
      wrapToolHandler(async () => {
        await tower.cleanup();
        await tower.connect();
        const responsive = await tower.isConnectedAndResponsive();
        if (!tower.isConnected || !responsive) {
          throw new Error("Failed to reconnect: tower is not responding after reconnect attempt");
        }
        await tower.calibrate();
        return "Tower reconnected and recalibrated successfully";
      })
  );

  server.registerTool(
    "tower_set_connection_monitoring",
    {
      title: "Set Connection Monitoring",
      description: "Enable or disable connection monitoring with optional frequency and timeout",
      inputSchema: {
        enabled: z.boolean().describe("Enable or disable connection monitoring"),
        frequency: z.number().int().optional().describe("Monitoring frequency in milliseconds"),
        timeout: z.number().int().optional().describe("Connection timeout in milliseconds"),
      },
    },
    (args) =>
      wrapToolHandler(async () => {
        tower.setConnectionMonitoring(args.enabled);
        if (args.frequency !== undefined || args.timeout !== undefined) {
          tower.configureConnectionMonitoring(args.frequency, args.timeout);
        }
        return { enabled: args.enabled, frequency: args.frequency, timeout: args.timeout };
      })
  );

  server.registerTool(
    "tower_set_battery_monitoring",
    {
      title: "Set Battery Monitoring",
      description: "Configure battery heartbeat monitoring",
      inputSchema: {
        enabled: z.boolean().optional().describe("Enable or disable battery monitoring"),
        timeout: z.number().int().optional().describe("Heartbeat timeout in milliseconds"),
        verify: z.boolean().optional().describe("Verify connection on heartbeat timeout"),
      },
    },
    (args) =>
      wrapToolHandler(async () => {
        tower.configureBatteryHeartbeatMonitoring(args.enabled, args.timeout, args.verify);
        return { enabled: args.enabled, timeout: args.timeout, verify: args.verify };
      })
  );
}
