import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { saveScenario, SNAPSHOT_VERSION, type ScenarioMeta } from '@udtc/scenario-store';
import { handoffId, resolveHandoff } from './handoff';

const URL_A = 'data:image/webp;base64,AAAA';

function meta(id: string, title = 'Handed over'): ScenarioMeta {
  return {
    version: SNAPSHOT_VERSION,
    id,
    title,
    scenarioVersion: '0.1.0',
    updatedAt: Date.now(),
    imageBytes: 0,
    imageCount: 0,
    allOk: true,
    lastExportedAt: null,
  };
}

const docSansImages = {
  schemaVersion: '0.4.6',
  meta: { title: 'Handed over' },
  setup: {},
  library: { cards: {} },
  graph: { entry: 'a', nodes: [] },
};

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe('handoffId', () => {
  it('reads ?scenario=', () => {
    expect(handoffId('?scenario=abc123')).toBe('abc123');
    expect(handoffId('?other=1&scenario=abc')).toBe('abc');
  });

  it('is null when absent', () => {
    expect(handoffId('')).toBeNull();
    expect(handoffId('?other=1')).toBeNull();
  });
});

describe('resolveHandoff', () => {
  it('reports "none" with no ?scenario', async () => {
    expect(await resolveHandoff('')).toEqual({ status: 'none' });
  });

  it('loads a scenario the Creator saved, with its images rejoined', async () => {
    await saveScenario(meta('abc'), docSansImages, { art: URL_A }, true);

    const result = await resolveHandoff('?scenario=abc');
    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') return;
    expect(result.title).toBe('Handed over');
    // The document the Player receives must have its art inline, exactly like an imported file.
    const library = (result.doc as { library: Record<string, unknown> }).library;
    expect(library.resources).toEqual({ images: { art: URL_A } });
  });

  it('reports "missing" for an unknown id rather than throwing', async () => {
    const result = await resolveHandoff('?scenario=nope');
    expect(result.status).toBe('missing');
    if (result.status !== 'missing') return;
    // The message must point at the fallback — this is the path a user actually hits when the
    // browser evicted the scenario, or when they bookmarked a link to a deleted one.
    expect(result.message).toMatch(/import/i);
  });

  it('reports "missing" when IndexedDB is unavailable entirely (private mode)', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const result = await resolveHandoff('?scenario=abc');
    expect(result.status).toBe('missing');
    vi.unstubAllGlobals();
  });

  it('names the dev cross-origin trap in the dev message', async () => {
    // 5173 vs 5174 are different origins, so a dev miss is expected and needs to say so — a silent
    // fallback here is what burns an afternoon.
    const result = await resolveHandoff('?scenario=nope');
    if (result.status !== 'missing') throw new Error('expected missing');
    expect(import.meta.env.DEV ? result.message : 'preview:site').toMatch(/preview:site/);
  });
});
