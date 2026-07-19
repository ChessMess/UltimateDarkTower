# packages/creator-theme (`@udtc/theme`) — theme store

Tiny shared theme store for the Creator apps. Part of the private `@udtc/*` subsystem.

## The one gotcha

`useTheme.ts` is a hand-rolled external store (`useSyncExternalStore`) for
`'system'|'light'|'dark'`, persisted to **`localStorage['udtc-theme']`**, and it **applies
the persisted preference synchronously on import** (before React renders) to mirror an inline
`<script>` in each consuming app's `index.html`. **The storage key and behavior must stay in
sync with that inline script** — drift causes a flash-of-wrong-theme on load.

Zero `workspace:*` deps — a pure leaf. `build` is a no-op; `typecheck` = `tsc --noEmit`;
no `test` script.
