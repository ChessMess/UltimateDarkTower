# Contributing to mcp-server-return-to-dark-tower

Thanks for your interest in contributing! This is a hobby project, so keep things fun and low-friction.

## Reporting Issues

Open a [GitHub Issue](../../issues) with:

- Your OS and Node.js version
- Tower firmware version (if applicable)
- Steps to reproduce
- Expected vs. actual behavior
- Any relevant logs (run with `DEBUG=* node dist/index.js` for verbose output)

## Submitting Changes

1. Fork the repo
2. Create a feature branch (`git checkout -b my-feature`)
3. Make your changes
4. Run `npm run lint` and `npm run build` to verify
5. Commit with a descriptive message
6. Open a Pull Request against `main`

## Code Style

- TypeScript with `strict: true`
- ESLint + Prettier enforced (run `npm run lint`)
- Use the existing patterns in `src/tools/` for adding new MCP tools

## BLE Testing

Most functionality requires a physical Return to Dark Tower tower connected via Bluetooth. If you don't have hardware access, focus on non-BLE changes (game content, schemas, documentation) and note in your PR that BLE testing wasn't possible.

## Questions?

Open an issue — happy to help.

## Commit Message Conventions

Use the imperative mood and keep the subject line under 72 characters.
Reference the issue number when applicable.

**Format:** `<type>: <short description> (#<issue>)`

**Types:**
- `feat`: New feature or capability
- `fix`: Bug fix
- `docs`: Documentation only
- `refactor`: Code restructuring without behavior change
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, or tooling

**Examples:**
- `feat: add tower_calibrate MCP tool (#12)`
- `fix: handle BLE disconnect during drum rotation (#8)`
- `docs: expand CONTRIBUTING release process section`
- `chore: add prepack and ci scripts to package.json`

This is a guideline for clarity, not enforced by hooks.

## Release Process

This project follows a manual GitHub Flow release process. Releases are
cut from `main` using a short-lived release branch.

### Steps

1. **Create a release branch from `main`:**
   ```
   git checkout main
   git pull origin main
   git checkout -b release/vX.Y.Z
   ```

2. **Bump the version in `package.json`:**
   Update the `"version"` field to `X.Y.Z`. Follow
   [Semantic Versioning](https://semver.org/):
   - **Patch** (`0.1.x`): Bug fixes, no API changes
   - **Minor** (`0.x.0`): New features, backward-compatible
   - **Major** (`x.0.0`): Breaking changes

3. **Update `CHANGELOG.md`:**
   Move the contents of `[Unreleased]` under a new versioned heading and
   reset `[Unreleased]` to empty:
   ```markdown
   ## [Unreleased]

   ## [X.Y.Z] - YYYY-MM-DD
   ### Added
   - ...
   ### Changed
   - ...
   ### Fixed
   - ...
   ### Removed
   - ...
   ```
   Omit any section (`Added`, `Changed`, etc.) that has no entries.

4. **Run the full CI pipeline locally:**
   ```
   npm run ci
   ```
   This runs `lint`, `type-check`, `test`, and `build` in sequence.
   All steps must pass before proceeding.

5. **Verify the npm publish payload:**
   ```
   npm run publish:check
   ```
   Confirm that only `dist/`, `README.md`, `LICENSE`, and `CHANGELOG.md`
   appear in the packed file list.

6. **Commit and open a Pull Request:**
   ```
   git add package.json CHANGELOG.md
   git commit -m "chore: release vX.Y.Z"
   git push -u origin release/vX.Y.Z
   ```
   Open a PR from `release/vX.Y.Z` → `main`. Set the PR title to
   `Release vX.Y.Z` and paste the changelog entry in the description.

7. **Merge the PR to `main`.**

8. **Tag the release on `main`:**
   ```
   git checkout main
   git pull origin main
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

9. **Publish to npm:**
   ```
   npm publish
   ```
   `prepack` runs `npm run ci` automatically before publishing.
   Confirm you are authenticated (`npm whoami`) before running this.

10. **Create a GitHub Release:**
    - Go to the repository's Releases page and draft a new release
    - Select tag `vX.Y.Z`, set the title to `vX.Y.Z`
    - Paste the `CHANGELOG.md` entry for this version as the release body
    - Publish the release

11. **Delete the release branch:**
    ```
    git push origin --delete release/vX.Y.Z
    git branch -d release/vX.Y.Z
    ```

### Versioning Policy

`0.x.y` versions indicate pre-1.0 development status. Breaking changes
may occur at minor version bumps (`0.x.0`) during this phase. Once the
project reaches `1.0.0`, strict SemVer guarantees apply.
