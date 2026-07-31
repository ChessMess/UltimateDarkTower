---
'ultimatedarktowerrelay-cli': minor
---

Add `s` and `d` keyboard shortcuts to the relay CLI's live dashboard: `s` starts/stops BLE
advertising on the active tower source, `d` disconnects the currently-connected companion app
(and immediately resumes advertising for a reconnect). Both are no-ops-safe manual controls for
states that previously only changed automatically at startup/shutdown.
