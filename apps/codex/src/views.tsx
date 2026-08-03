/**
 * Dataset views: a sortable table for scanning, a card grid for reading printed card text.
 * Both are generic over the registry — nothing here knows what a treasure or a foe is.
 */
import { useMemo, useState } from 'react';
import type { Dataset, Row } from './datasets';
import { RecordCard } from './render';
import { cell, facetValues, filterRows, sortRows, titleOf, type Facets } from './search';

export type View = 'table' | 'cards';

function FacetChips({
  dataset,
  rows,
  facets,
  onToggle,
}: {
  dataset: Dataset;
  rows: readonly Row[];
  facets: Facets;
  onToggle: (field: string, value: string) => void;
}) {
  const groups = useMemo(() => {
    const declared = dataset.facets ?? [];
    // A cross-link can filter on a field this dataset doesn't facet on — a board location links to
    // its token spots as `?f=location:Broken Lands`, and `location` is not a chip (60 values). Show
    // just the active value in that case, so the filter is visible and can be cleared. Without this
    // the header reads "3 of 212" with nothing on screen explaining why.
    const fields = [...new Set([...declared, ...Object.keys(facets)])];
    return fields.map((field) => {
      const values = facetValues(rows, field);
      return {
        field,
        values: declared.includes(field) ? values : values.filter((v) => v.value === facets[field]),
      };
    });
  }, [dataset, rows, facets]);

  // One chip is only worth showing if it is the active filter; otherwise it narrows nothing.
  const shown = groups.filter((g) => g.values.length > 1 || facets[g.field]);
  if (shown.length === 0) return null;

  return (
    <div className="facets">
      {shown.map(({ field, values }) => (
        <div className="facet" key={field}>
          <span className="facet-name">{field}</span>
          {values.map(({ value, count }) => (
            <button
              key={value}
              type="button"
              className="chip"
              aria-pressed={facets[field] === value}
              onClick={() => onToggle(field, value)}
            >
              {value}
              <span className="chip-count">{count}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function DataTable({ dataset, rows }: { dataset: Dataset; rows: Row[] }) {
  const [sort, setSort] = useState<{ col: string; dir: 1 | -1 } | null>(null);
  const sorted = useMemo(() => (sort ? sortRows(rows, sort.col, sort.dir) : rows), [rows, sort]);

  const toggle = (col: string) =>
    setSort((s) => (s?.col === col ? { col, dir: s.dir === 1 ? -1 : 1 } : { col, dir: 1 }));

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {dataset.columns.map((c) => (
              <th
                key={c}
                aria-sort={sort?.col === c ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
              >
                <button type="button" onClick={() => toggle(c)}>
                  {c}
                  <span className="sort-mark" aria-hidden="true">
                    {sort?.col === c ? (sort.dir === 1 ? '▲' : '▼') : ''}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const k = dataset.key(r);
            return (
              <tr key={k}>
                {dataset.columns.map((c, i) => (
                  <td key={c} className={typeof r[c] === 'number' ? 'num' : undefined}>
                    {i === 0 ? (
                      // The first cell is the link, but it still shows ITS OWN column's value —
                      // using the record title here made "Kingdom" read "Champion of the East".
                      // titleOf is only the fallback for rows whose first column is empty
                      // (box components labelled by `type` rather than `name`).
                      <a href={`#/${dataset.id}/${encodeURIComponent(k)}`}>
                        {cell(r, c) || titleOf(dataset, r)}
                      </a>
                    ) : (
                      cell(r, c)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 ? <p className="empty">Nothing matches that.</p> : null}
    </div>
  );
}

function CardGrid({ dataset, rows }: { dataset: Dataset; rows: Row[] }) {
  if (rows.length === 0) return <p className="empty">Nothing matches that.</p>;
  return (
    <div className="card-grid">
      {rows.map((r, i) => (
        <RecordCard key={dataset.key(r)} dataset={dataset} record={r} index={i} />
      ))}
    </div>
  );
}

export function DatasetView({
  dataset,
  query,
  facets,
  view,
  onQuery,
  onToggleFacet,
  onView,
}: {
  dataset: Dataset;
  query: string;
  facets: Facets;
  view: View;
  onQuery: (q: string) => void;
  onToggleFacet: (field: string, value: string) => void;
  onView: (v: View) => void;
}) {
  const rows = useMemo(() => filterRows(dataset.rows, query, facets), [dataset, query, facets]);
  const flagged = useMemo(() => dataset.rows.filter((r) => r.needsReview).length, [dataset]);
  // Chip counts come from the search-filtered rows but ignore the facets themselves, so each count
  // is what clicking that chip actually yields. Counting all rows would promise more than it gives.
  const facetRows = useMemo(() => filterRows(dataset.rows, query, {}), [dataset, query]);

  return (
    <section className="dataset">
      <header className="dataset-head">
        <h2>{dataset.name}</h2>
        <p className="count">
          {rows.length === dataset.rows.length
            ? `${dataset.rows.length} records`
            : `${rows.length} of ${dataset.rows.length}`}
          {flagged > 0 ? <span className="count-flagged"> · {flagged} need review</span> : null}
        </p>
        {dataset.note ? <p className="note">{dataset.note}</p> : null}
      </header>

      <div className="toolbar">
        <input
          type="search"
          className="find"
          placeholder={`Search ${dataset.name.toLowerCase()}…`}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          aria-label={`Search ${dataset.name}`}
        />
        <div className="view-toggle" role="group" aria-label="View">
          {(['table', 'cards'] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => onView(v)}>
              {v === 'table' ? 'Table' : 'Cards'}
            </button>
          ))}
        </div>
      </div>

      <FacetChips dataset={dataset} rows={facetRows} facets={facets} onToggle={onToggleFacet} />

      {view === 'cards' ? (
        <CardGrid dataset={dataset} rows={rows} />
      ) : (
        <DataTable dataset={dataset} rows={rows} />
      )}
    </section>
  );
}
