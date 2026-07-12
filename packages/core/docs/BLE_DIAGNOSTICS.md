# BLE Diagnostics ("Flight Recorder")

UltimateDarkTower ships with an opt-in diagnostic system for capturing what
was happening just before a Bluetooth disconnect. The library tags each of
its five disconnect-detection paths, snapshots connection / queue / tower
state at the moment of the drop, and includes a ring buffer of recent BLE
events so you can see the lead-up.

This document covers when to enable it, how to read the output, and how to
ship the data to wherever you want to inspect it.

## When to enable

- A user reports unexplained disconnects you can't reproduce.
- You want to gather a corpus of incidents to find which failure mode is
  most common (heartbeat timeout vs GATT loss vs response timeout).
- You're debugging a long-running session and want a record if something
  goes wrong overnight.

The recorder is **off by default**. When disabled it adds a single boolean
check at each hook site — effectively zero overhead.

## Enable

```typescript
import UltimateDarkTower, { InMemorySink, IndexedDBSink } from 'ultimatedarktower';

const tower = new UltimateDarkTower({
  diagnostics: {
    enabled: true,
    capturePayloads: false, // optional, default false
    sinks: [
      new InMemorySink(), // queryable via tower.getDiagnosticsRecorder()
      new IndexedDBSink(), // browser-only, durable across page refresh
    ],
  },
});
```

You can also flip diagnostics on at runtime without reconstructing the tower:

```typescript
tower.setDiagnosticsEnabled(true);
tower.getDiagnosticsRecorder().capturePayloads = true;
```

## What gets captured

On every disconnect, the recorder produces an `IncidentReport`:

| Field                            | What it tells you                                                         |
| -------------------------------- | ------------------------------------------------------------------------- |
| `cause`                          | Which detection path fired (one of seven, see below)                      |
| `sessionId`, `sessionDurationMs` | Per-connect lifecycle correlation                                         |
| `connectionStatus`               | GATT state, last heartbeat age, last response age, all monitor thresholds |
| `commandQueue`                   | Queue depth + the command that was in-flight at the drop                  |
| `inFlightCommandAgeMs`           | How long the in-flight command had been waiting                           |
| `towerState`                     | Full unpacked tower state (drums, lights, audio, beam)                    |
| `brokenSeals`                    | Software-tracked broken seals at incident time                            |
| `recentEvents`                   | Last ~500 structured events from the ring buffer                          |
| `batteryHistory`                 | Last 60 battery readings (~12 seconds at 5 Hz)                            |
| `deviceInformation`              | Firmware revision, hardware revision, serial, etc.                        |
| `library`, `userAgent`           | Library version + platform fingerprint                                    |

`recentEvents` is the most diagnostic field. Each event has a `kind`, an
optional `data` payload, and a millisecond `t` timestamp:

| `kind`                                         | When it fires                                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `connect`                                      | New BLE session started                                                                                                        |
| `disconnect`                                   | Synthesized at incident time, with `cause`                                                                                     |
| `cmd_enqueued`                                 | Command added to the queue                                                                                                     |
| `cmd_sent`                                     | Command written to the GATT characteristic                                                                                     |
| `cmd_response`                                 | Non-battery response received                                                                                                  |
| `cmd_timeout`                                  | Command's 30s response timer expired                                                                                           |
| `cmd_failed`                                   | Command write threw                                                                                                            |
| `tower_state_response`                         | Tower state response received                                                                                                  |
| `skull_drop`                                   | Skull drop count changed                                                                                                       |
| `heartbeat_late`                               | Battery heartbeat went past threshold but GATT was still up (a near-miss — multiple of these before a drop is a strong signal) |
| `calibration_started` / `calibration_complete` | Calibration lifecycle                                                                                                          |
| `log`                                          | Mirrored warn/error log lines from the library                                                                                 |

Routine battery heartbeats are **not** recorded as events (they arrive every
~200ms and would burn the ring buffer in seconds). They go to the separate
`batteryHistory` window instead.

## Disconnect causes

- **`adapter_event`** — `gattserverdisconnected` (browser) or noble `disconnect` (Node) fired. Usually means the device dropped or was powered off.
- **`gatt_health_check`** — periodic poll saw `isGattConnected() === false` even though no native event fired. Usually means the underlying transport is gone but no event reached us.
- **`heartbeat_timeout`** — battery heartbeat exceeded `batteryHeartbeatTimeoutMs` (default 3s). Tower may be unresponsive even though GATT looks up.
- **`response_timeout`** — no response of any kind within `connectionTimeoutMs` (default 30s). Catches dead-link scenarios that heartbeat monitoring missed.
- **`bt_unavailable`** — OS reports Bluetooth turned off.
- **`user_initiated`** — explicit `tower.disconnect()` call. Useful for distinguishing intended vs unintended drops in your incident corpus.
- **`page_unload`** — browser-only. Page closed/refreshed while connected. The IndexedDB write is best-effort but usually completes.

## Reading an incident

Start at the bottom of `recentEvents` and read backwards. The pattern is
usually obvious: a few `cmd_sent` without matching `cmd_response`, or
`heartbeat_late` repeating, or queue depth growing without responses
draining. `inFlightCommandAgeMs` tells you whether the tower stopped
responding mid-operation.

Common patterns:

| Symptom in `recentEvents`                                                          | Likely cause                                                   |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Multiple `heartbeat_late` followed by `disconnect` with `cause: heartbeat_timeout` | Tower CPU stalled or radio link congested                      |
| `cmd_sent` ... `cmd_timeout` and queue depth growing                               | Tower is alive (heartbeats fine) but ignoring commands         |
| `disconnect` with `cause: adapter_event` and `cmd_sent` immediately before         | Command write triggered a transport error; check command bytes |
| `disconnect` with `cause: bt_unavailable`                                          | Not a library bug — OS-level BT toggle                         |
| `disconnect` with `cause: page_unload` and `inFlightCommandAgeMs` non-null         | User refreshed during a hang; tower may not be at fault        |

## Sinks

Sinks are how incidents leave the recorder. Implement `DiagnosticsSink` to
ship them anywhere:

```typescript
import type { DiagnosticsSink, IncidentReport } from 'ultimatedarktower';

class TelemetrySink implements DiagnosticsSink {
  async onIncident(report: IncidentReport) {
    await fetch('/api/incidents', { method: 'POST', body: JSON.stringify(report) });
  }
}
```

Built-in sinks:

- **`InMemorySink`** — keeps the last N (default 50) incidents in memory.
  Survive only as long as the tower instance.
- **`IndexedDBSink`** — browser-only, durable across page refresh. Default
  cap is 50 incidents (oldest evicted). Exposes `list()`, `get(id)`,
  `delete(id)`, `clear()`, `put(report)` for UI integration.

## Privacy / size

Payload capture is **off by default**. Enabling it includes hex-encoded
command and response bytes (truncated at 32 bytes per packet). The tower
protocol does not contain user data, but defaulting to off keeps incidents
compact.

Each report is roughly 5–50KB depending on how full the ring buffer is.
With the default cap of 50 in IndexedDB, total storage is comfortably under
1MB.

## Sharing incidents

The Tower Controller example has a "BLE Debug" tab with a one-click
"Export JSON" button on each incident. To attach a diagnostic to a
github issue:

1. Enable the toggle in the BLE Debug tab.
2. Reproduce the disconnect.
3. Open the most recent incident → Export JSON → attach to the issue.

You can also call `tower.exportDiagnosticsJSON()` in code to get a string
containing the current ring buffer + last incident, suitable for
`navigator.clipboard.writeText`.

## Programmatic access

```typescript
const tower = new UltimateDarkTower({ diagnostics: { enabled: true } });

// Live recorder access
const recorder = tower.getDiagnosticsRecorder();
recorder.getRingBuffer(); // current events
recorder.getBatteryHistory(); // last ~12s of battery samples
recorder.getSessionId(); // current session id

// Last incident
const incident = tower.getLastIncident();

// Toggle at runtime
tower.setDiagnosticsEnabled(true);
tower.getDiagnosticsRecorder().capturePayloads = true;

// Export
const json = tower.exportDiagnosticsJSON();

// Custom sink
recorder.addSink({
  onIncident: (report) => console.log('disconnect:', report.cause, report),
});
```

## Schema versioning

Every `IncidentReport` carries `schemaVersion: 1`. If the format changes,
the major version will bump. Importers should reject reports they don't
understand rather than silently accept them.
