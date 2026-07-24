---
'ultimatedarktowerboard': patch
'ultimatedarktowerdisplay': patch
'ultimatedarktower': patch
'ultimatedarktowerrelay-core': patch
'ultimatedarktowerrelay-client': patch
'mcp-server-return-to-dark-tower': patch
---

Stop `pnpm` printing a scary `[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL]` /
`Command failed with signal "SIGINT"`/`"SIGTERM"` / `[ELIFECYCLE]` block when a
dev/watch/preview script (`vite`, `tsc --watch`, `tsx watch`,
`electron-forge start`, …) is stopped normally with Ctrl-C — no behavior
change to the scripts themselves, just a clean exit code on interactive
interrupt. (pnpm delivers SIGINT directly for a top-level `--filter` run, but
SIGTERM when the interrupt is relayed through a nested `pnpm run` alias —
both are now handled.)
