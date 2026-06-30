# Migration follow-ups — onto UltimateDarkTowerRelay (task 4.5)

Open items from migrating DarkTowerSync onto the relay (`UltimateDarkTowerRelay`). Sync is now a
**client-only** product on top of the relay: it consumes `ultimatedarktowerrelay-{client,shared}` and no
longer bundles its own fake-tower / relay / host / electron code.

## 1. ✅ Client build `ultimatedarktowerdisplay` ↔ `three` — RESOLVED

> **Full root-cause analysis + the applied resolution:** [DISPLAY_THREE_BLOCKER.md](DISPLAY_THREE_BLOCKER.md).
> ([DISPLAY_THREE_FIX_PROMPT.md](DISPLAY_THREE_FIX_PROMPT.md) is now **superseded** — the fix was applied
> directly.)

Standardized on **three 0.184** (latest) and removed the lower ranges. `npm run ci` (incl. `build`) is
**green**, verified end-to-end against the fixed Display. Applied changes:

- **`ultimatedarktowerdisplay`** (`0.9.0`): `three` peer `^0.170.0` → **`>=0.184.0`** (kept `optional`) +
  CHANGELOG note. The old `^0.170.0` was the bug — a caret on a `0.x` locks the minor (`>=0.170.0 <0.171.0`),
  so it could never resolve a three with `HDRLoader` (which the bundle imports). **Pending `npm publish`.**
- **DarkTowerSync client** `three` `^0.170.0` → **`^0.184.0`**.
- **`packages/client/vite.config.ts`** — added `build.commonjsOptions.include: [/node_modules/,
  /UltimateDarkTowerRelay/]` to fix a *separate*, previously-masked error: the relay's `file:`-symlinked
  **CJS** packages resolve outside `node_modules`, so Vite couldn't see their named exports
  (`makeCommandLogEntry`). No-op once the relay is published.
**Done (2026-06-19):** `ultimatedarktowerdisplay@0.9.0` published; the client consumes it at `^0.9.0`;
`npm run ci` (incl. `build`) is green against the published copy.

## 2. ✅ Cutover: publish the relay packages, switch Sync off `file:` deps (Slice 5) — DONE (2026-06-29)

`ultimatedarktowerrelay-{shared,core,client}@0.1.0` are published to npm. Sync's
`packages/client/package.json` now consumes them at `^0.1.0` (no more `file:`), and the whole tree
resolves from the registry — verified with a clean `rm -rf node_modules package-lock.json && npm install`
followed by a green `npm ci` and `npm run ci` (the exact CI/deploy path).

Related version alignment done in the same cutover:
- **`ultimatedarktower` `^4.1.0` → `^5.0.0`** — the published relay client depends on UDT `^5.0.0`; staying on
  4.x would have put two UDT majors in the tree. Sync uses no removed/namespaced API, so it was a clean bump.
- **`ultimatedarktowerdisplay` `^0.9.0` → `^0.10.0`** — published `0.9.0` peered UDT `^4.0.0` only, which
  conflicted with the relay's UDT 5. **Display 0.10.0** was released to broaden the peer to
  `^4.0.0 || ^5.0.0` (also three r185); without it a clean `npm ci` could not resolve.
- **`three` `^0.184.0` → `^0.185.0`** to satisfy Display 0.10.0's `three >=0.185.0` peer.

## 3. ⏳ seed-decoder → its own repo

The seed-decoder was extracted out of the workspace to a gitignored `_local/seed-decoder/` (it's
unrelated to the relay/multiplayer architecture). Move it to a dedicated repo when convenient — see
`_local/seed-decoder/STANDALONE_SETUP.md` for the monorepo-inherited settings it needs.

## 4. ℹ️ Electron `postinstall` removed

The root `postinstall` (`cd packages/electron && npx @electron/rebuild`) was removed with the electron
package. It had been crashing on every install (`@electron/rebuild` → yargs ESM error under Node ≥24,
swallowed by `|| true`); that noise is now gone.
