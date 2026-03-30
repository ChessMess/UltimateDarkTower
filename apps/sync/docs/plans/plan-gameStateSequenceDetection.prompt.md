Plan: Game-state Sequence Detection & Reporting

TL;DR - Implement a centralized mapping of Tower sequences (light, audio, protocol messages) to semantic game-state events; add a detection module in the Host that listens for those sequence cues, emits/display human-readable events, logs them with timestamps, and provide a log-reporting tool to summarize occurrences by game session.

Steps

1. Discovery & canonical mapping
   - Extract enums and identifiers for `TOWER_LIGHT_SEQUENCES`, `TOWER_AUDIO_LIBRARY`, and `TOWER_MESSAGES` from the built client assets.
   - Create a canonical mapping file that maps sequence ids → semantic event names + recommended confidence/reliability (e.g., `monthStarted` from LED id 0x13; `BattleVictory` audio id → `Victory`).
2. Design sequence mapping data structure
   - Add a `sequenceMappings` module in Host (JSON/TS) that contains entries: { id, type: "light"|"audio"|"message", name, semanticEvent, confidence, notes }.
3. Host detection module
   - Implement `host/src/sequenceDetector.ts` that listens to decoded tower packets and host-side events (LED overrides, audio commands, `client:ready`, `towerConnected`), matches them against `sequenceMappings`, and emits normalized `SequenceEvent` objects `{ timestampISO, semanticEvent, sourceType, rawId, confidence, context }`.
4. Display & logging
   - Update `packages/host/src/observerDisplay.ts` (or the host UI module) to consume `SequenceEvent` objects and show them in UI with brief description.
   - Enhance host logging to include structured JSON lines for sequence events (e.g., `{"event":"SequenceEvent","timestamp":"...","semanticEvent":"MonthStarted","sourceType":"light","rawId":19,"confidence":"high"}`) to make reporting easier.
5. Reporting tool
   - Add `scripts/reportSequences.ts` (or `packages/host/scripts/reportSequences.ts`) to parse logs and output a session summary CSV/JSON with event timestamps, durations (if applicable), and counts.
6. Tests & validation
   - Unit tests for mapping and detector logic.
   - Integration test using `fakeTower` to emit the target sequences and asserting host detection and log entries (add tests under `tests/integration/`).
7. Documentation & config
   - Document mapping format and how to add new sequences in `docs/TECHNICAL_SPECIFICATION.md` and/or `docs/TOWER_EMULATOR.md`.
   - Add config flag to enable/disable sequence parsing or change confidence thresholds.

Verification

1. Unit tests for `sequenceMappings` → deterministic mapping lookups.
2. Unit tests for `sequenceDetector` using simulated decoded packets.
3. Integration test where `fakeTower` emits month-start, victory, defeat sequences; assert `observerDisplay` shows events and structured logs contain correct timestamps and semanticEvent names.
4. Manual run of `scripts/reportSequences.ts` on sample logs to produce expected CSV/JSON summary.

Decisions / Assumptions

- Preferred sources of truth: protocol/enum identifiers (messages/audio positions) then LED sequence ids as fallback.
- Audio asset filenames are not present in this repo; mapping from audio ID → actual audio file may need to be sourced externally.
- Use structured JSON logging (one event per line) to make reporting robust.

Further considerations

1. Do you want to include raw packet payloads in logs or only mapped semantic events? (privacy/log-size tradeoff)
2. Time zone: store ISO timestamps in UTC for consistency.
3. Confidence scoring: mark events as high/medium/low depending on how uniquely they map to game-state (e.g., `monthStarted` from unique LED id = high; generic music track used in multiple contexts = low).
