# Events

Tower-side events surface as assignable callback properties on the `UltimateDarkTower` instance. Set them **before** calling `connect()` so you don't miss the first signal.

---

## Connection callbacks

### `onTowerConnect: () => void`

Fires when the BLE connection completes.

```typescript
tower.onTowerConnect = () => {
  console.log('Connected.');
};
```

### `onTowerDisconnect: () => void`

Fires for any disconnect, expected or unexpected. The diagnostics recorder (see [diagnostics.md](diagnostics.md)) tags which detection path triggered it.

```typescript
tower.onTowerDisconnect = () => {
  console.log('Disconnected.');
};
```

---

## Tower events

### `onCalibrationComplete: () => void`

Fires when the calibration sequence finishes successfully.

```typescript
tower.onCalibrationComplete = () => {
  console.log('Calibrated. Glyph positions and rotation are now reliable.');
};
```

### `onSkullDrop: (skullCount: number) => void`

Fires whenever a skull is dropped into the tower (the firmware-tracked count). Reset the count with `resetTowerSkullCount()`.

```typescript
tower.onSkullDrop = (count) => {
  console.log(`${count} skulls dropped`);
};
```

### `onBatteryLevelNotify: (millivolts: number) => void`

Fires on **every** battery notification (~5 Hz when connected). The `batteryLog*` properties on [logging.md](logging.md) only affect _logging_ — this callback always fires, so internal state and UI indicators stay current.

```typescript
import { milliVoltsToPercentage } from 'ultimatedarktower';

tower.onBatteryLevelNotify = (mv) => {
  console.log('Battery:', milliVoltsToPercentage(mv));
  if (mv < 3000) console.warn('Low battery');
};
```

### `onTowerStateUpdate: (newState, oldState, source) => void`

Fires whenever the tracked tower state changes — either because a stateful command was sent or because the tower sent back a state response. `source` indicates which side initiated the change.

```typescript
tower.onTowerStateUpdate = (newState, oldState, source) => {
  console.log(`State changed via ${source}`);
};
```

---

## Recommended pattern

Set every callback you care about up front, in one place:

```typescript
function wireEvents(tower: UltimateDarkTower) {
  tower.onTowerConnect = () => updateUiConnected();
  tower.onTowerDisconnect = () => updateUiDisconnected();
  tower.onCalibrationComplete = () => unlockTowerControls();
  tower.onSkullDrop = (count) => updateScore(count);
  tower.onBatteryLevelNotify = (mv) => updateBatteryIndicator(mv);
}

const tower = new UltimateDarkTower();
wireEvents(tower);
await tower.connect();
await tower.calibrate();
```

---

## `TowerEventCallbacks`

The core callbacks above are bundled into the exported `TowerEventCallbacks` interface — handy for typing a
wiring helper. (`onTowerStateUpdate` is a separate assignable property, not part of this interface.)

```typescript
import type { TowerEventCallbacks } from 'ultimatedarktower';
// { onTowerConnect; onTowerDisconnect; onBatteryLevelNotify; onCalibrationComplete; onSkullDrop; onTowerResponse? }
```

---

## See also

- [connection.md](connection.md) — the lifecycle these events report on.
- [diagnostics.md](diagnostics.md) — capturing the lead-up to a disconnect.
- [logging.md](logging.md) — channel battery log frequency separately from the callback.
