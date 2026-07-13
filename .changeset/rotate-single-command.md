---
"ultimatedarktower": patch
---

Fix `rotateWithState()` sending a redundant command per drum (including drums that weren't
actually changing position), which could throw `NetworkError: GATT operation already in
progress` on real hardware. It now sends a single combined command covering only the drums
that are actually moving. `rotateDrumStateful()` also now skips sending a command when the
drum is already at the requested position. Additionally, `CommandQueue` now enforces a
minimum ~250ms gap between a command's response and the next command's dispatch, matching
the tower's documented rate limit and preventing the next BLE write from firing from within
the synchronous continuation of the previous command's response handler.
