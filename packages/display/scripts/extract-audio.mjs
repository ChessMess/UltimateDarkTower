#!/usr/bin/env node
// Extracts Ogg Opus tracks from the firmware flash blob (.local/out.bin)
// using offset/length tables in .local/audio_metadata.{c,h}, transcodes them
// to Ogg Vorbis (so VSCode's audio preview can play them — its Opus support is
// flaky), then regenerates src/audio/audioLibrary.ts so every UDT sample id
// maps to its file.
//
// Requires `ffmpeg` (decode Opus → WAV) and `oggenc` from vorbis-tools
// (encode WAV → Vorbis). Install via: brew install ffmpeg vorbis-tools
//
// Run: node scripts/extract-audio.mjs [--bin <path>] [--out <dir>] [--raw]
//   --bin  firmware blob to read (default: .local/out.bin)
//   --out  output directory for extracted .ogg files
//          (default: src/audio/assets/, or .local/audio_raw/ when --raw)
//   --raw  dump raw Ogg Opus slices verbatim — no transcoding, no enhancement,
//          no library regen

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
  unlinkSync,
} from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const HEADER = join(ROOT, '.local/audio_metadata.h');
const SOURCE = join(ROOT, '.local/audio_metadata.c');
const DEFAULT_BIN = join(ROOT, '.local/out.bin');
const DEFAULT_AUDIO_DIR = join(ROOT, 'src/audio/assets');
const DEFAULT_RAW_DIR = join(ROOT, '.local/audio_raw');
const LIBRARY_TS = join(ROOT, 'src/audio/audioLibrary.ts');
const UDT_CONST = resolve(ROOT, '..', 'UltimateDarkTower/src/udtConstants.ts');

function parseArgs(argv) {
  const args = { bin: DEFAULT_BIN, out: null, raw: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--raw') args.raw = true;
    else if (a === '--bin') args.bin = resolve(argv[++i]);
    else if (a === '--out') args.out = resolve(argv[++i]);
    else throw new Error(`unknown argument: ${a}`);
  }
  if (args.out === null) args.out = args.raw ? DEFAULT_RAW_DIR : DEFAULT_AUDIO_DIR;
  return args;
}

function parseEnum(text) {
  const m = text.match(/typedef enum\s*\{([\s\S]*?)\}\s*AudioTrack\s*;/);
  if (!m) throw new Error('AudioTrack enum not found');
  const names = [];
  for (const line of m[1].split('\n')) {
    const ident = line.match(/^\s*AudioTrack_(\w+)/);
    if (ident) names.push(ident[1]);
  }
  return names;
}

function parseIntArray(text, name) {
  const m = text.match(new RegExp(`${name}\\[\\]\\s*=\\s*\\{([\\s\\S]*?)\\};`));
  if (!m) throw new Error(`${name} not found`);
  return [...m[1].matchAll(/(\d+)\s*,/g)].map((mm) => parseInt(mm[1], 10));
}

function parseUdtLibrary(text) {
  const block = text.match(/TOWER_AUDIO_LIBRARY\s*:\s*AudioLibrary\s*=\s*\{([\s\S]*?)\n\}/);
  if (!block) throw new Error('TOWER_AUDIO_LIBRARY not found in udtConstants.ts');
  const valueToKey = new Map();
  const re =
    /^\s*([A-Za-z][A-Za-z0-9]*)\s*:\s*\{\s*name:\s*"[^"]*"\s*,\s*value:\s*(0x[0-9a-fA-F]+|\d+)/gm;
  for (const m of block[1].matchAll(re)) {
    const key = m[1];
    const value = m[2].startsWith('0x') ? parseInt(m[2], 16) : parseInt(m[2], 10);
    valueToKey.set(value, key);
  }
  return valueToKey;
}

// Enhancement chain (settled via A/B testing in .local/audio_enhanced_preview/):
//   - lowpass 13 kHz: trim Opus codec hiss
//   - bass shelf +3 dB @ 120 Hz: warm up the low end
//   - +3 dB @ 220 Hz, +1 dB @ 600 Hz, +1.5 dB @ 4.5 kHz: body, warmth, presence
//   - 2.5:1 compression with +2 dB makeup
//   - centered dry signal + parallel stereo wet (decorrelated aecho taps L vs R)
//     gives a "hall" feel without shifting the source off-center
//   - dynaudnorm: even out levels per clip
const ENHANCE_FILTER =
  '[0:a] aformat=channel_layouts=mono,' +
  'lowpass=f=13000,' +
  'bass=g=3:f=120:w=0.6,' +
  'equalizer=f=220:t=q:w=1.4:g=3,' +
  'equalizer=f=600:t=q:w=2:g=1,' +
  'equalizer=f=4500:t=q:w=1.4:g=1.5,' +
  'acompressor=threshold=-22dB:ratio=2.5:attack=8:release=80:makeup=2,' +
  'asplit=3 [DRY][WL][WR];' +
  '[WL] aecho=0.7:0.5:23|55|97:0.35|0.20|0.10 [revL];' +
  '[WR] aecho=0.7:0.5:33|71|113:0.35|0.20|0.10 [revR];' +
  '[DRY] pan=stereo|c0=c0|c1=c0 [dryS];' +
  '[revL] pan=stereo|c0=c0|c1=0*c0 [revLP];' +
  '[revR] pan=stereo|c0=0*c0|c1=c0 [revRP];' +
  '[dryS][revLP][revRP] amix=inputs=3:weights=1.0 0.35 0.35:normalize=0,' +
  'dynaudnorm=p=0.92:m=10';

function transcodeOpusToVorbis(opusBuffer, outputPath) {
  const tmpOpus = join(
    tmpdir(),
    `extract-audio-${process.pid}-${Math.random().toString(36).slice(2)}.opus.ogg`,
  );
  writeFileSync(tmpOpus, opusBuffer);
  try {
    const ff = spawnSync(
      'ffmpeg',
      ['-v', 'error', '-i', tmpOpus, '-filter_complex', ENHANCE_FILTER, '-f', 'wav', '-'],
      { maxBuffer: 64 * 1024 * 1024 },
    );
    if (ff.status !== 0) {
      throw new Error(`ffmpeg failed (exit ${ff.status}): ${ff.stderr?.toString() ?? ''}`);
    }
    const og = spawnSync('oggenc', ['-Q', '-q', '5', '-o', outputPath, '-'], {
      input: ff.stdout,
      maxBuffer: 64 * 1024 * 1024,
    });
    if (og.status !== 0) {
      throw new Error(`oggenc failed (exit ${og.status}): ${og.stderr?.toString() ?? ''}`);
    }
  } finally {
    try {
      unlinkSync(tmpOpus);
    } catch {
      /* ignore */
    }
  }
}

function caseInsensitiveIndex(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    return new Map();
  }
  const idx = new Map();
  for (const f of readdirSync(dir)) idx.set(f.toLowerCase(), f);
  return idx;
}

function generateLibraryTs(orderedMappings) {
  const fileLines = orderedMappings.map(({ key, file }) => `  [A.${key}.value]: '${file}',`);
  const urlLines = orderedMappings.map(
    ({ key, file }) => `  [A.${key}.value]: new URL('./assets/${file}', import.meta.url).href,`,
  );
  return `import { TOWER_AUDIO_LIBRARY } from 'ultimatedarktower';
import type { SoundPack } from './soundPack';

const A = TOWER_AUDIO_LIBRARY;

// Per-file \`new URL('./assets/<literal>.ogg', import.meta.url)\` is the
// canonical pattern recognised by every major bundler (Vite, esbuild,
// webpack 5+, Rollup, Parcel) and by native Node ESM. Each bundler detects
// the literal filename at build time, emits the asset to its output, and
// rewrites the expression to a literal URL string — no runtime evaluation
// of \`import.meta.url\` is needed, so the pattern survives IIFE/CJS targets
// where \`import.meta\` is stripped.
//
// OFFICIAL_AUDIO_FILES is the shared source of truth: \`buildOfficialSoundPack\`
// uses it to compose URLs against a custom base, while \`samples\` below
// references each filename inline so bundler asset detection works.

const OFFICIAL_AUDIO_FILES: Record<number, string> = {
  // === BEGIN AUTOGEN (scripts/extract-audio.mjs) ===
${fileLines.join('\n')}
};

const samples: Record<number, string> = {
${urlLines.join('\n')}
  // === END AUTOGEN ===
};

/**
 * The official-game sound pack bundled with this package. Built from the
 * Return to Dark Tower app firmware; samples are extracted Ogg Vorbis.
 * Used as the default by \`TowerDisplay.applyAudioConfig\` when no \`pack\`
 * is supplied.
 *
 * © Restoration Games, LLC; used with permission.
 */
export const DEFAULT_TOWER_SOUND_PACK: SoundPack = {
  name: 'Restoration Games — Official',
  description: 'Extracted from the Return to Dark Tower app firmware. © Restoration Games, LLC; used with permission.',
  samples,
};

/**
 * Build a sound pack with the official filenames against a custom base URL.
 * Useful if you want to self-host the same audio (e.g., behind a CDN or
 * proxy) without re-typing all 113 filenames.
 *
 * @param baseUrl Path or URL prefix to which official filenames are appended
 *                (e.g., \`'https://cdn.example.com/udt-audio/'\`). A trailing
 *                slash is added if missing.
 */
export function buildOfficialSoundPack(baseUrl: string): SoundPack {
  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  const out: Record<number, string> = {};
  for (const [id, file] of Object.entries(OFFICIAL_AUDIO_FILES)) {
    out[Number(id)] = base + file;
  }
  return {
    name: DEFAULT_TOWER_SOUND_PACK.name,
    description: DEFAULT_TOWER_SOUND_PACK.description,
    samples: out,
  };
}

/**
 * True if the given sample ID has an entry in the default pack. \`0\` (silence)
 * always returns true so callers can suppress "missing asset" warnings for
 * the no-audio state.
 */
export function hasDefaultAudioAsset(sample: number): boolean {
  if (sample === 0) return true;
  return typeof DEFAULT_TOWER_SOUND_PACK.samples[sample] === 'string';
}
`;
}

function rawDump(names, offsets, lengths, blob, outDir) {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  let wrote = 0;
  for (let i = 1; i < names.length; i++) {
    const slice = blob.subarray(offsets[i], offsets[i] + lengths[i]);
    if (slice.subarray(0, 4).toString('ascii') !== 'OggS') {
      throw new Error(`track ${i} ${names[i]}: not OggS at offset ${offsets[i]}`);
    }
    writeFileSync(join(outDir, `${names[i]}.ogg`), slice);
    wrote++;
  }
  console.log(`wrote ${wrote} raw Ogg Opus files to ${outDir}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(`bin: ${args.bin}`);
  console.log(`out: ${args.out}`);

  const headerText = readFileSync(HEADER, 'utf8');
  const sourceText = readFileSync(SOURCE, 'utf8');
  const blob = readFileSync(args.bin);

  const names = parseEnum(headerText);
  const offsets = parseIntArray(sourceText, 'file_locations_bytes');
  const lengths = parseIntArray(sourceText, 'file_lengths_bytes');

  if (names.length !== offsets.length || names.length !== lengths.length) {
    throw new Error(
      `length mismatch: enum=${names.length} offsets=${offsets.length} lengths=${lengths.length}`,
    );
  }
  if (names[0] !== 'None') throw new Error(`expected index 0 to be None, got ${names[0]}`);

  if (args.raw) {
    rawDump(names, offsets, lengths, blob, args.out);
    return;
  }

  const valueToKey = parseUdtLibrary(readFileSync(UDT_CONST, 'utf8'));
  const existing = caseInsensitiveIndex(args.out);
  const mappings = [];
  let wrote = 0;
  let skipped = 0;
  let unmapped = 0;

  for (let i = 1; i < names.length; i++) {
    const name = names[i];
    const offset = offsets[i];
    const length = lengths[i];
    const slice = blob.subarray(offset, offset + length);
    const magic = slice.subarray(0, 4).toString('ascii');
    if (magic !== 'OggS') {
      throw new Error(
        `track ${i} ${name}: expected OggS at offset ${offset}, got ${slice.subarray(0, 4).toString('hex')}`,
      );
    }

    const targetName = `${name}.ogg`;
    const onDisk = existing.get(targetName.toLowerCase());
    let actualFile;
    if (onDisk) {
      actualFile = onDisk;
      console.log(`skip (exists as ${onDisk}): ${targetName}`);
      skipped++;
    } else {
      const outPath = join(args.out, targetName);
      transcodeOpusToVorbis(slice, outPath);
      existing.set(targetName.toLowerCase(), targetName);
      actualFile = targetName;
      const newSize = readFileSync(outPath).length;
      console.log(`wrote: ${targetName} (Opus ${length}B → Vorbis ${newSize}B stereo)`);
      wrote++;
    }

    const key = valueToKey.get(i);
    if (key) {
      mappings.push({ value: i, key, file: actualFile });
    } else {
      console.warn(`  no UDT entry for value ${i} (track ${name}) — omitted from mapping`);
      unmapped++;
    }
  }

  mappings.sort((a, b) => a.value - b.value);
  writeFileSync(LIBRARY_TS, generateLibraryTs(mappings));
  console.log(
    `\nDone: ${wrote} written, ${skipped} skipped, ${mappings.length} mapped, ${unmapped} unmapped.`,
  );
  console.log(`Updated ${LIBRARY_TS}`);
}

main();
