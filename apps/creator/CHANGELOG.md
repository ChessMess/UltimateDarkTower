# @udtc/creator

## 0.2.4

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

- 6961078: Retire "raze"/"razed" as a synonym for "destroy"/"destroyed" throughout comments, schema
  `$comment` prose, test descriptions, and one user-visible string in the Building Types dialog
  ("skulls sit on it; the next one destroys it"). No behavior change — `skullCapacity` and the
  destroy rule are unchanged, this only standardizes the wording.
- Updated dependencies [a00cf63]
- Updated dependencies [99f396e]
- Updated dependencies [c4b5e89]
- Updated dependencies [c4b5e89]
- Updated dependencies [6961078]
- Updated dependencies [6961078]
- Updated dependencies [c4b5e89]
- Updated dependencies [c4b5e89]
- Updated dependencies [c4b5e89]
- Updated dependencies [af416e7]
- Updated dependencies [23cfe9f]
- Updated dependencies [6961078]
- Updated dependencies [f41fd0c]
- Updated dependencies [f41fd0c]
- Updated dependencies [a00cf63]
- Updated dependencies [f41fd0c]
- Updated dependencies [23d4db8]
- Updated dependencies [6961078]
- Updated dependencies [5c900e4]
- Updated dependencies [af416e7]
  - @udtc/adapters@0.3.1
  - ultimatedarktowerboard@3.0.0
  - ultimatedarktowerdisplay@2.0.0
  - @udtc/assets@0.2.0
  - @udtc/engine@0.2.1
  - @udtc/schema@0.3.1
  - ultimatedarktower@7.1.2

## 0.2.3

### Patch Changes

- Updated dependencies [fba6490]
- Updated dependencies [33381f7]
  - ultimatedarktowerboard@2.0.0
  - ultimatedarktowerdisplay@1.0.2
  - @udtc/schema@0.3.0
  - @udtc/adapters@0.3.0

## 0.2.2

### Patch Changes

- Updated dependencies [cdf7f37]
- Updated dependencies [cdf7f37]
  - ultimatedarktower@7.0.0
  - ultimatedarktowerdisplay@1.0.0
  - ultimatedarktowerboard@1.0.0
  - @udtc/adapters@0.2.2

## 0.2.1

### Patch Changes

- Updated dependencies [0d06832]
- Updated dependencies [6a89e0e]
- Updated dependencies [6a89e0e]
- Updated dependencies [6a89e0e]
- Updated dependencies [62da52b]
  - ultimatedarktowerboard@0.4.0
  - ultimatedarktower@6.0.0
  - ultimatedarktowerdisplay@0.11.0
  - @udtc/adapters@0.2.1
