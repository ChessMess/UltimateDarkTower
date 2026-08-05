import { describe, expect, it } from 'vitest';
import * as data from 'ultimatedarktowerdata';
import { DATASETS, DATASET_BY_ID } from './datasets';
import { cell, titleOf } from './search';

/**
 * Interactive helpers, not browsable data — apps/seed owns seed decoding, and the board graph
 * helpers need a two-location picker this app doesn't have.
 *
 * charToValue/valueToChar are deliberately NOT here: the seed-alphabet dataset surfaces them
 * as a table, so they count as covered.
 */
const HELPERS = new Set([
  'neighborsOf',
  'stepDistance',
  'shortestPath',
  'validateSeed',
  'decodeSeed',
  'decodeRngSeed',
  'createSeed',
  'encodeSeed',
  'compareSeedsRaw',
  'dumpSeedChars',
  'SystemRandom',
]);

describe('dataset registry', () => {
  it('covers every ultimatedarktowerdata export', () => {
    const claimed = new Set(DATASETS.flatMap((d) => d.exports));
    const uncovered = Object.keys(data).filter((k) => !claimed.has(k) && !HELPERS.has(k));
    expect(uncovered).toEqual([]);
  });

  it('claims no export that does not exist', () => {
    // Catches a rename or removal in game-data that would otherwise leave a dead registry entry.
    const claimed = new Set(DATASETS.flatMap((d) => d.exports));
    expect([...claimed].filter((k) => !(k in data))).toEqual([]);
  });

  it('gives every record a unique, URL-safe key', () => {
    const problems: string[] = [];
    for (const d of DATASETS) {
      const seen = new Set<string>();
      for (const r of d.rows) {
        const k = d.key(r);
        if (!k) problems.push(`${d.id}: empty key`);
        // '#' would terminate the hash route; '/' would fake a path segment.
        else if (k.includes('#') || k.includes('/')) problems.push(`${d.id}: unsafe key ${k}`);
        else if (seen.has(k)) problems.push(`${d.id}: duplicate key ${k}`);
        seen.add(k);
      }
    }
    expect(problems).toEqual([]);
  });

  it('resolves every related() link', () => {
    const ids = new Map(DATASETS.map((d) => [d.id, new Set(d.rows.map(d.key))]));
    const broken = DATASETS.flatMap((d) =>
      d.rows.flatMap((r) =>
        (d.related?.(r) ?? [])
          .filter(
            (l) => !ids.has(l.dataset) || (l.id !== undefined && !ids.get(l.dataset)!.has(l.id)),
          )
          .map((l) => `${d.id}/${d.key(r)} -> ${l.dataset}/${l.id ?? l.filter}`),
      ),
    );
    expect(broken).toEqual([]);
  });

  it('has a filter link that actually matches rows', () => {
    // A `filter` link that matches nothing lands the reader on an empty table with no explanation.
    // Renaming a field in game-data (dungeonType -> type, say) would do exactly that silently.
    const empty = new Set<string>();
    for (const d of DATASETS) {
      for (const r of d.rows) {
        for (const l of d.related?.(r) ?? []) {
          if (!l.filter) continue;
          const target = DATASET_BY_ID.get(l.dataset)!;
          const i = l.filter.indexOf(':');
          const [field, value] = [l.filter.slice(0, i), l.filter.slice(i + 1)];
          if (!target.rows.some((t) => cell(t, field) === value)) {
            empty.add(`${d.id} -> ${l.dataset}?f=${l.filter}`);
          }
        }
      }
    }
    expect([...empty]).toEqual([]);
  });

  it('gives every record a readable title', () => {
    // titleOf() falls back to the record key, which for composite keys is machine text like
    // "Base Game::Mini Bases::Blue". Any row reaching that fallback needs a `title` on its dataset.
    const ugly = DATASETS.flatMap((d) =>
      d.rows
        .filter((r) => titleOf(d, r).includes('::'))
        .slice(0, 1)
        .map((r) => `${d.id}: ${titleOf(d, r)}`),
    );
    expect(ugly).toEqual([]);
  });

  it('has unique dataset ids and non-empty rows', () => {
    expect(new Set(DATASETS.map((d) => d.id)).size).toBe(DATASETS.length);
    expect(DATASETS.filter((d) => d.rows.length === 0).map((d) => d.id)).toEqual([]);
  });

  it('leaves the reserved route ids alone', () => {
    // `#/search` and `#/art` are dispatched in App.tsx *before* DATASET_BY_ID is consulted, so a
    // dataset claiming either id would be silently unreachable — no error, just a page that never
    // opens. `search` has been magic since day one and was never guarded; `art` joins it now that
    // the art registry lives at `#/art/<group>/<asset>`.
    const RESERVED = ['search', 'art'];
    expect(DATASETS.filter((d) => RESERVED.includes(d.id)).map((d) => d.id)).toEqual([]);
  });
});
