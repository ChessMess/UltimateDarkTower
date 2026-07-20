---
'mcp-server-return-to-dark-tower': patch
---

Fix the streamable-HTTP transport leak, harden `--port`, add a DI seam, and stop over-promising in game-content resource descriptions.

- **HTTP transport leak:** `POST /mcp` now reuses the transport for an established session and only builds a new one for an initialize handshake (registered via `onsessioninitialized`). Previously every POST constructed a fresh transport and called `server.connect()`, leaking one per request.
- **`--port` validation:** an invalid or missing `--port` value now prints a clear error and exits instead of passing `NaN` to `app.listen` and crashing with `ERR_SOCKET_BAD_PORT`.
- **Injection seam:** `TowerController.getInstance()` accepts an optional config whose `towerConfig` is forwarded to the `UltimateDarkTower` constructor, so an embedder/test can inject a BLE adapter (e.g. `MockBluetoothAdapter`) instead of relying on `TOWER_PLATFORM`. Behavior is unchanged when omitted. The rolling diagnostics log buffer is now readable via `getBuffer()`/`getBufferSize()`.
- **Resource descriptions:** the `game-adversaries`, `game-quests`, `game-items`, `game-heroes`, and `game-lore` resource descriptions now signal that their content is a summary/work-in-progress, matching the placeholder markdown they serve.
