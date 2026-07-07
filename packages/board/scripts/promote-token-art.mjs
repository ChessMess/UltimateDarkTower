// promote-token-art — bridge the Token Art Forge (which edits the DEMO's per-token overrides in
// example/src/tokenArt/*.json) to the board library's BUILT-IN defaults (the OFFICIAL_2D_ICON /
// OFFICIAL_HERO_ART tables in src/renderers/assetPaths.ts that every consumer ships).
//
// The Forge only writes demo overrides; it never touches the library. Run this after adding art in
// the Forge to see exactly which library-table entries to add so the art becomes a default for
// everyone (Player included), plus which asset files to copy into consumers' public/tokens. It is
// READ-ONLY: it prints paste-ready lines and a checklist, it does not edit source (the tables are
// hand-maintained, commented TS — you paste, so nothing fragile rewrites them).
//
// Detection is exact: it compares each override against what the CURRENT library default already
// resolves to (via the compiled resolver in dist/), so already-promoted art is skipped. Build the
// library first (`npm run build`) so dist/ is current. Usage: `npm run promote-token-art`.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ASSET_BASE = './tokens/'; // the base the demo (and this comparison) uses

const distPath = resolve(root, 'dist/index.cjs');
if (!existsSync(distPath)) {
  console.error('dist/ not found — run `npm run build` first so the current library defaults are available.');
  process.exit(1);
}
const { resolveTokenImageFor } = require(distPath);

/** The library's current default image for a token in the 2D view (null = disc / no default). */
const currentDefault = (kind, id) => resolveTokenImageFor({ kind, id }, '2d', { assetBaseUrl: ASSET_BASE });

/** Read a demo override file, tolerating a missing/empty file. */
function readOverrides(kind) {
  const file = resolve(root, `example/src/tokenArt/${kind}_tokens.json`);
  if (!existsSync(file)) return {};
  const text = readFileSync(file, 'utf8').trim();
  return text ? JSON.parse(text) : {};
}

// kind → { table, group, tableName } — where a promoted default lives.
const TARGET = {
  foe: { table: 'OFFICIAL_2D_ICON.foe', group: 'foes', tableName: 'OFFICIAL_2D_ICON' },
  adversary: { table: 'OFFICIAL_2D_ICON.adversary', group: 'foes', tableName: 'OFFICIAL_2D_ICON' },
  hero: { table: 'OFFICIAL_HERO_ART', group: 'heros', tableName: 'OFFICIAL_HERO_ART' },
};

const promotable = []; // { kind, id, filename, group, table }
const threeDOnly = []; // overrides that can't become a 2D-view default
let overrideCount = 0;

for (const kind of Object.keys(TARGET)) {
  const { table, group } = TARGET[kind];
  for (const [id, art] of Object.entries(readOverrides(kind))) {
    if (!art || typeof art !== 'object') continue;
    overrideCount++;
    if (art.image3d || art.model3d) threeDOnly.push({ kind, id });
    if (!art.image2d) continue;
    // Already the library default? (compare the resolved URLs)
    if (currentDefault(kind, id) === art.image2d) continue;
    promotable.push({ kind, id, filename: basename(art.image2d), group, table });
  }
}

console.log('Token-art promotion — demo overrides vs. the board library defaults\n');

if (overrideCount === 0) {
  console.log('No demo overrides found in example/src/tokenArt/{foe,adversary,hero}_tokens.json.');
  console.log('Add art in the Token Art Forge (npm run dev, open /tokens.html), then re-run to promote it.');
  process.exit(0);
}

if (promotable.length === 0) {
  console.log('Nothing to promote — every demo image2d override already matches the library default.');
} else {
  console.log(`Paste these into the tables in src/renderers/assetPaths.ts (${promotable.length} entr${promotable.length === 1 ? 'y' : 'ies'}):\n`);
  // OFFICIAL_2D_ICON is nested by kind; OFFICIAL_HERO_ART is a flat id → filename map.
  const iconRows = promotable.filter((p) => TARGET[p.kind].tableName === 'OFFICIAL_2D_ICON');
  const heroRows = promotable.filter((p) => TARGET[p.kind].tableName === 'OFFICIAL_HERO_ART');
  if (iconRows.length) {
    console.log('  OFFICIAL_2D_ICON:');
    for (const kind of ['foe', 'adversary']) {
      const rows = iconRows.filter((r) => r.kind === kind);
      if (!rows.length) continue;
      console.log(`    ${kind}: {`);
      for (const { id, filename } of rows) console.log(`      '${id}': '${filename}',`);
      console.log('    }');
    }
    console.log('');
  }
  if (heroRows.length) {
    console.log('  OFFICIAL_HERO_ART:');
    for (const { id, filename } of heroRows) console.log(`    '${id}': '${filename}',`);
    console.log('');
  }
  console.log("Asset checklist — copy each file into every consumer's public token folder:");
  for (const { filename, group } of promotable) {
    console.log(`  ${group}/${filename}   (e.g. apps/player/public/assets/tokens/${group}/${filename})`);
  }
  console.log('');
}

if (threeDOnly.length) {
  console.log('Note — these overrides set image3d/model3d, which stay demo-only (the library 3D default');
  console.log('uses the group convention and has no 3D-override table):');
  for (const { kind, id } of threeDOnly) console.log(`  ${kind}/${id}`);
}
