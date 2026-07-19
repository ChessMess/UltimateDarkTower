# apps/sync (`@dark-tower-sync/client`) — relay sync client (private)

A relay-consumer client. Consumes `ultimatedarktowerrelay-client` + `ultimatedarktowerrelay-shared`
(plus `ultimatedarktower` + `ultimatedarktowerdisplay`).

This app has its own detailed `docs/` set — prefer those over duplicating here:

- `docs/PROTOCOL.md` — the sync wire protocol.
- `docs/SETUP.md` — local setup.
- `docs/TECHNICAL_SPECIFICATION.md` — full spec.
- `docs/TESTING.md` — test approach.
- `docs/TROUBLESHOOTING.md` — common issues.

Standard Vite app scripts (`dev`/`build`/`preview`/`test`/`typecheck`). Tests are vitest in
`tests/unit/`. For the relay protocol at large, see `docs/relay/` at the repo root.
