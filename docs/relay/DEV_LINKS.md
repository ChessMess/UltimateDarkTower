# Dev `npm link`s — cleanup checklist

Temporary `npm link` symlinks used during development of this repo, so we can unwind them
later. Captured 2026-06-17 on the owner's macOS machine (npm global prefix `/opt/homebrew`).

> **Why these exist:** FR-5.3 added a public `onTowerResponse` hook to the sibling
> `ultimatedarktower` library that the relay's `RealTower` consumes. Until UDT publishes that
> hook and this repo bumps its `ultimatedarktower` dependency, the relay uses the **local** UDT
> build via `npm link`. (See HANDOFF "locked decisions".)

## 1. Active link FROM this work — `ultimatedarktower` (clean up after UDT publishes)

Two symlinks make this work:

| Symlink | Points to |
|---|---|
| `node_modules/ultimatedarktower` (relay root) | `../../UltimateDarkTower` |
| `/opt/homebrew/lib/node_modules/ultimatedarktower` (global) | `~/Documents/GitHub/UltimateDarkTower` |

Created with:
```bash
cd ~/Documents/GitHub/UltimateDarkTower      && npm link            # global link
cd ~/Documents/GitHub/UltimateDarkTowerRelay && npm link ultimatedarktower   # consume it
```

**Clean up** once `ultimatedarktower` is published with the `onTowerResponse` hook **and** this
repo's `packages/{core,client}/package.json` dependency is bumped to that version:
```bash
cd ~/Documents/GitHub/UltimateDarkTowerRelay
npm unlink ultimatedarktower    # remove the relay's link
npm install                     # restore the published ultimatedarktower
cd ~/Documents/GitHub/UltimateDarkTower
npm rm -g ultimatedarktower     # remove the global link (a.k.a. `npm unlink`)
```
Verify after cleanup: `node -p "require.resolve('ultimatedarktower')"` from the relay should
resolve **inside the relay's `node_modules`**, not into `~/Documents/GitHub/UltimateDarkTower`.

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
