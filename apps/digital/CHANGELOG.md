# ultimatedarktowerdigital

## 0.1.0

### Minor Changes

- a95c7e0: The New Game wizard now has a checkbox (checked by default) that auto-places
  the official app's first setup instruction — 2 skulls on each Sanctuary and
  Village — instead of requiring 16 manual clicks through the board
  palette/inspector.

  Backfilled changeset — this shipped in #70 without one.

- a95c7e0: Add the relay bridge (PRD-05): `BridgeTowerSource` wraps `ManualTowerSource`
  and consumes a relay host's decoded command stream, so Restoration Games'
  official companion app can drive the tower while UTDD renders it. Skull drops
  are reported back for the host to synthesize. Disconnected, every call falls
  through to the manual source and UTDD behaves exactly as before. The first
  Connect from the deployed build is expected to fail once — Chrome's Local
  Network Access permission gates a public origin reaching loopback and aborts
  the very request that raises the prompt, so `connect()` retries once, waiting
  on the permission rather than guessing a delay.

  Backfilled changeset — this shipped without one; only its `relay-shared`/
  `relay-client` ESM-sidecar dependency got a changeset at the time.

- a95c7e0: Foe threat status is now set per level (2-4), not per placed foe instance,
  matching how Return to Dark Tower actually applies it — every placed foe of a
  level advances together. The placement palette and inspector share one status
  control per level, stored in `BoardState.meta.levelStatus` so it persists
  whether or not anything of that level is currently placed (e.g. to reflect the
  official app's own status announcements) and cascades to every placed foe of
  that level on change. Level rows show the game's actual configured foe name
  (e.g. "Brigands") once setup has assigned one, instead of a bare "Level N".

  Backfilled changeset — this shipped in #68 without one.

- 6961078: The board toolbar now shows "Shake Skulls" and "Shake Tower" buttons for manually triggering
  the tower's physics-skull shake and drum-wobble effects on demand (`ultimatedarktowerboard`'s
  new `shakeButtons` stage option).
- 6961078: Skulls that fall out of the tower can now be collected and placed on buildings, closing the
  loop `packages/display`'s physics sim started (skulls dropping in) but nothing finished
  (skulls piling up on the floor forever, uncollected).

  - **Collecting**: a three-way switch on the Tower panel — **Auto** sweeps skulls off the board
    floor every 500ms, **Click** lets you click one to collect it (a click elsewhere still
    shakes/orbits as before), **Off** disables both. Collected skulls join a pending pool
    (`BoardState.meta.skullsPending`), which survives session save/export/import and a 3D
    pop-out/pop-in (collected skulls never reappear on the floor).
  - **Assigning**: a banner appears whenever the pool is non-zero, offering both **Place on
    board** (arm the existing click-a-building flow, one skull per click, re-arms until the pool
    empties) and **Place all…** (a modal listing every building grouped by kingdom, with a
    per-building `+`/`−` bounded by the remaining pool, a warning on any building the assignment
    would destroy, and a manual pool `+`/`−` to correct for skulls the physics sim occasionally
    loses uncounted — an OOB despawn, or a drop refused past `skull.maxCount`).
  - **A new kingdom summary panel** shows skulls-on-buildings and destroyed-building counts per
    kingdom (`ultimatedarktowerboard`'s new `skullsInKingdom`/`destroyedInKingdom` selectors).
  - **Destruction is now one-way**: a building destroyed at its 4th skull returns those skulls to
    supply (the stack zeroes) instead of the old auto-restore-below-threshold behavior. The
    inspector's destroyed-building view gains an explicit **Rebuild** button as the replacement
    undo. A session saved under the old rule (a destroyed building still holding 4 skulls) is
    normalized on load.
  - The destroyed-building placeholder is now the `wasteland` marker token in both 2D and 3D
    (`ultimatedarktowerboard`'s renderer change), not a red X.

- a95c7e0: Drop skull now also spawns a physics-driven skull in the 3D tower
  (`ultimatedarktowerdisplay/physics`), the same simulation the display
  package's own demo uses, instead of only bumping the counter and (when
  bridged) notifying the relay. The skull count driving it comes from the
  tower source's own counter, not `TowerState.beam.count`, so it stays correct
  whether or not the official companion app is connected. Skulls already
  dropped replay into the 3D scene whenever it (re)attaches — enabling the 3D
  tower, popping the board out to a separate window, or loading a saved
  session.
- 5f9deec: Gear, treasures, quest items, and companions on the player board are now
  dropdowns of the base game's actual card names (from `ultimatedarktowerdata`'s
  box inventory) instead of free text. A card already on the board drops out of
  its own dropdown, enforcing "one of each" for gear and uniqueness for
  count-1 treasure/companion cards; quest items allow duplicates since the box
  ships 4 Amulets Of Hope. The stored shape is unchanged (`string[]`), so
  sessions saved while these fields were free text still load and render.
- 381de60: Resume the game automatically after a page refresh (PRD-04 FR-04.7). The game
  now autosaves to localStorage a beat after any change and reloads it on boot,
  so a refresh mid-game restores the tower, board, player boards, and turn/month
  exactly where you left off. An incompatible old save (a `schemaVersion`
  mismatch) now surfaces a blocking dialog offering a download before starting
  fresh, instead of failing silently.

### Patch Changes

- c4b5e89: Player, Digital, Creator and Game now resolve their game art from `@udtc/assets` through the
  bundler instead of keeping per-app copies in `public/assets/`.

  **Bug fix — quest markers no longer 404 in Player and Digital.** Their token trees were
  hand-copied and had drifted: `packages/board/example` shipped `tokens/quests/` and the `-token`
  adversary variants, but Player and Digital shipped neither, so `OFFICIAL_QUEST_ART` resolved to
  missing files and quest markers fell back to a plain gold disc. Both apps now carry all 84 token
  images from the single shared source.

  Sizes, per built `dist/`:

  | app     | before | after |
  | ------- | ------ | ----- |
  | Player  | 93 MB  | 74 MB |
  | Digital | 95 MB  | 76 MB |
  | Creator | 34 MB  | 13 MB |

  Creator's saving is the largest because it was emitting the full 22 MB board PNG transitively
  while its own code explicitly wants the downscaled 1400² backdrop; it now imports only that, via
  the dedicated `@udtc/assets/board-small` entry point.

- 270c887: Fix a stray skull sometimes surviving on the 3D board floor after starting a New Game. The
  tower's physics-scene reconciliation (`syncSkulls`) only wiped the floor when the drop count
  strictly decreased relative to a locally-tracked "previous" count, which could drift out of sync
  with what was actually spawned (e.g. across a pop-out/pop-in re-attach). A drop count of exactly
  zero — which only happens right after a session load — now always forces a full clear,
  regardless of what the tracked count claims.
- Updated dependencies [99f396e]
- Updated dependencies [c4b5e89]
- Updated dependencies [c4b5e89]
- Updated dependencies [6961078]
- Updated dependencies [6961078]
- Updated dependencies [c4b5e89]
- Updated dependencies [5f9deec]
- Updated dependencies [c4b5e89]
- Updated dependencies [c4b5e89]
- Updated dependencies [af416e7]
- Updated dependencies [974549e]
- Updated dependencies [9046309]
- Updated dependencies [23cfe9f]
- Updated dependencies [bdaa339]
- Updated dependencies [f41fd0c]
- Updated dependencies [f41fd0c]
- Updated dependencies [a00cf63]
- Updated dependencies [f41fd0c]
- Updated dependencies [23d4db8]
- Updated dependencies [6961078]
- Updated dependencies [5c900e4]
- Updated dependencies [af416e7]
  - ultimatedarktowerboard@3.0.0
  - ultimatedarktowerdisplay@2.0.0
  - @udtc/assets@0.2.0
  - ultimatedarktowerdata@3.0.0
  - ultimatedarktowerrelay-client@1.0.3
  - ultimatedarktower@7.1.2

## 0.0.3

### Patch Changes

- Updated dependencies [fba6490]
- Updated dependencies [33381f7]
  - ultimatedarktowerboard@2.0.0
  - ultimatedarktowerdisplay@1.0.2
  - ultimatedarktowerdata@2.1.0

## 0.0.2

### Patch Changes

- Updated dependencies [cdf7f37]
- Updated dependencies [cdf7f37]
  - ultimatedarktower@7.0.0
  - ultimatedarktowerdisplay@1.0.0
  - ultimatedarktowerdata@2.0.0
  - ultimatedarktowerboard@1.0.0

## 0.0.1

### Patch Changes

- Updated dependencies [0d06832]
- Updated dependencies [6a89e0e]
- Updated dependencies [6a89e0e]
- Updated dependencies [6a89e0e]
- Updated dependencies [6a89e0e]
- Updated dependencies [62da52b]
  - ultimatedarktowerboard@0.4.0
  - ultimatedarktower@6.0.0
  - ultimatedarktowerdisplay@0.11.0
  - ultimatedarktowerdata@1.0.0
