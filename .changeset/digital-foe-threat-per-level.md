---
'ultimatedarktowerdigital': minor
---

Foe threat status is now set per level (2-4), not per placed foe instance,
matching how Return to Dark Tower actually applies it — every placed foe of a
level advances together. The placement palette and inspector share one status
control per level, stored in `BoardState.meta.levelStatus` so it persists
whether or not anything of that level is currently placed (e.g. to reflect the
official app's own status announcements) and cascades to every placed foe of
that level on change. Level rows show the game's actual configured foe name
(e.g. "Brigands") once setup has assigned one, instead of a bare "Level N".

Backfilled changeset — this shipped in #68 without one.
