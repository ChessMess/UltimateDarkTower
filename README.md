# UltimateDarkTower - BETA

The Ultimate Dark Tower library is a JavaScript/TypeScript library that you can use in your projects to control the Tower that comes with Restoration Game's Return To Dark Tower board game.

I have spent many hours reverse engineering the Tower's protocol in order to create this library, I look forward to what others will create using this! - Chris

## Table of Contents

-   [Web Application Examples](#web-application-examples)
-   [Installation](#installation)
-   [Usage](#usage)
-   [Glyph Position Tracking](#glyph-position-tracking)
-   [Disconnect Detection & Handling](#disconnect-detection--handling)
-   [Development Scripts](#development-scripts)
-   [API Reference](#api-reference)
-   [Logging System](#logging-system)
-   [Performance Considerations](#performance-considerations)
-   [Browser Support](#browser-support)
-   [Known Issues](#known-issues)
-   [Community](#community)

## Web Application Examples

I've created two samples to show the library in action that you can use from your browser. Just power on your Tower and go to the links below!

[Tower Controller](https://chessmess.github.io/UltimateDarkTower/dist/examples/controller/TowerController.html)

[Tower Game](https://chessmess.github.io/UltimateDarkTower/dist/examples/game/TowerGame.html)

The first is a Tower Controller that replicates the functionality found in the official Return To Dark Tower app (under settings), and more. In addition I created a game called 'The Towers Challenge'. It's a simple game that only requires the Tower, and serves as a good example while allowing me to 'dogfood' the tower library.

These web apps require Web Bluetooth, which is currently only supported in certain browsers, such as Chrome on the desktop, Chrome on Android mobile devices, Microsoft Edge, and Samsung Internet. You can find a list of all supported browsers at [CanIUse](https://caniuse.com/?search=web%20bluetooth).

You can use Web Bluetooth LE on iOS (iPhone/iPads) by using the Bluefy app:
https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055

## Installation

NOTE: I have not published this as an NPM package just yet. Finalizing some functionality and cleaning up the code base in preperation of doing so.

```bash
npm install ultimatedarktower
```

## Usage

### TypeScript

```typescript
import UltimateDarkTower, {
    type TowerSide,
    type Lights,
    type SealIdentifier,
    type Glyphs,
} from "ultimatedarktower";

const tower = new UltimateDarkTower();

try {
    // Connect to the tower
    await tower.connect();

    // Calibrate the tower
    await tower.calibrate();

    // Control lights with type safety
    const lights: Lights = {
        doorway: [{ position: "north", level: "top", style: "on" }],
    };
    await tower.lights(lights);

    // Rotate with type safety
    const top: TowerSide = "north";
    const middle: TowerSide = "south";
    const bottom: TowerSide = "east";
    await tower.rotate(top, middle, bottom);

    // Randomly rotate levels (parameter is optional, defaults to 0 for all levels)
    await tower.randomRotateLevels(); // All levels
    await tower.randomRotateLevels(4); // Top & middle only

    // Seal tracking with type safety
    const sealToBreak: SealIdentifier = { side: "east", level: "top" };
    await tower.breakSeal(sealToBreak);

    // Check seal status
    const isBroken: boolean = tower.isSealBroken(sealToBreak);
    
    // Get all broken seals
    const allBrokenSeals: SealIdentifier[] = tower.getBrokenSeals();
    
    // Get random unbroken seal
    const randomUnbrokenSeal: SealIdentifier | null = tower.getRandomUnbrokenSeal();

    // Track glyph positions with type safety
    const cleansePosition: TowerSide | null = tower.getGlyphPosition("cleanse");
    const allGlyphPositions: { [key in Glyphs]: TowerSide | null } = tower.getAllGlyphPositions();
} catch (error) {
    console.error("Tower operation failed:", error);
}
```

## Glyph Position Tracking

The UltimateDarkTower library automatically tracks the positions of all glyphs on the tower drums. This feature provides real-time position information as the tower rotates, making it easy to build game logic that depends on glyph locations.

### How It Works

1. **Initialization**: All glyph positions start as `null` until calibration
2. **Calibration**: When calibration completes, positions are set from the `GLYPHS` constant based on the tower's initial drum orientations
3. **Automatic Updates**: Glyph positions are automatically updated whenever drums rotate via `rotate()`, `randomRotateLevels()`, or `MultiCommand()`

### Available Glyphs

The tower tracks these five glyphs:

- **cleanse** - Top level, initially at north
- **quest** - Top level, initially at south  
- **battle** - Middle level, initially at north
- **banner** - Bottom level, initially at north
- **reinforce** - Bottom level, initially at south

### Usage Examples

```javascript
// Check if tower is calibrated before accessing glyph positions
if (tower.isCalibrated) {
    // Get position of a specific glyph
    const cleansePosition = tower.getGlyphPosition("cleanse");
    console.log("Cleanse glyph is at:", cleansePosition); // "north", "east", "south", or "west"
    
    // Get all glyph positions
    const allPositions = tower.getAllGlyphPositions();
    console.log("All glyph positions:", allPositions);
    /* Output:
    {
        cleanse: "north",
        quest: "south", 
        battle: "north",
        banner: "north",
        reinforce: "south"
    }
    */
    
    // Rotate tower and positions update automatically
    await tower.rotate("east", "west", "south");
    
    // Check updated positions
    const newCleansePosition = tower.getGlyphPosition("cleanse");
    console.log("Cleanse moved to:", newCleansePosition); // "east"
} else {
    console.log("Tower not calibrated - glyph positions are null");
}
```

### TypeScript Support

```typescript
import { type Glyphs, type TowerSide } from "ultimatedarktower";

// Type-safe glyph position access
const glyph: Glyphs = "cleanse";
const position: TowerSide | null = tower.getGlyphPosition(glyph);

// Type-safe all positions
const allPositions: { [key in Glyphs]: TowerSide | null } = tower.getAllGlyphPositions();
```

### Game Logic Integration

Use glyph positions to build game mechanics:

```javascript
// Example: Check if cleanse glyph is facing north
function canPerformCleanse() {
    return tower.getGlyphPosition("cleanse") === "north";
}

// Example: Find all glyphs facing a specific direction
function getGlyphsFacing(direction) {
    const positions = tower.getAllGlyphPositions();
    return Object.entries(positions)
        .filter(([glyph, position]) => position === direction)
        .map(([glyph]) => glyph);
}

// Example: Rotate to align a glyph with a specific side
async function alignGlyphTo(glyph, targetSide) {
    const glyphData = GLYPHS[glyph];
    const currentPos = tower.getCurrentDrumPosition(glyphData.level);
    
    // Calculate rotation needed (simplified example)
    if (currentPos !== targetSide) {
        if (glyphData.level === "top") {
            await tower.rotate(targetSide, "north", "north");
        } else if (glyphData.level === "middle") {
            await tower.rotate("north", targetSide, "north");
        } else {
            await tower.rotate("north", "north", targetSide);
        }
    }
}
```

### Important Notes

- Glyph positions are `null` until calibration completes
- Positions are automatically updated for all rotation methods
- The tracking is based on the initial calibrated positions defined in `GLYPHS`
- Glyph positions rotate clockwise with their respective drum levels
- Each glyph belongs to a specific drum level (top, middle, or bottom)

## Disconnect Detection & Handling

The UltimateDarkTower library includes disconnect detection to ensure reliable communication with the tower device. The library uses multiple detection methods to handle various disconnect scenarios.

### Table of Contents

-   [How Disconnects Are Detected](#how-disconnects-are-detected)
-   [Handling Disconnects in Your App](#handling-disconnects-in-your-app)
-   [Configuration Options](#configuration-options)
-   [Common Disconnect Scenarios](#common-disconnect-scenarios)
-   [Best Practices](#best-practices)
-   [Example: Robust Connection Management](#example-robust-connection-management)

### How Disconnects Are Detected

The library employs a multi-layered approach for disconnect detection:

#### Methods

-   [Battery Heartbeat Monitoring (Primary Method)](#1-battery-heartbeat-monitoring-primary-method)
-   [GATT Server Disconnect Events](#2-gatt-server-disconnect-events)
-   [Command Response Timeout](#3-command-response-timeout)
-   [Bluetooth Availability Monitoring](#4-bluetooth-availability-monitoring)

#### 1. Battery Heartbeat Monitoring (Primary Method)

-   **Most Reliable**: The tower automatically sends battery status every ~200ms
-   **Fast Detection**: Detects disconnects within 3 seconds (configurable)
-   **Ideal for**: Battery depletion, power loss, device sleep
-   **Default timeout**: 3000ms (3 seconds)
-   **Long Command Handling**: Extended timeout (30 seconds) during calibration and drum rotation operations

#### 2. GATT Server Disconnect Events

-   **Immediate Detection**: Catches explicit Bluetooth disconnections
-   **Ideal for**: Manual disconnects, range issues, device pairing problems

#### 3. Command Response Timeout

-   **Backup Method**: Monitors general command responses
-   **Heartbeat Commands**: Sends periodic tower state requests when needed
-   **Default timeout**: 30000ms (30 seconds)

#### 4. Bluetooth Availability Monitoring

-   **System-Level**: Detects when Bluetooth is disabled/unavailable
-   **Automatic Handling**: Triggers disconnect when Bluetooth becomes unavailable

### Handling Disconnects in Your App

Set up disconnect handling by overriding the callback functions:

```javascript
const tower = new UltimateDarkTower();

// Handle successful connections
tower.onTowerConnect = () => {
    console.log("Tower connected!");
    // Update your UI to show connected state
    updateConnectionStatus(true);
};

// Handle disconnections
tower.onTowerDisconnect = () => {
    console.log("Tower disconnected!");
    // Update your UI to show disconnected state
    updateConnectionStatus(false);
    // Optionally attempt reconnection
    // attemptReconnection();
};

// Connect to tower
await tower.connect();
```

### Configuration Options

#### Options

-   [Configure Connection Monitoring](#configure-connection-monitoring)
-   [Check Connection Status](#check-connection-status)

#### Configure Connection Monitoring

```javascript
// Set general connection monitoring
tower.configureConnectionMonitoring(
    2000, // Check every 2 seconds
    30000, // Timeout after 30 seconds
);

// Configure battery heartbeat monitoring
tower.configureBatteryHeartbeatMonitoring(
    true, // Enable battery heartbeat monitoring
    3000, // Timeout after 3 seconds without battery status
);

// Enable/disable connection monitoring
tower.setConnectionMonitoring(true);
```

#### Check Connection Status

```javascript
// Simple connection check
const isConnected = tower.isConnected;

// Detailed connection status
const status = tower.getConnectionStatus();
console.log("Connection Status:", {
    connected: status.isConnected,
    batteryHeartbeatHealthy: status.batteryHeartbeatHealthy,
    lastBatteryMs: status.lastBatteryHeartbeatMs,
    lastCommandMs: status.lastCommandResponseMs,
});

// Test if tower is responsive
const isResponsive = await tower.isConnectedAndResponsive();
```

### Common Disconnect Scenarios

| Scenario             | Detection Method    | Detection Time | Typical Cause                 |
| -------------------- | ------------------- | -------------- | ----------------------------- |
| Battery depleted     | Battery heartbeat   | ~3 seconds     | Tower runs out of power       |
| Out of range         | GATT disconnect     | Immediate      | Moved too far from device     |
| Manual disconnect    | GATT disconnect     | Immediate      | User disconnects in settings  |
| Bluetooth disabled   | Availability change | Immediate      | System Bluetooth turned off   |
| Device sleep/suspend | Battery heartbeat   | ~3 seconds     | Computer/phone goes to sleep  |
| Long command timeout | Battery heartbeat   | ~30 seconds    | During calibration/rotation   |
| Connection timeout   | Command timeout     | ~30 seconds    | General communication failure |

### Best Practices

1. **Always Set Disconnect Handlers**: Override `onTowerDisconnect` to handle disconnections gracefully
2. **Update UI State**: Show connection status to users
3. **Implement Reconnection**: Consider automatic or manual reconnection options
4. **Monitor Battery Status**: Use `onBatteryLevelNotify` to warn users of low battery
5. **Handle Errors Gracefully**: Wrap tower commands in try-catch blocks
6. **Clean Up Resources**: Call `tower.cleanup()` when your app shuts down

### Example: Robust Connection Management

```javascript
class TowerManager {
    constructor() {
        this.tower = new UltimateDarkTower();
        this.setupEventHandlers();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
    }

    setupEventHandlers() {
        this.tower.onTowerConnect = () => {
            console.log("Tower connected successfully");
            this.reconnectAttempts = 0;
            this.updateUI("connected");
        };

        this.tower.onTowerDisconnect = () => {
            console.log("Tower disconnected");
            this.updateUI("disconnected");
            this.attemptReconnection();
        };

        this.tower.onBatteryLevelNotify = (millivolts) => {
            const batteryPercentage = this.getBatteryPercentage(millivolts);
            this.updateBatteryUI(percentage);

            // Warn if battery is low
            if (percentage < 20) {
                this.showLowBatteryWarning();
            }
        };
    }

    async connect() {
        try {
            await this.tower.connect();
            await this.tower.calibrate();
        } catch (error) {
            console.error("Connection failed:", error);
            this.updateUI("failed");
        }
    }

    async attemptReconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnection attempt ${this.reconnectAttempts}`);

            // Wait before reconnecting
            setTimeout(() => {
                this.connect();
            }, 2000 * this.reconnectAttempts);
        } else {
            console.log("Max reconnection attempts reached");
            this.updateUI("failed");
        }
    }

    updateUI(status) {
        // Update your application UI based on connection status
    }

    async cleanup() {
        await this.tower.cleanup();
    }
}
```

## Development Scripts

This project includes several npm scripts for development, testing, and building:

### Table of Contents

-   [Building](#building)
-   [Testing](#testing)
-   [Code Quality](#code-quality)
-   [Publishing](#publishing)

### Building

-   `npm run build` - Compiles TypeScript and builds examples (combines TypeScript compilation with example building)
-   `npm run build:examples` - Builds the example web applications and copies HTML files to the dist directory
-   `npm run watch` - Runs TypeScript compiler in watch mode for development

### Testing

-   `npm test` - Runs the test suite using Jest
-   `npm run test:watch` - Runs tests in watch mode (automatically re-runs tests when files change)
-   `npm run test:coverage` - Runs tests and generates coverage reports

### Code Quality

-   `npm run lint` - Runs ESLint to check code quality and style

### Publishing

-   `npm run prepublishOnly` - Automatically runs before publishing to npm (builds the project)

The build process compiles TypeScript files and copies HTML files from the `examples/` directory to the `dist/examples/` directory, making the web applications ready for deployment.

## API Reference

### Table of Contents

-   [Core Methods](#core-methods)
-   [Properties](#properties)
-   [Event Callbacks](#event-callbacks)
-   [Types](#types)

### Core Methods

#### Sections

-   [Connection Management](#connection-management)
-   [Tower Commands](#tower-commands)
-   [Monitoring Configuration](#monitoring-configuration)
-   [Logging System](#logging-system-methods)

#### Connection Management

-   `connect()` - Connect to the tower device via Bluetooth
-   `disconnect()` - Manually disconnect from the tower
-   `cleanup()` - Clean up resources and disconnect properly
-   `isConnectedAndResponsive()` - Test if tower is connected and responsive

#### Tower Commands

These are the commands the library provides to control the tower.

-   `calibrate()` - Calibrate the tower (required after connection)
-   `playSound(soundIndex: number)` - Play a sound by index (1-based)
-   `lights(lights: Lights)` - Control tower lights
-   `lightOverrides(light: number, soundIndex?: number)` - Override light patterns
-   `rotate(top: TowerSide, middle: TowerSide, bottom: TowerSide, soundIndex?: number)` - Rotate tower sections
-   `randomRotateLevels(level?: number)` - Randomly rotate drum levels (0=all, 1=top, 2=middle, 3=bottom, 4=top&middle, 5=top&bottom, 6=middle&bottom)
-   `breakSeal(seal: SealIdentifier)` - Break a single game seal with lights and sound effects
-   `isSealBroken(seal: SealIdentifier)` - Check if a specific seal is broken
-   `getBrokenSeals()` - Get array of all broken seals
-   `resetBrokenSeals()` - Reset all broken seals tracking
-   `getRandomUnbrokenSeal()` - Get a random unbroken seal, or null if all are broken
-   `resetTowerSkullCount()` - Reset the skull drop counter
-   `getGlyphPosition(glyph: Glyphs)` - Get current position of a specific glyph (returns null if not calibrated)
-   `getAllGlyphPositions()` - Get all current glyph positions as an object

#### Monitoring Configuration

-   `setConnectionMonitoring(enabled: boolean)` - Enable/disable connection monitoring
-   `configureConnectionMonitoring(frequency?: number, timeout?: number)` - Configure monitoring parameters
-   `configureBatteryHeartbeatMonitoring(enabled?: boolean, timeout?: number)` - Configure battery heartbeat detection
-   `getConnectionStatus()` - Get detailed connection status

#### Logging System Methods

-   `Logger.getInstance()` - Get the singleton logger instance
-   `logger.debug(message: string, context?: string)` - Log debug messages
-   `logger.info(message: string, context?: string)` - Log informational messages
-   `logger.warn(message: string, context?: string)` - Log warning messages
-   `logger.error(message: string, context?: string)` - Log error messages
-   `logger.setMinLevel(level: LogLevel)` - Set minimum logging level
-   `logger.addOutput(output: LogOutput)` - Add custom output destination

### Properties

#### Sections

-   [Connection State](#connection-state)
-   [Configuration](#configuration)

#### Connection State

-   `isConnected: boolean` - Current connection status
-   `isCalibrated: boolean` - Whether tower has been calibrated
-   `towerSkullDropCount: number` - Current skull count from tower

#### Configuration

-   `batteryNotifyFrequency: number` - Battery notification throttling (default: 15000ms)
-   `batteryNotifyOnValueChangeOnly: boolean` - Only notify on battery level changes
-   `logDetail: boolean` - Enable detailed logging
-   `logTowerResponses: boolean` - Log tower responses

### Event Callbacks

Override these methods to handle tower events:

-   `onCalibrationComplete()` - Called when calibration finishes
-   `onSkullDrop(count: number)` - Called when skull is dropped
-   `onBatteryLevelNotify(millivolts: number)` - Called for battery updates
-   `onTowerConnect()` - Called when tower connects
-   `onTowerDisconnect()` - Called when tower disconnects

### Types

-   `TowerSide` - Tower rotation positions: "north" | "south" | "east" | "west"
-   `TowerLevels` - Tower seal levels: "top" | "middle" | "bottom"
-   `SealIdentifier` - Seal location object: `{ side: TowerSide; level: TowerLevels }`
-   `Lights` - Light configuration object with doorway, ledge, and base properties
-   `Glyphs` - Glyph names: "cleanse" | "quest" | "battle" | "banner" | "reinforce"
-   `LogLevel` - Log level types: "all" | "debug" | "info" | "warn" | "error"
-   `LogOutput` - Interface for custom log output implementations

## Logging System

The UltimateDarkTower library includes a comprehensive logging system that supports multiple output destinations and configurable log levels.

### Table of Contents

-   [Basic Usage](#basic-usage)
-   [TypeScript Usage](#typescript-usage)
-   [Log Levels](#log-levels)
-   [Output Destinations](#output-destinations)
-   [Advanced Configuration](#advanced-configuration)
-   [DOM Output Styling](#dom-output-styling)
-   [Best Practices](#best-practices-1)

### Basic Usage

```javascript
import { logger } from "ultimatedarktower";

// Basic logging
logger.debug("Debug message");
logger.info("Information message");
logger.warn("Warning message");
logger.error("Error message");

// Logging with context
logger.info("Tower connected", "CONNECTION");
logger.error("Calibration failed", "TOWER");
```

### TypeScript Usage

```typescript
import { logger, Logger, LogLevel, LogOutput } from "ultimatedarktower";

// Set log level
const level: LogLevel = "info";
logger.setMinLevel(level);

// Create custom logger instance
const customLogger = new Logger();
customLogger.setMinLevel("debug");
```

### Log Levels

Log levels determine which messages are output based on severity:

-   `"all"` - Shows all log messages (default)
-   `"debug"` - Shows debug, info, warn, and error messages
-   `"info"` - Shows info, warn, and error messages
-   `"warn"` - Shows warn and error messages only
-   `"error"` - Shows error messages only

```javascript
// Set minimum log level
logger.setMinLevel("info"); // Only info, warn, and error messages will be shown
```

### Output Destinations

#### Types

-   [Console Output (Default)](#console-output-default)
-   [DOM Output](#dom-output)
-   [Custom Output](#custom-output)

#### Console Output (Default)

By default, the logger outputs to the browser console:

```javascript
logger.info("This goes to console.info()");
logger.error("This goes to console.error()");
```

#### DOM Output

Log messages can be displayed in a DOM element:

```javascript
import { DOMOutput } from "ultimatedarktower";

// Create DOM output (assumes you have a div with id="log-container")
const domOutput = new DOMOutput("log-container", 50); // Max 50 lines
logger.addOutput(domOutput);

logger.info("This message appears in both console and DOM");
```

#### Custom Output

Create custom output destinations by implementing the `LogOutput` interface:

```javascript
class FileOutput {
    constructor(filename) {
        this.filename = filename;
        this.logs = [];
    }

    write(level, message, timestamp) {
        const logEntry = {
            level,
            message,
            timestamp: timestamp.toISOString(),
        };
        this.logs.push(logEntry);

        // In a real implementation, you might save to local storage
        // or send to a server
        localStorage.setItem(this.filename, JSON.stringify(this.logs));
    }
}

// Add custom output
const fileOutput = new FileOutput("tower-logs.json");
logger.addOutput(fileOutput);
```

### Advanced Configuration

#### Topics

-   [Multiple Outputs](#multiple-outputs)
-   [Context-Aware Logging](#context-aware-logging)

#### Multiple Outputs

```javascript
import { logger, ConsoleOutput, DOMOutput } from "ultimatedarktower";

// Clear default outputs and add custom ones
const customLogger = new Logger();
customLogger.addOutput(new ConsoleOutput());
customLogger.addOutput(new DOMOutput("debug-panel", 100));
customLogger.addOutput(new FileOutput("app-logs.json"));
```

#### Context-Aware Logging

Use context parameters to organize log messages:

```javascript
// Tower operations
logger.info("Starting calibration", "TOWER");
logger.debug("Rotation command sent", "TOWER");
logger.error("Connection lost", "BLUETOOTH");

// Application flow
logger.info("User clicked connect button", "UI");
logger.debug("Processing user input", "GAME");
```

### DOM Output Styling

When using `DOMOutput`, you can style log messages with CSS:

```css
.log-line {
    padding: 4px 8px;
    font-family: monospace;
    font-size: 12px;
    border-bottom: 1px solid #eee;
}

.log-debug {
    color: #666;
}
.log-info {
    color: #0066cc;
}
.log-warn {
    color: #ff9900;
    background-color: #fff3cd;
}
.log-error {
    color: #cc0000;
    background-color: #f8d7da;
}
```

### Best Practices

1. **Use Appropriate Levels**: Reserve `error` for actual errors, `warn` for potential issues, `info` for important events, and `debug` for detailed diagnostics.

2. **Add Context**: Use the context parameter to categorize messages:

    ```javascript
    logger.info("Battery level: 85%", "BATTERY");
    logger.debug("Command response received", "BLUETOOTH");
    ```

3. **Configure for Environment**: Set different log levels for development vs production:

    ```javascript
    const isDevelopment = process.env.NODE_ENV === "development";
    logger.setMinLevel(isDevelopment ? "debug" : "warn");
    ```

4. **Handle Output Errors**: The logger automatically catches and handles output errors to prevent crashes.

5. **Use Singleton Pattern**: Import the pre-configured logger instance for consistency across your application:
    ```javascript
    import { logger } from "ultimatedarktower";
    ```

## Performance Considerations

### Table of Contents

-   [Command Rate Limiting](#command-rate-limiting)
-   [Battery Monitoring](#battery-monitoring)

### Command Rate Limiting

The tower has limitations on how quickly it can process commands. Sending commands too rapidly can cause the tower to disconnect or become unresponsive.

**Best Practices:**

-   Allow time between commands (recommended: 200-500ms minimum)
-   Wait for calibration to complete before sending other commands
-   Allow sufficient time for drum rotation operations to complete
-   Monitor connection status when sending multiple commands
-   Use the disconnect detection features to handle connection issues
-   Be aware that when the tower executes commands no battery status messages are sent. This can be a problem for long running comamnds as they could run afoul of the heartbeat detection. Currently the only long commands are calibration and drum rotations.

**Example: Proper Command Timing**

```javascript
// Good: Allow time between commands
await tower.playSound(1);
await new Promise((resolve) => setTimeout(resolve, 500));
await tower.rotate("north", "south", "east");

// Better: Check connection status
if (tower.isConnected) {
    await tower.playSound(1);
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (tower.isConnected) {
        await tower.rotate("north", "south", "east");
    }
}
```

### Battery Monitoring

The tower's battery level affects performance and connection stability:

-   Low battery can cause unexpected disconnections
-   Monitor battery levels using `onBatteryLevelNotify`
-   Consider warning users when battery is below 20%
-   Battery heartbeat monitoring is most reliable for detecting power issues

## Browser Support

Web Bluetooth is required for this library to function. Supported browsers include:

-   Chrome (desktop and Android)
-   Microsoft Edge
-   Samsung Internet
-   [Full compatibility list](https://caniuse.com/?search=web%20bluetooth)

**iOS Support:** Use the Bluefy app - [App Store](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055)

## Known Issues:

Tower Response Handling is not fully implemented.

-   Command Queue - Currently the library sends commands as soon as they are requested. Need to add in a queue system that looks for a tower status response to the previous command before sending the next. Sending to many commands on after the other will cause the tower to disconnect.

-   Utility Functions - Additional utility functions could be added for common game events and tower operations.

## Community

Join us on our [Discord Server](https://discord.com/channels/722465956265197618/1167555008376610945/1167842435766952158)!
