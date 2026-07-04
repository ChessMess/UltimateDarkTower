# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [5.0.1] - 2026-07-03

### Fixed

Fixes from a full-source code review, ordered by severity:

- **Node adapter: a failed `connect()` no longer permanently breaks retries.** `NodeBluetoothAdapter.cleanup()` was nulling the `onCharacteristicValueChanged`/`onDisconnect`/`onBluetoothAvailabilityChanged` callbacks on any connection failure, but `UdtBleConnection` only wires those callbacks once. A failed connect (e.g. a scan timeout) silently broke all future notifications on the next successful `connect()` — no battery heartbeat, no command responses, forcing a disconnect ~3s later. `cleanup()` no longer clears these caller-owned callback fields, matching `WebBluetoothAdapter`'s existing behavior.
- **Tower state aliasing fixed: `onTowerStateUpdate` now receives distinct old/new objects.** `getCurrentTowerState()` (both the internal command-builder dependency and the public method) previously returned the live state object (or a shallow copy sharing nested `layer`/`drum` objects), so commands that mutated it in place before calling `setTowerState` produced `oldState === newState` — consumers couldn't diff, and `logDetail` always logged "No changes detected". Both now return a full deep copy (`UdtCommandFactory.deepCopyTowerState`, now public). `createTransientAudioCommandWithModifications` also switched from a shallow spread to a deep copy, since its `Object.assign` calls on nested drum/layer/beam objects were mutating the caller's original state.
- **Drum-position tracking after rotation.** As a consequence of the above, `rotate()` and `rotateWithState()` — which mutated the (now-copied) state directly — needed explicit fixes: `rotate()` now calls `setTowerState` after updating drum positions so the change is actually recorded and notified; `rotateWithState()`'s `finally` block no longer force-writes all three drum positions unconditionally, since that masked partial failures (a drum that never rotated could be recorded as if it had) and was redundant on success (each `rotateDrumStateful()` call already records its own drum).
- **Send failures are no longer swallowed.** `sendTowerCommandDirect` returned normally instead of throwing when not connected or after retries were exhausted, so the command queue only ever learned of the failure via its 30s timeout — any command issued while disconnected silently hung for 30 seconds before rejecting with a misleading "Command timeout". It now throws immediately in both cases.
- **Calibration flags are now set before the command is sent**, not after `await`, so a fast calibration-complete response can't arrive before `performingCalibration` is set (which would suppress heartbeat disconnect detection and never fire `onCalibrationComplete`). The flags are cleared again if the send fails.
- **`logDetail` no longer discards the command queue.** Setting `tower.logDetail` used to reconstruct the whole `UdtTowerCommands`/`CommandQueue`, orphaning any in-flight/queued commands (they could then only resolve via their own 30s timeout, since responses routed to the new queue). It now updates the existing instance in place. `retrySendCommandMax` is likewise now a live setter instead of a value copied once at construction (previously it only "refreshed" as an accidental side effect of toggling `logDetail`).
- **`breakSeal` now syncs volume whenever it actually changes**, not just when the requested volume is truthy. Requesting volume `0` (Loud) while the tower's tracked volume was non-zero previously skipped the sync entirely, so the seal sound played at the wrong volume.
- **Removed duplicate console logging** — `Logger`'s constructor already installs a default `ConsoleOutput`; `UltimateDarkTower` was adding a second one, duplicating every default log line.
- **Unsolicited tower notifications no longer resolve the wrong queued command.** Spontaneous mechanical-sensor notifications (jiggle detection, unexpected trigger, differential readings) can arrive at any time and were being treated like a command ack, prematurely completing whatever command was in flight. These are now excluded from queue resolution while still reaching the public raw `onTowerResponse` passthrough.
- **`DOMOutput` no longer goes silent on pages without `logLevel-*` checkboxes** — it now defaults to showing all levels when none of the expected checkbox elements exist, instead of filtering out all output.
- Diagnostics `LIBRARY_VERSION` corrected from a stale `3.0.0` to `5.0.0`.
- **NodeBluetoothAdapter** no longer leaks a noble `stateChange` listener across repeated connect/disconnect cycles (it's now removed in `disconnect()`, not just `cleanup()`).
- **WebBluetoothAdapter** now cleans up partial connection state (GATT connection, listeners) when `connect()` fails partway through, matching the Node adapter's existing behavior.
- **Sound index validation tightened.** `playSound`/`playSoundStateful` were checking `soundIndex === null`, which let `undefined`/`NaN` silently through as a "valid" index; they now use `Number.isFinite`. `rotate()`'s optional `soundIndex` is now bounds-checked against the audio library (previously written unvalidated).
- `UdtBleConnection.disconnect()` no longer fires `onTowerDisconnect` (and clears the command queue) when called on a connection that was never established.
- Battery log line now correctly labels its already-volts value as `v` instead of `mv`.
- **`SystemRandom.nextRange`'s large-range branch (> `Int32.MaxValue`) now faithfully ports .NET's `GetSampleForLargeRange()`** instead of a rougher approximation, so seed-derived sequences match the reference implementation for wide ranges too.
- Disconnect detection in `sendTowerCommandDirect` now checks `instanceof BluetoothConnectionError` first, falling back to message-substring checks only for untyped native errors; removed a dead substring check that could never match.
- Removed the deprecated, uncalled `updateGlyphPositionsForRotation` method.
- `commandToPacketString` now zero-pads each byte to 2 hex digits (e.g. `[0f,03]` instead of `[f,3]`), removing ambiguity in packet dumps/logs.

## [5.0.0] - 2026-06-20

### Changed

- **BREAKING — reference/game data and the seed subsystem moved off the flat root API into the `data` and `seed` namespaces.** The library's exports are now split by concern: tower control / BLE / protocol stay at the root (`UltimateDarkTower`, adapters, state, logger, diagnostics, helpers, all `udtConstants` like `GLYPHS`/`TOWER_AUDIO_LIBRARY` — unchanged), while browseable reference data lives under `data.*` and the seed encode/decode + RNG subsystem under `seed.*`. The modules also moved on disk into `src/data/` (with `src/data/board/`) and `src/seed/`. Migrate imports:

  | Old (flat, `'ultimatedarktower'`) | New |
  |---|---|
  | `HEROES`, `HERO_BY_ID`, `Hero`, `HeroId`, `ContentSource` | `data.heroes.*` |
  | `MONUMENTS`, `MONUMENT_BY_ID`, `Monument`, `MonumentId` | `data.monuments.*` |
  | `FOE_STATUSES`, `FOES`, `ADVERSARY_ROSTER`, `ALL_FOES`, `FOE_BY_ID`, `FOE_BY_NAME`, `FoeStatus`/`FoeLevel`/`FoeId`/`FoeName`/`Foe` | `data.foes.*` |
  | `BOARD_LOCATIONS`, `BOARD_LOCATION_BY_NAME`, `BOARD_GROUPINGS`, `BOARD_ANCHORS`, `BOARD_IMAGE_INFO`, `BOARD_ADJACENCY`, `neighborsOf`, `stepDistance`, `shortestPath` + board types | `data.board.*` |
  | seed fns (`charToValue`…`dumpSeedChars`), rosters (`TIER1_FOES`…`GAME_SOURCES`), seed types | `seed.*` |
  | `SystemRandom` | `seed.SystemRandom` |

  Example: `import { HEROES } from 'ultimatedarktower'` → `import { data } from 'ultimatedarktower'; data.heroes.HEROES`. Sub-namespacing also lets the two distinct hero/foe datasets coexist (board roster `data.heroes.HEROES` vs gameplay content `data.content.HEROES`). This is a major (v5.0.0) change; downstream consumers (`ultimatedarktowerboard`, `ultimatedarktowerdigital`) migrate to the namespaces and bump their dependency.

### Added

- **`data.content` — gameplay reference content** (`src/data/udtGameContent.ts`). Keyed records with derived union types for the 10 playable heroes (`HEROES` with `defaultVirtues`/`unlockableVirtues`/`bannerAction`), the level 2–4 `FOES` and level-5 `ADVERSARIES`, `COMPANIONS`, and `KINGDOM_VIRTUES` (keyed East/North/South/West), plus list views (`heroes`/`foes`/`adversaries`/`companions`/`kingdomVirtues`). Uses the official spreadsheet wording — intentionally **not** reconciled with `TOWER_AUDIO_LIBRARY` keys (e.g. "Isa The Exile" vs the audio cue `IsatheHollow`).
- **`data.inventory` — box component counts** (`src/data/udtBoxInventory.ts`). `expansions` / `EXPANSIONS` (Base Game, Alliances, Covenant, Dark Horde) of categorized `Component` line-items, plus `coffers`, `coffers2`, `skullsPack`, and `sleeves`.

## [4.1.0] - 2026-06-18

### Added

- **`onTowerResponse` public callback (`UltimateDarkTower`).** A new assignable hook that fires with the **raw, verbatim bytes** (`Uint8Array`) of every non-battery tower notification (tower-state responses, command acknowledgements). It complements the decoded `onTowerStateUpdate` for consumers that need the exact packet rather than the parsed `TowerState` — e.g. a relay forwarding the tower's 20-byte state to other consumers. Documented in `docs/api/events.md`.
- **Hero + monument reference rosters (`src/udtHeroes.ts`, `src/udtMonuments.ts`).** New static rosters consumed by `ultimatedarktowerboard` (re-exported, not vendored); neither is seed-encoded. `HEROES` is the 14 heroes (4 base, 2 Alliances, 4 Covenant, 4 Expeditions — Expeditions provisional/unreleased) and `MONUMENTS` is the 8 Covenant monuments, each modeled as `{ id, name, source }` objects with `HERO_BY_ID` / `MONUMENT_BY_ID` lookups and `Hero`/`HeroId`/`Monument`/`MonumentId` types (per the data-additions plan §4/§6). `source` is a new `ContentSource` type (`'base' | 'alliances' | 'covenant' | 'expeditions'`) — distinct from the seed parser's `ExpansionType` and from `GameSource`. The Astromancer uses the Restoration Games store spelling, **Reverent**. (Supersedes the brief flat-string `MONUMENTS` added earlier in this Unreleased cycle.)
- **Board layout anchors + adjacency datasets** — two new data modules consumed by the `ultimatedarktowerboard` package (re-exported, not vendored). `udtBoardAnchors.ts` ships `BOARD_ANCHORS` (multi-slot `building`/`skull`/`hero`/`foe`/`marker` positions, normalized `[0,1]`, for all 60 locations) and `BOARD_IMAGE_INFO` (board-image size + circle center/radius + north heading), with types `Anchor`, `AnchorSlot`, `LocationAnchors`, `BoardAnchorMap`, `BoardImageInfo`. `udtBoardAdjacency.ts` ships `BOARD_ADJACENCY` (the undirected movement graph) plus pure BFS helpers `neighborsOf` / `stepDistance` / `shortestPath` and the `BoardAdjacency` type. Authored with `tools/location-marker` and generated by `tools/location-marker/gen-board-data.mjs` from `udtBoardData.json`; the graph reflects physical adjacency only (disconnected pairs → `Infinity`) and enforces no movement rules.
- **`BluetoothPlatform.NONE` + no-op adapter** — a software-only mode for consumers that hold tower state (broken seals, rendering) but never open a BLE connection. `new UltimateDarkTower({ platform: BluetoothPlatform.NONE })` returns a `NoopBluetoothAdapter` that reports "not connected" and throws a clear error if `connect()`/commands are attempted.

### Fixed

- **Tower Emulator now plays the calibration sweep when "Calibrate" is pressed** — In the Tower Controller example, calibrating against the emulator only flipped the drums' calibrated flags; the 3D popup never ran the animated home sweep (top→middle→bottom) the way the Display package's own example does. The popup display only runs `runCalibration()` when an applied state carries the transient `command: TOWER_COMMANDS.calibration` marker, but the controller mirrors the plain BLE state (which has no `command` field), so the drums just snapped to "calibrated". The controller now sends a dedicated `calibrate` side-channel message to the popup on click (mirroring the existing `playAudio`/`playSequence` side-channels), and the popup stamps the command onto its current state to trigger the visual sweep. The popup also ignores the emulator's interim mirrored state (~1.5 s in) while its own sweep is animating so the staged sweep isn't cut short. The emulator imports `TOWER_COMMANDS`/`createDefaultTowerState` from the cycle-free `udtDisplayExports` barrel to stay clear of the bundle's circular dependency.

- **`npm run build` no longer fails on the Tower Emulator bundle** — `build:examples` aliases the bundled `ultimatedarktower` specifier to a constants-only module (not `index.ts`) to dodge the `UltimateDarkTower.ts` circular dependency that breaks the display package's module-level constant init. The display's `TowerDisplay.ts` imports `createDefaultTowerState`, which lives in `udtHelpers.ts` rather than `udtConstants.ts`, so esbuild failed with *"No matching export for import 'createDefaultTowerState'"*. Added a cycle-free barrel `src/udtDisplayExports.ts` (re-exports `udtConstants` + the pure `createDefaultTowerState` helper) and pointed the emulator alias at it.

- **Construction no longer throws in environments without Bluetooth** — Bluetooth platform detection is now deferred from the `UltimateDarkTower` constructor to `connect()`. Previously `new UltimateDarkTower()` with the default `AUTO` platform called `detectPlatform()` eagerly and threw *"Unable to detect Bluetooth platform"* where Web Bluetooth is unavailable (e.g. iOS Safari/Chrome — all iOS browsers use WebKit), crashing software-only consumers on load. The adapter is now created lazily on first `connect()`, so that error (if any) surfaces only when a connection is actually attempted. Explicit `WEB`/`NODE`/`NONE` still create eagerly.

### Changed

- **Documentation restructured** — Slimmed `README.md` to a hero page with screenshot strip, quickstart, and a documentation map. Split the 1,900-line `docs/API_REFERENCE.md` into focused topic files under `docs/api/` (connection, adapters, commands, state, events, logging, seed, diagnostics) plus an index at `docs/api/README.md`. Added new top-level docs: `docs/README.md` (hub), `docs/GETTING_STARTED.md` (tutorial), `docs/ARCHITECTURE.md` (layer diagrams + lifecycle), `docs/EXAMPLES.md` (what each demo demonstrates), `docs/ECOSYSTEM.md` (companion repos). Renamed `docs/TOWER_TROUBLESHOOTING_RG.md` → `docs/TROUBLESHOOTING.md`. Embedded real nRF Connect screenshots of the tower's BLE service tree in `docs/TOWER_TECH_NOTES.md` and added a Mermaid layer/position anatomy diagram. Added README files for the controller and game example apps. Replaced `docs/API_REFERENCE.md` with a stub that redirects to the new `docs/api/` index. Removed the obsolete `examples/controller/TOWER_EMULATOR_NPM_MIGRATION.md`.
- **API reference: board-data page + full coverage pass.** Added `docs/api/board-data.md` documenting the board geometry (`BOARD_LOCATIONS`/`BOARD_GROUPINGS`, `BOARD_ANCHORS`/`BOARD_IMAGE_INFO`, `BOARD_ADJACENCY` + `neighborsOf`/`stepDistance`/`shortestPath`) and the hero/monument/foe reference rosters — previously only mentioned in `ECOSYSTEM.md`. Backfilled the remaining un-referenced exports into their topic pages (`Confidence` + base-34 char helpers in seed, `DisconnectCause`/`DiagEventKind`/`BatterySample`/`CommandQueueSnapshot` in diagnostics, `TowerEventCallbacks` in events, `LogLevel`/`LogOutput` in logging, `parseDifferentialReadings` in state) so every public export now has a reference entry. Added the shared `docs/API_STYLE.md` standard plus a breadcrumb + changelog pointer on the API index.

## [4.0.1] - 2026-05-28

### Fixed

- **`rotateWithState()` no longer bounces already-rotated drums back to their old positions** — `rotateDrumStateful()` was reading the live tower state to build its 20-byte stateful packet but never updating that state after sending. Inside `rotateWithState()` the three sequential calls therefore all read the same pre-rotation state, so call 2's packet re-sent the original top-drum position (rotating it back) and call 3's packet re-sent the original middle position. Local state is now updated immediately after the command is built, so subsequent calls in the loop encode the correct cumulative positions. Same pattern as the prior `setLEDStateful` fix.

## [4.0.0] - 2026-05-28

- **Tower Emulator has been added** — Utilising the UltimateDarkTowerDisplay the example app can now connect to a software rendered version of the tower. The controller and the software tower share actual packets, so this can be a useful feature for testing certain features of both the UDT library and the UDT Display Library.

### Fixed

- **Eliminated all 85 `@typescript-eslint/no-explicit-any` lint warnings** — All `any` types across source and test files replaced with proper TypeScript types (`unknown`, type-narrowed catch blocks, typed mock helpers, typed cast chains). Also added a `no-undef` disable comment for the `globalThis` usage in `udtDiagnostics.ts`. Local interface declarations for the Web Bluetooth API (`BluetoothDevice`, `BluetoothRemoteGATTCharacteristic`, etc.) were added to `WebBluetoothAdapter.ts` since these types are not included in TypeScript's standard DOM lib. The codebase now reports `0 problems (0 errors, 0 warnings)` from ESLint.

### Added

- **Tower Controller gains a "Seals" tab for 3D emulator seal visibility** — When connected in Tower Emulator mode, a new "Seals" tab appears in the left column of the Tower Controller. It shows a labeled 3×4 grid (Top/Mid/Btm × N/E/S/W) of toggle buttons: clicking a button removes the corresponding seal from the 3D emulator view (button turns dark red); clicking again restores it. "Remove All" and "Replace All" action buttons operate on all 12 seals at once. Seal state is kept in sync with the existing Library tab seal grid on all mutation paths (`breakSeal`, Library grid clicks, "Clear All Lights"). The seal state is communicated to the emulator popup via a new `applySeals` postMessage type, which calls `TowerRenderView.applySeals()` on the display. When not in emulator+connected mode the tab shows an explanatory notice.

- **BLE disconnect diagnostics ("flight recorder")** — Opt-in structured capture of BLE disconnect incidents. Each of the five disconnect detection paths is tagged with a typed `DisconnectCause` (`adapter_event`, `gatt_health_check`, `heartbeat_timeout`, `response_timeout`, `bt_unavailable`) plus `user_initiated` and browser-only `page_unload`. Captures a snapshot of `ConnectionStatus`, command queue (including in-flight command + age), tower state, broken seals, the last ~500 structured BLE events (commands sent/received, timeouts, near-miss heartbeats, log lines), and the last 60 battery readings. Pluggable `DiagnosticsSink` interface mirrors `LogOutput`; ships with `InMemorySink` and `IndexedDBSink` (browser-only, durable across page refresh). Off by default — when disabled, hot paths add a single boolean check. Configure via `new UltimateDarkTower({ diagnostics: { enabled: true, ... } })` or toggle at runtime via `tower.setDiagnosticsEnabled(true)`. Public API: `getDiagnosticsRecorder()`, `getLastIncident()`, `exportDiagnosticsJSON()`. Tower Controller example gains a "BLE Debug" tab with capture toggle, live event stream, persistent incident log, breakdown-by-cause metrics, and JSON export. See [`docs/BLE_DIAGNOSTICS.md`](docs/BLE_DIAGNOSTICS.md). Schema version 1.

- **Seed parser** — New `src/udtSeedParser.ts` provides complete base-34 seed encoding and decoding, matching the game's C# `SeedParser` class. Exports `decodeSeed()`, `createSeed()`, `encodeSeed()`, `validateSeed()`, `compareSeedsRaw()`, `dumpSeedChars()`, and all related types (`DecodedSeed`, `SeedConfig`, `SeedBank`, `SeedComparison`, `CharDiff`, `CharDump`, foe/adversary/ally union types, and lookup arrays).

- **C# System.Random replica** — New `src/udtSystemRandom.ts` implements a byte-exact TypeScript replica of .NET Framework's `System.Random` (modified Knuth subtractive generator). Exports the `SystemRandom` class with `next()`, `nextMax()`, `nextRange()`, and `nextDouble()` methods. Verified against C#-generated test vectors for multiple seeds including edge cases. This is the foundation for future game state prediction from seeds.

- **Game board data** — New `src/udtGameBoard.ts` exports types and constants for all 60 Return to Dark Tower board locations: `TerrainType`, `BuildingType`, `BoardKingdom`, `BoardGrouping`, `BoardLocation`, `BOARD_LOCATIONS` (array), `BOARD_LOCATION_BY_NAME` (name-keyed lookup), and `BOARD_GROUPINGS` (Long Water, The Great Woods, Regal Run).

- **Tower Emulator shows audio playback notifications** — When an audio command is sent while connected to the Tower Emulator, the emulator popup now briefly displays the sound name, loop state, and volume level. The notification auto-dismisses after 4 seconds. Detection is done at the adapter level by reading the audio bytes from the outgoing command packet, so all audio commands are captured regardless of which API method triggered them.

### Changed

- **Tower Emulator now renders a 3D tower model** — The emulator popup now uses `TowerRenderView` from `ultimatedarktowerdisplay` with the `'3d-view'` renderer, replacing the previous `TowerDisplay` default of readout text + 2D SVG side view. The existing connection-status banner and audio-event banner remain above the render, and the render view shows a "Tower Emulator" title bar.

- **Tower Emulator plays LED light sequences with bound audio** — `Tower.lightOverrides(N)` (the controller's Light Override dropdown) now drives a transient LED animation on the emulator's 3D tower **and** plays the firmware-bound audio sample alongside it (mirroring real-tower behavior). Same architectural fix as the audio cut-off: the framework strips `state.led_sequence` on every response (parallel to audio), so the popup was previously seeing `SequenceAnimator.apply(0)` immediately after each light-override command and killing the sequence before any frames played. `TowerEmulatorAdapter` now exposes an `onLightSequenceCommand` callback (parallel to `onAudioCommand`); the controller posts a `playSequence` message to the popup, which calls the display package's new `playSequence(id)` transient API (UltimateDarkTowerDisplay ≥ 0.7.0). The popup enables `audio.bindSequenceToSample: true` in its `TowerRenderView` config so the bound sample fires automatically via `playSampleOneShot` inside `playSequence` — same firmware behavior the display's own example app emulates. Detection reads `data[19]` (the `led_sequence` byte) from outgoing stateful commands.

- **Tower Emulator plays tower audio (full samples, no cut-off)** — The emulator popup now plays the same audio samples the real tower would, end-to-end. A "Click to enable audio" button appears on first load (required by browser autoplay policy); after clicking, all subsequent audio commands play through the popup. The popup's existing green audio-event banner continues to show sample name / loop / volume in parallel. Audio is driven via the display package's new `playSample(id, opts?)` one-shot API (requires `ultimatedarktowerdisplay` ≥ 0.6.0) — the previous synthetic-state workaround caused samples to cut off after ~100ms because the framework's audio-reset state updates triggered the display's `sync(0)` → `stop()` pipeline. The one-shot path is independent of state-driven `sync()`, so it plays to completion. Polyphony works (overlapping samples). The emulator's esbuild target was bumped from `es2017` to `es2020` and the output format from `iife` to `esm` (with a `<script type="module">` tag) so that the display package's per-file `new URL('./assets/<file>.ogg', import.meta.url)` references resolve at runtime against the bundle URL. Audio samples are copied from `UltimateDarkTowerDisplay/src/audio/assets/` to `dist/examples/controller/assets/` by `build-examples.js`.

- **`breakSeal()` now uses the firmware `sealReveal` LED override** — Previously composed ledge and doorway light states manually and sent them as a `lights()` command alongside the audio command. Now sends a single `lightOverrides(TOWER_LIGHT_SEQUENCES.sealReveal, ...)` packet that triggers the firmware's built-in seal reveal animation. The tower blocks until the animation completes before acknowledging the command, so callers no longer need an explicit delay between `breakSeal()` calls.

### Removed

- **Old seed decoder** — Deleted `src/udtSeedDecoder.ts` and its exports (`extractBits`, `seedGroupToNumber`, `BitDiff`, `BitDump`, `DecodedField`). The old implementation used an incorrect base-36/62-bit model. All functionality is replaced by `udtSeedParser.ts` with the confirmed base-34 encoding.

### Fixed

- **`connect()` swallowed errors instead of propagating to callers** — `udtBleConnection.connect()` caught all errors from the Bluetooth adapter (including `BluetoothUserCancelledError`) and called `onTowerDisconnect()` instead of re-throwing. This prevented callers from detecting user cancellation or connection failures. The catch block also incorrectly fired a disconnect event for a tower that was never connected. Errors are now re-thrown after logging, and the spurious disconnect callback has been removed.

- **Tower Emulator popup blocked on GitHub Pages (HTTPS)** — Moved `window.open` for the emulator display window to before the first `await` in `connectToTowerEmulator()`, ensuring it runs within the original user-gesture call stack and is not blocked by browser popup blockers on HTTPS origins.

## [3.0.0] - 2026-03-24

### Changed

- **`onBatteryLevelNotify` now fires on every battery response** — The callback is no longer gated by battery logging settings, ensuring internal battery state and UI indicators always stay current regardless of log configuration.
- **Renamed battery notification properties to battery logging properties** — `batteryNotifyEnabled` → `batteryLogEnabled`, `batteryNotifyFrequency` → `batteryLogFrequency`, `batteryNotifyOnValueChangeOnly` → `batteryLogOnChangeOnly`. The new names clarify that these properties control the library's internal log output, not the `onBatteryLevelNotify` callback.
- **`lights()` now sends a single command instead of per-light commands** — Previously sent individual `setLEDStateful` commands for each light (up to 24 commands), which could overflow the tower's buffer. Now accumulates all light changes into one state packet sent as a single command.

### Fixed

- **Battery indicator not updating when battery logging set to NONE** — The Tower Status battery display now always updates regardless of the battery logging setting.
- **Battery `[RCVD]` log lines ignoring "Changes" filter** — The generic `[UDT][BLE][RCVD] BATTERY_READING` log line was not respecting `batteryLogOnChangeOnly`. Battery responses now skip the generic RCVD log and are logged exclusively by the dedicated battery logging block, which correctly respects all three logging properties.
- **Ledge and base light effects not looping** — Effects like "breathe" played once and faded away on ledge and base lights because their `loop` flag was hardcoded to `false`. All light types now set `loop` based on whether the effect is active (`effect !== LIGHT_EFFECTS.off`), matching the behaviour of `allLightsOn()`.

### Added

- **Battery logging properties documented in API_REFERENCE.md** — `batteryLogEnabled`, `batteryLogFrequency`, and `batteryLogOnChangeOnly` are now documented with descriptions, types, defaults, and usage examples.

## [2.5.0] - 2026-03-23

### Added

- **`markSealBroken()` method** — Marks a seal as broken in software tracking without sending hardware commands. Enables restoring game state (e.g., resuming a saved game).
- **`markSealRestored()` method** — Marks a seal as unbroken in software tracking without sending hardware commands. Enables undoing a seal break or restoring individual seals.
- **`brokenSeals` config option** — Accepts an array of `SealIdentifier` in `UltimateDarkTowerConfig` to initialize seal state at construction time.

### Changed

- **Improved seal management documentation** — API_REFERENCE.md now explains that seals are physical plastic covers on the tower (12 total), that seal state is tracked purely in software (not by firmware), and documents all new seal state management APIs.

## [2.4.0] - 2026-03-19

### Changed

- **Migrated project baseline to Node.js 18+** — Updated `engines.node` to `>=18.0.0`, aligned CI matrix validation to Node 18 and 20, and refreshed contributing guidance to reflect active runtime support.

### Fixed

- **Cleared development-tooling security advisories without permanent overrides** — Upgraded direct dev dependencies (`ts-jest`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, and `esbuild`) so the lockfile now resolves patched transitive versions for `minimatch`, `ajv`, `js-yaml`, and `flatted` without retaining temporary npm `overrides`. Full `npm audit` now reports zero vulnerabilities while preserving the existing Jest, ESLint, and build configuration.
- **Stabilised `ts-jest` coverage resolution after dependency cleanup** — Added an explicit `jest-util` devDependency so `ts-jest` can resolve its runtime helper consistently during Jest coverage runs.
- **Adjusted BLE device-info fallback for newer lint rules** — Removed an unused catch binding in `readDeviceInformation()` so the code remains compatible with the stricter `@typescript-eslint` rules introduced by the dependency upgrades.
- **Started staged modernization dependency refresh** — Updated core dev tooling to current non-breaking lines (`typescript` to `^5.9.3`, `prettier` to `3.8.1`, `@types/node` to `^24.12.0`, `@types/jest` to `^30.0.0`, and `@stoprocent/noble` to `^2.3.17`) and revalidated with full CI and `npm audit`.
- **Consolidated duplicate ESLint configuration files** — Unified lint configuration into `.eslintrc.js` and removed `.eslintrc.json` to reduce rule drift and prepare cleanly for future ESLint major migration work.
- **Updated Node matrix CI for active support policy** — CI matrix now validates Node 18 and 20 only, matching the new runtime baseline.
- **Added ESLint flat-config preview path for staged migration** — Added `eslint.config.mjs` and preview scripts (`lint:flat:preview`) so ESLint 9 compatibility can be tested incrementally while the current CI lint path remains unchanged.
- **Achieved ESLint rule parity between legacy and flat-config paths** — Updated `eslint.config.mjs` to include `js.configs.recommended` (base ESLint rules) and explicitly disable `no-unused-vars` in favour of `@typescript-eslint/no-unused-vars` with argument patterns, ensuring both `npm run lint` and `npm run lint:flat:preview` produce identical output (86 warnings). Both lint paths now feature full parity for future seamless migration to ESLint 9.
- **Upgraded Jest toolchain toward current major** — Upgraded `jest` and `jest-util` to the 30.x line and aligned Jest type definitions to `@types/jest` 30.x while keeping `ts-jest` on latest available stable 29.x until a compatible 30.x release is published.

## [2.3.1] - 2026-03-09

### Added

- **Troubleshooting modal in TowerController example** — A "Troubleshooting" button now appears in the TowerController web app button bar. Clicking it opens a modal overlay displaying the full Restoration Games troubleshooting guide (tower jams, disconnects, firmware errors 133/257, and battery specifications). The modal can be dismissed via the close button, clicking the backdrop, or pressing Escape. The button is visually de-emphasised (reduced opacity, smaller text, extra left margin) to indicate it is secondary to Connect/Disconnect/Calibrate.

## [2.3.0] - 2026-02-23

### Added

- **`allLightsOn(effect?)` and `allLightsOff()` convenience methods** — Turns all 24 tower LEDs on or off with a single command packet. `allLightsOn` accepts an optional `effect` parameter (default: `LIGHT_EFFECTS.on`); `allLightsOff` is a convenience wrapper around `allLightsOn(LIGHT_EFFECTS.off)`. Both preserve existing drum, beam, and audio state.

### Changed

- **Public audio volume API now clamps inputs to 0–3** — The `volume` parameter accepted by `playSoundStateful`, `breakSeal`, and related methods is now clamped to the range 0–3 (0=loudest, 1=medium, 2=quiet, 3=softest/mute) before being sent to the tower. The tower's 4-bit device field accepts 0–15, but the firmware only defines behaviour for 0–3; out-of-range inputs now silently clamp rather than producing undefined tower behaviour. If you were passing values outside 0–3, update them to the equivalent in-range value.

## [2.2.0] - 2026-02-20

### Fixed

- **`setLEDStateful` stale-state accumulation** — `setLEDStateful` never called `setTowerState`, so `onTowerStateUpdate` callbacks were never fired for LED changes and any code calling it in a loop (including `lights()`) risked reading stale state if `this.currentTowerState` was replaced between iterations. State is now updated explicitly before the command is sent.
- **`cleanup()` reconnect hazard** — `cleanup()` called `disconnect()` which fired `onTowerDisconnect`, meaning a reconnect-on-disconnect handler could call `connect()` on an instance mid-teardown. `isDisposed` is now set before any disconnect logic runs so the callback cannot re-enter `connect()`.
- **`cleanup()` not idempotent** — Calling `cleanup()` more than once would re-run the full teardown sequence. It now returns early if the instance is already disposed.
- **`MockBluetoothAdapter.cleanup()` leaving callbacks registered** — The mock adapter's `cleanup()` now clears all three event callbacks, matching the behaviour of `NodeBluetoothAdapter`.

### Changed

- **`connect()` throws after disposal** — Calling `connect()` on a `UdtBleConnection` instance after `cleanup()` now throws `Error: UdtBleConnection instance has been disposed and cannot reconnect`. Use `disconnect()` for reversible disconnection.

## [2.1.3] - 2026-02-19

### Fixed

- **`@stoprocent/noble` not loading in ESM build** — In Node.js ESM contexts, `require` is not defined, causing esbuild's `__require` shim to silently fail and leave `noble` as `undefined`. The ESM bundle now injects `import{createRequire}from'module';const require=createRequire(import.meta.url);` as a banner so `@stoprocent/noble` loads correctly via CJS `require` within the ESM module.

## [2.1.2] - 2026-02-19

### Fixed

- **ESM named imports broken** — `import { UltimateDarkTower } from 'ultimatedarktower'` previously threw `SyntaxError: The requested module does not provide an export named 'UltimateDarkTower'` in Node.js ESM projects because the `"import"` export condition pointed to the CommonJS build. The package now ships a true ES Module bundle so named imports work correctly.

### Added

- **ESM build** (`dist/esm/index.mjs`) — a native ES Module bundle produced by esbuild, included in the published package alongside the existing CommonJS build

### Changed

- `package.json` `exports["import"]` condition now points to `dist/esm/index.mjs` instead of the CommonJS output; `exports["require"]` is unchanged
- `package.json` `files` now includes `dist/esm/**/*`

## [2.1.1] - 2026-02-19

### Added

- Integration test for tower calibration using Node.js Bluetooth adapter, located in `tests/integration/calibration.integration.ts`
- `npm run test:integration` script to run integration tests requiring real hardware
- Integration tests are now organized under `tests/integration/` and are not run by default with unit tests or during publish

## [2.1.0] - 2026-02-19

### Added

- **Public Tower State Types** — Exported `TowerState`, `Light`, `Layer`, `Drum`, `Audio`, and `Beam` type interfaces for direct tower state manipulation
- **Tower State Utilities** — Exported `rtdt_unpack_state`, `rtdt_pack_state`, `isCalibrated`, and `createDefaultTowerState` for converting between `TowerState` objects and binary tower data
- **Differential Readings** — Exported `parseDifferentialReadings` function and `ParsedDifferentialReadings` type for parsing tower sensor data
- **`TowerResponseConfig` Type** — Exported interface for controlling which tower responses are logged via `logTowerResponseConfig`

### Changed

- **`TowerResponseConfig`** — Moved from private interface in `UltimateDarkTower.ts` to exported interface in `udtTowerResponse.ts`
- **`shouldLogResponse`** — Updated parameter type from `any` to `TowerResponseConfig` for type safety
- **Controller Example** — Updated imports to use the package index instead of internal module paths

## [2.0.0] - 2025-02-18

### Added

- **Node.js Support** — `NodeBluetoothAdapter` using `@stoprocent/noble` for BLE communication in Node.js environments (macOS, Linux, Windows)
- **Platform Auto-Detection** — `BluetoothAdapterFactory` automatically selects the correct adapter based on the runtime environment (browser vs Node.js vs Electron)
- **`BluetoothPlatform` Enum** — Explicit platform selection via `BluetoothPlatform.WEB`, `BluetoothPlatform.NODE`, or `BluetoothPlatform.AUTO`
- **`IBluetoothAdapter` Interface** — Public adapter interface for implementing custom Bluetooth adapters (React Native, Cordova, etc.)
- **Platform-Agnostic Error Types** — `BluetoothConnectionError`, `BluetoothDeviceNotFoundError`, `BluetoothNotAvailableError`, `BluetoothCharacteristicError`, `BluetoothAdapterError` for consistent error handling across platforms
- **Node.js CLI Example** — Interactive command-line example application (`examples/node/`)
- **Adapter Layer Tests** — Unit tests for `NodeBluetoothAdapter`, `WebBluetoothAdapter`, `BluetoothAdapterFactory`, `UdtBleConnection`, and error types

### Changed

- **`udtBleConnection`** — Refactored to use `IBluetoothAdapter` interface instead of direct Web Bluetooth API calls, enabling multi-platform support
- **`UltimateDarkTower` Constructor** — Now accepts `UltimateDarkTowerConfig` with optional `platform` or `adapter` properties for platform selection
- **Peer Dependency** — Updated `@stoprocent/noble` peer dependency from `^1.15.0` to `^2.0.0`

## [1.0.0] - 2025-08-18

### Added

- Initial release
- Web Bluetooth support for Chrome, Edge, and Samsung Internet
- Tower control API (lights, sounds, drum rotation)
- Glyph position tracking with automatic updates on drum rotation
- Seal management for game mechanics
- Tower state management and validation
- Multi-layered disconnect detection (heartbeat, GATT events, command timeout)
- Callback-based event system for tower events
- Comprehensive logging system with multiple outputs
- Battery monitoring with low battery warnings
- TypeScript definitions and type safety
- Tower Controller example web app
- Tower Game ("The Tower's Challenge") example web app
- Complete API reference documentation

[2.3.0]: https://github.com/ChessMess/UltimateDarkTower/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/ChessMess/UltimateDarkTower/compare/v2.1.3...v2.2.0
[2.1.3]: https://github.com/ChessMess/UltimateDarkTower/compare/v2.1.2...v2.1.3
[2.1.2]: https://github.com/ChessMess/UltimateDarkTower/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/ChessMess/UltimateDarkTower/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/ChessMess/UltimateDarkTower/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/ChessMess/UltimateDarkTower/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/ChessMess/UltimateDarkTower/releases/tag/v1.0.0
