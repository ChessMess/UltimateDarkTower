---
name: dependabot-triage
description: >-
  End-to-end triage of Dependabot alerts and dependency-update PRs in this pnpm
  monorepo. Use this WHENEVER the user mentions Dependabot, dependency
  vulnerabilities, security alerts, CVEs/GHSAs on the repo, a push that reported
  "N vulnerabilities", outdated/flagged packages, or wants to review, handle, or
  merge Dependabot PRs — even if they only say "triage those", "the security
  alerts", or "the dependabot PRs are failing". Collapses alerts to root
  packages, separates a vulnerable duplicate from an already-patched copy, traces
  transitive parents, classifies dev/build vs production-runtime reachability,
  picks remediation (direct bump / pnpm overrides / dismiss), and verifies with
  the repo's CI protocol. Encodes this repo's traps (minimumReleaseAge age gate,
  catalog: typescript, build-before-test order, clean-main worktree regression
  attribution, electron-rebuild for tar overrides, transient Actions flakes,
  concurrency cancel-in-progress) and keeps every merge/publish/dismiss behind
  explicit human confirmation.
---

# Dependabot triage

A playbook for turning a pile of Dependabot alerts (or failing dependency PRs)
into a verified, minimal fix — without tripping this monorepo's specific wires.
It structures the investigation and the decisions; it does **not** replace your
judgment or the user's, and it never takes an irreversible action on its own.

## Guardrails — read first

These actions are outward-facing or hard to reverse. **Never do them without
explicit, in-the-moment user confirmation**, even if a broader "go ahead" was
given earlier — approval for one doesn't carry to the next:

- **Merging** any PR (yours or Dependabot's).
- **Publishing** to npm (merging a Changesets "Version Packages" PR triggers a
  real publish via `release.yml`).
- **Dismissing** a Dependabot alert.
- **Force-overriding** a transitive dep across the whole tree.

Everything else — reading alerts, editing manifests on a branch, reinstalling,
running the full CI locally — is fine to do while you investigate. Surface a
recommendation and let the user choose the irreversible step. Use the
`AskUserQuestion` tool for the genuine judgment forks (fix vs dismiss, how
aggressive), one crisp question at a time.

## Step 1 — Gather and collapse

GitHub files one alert per advisory, so the raw count is misleading; a single
outdated package can spawn a dozen alerts. Collapse first:

```bash
scripts/triage-alerts.sh
```

This prints: the open-alert count, alerts collapsed by package (severity, range,
first-patched, scope, manifest), advisory summaries, and — critically — the
versions each flagged package **actually resolves to in `pnpm-lock.yaml`** plus
its transitive parents. Read that last section carefully (see Step 2).

## Step 2 — Classify each root cause

For every flagged package, answer two questions:

1. **Is the flagged copy a vulnerable _duplicate_, or the live version?** If a
   patched copy already resolves in-tree (e.g. `tar@7.5.19`) alongside an old one
   (`tar@6.2.1`), the fix is usually to collapse the old duplicate onto the
   patched one, not a scary upgrade. A vulnerable range like `<= 7.5.15` that
   also covers _all of 6.x_ is the tell that an old major is what's flagged.
2. **What's the reachability?** Production-runtime (shipped in a published
   `dist`, run by consumers) vs dev/build-time (bundlers, test tooling, electron
   packaging, CLI prompts). Dependabot's `scope: runtime` label reflects the
   dep's _own_ manifest, not this project's use — verify with the parents. See
   `references/repo-gotchas.md` §9 for the concrete build-only sources here.

## Step 3 — Choose remediation

| Situation                                                             | Fix                                                                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Vulnerable **direct** dep (in a package.json)                         | Bump its range; prefer aligning to a version already used elsewhere in the repo so the tree de-dupes.              |
| Vulnerable **transitive** dep                                         | Add a `pnpm-workspace.yaml` `overrides:` entry forcing the patched version (ideally one already resolved in-tree). |
| Dev/build-only + **no** non-breaking fix, not reachable in production | Recommend **dismissing** with a written rationale (user confirms).                                                 |

Keep the change minimal and mechanical. Before touching a build-tool major
(e.g. `vite`) or `typescript`, use `references/major-version-upgrades.md` — the
full playbook for either, including the known CJS-build regressions
(`references/repo-gotchas.md` §8) that bit us last time.

## Step 4 — Apply

Branch off `main` (`git checkout -b security/<slug> main`). Edit the manifests /
`pnpm-workspace.yaml` overrides. Then `pnpm install` to regenerate the lockfile,
and confirm every vulnerable copy is gone:

```bash
grep -E "<pkg>@<old-version>|..." pnpm-lock.yaml   # expect no output
pnpm install --frozen-lockfile                     # must be clean — CI uses this
```

If a published package's `package.json` changed, add a Changesets entry
(`.changeset/<slug>.md`, `patch` unless it changes public behavior) per the
repo's release flow.

## Step 5 — Verify (this is where the repo bites)

Mirror CI exactly — build before test, full graph:

```bash
pnpm run ci      # validate:nodes → lint → format:check → build → typecheck → test
```

- If a **cross-package test** fails (esp. `packages/board`), do **not** trust an
  isolated `jest` run — board loads display's _built dist_; a bad order gives
  false failures. See `references/repo-gotchas.md` §3.
- To decide whether _your change_ caused a failure, run the same build-order test
  on a clean-`main` worktree (`references/repo-gotchas.md` §4). Green there + red
  on your branch = you regressed it; fix it before shipping.
- **`tar` overrides:** `pnpm run ci` does **not** exercise the electron toolchain
  (it has no `build` script). Verify explicitly:
  `pnpm --filter ultimatedarktowerrelay-electron rebuild` (§5).

## Step 6 — Ship (each step gated by the guardrails)

1. Commit, push, open the PR (`gh pr create`).
2. Watch checks: `gh pr checks <n> --watch`. Both the `checks` job and the
   `relay-native` matrix must pass. If a job dies at **"Set up job / Service
   Unavailable"**, that's transient infra — `gh run rerun <id> --failed`
   (§6). Confirm real conclusions with `gh run view <id> --json conclusion`, not
   just the watch exit code.
3. **Confirm with the user, then merge.** After merge, verify the post-merge run
   on `main` — remembering a `cancelled` run may just be concurrency (§7); judge
   by the latest run.
4. Dependabot auto-closes resolved alerts on its next scan; spot-check with
   `scripts/triage-alerts.sh` → expect 0.

## Handling Dependabot's own version-update PRs

When the user points at _failing_ Dependabot PRs (not the alerts), triage the red
before touching anything:

- **`minimumReleaseAge` violation** (`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`,
  "published within the cutoff") → the proposed version is too fresh (<~24h).
  Not a breakage. Leave it; re-run after it ages, or `@dependabot rebase`. (§1)
- **Transient "Set up job" infra** → re-run the failed jobs. (§6)
- **A real build/test failure** → the bump genuinely breaks something; recommend
  closing the PR or investigating the incompatibility (don't merge it).

Then, with the user's OK, merge the genuinely-green ones and leave age-gated ones
for later. Remember `typescript` (`catalog:`) and semver-majors are intentionally
ignored in `dependabot.yml` — if Dependabot errors on `typescript`, that's why
(§2), not something to "fix" by bumping it.

## Reference

- `references/repo-gotchas.md` — the full catalog of this repo's traps, each
  with how to recognize it and what to do. Read it whenever the triage
  surprises you.
- `references/major-version-upgrades.md` — the step-by-step playbook for the
  two majors this repo deliberately holds back (`typescript` 6.0, a `vite`
  major), for if either is ever attempted by hand.
