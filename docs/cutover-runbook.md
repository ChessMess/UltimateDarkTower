# Monorepo Cutover Runbook

The step-by-step for finishing the migration. Everything up to this point lives
on the **unpushed** local branch `monorepo-migration` (a clone of
`ChessMess/UltimateDarkTower`). These steps are **irreversible and
outward-facing** — run them deliberately, in order, verifying each gate before
moving on.

Full-fidelity mirror backups of all 8 original repos are in
`~/Documents/GitHub/_migration/backups/*.git` — the permanent safety net.

Derived from the approved plan
(`the-ultimate-dark-tower-distributed-penguin.md`), Phases 4/5/7.

---

## ⛔ The one hard rule

**The branch must land on `main` as a merge commit or a fast-forward push —
NEVER a squash merge.** Squashing flattens all 8 repos' imported history into a
single commit and destroys the whole point of the history-preserving migration.

---

## 0. Pre-flight (read-only — safe to run now)

```bash
cd ~/Documents/GitHub/_migration/monorepo

# Confirm merge-commit is allowed and, ideally, squash is disabled on the repo.
gh api repos/ChessMess/UltimateDarkTower \
  --jq '{merge: .allow_merge_commit, squash: .allow_squash_merge, rebase: .allow_rebase_merge}'

# Confirm branch/tree state.
git status -sb                 # clean tree, branch monorepo-migration
git rev-list --count HEAD      # commit count (expected ~514)
git tag -l | wc -l             # 30 tags (15 original home + 15 imported, prefixed)

# Baseline to preserve: the 4 published GitHub Releases must survive the merge.
gh release list --repo ChessMess/UltimateDarkTower
```

Optionally disable squash so nobody can pick it by accident:

```bash
gh api -X PATCH repos/ChessMess/UltimateDarkTower -F allow_squash_merge=false
```

---

## 1. Land the branch on `main`

Two acceptable methods — pick one. Main has only gained additive commits (the
branch is main + the import merge commits), so both preserve full history.

**A. Fast-forward push (simplest, no PR):**

```bash
git push origin monorepo-migration                 # publish the branch
git push origin monorepo-migration:main            # fast-forward main to it
git push origin --tags                             # push the 15 new prefixed tags
```

**B. Pull request (keeps a review trail):**

```bash
git push origin monorepo-migration
gh pr create --repo ChessMess/UltimateDarkTower --base main \
  --head monorepo-migration --title "Monorepo consolidation" --fill
# Merge in the UI or CLI with a MERGE COMMIT — never squash:
gh pr merge monorepo-migration --repo ChessMess/UltimateDarkTower --merge
git push origin --tags
```

### Verify (gates the rest)

```bash
gh release list --repo ChessMess/UltimateDarkTower   # still the 4 Releases
git ls-remote --tags origin | wc -l                  # 30 tags now on origin
# History intact: a deep file's log reaches its pre-merge commits.
git log --oneline --follow packages/display/src/index.ts | tail -3
```

---

## 2. Pages cutover

The repo currently serves Pages in legacy branch mode from `main`'s root. Flip it
to the Actions workflow (`deploy-pages.yml`), which assembles all 8 demos under
`/UltimateDarkTower/<sub>/`.

```bash
# Flip Pages to workflow mode.
gh api -X PUT repos/ChessMess/UltimateDarkTower/pages -f build_type=workflow

# The push to main already triggers deploy-pages.yml. To (re)run manually:
gh workflow run deploy-pages.yml --repo ChessMess/UltimateDarkTower
gh run watch --repo ChessMess/UltimateDarkTower
```

### Verify

- Landing page: <https://chessmess.github.io/UltimateDarkTower/>
- Each demo: `/controller/ /game/ /display/ /board/ /creator/ /player/ /digital/ /seed/ /sync/`
- **Legacy deep-link redirect still works:**
  <https://chessmess.github.io/UltimateDarkTower/dist/examples/controller/TowerController.html>
  (meta-refresh stub → `/controller/`).

> Near-zero-downtime variant: run `deploy-pages.yml` via `workflow_dispatch` from
> the branch *before* step 1, so the site is already built when `main` updates.

---

## 3. Publishing (separate, deliberate — do only when ready)

`release.yml` runs Changesets on every push to main: opens a "Version Packages"
PR when changesets exist; otherwise publishes any unpublished versions.

**Status (2026-07-12):** all 6 libraries are published and the Release workflow
is a **green no-op**. `ultimatedarktowerboard@0.3.0` was published via **OIDC
Trusted Publishing** (configured on npmjs.com for board). To release a NEW
version:

```bash
pnpm changeset            # pick packages + bump levels; writes .changeset/*.md
git add .changeset && git commit -m "chore: changeset for <release>" && git push
```

Changesets opens a "Version Packages" PR; merging it bumps versions and triggers
`release.yml` to publish with provenance.

### ⚠️ Known wrinkle: OIDC Trusted Publishing vs Changesets detection

npm's OIDC publishing needs **npm ≥ 11.5.1**, but under GitHub's OIDC environment
**npm 11's `npm info` reads come back empty** — so `changeset publish`'s
"already published?" check thinks *every* package is unpublished and re-attempts
the already-published ones (they fail on `prepack` lint / E404), turning the run
red even though the intended package publishes. (npm 11 works fine locally
without OIDC; detection works in CI on npm 10.)

**Resolution (wired 2026-07-12):** `release.yml` uses **token auth** —
`NPM_TOKEN` / `NODE_AUTH_TOKEN` on the changesets step — instead of OIDC. Token
auth makes both `npm info` reads and `npm publish` work on any npm version (no
OIDC detection issue), and provenance still emits (`id-token: write` is granted).
It stays a green no-op until the secret exists. **To activate for future
releases, add the secret (one-time):**

1. On **npmjs.com** → *Access Tokens* → **Generate New Token → Granular Access
   Token**. Give it **Read and write** permission for the 6 published packages
   (`ultimatedarktower`, `ultimatedarktowerdisplay`, `ultimatedarktowerboard`,
   `ultimatedarktowerrelay-{shared,core,client}`). (A classic **Automation**
   token also works and bypasses 2FA.)
2. Add it as a repo secret named exactly `NPM_TOKEN`:
   ```bash
   gh secret set NPM_TOKEN --repo ChessMess/UltimateDarkTower   # paste the token when prompted
   ```
   (or GitHub UI → Settings → Secrets and variables → Actions → New secret).

After that, a normal `pnpm changeset` → merge "Version Packages" PR publishes the
bumped packages via token auth. (OIDC Trusted Publishing you set up for board
stays configured but unused — harmless.)

> Note: some packages run their full CI in a `prepack`/`prepublishOnly` hook
> (e.g. core's `prepack` = `npm run ci`, which includes `eslint`). If ESLint debt
> (follow-ups #3/#4) isn't cleared, publishing a **new version of core** could
> fail at that hook — worth resolving before core's next release.

Provenance validates `repository.url` against the publishing repo — already set,
with `repository.directory` per package. The 6 published names:
`ultimatedarktower`, `ultimatedarktowerdisplay`, `ultimatedarktowerboard`,
`ultimatedarktowerrelay-{shared,core,client}` (apps `seed`/`sync` are `private`).

---

## 4. Decommission the old repos (only after 1–3 verify)

For each of **Display, Board, Creator, Relay, Seed, Sync**:

1. Final README pointer commit: "Moved to `ChessMess/UltimateDarkTower` →
   `packages/<x>` (or `apps/<x>`); tags prefixed `<x>-*`."
2. Deploy a redirect stub via the repo's existing Pages mechanism:
   `index.html` meta-refresh + `404.html` `location.replace(...)` for deep links
   (archived repos keep serving Pages).
3. Archive:
   ```bash
   gh repo archive ChessMess/UltimateDarkTower<Name> -y
   ```

**Digital** never had users — just archive or delete the private backup repo
created for the migration.

Keep the local checkouts ~30 days, then delete; the mirrors in
`_migration/backups/` are the permanent record.

---

## Rollback

- **Before step 1:** delete the branch — nothing outward has happened.
- **After merge, before decommission:** `main` only gained additive history; the
  old repos are untouched and can keep serving. Point of no return is **step 4
  (archiving)**, which is gated on steps 1–3 verifying.
- **Catastrophe:** restore any repo from `_migration/backups/<repo>.git`.
