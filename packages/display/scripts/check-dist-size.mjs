#!/usr/bin/env node
// Guards the library build against the one failure mode here that is completely silent.
//
// Vite's library mode base64-inlines `new URL(literal, import.meta.url)` assets regardless of
// `assetsInlineLimit`. `emitAssetsAsFiles()` in vite.config.ts intercepts them first — but if its
// URL_ASSET_HOSTS list, its regex, or the path a module points at ever drifts, the build still
// *succeeds*: it just embeds ~8 MB of audio (and, historically, a 22 MB PNG) as base64 into both
// bundles and stops emitting the separate files. No error, no warning. Consumers get a bundle
// that is 60× too big and self-hosting paths that no longer exist.
//
// So assert the shape of dist/ directly, and run it as part of `build`.
//
// The .ogg count is the assertion that actually catches a missed URL_ASSET_HOSTS entry: an
// inlined module contributes zero files, so the count drops while everything else looks fine.

import { readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');

// Roughly 1.3 MB today. The ceiling is deliberately loose — it is a tripwire for base64 inlining
// (which adds tens of MB), not a byte budget for ordinary code growth.
const MAX_BUNDLE_BYTES = 2 * 1024 * 1024;
const BUNDLES = ['index.esm.js', 'index.cjs', 'physics.esm.js', 'physics.cjs'];

// Every .ogg in `@udtc/assets/audio` must reach dist/audio/assets/: 113 official samples from
// the generated URL table plus drumCalibration and drumRotation from audio/effects.ts.
const EXPECTED_OGG = 115;

const STATIC_ASSETS = ['3d/assets/tower.glb', '3d/assets/board.png'];

const errors = [];

for (const name of BUNDLES) {
  const path = join(DIST, name);
  let size;
  try {
    size = statSync(path).size;
  } catch {
    errors.push(`missing bundle: dist/${name}`);
    continue;
  }
  if (size > MAX_BUNDLE_BYTES) {
    errors.push(
      `dist/${name} is ${(size / 1024 / 1024).toFixed(2)} MB, over the ${
        MAX_BUNDLE_BYTES / 1024 / 1024
      } MB ceiling — almost certainly base64-inlined assets. Check URL_ASSET_HOSTS in vite.config.ts.`,
    );
  }
}

let oggCount = 0;
try {
  oggCount = readdirSync(join(DIST, 'audio/assets')).filter((f) => f.endsWith('.ogg')).length;
} catch {
  errors.push('missing dist/audio/assets/ — no .ogg were emitted at all');
}
if (oggCount && oggCount !== EXPECTED_OGG) {
  errors.push(
    `dist/audio/assets holds ${oggCount} .ogg, expected ${EXPECTED_OGG}. Either a URL_ASSET_HOSTS ` +
      'entry stopped matching (its assets got inlined instead of emitted), or the sound library ' +
      'changed and EXPECTED_OGG in this script needs updating with it.',
  );
}

// These are written by copyStaticAssets(), which resolves a hand-written sibling path into
// `@udtc/assets`. A rename over there is exactly what this catches.
for (const rel of STATIC_ASSETS) {
  try {
    statSync(join(DIST, rel));
  } catch {
    errors.push(`missing dist/${rel} — check copyStaticAssets() paths in vite.config.ts`);
  }
}

if (errors.length) {
  console.error('check-dist-size: FAILED\n');
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}

console.log(`check-dist-size: ok (${oggCount} .ogg, ${BUNDLES.length} bundles under ceiling)`);
