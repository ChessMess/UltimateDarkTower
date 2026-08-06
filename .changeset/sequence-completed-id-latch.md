---
'ultimatedarktowerdisplay': patch
---

Fix: a light sequence no longer replays every time unrelated state changes.

`state.led_sequence` is a one-shot edge trigger, but it rides inside a full-state
snapshot that consumers keep re-sending long after the sequence ended.
`SequenceAnimator.apply()` only deduplicated a same-id re-apply _while the timeline was
alive_ — `wrapComplete()` zeroes `currentSequenceId` on completion — so any later
`applyState` still carrying the spent id rebuilt the timeline and played the whole
sequence again. Every path that re-applies a stored state hit this: rotating a drum,
clicking an LED (`clearLedOverrides` / `handleLedClick` both re-apply
`getResolvedState()`), switching renderers, popping out, and the post-GLB-load replay.

`SequenceAnimator` now latches the id of the last sequence that ran to completion and
will not rebuild it. A state carrying `led_sequence: 0` re-arms it, as do `stop()` and
`applyTransient()` — so `playSequence()` is never suppressed, and a deliberate
re-trigger of the same sequence only needs a zero in between. The latched call returns
`false`, so the renderer resumes normal per-LED replay for the incoming state instead of
freezing on the sequence's last frame.

Consumers driving from full-state snapshots should still clear `led_sequence` after
sending it (as `ultimatedarktower` does on every tower response) — the latch is a
backstop on the receiving side and does not cover the physical tower.

The example's Trigger Sequence button now applies an empty state before firing, so every
sequence plays from a clean tower and re-triggering the same one works. It also remembers
a _resting_ copy of each applied state, with both one-shot triggers (`led_sequence` and
`audio.sample`) zeroed — the sequence's bound sound was replaying on the next drum
rotation for the same reason the lights were, compounded by the example passing
`force: true` on every action, which bypasses the audio dedup.
