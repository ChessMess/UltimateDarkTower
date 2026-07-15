---
'mcp-server-return-to-dark-tower': patch
---

Ship the game-content resources, and report the real version.

All 8 game-knowledge resources (`tower://game/rules`, `/heroes`, `/lore`, …)
served the literal string `[File not found: game-content/rules.md]` in v1.0.0.
`loadAsset()` resolves against `dist/`, but the build was a bare `tsc`, which
doesn't emit `.md` — so the published tarball contained no game content at all.
The build now copies the assets, and a missing one throws instead of silently
degrading to placeholder text.

The server also reported version `0.1.0` over MCP from a hardcoded constant
while shipping as `1.0.0`; it now reads from `package.json`.
