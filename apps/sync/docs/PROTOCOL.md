# DarkTowerSync WebSocket Protocol → moved

DarkTowerSync is now **client-only** and consumes the WebSocket protocol from the relay host. The protocol is
owned and documented by **[UltimateDarkTowerRelay](../../UltimateDarkTowerRelay)**:

➡️ **[UltimateDarkTowerRelay/docs/PROTOCOL.md](../../UltimateDarkTowerRelay/docs/PROTOCOL.md)** — the
client↔host message envelope, all message types (incl. `client:action` and `host:resend`), payloads, and the
connection lifecycle.

The protocol types/factories this client uses come from the `ultimatedarktowerrelay-shared` package
(`packages/shared/src/protocol.ts` in the relay).
