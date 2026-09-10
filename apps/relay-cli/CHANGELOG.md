# ultimatedarktowerrelay-cli

## 0.2.0

### Minor Changes

- ef405dc: Add `s` and `d` keyboard shortcuts to the relay CLI's live dashboard: `s` starts/stops BLE
  advertising on the active tower source, `d` disconnects the currently-connected companion app
  (and immediately resumes advertising for a reconnect). Both are no-ops-safe manual controls for
  states that previously only changed automatically at startup/shutdown.
- 980cdc1: Add a live status board (built on [Ink](https://github.com/vadimdemedes/ink)) to the relay CLI,
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

- 2e7421e: Publish the relay CLI to npm so players can run it with `npx ultimatedarktowerrelay-cli` — no
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

### Patch Changes

- Updated dependencies [bdaa339]
  - ultimatedarktowerrelay-shared@1.0.2
  - ultimatedarktowerrelay-client@1.0.3
  - ultimatedarktower@7.1.2
  - ultimatedarktowerrelay-core@1.1.3

## 0.1.2

### Patch Changes

- Updated dependencies [cdf7f37]
- Updated dependencies [cdf7f37]
  - ultimatedarktower@7.0.0
  - ultimatedarktowerrelay-shared@1.0.0
  - ultimatedarktowerrelay-client@1.0.0
  - ultimatedarktowerrelay-core@1.0.0

## 0.1.1

### Patch Changes

- Updated dependencies [6a89e0e]
- Updated dependencies [6a89e0e]
- Updated dependencies [62da52b]
  - ultimatedarktower@6.0.0
  - ultimatedarktowerrelay-core@0.3.0
  - ultimatedarktowerrelay-client@0.2.1
