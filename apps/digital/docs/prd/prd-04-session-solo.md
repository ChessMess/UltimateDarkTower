# PRD-04 — Game Session & Solo Orchestration

> MVP feature. Depends on PRD-00, 01, 02, 03. Read [_overview.md](_overview.md) first.

## 1. Introduction / Overview

This PRD ties the tower, board, and player boards into a single playable **solo session** and defines
the **`GameSession`** — _one_ JSON object that holds the entire game: the initial configuration, the
tower state, the board state, the player boards, and the progress meta. That single object is the unit
of **save, load, and share** — drop it in localStorage to resume, export it to a file, or send it to
another person who imports it and continues the exact game.

Because the official app does the game setup, UTDD must let the player **enter that initial
configuration by hand** (heroes, adversary, foes, difficulty, main goal, etc.) — there is no live app
connection in MVP. That configuration is captured _inside_ the `GameSession` so the saved/shared object
is self-describing.

This is the glue layer, not a rules engine — it orchestrates the pieces and tracks progress markers the
player advances manually.

## 2. Goals

- One portable **`GameSession` JSON object** = config + tower state + board state + player boards +
  progress. It round-trips losslessly and is shareable between people/devices.
- A new-game setup flow that captures the official app's **initial configuration** manually (1–4 heroes)
  and seeds the session, optionally pre-filled from a game **seed**.
- Save/load (localStorage) and explicit **export/import** (file + copy-paste) of the `GameSession`.
- A lightweight month/turn tracker reflecting the 6-month base-game cadence.
- A single coherent screen where all three feature areas work together.

## 3. User Stories

- _As a player_, I can enter the setup the official app gave me (heroes + home kingdoms, adversary, the
  three foes, difficulty, main goal) so UTDD matches my table.
- _As a player_, I can paste an official game **seed** and have the adversary/foes/difficulty/player
  count pre-filled, so I type less.
- _As a player_, I can save my game and resume it later exactly where I left off.
- _As a player_, I can **export my game to a single file** (or copy its JSON) and **send it to a friend**,
  who imports it and sees the identical tower, board, and player boards.
- _As a player_, I can advance the turn and month counters, so I can track the 6-month timeline.
- _As a player_, I can see the tower, board, and my hero boards together and act on each.

## 4. Functional Requirements

### Initial configuration (manual — mirrors the official app's setup)

1. **FR-04.1** A **new-game setup** MUST capture the configuration the official app would set, since
   there is no live app connection: game **mode** (cooperative in MVP), **difficulty** (from
   `DIFFICULTIES`), **expansions** (none in MVP — base game only), **player count** (1–4), the **heroes**
   in play each with a **home kingdom** (from `HEROES`), the **adversary** (from `ADVERSARY_ROSTER`),
   the three **foes** for levels 2/3/4 (from `FOES`), and the **main goal** (free text or a selectable
   list — not in the libs).
2. **FR-04.2** Setup MUST optionally accept a **seed string**; `decodeSeed` MUST pre-populate adversary,
   foes, difficulty, and player count into the configuration (the player can still edit). Invalid seeds
   MUST be reported without crashing.
3. **FR-04.3** Completing setup MUST initialize the `BoardStateSource` (heroes on their home-kingdom
   citadel — the location found via `BOARD_LOCATIONS.find(l => l.kingdom === k && l.building ===
'Citadel')`, not a location literally named "Citadel"; plus the starting buildings), the
   `TowerStateSource` (default calibrated state), and a player board per hero with base-game starting
   resources (**7 warriors, 1 spirit**; 3 inactive + 3 active hero virtues + 1 kingdom virtue).

### The single `GameSession` object

4. **FR-04.4** UTDD MUST define one top-level **`GameSession`** object that fully contains the game:
   `schemaVersion`, `meta`, `config` (FR-04.1), `progress`, `tower` (the `TowerState`), `board` (the
   `BoardState`), and `playerBoards` (the PRD-03 per-hero state). Its shape is given in §7. Every piece
   needed to resume or hand off the game MUST live inside this one object — nothing essential outside it.
5. **FR-04.5** The `GameSession` MUST be **JSON-serializable and losslessly round-trippable**:
   `deserialize(serialize(session))` reproduces an identical game (tower LEDs/drums/seals, every board
   token/skull/marker, every player-board value, and all progress).
6. **FR-04.6** The object MUST carry a `schemaVersion`; load MUST validate it and reject/migrate
   incompatible versions with a clear message rather than corrupting state.

### Save / load / share

7. **FR-04.7** The player MUST be able to **save** the current `GameSession` to localStorage and **load**
   it back to resume.
8. **FR-04.8** The player MUST be able to **export** the `GameSession` as a downloadable `.json` file and
   **copy** it to the clipboard, and **import** it by uploading a file or pasting JSON — so a session can
   be **sent to another person** and resumed identically. Import MUST reject malformed/incompatible JSON
   gracefully.

### Orchestration

9. **FR-04.9** A **turn/month tracker** MUST display the current month (1–6) and let the player advance
   the turn and month; it MUST surface the base-game loss reminders (3rd corruption / end of month 6 /
   skull supply empty) as **non-enforced** prompts. This state lives in `GameSession.progress`.
10. **FR-04.10** The app MUST present tower, board, and player boards together (the PRD-00 shell), with
    navigation/focus between them.
11. **FR-04.11** The player MUST be able to start over (new game) and to reset the current session.
12. **FR-04.12** Save/load/share MUST read and write the **same** `GameSession` produced by the state
    sources, so a future `BridgeSource` (PRD-05) that drives tower/board from the official app yields the
    same serializable object with no format change.

## 5. Non-Goals (Out of Scope)

- Automating turn phases, event resolution, quests, battles, or win/loss determination.
- Generating the game's random events/quests (the official app owns these).
- Multiple concurrent saved campaigns or cloud sync (local save + manual file/clipboard share in MVP).
- A server or account system for sharing (sharing is "hand the file/JSON to someone").

## 6. Design Considerations

- Setup as a short wizard (seed paste shortcut → heroes + home kingdoms → adversary/foes/difficulty →
  main goal → confirm). The wizard's output _is_ `GameSession.config`.
- The turn/month tracker is a slim persistent header; loss reminders are gentle, dismissible hints.
- Save/load/share menu: New, Save, Load, **Export (file / copy)**, **Import (file / paste)**, Reset.
  Autosave on meaningful changes is a nice-to-have.
- Show the `schemaVersion`/app version in exports so a recipient on an older build gets a clear message.

## 7. Technical Considerations

- **`GameSession` shape** (illustrative — finalize in implementation):

  ```ts
  interface GameSession {
    schemaVersion: number; // bump on breaking changes; validate on load
    meta: { id: string; name?: string; createdAt: string; updatedAt: string; appVersion: string };
    config: GameConfig; // FR-04.1 — the manually-entered official-app setup
    progress: {
      month: number;
      turn: number;
      activeHeroId?: string;
      dismissedReminders?: string[];
      notes?: string;
    };
    tower: TowerState; // from `ultimatedarktower` (plain JSON-serializable object)
    board: BoardState; // from `ultimatedarktowerboard`
    playerBoards: PlayerBoard[]; // PRD-03 (UTDD-native)
  }

  interface GameConfig {
    mode: 'cooperative'; // 'competitive' is future
    difficulty: Difficulty; // 'Heroic' | 'Gritty'
    expansions: never[]; // none in MVP (base game only)
    playerCount: number; // 1–4
    heroes: { heroId: string; homeKingdom: BoardKingdom }[];
    adversary: string; // adversary id
    foes: { level2: string; level3: string; level4: string };
    mainGoal: string; // not in the libs — manual entry
    seed?: string; // optional; if present, used to pre-fill the above
  }
  ```

- `TowerState` and `BoardState` are already plain JSON-serializable objects; `ultimatedarktowerboard`
  also exports board serialize helpers (`state/serialize`). The `GameSession` is just `JSON.stringify`
  of the wrapper — no custom binary needed (the tower's 20-byte packing is for BLE, not for saves).
- Seed decoding, rosters, and difficulties come from `ultimatedarktower`. `SystemRandom` is available if
  any seeded ordering is ever needed, but MVP need not generate content.
- Keep orchestration declarative over the sources; avoid embedding rules. The state sources own the live
  `tower`/`board`; the session layer composes them (+ config/progress/playerBoards) into the snapshot.

## 8. Success Metrics

- A new solo game (e.g., 2 heroes, Ashstrider, a seed) initializes all three areas correctly.
- **Export → import on another machine reproduces the exact game** (tower, board, player boards, config,
  progress) — including the round-trip equality check in FR-04.5.
- Loading an incompatible `schemaVersion` fails with a clear message, not corruption.
- Month/turn tracking and loss reminders behave correctly.

## 9. Open Questions

Resolved for MVP (decisions made during implementation):

- **Main goal** — _free text_ in MVP (`GameConfig.mainGoal`). A curated list can come later when the
  base-game main goals are sourced (PRD-03's IP note applies).
- **Starting resources** — **7 warriors, 1 spirit, 0 corruption** per hero (`factory.ts`
  `STARTING_WARRIORS`/`STARTING_SPIRIT`). Starting skulls are **not** pre-placed (the player follows the
  app's setup prompts and adds them via the board).
- **`schemaVersion` policy** — **reject-only** for MVP (`deserializeSession` throws on mismatch; no
  migrators yet).
- **Autosave** — **explicit save only** (Save button → localStorage). Autosave is still a nice-to-have.
- **Save slots** — **single** localStorage slot in MVP; file export/import covers "another game / another
  person". Named slots deferred.

Still open:

- Whether to offer all owned heroes vs. only the 4 base heroes in setup (MVP shows base heroes only).
- Turn-count handling on **Gritty** (the tracker uses the standard player-count cadence; Gritty's shorter
  months are left to the player to advance manually).

## 10. Implementation status (MVP — built)

Implemented and verified (unit tests + in-browser): the single `GameSession` object and its lossless
round-trip (FR-04.4–04.6), save/load/export/copy/import (FR-04.7–04.8), the **new-game setup wizard**
with seed pre-fill (FR-04.1–04.2), setup initialization that places heroes on their home-kingdom Citadels
and a player board per hero (FR-04.3), and the **turn/month tracker** with non-enforced loss reminders
plus New/Reset (FR-04.9, FR-04.11). The three panes are presented together through the shared store
(FR-04.10), and all of it reads/writes the same `GameSession` a future `BridgeSource` will produce
(FR-04.12). Code: `src/session/{setup,progress}.ts`, `src/features/session/{NewGameWizard,TurnTracker,
SessionBar}.tsx`, `src/features/player-board/PlayerBoardStub.tsx`, and the `gameStore` progress/reset
actions.
