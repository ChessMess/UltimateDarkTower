---
'ultimatedarktowerdigital': patch
---

Fix a stray skull sometimes surviving on the 3D board floor after starting a New Game. The
tower's physics-scene reconciliation (`syncSkulls`) only wiped the floor when the drop count
strictly decreased relative to a locally-tracked "previous" count, which could drift out of sync
with what was actually spawned (e.g. across a pop-out/pop-in re-attach). A drop count of exactly
zero — which only happens right after a session load — now always forces a full clear,
regardless of what the tracked count claims.
