---
name: releasing
description: Release and publish workspace packages in this monorepo with Changesets — the flow from `pnpm changeset` to the Version Packages PR to npm, what `private: true` does and doesn't change, and how to debug a failed publish (Changesets masks npm's real error with a TypeError), and how to tell a real failure from npm replication lag before acting on it. Use whenever a release, version bump, changeset, `changeset publish`, npm publishing, provenance, `NPM_TOKEN`, or a red Release workflow comes up.
---

# Releasing (Changesets)

`pnpm changeset` to record a change → push to `main` opens/updates a "Version
Packages" PR → merging it bumps versions and publishes changed libraries to npm
with provenance (`.github/workflows/release.yml`). Config in `.changeset/`.

Publication is driven **purely by each package's `private` flag** —
`.changeset/config.json` has an empty `ignore` list. So `private: false` opts a
package in automatically (`apps/mcp-server` and `apps/relay-cli` are the two
apps that do).

**`private: true` packages still get changesets — they just don't publish to
npm.** The empty `ignore` list means `pnpm changeset:version` bumps _every_
workspace package with a pending changeset, private or not, and writes its
`CHANGELOG.md` entry; only the separate `npm publish` step skips `private:
true`. So a `private` app (`apps/digital`, `apps/controller`, `apps/game`, …)
still needs a changeset for its own user-facing changes — that's the only way
its `CHANGELOG.md` records anything beyond dependency-bump ripples. Confirmed
gap: three `apps/digital`-only features (foe threat status per-level, #68;
auto-place starting skulls, #70; the PRD-05 companion-app bridge) shipped with
no changeset and left no trace in its changelog — see
`.changeset/digital-skull-physics-drop.md` and its neighbors for the backfill.

## Before debugging a "failed" publish — confirm it actually failed

**npm replication lags the publish by up to ~5 minutes, and a lagging package is
indistinguishable from a failed one.** Check the run log first; check the
registry second, and give it time.

Measured on 2026-09-10 (run 34495769507, all 9 packages, release finished
15:29:12Z): seven packages were queryable within seconds, then

- `ultimatedarktowerdisplay@2.0.0` → 404 until **15:32:19** (~3 min)
- `ultimatedarktowerrelay-shared@1.0.2` → 404 until **15:34:15** (~5 min)

For those minutes the repo looked exactly like a partial failure — green
workflow, git tags pushed for all nine, two packages missing from npm. Worse, it
was the _same two package families_ as the real July 2026 partial failure, so the
false positive is very convincing.

**The run log is authoritative, not the registry.** Changesets prints an explicit
manifest of what it published:

```
🦋  success packages published successfully:
🦋  ultimatedarktowerdisplay@2.0.0
🦋  ultimatedarktowerrelay-shared@1.0.2
...
🦋  Creating git tags...
```

If a package is in that list and got a `New tag:` line, npm accepted it — wait,
don't act. Only treat it as failed when the log shows an error, or the package is
absent from the success list.

```bash
# what Changesets says it published
gh run view <id> --log | sed -n '/packages published successfully/,/Creating git tags/p'

# then poll, don't single-shot — 404 for a few minutes means nothing
curl -s -o /dev/null -w "%{http_code}\n" https://registry.npmjs.org/<pkg>/<version>
```

⚠ **Never re-run a publish or bump a version off a single 404.** The version is
already taken on npm's side; retrying can burn a version number for nothing.

## A failed publish reports the wrong error — read this before debugging one

**Changesets masks npm's rejection with a TypeError.** When `npm publish` fails,
Changesets' own error classifier crashes on the way to reporting it:

```
🦋  error TypeError: Cannot read properties of undefined (reading 'includes')
    at isAlreadyPublishedError (.../@changesets/cli/dist/changesets-cli.cjs.js:873)
    at internalPublish
```

It reads `error.message.includes(...)` on an error that has no `.message`, so
**npm's actual reason never reaches the log** — not in `--log-failed`, not
anywhere. The TypeError is a red herring; it says nothing about the cause. Seen
first on `mcp-server-return-to-dark-tower@1.0.1` (Jul 2026, run 29450345234).

How to find the real cause, since the log won't tell you:

- **Which workflow failed?** A publish failure is **Release**, not CI. CI going
  green while "the build failed" means look at Release.
- **Rule out packaging:** `pnpm --filter <pkg> build && cd <dir> && npm publish
--dry-run`. If that prints a sane tarball, the package is fine.
- **Rule out a dead token:** check whether _any_ package published recently — a
  successful publish from CI in the last few days means the token is alive.
  **`npm info` succeeding proves nothing** — public reads need no auth at all.
  ```bash
  # note the https:// — without it curl gets a redirect it won't follow, and
  # you get a silent empty result that looks like a broken query
  curl -s "https://registry.npmjs.org/<pkg>" |
    jq -r '.["dist-tags"].latest as $v | "\($v)  \(.time[$v][:10])"'
  ```
- **Rule out provenance:** a version published from this repo with provenance
  working has `dist.attestations` in its registry metadata:
  ```bash
  curl -s "https://registry.npmjs.org/<pkg>" |
    jq '.versions[.["dist-tags"].latest].dist | has("attestations")'
  ```
- **Timing is a tell:** a rejection in ~2s is auth; a slow failure is upload.

If packaging, token liveness, and provenance all check out, it's **write
permission on that specific package name**, and the cause is almost certainly:

**`NPM_TOKEN` is a granular token scoped to "Only select packages"** — and the
new package isn't on the list. Confirmed root cause of the Jul 2026 failure: the
token carried read+write for exactly the 6 `ultimatedarktower*` packages that
existed when it was created. Nothing about the token was broken; it had published
`ultimatedarktowerboard` from CI two days earlier.

**This can fire when a new published package joins the monorepo** — a granular
token is a fixed allow-list that does not learn about new names.

⚠ **It does not always fire, so don't assume it in advance.** On 2026-09-10
`ultimatedarktowerrelay-cli@0.2.0` — a brand-new name, never before on npm
(`Received 404 for npm info "ultimatedarktowerrelay-cli"` in the log) — published
cleanly on the first attempt, in the same run as eight existing packages. So the
current `NPM_TOKEN` is either not package-scoped or was already broadened. Treat
the allow-list as the **first hypothesis when a new package's publish fails**,
not as a blocker to fix pre-emptively. Fix on npmjs.com
(Access Tokens → the CI token → add the package; if the list isn't editable,
regenerate and update the `NPM_TOKEN` repo secret), then
`gh run rerun <id> --failed`. **Add the package to the token _before_ merging the
Version Packages PR** and you skip the whole thing.

Also worth a look if the scope is fine: a package that was only ever published by
hand may still be set to "Require two-factor authentication" under its npm
Publishing access, which blocks automation tokens. CI-published packages need
"two-factor authentication **or** automation tokens". (Not the cause in Jul 2026,
but `mcp-server-return-to-dark-tower` had exactly that history, so it was the
other live suspect.)

Retrying needs no code change: the version bump and consumed changeset are
already on `main`, and a rejected publish uploads nothing, so Changesets picks
the pending version straight back up.

## Provenance is configured per package on npmjs.com, and fails silently

**Symptom:** packages publish fine, the Release run is green, but the npm page
shows no Provenance badge and `dist.attestations` is absent from the registry
metadata. Nothing errors. Nothing appears in the log.

**Cause:** npm Trusted Publisher is a **per-package** setting on npmjs.com naming
an exact repo + workflow file. GitHub's OIDC token claims
`workflow_ref: .github/workflows/release.yml`; npm compares that to the package's
entry. If it does not match — or there is no entry at all — npm cannot mint the
attestation, **silently falls back to the `NPM_TOKEN` auth the workflow also
supplies, and publishes without provenance.**

Audited 2026-09-10. Across 71 published versions exactly one package had ever
produced an attestation:

```
ultimatedarktowerboard    8 versions,  7 attested  (0.3.0 onward)
ultimatedarktower        21 versions,  0  — never
ultimatedarktowerdisplay 15 versions,  0  — never
…every other package      0  — never
```

Checking all nine packages found **two different faults**, and the second was the
common one:

- **No entry at all** — six packages: game-data, relay-{client,core,shared},
  mcp-server, relay-cli. Never configured.
- **Stale entry** — two packages: `ultimatedarktower` named `publish.yml`
  (a workflow deleted on 2026-07-11), and `ultimatedarktowerdisplay` named
  `ChessMess/UltimateDarkTowerDisplay`, the archived pre-consolidation repo.

`ultimatedarktowerboard` was the only correct one, configured 2026-07-12 — the
day after the rename — which is why it alone produced provenance.

⚠ **Nothing in the repo can tell you this is wrong.** `repository` fields,
`publishConfig`, `prepack` hooks and `NPM_CONFIG_PROVENANCE` were all identical
across all nine. Diagnose from the registry, not the repo:

```bash
# who has attestations, across all history
curl -s "https://registry.npmjs.org/<pkg>" |
  jq '[.versions[] | select(.dist.attestations)] | length'

# decode a working one — it names the producing workflow
curl -s "https://registry.npmjs.org/-/npm/v1/attestations/<pkg>@<version>" |
  jq -r '.attestations[] | select(.predicateType|test("slsa")) | .bundle.dsseEnvelope.payload' |
  base64 -d | jq '.predicate.buildDefinition.externalParameters.workflow'
```

**Fix:** on `https://www.npmjs.com/package/<name>/access` → Trusted Publisher.
Entries are **immutable** — npm says "Cannot be changed… delete it and create a
new one" — so a wrong one must be deleted and re-added. Values that work here:

| Field                | Value                 |
| -------------------- | --------------------- |
| Publisher            | GitHub Actions        |
| Organization or user | `ChessMess`           |
| Repository           | `UltimateDarkTower`   |
| Workflow filename    | `release.yml`         |
| Environment name     | **blank**             |
| Allowed actions      | ☑ Allow `npm publish` |

Environment must be blank because `release.yml` declares no `environment:` key;
filling it in breaks the claim match, silently. npm permits **multiple entries
per package**, so a correct one can be added alongside a stale one without
deleting anything — useful, because every write is gated behind a 2FA
security-key tap.

Nothing backfills: existing versions stay unattested, and each package picks up
provenance on its next release. Verify with

```bash
curl -s https://registry.npmjs.org/<pkg> |
  jq '.versions[.["dist-tags"].latest].dist | has("attestations")'
```

⚠ **Re-check this whenever the publishing workflow is renamed, or a new package
joins the monorepo** — both leave npm-side config stale or absent, and neither
will ever fail a build to tell you.
