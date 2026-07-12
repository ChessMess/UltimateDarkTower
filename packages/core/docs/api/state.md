# State, Glyphs & Seals

The tower's runtime state, glyph tracking, and seal management.

> Glyph positions only become meaningful after `calibrate()`. Seal state is purely software-tracked — the tower firmware does not track which seals are broken.

---

## Tower state types

```typescript
import {
  type TowerState,
  type Light,
  type Layer,
  type Drum,
  type Audio,
  type Beam,
} from 'ultimatedarktower';

interface TowerState {
  drum: [Drum, Drum, Drum]; // top, middle, bottom
  layer: [Layer, Layer, Layer, Layer, Layer, Layer]; // 6 LED layers × 4 lights
  audio: Audio;
  beam: Beam;
  led_sequence: number;
}

interface Drum {
  jammed: boolean;
  calibrated: boolean;
  position: number; // 0–3, see RING_LIGHT_POSITIONS
  playSound: boolean;
  reverse: boolean; // DO NOT USE — hardware-only flag
}

interface Layer {
  light: [Light, Light, Light, Light];
}
interface Light {
  effect: number;
  loop: boolean;
}
interface Audio {
  sample: number;
  loop: boolean;
  volume: number;
} // volume 0–15
interface Beam {
  count: number;
  fault: boolean;
}
```

The 19-byte wire format is documented in [TOWER_TECH_NOTES.md](../TOWER_TECH_NOTES.md).

### Reading current state

```typescript
const state = tower.getCurrentTowerState();
console.log('Top drum:', state.drum[0].position);
console.log('Top ring north LED effect:', state.layer[0].light[0].effect);
```

### Writing state

```typescript
import { LIGHT_EFFECTS } from 'ultimatedarktower';

const state = tower.getCurrentTowerState();
state.layer[0].light[0].effect = LIGHT_EFFECTS.breathe;
state.layer[0].light[0].loop = true;
await tower.sendTowerState(state);
```

Stateful command variants (`setLED`, `rotateDrumStateful`, etc.) do this read-modify-write under the hood — you rarely need `sendTowerState` directly.

### Pack / unpack helpers

```typescript
import {
  rtdt_unpack_state,
  rtdt_pack_state,
  isCalibrated,
  createDefaultTowerState,
} from 'ultimatedarktower';

const state = rtdt_unpack_state(rawBytes);
const buf = new Uint8Array(19);
const ok = rtdt_pack_state(buf, buf.length, state);
const allCal = isCalibrated(state);
const fresh = createDefaultTowerState();
```

`parseDifferentialReadings(response: Uint8Array): ParsedDifferentialReadings | null` decodes a raw
`DIFFERENTIAL_READINGS` tower response into its structured readings, returning `null` if the bytes aren't
that response type.

---

## Glyph tracking

The five glyphs (`'cleanse' | 'quest' | 'battle' | 'banner' | 'reinforce'`) live on specific drums. As you rotate drums, the library updates which side each glyph is facing.

```typescript
import { GLYPHS } from 'ultimatedarktower';

GLYPHS.cleanse; // { name: 'Cleanse',   level: 'top',    side: 'north' }
GLYPHS.quest; // { name: 'Quest',     level: 'top',    side: 'south' }
GLYPHS.battle; // { name: 'Battle',    level: 'middle', side: 'north' }
GLYPHS.banner; // { name: 'Banner',    level: 'bottom', side: 'north' }
GLYPHS.reinforce; // { name: 'Reinforce', level: 'bottom', side: 'south' }
```

### `getGlyphPosition(glyph): TowerSide | null`

```typescript
const facing = tower.getGlyphPosition('cleanse');
if (facing) console.log(`Cleanse faces ${facing}`);
else console.log('Not calibrated yet');
```

Returns `null` if the tower hasn't been calibrated this session.

### `getAllGlyphPositions(): { [key in Glyphs]: TowerSide | null }`

```typescript
console.log(tower.getAllGlyphPositions());
// { cleanse: 'north', quest: 'south', battle: 'east', banner: 'west', reinforce: 'north' }
```

### `getGlyphsFacingDirection(direction): Glyphs[]`

Reverse lookup — which glyphs are currently facing a side?

```typescript
const north = tower.getGlyphsFacingDirection('north');
console.log('North-facing glyphs:', north);
```

### Pattern — wait for a specific glyph orientation

```typescript
async function waitFor(glyph: Glyphs, side: TowerSide) {
  while (tower.getGlyphPosition(glyph) !== side) {
    await new Promise((r) => setTimeout(r, 100));
  }
}
```

---

## Seal management

The tower has **12 physical seal covers** — 4 sides × 3 levels. The firmware can _play_ a seal-break effect but does **not** track which seals are broken. All seal state lives in software.

```typescript
type SealIdentifier = {
  side: TowerSide; // 'north' | 'east' | 'south' | 'west'
  level: TowerLevels; // 'top' | 'middle' | 'bottom'
};
```

### `breakSeal(seal, volume?): Promise<void>`

Sends the hardware effect (sound + light) **and** marks the seal as broken in software.

```typescript
await tower.breakSeal({ side: 'north', level: 'top' });
```

### `markSealBroken(seal) / markSealRestored(seal)`

Software-only — no hardware command. Use these to restore state when resuming a saved game.

```typescript
tower.markSealBroken({ side: 'east', level: 'middle' });
tower.markSealRestored({ side: 'east', level: 'middle' });
```

### `isSealBroken(seal): boolean`

```typescript
if (!tower.isSealBroken({ side: 'south', level: 'bottom' })) {
  await tower.breakSeal({ side: 'south', level: 'bottom' });
}
```

### `getBrokenSeals(): SealIdentifier[]`

```typescript
const broken = tower.getBrokenSeals();
console.log(`${broken.length}/12 seals broken`);
```

### `getRandomUnbrokenSeal(): SealIdentifier | null`

Useful for "the tower breaks a random seal" mechanics.

```typescript
const next = tower.getRandomUnbrokenSeal();
if (next) await tower.breakSeal(next);
```

### `resetBrokenSeals(): void`

Clear all software seal state (no hardware command).

### Restoring state at construction

```typescript
const tower = new UltimateDarkTower({
  brokenSeals: [
    { side: 'north', level: 'top' },
    { side: 'east', level: 'middle' },
  ],
});
```

---

## See also

- [commands.md](commands.md) — the commands that mutate tower state.
- [events.md](events.md) — `onTowerStateUpdate` fires on every state change.
- [../GETTING_STARTED.md](../GETTING_STARTED.md) — first-time lifecycle.
- [../TOWER_TECH_NOTES.md](../TOWER_TECH_NOTES.md) — 19-byte wire format and LED channel map.
