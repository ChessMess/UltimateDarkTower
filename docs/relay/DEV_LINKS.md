# Dev `npm link`s — cleanup checklist

Temporary `npm link` symlinks used during development of this repo, so we can unwind them
later. Captured 2026-06-17 on the owner's macOS machine (npm global prefix `/opt/homebrew`).

> **Why these exist:** FR-5.3 added a public `onTowerResponse` hook to the sibling
> `ultimatedarktower` library that the relay's `RealTower` consumes. Until UDT publishes that
> hook and this repo bumps its `ultimatedarktower` dependency, the relay uses the **local** UDT
> build via `npm link`. (See HANDOFF "locked decisions".)

## 1. ~~Active link FROM this work — `ultimatedarktower`~~ ✅ RESOLVED (2026-06-18)

**Cleaned up.** `ultimatedarktower@4.1.0` (with the public `onTowerResponse` hook) was published to
npm; the relay's `packages/{core,client}/package.json` were bumped `^4.0.1` → `^4.1.0`, both the
relay-root and global `npm link` symlinks were removed, and `npm install` restored the published copy.
`require.resolve('ultimatedarktower')` now resolves inside the relay's own `node_modules` (a real dir,
not a symlink, version 4.1.0), and `npm run ci` is green against the registry copy with no link.

<details><summary>Historical: how the link was created &amp; removed</summary>

Two symlinks made it work while the hook was unpublished:

| Symlink | Pointed to |
|---|---|
| `node_modules/ultimatedarktower` (relay root) | `../../UltimateDarkTower` |
| `/opt/homebrew/lib/node_modules/ultimatedarktower` (global) | `~/Documents/GitHub/UltimateDarkTower` |

```bash
# created:
cd ~/Documents/GitHub/UltimateDarkTower      && npm link
cd ~/Documents/GitHub/UltimateDarkTowerRelay && npm link ultimatedarktower
# removed (after publishing 4.1.0 + bumping the dep):
cd ~/Documents/GitHub/UltimateDarkTowerRelay && npm unlink ultimatedarktower && npm install
cd ~/Documents/GitHub/UltimateDarkTower      && npm rm -g ultimatedarktower
```
</details>

## 2. Pre-existing global link — `ultimatedarktowerdisplay` (NOT from this work)

A global link left over from other UDT-family dev (Sync / Display); the relay does **not**
consume it. Listed here for awareness only — remove if you no longer need it:
```bash
/opt/homebrew/lib/node_modules/ultimatedarktowerdisplay -> ~/Documents/GitHub/UltimateDarkTowerDisplay
# to remove: npm rm -g ultimatedarktowerdisplay
```

## 3. Workspace-internal symlinks — leave alone

`node_modules/ultimatedarktowerrelay-{shared,core,cli,client} -> packages/*` are created by
**npm workspaces**, not by `npm link`. They are normal and should NOT be cleaned up.

## 4. ⏳ Active link TO `UltimateDarkTowerSync` — relay `client` + `shared` (task 4.5, added 2026-06-18)

The Sync migration (task 4.5) makes Sync consume this repo's published-shaped packages. **Until they are
published** (the §11-Q8 "publish at cutover" step), Sync's `packages/client/package.json` depends on them
via **`file:`** — the same pattern Sync already uses for `ultimatedarktower` in its seed-decoder:

| Sync dependency | Points to |
|---|---|
| `ultimatedarktowerrelay-client` | `file:../../../UltimateDarkTowerRelay/packages/client` |
| `ultimatedarktowerrelay-shared` | `file:../../../UltimateDarkTowerRelay/packages/shared` |

**Implications while this is active:**
- The relay must be **checked out as a sibling and built** (`npm run build`) before Sync's
  `npm install` / type-check / `vite build` — the `file:` targets resolve to the relay's `dist/`.
- Sync's **isolated GitHub CI cannot `npm ci`** (the relay sibling isn't present) — expected; Sync CI goes
  green again only after the cutover.

**Cleanup (the cutover — mirrors §1):** publish `ultimatedarktowerrelay-{shared,core,client}` to npm, then
in Sync swap the two `file:` specifiers → versioned ranges (`^0.1.0`) and `npm install`. Mark this section
✅ RESOLVED at that point.

## How to re-check the link state
```bash
# linked (symlinked) packages in the relay's node_modules
find node_modules -maxdepth 2 -type l | sed '/\.bin/d'
# global links
ls -l "$(npm prefix -g)/lib/node_modules" | grep '^l'
```
