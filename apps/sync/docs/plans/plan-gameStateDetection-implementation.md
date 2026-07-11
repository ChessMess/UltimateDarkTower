# Plan: Game-State Sequence Detection & Reporting

## Context

The host intercepts raw 20-byte tower command packets from the companion app and relays them to remote players. These packets contain LED sequence overrides (byte 19) and audio sample IDs (byte 15) that correspond to specific game events (month start, battle victory, seal break, etc.). Currently the system logs raw bytes and does minimal annotation — `CommandParser` only recognizes 5 of 19 LED overrides and 1 of 115 audio IDs. The goal is to detect ALL semantic game events from packets inline, surface them in logs and display, and enable post-session reporting.

## Analysis of Original Plan

The original plan document (`docs/plan-gameStateSequenceDetection.prompt.md`) proposed 7 steps including a separate mapping file, a new `sequenceDetector.ts` module, confidence scoring, and a new reporting script. After deep-diving into the codebase, several of those steps are unnecessary:

| Original Proposal | Verdict | Reason |
|---|---|---|
| Extract enums, create canonical mapping file | **Skip** | `TOWER_LIGHT_SEQUENCES` (19 entries) and `TOWER_AUDIO_LIBRARY` (115 entries) from the `ultimatedarktower` npm package ARE the canonical source. Already used in `analyzeLogs.ts`. |
| Separate `sequenceMappings` module | **Skip** | The UDT constants already have name, value, and category. No separate data structure needed. |
| New `sequenceDetector.ts` with event emitter | **Simplify** | Detection is a pure function on a single packet — no state machine needed. Enhance `CommandParser.parse()` instead. |
| Confidence scoring | **Skip** | All IDs are deterministic. 0x13 is always monthStarted. 0x26 is always BattleVictory. Simple `source: 'led' | 'audio'` field suffices. |
| New `reportSequences.ts` script | **Enhance existing** | `analyzeLogs.ts` already builds the same reverse lookup maps and does LED/audio analysis. Add a `--game-events` flag. |
| Update observerDisplay.ts | **Defer** | ObserverDisplay is a passive state tracker; game events flow through ParsedCommand → logger → analyzeLogs. No need to modify it for the core feature. |

## Recommended Approach

Enrich the existing `CommandParser` to detect all game events from LED and audio fields, flow them through the existing `LogEntry` format, and enhance `analyzeLogs.ts` for reporting. Three files modified, two files with minor wiring changes.

---

## Implementation Steps

### Step 1: Add `LogGameEvent` to shared types

**File:** `packages/shared/src/logging.ts`

- Add `LogGameEvent` interface (dependency-free, plain TS):
  ```typescript
  export interface LogGameEvent {
    id: string;       // e.g. 'monthStarted', 'BattleVictory'
    name: string;     // e.g. 'Month Started', 'Battle Victory'
    source: 'led' | 'audio';
    category?: string; // e.g. 'Battle', 'State', 'Seals'
  }
  ```
- Add optional `gameEvents?: LogGameEvent[]` field to `LogEntry` interface
- Update `makeCommandLogEntry()` signature to accept optional `gameEvents` parameter
- Update `formatLogEntry()` to append game event names when present (e.g., `[monthStarted]`)

### Step 2: Enrich `CommandParser` with full detection

**File:** `packages/host/src/commandParser.ts`

- Import `TOWER_LIGHT_SEQUENCES` and `TOWER_AUDIO_LIBRARY` from `ultimatedarktower`
- Build reverse lookup maps at module scope (same pattern as `analyzeLogs.ts` lines 85-98):
  ```typescript
  const LED_SEQ_BY_VALUE: Record<number, string> = {};
  for (const [name, value] of Object.entries(TOWER_LIGHT_SEQUENCES)) {
    LED_SEQ_BY_VALUE[value as number] = name;
  }
  const AUDIO_BY_VALUE: Record<number, { id: string; name: string; category: string }> = {};
  for (const [id, info] of Object.entries(TOWER_AUDIO_LIBRARY)) {
    const a = info as { name: string; value: number; category: string };
    AUDIO_BY_VALUE[a.value] = { id, name: a.name, category: a.category };
  }
  ```
- Export a `GameEvent` interface (extends `LogGameEvent` concept but lives in host package):
  ```typescript
  export interface GameEvent {
    id: string;
    name: string;
    source: 'led' | 'audio';
    category?: string;
  }
  ```
- Add `gameEvents: GameEvent[]` to `ParsedCommand` interface (always present, empty array = no events)
- Replace the hardcoded `ovrNames` map (lines 103-109, only 5 entries) with the full `LED_SEQ_BY_VALUE` map
- Replace the `audio === 0x70` check (line 98) with full `AUDIO_BY_VALUE` lookup
- In `parse()`, populate `gameEvents` array:
  - If `ledOvr > 0` and found in `LED_SEQ_BY_VALUE`: push LED game event
  - If `audio > 0` (bits 0-6) and found in `AUDIO_BY_VALUE`: push audio game event
- Build the `description` string from the same data (backward compatible)

### Step 3: Wire game events through host orchestration

**File:** `packages/host/src/index.ts` (lines 60-69)

Current code:
```typescript
tower.onCommandReceived = (data) => {
  if (!parser.isValid(data)) { ... }
  observer.onCommandReceived(data);
  logger.logCommand('companion→host', data, null, 'companion');
  ...
};
```

Change to:
```typescript
tower.onCommandReceived = (data) => {
  const parsed = parser.parse(data);
  if (!parsed.valid) { ... }
  observer.onCommandReceived(data);
  const events = parsed.gameEvents.length > 0 ? parsed.gameEvents : undefined;
  logger.logCommand('companion→host', data, null, 'companion', parsed.description, events);
  const seq = relay.broadcast(data);
  logger.logCommand('host→clients', data, seq, 'host', undefined, events);
};
```

**File:** `packages/electron/src/main/main.ts` (lines 217-231)

Already uses `parser.parse(data)` — just add the `gameEvents` passthrough to `logger.logCommand()` calls, same pattern as above.

### Step 4: Update `HostLogger.logCommand()` signature

**File:** `packages/host/src/logger.ts`

- Update `logCommand()` to accept optional `gameEvents` parameter and pass it through to `makeCommandLogEntry()`

### Step 5: Add unit tests

**File:** `tests/unit/host/commandParser.test.ts`

Add test cases:
- Packet with `byte[19]=0x13` → `gameEvents` contains `{id:'monthStarted', source:'led'}`
- Packet with `byte[19]=0x0b` → `gameEvents` contains `{id:'defeat', source:'led'}`
- Packet with `byte[19]=0x0c` → `gameEvents` contains `{id:'victory', source:'led'}`
- Packet with `byte[19]=0x0e` → `gameEvents` contains `{id:'sealReveal', source:'led'}`
- Packet with `byte[15]=0x26` → `gameEvents` contains `{id:'BattleVictory', source:'audio'}`
- Packet with `byte[15]=0x70` → `gameEvents` contains `{id:'TowerSeal', source:'audio'}`
- Packet with BOTH `byte[19]=0x0e` AND `byte[15]=0x70` → two game events (led + audio)
- Packet with all zeros → `gameEvents` is empty array
- Packet with unknown `byte[19]` value → still produces LED event with hex fallback name in description
- Using existing `buildCustomCommand()` helper from `tests/helpers/commandBuilders.ts`

### Step 6: Enhance `analyzeLogs.ts` with game event summary

**File:** `packages/host/scripts/analyzeLogs.ts`

- Add `--game-events` CLI flag
- Add `printGameEventSummary()` function:
  - If log entry has `gameEvents` field: use it directly (new logs)
  - Fallback: re-derive from `decoded.ledOverride` and `decoded.audio` using the reverse maps already in the script (backward compat with old logs)
  - Output: chronological event timeline + summary count table
- Wire into `main()` alongside existing report modes

---

## Files to Modify (ordered)

| # | File | Change |
|---|---|---|
| 1 | `packages/shared/src/logging.ts` | Add `LogGameEvent`, update `LogEntry`, `makeCommandLogEntry`, `formatLogEntry` |
| 2 | `packages/host/src/commandParser.ts` | Import UDT constants, build reverse maps, add `GameEvent`/`gameEvents` to parse output |
| 3 | `packages/host/src/logger.ts` | Pass-through `gameEvents` in `logCommand()` |
| 4 | `packages/host/src/index.ts` | Use `parser.parse()` result, pass `gameEvents` to logger |
| 5 | `packages/electron/src/main/main.ts` | Pass `gameEvents` to logger (already uses `parser.parse()`) |
| 6 | `tests/unit/host/commandParser.test.ts` | Add game event detection tests |
| 7 | `packages/host/scripts/analyzeLogs.ts` | Add `--game-events` flag and summary report |

## Key Design Decisions

1. **LED override is primary, audio is supplementary.** LED sequences map 1:1 to game events and are always deterministic. Audio provides additional context (adversary names, dungeon types) but includes UI noise (button presses, card flips, idle sounds).

2. **Single-packet detection only.** Every game event is signaled by one packet. The FakeTower confirms this: byte 19 is a fire-and-forget animation trigger that gets cleared in the echo response. No multi-packet state tracking needed.

3. **No separate module.** Detection is a pure function on packet bytes — it belongs in `CommandParser.parse()` which already extracts these fields.

4. **Backward-compatible logging.** The `gameEvents` field is optional on `LogEntry`. Old logs without it still work; `analyzeLogs.ts` can re-derive events from `decoded` fields.

5. **No confidence scoring.** All IDs are deterministic protocol values assigned by the companion app's game engine.

## Reference: Complete LED Sequence → Game Event Map

Source: `ultimatedarktower/src/udtConstants.ts` `TOWER_LIGHT_SEQUENCES`

| Value | ID | Game Meaning |
|---|---|---|
| 0x01 | twinkle | Generic twinkle effect |
| 0x02 | flareThenFade | Flare then fade effect |
| 0x03 | flareThenFadeBase | Flare then fade (base LEDs) |
| 0x04 | flareThenFlicker | Flare then flicker effect |
| 0x05 | angryStrobe01 | Tower attacking (phase 1) |
| 0x06 | angryStrobe02 | Tower attacking (phase 2) |
| 0x07 | angryStrobe03 | Tower attacking (phase 3) |
| 0x08 | gloat01 | Tower gloating (phase 1) |
| 0x09 | gloat02 | Tower gloating (phase 2) |
| 0x0a | gloat03 | Tower gloating (phase 3) |
| 0x0b | defeat | Players defeated the tower |
| 0x0c | victory | Tower defeated the players |
| 0x0d | dungeonIdle | Dungeon mode idle |
| 0x0e | sealReveal | Seal broken/revealed |
| 0x0f | rotationAllDrums | All drums rotating |
| 0x10 | rotationDrumTop | Top drum rotating |
| 0x11 | rotationDrumMiddle | Middle drum rotating |
| 0x12 | rotationDrumBottom | Bottom drum rotating |
| 0x13 | monthStarted | New month begins |

## Reference: Key Audio IDs for Game Events

Source: `ultimatedarktower/src/udtConstants.ts` `TOWER_AUDIO_LIBRARY` (115 total, key ones below)

| Value | ID | Name | Category |
|---|---|---|---|
| 0x25 | BattleStart | Battle Start | Battle |
| 0x26 | BattleVictory | Battle Victory | Battle |
| 0x3A | DungeonComplete | Dungeon Complete | Dungeon |
| 0x58 | QuestComplete | Quest Complete | Quest |
| 0x5F | GameStart | Game Start | State |
| 0x60 | TowerGloat1 | Tower Gloat 1 | State |
| 0x6A | MonthEnded | Month Ended | State |
| 0x6B | MonthStarted | Month Started | State |
| 0x6C | QuestFailed | Quest Failed | Quest |
| 0x70 | TowerSeal | Tower Seal | Seals |
| 0x71 | TowerSkullDropped | Tower Skull Dropped | State |

## Verification

1. **Unit tests**: Run `npm test` — new tests in `commandParser.test.ts` verify detection for each LED sequence and key audio IDs
2. **Build check**: Run `npm run build` across all packages — TypeScript compilation catches interface mismatches
3. **Manual test with FakeTower**: Start host, connect companion app, play a game — verify JSONL logs contain `gameEvents` on entries where `ledOverride != 0` or `audio != 0`
4. **Log analysis**: Run `npm run analyze -w packages/host -- --game-events` on a session log — verify chronological timeline and count summary
5. **Regression**: Existing tests pass unchanged (the `gameEvents` field is additive)
