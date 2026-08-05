---
'@udtc/player': patch
'ultimatedarktowerdigital': patch
'@udtc/creator': patch
'ultimatedarktowergame': patch
---

Player, Digital, Creator and Game now resolve their game art from `@udtc/assets` through the
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
