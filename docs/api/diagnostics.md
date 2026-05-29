# Diagnostics — Flight Recorder API

The `UdtDiagnosticsRecorder` captures a structured ring buffer of recent BLE events plus a state snapshot at every disconnect. This page covers the **API surface**. For the conceptual overview — when to enable it, what gets captured, how to read incidents — see [BLE_DIAGNOSTICS.md](../BLE_DIAGNOSTICS.md).

The recorder is **off by default** and is effectively zero-overhead when off.

---

## Enabling at construction

```typescript
import UltimateDarkTower, {
  InMemorySink,
  IndexedDBSink,
} from 'ultimatedarktower';

const tower = new UltimateDarkTower({
  diagnostics: {
    enabled: true,
    capturePayloads: false,   // optional, default false
    sinks: [
      new InMemorySink(),     // queryable via tower.getDiagnosticsRecorder()
      new IndexedDBSink(),    // browser-only, durable across page refresh
    ],
  },
});
```

`DiagnosticsConfig`:

```typescript
interface DiagnosticsConfig {
  enabled?: boolean;
  capturePayloads?: boolean;
  sinks?: DiagnosticsSink[];
}
```

---

## Runtime control

### `setDiagnosticsEnabled(enabled: boolean): void`

```typescript
tower.setDiagnosticsEnabled(true);
tower.setDiagnosticsEnabled(false);
```

### `isDiagnosticsEnabled(): boolean`

### `getDiagnosticsRecorder(): UdtDiagnosticsRecorder`

Returns the recorder instance so you can inspect the ring buffer or flip `capturePayloads` at runtime.

```typescript
tower.getDiagnosticsRecorder().capturePayloads = true;
```

### `getLastIncident(): IncidentReport | null`

The most recent incident captured this session.

### `exportDiagnosticsJSON(): string`

Serializes the ring buffer plus the last incident as JSON — what you ship to a bug report, paste into a Discord thread, or save to disk.

---

## IncidentReport shape (summary)

Full schema in [BLE_DIAGNOSTICS.md](../BLE_DIAGNOSTICS.md#what-gets-captured). Highlights:

| Field | What it tells you |
|---|---|
| `cause` | Which detection path fired |
| `sessionId`, `sessionDurationMs` | Lifecycle correlation |
| `connectionStatus` | GATT state, heartbeat / response ages, thresholds |
| `commandQueue` | Queue depth + in-flight command at the drop |
| `towerState` | Full unpacked state at the moment of the drop |
| `brokenSeals` | Software-tracked seals at incident time |
| `recentEvents` | Last ~500 structured BLE events (most diagnostic field) |
| `batteryHistory` | Last 60 battery samples (~12 s at 5 Hz) |
| `deviceInformation` | DIS fields |

### Disconnect causes

`adapter_event`, `gatt_health_check`, `heartbeat_timeout`, `response_timeout`, `bt_unavailable`, `user_initiated`, `page_unload`.

---

## Sinks

A `DiagnosticsSink` ships incidents wherever you need them.

```typescript
interface DiagnosticsSink {
  recordEvent?(event: DiagEvent): void;
  recordIncident(report: IncidentReport): void | Promise<void>;
}
```

### Built-in sinks

| Sink | Where it stores | Use case |
|---|---|---|
| `InMemorySink` | In-process array | Quick inspection during a session, test assertions |
| `IndexedDBSink` | Browser IndexedDB | Persistent incident log across page refresh / restart |

### Custom sinks

```typescript
import { DiagnosticsSink, IncidentReport } from 'ultimatedarktower';

class WebhookSink implements DiagnosticsSink {
  constructor(private url: string) {}
  async recordIncident(report: IncidentReport) {
    await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
  }
}

const tower = new UltimateDarkTower({
  diagnostics: { enabled: true, sinks: [new WebhookSink('https://example.com/incidents')] },
});
```

---

## See also

- [../BLE_DIAGNOSTICS.md](../BLE_DIAGNOSTICS.md) — conceptual doc with the full `IncidentReport` schema.
- [connection.md](connection.md) — the five disconnect-detection paths whose tags the recorder uses.
- [../ARCHITECTURE.md](../ARCHITECTURE.md) — where the recorder sits in the stack.
