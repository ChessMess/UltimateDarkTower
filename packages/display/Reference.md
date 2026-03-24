# API Reference

This document covers the public API exported by `ultimatedarktowerdisplay`.

## Exports

```ts
import { TowerDisplay, TowerStateReadout } from 'ultimatedarktowerdisplay';
import type { TowerDisplayOptions, ITowerDisplay } from 'ultimatedarktowerdisplay';
```

---

## Classes

### `TowerDisplay`

High-level wrapper that renders decoded tower state into a DOM container. This is the recommended entry point for most consumers.

```ts
const display = new TowerDisplay({
  container: document.getElementById('tower')!,
});
```

#### Constructor

```ts
new TowerDisplay(options: TowerDisplayOptions)
```

| Parameter           | Type          | Description                |
| ------------------- | ------------- | -------------------------- |
| `options.container` | `HTMLElement` | DOM element to render into |

On construction, a CSS stylesheet is injected (once) and the container shows an idle "Waiting for tower state..." message.

#### Methods

##### `applyState(state: TowerState): void`

Update the display with a new decoded tower state. Renders LED grid, drum positions, audio info, skull drops, and LED sequence overrides.

The `TowerState` type comes from the [`ultimatedarktower`](https://www.npmjs.com/package/ultimatedarktower) package (peer dependency). Obtain it by calling `rtdt_unpack_state()` on a raw 20-byte tower command packet.

**Skull drop detection:** The display tracks `beam.count` across consecutive calls. When the count increases between two calls, a skull drop animation is shown.

##### `showIdle(): void`

Reset the display to its idle state, showing "Waiting for tower state...". Useful when the tower disconnects or the session ends.

##### `dispose(): void`

Remove all rendered DOM content and reset internal state (including the beam count tracker). Call this when unmounting the display.

---

### `TowerStateReadout`

Lower-level DOM renderer. Same API as `TowerDisplay` but takes an `HTMLElement` directly instead of an options object. Used internally by `TowerDisplay`.

```ts
const readout = new TowerStateReadout(document.getElementById('tower')!);
readout.applyState(state);
```

#### Constructor

```ts
new TowerStateReadout(container: HTMLElement)
```

#### Methods

Same as `TowerDisplay`: `applyState(state)`, `showIdle()`, `dispose()`.

---

## Interfaces

### `TowerDisplayOptions`

```ts
interface TowerDisplayOptions {
  /** DOM element to render into. */
  container: HTMLElement;
}
```

### `ITowerDisplay`

Common interface implemented by both `TowerDisplay` and `TowerStateReadout`.

```ts
interface ITowerDisplay {
  applyState(state: TowerState): void;
  showIdle(): void;
  dispose(): void;
}
```

---

## Rendered Sections

When `applyState()` is called, the display renders three sections:

### LEDs

A 6-layer x 4-light grid. Each light shows its effect as a data attribute:

| Effect       | CSS `data-effect` value |
| ------------ | ----------------------- |
| Off          | `off`                   |
| On           | `on`                    |
| Breathe      | `breathe`               |
| Breathe Fast | `breathe-fast`          |
| Breathe 50%  | `breathe-50`            |
| Flicker      | `flicker`               |

Layers are labeled by position (e.g., `top`, `upper-middle`, `lower-middle`, `bottom`) using `LAYER_TO_POSITION` from `ultimatedarktower`. Lights are labeled by compass direction (N, E, S, W) using `LIGHT_INDEX_TO_DIRECTION`.

### Drums

Three drums (Top, Middle, Bottom) showing:

- **Position** — compass direction (N, E, S, W)
- **Calibration** — checkmark or dash
- **Glyph** — the glyph name visible on the north-facing side (only when calibrated), resolved from `GLYPHS`

### Info

- **Audio** — sample name (resolved from `TOWER_AUDIO_LIBRARY`), loop flag, volume description
- **Skulls** — beam count with skull drop highlight when count increases
- **LED Sequence** — active sequence override label (resolved from `TOWER_LIGHT_SEQUENCES`), shown only when non-zero

---

## CSS Classes

All rendered elements use the `tdr-` prefix. Key classes:

| Class              | Element                       |
| ------------------ | ----------------------------- |
| `.tdr-idle`        | Idle/waiting message          |
| `.tdr-section`     | Section wrapper               |
| `.tdr-leds`        | LED section                   |
| `.tdr-layer`       | Single LED layer row          |
| `.tdr-layer-label` | Layer position label          |
| `.tdr-led`         | Individual LED indicator      |
| `.tdr-drums`       | Drums section                 |
| `.tdr-drum`        | Single drum row               |
| `.tdr-drum-name`   | Drum name (Top/Middle/Bottom) |
| `.tdr-drum-pos`    | Drum compass position         |
| `.tdr-drum-cal`    | Calibration indicator         |
| `.tdr-glyph`       | Glyph name                    |
| `.tdr-info`        | Info section                  |
| `.tdr-audio`       | Audio display                 |
| `.tdr-audio-name`  | Audio sample name             |
| `.tdr-audio-loop`  | Loop badge                    |
| `.tdr-audio-vol`   | Volume label                  |
| `.tdr-skull-drop`  | Skull drop highlight          |
| `.tdr-beam-count`  | Beam/skull count              |
| `.tdr-led-seq`     | LED sequence override label   |

---

## Peer Dependency

This package requires [`ultimatedarktower`](https://www.npmjs.com/package/ultimatedarktower) `^2.5.0` as a peer dependency. It provides:

- `TowerState` — the state type passed to `applyState()`
- `GLYPHS`, `TOWER_AUDIO_LIBRARY`, `TOWER_LIGHT_SEQUENCES`, `VOLUME_DESCRIPTIONS`, `LAYER_TO_POSITION`, `LIGHT_INDEX_TO_DIRECTION`, `LIGHT_EFFECTS` — lookup constants used for rendering
