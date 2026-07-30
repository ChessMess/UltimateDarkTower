---
'ultimatedarktowerrelay-cli': minor
---

Add a live status board (built on [Ink](https://github.com/vadimdemedes/ink)) to the relay CLI,
replacing the six print-and-go-silent startup lines with a live view of the relay URL (including
your LAN address, so a phone can connect), tower/BLE state, decoded drum/LED/audio state,
connected clients, and an activity feed. Keys: `q` quit, `r` resend the last command, `l` toggle
JSONL logging.

- **This package is now ESM** (`"type": "module"`) — Ink is ESM-only. Nothing in this monorepo
  imports `ultimatedarktowerrelay-cli`, so this is not a breaking change for any workspace
  consumer, but it is worth knowing if you depend on it externally as a library rather than via
  its `bin` entries.
- The board only mounts when both stdout and stdin are a real terminal; set `RELAY_DASHBOARD=0`
  to force the previous plain-line output. Piped, Docker, and systemd usage is unaffected — it
  already falls outside that check and gets the same output as before.
