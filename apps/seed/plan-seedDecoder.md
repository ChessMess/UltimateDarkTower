# Game Seed Decoder — Web App + Library

## Context

The Return to Dark Tower companion app generates 12-character base-36 game seeds (e.g., "TL7A-AAUA-N43A") encoding the entire game setup. We need to reverse-engineer the encoding by systematically collecting seeds with known configurations. This requires both a **library** (decoder logic) and a **web app** (interactive data collection, analysis, and visualization).

## User-Selectable Game Setup Fields

| Field                | Options                    | Min bits     |
| -------------------- | -------------------------- | ------------ |
| Game Mode            | Cooperative, Competitive   | 1            |
| Difficulty           | Heroic, Gritty (Coop only) | 1            |
| Game Type            | Core, Alliances, Covenant  | 2            |
| Player Count         | 1-4                        | 2            |
| Main Goal            | 9 options                  | 4            |
| Adversary            | 8 options                  | 3            |
| Level 2 Foe          | 4 options                  | 2            |
| Level 3 Foe          | 4 options                  | 2            |
| Level 4 Foe          | 4 options                  | 2            |
| **Total selectable** |                            | **~19 bits** |

Remaining ~43 bits of the 62 total encode: timeline, quests, dungeons, companion events, battle cards, expansion space, etc.

---

## Part 1: Library — `src/udtSeedDecoder.ts`

**Location:** `UltimateDarkTower/src/udtSeedDecoder.ts`

### Types

- `Adversary` — union of 8 names (Ashstrider, Bane of Omens, Empress of Shades, Gaze Eternal, Gravemaw, Isa the Hollow, Lingering Rot, Utuk'Ku)
- `Ally` — union of 10 names (Gleb, Grigor, Hakan, Letha, Miras, Nimet, Tomas, Vasa, Yana, Zaida)
- `Foe` — union of 12 names
- `MainGoal` — union of 9 goal names
- `GameType` — `'Core' | 'Alliances' | 'Covenant'`
- `GameMode` — `'Cooperative' | 'Competitive'`
- `Difficulty` — `'Heroic' | 'Gritty'`
- `DecodedField<T>` — `{ value: T, confidence: 'confirmed'|'suspected'|'unknown', rawBits: number, bitOffset: number, bitLength: number }`
- `DecodedSeed` — return type with raw data + optional decoded fields + unknown regions

### Functions

- `validateSeed(seed)` — normalize, validate `XXXX-XXXX-XXXX` format
- `seedGroupToNumber(group)` — 4 base-36 chars → number
- `extractBits(groups, offset, length)` — extract N bits from position P across three groups
- `decodeSeed(seed): DecodedSeed` — main decoder
- `compareSeedsRaw(seed1, seed2)` — bit-level diff (which positions changed + values)
- `dumpSeedBits(seed)` — all 62 bits with region labels and raw values

### Exports to add in `src/index.ts`

```typescript
export { decodeSeed, validateSeed, compareSeedsRaw, dumpSeedBits } from './udtSeedDecoder';
export type { DecodedSeed, DecodedField } from './udtSeedDecoder';
```

---

## Part 2: Web App — `packages/seed-decoder/`

A new Vite-based web app in the monorepo (same pattern as `packages/client/`). No framework — vanilla TypeScript + DOM, matching the existing Dark Tower visual style.

### App Features

**1. Seed Entry Panel**

- Text input for seed (validates format on the fly)
- "New Baseline" button — starts a fresh comparison session
- "Add Variant" button — adds seed to current session, prompts user to select what changed
- Session history list showing all entered seeds with their noted changes

**2. Change Selector**

- When adding a variant, user picks which field changed from a dropdown (Adversary, Main Goal, Foe L2, etc.)
- Then selects the new value from the appropriate option list
- This metadata is stored alongside the seed for analysis

**3. Bit Map Display** (modeled after TowerStateReadout)

- Visual grid showing all 62 bits
- Each bit is a colored cell (like `.tdr-led` circles but square for bit display)
- Color-coded by field assignment:
  - Unassigned/unknown: gray (`#333`)
  - Confirmed field: green (`#27ae60`)
  - Suspected field: orange (`#f39c12`)
  - Changed from baseline: red accent (`#c0392b`)
- Hover tooltip shows: bit position, raw value, field name (if assigned), confidence
- Field labels along the bit grid edges

**4. Comparison View**

- Side-by-side or diff view of baseline vs variant
- Highlights exactly which bits changed
- Auto-suggests field assignments when bit changes correlate with the user's noted change

**5. Field Mapping Editor**

- Table of discovered field mappings: name, bit offset, bit length, confidence
- Editable — user can manually assign/adjust mappings
- Persisted to localStorage

**6. LLM Export**

- "Copy as LLM Prompt" button — generates a structured text summary of:
  - All collected seeds with their known configurations
  - Bit-level diffs between baseline and variants
  - Current field mapping hypotheses
  - Formatted for pasting into an LLM conversation for pattern analysis

**7. Data Persistence**

- All sessions/seeds/mappings saved to localStorage
- Export/Import as JSON for backup and sharing

### File Structure

```
packages/seed-decoder/
├── index.html
├── package.json          # Vite, same pattern as client
├── vite.config.ts
├── src/
│   ├── main.ts           # Entry point
│   ├── app.ts            # App controller (like client/app.ts)
│   ├── seedAnalyzer.ts   # Session management, comparison logic, auto-suggestions
│   ├── bitMapDisplay.ts  # Bit grid visualization component (like TowerStateReadout)
│   ├── fieldMapper.ts    # Field mapping editor + persistence
│   ├── llmExport.ts      # LLM prompt generation
│   ├── types.ts          # App-specific types (Session, SeedEntry, FieldMapping)
│   └── styles.css        # Styling (reuse color tokens from client.css)
```

### Visual Style

Follow existing Dark Tower app conventions:

- Dark background (`#161616`), light text (`#e8e8e8`)
- Red accent (`#c0392b`), green for confirmed (`#27ae60`), orange for suspected (`#f39c12`)
- Cards with gradient background and top border highlight
- Monospace for hex/binary values
- Section headers: `0.65rem`, uppercase, letter-spacing, muted color
- Bit cells: ~20px squares (similar to `.tdr-led` but rectangular), color-coded

---

## Part 3: Tests

### `tests/udtSeedDecoder.test.ts` (new)

1. Format validation — valid/invalid seeds, normalization
2. Numeric conversion — known base-36 values
3. Bit extraction — unit tests with known inputs
4. Consistency — same seed → same output
5. Compare utility — identical = no diffs, different = correct positions

### `tests/exports.test.ts` (modify)

Add `decodeSeed`, `validateSeed`, `compareSeedsRaw`, `dumpSeedBits` to imports and verify.

---

## Files Summary

| File                           | Action                      | Repo                  |
| ------------------------------ | --------------------------- | --------------------- |
| `src/udtSeedDecoder.ts`        | **Create**                  | UltimateDarkTower     |
| `src/index.ts`                 | **Modify** — add exports    | UltimateDarkTower     |
| `tests/udtSeedDecoder.test.ts` | **Create**                  | UltimateDarkTower     |
| `tests/exports.test.ts`        | **Modify**                  | UltimateDarkTower     |
| `packages/seed-decoder/`       | **Create** — entire package | UltimateDarkTowerSync |

---

## Reverse-Engineering Workflow (in the web app)

1. **Create baseline** — Enter a seed with all settings noted (mode, type, players, goal, adversary, foes)
2. **Add variants** — Change ONE setting at a time in the companion app, enter the new seed, select what changed
3. **Auto-analysis** — App highlights which bits changed and suggests field assignments
4. **Iterate** — Cycle through all options for each field (8 adversaries, 9 goals, etc.)
5. **Confirm** — Once a field mapping is consistent across all variants, mark as "confirmed"
6. **Export** — Copy LLM prompt for deeper pattern analysis on the remaining unknown bits

---

## Verification

1. `npm test` in UltimateDarkTower — all tests pass
2. `npm run dev` in `packages/seed-decoder` — app loads, seed entry works
3. Enter `TL7A-AAUA-N43A` — see bit map display with all 62 bits
4. Enter two different seeds — comparison view highlights differences
5. "Copy as LLM Prompt" produces well-formatted analysis text
