# UltimateDarkTower - BETA

The Ultimate Dark Tower library is a JavaScript/TypeScript library that you can use in your projects to control the Tower that comes with Restoration Game's Return To Dark Tower board game.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
  - [JavaScript/ES6](#javascriptes6)
  - [TypeScript](#typescript)
- [Web Application Examples](#web-application-examples)
- [Disconnect Detection & Handling](#disconnect-detection--handling)
  - [How Disconnects Are Detected](#how-disconnects-are-detected)
  - [Handling Disconnects in Your App](#handling-disconnects-in-your-app)
  - [Configuration Options](#configuration-options)
  - [Common Disconnect Scenarios](#common-disconnect-scenarios)
  - [Best Practices](#best-practices)
  - [Example: Robust Connection Management](#example-robust-connection-management)
- [API Reference](#api-reference)
  - [Core Methods](#core-methods)
  - [Properties](#properties)
  - [Event Callbacks](#event-callbacks)
  - [Types](#types)
- [Performance Considerations](#performance-considerations)
  - [Command Rate Limiting](#command-rate-limiting)
  - [Battery Monitoring](#battery-monitoring)
- [Browser Support](#browser-support)
- [Development Scripts](#development-scripts)
  - [Building](#building)
  - [Testing](#testing)
  - [Code Quality](#code-quality)
  - [Publishing](#publishing)
- [Known Issues](#known-issues)
- [Community](#community)

## Installation

```bash
npm install ultimatedarktower
```

## Usage

### JavaScript/ES6

```javascript
import UltimateDarkTower from "ultimatedarktower";

const tower = new UltimateDarkTower();

try {
    // Connect to the tower
    await tower.connect();
    
    // Calibrate the tower
    await tower.calibrate();
    
    // Play a sound
    await tower.playSound(1);
    
    // Rotate the tower
    await tower.rotate("north", "south", "east");
    
    // Randomly rotate all levels
    await tower.randomRotateLevels(0);
    
    // Randomly rotate only the top level
    await tower.randomRotateLevels(1);
} catch (error) {
    console.error("Tower operation failed:", error);
}
```

### TypeScript

```typescript
import UltimateDarkTower, {
    type TowerSide,
    type Lights,
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
} catch (error) {
    console.error("Tower operation failed:", error);
}
```

## Disconnect Detection & Handling

The UltimateDarkTower library includes disconnect detection to ensure reliable communication with the tower device. The library uses multiple detection methods to handle various disconnect scenarios.

### How Disconnects Are Detected

The library employs a multi-layered approach for disconnect detection:

#### 1. Battery Heartbeat Monitoring (Primary Method)

-   **Most Reliable**: The tower automatically sends battery status every ~200ms
-   **Fast Detection**: Detects disconnects within 3 seconds (configurable)
-   **Ideal for**: Battery depletion, power loss, device sleep
-   **Default timeout**: 3000ms (3 seconds)

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

## Web Application Examples

I've created two samples to show the library in action that you can use from your browser. Just power on your Tower and go to the links below!

The first is a Tower Controller that replicates the functionality found in the official Return To Dark Tower app (under settings). In addition I created a game called 'The Towers Challenge'. It's a simple game that only requires the Tower, and serves as a good example while allowing me to 'dogfood' the tower library.

These web apps require Web Bluetooth, which is currently only supported in certain browsers, such as Chrome on the desktop, Chrome on Android mobile devices, Microsoft Edge, and Samsung Internet. You can find a list of all supported browsers at [CanIUse](https://caniuse.com/?search=web%20bluetooth).

You can use Web Bluetooth LE on iOS (iPhone/iPads) by using the Bluefy app:
https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055

[Tower Controller](https://chessmess.github.io/UltimateDarkTower/dist/examples/controller/TowerController.html)

[Tower Game](https://chessmess.github.io/UltimateDarkTower/dist/examples/game/TowerGame.html)

## API Reference

### Core Methods

#### Connection Management
- `connect()` - Connect to the tower device via Bluetooth
- `disconnect()` - Manually disconnect from the tower
- `cleanup()` - Clean up resources and disconnect properly
- `isConnectedAndResponsive()` - Test if tower is connected and responsive

#### Tower Control
- `calibrate()` - Calibrate the tower (required after connection)
- `playSound(soundIndex: number)` - Play a sound by index (1-based)
- `lights(lights: Lights)` - Control tower lights
- `lightOverrides(light: number, soundIndex?: number)` - Override light patterns
- `rotate(top: TowerSide, middle: TowerSide, bottom: TowerSide, soundIndex?: number)` - Rotate tower sections
- `randomRotateLevels(level?: number)` - Randomly rotate drum levels (0=all, 1=top, 2=middle, 3=bottom, 4=top&middle, 5=top&bottom, 6=middle&bottom)
- `breakSeal(seal: Array<number> | number)` - Break game seals with lights and sound effects (seals 1-12)
- `resetTowerSkullCount()` - Reset the skull drop counter

#### Monitoring Configuration
- `setConnectionMonitoring(enabled: boolean)` - Enable/disable connection monitoring
- `configureConnectionMonitoring(frequency?: number, timeout?: number)` - Configure monitoring parameters
- `configureBatteryHeartbeatMonitoring(enabled?: boolean, timeout?: number)` - Configure battery heartbeat detection
- `getConnectionStatus()` - Get detailed connection status

### Properties

#### Connection State
- `isConnected: boolean` - Current connection status
- `isCalibrated: boolean` - Whether tower has been calibrated
- `towerSkullDropCount: number` - Current skull count from tower

#### Configuration
- `batteryNotifyFrequency: number` - Battery notification throttling (default: 15000ms)
- `batteryNotifyOnValueChangeOnly: boolean` - Only notify on battery level changes
- `logDetail: boolean` - Enable detailed logging
- `logTowerResponses: boolean` - Log tower responses

### Event Callbacks

Override these methods to handle tower events:

- `onCalibrationComplete()` - Called when calibration finishes
- `onSkullDrop(count: number)` - Called when skull is dropped
- `onBatteryLevelNotify(millivolts: number)` - Called for battery updates
- `onTowerConnect()` - Called when tower connects
- `onTowerDisconnect()` - Called when tower disconnects

### Types

- `TowerSide` - Tower rotation positions: "north" | "south" | "east" | "west"
- `Lights` - Light configuration object with doorway, ledge, and base properties

## Performance Considerations

### Command Rate Limiting

The tower has limitations on how quickly it can process commands. Sending commands too rapidly can cause the tower to disconnect or become unresponsive.

**Best Practices:**
- Allow time between commands (recommended: 200-500ms minimum)
- Wait for calibration to complete before sending other commands
- Monitor connection status when sending multiple commands
- Use the disconnect detection features to handle connection issues

**Example: Proper Command Timing**
```javascript
// Good: Allow time between commands
await tower.playSound(1);
await new Promise(resolve => setTimeout(resolve, 500));
await tower.rotate("north", "south", "east");

// Better: Check connection status
if (tower.isConnected) {
    await tower.playSound(1);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (tower.isConnected) {
        await tower.rotate("north", "south", "east");
    }
}
```

### Battery Monitoring

The tower's battery level affects performance and connection stability:

- Low battery can cause unexpected disconnections
- Monitor battery levels using `onBatteryLevelNotify`
- Consider warning users when battery is below 20%
- Battery heartbeat monitoring is most reliable for detecting power issues

## Browser Support

Web Bluetooth is required for this library to function. Supported browsers include:

- Chrome (desktop and Android)
- Microsoft Edge
- Samsung Internet
- [Full compatibility list](https://caniuse.com/?search=web%20bluetooth)

**iOS Support:** Use the Bluefy app - [App Store](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055)

## Known Issues:

Tower Response Handling is not fully implemented.

-   Command Queue - Currently the library sends commands as soon as they are requested. Need to add in a queue system that looks for a tower status response to the previous command before sending the next. Sending to many commands on after the other will cause the tower to disconnect.

-   Utility Functions - Additional utility functions could be added for common game events and tower operations.

## Community

Join us on our [Discord Server](https://discord.com/channels/722465956265197618/1167555008376610945/1167842435766952158)!
