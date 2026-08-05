/**
 * Does the app actually mount and render data?
 *
 * This exists because it didn't, once. `@udtc/theme` is source-only with react as a *peer*, so
 * pnpm gives it its own react copy; without `resolve.dedupe` the build shipped two Reacts, and
 * `useTheme`'s `useSyncExternalStore` ran against the copy whose dispatcher was never set. The
 * page was blank in production while every registry test passed — they check the data, and the
 * data was fine.
 *
 * So this suite renders the real <App/> through the real theme store and asserts something from
 * the registry reaches the DOM. It is deliberately shallow: coverage of *what* renders belongs to
 * datasets.test.ts. What is guarded here is only that rendering happens at all.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from './App';
import { DATASETS, TOTAL_ROWS } from './datasets';
import { ART_GROUPS } from './art';

let container: HTMLDivElement;
let root: Root;

/**
 * A working `localStorage`, which this environment does not otherwise have.
 *
 * vitest's jsdom environment makes `globalThis` *be* the window, so Node 22's experimental
 * `localStorage` global shadows jsdom's implementation — and Node's is `undefined` unless the
 * process was started with `--localstorage-file`. `sessionStorage` is untouched, which is what
 * makes the absence look like a jsdom bug rather than a shadowing one. The app survives this on
 * its own (every access there is wrapped), but the shelf's persistence has nothing to assert
 * against without a real store.
 *
 * Built fresh per test, so cases cannot leak stored state into each other.
 */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
  };
}

beforeEach(() => {
  window.location.hash = '';
  vi.stubGlobal('localStorage', memoryStorage());
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  // The art detail pane HEADs its asset for a byte size. jsdom has no server behind these URLs, so
  // stub it — an unhandled rejection here would fail an unrelated case.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { headers: { 'content-length': '1024' } })),
  );
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

/** Mount at a route and return the rendered text. */
function renderAt(hash: string): string {
  window.location.hash = hash;
  act(() => root.render(<App />));
  return container.textContent ?? '';
}

describe('App renders', () => {
  it('mounts the home page with every dataset and every art group', () => {
    const text = renderAt('');
    // The specific failure this guards: a null dispatcher throws during render and leaves the
    // container empty, so assert on real content rather than "did not throw".
    expect(text).toContain('Tower Codex');
    expect(text).toContain(TOTAL_ROWS.toLocaleString());
    for (const d of DATASETS) {
      expect(text, `sidebar is missing ${d.id}`).toContain(d.name);
    }

    // Href, not text: three art group names — Monuments, Heroes and Glyphs — are ALSO dataset
    // names, and `toContain` is a substring check over the whole document. A name loop here would
    // pass off the dataset sidebar alone, even if art never rendered at all.
    //
    // Scoped per region, not document-wide: the sidebar and the home art block BOTH emit
    // `#/art/<id>` links, so an unscoped query passes when either one alone is present. Verified
    // by breaking the sidebar hrefs — the unscoped version stayed green.
    const hrefsIn = (sel: string) =>
      [...container.querySelectorAll(`${sel} a[href^="#/art/"]`)].map((a) =>
        a.getAttribute('href'),
      );
    const sidebar = hrefsIn('.shelf');
    const homeBlock = hrefsIn('.home-art');
    for (const g of ART_GROUPS) {
      expect(sidebar, `sidebar is missing art/${g.id}`).toContain(`#/art/${g.id}`);
      expect(homeBlock, `home art block is missing art/${g.id}`).toContain(`#/art/${g.id}`);
    }
  });

  it('renders a dataset table with its records', () => {
    const text = renderAt('#/treasures');
    expect(text).toContain('Treasures');
    expect(text).toContain('62 records');
    expect(text).toContain('Lamp of Hope');
  });

  it('renders a record detail with its cross-links', () => {
    const text = renderAt('#/foes/oreks');
    expect(text).toContain('Oreks');
    expect(text).toContain('See also');
    expect(text).toContain('Card face');
  });

  it('renders the review stamp and its source note', () => {
    const text = renderAt('#/potions-gear/gilded-alembic');
    expect(text).toContain('needs review');
    expect(text).toContain('not legible');
  });

  it('renders global search results', () => {
    const text = renderAt('#/search?q=arkartus');
    // The open question this app exists to surface: the name appears in two datasets.
    expect(text).toContain('Monthly quests');
    expect(text).toContain('Board locations');
  });
});

describe('Art section renders', () => {
  it('renders the art index at #/art', () => {
    const text = renderAt('#/art');
    expect(text).toContain('Every piece of Return to Dark Tower game art');
    expect(text).toContain('Token art');
  });

  it('renders a group grid with bundler-resolved URLs, not placeholder paths', () => {
    const text = renderAt('#/art/glyphs');
    expect(text).toContain('Glyphs');
    expect(text).toContain('glyphs/cleanse.svg');

    const srcs = [...container.querySelectorAll('.art-grid img')].map(
      (i) => i.getAttribute('src') ?? '',
    );
    expect(srcs.length).toBeGreaterThan(0);
    // Every src must be something the bundler produced. `assetBaseUrl`-style concatenation was the
    // old mechanism and is exactly what @udtc/assets replaced.
    for (const src of srcs) {
      expect(src, 'unresolved asset URL').not.toContain('${');
      expect(src.length).toBeGreaterThan(0);
    }
  });

  it('renders an asset detail with its import snippet and codex breadcrumbs', () => {
    const text = renderAt('#/art/glyphs/battle');
    expect(text).toContain('Battle');
    expect(text).toContain("import { glyphSvg } from '@udtc/assets/glyphs';");
    expect(text).toContain('Download');
    // Three-deep, reusing codex's own .crumbs rather than a parallel breadcrumb.
    const crumbs = [...container.querySelectorAll('.crumbs a')].map((a) => a.textContent);
    expect(crumbs).toEqual(['Codex', 'Graphics', 'Glyphs']);
  });

  it('shows the small stand-in for a heavy asset, not the original', async () => {
    const text = renderAt('#/art/board/board');
    expect(text).toContain('Load the full-resolution file');
    const src = container.querySelector('.art-stage img')?.getAttribute('src');
    const heavy = ART_GROUPS.find((g) => g.id === 'board')!.assets.find((a) => a.id === 'board')!;
    expect(src).toBe(heavy.preview);
    expect(src).not.toBe(heavy.url);

    // The Size row is driven by the stubbed HEAD, so it only exists after the promise settles.
    // (Dimensions can't be asserted here at all — jsdom never fires `img.onLoad`.)
    await act(async () => {});

    // Size is measured from what is on screen, so while the stand-in is up it must be labelled as
    // the stand-in's. Unqualified it reads as the original's and is off by ~45×: this pane showed
    // "481 KB" under the heading `board/board.png`, a 22 MB file.
    const labels = [...container.querySelectorAll('.art-detail .field dt')].map(
      (d) => d.textContent,
    );
    expect(labels).toContain('Size (small variant)');
    expect(labels).not.toContain('Size');
  });

  it('renders a model without trying to show it as an image', () => {
    renderAt('#/art/models/tower');
    expect(container.querySelector('.art-stage img')).toBeNull();
    expect(container.textContent).toContain('3D model');
  });

  it('falls through to the art index for an unknown group', () => {
    // The index IS the list of valid groups, so it is more useful than a 404 here. Datasets get a
    // NotFound instead, because that list is 1,300 records long.
    expect(renderAt('#/art/not-a-group')).toContain('Every piece of Return to Dark Tower game art');
  });

  it('surfaces art in global search alongside dataset hits', () => {
    const text = renderAt('#/search?q=skull');
    expect(text).toContain('art file');
    expect(container.querySelector('.art-grid')).not.toBeNull();
  });
});

describe('the shelf remembers which sections are collapsed', () => {
  const SHELF_KEY = 'codex-shelf-collapsed';

  /** The `<details>` for a shelf section, found by its heading. */
  const sectionNamed = (title: string) =>
    [...container.querySelectorAll<HTMLDetailsElement>('.shelf .shelf-sec')].find(
      (d) => d.querySelector('summary h2')?.textContent === title,
    );

  const stored = () => JSON.parse(localStorage.getItem(SHELF_KEY) ?? '[]') as string[];

  /** What clicking a summary does, minus jsdom's disclosure behaviour: flip `open`, fire `toggle`. */
  const toggle = (el: HTMLDetailsElement, open: boolean) =>
    act(() => {
      el.open = open;
      el.dispatchEvent(new Event('toggle'));
    });

  it('restores collapsed sections on mount and leaves the rest open', () => {
    // Seeded before the first render, exactly as a page reload would find it. The `data:`/`art:`
    // prefixes are part of the stored contract, not an implementation detail — the two registries
    // name their sections independently and could collide outright.
    localStorage.setItem(SHELF_KEY, JSON.stringify(['data:Cards', 'art:Audio']));
    renderAt('');

    expect(sectionNamed('Cards')?.open, 'Cards was stored collapsed').toBe(false);
    expect(sectionNamed('Audio')?.open, 'Audio was stored collapsed').toBe(false);
    expect(sectionNamed('Rosters')?.open, 'sections absent from the list open').toBe(true);
  });

  it('persists the collapsed set rather than the open one', () => {
    // This is the assertion that matters: storing the *open* set would work identically today and
    // then silently hide every section added to the sidebar later, since no stored list names them.
    renderAt('');
    const rosters = sectionNamed('Rosters');
    expect(rosters?.open).toBe(true);
    expect(stored(), 'nothing is written until something is collapsed').toEqual([]);

    toggle(rosters!, false);
    expect(stored()).toEqual(['data:Rosters']);

    toggle(rosters!, true);
    expect(stored()).toEqual([]);
  });

  it('mounts with an unreadable stored value instead of throwing', () => {
    // Corrupt entry, or storage blocked by policy. A shelf that forgets beats a blank app.
    localStorage.setItem(SHELF_KEY, 'not json');
    expect(renderAt('')).toContain('Tower Codex');
    expect(sectionNamed('Rosters')?.open).toBe(true);
  });
});
