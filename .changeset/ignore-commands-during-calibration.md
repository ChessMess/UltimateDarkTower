---
'ultimatedarktower': patch
---

Commands issued while the tower is calibrating are now ignored instead of queued (or, for
`allLightsOn()`/`allLightsOff()`/`sendTowerState()`/`sendTowerCommandDirect()`, ignored instead
of sent immediately). Calibration is a multi-second procedure; previously, commands issued
during it would pile up in the queue and all fire in a burst the instant calibration completed.
Ignored commands resolve immediately without sending anything and log a `[UDT][CMD]` warning;
check `tower.performingCalibration` beforehand, or look for a new `cmd_ignored_calibration`
diagnostics event, if you need to know whether a command was dropped.
