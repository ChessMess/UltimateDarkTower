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

## How to re-check the link state
```bash
# linked (symlinked) packages in the relay's node_modules
find node_modules -maxdepth 2 -type l | sed '/\.bin/d'
# global links
ls -l "$(npm prefix -g)/lib/node_modules" | grep '^l'
```
