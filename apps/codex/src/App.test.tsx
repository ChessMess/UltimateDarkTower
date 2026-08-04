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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from './App';
import { DATASETS, TOTAL_ROWS } from './datasets';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  window.location.hash = '';
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/** Mount at a route and return the rendered text. */
function renderAt(hash: string): string {
  window.location.hash = hash;
  act(() => root.render(<App />));
  return container.textContent ?? '';
}

describe('App renders', () => {
  it('mounts the home page with every dataset in the sidebar', () => {
    const text = renderAt('');
    // The specific failure this guards: a null dispatcher throws during render and leaves the
    // container empty, so assert on real content rather than "did not throw".
    expect(text).toContain('Tower Codex');
    expect(text).toContain(TOTAL_ROWS.toLocaleString());
    for (const d of DATASETS) {
      expect(text, `sidebar is missing ${d.id}`).toContain(d.name);
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
