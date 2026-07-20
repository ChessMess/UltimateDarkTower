# DarkTowerSync WebSocket Protocol → moved

DarkTowerSync is now **client-only** and consumes the WebSocket protocol from the relay host. The protocol is
owned and documented by **[UltimateDarkTowerRelay](../../../docs/relay)**:

➡️ **[UltimateDarkTowerRelay/docs/PROTOCOL.md](../../../docs/relay/PROTOCOL.md)** — the
client↔host message envelope, all message types (incl. `client:action` and `host:resend`), payloads, and the
connection lifecycle.

The protocol types/factories this client uses come from the `ultimatedarktowerrelay-shared` package
(`packages/relay-shared/src/protocol.ts` in the relay).
