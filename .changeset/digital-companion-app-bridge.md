---
'ultimatedarktowerdigital': minor
---

Add the relay bridge (PRD-05): `BridgeTowerSource` wraps `ManualTowerSource`
and consumes a relay host's decoded command stream, so Restoration Games'
official companion app can drive the tower while UTDD renders it. Skull drops
are reported back for the host to synthesize. Disconnected, every call falls
through to the manual source and UTDD behaves exactly as before. The first
Connect from the deployed build is expected to fail once — Chrome's Local
Network Access permission gates a public origin reaching loopback and aborts
the very request that raises the prompt, so `connect()` retries once, waiting
on the permission rather than guessing a delay.

Backfilled changeset — this shipped without one; only its `relay-shared`/
`relay-client` ESM-sidecar dependency got a changeset at the time.
