# packages/creator-card-render (`@udtc/card-render`) — card renderer

Renders Creator cards. Part of the private `@udtc/*` subsystem.

## The one rule that matters

**Headless-safe: import this from apps ONLY, never from `@udtc/engine`** (stated in
`src/types.ts`). It renders only already-resolved data — `artUrl` must already be a resolved
data/http URL; **this package never touches the scenario document or resolves keys.**

- `react` is a `peerDependency`, not a direct dep.
- Fixed authoring canvas: `CARD_W = 750`, `CARD_H = 1050` (5:7 poker ratio), scaled via
  transform.
- Zero `workspace:*` deps — a pure leaf, consumed only by `apps/creator` and `apps/player`.

## Build & test

`build` is a no-op; `typecheck` = `tsc --noEmit`. **No `test` script** (untested). Note this
`.tsx` package is outside the eslint config's React-surface glob, so `react-hooks`/
`react-refresh` rules don't apply here — harmless today (no hooks), but relevant if that changes.
