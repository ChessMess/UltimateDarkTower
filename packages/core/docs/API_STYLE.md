# API documentation standard

The shared contract every UDT-family API reference follows (`ultimatedarktower`,
`ultimatedarktowerdisplay`, `ultimatedarktowerboard`). The goal is **consistency**: a developer moving
between the three packages should meet the same page layout, the same per-symbol shape, and the same
navigation. This file is copied into each repo (the repos have no shared docs tooling, the same way
`GETTING_STARTED` / `ARCHITECTURE` / `TROUBLESHOOTING` are duplicated).

These are hand-authored, curated docs — **not** generated from TypeScript. The point is the prose a
generator can't write: _what a symbol is for_ and _when to use it vs. the alternative_. Signatures are kept
in sync with the source by review (see the checklist), not by extraction.

---

## Page skeleton

Every reference page (a single `API.md`, or each topic page in a modular `docs/api/`) opens with:

1. `# API reference` and a breadcrumb line: `*Docs: [Index](README.md) > <audience> > API*`.
2. **Before reading:** links to `GETTING_STARTED.md` and the architecture/renderers overview — the
   reference is for lookup, the guide is for learning.
3. A one-line **Changelog** pointer (`../CHANGELOG.md`) — so readers can find what changed and when.
4. An **Exports** block: a single copy-paste `import { … } from '<pkg>'` (plus `import type { … }`), one
   per entry point (e.g. Board's `.` and `./plugin`).
5. The body, grouped by entry point, then by responsibility.
6. A **See also** footer linking sibling docs.

## Per-symbol entry shape

The unit of consistency. Model: Display `docs/API.md` § `TowerRenderView`.

````md
### `symbolName`

1–3 sentences: what it is, and when to use it vs. the alternative. `**Since:** v0.2` /
`**Deprecated:** use `X` instead` lines go here when they apply.

```ts
// minimal runnable snippet: real import paths + the primary call
```

#### Constructor / Signature

`new Foo(opts: FooOptions)` — or — `fn(args): ReturnType`

| Parameter | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `opts.x`  | `…`  | `…`     | …           |

#### Methods (classes only)

- `method(args)` — one-line purpose
````

## Rules

- **Every public symbol gets at least a one-line description.** No bare names.
- Classes/functions that take options get a **runnable example + a parameter table**; trivial type
  aliases can be a single line; closely-related types may share one entry.
- **Examples must be copy-paste runnable** — real import paths (like Display's `?url` asset import), not
  pseudocode. Reuse snippets that already live in `GETTING_STARTED.md` / `RENDERERS.md` / `EXAMPLE.md`
  rather than inventing parallel ones, and cross-link back.
- **Stability & deprecation:** mark non-obvious lifecycle inline — `**Since:** vX.Y`,
  `**Deprecated:** … use `Y` instead` — and keep the dated detail in the changelog.
- **Re-exports** (symbols owned by another package) go in a compact table — name → one-line purpose →
  "re-exported from `<pkg>`" — not full sections; they're documented upstream.
- **Source of truth** for signatures is `src/index.ts` / the entry `.d.ts`. The doc is checked against it,
  not generated from it.

## Size rule

- **Single-file `API.md`** while the surface fits comfortably on one page (Board, Display).
- **Modular `docs/api/<topic>.md` + a roster table** once the surface is large (core `ultimatedarktower`).
  The split is an intentional choice for large surfaces, not an inconsistency — keep the same page skeleton
  and per-symbol shape on each topic page.

## Checklist (when you add or change an export)

- [ ] Symbol appears in the reference with a description (and example + param table if it takes options).
- [ ] Example imports resolve and typecheck against the current public surface.
- [ ] `**Since:**` / `**Deprecated:**` added if the change affects the lifecycle; changelog updated.
- [ ] Coverage holds: every name in `src/index.ts` (+ extra entry points) has an entry.
