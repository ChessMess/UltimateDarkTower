---
'ultimatedarktower': patch
---

Add a `captureIncidents` diagnostics option that persists disconnect incident
snapshots even when the verbose diagnostics stream (`enabled`) is off. Incidents
fire only on disconnect, so a consumer can now record "why did the tower drop?"
without opting into the high-frequency event/battery stream. Defaults to `false`,
so existing behavior is unchanged. `beginSession()` and `recordIncident()` (in
both `UdtDiagnosticsRecorder` and the BLE connection layer) now honor
`enabled || captureIncidents`.
