---
'ultimatedarktowerrelay-cli': minor
---

Publish the relay CLI to npm so players can run it with `npx ultimatedarktowerrelay-cli` — no
clone, no `pnpm install`, no build step. The BLE native modules already ship N-API prebuilds for
Windows/macOS/Linux, so there is nothing to compile.

- `private: false` with two `bin` entries (one matching the package name, so `npx` resolves it
  unambiguously) and a `files` allow-list, plus a `LICENSE`.
- New `RELAY_LOG_DIR` env var. The log directory is cwd-relative, which under `npx` means the
  folder the user ran the command from rather than the package directory.
- Startup now prints the hosted UTDD URL and the relay address to paste into its "Official app"
  panel, so the next step doesn't require finding a doc.
- `sourceMap`/`declarationMap` off: `files` ships `dist` but not `src`, so the maps would have
  pointed at sources absent from the tarball.
