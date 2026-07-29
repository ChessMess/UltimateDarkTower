---
'ultimatedarktowerdigital': minor
---

Resume the game automatically after a page refresh (PRD-04 FR-04.7). The game
now autosaves to localStorage a beat after any change and reloads it on boot,
so a refresh mid-game restores the tower, board, player boards, and turn/month
exactly where you left off. An incompatible old save (a `schemaVersion`
mismatch) now surfaces a blocking dialog offering a download before starting
fresh, instead of failing silently.
