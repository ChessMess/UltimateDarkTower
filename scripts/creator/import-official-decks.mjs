#!/usr/bin/env node
// import-official-decks.mjs — a PRIVATE convenience tool. It reads a local Return to Dark Tower app
// export (the Unity TextAsset key/value JSON pair) and emits a scenario-ready `library.battleDefs`
// fragment of card-ladder decks (schema 0.4.2) that you can load into the Creator's "Import decks
// JSON" button.
//
// This script ships NO card content: it only transforms YOUR local files at run time and writes the
// result to a path you choose (put it under /local/, which is gitignored). Do not commit the output
// — the source text is proprietary to Restoration Games.
//
// Usage:
//   node scripts/import-official-decks.mjs <TextAsset-dir> [out.json]
//   e.g. node scripts/import-official-decks.mjs "/path/to/ExportedProject/Assets/TextAsset" local/official-decks.json
//
// The parser recognizes the app's ladder families: `card_*` (keyword/foe/generic/crit cards),
// `dragon`, `titan`, and `ad_placeholder_*`. Each card is a 5-step ladder (worst→best). Simple
// step texts ("Lose/Gain N warriors/spirit", "Gain N corruption", "No losses/No effect") are encoded
// into engine `effects`; anything richer is left as display text only (resolved at the table).

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [, , dirArg, outArg] = process.argv;
if (!dirArg) {
  console.error('usage: node scripts/import-official-decks.mjs <TextAsset-dir> [out.json]');
  process.exit(1);
}
const out = outArg || 'local/official-decks.json';

const keys = JSON.parse(readFileSync(join(dirArg, 'Keys_English_0.json'), 'utf8')).values;
const vals = JSON.parse(readFileSync(join(dirArg, 'English_0.json'), 'utf8')).values;
if (keys.length !== vals.length) {
  console.error(`key/value length mismatch (${keys.length} vs ${vals.length})`);
  process.exit(1);
}
const kv = new Map();
for (let i = 0; i < keys.length; i++) kv.set(keys[i], vals[i]);

// Encode a step's display text into engine effects where the pattern is simple; otherwise leave it
// text-only. Original engine ops only — the text itself is passed through, not transformed.
function encode(text) {
  const t = (text || '').trim();
  if (!t || /^no (losses?|effect)\.?$/i.test(t)) return [];
  const effects = [];
  let m;
  if ((m = /^lose (\d+) warriors?/i.exec(t))) effects.push({ op: 'resource.lose', resource: 'warriors', amount: +m[1] });
  else if ((m = /^lose (\d+) spirit/i.exec(t))) effects.push({ op: 'resource.lose', resource: 'spirit', amount: +m[1] });
  else if ((m = /^gain (\d+) warriors?/i.exec(t))) effects.push({ op: 'resource.gain', resource: 'warriors', amount: +m[1] });
  else if ((m = /^gain (\d+) spirit/i.exec(t))) effects.push({ op: 'resource.gain', resource: 'spirit', amount: +m[1] });
  else if ((m = /^gain (\d+) corruptions?/i.exec(t))) for (let i = 0; i < +m[1]; i++) effects.push({ op: 'corruption.gain' });
  return effects;
}

const step = (i, text) => (encode(text).length ? { text, effects: encode(text) } : { text });

// Group ladder keys into (family, cardIndex) → steps[]. Two key shapes:
//   <family>_crit_<step>            → single critical card
//   <family>_<card>_<step>          → card `card` of a multi-card deck
const decks = {}; // family → { [cardIndex]: { critical, steps: [] } }
function put(family, cardIdx, stepIdx, critical, text) {
  const deck = (decks[family] ||= {});
  const card = (deck[cardIdx] ||= { critical, steps: [] });
  card.steps[stepIdx - 1] = step(stepIdx, text);
}

for (const key of keys) {
  let m;
  if ((m = /^(.+)_crit_(\d+)$/.exec(key))) {
    put(`${m[1]}_crit`, 1, +m[2], true, kv.get(key));
  } else if ((m = /^((?:card_|dragon|titan|ad_placeholder).*?)_(\d+)_(\d+)$/.exec(key))) {
    put(m[1], +m[2], +m[3], false, kv.get(key));
  }
}

// Emit a battleDefs map: one deck per family, cards ordered by index, 2 copies each (the observed
// 2×N deck-composition model). Card names are derived from the family — rename freely in the editor.
const advForFamily = (f) => {
  for (const a of ['beast', 'humanoid', 'magic', 'melee', 'undead', 'stealth']) if (f.includes(a)) return a[0].toUpperCase() + a.slice(1);
  return 'Wild';
};
const titleCase = (f) => f.replace(/^card_/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const battleDefs = {};
for (const [family, cardMap] of Object.entries(decks)) {
  const cards = Object.keys(cardMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map((idx) => {
      const c = cardMap[idx];
      const steps = c.steps.filter(Boolean);
      return {
        name: `${titleCase(family)}${Object.keys(cardMap).length > 1 ? ' ' + idx : ''}`.trim(),
        advantage: advForFamily(family),
        ...(c.critical ? { critical: true } : {}),
        copies: 2,
        steps,
      };
    })
    .filter((c) => c.steps.length > 0);
  if (cards.length) battleDefs[family] = { cards };
}

writeFileSync(out, JSON.stringify(battleDefs, null, 2));
console.log(`wrote ${Object.keys(battleDefs).length} decks to ${out} (do not commit — proprietary source text)`);
