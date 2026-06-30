# seed-decoder — standalone setup notes

This tool was extracted from the `UltimateDarkTowerSync` monorepo (it was `packages/seed-decoder`, an
unrelated standalone Vite app for decoding/reverse-engineering *Return to Dark Tower* game seeds). It is
**not** part of the relay/multiplayer architecture and was evicted from Sync's workspace/config on
2026-06-18.

Everything the tool *owns* travels with this folder (its `src/`, `index.html`, `vite.config.ts`,
`package.json`, `SEED_FORMAT.md`, `scripts/analyze_bits.py`, `seed_func.cs`, `output/*.csv`, and the
historical `plan-seedDecoder.md`). What it **inherited from the monorepo root** does *not* travel — this
file records it so the tool can be stood up as its own repo.

## What it does / what it depends on

- A pure browser Vite SPA. Its only runtime dependency is **`ultimatedarktower`** (UDT), from which it
  imports `validateSeed`, `decodeSeed`, `compareSeedsRaw`, `dumpSeedChars`. The seed-format core lives in
  UDT (`src/udtSeedParser.ts`); this app is the editor/analysis UI on top.
- Its own `package.json`: `"type": "module"`, scripts `dev`/`build`/`preview`/`clean` (Vite), devDep
  `vite ^5.4.0`, runtime dep `ultimatedarktower: file:../../../UltimateDarkTower`.

## Inherited monorepo settings to recreate in the new repo

1. **TypeScript config — there was NONE of its own.** seed-decoder had no `tsconfig.json` and was *not*
   part of the monorepo's `tsc` build or `type-check` (only Vite/esbuild compiled it). For a standalone
   repo, add a bundler-style `tsconfig.json` if you want type-checking. Template (from Sync's client):
   ```jsonc
   {
     "compilerOptions": {
       "target": "ESNext", "module": "ESNext", "moduleResolution": "bundler",
       "lib": ["ESNext", "DOM", "DOM.Iterable"],
       "sourceMap": true, "resolveJsonModule": true, "esModuleInterop": true,
       "forceConsistentCasingInFileNames": true, "skipLibCheck": true, "strict": true,
       "noEmit": true, "isolatedModules": true, "useDefineForClassFields": true
     },
     "include": ["src/**/*"], "exclude": ["node_modules", "dist"]
   }
   ```

2. **ESLint** — inherited the root `.eslintrc.js` (legacy, the active one) / `eslint.config.mjs` (flat
   preview). Key bits: `@typescript-eslint` parser+plugin, `extends: eslint:recommended`,
   `env: { browser, es6 }`, rules: `@typescript-eslint/no-unused-vars` (error, `argsIgnorePattern: '^_'`),
   `@typescript-eslint/no-explicit-any` warn, `prefer-const`/`no-var` warn, `no-duplicate-imports` error.
   devDeps: `eslint ^8.57.1`, `@typescript-eslint/{parser,eslint-plugin} ^8.57.1`, `@eslint/js ^8.57.1`,
   `globals ^15`.

3. **Prettier** — inherited root `.prettierrc`:
   ```json
   { "semi": true, "trailingComma": "es5", "singleQuote": true, "printWidth": 100, "tabWidth": 2, "useTabs": false }
   ```
   devDep `prettier ^3.8.1`.

4. **Node** — `engines.node >= 18` (the monorepo used `@types/node ^24`, TS `^5.9.3`).

## Path caveats when moving to a new repo

- **UDT runtime dep** (`package.json`): `file:../../../UltimateDarkTower` was relative to
  `<Sync>/packages/seed-decoder/`. From `_local/seed-decoder/` the same relative path still resolves (same
  depth). In a brand-new repo, repoint it to wherever UDT lives — or, preferably, a **published**
  `ultimatedarktower` version (e.g. `^4.1.0`).
- **`vite.config.ts` hardcodes a UDT CJS entry** at `../../node_modules/ultimatedarktower/dist/src/index.js`
  — that pointed at the *workspace-hoisted* node_modules at the Sync repo root. In a standalone repo (its
  own `node_modules`), change it to `./node_modules/ultimatedarktower/dist/src/index.js` (or use UDT's
  package entry directly). The config also has an esbuild `module` shim + marks `@stoprocent/noble`
  external — keep both (they let the CJS UDT build/optimize cleanly in the browser).
- Dev server runs on port **3002** (`server.port`).

## How it was removed from Sync

Moved `packages/seed-decoder/` → `_local/seed-decoder/` (outside the `packages/*` workspace glob),
gitignored `_local/`, added `_local/` to the ESLint ignore lists, and re-ran `npm install` to drop its
`package-lock.json` workspace entries. No other Sync config referenced it.
