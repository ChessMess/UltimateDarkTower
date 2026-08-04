---
name: releasing
description: Release and publish workspace packages in this monorepo with Changesets — the flow from `pnpm changeset` to the Version Packages PR to npm, what `private: true` does and doesn't change, and how to debug a failed publish (Changesets masks npm's real error with a TypeError). Use whenever a release, version bump, changeset, `changeset publish`, npm publishing, provenance, `NPM_TOKEN`, or a red Release workflow comes up.
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

**This fires every time a new published package joins the monorepo** — the token
is a fixed allow-list that does not learn about new names. Fix on npmjs.com
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
