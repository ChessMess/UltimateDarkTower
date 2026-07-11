# Connection

Constructor, configuration, connecting and disconnecting, monitoring health, and the error types thrown along the way.

> See [adapters.md](adapters.md) for the BLE adapter layer below this one. See [events.md](events.md) for the lifecycle callbacks.

---

## Constructor

### `new UltimateDarkTower(config?: UltimateDarkTowerConfig)`

```typescript
interface UltimateDarkTowerConfig {
  /** Platform to use for Bluetooth communication (auto-detected by default) */
  platform?: BluetoothPlatform;
  /** Custom Bluetooth adapter (testing, React Native, Cordova…) */
  adapter?: IBluetoothAdapter;
  /** Initial broken seals to restore game state (software-only, no hardware effects) */
  brokenSeals?: SealIdentifier[];
  /** BLE disconnect diagnostics ("flight recorder"). Off by default. */
  diagnostics?: DiagnosticsConfig;
}
```

```typescript
// Auto-detect platform (most common)
const tower = new UltimateDarkTower();

// Explicit platform
import UltimateDarkTower, { BluetoothPlatform } from 'ultimatedarktower';
const web = new UltimateDarkTower({ platform: BluetoothPlatform.WEB });
const node = new UltimateDarkTower({ platform: BluetoothPlatform.NODE });

// Software-only — never connects (broken-seal state, rendering, iOS Safari)
const display = new UltimateDarkTower({ platform: BluetoothPlatform.NONE });

// Custom adapter
const custom = new UltimateDarkTower({ adapter: myCustomAdapter });
```

> **Construction never throws.** With `AUTO` (the default) Bluetooth platform
> detection is deferred until `connect()`, so you can construct an
> `UltimateDarkTower` in any environment — including ones without Web Bluetooth
> such as iOS Safari. The "Unable to detect Bluetooth platform" error, if any,
> now surfaces from `connect()`, not the constructor. For instances that should
> never connect, use `BluetoothPlatform.NONE` to make that intent explicit (its
> no-op adapter throws clearly if `connect()`/commands are attempted).

### `BluetoothPlatform` enum

```typescript
enum BluetoothPlatform {
  WEB  = 'web',   // Browser Web Bluetooth API
  NODE = 'node',  // Node.js @stoprocent/noble
  AUTO = 'auto',  // Auto-detect (default)
  NONE = 'none',  // Software-only — no Bluetooth (e.g. headless rendering, iOS Safari)
}
```

---

## Connecting

### `connect(): Promise<void>`

Opens the BLE connection. In browsers this triggers the device picker; in Node.js it scans for the tower automatically.

```typescript
try {
  await tower.connect();
} catch (err) {
  // See "Error types" below
}
```

### `disconnect(): Promise<void>`

Closes the connection but leaves the instance reusable — you can `connect()` again later.

### `cleanup(): Promise<void>`

**Final and idempotent.** Calling it more than once is safe, but the instance is disposed after the first call. Use `disconnect()` if you intend to reconnect; use `cleanup()` when shutting down for good.

```typescript
window.addEventListener('beforeunload', () => tower.cleanup());
```

---

## Status

### `isConnected: boolean`

Synchronous boolean. Reflects whether the adapter believes the GATT session is open.

### `isConnectedAndResponsive(): Promise<boolean>`

Asynchronous health check — round-trips a probe to confirm the tower is actually responding. Useful before issuing a long sequence.

### `getConnectionStatus(): ConnectionStatus`

Snapshot of every monitored metric (last heartbeat age, last response age, all configured thresholds, GATT state).

### `getDeviceInformation(): DeviceInformation`

Returns fields read from the tower's Device Information Service during connection.

```typescript
const info = tower.getDeviceInformation();
console.log(info.manufacturerName);   // "Restoration Games LLC"
console.log(info.modelNumber);        // "ReturnToDarkTower"
console.log(info.hardwareRevision);   // "1.11"
console.log(info.firmwareRevision);
console.log(info.softwareRevision);   // "1.0.0"
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

The real BLE Device Information Service is documented with a captured screenshot in [TOWER_TECH_NOTES.md](../TOWER_TECH_NOTES.md#device-information).

---

## Connection monitoring

The library uses five independent paths to detect a dropped connection — heartbeat, GATT event, command timeout, BT availability, and manual. See [ARCHITECTURE.md](../ARCHITECTURE.md#disconnect-detection--five-paths) for the full picture.

### `setConnectionMonitoring(enabled: boolean): void`

Master switch. Default: on. Turning it off disables all five detection paths (rarely what you want).

### `configureConnectionMonitoring(frequency?: number, timeout?: number): void`

```typescript
// Check every 2 seconds, give up after 30 seconds
tower.configureConnectionMonitoring(2000, 30000);
```

### `configureBatteryHeartbeatMonitoring(enabled?: boolean, timeout?: number, verifyConnection?: boolean): void`

```typescript
// Heartbeat timeout 3 seconds, verify with adapter before declaring lost
tower.configureBatteryHeartbeatMonitoring(true, 3000, true);
```

The battery heartbeat is the fastest detection path because the tower sends battery notifications every ~200 ms in normal operation.

---

## Error types

All connection failures throw subclasses of `BluetoothError`. Always catch the specific subclass when you need to react differently:

```typescript
import {
  BluetoothError,
  BluetoothConnectionError,
  BluetoothDeviceNotFoundError,
  BluetoothUserCancelledError,
  BluetoothTimeoutError,
} from 'ultimatedarktower';

try {
  await tower.connect();
} catch (err) {
  if (err instanceof BluetoothDeviceNotFoundError) {
    console.error('Tower not found — power on, check range');
  } else if (err instanceof BluetoothUserCancelledError) {
    console.error('User dismissed the picker');
  } else if (err instanceof BluetoothTimeoutError) {
    console.error('Scan timeout — tower may be off');
  } else if (err instanceof BluetoothConnectionError) {
    console.error('Connection failed:', err.message);
  } else {
    throw err;
  }
}
```

| Error | When it fires |
|---|---|
| `BluetoothDeviceNotFoundError` | Scan completed without finding `ReturnToDarkTower` |
| `BluetoothUserCancelledError` | User dismissed the browser device picker |
| `BluetoothTimeoutError` | Scan or any individual op exceeded its timeout |
| `BluetoothConnectionError` | GATT connect failed (catch-all for the connect step) |
| `BluetoothError` | Base class — catch this if you don't need to differentiate |

---

## Patterns

### Reconnect on unexpected disconnect

```typescript
let reconnectAttempts = 0;

tower.onTowerDisconnect = async () => {
  if (reconnectAttempts++ < 3) {
    console.log(`Reconnecting (attempt ${reconnectAttempts})…`);
    try {
      await tower.connect();
      await tower.calibrate();
      reconnectAttempts = 0;
    } catch {
      // wait before retrying
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
};
```

### Clean shutdown

```typescript
// One-shot script
try {
  await tower.connect();
  await tower.calibrate();
  /* ...your work... */
} finally {
  await tower.cleanup();
}
```

---

## See also

- [adapters.md](adapters.md) — the platform layer that backs `connect`.
- [events.md](events.md) — `onTowerConnect`, `onTowerDisconnect`, `onCalibrationComplete`.
- [diagnostics.md](diagnostics.md) — capture a flight-recorder snapshot when a disconnect happens.
- [../TROUBLESHOOTING.md](../TROUBLESHOOTING.md) — diagnosing common connection issues.
