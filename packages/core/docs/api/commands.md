# Commands

Calibration, audio, lights, and drum rotation. Stateful variants preserve everything else the tower is doing; non-stateful variants overwrite state with what you send.

> Before any of these will work, you must `connect()` and `calibrate()` — see [GETTING_STARTED.md](../GETTING_STARTED.md) for the lifecycle.

---

## Calibration

### `calibrate(): Promise<void>`

Spins each drum to find its zero point, then returns it to a known position. Required before glyph tracking or drum rotation is meaningful.

```typescript
if (!tower.isCalibrated) await tower.calibrate();
```

### `isCalibrated: boolean`

True after a successful calibration in the current session. Resets when the tower disconnects.

### `performingCalibration: boolean` / `performingLongCommand: boolean`

True while a long-running operation is in progress. Heartbeat detection is suspended during these windows, so don't treat "no heartbeat" as a disconnect signal mid-calibration — the library already does this for you.

While `performingCalibration` is `true`, any other command (`playSound`, `lights`, `rotate`, `allLightsOn`, etc.) is **ignored** rather than queued: the call resolves immediately without sending anything, and a `[UDT][CMD]` warning is logged. This is deliberate — calibration is a several-second physical procedure, and letting commands pile up in the queue during it would otherwise unleash a burst of stale commands on the tower the instant calibration completes. If you need to know whether your command actually went out, check `tower.performingCalibration` before calling, or (with `diagnostics.enabled`) look for a `cmd_ignored_calibration` event in the ring buffer.

---

## Audio

### `playSound(soundIndex: number): Promise<void>`

Plays a sound from `TOWER_AUDIO_LIBRARY`. The tower reports "command complete" the instant the sound _starts_, not when it ends — there's no built-in completion signal for audio.

```typescript
import { TOWER_AUDIO_LIBRARY } from 'ultimatedarktower';

await tower.playSound(TOWER_AUDIO_LIBRARY.TowerConnected.value);
await tower.playSound(TOWER_AUDIO_LIBRARY.BattleVictory.value);
```

There are over 100 sounds available. Browse them in [src/udtConstants.ts](../../src/udtConstants.ts) under `TOWER_AUDIO_LIBRARY`.

### `playSoundStateful(soundIndex, loop?, volume?): Promise<void>`

Same as `playSound`, but constructs a full tower-state packet so that lights, drums, and other state are preserved. Use this when you've been issuing other stateful commands and don't want the tower to revert any side state.

```typescript
await tower.playSoundStateful(TOWER_AUDIO_LIBRARY.TowerIdle1.value, true, 8);
```

---

## Lights

The tower has **24 LEDs** arranged in 6 layers of 4. See [TOWER_TECH_NOTES.md](../TOWER_TECH_NOTES.md#layer-to-physical-position-mapping) for the layer-to-position map.

### Effect constants

```typescript
import { LIGHT_EFFECTS } from 'ultimatedarktower';

LIGHT_EFFECTS.off; // 0
LIGHT_EFFECTS.on; // 1 — solid
LIGHT_EFFECTS.breathe; // 2
LIGHT_EFFECTS.breatheFast; // 3
LIGHT_EFFECTS.breathe50percent; // 4
LIGHT_EFFECTS.flicker; // 5
```

### `Lights(lights: Lights): Promise<void>`

The high-level form — takes a structured object grouping lights by category (`doorway`, `ledge`, `base`).

```typescript
import { LIGHT_EFFECTS } from 'ultimatedarktower';

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

> The method name `Lights` is capitalized for historical reasons. A `lights` (lowercase) alias is also available.

### `setLED(layerIndex, lightIndex, effect, loop?): Promise<void>`

The low-level stateful form. Targets a single LED by layer (0–5) and position (0–3), preserves everything else.

```typescript
// Top ring, north position, solid on
await tower.setLED(0, 0, LIGHT_EFFECTS.on);

// Bottom base, NW corner, breathing
await tower.setLED(5, 3, LIGHT_EFFECTS.breathe, /* loop */ true);
```

### `allLightsOn(effect?): Promise<void>` / `allLightsOff(): Promise<void>`

Turn every LED on (with the given effect) or off, in a single packet that preserves drum / audio / beam state.

```typescript
await tower.allLightsOn(LIGHT_EFFECTS.breathe);
await tower.allLightsOff();
```

### `lightOverrides(light: number, soundIndex?): Promise<void>`

Send special sequence overrides (twinkle, flare-then-fade, angry strobe, gloat, etc.). Sequence codes are in `TOWER_LIGHT_SEQUENCES`.

```typescript
import { TOWER_LIGHT_SEQUENCES, TOWER_AUDIO_LIBRARY } from 'ultimatedarktower';
await tower.lightOverrides(
  TOWER_LIGHT_SEQUENCES.angryStrobe01,
  TOWER_AUDIO_LIBRARY.TowerAngry1.value,
);
```

---

## Drum rotation

The tower has three drums (top, middle, bottom). Each can face one of four sides — `'north' | 'east' | 'south' | 'west'`.

### `Rotate(top, middle, bottom, soundIndex?): Promise<void>`

Multi-drum rotation in one command. Takes string side names.

```typescript
await tower.Rotate('north', 'north', 'north');
await tower.Rotate('east', 'south', 'west', TOWER_AUDIO_LIBRARY.RotateLoop.value);
```

> Capital `R` is the historical name; it's the canonical multi-drum form.

### `rotateWithState(top, middle, bottom, soundIndex?): Promise<void>`

Same shape, but builds a full state packet so lights and audio are preserved.

### `rotateDrumStateful(drumIndex, position, playSound?): Promise<void>`

Single-drum rotation. Takes numeric arguments — `drumIndex` is 0 (top) / 1 (middle) / 2 (bottom), `position` is a numeric side from `RING_LIGHT_POSITIONS`.

```typescript
import { RING_LIGHT_POSITIONS } from 'ultimatedarktower';

await tower.rotateDrumStateful(1, RING_LIGHT_POSITIONS.NORTH);
await tower.rotateDrumStateful(2, RING_LIGHT_POSITIONS.WEST, /* playSound */ true);
```

`RING_LIGHT_POSITIONS` is `{ NORTH: 0, EAST: 1, SOUTH: 2, WEST: 3 }`.

### `randomRotateLevels(level?: number): Promise<void>`

Randomize one or more drums.

| `level` | Drums rotated       |
| ------- | ------------------- |
| `0`     | All three (default) |
| `1`     | Top only            |
| `2`     | Middle only         |
| `3`     | Bottom only         |
| `4`     | Top + middle        |
| `5`     | Top + bottom        |
| `6`     | Middle + bottom     |

### `getCurrentDrumPosition(level): TowerSide`

Read back the current drum facing.

```typescript
const top = tower.getCurrentDrumPosition('top');
const mid = tower.getCurrentDrumPosition('middle');
const bot = tower.getCurrentDrumPosition('bottom');
```

---

## Skull counter

### `resetTowerSkullCount(): Promise<void>`

Resets the tower's internal skull drop counter to zero. The counter increments via `onSkullDrop` — see [events.md](events.md).

---

## Raw access (advanced)

### `sendTowerCommand(command: Uint8Array): Promise<void>`

Send a hand-built 20-byte command packet through the normal queue. Use this when prototyping a packet that the high-level API doesn't expose.

### `sendTowerCommandDirect(command: Uint8Array): Promise<void>`

Bypass the queue. Testing only — you lose serialization, rate limiting, and response timeout handling.

### `sendTowerState(towerState: TowerState): Promise<void>` / `getCurrentTowerState(): TowerState`

Read or write the full 19-byte tower state directly. See [state.md](state.md) for the `TowerState` shape and the pack/unpack helpers.

---

## Rate limiting

The tower has a finite command-processing rate and will silently drop packets if you flood it. The library's command queue handles this for you, but if you're chaining commands in tight loops, give the tower ~300–500 ms of breathing room between commands that move drums or trigger long audio.

```typescript
for (const side of ['north', 'east', 'south', 'west'] as const) {
  await tower.Rotate(side, side, side);
  await new Promise((r) => setTimeout(r, 500));
}
```

---

## See also

- [state.md](state.md) — what `sendTowerState`/`getCurrentTowerState` operate on.
- [events.md](events.md) — completion / skull-drop / battery callbacks.
- [../GETTING_STARTED.md](../GETTING_STARTED.md) — first-time tutorial.
- [../TOWER_TECH_NOTES.md](../TOWER_TECH_NOTES.md) — LED channel mapping and packet-level protocol.
