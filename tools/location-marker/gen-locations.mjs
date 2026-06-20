#!/usr/bin/env node
/**
 * Regenerate `locations.json` from the library's source of truth
 * (`src/data/board/udtGameBoard.ts` → `BOARD_LOCATIONS`).
 *
 * The location-marker tool embeds an inline copy of this list so it runs as a
 * single self-contained `index.html`. When the board data changes upstream,
 * run this script and paste the printed `EMBEDDED_LOCATIONS` block back into
 * `index.html` (it also writes `locations.json` for file-picker override).
 *
 *   node tools/location-marker/gen-locations.mjs
 *
 * Pure source parsing — no build step, no dependencies.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const srcPath = resolve(here, '../../src/data/board/udtGameBoard.ts');
const src = readFileSync(srcPath, 'utf8');

// --- Resolve the BOARD_GROUPINGS enum (KEY: 'Value') so we can dereference
//     `BOARD_GROUPINGS.KEY` back to its string. ---
const groupings = {};
const groupBlock = src.match(/BOARD_GROUPINGS\s*=\s*\{([\s\S]*?)\}\s*as const/);
if (groupBlock) {
  for (const m of groupBlock[1].matchAll(/(\w+)\s*:\s*(['"])(.*?)\2/g)) {
    groupings[m[1]] = m[3];
  }
}

// --- Slice out the BOARD_LOCATIONS array literal. ---
const arrStart = src.indexOf('BOARD_LOCATIONS');
const open = src.indexOf('[', arrStart);
const close = src.indexOf('];', open);
if (arrStart < 0 || open < 0 || close < 0) {
  throw new Error('Could not locate BOARD_LOCATIONS array in ' + srcPath);
}
const body = src.slice(open + 1, close);

const field = (line, key) => {
  const m = line.match(new RegExp(`${key}\\s*:\\s*(['"])(.*?)\\1`));
  return m ? m[2] : undefined;
};

const locations = [];
for (const rawLine of body.split('\n')) {
  const line = rawLine.trim();
  if (!line.startsWith('{')) continue; // skip comments / blanks
  const name = field(line, 'name');
  const kingdom = field(line, 'kingdom');
  if (!name || !kingdom) continue;
  const terrain = field(line, 'terrain');
  const building = field(line, 'building'); // undefined when no building
  const groupRef = line.match(/grouping\s*:\s*BOARD_GROUPINGS\.(\w+)/);
  const grouping = groupRef ? groupings[groupRef[1]] : undefined;

  const entry = { name, kingdom, terrain, hasBuilding: Boolean(building) };
  if (building) entry.building = building;
  if (grouping) entry.grouping = grouping;
  locations.push(entry);
}

if (locations.length !== 60) {
  console.warn(`⚠️  Parsed ${locations.length} locations (expected 60). Double-check the source.`);
}

const json = JSON.stringify(locations, null, 2) + '\n';
writeFileSync(resolve(here, 'locations.json'), json);

console.log(`✓ Wrote locations.json (${locations.length} locations).`);
console.log('\n--- Paste this into index.html as EMBEDDED_LOCATIONS ---\n');
console.log('const EMBEDDED_LOCATIONS = ' + JSON.stringify(locations) + ';');
