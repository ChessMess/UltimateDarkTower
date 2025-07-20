# UltimateDarkTower

A JavaScript/TypeScript library for controlling the Bluetooth-enabled tower from Restoration Games' Return to Dark Tower board game. Control lights, sounds, drum rotation, and track game state through Web Bluetooth.

I have spent many hours reverse engineering the Tower's protocol in order to create this library, I look forward to what others will create using this! - Chris

## Table of Contents

-   [UltimateDarkTower](#ultimatedarktower)
    -   [Table of Contents](#table-of-contents)
    -   [Features](#features)
    -   [Live Examples](#live-examples)
    -   [Installation](#installation)
    -   [Documentation](#documentation)
        -   [📖 Complete API Reference](#-complete-api-reference)
        -   [Key Topics Covered:](#key-topics-covered)
    -   [Development](#development)
        -   [Building and Testing](#building-and-testing)
        -   [Project Structure](#project-structure)
    -   [Browser Support](#browser-support)
    -   [Known Issues](#known-issues)
    -   [Community](#community)

## Features

-   **Bluetooth Connection Management** - Reliable connection with automatic monitoring and disconnect detection
-   **Tower Control** - Complete control over lights, sounds, and drum rotation
-   **Game State Tracking** - Track glyph positions, broken seals, and skull counts
-   **Event System** - Callback-based event handling for tower events
-   **TypeScript Support** - Full TypeScript definitions and type safety
-   **Comprehensive Logging** - Multi-output logging system for debugging
-   **Battery Monitoring** - Real-time battery level tracking and low battery warnings

## Live Examples

Try the library in action! Just power on your Tower and visit:

-   **[Tower Controller](https://chessmess.github.io/UltimateDarkTower/dist/examples/controller/TowerController.html)** - Replicates official app functionality and gives examples of library functionality.

-   **[Tower Game](https://chessmess.github.io/UltimateDarkTower/dist/examples/game/TowerGame.html)** - "The Tower's Challenge" - a complete game using just the tower

_Requires Web Bluetooth support (Chrome, Edge, Samsung Internet). For iOS, use the [Bluefy app](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055)._

## Installation

```bash
npm install ultimatedarktower
```

## Documentation

### 📖 [Complete API Reference](Reference.md)

Comprehensive documentation with TypeScript examples, best practices, and troubleshooting guides.

### Key Topics Covered:

-   **Connection Management** - Connecting, disconnecting, and monitoring connection health
-   **Tower Control** - Detailed coverage of all tower commands (lights, sounds, rotation)
-   **Glyph System** - Automatic tracking of glyph positions as towers rotate
-   **Seal Management** - Breaking seals and tracking game state
-   **Event Handling** - Callback system for tower events
-   **Logging System** - Multi-output logging for debugging and monitoring
-   **Best Practices** - Performance tips, error handling, and common patterns
-   **Troubleshooting** - Solutions for common issues and debugging techniques

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
├── udtBleConnection.ts       # Bluetooth connection management
├── udtTowerCommands.ts       # Tower command implementations
├── udtCommandFactory.ts      # Command creation utilities
├── udtCommandQueue.ts        # Command queue management
├── udtTowerResponse.ts       # Response handling
├── udtTowerState.ts          # Tower state management
├── udtHelpers.ts             # Utility helper functions
├── udtLogger.ts              # Logging system
└── udtConstants.ts           # Constants and type definitions

examples/
├── controller/               # Tower controller web app
├── game/                     # Tower game web app
└── assets/                   # Shared assets (images, fonts, etc.)
```

## Browser Support

Web Bluetooth is required for this library to function.

**✅ Supported Browsers:**

-   Chrome (desktop and Android)
-   Microsoft Edge
-   Samsung Internet

**📱 iOS Support:** Use the [Bluefy app](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055) when on iPhone or iPads as Chrome/Safari does not have Web Bluetooth support on Apples platform at the moment.

**❌ Not Supported:** Firefox, Safari ([compatibility details](https://caniuse.com/?search=web%20bluetooth))

## Known Issues

This library is in **Release Candidate** status. Current limitations:

-   **Tower Response Handling** - Not all tower responses are fully processed
    common game patterns are planned

> See [Reference.md](Reference.md) for performance best practices and workarounds.

## Community

Questions? Ideas? Join us on our [Discord Server](https://discord.com/channels/722465956265197618/1167555008376610945/1167842435766952158)!
