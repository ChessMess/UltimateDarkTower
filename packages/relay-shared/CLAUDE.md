# packages/relay-shared (`ultimatedarktowerrelay-shared`) — relay wire contract

The relay wire contract only — message types, envelopes, and factories. Consumed by every
other relay package; you usually don't depend on it directly (`relay-core`/`relay-client`
re-export what's needed). Central relay docs: `docs/relay/` (repo root).

## Conventions

- **Construct messages via the `make*Message(...)` factories** (`src/protocol.ts`), not
  object literals — every `MessageType` has a paired factory (`makeTowerCommandMessage`,
  `makeSyncStateMessage`, …) and all consumers are expected to use them.
- **`PROTOCOL_VERSION` (`src/version.ts`) is the wire version** (currently `0.2.0`, with an
  inline changelog). Bump it alongside the package version on any breaking wire change.
- **Intentionally has no `ultimatedarktower` dependency** (asserted in comments in
  `relayEvents.ts`/`logging.ts`) — it must stay BLE-free so browser-only consumers can
  import it. Don't add one.
- `src/relayEvents.ts`'s `RelayEvent` union is the host-side semantic event log — separate
  from the wire protocol; don't conflate the two.

## Stale-doc warning

`docs/relay/ARCHITECTURE.md` and `PROTOCOL.md` use pre-monorepo paths (`packages/shared`,
`packages/cli`, …). The real paths are `packages/relay-shared`, `packages/relay-core`,
`packages/relay-client`, `apps/relay-cli`, `apps/relay-electron`. (One exception: a
`PROTOCOL.md` link to `packages/core/docs/TOWER_TECH_NOTES.md` is correct — that's the main
UDT `packages/core`, unrelated to `relay-core`.)

## Build

`build` = `tsc --build`. **No tests** — it's pure types/constants. `test` is
`vitest run --passWithNoTests` (not a genuine suite) purely so a future test file here
is actually picked up by `pnpm -r test` instead of needing someone to remember to add
the script when they add the first test.
