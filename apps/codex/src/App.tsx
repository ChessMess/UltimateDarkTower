import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useTheme, type ThemeMode } from '@udtc/theme';
import { DATASETS, DATASET_BY_ID, GROUP_ORDER, TOTAL_ROWS, type Dataset } from './datasets';
import { Detail, Badges } from './render';
import { DatasetView, type View } from './views';
import { parseFacets, searchAll, serializeFacets, titleOf, type Facets } from './search';
// Two modules, mirroring the dataset side's `datasets.ts` + `views.tsx` split.
import { ART_GROUPS, ART_GROUP_BY_ID, ART_SECTION_ORDER, TOTAL_ASSETS, searchArt } from './art';
import { ArtGrid, ArtGroupIndex, ArtRoute } from './artViews';

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

type Route = {
  /** A dataset slug, or one of the reserved ids: `search`, `art`. */
  datasetId: string;
  /** A record key — or, under `art`, the group id. */
  recordId?: string;
  /** Only meaningful under `art`: the asset id. Dataset routes are two segments deep. */
  subId?: string;
  query: string;
  facets: Facets;
  view?: View;
};

function parseRoute(hash: string): Route {
  const [path, search = ''] = hash.replace(/^#\/?/, '').split('?');
  const [datasetId = '', recordId, subId] = path.split('/');
  const params = new URLSearchParams(search);
  const view = params.get('view');
  return {
    datasetId: decodeURIComponent(datasetId),
    recordId: recordId === undefined ? undefined : decodeURIComponent(recordId),
    subId: subId === undefined ? undefined : decodeURIComponent(subId),
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

/**
 * Which shelf sections the reader has collapsed, remembered across reloads.
 *
 * Stores the **collapsed** set rather than the open one, so anything added to the sidebar later —
 * a new dataset group, a new art section — defaults to open instead of silently arriving hidden
 * behind an entry no stored list mentions.
 *
 * Keys are prefixed by side (`data:` / `art:`) because the two registries name their sections
 * independently: `Board` is a dataset group and `Board & models` is an art section today, and
 * nothing stops a future pair from colliding outright and toggling together.
 */
const SHELF_KEY = 'codex-shelf-collapsed';

function readCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(SHELF_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    // Private mode, a disabled-storage policy, or a corrupt value. A shelf that forgets is a far
    // better failure than one that throws on mount and takes the whole app with it.
    return new Set();
  }
}

/** One collapsible shelf section. `<details>` so the keyboard and screen-reader behaviour is the
 *  platform's rather than ours — this needs no role, no aria-expanded and no key handling. */
function ShelfSection({
  sectionKey,
  title,
  collapsed,
  onToggle,
  children,
}: {
  sectionKey: string;
  title: string;
  collapsed: Set<string>;
  onToggle: (key: string, open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <details
      className="shelf-sec"
      open={!collapsed.has(sectionKey)}
      onToggle={(e) => onToggle(sectionKey, e.currentTarget.open)}
    >
      <summary>
        <h2>{title}</h2>
      </summary>
      <ul>{children}</ul>
    </details>
  );
}

function Sidebar({ activeId, artId }: { activeId: string; artId?: string }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggle = useCallback((key: string, open: boolean) => {
    setCollapsed((prev) => {
      // `has(key) === open` is exactly the disagreement case — the set says collapsed while the
      // DOM says open, or the reverse — so anything else is React re-applying `open` and the
      // element re-firing `toggle`. Bail there or the two ping-pong.
      if (prev.has(key) !== open) return prev;
      const next = new Set(prev);
      if (open) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(SHELF_KEY, JSON.stringify([...next]));
      } catch {
        // Same as reading: the shelf just forgets this session.
      }
      return next;
    });
  }, []);

  return (
    <nav className="shelf" aria-label="Datasets">
      {GROUP_ORDER.map((group) => {
        const items = DATASETS.filter((d) => d.group === group);
        if (items.length === 0) return null;
        return (
          <ShelfSection
            key={group}
            sectionKey={`data:${group}`}
            title={group}
            collapsed={collapsed}
            onToggle={toggle}
          >
            {items.map((d) => (
              <li key={d.id}>
                <a href={`#/${d.id}`} aria-current={d.id === activeId ? 'page' : undefined}>
                  <span className="shelf-name">{d.name}</span>
                  <span className="shelf-count">{d.rows.length}</span>
                </a>
              </li>
            ))}
          </ShelfSection>
        );
      })}
      {/* Graphics is a parallel registry, not more datasets — the divider is what says so. */}
      <p className="shelf-part">
        <a href="#/art" aria-current={activeId === 'art' ? 'page' : undefined}>
          Graphics
        </a>
      </p>
      {ART_SECTION_ORDER.map((section) => (
        <ShelfSection
          key={section}
          sectionKey={`art:${section}`}
          title={section}
          collapsed={collapsed}
          onToggle={toggle}
        >
          {ART_GROUPS.filter((g) => g.section === section).map((g) => (
            <li key={g.id}>
              <a href={`#/art/${g.id}`} aria-current={artId === g.id ? 'page' : undefined}>
                <span className="shelf-name">{g.name}</span>
                <span className="shelf-count">{g.assets.length}</span>
              </a>
            </li>
          ))}
        </ShelfSection>
      ))}

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

      <section className="home-art">
        <h3>
          <a href="#/art">Graphics</a>
        </h3>
        <p>
          {TOTAL_ASSETS} files — board art, the full token roster, the tower model, the drum glyphs
          and the tower&rsquo;s whole sound library, out of{' '}
          <a href={`${REPO}/tree/main/packages/assets`} className="out">
            @udtc/assets
          </a>
          .
        </p>
        <ArtGroupIndex />
      </section>

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
  const art = useMemo(() => searchArt(query), [query]);
  const total = hits.reduce((n, h) => n + h.rows.length, 0);

  if (!query.trim()) {
    return (
      <section className="results">
        <p className="empty">
          Type to search all {TOTAL_ROWS.toLocaleString()} records and {TOTAL_ASSETS} graphics and
          audio files.
        </p>
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
          {art.length > 0 ? ` · ${art.length} art ${art.length === 1 ? 'file' : 'files'}` : ''}
        </p>
      </header>
      {hits.length === 0 && art.length === 0 ? (
        <p className="empty">Nothing matches that.</p>
      ) : null}
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

      {/* Graphics last: a query like "glyphs" hits both a dataset and an art group, and the data
          is what the Codex is primarily for. The grid is visually distinct, so the two never
          blur. */}
      {art.length > 0 ? (
        <div className="result-group">
          <h3>
            <a href="#/art">Graphics</a>
            <span>{art.length}</span>
          </h3>
          <ArtGrid
            assets={art.slice(0, 24)}
            hrefOf={(a) => `#/art/${a.group.id}/${encodeURIComponent(a.id)}`}
          />
          {art.length > 24 ? (
            <p className="more">
              <a href="#/art">+{art.length - 24} more files</a>
            </p>
          ) : null}
        </div>
      ) : null}
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
  // `art` joins `search` as a reserved id, dispatched before the dataset registry is consulted.
  // `datasets.test.ts` asserts no dataset claims either.
  const isArt = route.datasetId === 'art';
  const artGroup = isArt && route.recordId ? ART_GROUP_BY_ID.get(route.recordId) : undefined;

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
    const name = artGroup?.name ?? dataset?.name;
    document.title = name ? `${name} · Tower Codex` : 'Tower Codex';
  }, [dataset, artGroup]);

  let main: React.ReactNode;
  if (isSearch) {
    main = <GlobalSearch query={route.query} />;
  } else if (isArt) {
    main = <ArtRoute groupId={route.recordId} assetId={route.subId} />;
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
        <Sidebar activeId={route.datasetId} artId={isArt ? route.recordId : undefined} />
        <main>{main}</main>
      </div>
    </>
  );
}

function omit(f: Facets, key: string): Facets {
  const { [key]: _drop, ...rest } = f;
  return rest;
}
