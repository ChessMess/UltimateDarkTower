# UltimateDarkTower

[![npm version](https://img.shields.io/npm/v/ultimatedarktower)](https://www.npmjs.com/package/ultimatedarktower)
[![npm downloads](https://img.shields.io/npm/dm/ultimatedarktower)](https://www.npmjs.com/package/ultimatedarktower)
[![license](https://img.shields.io/npm/l/ultimatedarktower)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)
[![node](https://img.shields.io/node/v/ultimatedarktower)](https://nodejs.org/)

A JavaScript/TypeScript library for controlling the Bluetooth-enabled tower from Restoration Games' Return to Dark Tower board game. Control lights, sounds, drum rotation, and track game state via Bluetooth - works in browsers (Web Bluetooth), Node.js, Electron, and React Native.

I have spent many hours reverse engineering the Tower's protocol in order to create this library, I look forward to what others will create using this! - Chris

## Live Examples

Try the library in action! Just power on your Tower and visit:

- **[Tower Controller](https://chessmess.github.io/UltimateDarkTower/dist/examples/controller/TowerController.html)** - Replicates official app functionality and gives examples of library functionality.

_Requires Web Bluetooth support (Chrome, Edge, Samsung Internet). For iOS, use the [Bluefy app](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055)._

## Table of Contents

- [UltimateDarkTower](#ultimatedarktower)
    - [Live Examples](#live-examples)
    - [Table of Contents](#table-of-contents)
    - [Features](#features)
    - [Installation](#installation)
        - [Browser / Web Applications](#browser--web-applications)
        - [Node.js Applications](#nodejs-applications)
    - [Quick Start](#quick-start)
        - [Browser (auto-detected)](#browser-auto-detected)
        - [Node.js (auto-detected)](#nodejs-auto-detected)
        - [Explicit Platform Selection](#explicit-platform-selection)
        - [Custom Adapter (React Native, etc.)](#custom-adapter-react-native-etc)
    - [Documentation](#documentation)
        - [📖 Complete API Reference](#-complete-api-reference)
        - [Key Topics Covered:](#key-topics-covered)
    - [Integration Testing](#integration-testing)
        - [Lights Integration Test](#lights-integration-test)
    - [Development](#development)
        - [Building and Testing](#building-and-testing)
        - [Project Structure](#project-structure)
    - [Platform Support](#platform-support)
        - [Built-in Support (auto-detected)](#built-in-support-auto-detected)
        - [Custom Adapter Support](#custom-adapter-support)
        - [Browser Support](#browser-support)
    - [Known Issues](#known-issues)
    - [Community](#community)

## Features

- **Multi-Platform Bluetooth** - Works in browsers (Web Bluetooth), Node.js (`@stoprocent/noble`), Electron, and React Native via custom adapters
- **Bluetooth Connection Management** - Reliable connection with automatic monitoring and disconnect detection
- **Tower Control** - Complete control over lights, sounds, and drum rotation
- **Game State Tracking** - Track glyph positions, broken seals, and skull counts
- **Event System** - Callback-based event handling for tower events
- **ESM + CJS** - Ships both an ES Module build and a CommonJS build; works with `import` and `require` without configuration
- **TypeScript Support** - Full TypeScript definitions and type safety
- **Comprehensive Logging** - Multi-output logging system for debugging
- **Battery Monitoring** - Real-time battery level tracking and low battery warnings
- **Extensible Adapter Pattern** - Implement `IBluetoothAdapter` for custom platforms

## Installation

### Browser / Web Applications

```bash
npm install ultimatedarktower
```

### Node.js Applications

```bash
npm install ultimatedarktower @stoprocent/noble
```

> `@stoprocent/noble` is an optional peer dependency for BLE support in Node.js environments.
>
> **Platform requirements:** macOS works out of the box. Linux requires BlueZ (`sudo apt install bluetooth bluez libbluetooth-dev`). Windows requires Windows 10+ with BLE support.

## Quick Start

### Browser (auto-detected)

```typescript
import UltimateDarkTower from 'ultimatedarktower';

const tower = new UltimateDarkTower();
await tower.connect(); // Opens browser device picker
await tower.calibrate();
await tower.playSound(1);
await tower.cleanup();
```

### Node.js (auto-detected)

```typescript
import UltimateDarkTower from 'ultimatedarktower';

const tower = new UltimateDarkTower();
await tower.connect(); // Scans for device automatically
await tower.calibrate();
await tower.playSound(1);
await tower.cleanup();
```

### Explicit Platform Selection

```typescript
import UltimateDarkTower, { BluetoothPlatform } from 'ultimatedarktower';

const tower = new UltimateDarkTower({ platform: BluetoothPlatform.NODE });
```

### Custom Adapter (React Native, etc.)

```typescript
import UltimateDarkTower, { IBluetoothAdapter } from 'ultimatedarktower';

class MyCustomAdapter implements IBluetoothAdapter {
    // Implement all IBluetoothAdapter methods
    // See docs/API_REFERENCE.md for the full interface
}

const tower = new UltimateDarkTower({ adapter: new MyCustomAdapter() });
```

## Documentation

### 📖 [Complete API Reference](docs/API_REFERENCE.md)

Comprehensive documentation with TypeScript examples, best practices, and troubleshooting guides.

### 📄 [Seed Format Specification](docs/SEED_FORMAT.md)

Complete documentation of the Return to Dark Tower game seed encoding — base-34 alphabet, setup section bitwise layout, RNG seed polynomial, and what each seed field controls.

### Key Topics Covered:

- **Multi-Platform Setup** - Configuration for Web, Node.js, Electron, and React Native
- **Connection Management** - Connecting, disconnecting, and monitoring connection health
- **Bluetooth Adapters** - Custom adapter interface for extending platform support
- **Tower Control** - Detailed coverage of all tower commands (lights, sounds, rotation)
- **Glyph System** - Automatic tracking of glyph positions as towers rotate
- **Seal Management** - Breaking seals and tracking game state
- **Seed Parser** - Decode, encode, validate, and compare game seeds
- **SystemRandom** - C# System.Random PRNG replica for game state prediction
- **Event Handling** - Callback system for tower events
- **Logging System** - Multi-output logging for debugging and monitoring
- **Best Practices** - Performance tips, error handling, and common patterns
- **Troubleshooting** - Solutions for common issues and debugging techniques

## Integration Testing

Integration tests that require real hardware are located in `tests/integration/` and are not run by default with the main test suite. These tests use the Node.js Bluetooth adapter and require a physical Return to Dark Tower device in range.

To run the calibration integration test:

```bash
npm run test:integration
```

- This will connect to the tower, perform a full calibration sequence, and print the resulting glyph positions.
- The test will fail if the tower is not available or calibration does not complete within 60 seconds.
- Integration tests are not included in automated test runs or npm publish.

### Lights Integration Test

The lights integration test validates the `allLightsOn` and `allLightsOff` API methods using real tower hardware.

**Test steps:**

- Turns all 24 LEDs on (solid effect) for 2 seconds
- Turns all 24 LEDs on (breathe effect) for 3 seconds
- Turns all 24 LEDs off

**How to run:**

```bash
npm run test:integration:lights
```

**Prerequisites:**

- Tower must be powered on and in Bluetooth range
- `@stoprocent/noble` must be installed

**Visual verification:**

- All lights on (solid) for 2 seconds
- All lights breathe effect for 3 seconds
- All lights off

See [API_REFERENCE.md](docs/API_REFERENCE.md) for API details on `allLightsOn` and `allLightsOff`.

**Prerequisites:**

- Tower must be powered on and in Bluetooth range
- `@stoprocent/noble` must be installed (it is a peer dependency)

## Development

### Building and Testing

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Watch mode for development
npm run watch
```

### Project Structure

```
src/
├── index.ts                  # Main exports
├── UltimateDarkTower.ts      # Main class
├── udtBluetoothAdapter.ts    # Bluetooth adapter interface & error types
├── udtBluetoothAdapterFactory.ts  # Platform auto-detection factory
├── udtBleConnection.ts       # Bluetooth connection management
├── udtTowerCommands.ts       # Tower command implementations
├── udtCommandFactory.ts      # Command creation utilities
├── udtCommandQueue.ts        # Command queue management
├── udtTowerResponse.ts       # Response handling
├── udtTowerState.ts          # Tower state management
├── udtGameBoard.ts           # Board locations, kingdoms, and terrain data
├── udtSeedParser.ts          # Game seed encoding/decoding (base-34)
├── udtSystemRandom.ts        # C# System.Random PRNG replica
├── udtHelpers.ts             # Utility helper functions
├── udtLogger.ts              # Logging system
├── udtConstants.ts           # Constants and type definitions
└── adapters/
    ├── WebBluetoothAdapter.ts    # Browser Web Bluetooth implementation
    └── NodeBluetoothAdapter.ts   # Node.js @stoprocent/noble BLE implementation

examples/
├── controller/               # Tower controller web app
├── game/                     # Tower game web app
├── node/                     # Node.js CLI example
└── assets/                   # Shared assets (images, fonts, etc.)
```

## Platform Support

### Built-in Support (auto-detected)

| Platform                         | Bluetooth Library                    | Notes                                    |
| -------------------------------- | ------------------------------------ | ---------------------------------------- |
| Chrome / Edge / Samsung Internet | Web Bluetooth API                    | Desktop and Android                      |
| Node.js                          | `@stoprocent/noble`                  | Requires `npm install @stoprocent/noble` |
| Electron                         | Web Bluetooth or `@stoprocent/noble` | Auto-detects renderer vs main process    |

### Custom Adapter Support

| Platform                   | Recommended Library    | Notes                         |
| -------------------------- | ---------------------- | ----------------------------- |
| React Native               | `react-native-ble-plx` | Implement `IBluetoothAdapter` |
| iOS (via React Native)     | `react-native-ble-plx` | Same as React Native          |
| Android (via React Native) | `react-native-ble-plx` | Same as React Native          |
| Cordova / Capacitor        | Platform BLE plugin    | Implement `IBluetoothAdapter` |

### Browser Support

**iOS:** Use the [Bluefy app](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055) as Chrome/Safari does not support Web Bluetooth on Apple platforms.

**Not Supported:** Firefox, Safari ([compatibility details](https://caniuse.com/?search=web%20bluetooth))

## Known Issues

- **Sounds** - Sounds show as command complete which is true even though the sound itself has not completed. This is just the way the tower works. I'll have to add time lengths to each at some point, just don't use the command complete response as a way of thinking the associated sound has finished playing and you can play another sound.
- **Light Sequences** - Same as sound for lights that play for a duration.

> See [API_REFERENCE.md](docs/API_REFERENCE.md) for performance best practices and workarounds.

## Community

Questions? Ideas? Join us on our [Discord Server](https://discord.com/channels/722465956265197618/1167555008376610945/1167842435766952158)!
