#!/usr/bin/env node
// import-official-maps.mjs — a PRIVATE convenience tool. It reads a local Return to Dark Tower app
// export (the Unity Texture2D map PNGs) and emits a scenario-ready { images, dungeons } fragment you
// can load into the Creator's "Import dungeons JSON" button (Dungeons workspace). Each map image is
// base64-embedded as a data URL under an `images` key; each dungeon is a minimal, L1/L3-valid skeleton
// (one entrance/target room) whose rooms you then trace with the builder's "Detect rooms from image".
//
// This script ships NO content: it only transforms YOUR local files at run time and writes the result
// to a path you choose (put it under /local/, which is gitignored). Do not commit the output — the
// source art is proprietary to Restoration Games.
//
// Usage:
//   node scripts/import-official-maps.mjs <Texture2D-dir> [out.json]
//   e.g. node scripts/import-official-maps.mjs \
//     "/path/to/ExportedProject/Assets/Texture2D" local/official-maps.json
//
// Node has no <canvas>, so room tracing stays browser-side by design (the Creator's auto-detect).

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [, , dirArg, outArg] = process.argv;
if (!dirArg) {
  console.error('usage: node scripts/import-official-maps.mjs <Texture2D-dir> [out.json]');
  process.exit(1);
}
const out = outArg || 'local/official-maps.json';

// The full-res dungeon maps are named `maps_<Name>_<n>_0.png`. Skip the low-res `maps_*_N.png`
// (without the trailing _0), the river/background overlays, and the packed sprite atlases.
const files = readdirSync(dirArg)
  .filter((f) => /^maps_.+_0\.png$/i.test(f))
  .sort();

if (files.length === 0) {
  console.error(`no maps_*_0.png files found in ${dirArg}`);
  process.exit(1);
}

const slugify = (s) =>
  s
    .replace(/\.png$/i, '')
    .replace(/^maps_/i, '')
    .replace(/_0$/, '')
    .replace(/_/g, '-')
    .toLowerCase();

const titleCase = (slug) =>
  slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const images = {};
const dungeons = {};

for (const file of files) {
  const slug = slugify(file);
  const imageKey = `map-${slug}`;
  const b64 = readFileSync(join(dirArg, file)).toString('base64');
  images[imageKey] = `data:image/png;base64,${b64}`;
  // A minimal valid skeleton: one room that is both entrance and target (L1: rooms.minItems=1; L3:
  // exactly one entrance + one target, trivially reachable). Expand the grid and run "Detect rooms
  // from image" in the builder to trace the real layout.
  dungeons[slug] = {
    id: slug,
    name: titleCase(slug),
    trait: 'Magic',
    grid: { cols: 4, rows: 3 },
    masterBitmap: imageKey,
    rooms: [
      {
        id: 'room-entry',
        name: 'Entrance',
        cell: { col: 0, row: 0 },
        exits: {},
        isEntrance: true,
        isTarget: true,
      },
    ],
  };
}

writeFileSync(out, JSON.stringify({ images, dungeons }, null, 2));
const totalBytes = Object.values(images).reduce((a, u) => a + u.length, 0);
console.log(
  `wrote ${files.length} map(s) → ${out}  (~${(totalBytes / 1_000_000).toFixed(1)} MB of embedded images)`,
);
console.log('Load it via the Creator → Dungeons → "Import JSON" button, then use "Detect rooms from image".');
