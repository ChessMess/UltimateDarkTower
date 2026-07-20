# apps/mcp-server (`mcp-server-return-to-dark-tower`) — MCP server

An MCP server that lets AI assistants control the physical tower via `ultimatedarktower`.
**The only app that publishes to npm** (`private: false`) — `npx` is how an MCP server is
consumed.

## Build copies game-content by hand

`build` = `tsc && rm -rf dist/game-content && cp -R src/game-content dist/game-content`. The
`src/game-content/` markdown (rules/heroes/adversaries/lore/… reference the server serves) is
**not** TypeScript, so tsc won't emit it — the copy step is load-bearing. Don't drop it.

## Publishing

Because it's `private: false`, Changesets publishes it automatically (the config `ignore` list
is empty). **`changeset publish` runs `prepack`** — an app that publishes must not keep
`prepack`/`prepublishOnly` scripts that call devDeps the monorepo strips. The failure-mode
playbook (masked TypeError, NPM_TOKEN package allow-list, 2FA) lives in the **root CLAUDE.md
"Releasing (Changesets)" section** — this package is where that scenario first fired
(`@1.0.1`, Jul 2026); don't duplicate it here.

## Conventions

- Zod-validates all hardware inputs (sides, levels, sound indices, effects).
- One singleton `UltimateDarkTower` instance per process, reused across commands.
- Tests are vitest (colocated under `src/`). Depends on `ultimatedarktower` +
  `ultimatedarktowerdata` (`workspace:^`).
