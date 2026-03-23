# UltimateDarkTowerDisplay

DOM-based visual readout for decoded [Ultimate Dark Tower](https://github.com/ChessMess/ultimatedarktower) tower state.

**[Live Demo](https://chessmess.github.io/UltimateDarkTowerDisplay/example/)**

This package renders a live tower dashboard into a DOM element. It is intended for tools that already know how to obtain or decode a `TowerState` and want a compact on-screen display of:

- LED layers and per-light effects
- Drum positions and calibration status
- Visible glyph on each calibrated drum
- Active audio sample, loop flag, and volume
- Beam/skull count and skull-drop transitions
- Active LED sequence override

## What This Package Does

`ultimatedarktowerdisplay` is a renderer. It does not talk to the physical tower, decode packets, or create `TowerState` objects on its own.

Use it alongside [`ultimatedarktower`](https://github.com/ChessMess/ultimatedarktower), which provides the `TowerState` type and helpers such as `createDefaultTowerState()`.

This package intentionally keeps a narrow API surface. It exports display components and display-specific types only. Import protocol constants such as `LIGHT_EFFECTS`, `TOWER_AUDIO_LIBRARY`, and `TOWER_LIGHT_SEQUENCES` from `ultimatedarktower`.

## Installation

```bash
npm install ultimatedarktowerdisplay ultimatedarktower
```

`ultimatedarktower` is a peer dependency and must be installed by the consuming app.

## Quick Start

```ts
import { TowerDisplay } from "ultimatedarktowerdisplay";
import { createDefaultTowerState } from "ultimatedarktower";

const container = document.getElementById("tower");

if (!container) {
  throw new Error("Missing #tower container");
}

const display = new TowerDisplay({ container });
const state = createDefaultTowerState();

display.applyState(state);

// Later, when the tower sends an updated decoded state:
// display.applyState(nextState);

// Reset to the idle placeholder.
display.showIdle();

// Remove rendered DOM when tearing down the view.
display.dispose();
```

Minimal HTML:

```html
<div id="tower"></div>
```

## Typical Integration

In most applications the flow looks like this:

1. Use `ultimatedarktower` to create or decode a `TowerState`.
2. Create a `TowerDisplay` for a container element.
3. Call `applyState(state)` whenever a new decoded state arrives.
4. Call `dispose()` when removing the view.

Example with a manually adjusted state:

```ts
import { TowerDisplay } from "ultimatedarktowerdisplay";
import {
  createDefaultTowerState,
  LIGHT_EFFECTS,
  TOWER_AUDIO_LIBRARY,
} from "ultimatedarktower";

const container = document.getElementById("tower");

if (!container) {
  throw new Error("Missing #tower container");
}

const display = new TowerDisplay({ container });
const state = createDefaultTowerState();

state.layer[0].light[0].effect = LIGHT_EFFECTS.on;
state.layer[0].light[1].effect = LIGHT_EFFECTS.breathe;
state.drum[0].position = 1;
state.drum[0].calibrated = true;
state.audio.sample = TOWER_AUDIO_LIBRARY.Ashstrider.value;
state.audio.loop = true;
state.beam.count = 2;

display.applyState(state);
```

## Expected `TowerState` Shape

You usually do not construct `TowerState` by hand. Start from `createDefaultTowerState()` and mutate fields you care about.

Conceptually, the renderer expects a state shaped like this:

```ts
type TowerState = {
  drum: Array<{
    calibrated: boolean;
    position: number;
  }>;
  layer: Array<{
    light: Array<{
      effect: number;
      loop: boolean;
    }>;
  }>;
  audio: {
    sample: number;
    loop: boolean;
    volume: number;
  };
  beam: {
    count: number;
    fault: boolean;
  };
  led_sequence: number;
};
```

For a valid starting point, prefer:

```ts
import { createDefaultTowerState } from "ultimatedarktower";

const state = createDefaultTowerState();
```

The example page in [example/index.html](./example/index.html) follows this pattern.

## Rendering Behavior

- The constructor immediately renders an idle message: `Waiting for tower state…`
- Styles are injected into `document.head` automatically on first use
- A skull-drop highlight appears only when `beam.count` increases between successive `applyState()` calls
- `dispose()` clears the container and resets internal state, including skull-drop tracking

## API

### `TowerDisplay`

Primary entry point. Wraps `TowerStateReadout` with an options object.

```ts
new TowerDisplay(options: TowerDisplayOptions)
```

| Option      | Type          | Description                                        |
| ----------- | ------------- | -------------------------------------------------- |
| `container` | `HTMLElement` | DOM element that will receive the rendered readout |

Methods:

- `applyState(state: TowerState): void` updates the readout with a decoded tower state
- `showIdle(): void` replaces the readout with the idle placeholder
- `dispose(): void` clears the container and resets internal state

### `TowerStateReadout`

Lower-level renderer for callers that want to pass the container directly.

```ts
new TowerStateReadout(container: HTMLElement)
```

It exposes the same methods as `TowerDisplay`.

### Exported Types

- `ITowerDisplay` common interface implemented by both classes
- `TowerDisplayOptions` configuration object for `TowerDisplay`

`ultimatedarktowerdisplay` does not re-export tower protocol constants or helpers from `ultimatedarktower`.

## Development

Install dependencies:

```bash
npm install
```

Available commands:

```bash
npm run typecheck
npm run lint
npm test
npm run test:coverage
npm run build
npm run dev
npm run dev:example
npm run ci
```

`npm run dev:example` starts the Vite example page and opens [example/index.html](./example/index.html).

## License

MIT
