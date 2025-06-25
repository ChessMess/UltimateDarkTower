# UltimateDarkTower - BETA

The Ultimate Dark Tower library is a JavaScript/TypeScript library that you can use in your projects to control the Tower that comes with Restoration Game's Return To Dark Tower board game.

## Installation

```bash
npm install ultimatedarktower
```

## Usage

### JavaScript/ES6

```javascript
import UltimateDarkTower from "ultimatedarktower";

const tower = new UltimateDarkTower();

// Connect to the tower
await tower.connect();

// Calibrate the tower
await tower.calibrate();

// Play a sound
await tower.playSound(1);

// Rotate the tower
await tower.Rotate("north", "south", "east");
```

### TypeScript

```typescript
import UltimateDarkTower, {
    type TowerSide,
    type Lights,
} from "ultimatedarktower";

const tower = new UltimateDarkTower();

// Connect to the tower
await tower.connect();

// Calibrate the tower
await tower.calibrate();

// Control lights with type safety
const lights: Lights = {
    doorway: [{ position: "north", level: "top", style: "on" }],
};
await tower.Lights(lights);

// Rotate with type safety
const top: TowerSide = "north";
const middle: TowerSide = "south";
const bottom: TowerSide = "east";
await tower.Rotate(top, middle, bottom);
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

## Browser Support

These web apps require Web Bluetooth, which is currently only supported in certain browsers, such as Chrome on the desktop, Chrome on Android mobile devices, Microsoft Edge, and Samsung Internet. You can find a list of all supported browsers at [CanIUse](https://caniuse.com/?search=web%20bluetooth).

You can use Web Bluetooth LE on iOS (iPhone/iPads) by using the Bluefy app:
https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055

### Web Application Examples

I've created two samples to show the library in action that you can use from your browser. Just power on your Tower and go to the links below!

The first is a Tower Controller that replicates the functionality found in the official Return To Dark Tower app (under settings). In addition I created a game called 'The Towers Challenge'. It's a simple game that only requires the Tower, and serves as a good example while allowing me to 'dogfood' the tower library.

These web apps require Web Bluetooth, which is currently only supported in certain browsers, such as Chrome on the desktop, Chrome on Android mobile devices, Microsoft Edge, and Samsung Internet. You can find a list of all supported browsers at [CanIUse](https://caniuse.com/?search=web%20bluetooth).

You can use Web Bluetooth LE on iOS (iPhone/iPads) by using the Bluefy app:
https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055

[Tower Controller](https://chessmess.github.io/UltimateDarkTower/dist/examples/controller/TowerController.html)

[Tower Game](https://chessmess.github.io/UltimateDarkTower/dist/examples/game/TowerGame.html)

## Known Issues:

Tower Response Handling is not fully implemented.

-   Command Queue - Currently the library sends commands as soon as they are requested. Need to add in a queue system that looks for a tower status response to the previous command before sending the next. Sending to many commands on after the other will cause the tower to disconnect.

-   Utility Functions - Being able to call functions like 'BreakSeal' that handles the lights and sounds for that type of event, Randomize Levels which will can randomize the position of a level, and others such as this.

## Community

Join us on our [Discord Server](https://discord.com/channels/722465956265197618/1167555008376610945/1167842435766952158)!
