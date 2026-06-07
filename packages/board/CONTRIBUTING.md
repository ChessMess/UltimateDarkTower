# Contributing

Thanks for helping with **UltimateDarkTowerBoard**.

## Local setup

This package develops against its siblings via `file:` links, so check all three out as
siblings:

```
Documents/GitHub/
├─ UltimateDarkTower/          # 4.1.x — build it (npm run build) so dist/ exists
├─ UltimateDarkTowerDisplay/   # 0.9.x — build it (npm run build) so dist/ exists
└─ UltimateDarkTowerBoard/     # this repo
```

```bash
npm install
npm run ci   # typecheck + lint + test + build
```

## Conventions (mirrors `ultimatedarktowerdisplay`)

- TypeScript strict, `moduleResolution: bundler`, ESM-first lib build via Vite (ESM + CJS).
- Jest + ts-jest, jsdom env. The readout is the deterministic snapshot target.
- ESLint (`.eslintrc.cjs`) + Prettier (`.prettierrc`, 100-col, single quotes).
- **Keep `src/index.ts` three-free.** Only `src/plugin/**` may import `three` /
  `ultimatedarktowerdisplay`; CI greps for violations.

## Adding a feature

Drop it into the matching directory (`state/`, `renderers/`, `view/`, `ui/`, `plugin/`),
add tests under `__tests__/`, and update the relevant `docs/` page + the CHANGELOG
`[Unreleased]` section.
