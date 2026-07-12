# API Reference

_Docs: [Index](../README.md) > App developer > API_

The complete API surface of UltimateDarkTower, split by topic. New to the library? Start with the [Getting Started tutorial](../GETTING_STARTED.md) instead — it walks through the same calls in the order you'll actually use them. **Changelog:** [../../CHANGELOG.md](../../CHANGELOG.md). This reference follows the shared [API documentation standard](../API_STYLE.md) used across the UDT-family repos (split into topic pages here because the surface is large).

---

## Topics

| Topic                             | What's covered                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **[Connection](connection.md)**   | Constructor, `UltimateDarkTowerConfig`, `connect` / `disconnect` / `cleanup`, status getters, connection monitoring, error types       |
| **[Adapters](adapters.md)**       | `IBluetoothAdapter` interface, built-in adapters, `BluetoothAdapterFactory`, building a custom adapter (React Native / Cordova / mock) |
| **[Commands](commands.md)**       | Calibration, audio, lights, drum rotation, stateful command variants                                                                   |
| **[State](state.md)**             | Tower state types, glyph tracking, seal management, low-level state pack/unpack                                                        |
| **[Events](events.md)**           | Connection, calibration, skull drop, battery callbacks                                                                                 |
| **[Logging](logging.md)**         | Logger configuration, log levels, console / DOM / buffer outputs, response logging                                                     |
| **[Seed parser](seed.md)**        | Decode / encode / validate game seeds, `SystemRandom` PRNG replica                                                                     |
| **[Diagnostics](diagnostics.md)** | Flight-recorder API (cross-link to [BLE_DIAGNOSTICS.md](../BLE_DIAGNOSTICS.md) for the conceptual doc)                                 |
| **[Board data](board-data.md)**   | Board geometry (locations / anchors / adjacency + graph helpers) and the hero / monument / foe reference rosters                       |

---

## Method roster

Every public method on `UltimateDarkTower`, grouped by topic. Click through to the topic page for full signatures and examples.

### Lifecycle — [connection.md](connection.md)

| Method / property                                                  | Purpose                                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `new UltimateDarkTower(config?)`                                   | Construct (optional `platform`, `adapter`, `brokenSeals`, `diagnostics`) |
| `connect()`                                                        | Open BLE connection                                                      |
| `disconnect()`                                                     | Close connection (reconnectable)                                         |
| `cleanup()`                                                        | Final, idempotent teardown — instance is disposed after                  |
| `isConnected`                                                      | Boolean getter                                                           |
| `isConnectedAndResponsive()`                                       | Connection health check                                                  |
| `getConnectionStatus()`                                            | Full connection snapshot                                                 |
| `getDeviceInformation()`                                           | DIS fields (manufacturer, model, FW/HW rev…)                             |
| `setConnectionMonitoring(enabled)`                                 | Toggle health monitoring                                                 |
| `configureConnectionMonitoring(freq?, timeout?)`                   | Tune monitoring intervals                                                |
| `configureBatteryHeartbeatMonitoring(enabled?, timeout?, verify?)` | Tune the heartbeat detector                                              |

### Commands — [commands.md](commands.md)

| Method                                                | Purpose                                   |
| ----------------------------------------------------- | ----------------------------------------- |
| `calibrate()`                                         | Required before drum commands             |
| `isCalibrated`                                        | Boolean getter                            |
| `playSound(soundIndex)`                               | Play from `TOWER_AUDIO_LIBRARY`           |
| `playSoundStateful(soundIndex, loop?, volume?)`       | Play while preserving other state         |
| `Lights(lights)`                                      | Set named lights (doorway / ledge / base) |
| `setLED(layerIndex, lightIndex, effect, loop?)`       | Stateful single-LED control               |
| `allLightsOn(effect?)`                                | All 24 LEDs on                            |
| `allLightsOff()`                                      | All 24 LEDs off                           |
| `lightOverrides(light, soundIndex?)`                  | Special light patterns                    |
| `Rotate(top, middle, bottom, soundIndex?)`            | All three drums at once                   |
| `rotateWithState(top, middle, bottom, soundIndex?)`   | Same, preserving state                    |
| `rotateDrumStateful(drumIndex, position, playSound?)` | Single drum, preserves state              |
| `randomRotateLevels(level?)`                          | Randomize one or more drums               |
| `getCurrentDrumPosition(level)`                       | Read current drum side                    |
| `resetTowerSkullCount()`                              | Reset hardware skull counter              |
| `sendTowerCommand(command)`                           | Send a raw command packet                 |
| `sendTowerCommandDirect(command)`                     | Send raw without queueing (testing only)  |
| `sendTowerState(towerState)`                          | Push a full state snapshot                |
| `getCurrentTowerState()`                              | Read current full state                   |

### State, glyphs, seals — [state.md](state.md)

| Method                                | Purpose                         |
| ------------------------------------- | ------------------------------- |
| `getGlyphPosition(glyph)`             | Side a single glyph is facing   |
| `getAllGlyphPositions()`              | All five glyphs at once         |
| `getGlyphsFacingDirection(direction)` | Reverse lookup                  |
| `breakSeal(seal, volume?)`            | Hardware effect + software mark |
| `markSealBroken(seal)`                | Software-only mark              |
| `markSealRestored(seal)`              | Software-only unmark            |
| `isSealBroken(seal)`                  | Software check                  |
| `getBrokenSeals()`                    | All broken seals                |
| `getRandomUnbrokenSeal()`             | Random pick (game mechanic)     |
| `resetBrokenSeals()`                  | Reset all (software only)       |

### Events — [events.md](events.md)

Assignable callback properties (`onTowerConnect`, `onTowerDisconnect`, `onCalibrationComplete`, `onSkullDrop`, `onBatteryLevelNotify`, `onTowerStateUpdate`).

### Logging — [logging.md](logging.md)

| Method / property                                                      | Purpose                               |
| ---------------------------------------------------------------------- | ------------------------------------- |
| `setLoggerOutputs(outputs)`                                            | Choose console / DOM / buffer outputs |
| `logDetail`                                                            | Verbose mode                          |
| `logTowerResponses`                                                    | Log every response                    |
| `logTowerResponseConfig`                                               | Per-response-type logging filter      |
| `batteryLogEnabled` / `batteryLogFrequency` / `batteryLogOnChangeOnly` | Battery log throttling                |

### Diagnostics — [diagnostics.md](diagnostics.md)

| Method                     | Purpose                             |
| -------------------------- | ----------------------------------- |
| `getDiagnosticsRecorder()` | The recorder instance               |
| `setDiagnosticsEnabled(b)` | Runtime toggle                      |
| `isDiagnosticsEnabled()`   | Current state                       |
| `getLastIncident()`        | Last `IncidentReport`               |
| `exportDiagnosticsJSON()`  | Ring buffer + last incident as JSON |

---

## See also

- [GETTING_STARTED.md](../GETTING_STARTED.md) — guided walkthrough
- [ARCHITECTURE.md](../ARCHITECTURE.md) — how the layers fit together
- [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) — common issues
- [BLE_DIAGNOSTICS.md](../BLE_DIAGNOSTICS.md) — the flight recorder, conceptual
- [SEED_FORMAT.md](../SEED_FORMAT.md) — game seed spec
- [TOWER_TECH_NOTES.md](../TOWER_TECH_NOTES.md) — wire-level protocol, LED channel map, BLE services
