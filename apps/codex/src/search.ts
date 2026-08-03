/**
 * Search and faceting. ~1,300 records total, so a plain substring scan over each row's serialized
 * text is sub-millisecond — no index to build, no debounce to tune, nothing to invalidate.
 */
import { DATASETS, type Dataset, type Link, type Row } from './datasets';

/** Hash URL for a cross-reference: a record when it has an id, otherwise a pre-filtered list. */
export function href(l: Link): string {
  const base = `#/${l.dataset}`;
  if (l.id !== undefined) return `${base}/${encodeURIComponent(l.id)}`;
  if (l.filter) return `${base}?f=${encodeURIComponent(l.filter)}`;
  return base;
}

/** Serialized haystack per row, built once and reused for every keystroke. */
const HAYSTACK = new WeakMap<Row, string>();

function haystack(r: Row): string {
  let h = HAYSTACK.get(r);
  if (h === undefined) {
    h = JSON.stringify(r).toLowerCase();
    HAYSTACK.set(r, h);
  }
  return h;
}

export function matches(r: Row, q: string): boolean {
  return !q || haystack(r).includes(q.toLowerCase());
}

/** A facet selection, serialized in the URL as `field:value`. */
export type Facets = Record<string, string>;

export function parseFacets(pairs: string[]): Facets {
  const out: Facets = {};
  for (const p of pairs) {
    const i = p.indexOf(':');
    if (i > 0) out[p.slice(0, i)] = p.slice(i + 1);
  }
  return out;
}

export function serializeFacets(f: Facets): string[] {
  return Object.entries(f).map(([k, v]) => `${k}:${v}`);
}

/** Cell value as a plain string, matching how the table renders it. */
export function cell(r: Row, field: string): string {
  const v = r[field];
  if (v === undefined || v === null || v === '') return '';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') return Object.values(v as Row).join(' · ');
  return String(v);
}

export function filterRows(rows: readonly Row[], q: string, facets: Facets): Row[] {
  const active = Object.entries(facets);
  return rows.filter((r) => active.every(([f, v]) => cell(r, f) === v) && matches(r, q));
}

/** Distinct values of a facet field, with counts, ordered by frequency then alphabetically. */
export function facetValues(
  rows: readonly Row[],
  field: string,
): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const v = cell(r, field);
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export type SearchHit = { dataset: Dataset; rows: Row[] };

/** Every dataset that has a match, in registry order. */
export function searchAll(q: string): SearchHit[] {
  if (!q.trim()) return [];
  return DATASETS.map((dataset) => ({
    dataset,
    rows: dataset.rows.filter((r) => matches(r, q)),
  })).filter((h) => h.rows.length > 0);
}

/** The record's display heading. */
export function titleOf(d: Dataset, r: Row): string {
  return d.title?.(r) || cell(r, 'name') || d.key(r);
}

/**
 * Sort a copy — never in place. game-data's arrays are readonly to TypeScript but not frozen at
 * runtime, so sorting the live array would reorder the data for every other consumer in the tab.
 */
export function sortRows(rows: readonly Row[], field: string, dir: 1 | -1): Row[] {
  return [...rows].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    const as = cell(a, field);
    const bs = cell(b, field);
    // Empty cells sort last in both directions — a blank is absence, not a low value.
    if (!as !== !bs) return as ? -1 : 1;
    return as.localeCompare(bs, undefined, { numeric: true }) * dir;
  });
}
