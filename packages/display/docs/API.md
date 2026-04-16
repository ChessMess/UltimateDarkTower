# API Reference

This document covers the public API exported by `ultimatedarktowerdisplay`.

## Exports

```ts
import { TowerDisplay, TowerStateReadout, TowerSideView } from 'ultimatedarktowerdisplay';
import type {
  TowerDisplayOptions,
  ITowerDisplay,
  RendererType,
  TowerSide,
  SealIdentifier,
} from 'ultimatedarktowerdisplay';
```

---

## Classes

### `TowerDisplay`

High-level wrapper that composes one or both renderers into a DOM container. Recommended entry point for most consumers.

```ts
const display = new TowerDisplay({
  container: document.getElementById('tower')!,
});
```

#### Constructor

```ts
new TowerDisplay(options: TowerDisplayOptions)
```

| Parameter                    | Type                             | Default                    | Description                                                                                                 |
| ---------------------------- | -------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `options.container`          | `HTMLElement`                    | —                          | DOM element to render into                                                                                  |
| `options.renderers`          | `RendererType \| RendererType[]` | `['readout', 'side-view']` | Which renderer(s) to show                                                                                   |
| `options.onSealClick`        | `(seal: SealIdentifier) => void` | —                          | Callback fired whenever the user clicks a seal in the side view                                             |
| `options.clickToToggleSeals` | `boolean`                        | `true`                     | When `true`, clicking a seal toggles its visibility independently of game state. Set to `false` to disable. |

#### Methods

##### `applyState(state: TowerState): void`

Update all renderers with a new decoded tower state. Renders LED grid, drum positions, audio info, skull drops, and LED sequence overrides.

Obtain `TowerState` from the [`ultimatedarktower`](https://www.npmjs.com/package/ultimatedarktower) peer dependency.

**Skull drop detection:** The readout tracks `beam.count` across consecutive calls. When the count increases between two calls, a skull drop animation is shown.

##### `applySeals(brokenSeals: SealIdentifier[]): void`

Update seal visibility in the side view. Pass the full current list of broken seals — the renderer shows seals as hidden (opacity 0) when they appear in this list for the currently displayed side. Call this whenever the set of broken seals changes.

Note: if `clickToToggleSeals` is enabled, user-toggled visibility is independent and merged with this list. A seal is hidden if it appears in either.

##### `showIdle(): void`

Reset all renderers to their idle state.

##### `dispose(): void`

Remove all rendered DOM content and reset internal state. Also clears any user seal toggle state.

---

### `TowerSideView`

SVG side-view renderer showing one rotatable face of the tower with seal overlays and LED markers. Can be used standalone or composed via `TowerDisplay`.

```ts
const view = new TowerSideView(document.getElementById('tower')!);
view.onSealClick = (seal) => console.log(seal.side, seal.level);
```

#### Constructor

```ts
new TowerSideView(container: HTMLElement)
```

#### Public Properties

| Property             | Type                             | Default | Description                                                           |
| -------------------- | -------------------------------- | ------- | --------------------------------------------------------------------- |
| `onSealClick`        | `(seal: SealIdentifier) => void` | —       | Callback fired on every seal click regardless of `clickToToggleSeals` |
| `clickToToggleSeals` | `boolean`                        | `true`  | Enables built-in click-to-toggle visibility on seal overlays          |

When `clickToToggleSeals` is `true`:

- Clicking an intact seal hides it.
- Clicking a hidden seal shows it again.
- Toggle state is tracked per `side + level` key and is independent of `applySeals()`.
- A console message is logged on each click with the seal identity and new visibility state.
- Toggle state is cleared on `dispose()`.

#### Methods

Same as `TowerDisplay`: `applyState(state)`, `applySeals(brokenSeals)`, `showIdle()`, `dispose()`.

---

### `TowerStateReadout`

Text-based readout renderer. Same interface as `TowerDisplay` but takes an `HTMLElement` directly.

```ts
const readout = new TowerStateReadout(document.getElementById('tower')!);
readout.applyState(state);
```

#### Constructor

```ts
new TowerStateReadout(container: HTMLElement)
```

#### Methods

Same as `TowerDisplay`: `applyState(state)`, `applySeals(brokenSeals)`, `showIdle()`, `dispose()`.

---

## Interfaces

### `TowerDisplayOptions`

```ts
interface TowerDisplayOptions {
  /** DOM element to render into. */
  container: HTMLElement;
  /** Which renderer(s) to show. Defaults to ['readout', 'side-view']. */
  renderers?: RendererType | RendererType[];
  /** Called when the user clicks a seal overlay in the side view. */
  onSealClick?: (seal: SealIdentifier) => void;
  /**
   * When true (the default), clicking a seal toggles its visibility
   * independently of game state. Set to false to disable.
   */
  clickToToggleSeals?: boolean;
}
```

### `ITowerDisplay`

Common interface implemented by `TowerDisplay`, `TowerSideView`, and `TowerStateReadout`.

```ts
interface ITowerDisplay {
  applyState(state: TowerState): void;
  applySeals(brokenSeals: SealIdentifier[]): void;
  showIdle(): void;
  dispose(): void;
}
```

### `RendererType`

```ts
type RendererType = 'readout' | 'side-view';
```

### `TowerSide`

```ts
type TowerSide = 'north' | 'east' | 'south' | 'west';
```

### `SealIdentifier`

```ts
type SealIdentifier = { side: TowerSide; level: TowerLevels };
```

`TowerLevels` is `'top' | 'middle' | 'bottom'` — imported from `ultimatedarktower`.

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

### Readout (`tdr-` prefix)

All readout elements use the `tdr-` prefix:

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

### Side View (`tsv-` prefix)

| Class                               | Element                                        |
| ----------------------------------- | ---------------------------------------------- |
| `.tsv-wrapper`                      | Outer wrapper div                              |
| `.tsv-side-selector`                | N/E/S/W button bar                             |
| `.tsv-side-btn`                     | Individual side selector button                |
| `.tsv-side-btn[data-active="true"]` | Currently selected side button                 |
| `.tsv-svg`                          | SVG container div                              |
| `.tsv-seal`                         | Seal overlay SVG element (all seals)           |
| `.tsv-seal-top`                     | Top doorway seal                               |
| `.tsv-seal-middle`                  | Middle doorway seal                            |
| `.tsv-seal-bottom`                  | Bottom doorway seal                            |
| `.tsv-seal[data-broken="true"]`     | Hidden seal (opacity 0)                        |
| `.tsv-seal[data-broken="false"]`    | Visible seal                                   |
| `.tsv-led`                          | LED marker element                             |
| `.tsv-led[data-effect="<effect>"]`  | LED with active effect (same values as `tdr-`) |

---

## Peer Dependency

This package requires [`ultimatedarktower`](https://www.npmjs.com/package/ultimatedarktower) `^2.5.0` as a peer dependency. It provides:

- `TowerState` — the state type passed to `applyState()`
- `GLYPHS`, `TOWER_AUDIO_LIBRARY`, `TOWER_LIGHT_SEQUENCES`, `VOLUME_DESCRIPTIONS`, `LAYER_TO_POSITION`, `LIGHT_INDEX_TO_DIRECTION`, `LIGHT_EFFECTS` — lookup constants used for rendering
