# UltimateDarkTower API Reference

A comprehensive reference guide for the UltimateDarkTower library - your complete toolkit for controlling the Return to Dark Tower board game device via Bluetooth.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Constructor & Configuration](#constructor--configuration)
3. [Bluetooth Adapters](#bluetooth-adapters)
4. [Connection Management](#connection-management)
5. [Tower Control](#tower-control)
6. [Glyph System](#glyph-system)
7. [Seal Management](#seal-management)
8. [Logging System](#logging-system)
9. [Event Handling](#event-handling)
10. [Types and Constants](#types-and-constants)
11. [Best Practices](#best-practices)
12. [Common Patterns](#common-patterns)
13. [Troubleshooting](#troubleshooting)

---

## Quick Start

The library supports multiple platforms: **browsers** (Web Bluetooth), **Node.js** (`@stoprocent/noble`), **Electron**, and **custom platforms** (React Native, etc.) via the adapter pattern.

### Basic Setup and Usage

```typescript
import UltimateDarkTower from 'ultimatedarktower';

// Create tower instance (auto-detects platform)
const tower = new UltimateDarkTower();

// Set up event handlers
tower.onTowerConnect = () => console.log('Tower connected!');
tower.onTowerDisconnect = () => console.log('Tower disconnected!');
tower.onCalibrationComplete = () => console.log('Calibration complete!');

// Connect and calibrate
async function initializeTower() {
    try {
        await tower.connect();
        await tower.calibrate();
        console.log('Tower ready for use!');
    } catch (error) {
        console.error('Failed to initialize tower:', error);
    }
}

// Clean up when done
async function cleanup() {
    await tower.cleanup();
}
```

### Essential First Steps

1. **Connect** - Establish Bluetooth connection
2. **Calibrate** - Determine drum positions (required before other operations)
3. **Use** - Control lights, sounds, and rotation
4. **Cleanup** - Properly disconnect when finished

---

## Constructor & Configuration

### `new UltimateDarkTower(config?: UltimateDarkTowerConfig)`

Creates a new tower instance with optional configuration.

```typescript
interface UltimateDarkTowerConfig {
    /** Platform to use for Bluetooth communication (auto-detect by default) */
    platform?: BluetoothPlatform;
    /** Custom Bluetooth adapter (for testing or custom platforms like React Native) */
    adapter?: IBluetoothAdapter;
}
```

#### Auto-detect (default)

```typescript
// Platform is detected automatically at runtime
const tower = new UltimateDarkTower();
```

#### Explicit Platform

```typescript
import UltimateDarkTower, { BluetoothPlatform } from 'ultimatedarktower';

// Force Web Bluetooth
const tower = new UltimateDarkTower({ platform: BluetoothPlatform.WEB });

// Force Node.js Bluetooth
const tower = new UltimateDarkTower({ platform: BluetoothPlatform.NODE });
```

#### Custom Adapter

```typescript
import UltimateDarkTower, { IBluetoothAdapter } from 'ultimatedarktower';

const tower = new UltimateDarkTower({ adapter: myCustomAdapter });
```

### `BluetoothPlatform` Enum

```typescript
enum BluetoothPlatform {
    WEB = 'web', // Browser Web Bluetooth API
    NODE = 'node', // Node.js @stoprocent/noble library
    AUTO = 'auto', // Auto-detect (default)
}
```

---

## Bluetooth Adapters

The library uses an adapter pattern to abstract Bluetooth operations. Two adapters are included, and you can implement custom adapters for other platforms.

### `IBluetoothAdapter` Interface

All adapters implement this interface:

```typescript
interface IBluetoothAdapter {
    connect(deviceName: string, serviceUuids: string[]): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    isGattConnected(): boolean;
    writeCharacteristic(data: Uint8Array): Promise<void>;
    onCharacteristicValueChanged(callback: (data: Uint8Array) => void): void;
    onDisconnect(callback: () => void): void;
    onBluetoothAvailabilityChanged(callback: (available: boolean) => void): void;
    readDeviceInformation(): Promise<DeviceInformation>;
    cleanup(): Promise<void>;
}
```

### Built-in Adapters

| Adapter                | Platform                                 | Auto-detected |
| ---------------------- | ---------------------------------------- | ------------- |
| `WebBluetoothAdapter`  | Browser (Chrome, Edge, Samsung Internet) | Yes           |
| `NodeBluetoothAdapter` | Node.js (requires `@stoprocent/noble`)   | Yes           |

### Custom Adapter Example (React Native)

```typescript
import { IBluetoothAdapter, DeviceInformation } from 'ultimatedarktower';
import { BleManager } from 'react-native-ble-plx';

class ReactNativeAdapter implements IBluetoothAdapter {
    private manager = new BleManager();

    async connect(deviceName: string, serviceUuids: string[]): Promise<void> {
        // Scan and connect using react-native-ble-plx
    }

    async writeCharacteristic(data: Uint8Array): Promise<void> {
        // Write data to TX characteristic
    }

    // ... implement remaining methods
}

const tower = new UltimateDarkTower({ adapter: new ReactNativeAdapter() });
```

### Error Types

Platform-agnostic error classes for consistent error handling:

```typescript
import {
    BluetoothError, // Base error class
    BluetoothConnectionError, // Connection failures
    BluetoothDeviceNotFoundError, // Device not found during scan
    BluetoothUserCancelledError, // User cancelled device picker (browser)
    BluetoothTimeoutError, // Scan or operation timeout
} from 'ultimatedarktower';

try {
    await tower.connect();
} catch (error) {
    if (error instanceof BluetoothDeviceNotFoundError) {
        console.log('Tower not found - ensure it is powered on');
    } else if (error instanceof BluetoothUserCancelledError) {
        console.log('Device selection was cancelled');
    } else if (error instanceof BluetoothConnectionError) {
        console.log('Connection failed:', error.message);
    }
}
```

### `BluetoothAdapterFactory`

Creates adapters programmatically:

```typescript
import { BluetoothAdapterFactory, BluetoothPlatform } from 'ultimatedarktower';

// Auto-detect platform
const adapter = BluetoothAdapterFactory.create();

// Explicit platform
const webAdapter = BluetoothAdapterFactory.create(BluetoothPlatform.WEB);
const nodeAdapter = BluetoothAdapterFactory.create(BluetoothPlatform.NODE);

// Detect current platform
const platform = BluetoothAdapterFactory.detectPlatform(); // 'web' or 'node'
```

---

## Connection Management

### Connection Methods

#### `connect(): Promise<void>`

Establishes Bluetooth connection to the tower.

```typescript
async function connectToTower() {
    try {
        await tower.connect();
        console.log('Connected successfully');
    } catch (error) {
        console.error('Connection failed:', error);
    }
}
```

#### `disconnect(): Promise<void>`

Disconnects from the tower and cleans up resources.

```typescript
async function disconnectFromTower() {
    await tower.disconnect();
    console.log('Disconnected from tower');
}
```

#### `cleanup(): Promise<void>`

Comprehensive cleanup including connection termination and resource cleanup.

```typescript
// Always call cleanup when your application is closing
window.addEventListener('beforeunload', async () => {
    await tower.cleanup();
});
```

### Connection Status

#### `isConnected: boolean`

Returns current connection state.

```typescript
if (tower.isConnected) {
    console.log('Tower is connected');
} else {
    console.log('Tower is not connected');
}
```

#### `isConnectedAndResponsive(): Promise<boolean>`

Checks if tower is connected and responding to commands.

```typescript
const isResponsive = await tower.isConnectedAndResponsive();
if (isResponsive) {
    console.log('Tower is ready for commands');
}
```

#### `getConnectionStatus(): ConnectionStatus`

Returns detailed connection information.

```typescript
const status = tower.getConnectionStatus();
console.log(`Connected: ${status.isConnected}`);
console.log(`Last heartbeat: ${status.lastHeartbeat}`);
```

#### `getDeviceInformation(): DeviceInformation`

Returns device information read from the tower's Device Information Service (DIS) during connection.

```typescript
const info = tower.getDeviceInformation();
console.log(`Manufacturer: ${info.manufacturerName}`); // "Restoration Games LLC"
console.log(`Model: ${info.modelNumber}`); // "ReturnToDarkTower"
console.log(`Hardware: ${info.hardwareRevision}`); // "1.11"
console.log(`Firmware: ${info.firmwareRevision}`);
console.log(`Software: ${info.softwareRevision}`); // "1.0.0"
```

```typescript
interface DeviceInformation {
    manufacturerName?: string;
    modelNumber?: string;
    serialNumber?: string;
    hardwareRevision?: string;
    firmwareRevision?: string;
    softwareRevision?: string;
    systemId?: string;
    ieeeRegulatory?: string;
    pnpId?: string;
    lastUpdated?: Date;
}
```

### Connection Monitoring

#### `setConnectionMonitoring(enabled: boolean)`

Enable or disable connection monitoring.

```typescript
// Enable monitoring (recommended)
tower.setConnectionMonitoring(true);
```

#### `configureConnectionMonitoring(frequency?: number, timeout?: number)`

Configure monitoring parameters.

```typescript
// Check every 2 seconds, timeout after 30 seconds
tower.configureConnectionMonitoring(2000, 30000);
```

#### `configureBatteryHeartbeatMonitoring(enabled?: boolean, timeout?: number, verifyConnection?: boolean)`

Configure battery-based disconnect detection.

```typescript
// Enable heartbeat monitoring with 3 second timeout
tower.configureBatteryHeartbeatMonitoring(true, 3000, true);
```

---

## Tower Control

### Calibration

#### `calibrate(): Promise<void>`

**Required before any other tower operations.** Determines current drum positions.

```typescript
async function calibrateTower() {
    try {
        console.log('Starting calibration...');
        await tower.calibrate();
        console.log('Calibration complete!');
    } catch (error) {
        console.error('Calibration failed:', error);
    }
}
```

**Best Practice**: Always calibrate after connecting and before any other operations.

#### `isCalibrated: boolean`

Check if tower has been calibrated.

```typescript
if (!tower.isCalibrated) {
    await tower.calibrate();
}
```

### Audio Control

#### `playSound(soundIndex: number): Promise<void>`

Play a sound from the tower's audio library.

```typescript
import { TOWER_AUDIO_LIBRARY } from 'ultimatedarktower';

// Play a specific sound
await tower.playSound(TOWER_AUDIO_LIBRARY.TowerConnected.value);

// Play battle victory sound
await tower.playSound(TOWER_AUDIO_LIBRARY.BattleVictory.value);
```

**Common Sound Examples**:

```typescript
// Game state sounds
await tower.playSound(TOWER_AUDIO_LIBRARY.GameStart.value);
await tower.playSound(TOWER_AUDIO_LIBRARY.TowerConnected.value);
await tower.playSound(TOWER_AUDIO_LIBRARY.MonthStarted.value);

// Battle sounds
await tower.playSound(TOWER_AUDIO_LIBRARY.BattleStart.value);
await tower.playSound(TOWER_AUDIO_LIBRARY.BattleVictory.value);

// Atmospheric sounds
await tower.playSound(TOWER_AUDIO_LIBRARY.TowerIdle1.value);
await tower.playSound(TOWER_AUDIO_LIBRARY.DungeonFootsteps.value);
```

### Light Control

#### `Lights(lights: Lights): Promise<void>`

Control tower LED lights with precise configuration.

```typescript
import { LIGHT_EFFECTS } from 'ultimatedarktower';

// Light up north doorway at top level
await tower.Lights({
    doorway: [
        {
            position: 'north',
            level: 'top',
            style: LIGHT_EFFECTS.on,
        },
    ],
});

// Multiple lights with different effects
await tower.Lights({
    doorway: [
        { position: 'north', level: 'top', style: LIGHT_EFFECTS.breathe },
        { position: 'south', level: 'middle', style: LIGHT_EFFECTS.flicker },
    ],
    ledge: [
        { position: 'east', style: LIGHT_EFFECTS.on },
        { position: 'west', style: LIGHT_EFFECTS.breatheFast },
    ],
    base: [{ position: { side: 'north', level: 'top' }, style: LIGHT_EFFECTS.on }],
});
```

**Light Effect Options**:

```typescript
// Available light effects
LIGHT_EFFECTS.on; // Solid on
LIGHT_EFFECTS.off; // Off
LIGHT_EFFECTS.breathe; // Breathing effect
LIGHT_EFFECTS.breatheFast; // Fast breathing
LIGHT_EFFECTS.breathe50percent; // 50% breathing
LIGHT_EFFECTS.flicker; // Flickering effect
```

#### `lightOverrides(light: number, soundIndex?: number): Promise<void>`

Send light override commands for special effects.

```typescript
// Light override with sound
await tower.lightOverrides(0x0c, TOWER_AUDIO_LIBRARY.TowerAngry1.value);
```

### Drum Rotation

#### `Rotate(top: TowerSide, middle: TowerSide, bottom: TowerSide, soundIndex?: number): Promise<void>`

Rotate tower drums to specific positions.

```typescript
// Rotate all drums to north
await tower.Rotate('north', 'north', 'north');

// Rotate with sound effect
await tower.Rotate('east', 'south', 'west', TOWER_AUDIO_LIBRARY.RotateLoop.value);

// Random positions
const positions = ['north', 'east', 'south', 'west'];
const randomPosition = () => positions[Math.floor(Math.random() * positions.length)];
await tower.Rotate(randomPosition(), randomPosition(), randomPosition());
```

#### `randomRotateLevels(level?: number): Promise<void>`

Randomly rotate specific drum levels.

```typescript
// Rotate all levels randomly
await tower.randomRotateLevels(0);

// Rotate only top drum
await tower.randomRotateLevels(1);

// Rotate only middle drum
await tower.randomRotateLevels(2);

// Rotate only bottom drum
await tower.randomRotateLevels(3);

// Rotate top and middle
await tower.randomRotateLevels(4);
```

**Level Configuration**:

-   `0` = All levels
-   `1` = Top only
-   `2` = Middle only
-   `3` = Bottom only
-   `4` = Top + Middle
-   `5` = Top + Bottom
-   `6` = Middle + Bottom

#### `getCurrentDrumPosition(level: 'top' | 'middle' | 'bottom'): TowerSide`

Get current position of a specific drum.

```typescript
const topPosition = tower.getCurrentDrumPosition('top');
const middlePosition = tower.getCurrentDrumPosition('middle');
const bottomPosition = tower.getCurrentDrumPosition('bottom');

console.log(`Drums: Top=${topPosition}, Middle=${middlePosition}, Bottom=${bottomPosition}`);
```

## Glyph System

The tower tracks glyph positions as drums rotate. Glyphs are game symbols that appear on different drum levels.

### Glyph Types

```typescript
// Available glyphs
type Glyphs = 'cleanse' | 'quest' | 'battle' | 'banner' | 'reinforce';

// Glyph locations after calibration - see src/udtConstants.ts for definition
import { GLYPHS } from 'ultimatedarktower';
```

### Glyph Position Tracking

#### `getGlyphPosition(glyph: Glyphs): TowerSide | null`

Get current position of a specific glyph.

```typescript
const cleansePosition = tower.getGlyphPosition('cleanse');
if (cleansePosition) {
    console.log(`Cleanse glyph is facing ${cleansePosition}`);
} else {
    console.log('Tower not calibrated yet');
}
```

#### `getAllGlyphPositions(): { [key in Glyphs]: TowerSide | null }`

Get all glyph positions at once.

```typescript
const allPositions = tower.getAllGlyphPositions();
console.log('Current glyph positions:', allPositions);

// Example output:
// {
//   cleanse: 'north',
//   quest: 'south',
//   battle: 'east',
//   banner: 'west',
//   reinforce: 'north'
// }
```

#### `getGlyphsFacingDirection(direction: TowerSide): Glyphs[]`

Find all glyphs currently facing a specific direction.

```typescript
const northFacingGlyphs = tower.getGlyphsFacingDirection('north');
console.log(`Glyphs facing north: ${northFacingGlyphs.join(', ')}`);

// Check all directions
const directions = ['north', 'east', 'south', 'west'];
directions.forEach((direction) => {
    const glyphs = tower.getGlyphsFacingDirection(direction);
    console.log(`${direction}: ${glyphs.join(', ')}`);
});
```

### Practical Glyph Usage

```typescript
// Wait for specific glyph to face direction
async function waitForGlyphDirection(glyph: Glyphs, direction: TowerSide) {
    while (tower.getGlyphPosition(glyph) !== direction) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    console.log(`${glyph} is now facing ${direction}`);
}

// Game logic based on glyph positions
function checkForQuestGlyph() {
    const questPosition = tower.getGlyphPosition('quest');
    if (questPosition === 'north') {
        console.log('Quest glyph is active!');
        // Trigger quest logic
    }
}
```

---

## Seal Management

Seals represent breakable elements on the tower for game mechanics.

### Seal Types

```typescript
type SealIdentifier = {
    side: TowerSide; // 'north', 'east', 'south', 'west'
    level: TowerLevels; // 'top', 'middle', 'bottom'
};
```

### Seal Operations

#### `breakSeal(seal: SealIdentifier): Promise<void>`

Break a specific seal with effects.

```typescript
// Break a specific seal
await tower.breakSeal({ side: 'north', level: 'top' });

// Break multiple seals
const sealsToBreak = [
    { side: 'north', level: 'top' },
    { side: 'east', level: 'middle' },
    { side: 'south', level: 'bottom' },
];

for (const seal of sealsToBreak) {
    await tower.breakSeal(seal);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait between seals
}
```

#### `isSealBroken(seal: SealIdentifier): boolean`

Check if a seal is already broken.

```typescript
const seal = { side: 'north', level: 'top' };
if (tower.isSealBroken(seal)) {
    console.log('Seal is already broken');
} else {
    await tower.breakSeal(seal);
}
```

#### `getBrokenSeals(): SealIdentifier[]`

Get list of all broken seals.

```typescript
const brokenSeals = tower.getBrokenSeals();
console.log(`${brokenSeals.length} seals are broken`);
brokenSeals.forEach((seal) => {
    console.log(`Broken: ${seal.level} level, ${seal.side} side`);
});
```

#### `getRandomUnbrokenSeal(): SealIdentifier | null`

Get a random unbroken seal for game mechanics.

```typescript
const randomSeal = tower.getRandomUnbrokenSeal();
if (randomSeal) {
    console.log(`Breaking random seal: ${randomSeal.level} ${randomSeal.side}`);
    await tower.breakSeal(randomSeal);
} else {
    console.log('All seals are broken!');
}
```

#### `resetBrokenSeals(): void`

Reset seal tracking (start new game).

```typescript
// Start new game
tower.resetBrokenSeals();
console.log('All seals reset for new game');
```

### Seal Management Patterns

```typescript
// Game progression based on broken seals
function checkGameProgress() {
    const brokenSeals = tower.getBrokenSeals();
    const totalSeals = 12; // 4 sides × 3 levels
    const progress = (brokenSeals.length / totalSeals) * 100;

    console.log(`Game progress: ${progress.toFixed(1)}%`);

    if (brokenSeals.length === totalSeals) {
        console.log('All seals broken! Game complete!');
    }
}
```

---

## Logging System

The library includes a comprehensive logging system for debugging and monitoring.

### Logger Configuration

#### `setLoggerOutputs(outputs: LogOutput[])`

Configure where log messages are sent.

```typescript
import { ConsoleOutput, DOMOutput, BufferOutput } from 'ultimatedarktower';

// Console only (default)
tower.setLoggerOutputs([new ConsoleOutput()]);

// Log to DOM element
tower.setLoggerOutputs([
    new ConsoleOutput(),
    new DOMOutput('log-container', 200), // element ID, max lines
]);

// Log to buffer for later analysis
const bufferOutput = new BufferOutput(1000, 100); // max entries, clear count
tower.setLoggerOutputs([new ConsoleOutput(), bufferOutput]);
```

### Log Levels and Detail

#### `logDetail: boolean`

Enable detailed logging for debugging.

```typescript
// Enable detailed logging
tower.logDetail = true;

// Disable detailed logging (default)
tower.logDetail = false;
```

#### `logTowerResponses: boolean`

Enable logging of tower responses.

```typescript
// Log all tower responses
tower.logTowerResponses = true;

// Configure response logging
tower.logTowerResponseConfig = {
    showTimestamp: true,
    showHex: true,
    showDecoded: true,
};
```

### Logger Outputs

#### ConsoleOutput

Logs to browser console with appropriate levels.

```typescript
const consoleOutput = new ConsoleOutput();
tower.setLoggerOutputs([consoleOutput]);
```

#### DOMOutput

Logs to a DOM element with filtering capabilities.

```typescript
const domOutput = new DOMOutput('log-container', 100);
tower.setLoggerOutputs([domOutput]);
```

#### BufferOutput

Stores logs in memory for programmatic access.

```typescript
const bufferOutput = new BufferOutput(1000, 100);
tower.setLoggerOutputs([bufferOutput]);

// Access logged data
const allLogs = bufferOutput.getBuffer();
const errorLogs = bufferOutput.getEntriesByLevel('error');
const recentLogs = bufferOutput.getEntriesSince(new Date(Date.now() - 60000));
```

---

## Event Handling

The tower emits various events that you can handle with callback functions.

### Connection Events

#### `onTowerConnect: () => void`

Called when tower connects.

```typescript
tower.onTowerConnect = () => {
    console.log('Tower connected successfully!');
    // Update UI, enable controls, etc.
};
```

#### `onTowerDisconnect: () => void`

Called when tower disconnects.

```typescript
tower.onTowerDisconnect = () => {
    console.log('Tower disconnected!');
    // Disable controls, show reconnect button, etc.
};
```

### Tower Events

#### `onCalibrationComplete: () => void`

Called when calibration finishes.

```typescript
tower.onCalibrationComplete = () => {
    console.log('Tower calibrated and ready!');
    // Enable rotation controls, show glyph positions, etc.
};
```

#### `onSkullDrop: (skullCount: number) => void`

Called when skulls are dropped into the tower.

```typescript
tower.onSkullDrop = (skullCount: number) => {
    console.log(`${skullCount} skulls dropped into tower`);
    // Update game state, trigger effects, etc.
};
```

#### `onBatteryLevelNotify: (millivolts: number) => void`

Called when battery level updates.

```typescript
import { milliVoltsToPercentage } from 'ultimatedarktower';

tower.onBatteryLevelNotify = (millivolts: number) => {
    const percentage = milliVoltsToPercentage(millivolts);
    console.log(`Battery level: ${percentage}`);

    // Show low battery warning
    if (millivolts < 3000) {
        console.warn('Low battery warning!');
    }
};
```

### Event Handling Best Practices

```typescript
// Set up all event handlers before connecting
function setupEventHandlers() {
    tower.onTowerConnect = () => {
        updateConnectionStatus('connected');
        enableTowerControls();
    };

    tower.onTowerDisconnect = () => {
        updateConnectionStatus('disconnected');
        disableTowerControls();
    };

    tower.onCalibrationComplete = () => {
        updateCalibrationStatus('complete');
        showGlyphPositions();
    };

    tower.onSkullDrop = (count) => {
        updateSkullCount(count);
        playSkullDropEffect();
    };

    tower.onBatteryLevelNotify = (mv) => {
        updateBatteryIndicator(mv);
        checkLowBatteryWarning(mv);
    };
}

// Example UI update functions
function updateConnectionStatus(status: string) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.className = `status-${status}`;
    }
}

function enableTowerControls() {
    const controls = document.querySelectorAll('.tower-control');
    controls.forEach((control) => {
        (control as HTMLButtonElement).disabled = false;
    });
}
```

---

## Types and Constants

### Core Types

```typescript
// Tower positioning
type TowerSide = 'north' | 'east' | 'south' | 'west';
type TowerLevels = 'top' | 'middle' | 'bottom';

// Glyph types
type Glyphs = 'cleanse' | 'quest' | 'battle' | 'banner' | 'reinforce';

// Light configuration
type LightTypes = 'base' | 'doorway' | 'ledge';

// Seal identification
type SealIdentifier = {
    side: TowerSide;
    level: TowerLevels;
};

// Rotation commands
type RotateCommand = {
    top: TowerSide;
    middle: TowerSide;
    bottom: TowerSide;
};

// Light configurations
type DoorwayLight = { position: TowerSide; level: TowerLevels; style: string };
type LedgeLight = { position: TowerSide; style: string };
type BaseLight = { position: BaseLightPosition; style: string };

type Lights = {
    doorway?: Array<DoorwayLight>;
    ledge?: Array<LedgeLight>;
    base?: Array<BaseLight>;
};
```

### Tower State Types

```typescript
import {
    type TowerState,
    type Light,
    type Layer,
    type Drum,
    type Audio,
    type Beam,
    type TowerResponseConfig,
} from 'ultimatedarktower';

// TowerState — Full tower state representation
interface TowerState {
    drum: [Drum, Drum, Drum]; // 3 drum states (top, middle, bottom)
    layer: [Layer, Layer, Layer, Layer, Layer, Layer]; // 6 LED layers
    audio: Audio; // Audio playback state
    beam: Beam; // Beam-break counter state
    led_sequence: number; // LED sequence override
}

// Drum — Individual drum state
interface Drum {
    jammed: boolean; // Whether the drum is jammed
    calibrated: boolean; // Whether the drum has been calibrated
    position: number; // Current position (0-3)
    playSound: boolean; // Play sound during rotation (not recommended)
    reverse: boolean; // Reverse rotation direction (DO NOT USE)
}

// Layer — LED layer containing 4 lights
interface Layer {
    light: [Light, Light, Light, Light];
}

// Light — Individual LED light state
interface Light {
    effect: number; // Light effect (see LIGHT_EFFECTS)
    loop: boolean; // Whether the effect loops
}

// Audio — Audio playback state
interface Audio {
    sample: number; // Audio sample number (see TOWER_AUDIO_LIBRARY)
    loop: boolean; // Whether the audio loops
    volume: number; // Volume level (0-15)
}

// Beam — Beam-break counter state
interface Beam {
    count: number; // Beam-break count
    fault: boolean; // Whether a beam fault has occurred
}

// TowerResponseConfig — Controls which tower responses are logged
interface TowerResponseConfig {
    TOWER_STATE: boolean;
    INVALID_STATE: boolean;
    HARDWARE_FAILURE: boolean;
    MECH_JIGGLE_TRIGGERED: boolean;
    MECH_UNEXPECTED_TRIGGER: boolean;
    MECH_DURATION: boolean;
    DIFFERENTIAL_READINGS: boolean;
    BATTERY_READING: boolean;
    CALIBRATION_FINISHED: boolean;
    LOG_ALL: boolean;
}
```

### Tower State Utilities

```typescript
import {
    rtdt_unpack_state,
    rtdt_pack_state,
    isCalibrated,
    createDefaultTowerState,
    type TowerState,
} from 'ultimatedarktower';

// Unpack binary data from the tower into a TowerState object
const state: TowerState = rtdt_unpack_state(rawData);

// Pack a TowerState object into binary data for transmission
const buffer = new Uint8Array(19);
const success: boolean = rtdt_pack_state(buffer, buffer.length, state);

// Check if all drums are calibrated
const calibrated: boolean = isCalibrated(state);

// Create a default/empty tower state
const defaultState: TowerState = createDefaultTowerState();

// Example: Read current state, modify lights, and send back
const currentState = tower.getCurrentTowerState();
if (currentState) {
    currentState.layer[0].light[0].effect = 3; // Set first light to breathe
    currentState.layer[0].light[0].loop = true;
    await tower.sendTowerState(currentState);
}
```

### Constants

```typescript
// Audio library - over 100 sounds available
import { TOWER_AUDIO_LIBRARY } from 'ultimatedarktower';

// Common sounds
TOWER_AUDIO_LIBRARY.TowerConnected.value; // Tower connection sound
TOWER_AUDIO_LIBRARY.GameStart.value; // Game start sound
TOWER_AUDIO_LIBRARY.BattleStart.value; // Battle start sound
TOWER_AUDIO_LIBRARY.BattleVictory.value; // Battle victory sound

// Light effects
import { LIGHT_EFFECTS } from 'ultimatedarktower';

LIGHT_EFFECTS.on; // Solid on
LIGHT_EFFECTS.off; // Off
LIGHT_EFFECTS.breathe; // Breathing effect
LIGHT_EFFECTS.flicker; // Flickering effect

// Glyph definitions
import { GLYPHS } from 'ultimatedarktower';

GLYPHS.cleanse; // { name: "Cleanse", level: "top", side: "north" }
GLYPHS.quest; // { name: "Quest", level: "top", side: "south" }
GLYPHS.battle; // { name: "Battle", level: "middle", side: "north" }
GLYPHS.banner; // { name: "Banner", level: "bottom", side: "north" }
GLYPHS.reinforce; // { name: "Reinforce", level: "bottom", side: "south" }
```

---

## Best Practices

### Connection Management

```typescript
// ✅ Good: Proper connection lifecycle
class TowerApp {
    private tower: UltimateDarkTower;

    constructor() {
        this.tower = new UltimateDarkTower();
        this.setupEventHandlers();
    }

    async connect() {
        try {
            await this.tower.connect();
            await this.tower.calibrate();
        } catch (error) {
            console.error('Connection failed:', error);
            throw error;
        }
    }

    async disconnect() {
        await this.tower.cleanup();
    }
}

// ❌ Bad: Missing error handling and cleanup
async function badExample() {
    const tower = new UltimateDarkTower();
    await tower.connect(); // No error handling
    // Missing calibration
    // Missing cleanup
}
```

### Command Rate Limiting

```typescript
// ✅ Good: Proper timing between commands
async function rotateSequence() {
    const positions = ['north', 'east', 'south', 'west'];

    for (const position of positions) {
        await tower.Rotate(position, position, position);
        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait between commands
    }
}

// ❌ Bad: Commands sent too quickly
async function badRotateSequence() {
    await tower.Rotate('north', 'north', 'north');
    await tower.Rotate('east', 'east', 'east'); // Too fast!
    await tower.Rotate('south', 'south', 'south'); // May cause disconnection
}
```

### Error Handling

```typescript
// ✅ Good: Comprehensive error handling
async function robustTowerOperation() {
    try {
        if (!tower.isConnected) {
            throw new Error('Tower not connected');
        }

        if (!tower.isCalibrated) {
            await tower.calibrate();
        }

        await tower.playSound(TOWER_AUDIO_LIBRARY.GameStart.value);
    } catch (error) {
        console.error('Tower operation failed:', error);

        // Attempt recovery
        if (!tower.isConnected) {
            try {
                await tower.connect();
                await tower.calibrate();
            } catch (reconnectError) {
                console.error('Reconnection failed:', reconnectError);
            }
        }
    }
}
```

### State Management

```typescript
// ✅ Good: Track tower state
class TowerState {
    private tower: UltimateDarkTower;
    private isReady: boolean = false;

    constructor() {
        this.tower = new UltimateDarkTower();
        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        this.tower.onTowerConnect = () => {
            this.isReady = false; // Need calibration
        };

        this.tower.onCalibrationComplete = () => {
            this.isReady = true;
        };

        this.tower.onTowerDisconnect = () => {
            this.isReady = false;
        };
    }

    async executeCommand(command: () => Promise<void>) {
        if (!this.isReady) {
            throw new Error('Tower not ready - connect and calibrate first');
        }

        await command();
    }
}
```

---

## Common Patterns

### Game State Management

```typescript
class GameManager {
    private tower: UltimateDarkTower;
    private gameState: 'idle' | 'playing' | 'paused' = 'idle';

    constructor() {
        this.tower = new UltimateDarkTower();
        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        this.tower.onSkullDrop = (count) => {
            this.handleSkullDrop(count);
        };

        this.tower.onBatteryLevelNotify = (mv) => {
            this.handleBatteryUpdate(mv);
        };
    }

    async startGame() {
        await this.tower.playSound(TOWER_AUDIO_LIBRARY.GameStart.value);
        await this.tower.Lights({
            doorway: [{ position: 'north', level: 'top', style: LIGHT_EFFECTS.on }],
        });

        this.gameState = 'playing';
    }

    private handleSkullDrop(count: number) {
        if (this.gameState === 'playing') {
            // Game logic for skull drops
            console.log(`Player dropped ${count} skulls`);
        }
    }

    private handleBatteryUpdate(millivolts: number) {
        const percentage = milliVoltsToPercentage(millivolts);
        if (millivolts < 3000) {
            this.showLowBatteryWarning(percentage);
        }
    }
}
```

### UI Integration

```typescript
class TowerUI {
    private tower: UltimateDarkTower;
    private connectButton: HTMLButtonElement;
    private statusDisplay: HTMLElement;

    constructor() {
        this.tower = new UltimateDarkTower();
        this.initializeUI();
        this.setupEventHandlers();
    }

    private initializeUI() {
        this.connectButton = document.getElementById('connect-btn') as HTMLButtonElement;
        this.statusDisplay = document.getElementById('status-display') as HTMLElement;

        this.connectButton.addEventListener('click', () => this.handleConnect());
    }

    private setupEventHandlers() {
        this.tower.onTowerConnect = () => {
            this.updateStatus('Connected - Calibrating...');
            this.connectButton.disabled = true;
        };

        this.tower.onCalibrationComplete = () => {
            this.updateStatus('Ready');
            this.enableTowerControls();
        };

        this.tower.onTowerDisconnect = () => {
            this.updateStatus('Disconnected');
            this.connectButton.disabled = false;
            this.disableTowerControls();
        };
    }

    private async handleConnect() {
        try {
            this.updateStatus('Connecting...');
            await this.tower.connect();
            await this.tower.calibrate();
        } catch (error) {
            this.updateStatus('Connection failed');
            console.error('Connection error:', error);
        }
    }

    private updateStatus(message: string) {
        this.statusDisplay.textContent = message;
    }

    private enableTowerControls() {
        const controls = document.querySelectorAll('.tower-control');
        controls.forEach((control) => {
            (control as HTMLButtonElement).disabled = false;
        });
    }

    private disableTowerControls() {
        const controls = document.querySelectorAll('.tower-control');
        controls.forEach((control) => {
            (control as HTMLButtonElement).disabled = true;
        });
    }
}
```

### Sequence Management

```typescript
class SequenceManager {
    private tower: UltimateDarkTower;
    private isRunning: boolean = false;

    constructor(tower: UltimateDarkTower) {
        this.tower = tower;
    }

    async runSealBreakSequence() {
        if (this.isRunning) return;

        this.isRunning = true;

        try {
            // Play intro sound
            await this.tower.playSound(TOWER_AUDIO_LIBRARY.TowerSeal.value);

            // Flash lights
            await this.flashLights();

            // Break random seal
            const seal = this.tower.getRandomUnbrokenSeal();
            if (seal) {
                await this.tower.breakSeal(seal);
            }

            // Victory sequence
            await this.playVictorySequence();
        } catch (error) {
            console.error('Sequence failed:', error);
        } finally {
            this.isRunning = false;
        }
    }

    private async flashLights() {
        const positions = ['north', 'east', 'south', 'west'];

        for (const position of positions) {
            await this.tower.Lights({
                doorway: [
                    { position: position as TowerSide, level: 'top', style: LIGHT_EFFECTS.on },
                ],
            });
            await new Promise((resolve) => setTimeout(resolve, 200));
        }

        // Turn off all lights
        await this.tower.Lights({
            doorway: positions.map((pos) => ({
                position: pos as TowerSide,
                level: 'top',
                style: LIGHT_EFFECTS.off,
            })),
        });
    }

    private async playVictorySequence() {
        await this.tower.playSound(TOWER_AUDIO_LIBRARY.BattleVictory.value);
        await this.tower.Lights({
            doorway: [{ position: 'north', level: 'top', style: LIGHT_EFFECTS.breathe }],
        });
    }
}
```

---

## Troubleshooting

### Common Issues

#### Connection Problems

**Issue**: Tower won't connect

```typescript
import {
    BluetoothDeviceNotFoundError,
    BluetoothUserCancelledError,
    BluetoothConnectionError,
} from 'ultimatedarktower';

try {
    await tower.connect();
} catch (error) {
    if (error instanceof BluetoothDeviceNotFoundError) {
        console.error('Tower not found - ensure it is powered on and nearby');
    } else if (error instanceof BluetoothUserCancelledError) {
        console.error('Device selection was cancelled by user');
    } else if (error instanceof BluetoothConnectionError) {
        console.error('Connection failed:', error.message);
    }
}
```

**Issue**: Frequent disconnections

```typescript
// Enable all monitoring
tower.setConnectionMonitoring(true);
tower.configureBatteryHeartbeatMonitoring(true, 3000, true);

// Check for command rate limiting
await tower.playSound(1);
await new Promise((resolve) => setTimeout(resolve, 500)); // Wait between commands
await tower.Rotate('north', 'north', 'north');
```

#### Calibration Issues

**Issue**: Tower not calibrating

```typescript
// Check connection first
if (!tower.isConnected) {
    console.error('Must connect before calibrating');
    return;
}

// Ensure tower is not busy
if (tower.performingLongCommand) {
    console.log('Tower is busy - waiting...');
    while (tower.performingLongCommand) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
}

await tower.calibrate();
```

#### Command Failures

**Issue**: Commands not executing

```typescript
// Check tower state
console.log('Connected:', tower.isConnected);
console.log('Calibrated:', tower.isCalibrated);
console.log('Performing long command:', tower.performingLongCommand);

// Verify responsiveness
const isResponsive = await tower.isConnectedAndResponsive();
if (!isResponsive) {
    console.error('Tower is not responsive');
    // Attempt reconnection
}
```

### Debug Logging

```typescript
// Enable comprehensive logging
tower.logDetail = true;
tower.logTowerResponses = true;
tower.logTowerResponseConfig = {
    showTimestamp: true,
    showHex: true,
    showDecoded: true,
};

// Use buffer output to capture logs
const bufferOutput = new BufferOutput(1000);
tower.setLoggerOutputs([new ConsoleOutput(), bufferOutput]);

// Review logs after issues
function reviewLogs() {
    const logs = bufferOutput.getBuffer();
    const errorLogs = bufferOutput.getEntriesByLevel('error');
    const warningLogs = bufferOutput.getEntriesByLevel('warn');

    console.log('Error logs:', errorLogs);
    console.log('Warning logs:', warningLogs);
}
```

### Performance Optimization

```typescript
// Batch operations efficiently
async function efficientBatchOperation() {
    const operations = [
        () => tower.playSound(1),
        () =>
            tower.Lights({
                doorway: [{ position: 'north', level: 'top', style: LIGHT_EFFECTS.on }],
            }),
        () => tower.Rotate('east', 'east', 'east'),
    ];

    // Execute with proper timing
    for (const operation of operations) {
        await operation();
        await new Promise((resolve) => setTimeout(resolve, 300)); // Rate limiting
    }
}

// Monitor battery for performance
tower.onBatteryLevelNotify = (mv) => {
    if (mv < 3000) {
        console.warn('Low battery may affect performance');
    }
};
```

---

## Platform Support

### Built-in Support (auto-detected)

-   **Chrome** (desktop and Android) - Web Bluetooth
-   **Microsoft Edge** - Web Bluetooth
-   **Samsung Internet** - Web Bluetooth
-   **iOS devices** (via Bluefy app) - Web Bluetooth
-   **Node.js** (Windows, macOS, Linux) - `@stoprocent/noble`
-   **Electron** - Web Bluetooth or Node.js (auto-detected)

### Custom Adapter Support

-   **React Native** (iOS & Android) - via `react-native-ble-plx`
-   **Cordova / Capacitor** - via platform BLE plugins

### Unsupported (no Web Bluetooth)

-   **Firefox**
-   **Safari**

### Platform Detection

```typescript
import { BluetoothAdapterFactory, BluetoothPlatform } from 'ultimatedarktower';

try {
    const platform = BluetoothAdapterFactory.detectPlatform();
    console.log(`Detected platform: ${platform}`); // 'web' or 'node'
} catch (error) {
    console.error('Platform not supported - provide a custom adapter');
}
```

---

## Summary

This reference guide covers all aspects of the UltimateDarkTower library. Key takeaways for junior developers:

1. **Always connect and calibrate** before other operations
2. **Use proper error handling** for all async operations
3. **Implement rate limiting** between commands (300-500ms)
4. **Clean up resources** when done
5. **Monitor connection state** for robust applications
6. **Use event handlers** for responsive applications
7. **Enable logging** for debugging and monitoring

The library provides a comprehensive API for controlling the Return to Dark Tower device, with features for audio, lighting, rotation, and game state management. Follow the patterns and best practices outlined in this guide for reliable, maintainable applications.

For additional examples and implementations, refer to the example applications in the `/examples` directory of the repository.
