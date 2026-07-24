---
'ultimatedarktowerdisplay': minor
---

Add `getSkullCounts()` to the physics `SkullPhysicsHandle` (`attachSkullPhysics`) —
returns `{ total, inTower, onBoard, inTransit, pending }`, classifying every live skull
by two independent signals (radial position for in-tower, height for on-board) so
`total - onBoard === inTower` whenever the sim is settled (`inTransit === 0`). Cheap,
poll-safe. The physics example panel now shows a live counts readout below the Drop/Clear
buttons.
