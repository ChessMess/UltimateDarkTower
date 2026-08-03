import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useTheme, type ThemeMode } from '@udtc/theme';
import { DATASETS, DATASET_BY_ID, GROUP_ORDER, TOTAL_ROWS, type Dataset } from './datasets';
import { Detail, Badges } from './render';
import { DatasetView, type View } from './views';
import { parseFacets, searchAll, serializeFacets, titleOf, type Facets } from './search';

const REPO = 'https://github.com/ChessMess/UltimateDarkTower';

// ── routing ────────────────────────────────────────────────────────────────────────────────────

/**
 * The URL is the only source of truth for what's on screen — dataset, record, search text, facets
 * and view mode all live in the hash. Nothing is mirrored into component state, so there is no
 * sync effect to get wrong, and every view is deep-linkable.
 *
 * Search text and facets are written with `replaceState` so typing doesn't push a history entry per
 * keystroke. `replaceState` doesn't fire `hashchange`, so this store publishes its own event.
 */
const HASH_EVENT = 'codex:navigate';

function subscribeHash(cb: () => void) {
  window.addEventListener('hashchange', cb);
  window.addEventListener(HASH_EVENT, cb);
  return () => {
    window.removeEventListener('hashchange', cb);
    window.removeEventListener(HASH_EVENT, cb);
  };
}

const getHash = () => window.location.hash;

/** Change the view without adding to history. */
function replaceHash(next: string) {
  if (next === window.location.hash) return;
  history.replaceState(null, '', next || '#/');
  window.dispatchEvent(new Event(HASH_EVENT));
}

type Route = { datasetId: string; recordId?: string; query: string; facets: Facets; view?: View };

function parseRoute(hash: string): Route {
  const [path, search = ''] = hash.replace(/^#\/?/, '').split('?');
  const [datasetId = '', recordId] = path.split('/');
  const params = new URLSearchParams(search);
  const view = params.get('view');
  return {
    datasetId: decodeURIComponent(datasetId),
    recordId: recordId === undefined ? undefined : decodeURIComponent(recordId),
    query: params.get('q') ?? '',
    facets: parseFacets(params.getAll('f')),
    view: view === 'cards' || view === 'table' ? view : undefined,
  };
}

function buildHash(
  datasetId: string,
  query: string,
  facets: Facets,
  view: View,
  dflt: View,
): string {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  for (const f of serializeFacets(facets)) params.append('f', f);
  if (view !== dflt) params.set('view', view);
  const qs = params.toString();
  return `#/${datasetId}${qs ? `?${qs}` : ''}`;
}

// ── chrome ─────────────────────────────────────────────────────────────────────────────────────

function ThemeToggle() {
  // @udtc/theme's own <ThemeToggle> colours itself with inline styles bound to the tower palette's
  // --c-* tokens, which no stylesheet can override. The store is what's worth reusing, not the skin.
  const [mode, set] = useTheme();
  const modes: [ThemeMode, string][] = [
    ['system', 'Auto'],
    ['light', 'Day'],
    ['dark', 'Night'],
  ];
  return (
    <div className="theme" role="group" aria-label="Colour theme">
      {modes.map(([value, text]) => (
        <button key={value} type="button" aria-pressed={mode === value} onClick={() => set(value)}>
          {text}
        </button>
      ))}
    </div>
  );
}

function Sidebar({ activeId }: { activeId: string }) {
  return (
    <nav className="shelf" aria-label="Datasets">
      {GROUP_ORDER.map((group) => {
        const items = DATASETS.filter((d) => d.group === group);
        if (items.length === 0) return null;
        return (
          <section key={group}>
            <h2>{group}</h2>
            <ul>
              {items.map((d) => (
                <li key={d.id}>
                  <a href={`#/${d.id}`} aria-current={d.id === activeId ? 'page' : undefined}>
                    <span className="shelf-name">{d.name}</span>
                    <span className="shelf-count">{d.rows.length}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <p className="shelf-foot">
        Decoding a game seed? That lives in the{' '}
        <a href="../seed/" className="out">
          Seed Decoder
        </a>
        .
      </p>
    </nav>
  );
}

// ── pages ──────────────────────────────────────────────────────────────────────────────────────

/** Counted once from the registry, so these numbers can never drift from the data. */
function useDataQuality() {
  return useMemo(() => {
    const flagged = DATASETS.flatMap((d) =>
      d.rows.filter((r) => r.needsReview).map((r) => ({ d, r })),
    );
    const locations = DATASET_BY_ID.get('board-locations')!;
    const noDungeon = locations.rows.filter((r) => !r.dungeon).length;
    const heroes = DATASET_BY_ID.get('heroes')!;
    const provisional = heroes.rows.filter((r) => r.source === 'expeditions').length;
    return { flagged, noDungeon, locationTotal: locations.rows.length, provisional };
  }, []);
}

function Home() {
  const q = useDataQuality();
  return (
    <section className="home">
      <header className="home-head">
        <h2>The Return to Dark Tower reference, all of it.</h2>
        <p>
          {TOTAL_ROWS.toLocaleString()} records across {DATASETS.length} datasets — every printed
          card face, the board, the rosters, the box contents and the tower&rsquo;s own byte tables.
          Read straight from{' '}
          <a href={`${REPO}/tree/main/packages/game-data`} className="out">
            ultimatedarktowerdata
          </a>
          , so it is never a copy that drifts.
        </p>
      </header>

      <div className="home-groups">
        {GROUP_ORDER.map((group) => (
          <section key={group}>
            <h3>{group}</h3>
            <ul>
              {DATASETS.filter((d) => d.group === group).map((d) => (
                <li key={d.id}>
                  <a href={`#/${d.id}`}>
                    {d.name}
                    <span>{d.rows.length}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <aside className="quality">
        <h3>Where the data is thin</h3>
        <p>
          This reference is honest about its gaps. Some of it was transcribed from play observation,
          and rows nobody could fully see are flagged rather than guessed at.
        </p>
        <ul>
          <li>
            <strong>{q.flagged.length}</strong> rows need review
            <span className="quality-detail">
              {[...new Set(q.flagged.map((f) => f.d.name))].map((n) => {
                const d = DATASETS.find((x) => x.name === n)!;
                return (
                  <a key={n} href={`#/${d.id}`}>
                    {n}
                  </a>
                );
              })}
            </span>
          </li>
          <li>
            <strong>{q.noDungeon}</strong> of {q.locationTotal} board locations have no identified
            dungeon <a href="#/board-locations">Board locations</a>
          </li>
          <li>
            <strong>{q.provisional}</strong> heroes are provisional Expeditions entries{' '}
            <a href="#/heroes">Heroes</a>
          </li>
        </ul>
        <p className="quality-foot">
          <a href={`${REPO}/blob/main/packages/game-data/docs/open-questions.md`} className="out">
            The full list of open questions
          </a>
        </p>
      </aside>
    </section>
  );
}

function GlobalSearch({ query }: { query: string }) {
  const hits = useMemo(() => searchAll(query), [query]);
  const total = hits.reduce((n, h) => n + h.rows.length, 0);

  if (!query.trim()) {
    return (
      <section className="results">
        <p className="empty">Type to search all {TOTAL_ROWS.toLocaleString()} records.</p>
      </section>
    );
  }

  return (
    <section className="results">
      <header className="dataset-head">
        <h2>&ldquo;{query}&rdquo;</h2>
        <p className="count">
          {total} {total === 1 ? 'record' : 'records'} in {hits.length}{' '}
          {hits.length === 1 ? 'dataset' : 'datasets'}
        </p>
      </header>
      {hits.length === 0 ? <p className="empty">Nothing matches that.</p> : null}
      {hits.map(({ dataset, rows }) => (
        <div className="result-group" key={dataset.id}>
          <h3>
            <a href={`#/${dataset.id}`}>{dataset.name}</a>
            <span>{rows.length}</span>
          </h3>
          <ul>
            {rows.slice(0, 12).map((r) => (
              <li key={dataset.key(r)}>
                <a href={`#/${dataset.id}/${encodeURIComponent(dataset.key(r))}`}>
                  {titleOf(dataset, r)}
                  <Badges dataset={dataset} record={r} />
                </a>
              </li>
            ))}
            {rows.length > 12 ? (
              <li className="more">
                <a href={`#/${dataset.id}?q=${encodeURIComponent(query)}`}>
                  +{rows.length - 12} more in {dataset.name}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      ))}
    </section>
  );
}

function NotFound({ dataset, recordId }: { dataset: Dataset; recordId: string }) {
  return (
    <section className="dataset">
      <p className="empty">
        No record <code>{recordId}</code> in {dataset.name}.{' '}
        <a href={`#/${dataset.id}`}>Browse all {dataset.rows.length}</a>.
      </p>
    </section>
  );
}

// ── app ────────────────────────────────────────────────────────────────────────────────────────

export default function App() {
  const hash = useSyncExternalStore(subscribeHash, getHash, getHash);
  const route = useMemo(() => parseRoute(hash), [hash]);
  const dataset = DATASET_BY_ID.get(route.datasetId);
  const isSearch = route.datasetId === 'search';

  // No mirrored state: query/facets/view are read straight off the route and written back to it.
  const view: View = route.view ?? dataset?.view ?? 'table';
  const dflt: View = dataset?.view ?? 'table';

  const navigate = useCallback(
    (query: string, facets: Facets, v: View) => {
      if (!dataset) return;
      replaceHash(buildHash(dataset.id, query, facets, v, dflt));
    },
    [dataset, dflt],
  );

  const toggleFacet = useCallback(
    (field: string, value: string) => {
      const next =
        route.facets[field] === value
          ? omit(route.facets, field)
          : { ...route.facets, [field]: value };
      navigate(route.query, next, view);
    },
    [navigate, route.facets, route.query, view],
  );

  useEffect(() => {
    document.title = dataset ? `${dataset.name} · Tower Codex` : 'Tower Codex';
  }, [dataset]);

  let main: React.ReactNode;
  if (isSearch) {
    main = <GlobalSearch query={route.query} />;
  } else if (!dataset) {
    main = <Home />;
  } else if (route.recordId !== undefined) {
    const record = dataset.rows.find((r) => dataset.key(r) === route.recordId);
    main = record ? (
      <Detail dataset={dataset} record={record} />
    ) : (
      <NotFound dataset={dataset} recordId={route.recordId} />
    );
  } else {
    main = (
      <DatasetView
        key={dataset.id}
        dataset={dataset}
        query={route.query}
        facets={route.facets}
        view={view}
        onQuery={(q) => navigate(q, route.facets, view)}
        onToggleFacet={toggleFacet}
        onView={(v) => navigate(route.query, route.facets, v)}
      />
    );
  }

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#/">
          <span className="brand-mark" aria-hidden="true" />
          Tower Codex
        </a>
        <form className="global-search" role="search" onSubmit={(e) => e.preventDefault()}>
          <input
            type="search"
            value={isSearch ? route.query : ''}
            placeholder="Search everything…"
            aria-label="Search all datasets"
            onChange={(e) => {
              const q = e.target.value;
              const next = q ? `#/search?q=${encodeURIComponent(q)}` : '#/search';
              // Entering search is a real navigation (Back should return to where you were);
              // refining it once there is not.
              if (isSearch) replaceHash(next);
              else window.location.hash = next;
            }}
          />
        </form>
        <ThemeToggle />
      </header>

      <div className="layout">
        <Sidebar activeId={route.datasetId} />
        <main>{main}</main>
      </div>
    </>
  );
}

function omit(f: Facets, key: string): Facets {
  const { [key]: _drop, ...rest } = f;
  return rest;
}
