---
'ultimatedarktowerdigital': minor
---

Drop skull now also spawns a physics-driven skull in the 3D tower
(`ultimatedarktowerdisplay/physics`), the same simulation the display
package's own demo uses, instead of only bumping the counter and (when
bridged) notifying the relay. The skull count driving it comes from the
tower source's own counter, not `TowerState.beam.count`, so it stays correct
whether or not the official companion app is connected. Skulls already
dropped replay into the 3D scene whenever it (re)attaches — enabling the 3D
tower, popping the board out to a separate window, or loading a saved
session.
