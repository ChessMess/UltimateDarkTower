---
'ultimatedarktowercodex': patch
---

Fix the blank page in production: dedupe `react`/`react-dom` in the Vite config.

`@udtc/theme` is source-only and declares `react` as a **peer**, so pnpm gives it
its own copy under `packages/creator-theme/node_modules/react` while the app
resolves the workspace root copy. Without `resolve.dedupe` both were bundled,
and `useTheme`'s `useSyncExternalStore` ran against the copy whose dispatcher
was never set — the app threw
`Cannot read properties of null (reading 'useSyncExternalStore')` on mount and
rendered nothing.

Every other React app here already sets this (`creator`, `player`, `digital`);
the codex was the only one that didn't.

Also adds `src/App.test.tsx`, which mounts the real `<App/>` through the real
theme store and asserts registry content reaches the DOM. The existing suite
checked the data and the data was fine, so a blank page passed every test. The
new suite fails with all five cases when `dedupe` is removed, so it guards the
actual regression rather than restating it. Test environment moves to `jsdom`
for it.
