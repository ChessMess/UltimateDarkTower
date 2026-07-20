// Guardrail: the `.` and `./stage` entry points must stay three-free.
//
// `packages/board` ships three bundle entries (see vite.config.ts):
//   - `.`       headless core + readout/2D — must NOT import `three`
//   - `./stage` all-in-one render stage — statically three-free; it loads the
//               3D tower via a *dynamic* import() so `three` is pulled in only
//               when 3D is actually used
//   - `./plugin` the Board3DPlugin — the ONE place allowed to import `three`
//
// A stray static `import ... from 'three'` reachable from `.`/`./stage` would
// make `three` a hard runtime dependency of 2D-only consumers and risk a second
// `three` instance (breaks `instanceof`). This script fails the build if that
// happens.
//
// It scans the ESM output only. The ESM build preserves the static-vs-dynamic
// import distinction (`import"x"`/`from"x"` are static; `import("x")` is
// dynamic), which is exactly the invariant we enforce. The CJS build lowers a
// dynamic `import()` to `Promise.resolve().then(()=>require("x"))`, making it
// indistinguishable from a static `require()` by inspection — so CJS is not a
// reliable signal. Both formats come from the same Rollup graph, so verifying
// the ESM closure enforces the invariant for the CJS output too.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));

// Entry points that must be three-free, by their emitted ESM filenames.
const ENTRIES = ['index.esm.js', 'stage.esm.js'];

const isThree = (spec) => spec === 'three' || spec.startsWith('three/');
const isRelative = (spec) => spec.startsWith('./') || spec.startsWith('../');

// Static specifiers only. `from"x"` / `export...from"x"` and bare `import"x"`
// are static; `import("x")` (dynamic) is deliberately NOT matched — the `(`
// after `import` fails both patterns.
function staticSpecifiers(code) {
  const specs = new Set();
  for (const m of code.matchAll(/\bfrom\s*["']([^"']+)["']/g)) specs.add(m[1]);
  for (const m of code.matchAll(/\bimport\s*["']([^"']+)["']/g)) specs.add(m[1]);
  return specs;
}

// Walk the static import closure of an entry, collecting any `three` import.
function scanEntry(entryFile, violations) {
  const start = resolve(distDir, entryFile);
  if (!existsSync(start)) {
    console.warn(`check-three-free: entry not found (build first?): ${entryFile}`);
    return;
  }
  const seen = new Set();
  const queue = [start];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const specs = staticSpecifiers(readFileSync(file, 'utf8'));
    for (const spec of specs) {
      if (isThree(spec)) {
        violations.push({ entry: entryFile, chunk: file, spec });
      } else if (isRelative(spec)) {
        const next = resolve(dirname(file), spec);
        if (existsSync(next)) queue.push(next);
      }
    }
  }
}

const violations = [];
for (const entry of ENTRIES) scanEntry(entry, violations);

if (violations.length > 0) {
  console.error('\n✖ three-free invariant violated: `.`/`./stage` statically import `three`.\n');
  for (const v of violations) {
    console.error(`  - ${v.entry} → ${v.chunk.replace(distDir, 'dist/')} imports "${v.spec}"`);
  }
  console.error(
    '\n`three` (and Display) may only be imported from the `./plugin` entry, or loaded ' +
      'via a dynamic import() (as `./stage` does). See docs/ARCHITECTURE.md.\n',
  );
  process.exit(1);
}

console.log('✓ three-free: `.` and `./stage` entries import no `three`.');
