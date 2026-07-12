# Contributing to UltimateDarkTowerDisplay

Thank you for your interest in contributing! This document covers the development workflow, code standards, and release process.

## Getting started

```bash
# Clone the repository
git clone https://github.com/ChessMess/UltimateDarkTowerDisplay.git
cd UltimateDarkTowerDisplay

# Install dependencies
npm install

# Verify everything works
npm run ci
```

### Runtime compatibility

- Current supported runtime floor is Node.js 18+ (`engines.node >=18.0.0`).
- When changing dependencies, run the full CI pipeline locally before opening a PR.

---

## Development workflow

1. **Create a branch** from `main` for your changes
2. **Make your changes** following the code standards below
3. **Run the full CI pipeline** to verify: `npm run ci`
4. **Open a Pull Request** into `main`

### Useful commands

| Command                 | Description                                        |
| ----------------------- | -------------------------------------------------- |
| `npm test`              | Run test suite                                     |
| `npm run test:watch`    | Run tests in watch mode                            |
| `npm run test:coverage` | Run tests with coverage report                     |
| `npm run lint`          | Check code with ESLint                             |
| `npm run lint:fix`      | Auto-fix lint issues                               |
| `npm run format`        | Format code with Prettier                          |
| `npm run typecheck`     | TypeScript type checking                           |
| `npm run build`         | Full library build (Vite + type generation)        |
| `npm run build:example` | Build the example page for deployment              |
| `npm run dev`           | Vite dev server                                    |
| `npm run dev:example`   | Dev server with example page                       |
| `npm run clean`         | Remove dist/ directories                           |
| `npm run ci`            | Full CI pipeline (typecheck + lint + test + build) |

---

## Code standards

### TypeScript

- `strict: true` is enabled — no implicit `any`, strict null checks.
- Use explicit return types for public methods and exported functions.
- Export types for all public API surfaces.
- Add JSDoc comments for public classes and methods.

### Style

- **ESLint** for code quality — run `npm run lint`
- **Prettier** for formatting — run `npm run format`
- Single quotes, trailing commas (ES5), 100-character print width, 2-space indent.
- One class per file with a descriptive filename matching the class name.

### Testing

- Tests live in `tests/unit/` mirroring the source structure.
- Use [Jest](https://jestjs.io/) as the test framework with `ts-jest` for TypeScript.
- Tests run in a `jsdom` environment for DOM API access.
- Run `npm run test:coverage` and aim for high coverage on new code.

---

## Release process

This project follows [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow) with tagged releases.

### Steps

1. **Create a release branch** from `main`:

   ```bash
   git checkout -b release/vX.Y.Z
   ```

2. **Update version** in `package.json`.

3. **Update `CHANGELOG.md`** — move the `[Unreleased]` items into a new `[X.Y.Z] - YYYY-MM-DD` section.

4. **Run the full CI pipeline**:

   ```bash
   npm run ci
   ```

5. **Open a Pull Request** from the release branch into `main`.

6. **After merge, tag the release**:

   ```bash
   git checkout main && git pull
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

7. **Create a GitHub Release** from the tag with the changelog content as release notes.

8. **Publish to npm manually**:

   ```bash
   npm publish --otp=XXXXXX
   ```

   `prepublishOnly` runs the full `npm run ci` pipeline (typecheck, lint, test, build)
   automatically before packing, so `npm publish` always ships a freshly-verified build.
   The `--otp` flag is required if your npm account has 2FA-on-publish enabled.

9. **Delete the release branch**:
   ```bash
   git push origin --delete release/vX.Y.Z
   ```

### Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **Major** (X.0.0) — Breaking changes to the public API
- **Minor** (0.X.0) — New features, backwards-compatible
- **Patch** (0.0.X) — Bug fixes, backwards-compatible

> The project is currently at `0.4.0` — pre-release. The public API is not yet stable.

---

## Questions?

Open an [issue](https://github.com/ChessMess/UltimateDarkTowerDisplay/issues) or join us on the [Discord Server](https://discord.com/channels/722465956265197618/1167555008376610945/1167842435766952158)!
