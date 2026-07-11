# Logging

A small logger with pluggable outputs. Console by default; add DOM or buffer outputs for browser UIs or programmatic capture.

> For BLE-disconnect debugging specifically, you probably want the [diagnostics flight recorder](diagnostics.md), not the logger. The two systems are independent and serve different purposes.

---

## Configuring outputs

### `setLoggerOutputs(outputs: LogOutput[]): void`

```typescript
import {
  ConsoleOutput,
  DOMOutput,
  BufferOutput,
} from 'ultimatedarktower';

// Default — console only
tower.setLoggerOutputs([new ConsoleOutput()]);

// Console + a DOM panel (browser only)
tower.setLoggerOutputs([
  new ConsoleOutput(),
  new DOMOutput('log-container', 200),  // element id, max lines
]);

// Console + in-memory buffer (good for tests and "save logs" UI buttons)
const buf = new BufferOutput(1000, 100); // max entries, clear count
tower.setLoggerOutputs([new ConsoleOutput(), buf]);
```

> `DOMOutput` is browser-only. In Node.js, use `ConsoleOutput` and/or `BufferOutput`.

---

## Detail level

### `logDetail: boolean`

```typescript
tower.logDetail = true;   // verbose
tower.logDetail = false;  // default
```

---

## Tower-response logging

### `logTowerResponses: boolean` + `logTowerResponseConfig: TowerResponseConfig`

```typescript
tower.logTowerResponses = true;

tower.logTowerResponseConfig = {
  TOWER_STATE: true,
  INVALID_STATE: true,
  HARDWARE_FAILURE: true,
  MECH_JIGGLE_TRIGGERED: false,
  MECH_UNEXPECTED_TRIGGER: false,
  MECH_DURATION: false,
  DIFFERENTIAL_READINGS: false,
  BATTERY_READING: false,
  CALIBRATION_FINISHED: true,
  LOG_ALL: false,
};
```

Set `LOG_ALL: true` to enable every category in one go.

---

## Battery log throttling

The `onBatteryLevelNotify` callback always fires (~5 Hz when connected). These properties only affect _logging_ of battery readings, not the callback.

| Property | Default | Effect |
|---|---|---|
| `batteryLogEnabled` | `true` | Master switch |
| `batteryLogFrequency` | `1000` (ms) | Minimum interval between logged readings |
| `batteryLogOnChangeOnly` | `false` | Only log when percentage changes |

```typescript
tower.batteryLogEnabled = true;
tower.batteryLogFrequency = 1000;
tower.batteryLogOnChangeOnly = true;
```

---

## BufferOutput — extracting logs programmatically

```typescript
const buf = new BufferOutput(1000);
tower.setLoggerOutputs([new ConsoleOutput(), buf]);

// later…
const all = buf.getBuffer();
const errors = buf.getEntriesByLevel('error');
const lastMinute = buf.getEntriesSince(new Date(Date.now() - 60_000));
```

Useful for "Save logs" buttons in debug UIs and for asserting on log content in tests.

---

## Types

Exported for typing custom outputs and filtering captured logs:

- `LogLevel` — `'all' | 'debug' | 'info' | 'warn' | 'error'`.
- `LogOutput` — the output interface implemented by `ConsoleOutput` / `DOMOutput` / `BufferOutput`; implement
  it to add your own sink.

```typescript
import type { LogLevel, LogOutput } from 'ultimatedarktower';
```

---

## See also

- [events.md](events.md) — `onBatteryLevelNotify` always fires; logging is independent.
- [diagnostics.md](diagnostics.md) — structured BLE event capture, not the same thing as logging.
