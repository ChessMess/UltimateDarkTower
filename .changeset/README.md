# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

When you change a **published** package (`ultimatedarktower`, `ultimatedarktowerdisplay`,
`ultimatedarktowerboard`, `ultimatedarktowerrelay-{shared,core,client}`), add a changeset:

```bash
pnpm changeset
```

Pick the affected packages, the bump type (patch/minor/major), and write a summary.
Commit the generated `.changeset/*.md` file with your PR.

Versioning is **independent** per package. Apps and internal `@udtc/*` packages are
private (or ignored) and are never versioned or published. Release/publish happens from
CI (`.github/workflows/release.yml`) after this setup lands and npm Trusted Publishing is
configured — see the migration notes.
