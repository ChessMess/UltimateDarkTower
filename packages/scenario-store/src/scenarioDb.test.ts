// IndexedDB layer tests. jsdom has no IndexedDB, so these run against fake-indexeddb — which is
// why apps/player/src/game/persistence.ts (the pattern this is cloned from) has never had any.

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import {
  listScenarios,
  saveScenario,
  loadScenarioParts,
  deleteScenario,
  patchScenarioMeta,
  newScenarioId,
  requestPersistence,
  storageEstimate,
  SNAPSHOT_VERSION,
  type ScenarioMeta,
} from './scenarioDb';
import { splitImages, joinImages } from './split';
import type { ScenarioDocLike } from './split';

const URL_A = 'data:image/webp;base64,AAAA';
const URL_B = 'data:image/webp;base64,BBBB';

function meta(id: string, over: Partial<ScenarioMeta> = {}): ScenarioMeta {
  return {
    version: SNAPSHOT_VERSION,
    id,
    title: `Scenario ${id}`,
    scenarioVersion: '0.1.0',
    updatedAt: Date.now(),
    imageBytes: 0,
    imageCount: 0,
    allOk: true,
    lastExportedAt: null,
    ...over,
  };
}

/** A realistic document. ScenarioDocLike declares only `library`, so tests bring their own shape —
 *  mirroring how the Creator passes its full ScenarioDoc in. */
interface TestDoc extends ScenarioDocLike {
  schemaVersion: string;
  meta?: Record<string, unknown>;
  setup?: Record<string, unknown>;
  graph?: Record<string, unknown>;
}

const doc = (title = 'T'): TestDoc => ({
  schemaVersion: '0.4.6',
  meta: { title },
  setup: {},
  library: { cards: { c1: { cardId: 'c1' } } },
  graph: { entry: 'a', nodes: [] },
});

beforeEach(() => {
  // Fresh database per test — fake-indexeddb keeps global state otherwise.
  globalThis.indexedDB = new IDBFactory();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('save / load round-trip', () => {
  it('stores and reads back a scenario in three parts', async () => {
    const d = doc();
    expect(await saveScenario(meta('a'), d, {}, true)).toBe(true);
    const got = await loadScenarioParts('a');
    expect(got?.meta.id).toBe('a');
    expect(got?.doc).toEqual(d);
    expect(got?.images).toEqual({});
  });

  it('round-trips a document through split → save → load → join', async () => {
    const full: TestDoc = {
      schemaVersion: '0.4.6',
      meta: { title: 'Arted' },
      setup: {},
      library: { resources: { images: { a: URL_A, b: URL_B } }, cards: { c1: {} } },
      graph: { entry: 'a', nodes: [] },
    };
    const { doc: sansImages, images } = splitImages(full);
    await saveScenario(meta('a'), sansImages, images, true);

    const got = await loadScenarioParts('a');
    const rejoined = joinImages(got!.doc, got!.images);
    expect(rejoined).toEqual(full);
  });

  it('returns null for an unknown id — a normal outcome, not an error', async () => {
    expect(await loadScenarioParts('nope')).toBeNull();
  });

  it('discards a snapshot from a future/foreign version rather than upgrading it', async () => {
    await saveScenario(meta('a', { version: 999 }), doc(), {}, true);
    expect(await loadScenarioParts('a')).toBeNull();
    expect(await listScenarios()).toEqual([]);
  });
});

describe('writeImages=false — the autosave hot path', () => {
  it('leaves the existing images untouched', async () => {
    await saveScenario(meta('a'), doc('v1'), { a: URL_A }, true);
    // An autosave with unchanged images: doc is rewritten, the image blob is not.
    await saveScenario(meta('a'), doc('v2'), {}, false);

    const got = await loadScenarioParts('a');
    expect(((got!.doc as TestDoc).meta as { title: string }).title).toBe('v2');
    expect(got!.images).toEqual({ a: URL_A });
  });

  it('a first save with writeImages=false leaves no images record', async () => {
    await saveScenario(meta('a'), doc(), { a: URL_A }, false);
    const got = await loadScenarioParts('a');
    expect(got!.images).toEqual({});
  });
});

describe('listScenarios', () => {
  it('returns metadata newest-first and never reads docs or images', async () => {
    await saveScenario(meta('a', { updatedAt: 100, title: 'Old' }), doc(), {}, true);
    await saveScenario(meta('b', { updatedAt: 300, title: 'New' }), doc(), {}, true);
    await saveScenario(meta('c', { updatedAt: 200, title: 'Mid' }), doc(), {}, true);

    const rows = await listScenarios();
    expect(rows.map((r) => r.title)).toEqual(['New', 'Mid', 'Old']);
    // The list row carries no document and no image payload — that is what keeps it O(list length).
    expect(JSON.stringify(rows)).not.toContain('base64');
    expect(JSON.stringify(rows)).not.toContain('schemaVersion');
  });

  it('is empty when nothing is stored', async () => {
    expect(await listScenarios()).toEqual([]);
  });

  it('allows duplicate titles — rows are keyed by id', async () => {
    await saveScenario(meta('a', { title: 'Same', updatedAt: 1 }), doc(), {}, true);
    await saveScenario(meta('b', { title: 'Same', updatedAt: 2 }), doc(), {}, true);
    const rows = await listScenarios();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
  });
});

describe('deleteScenario', () => {
  it('removes all three records', async () => {
    await saveScenario(meta('a'), doc(), { a: URL_A }, true);
    expect(await deleteScenario('a')).toBe(true);
    expect(await loadScenarioParts('a')).toBeNull();
    expect(await listScenarios()).toEqual([]);
  });
});

describe('patchScenarioMeta', () => {
  it('renames without touching the document', async () => {
    await saveScenario(meta('a', { title: 'Before' }), doc(), {}, true);
    expect(await patchScenarioMeta('a', { title: 'After' })).toBe(true);
    const got = await loadScenarioParts('a');
    expect(got!.meta.title).toBe('After');
    expect(got!.doc).toEqual(doc());
  });

  it('records lastExportedAt', async () => {
    await saveScenario(meta('a'), doc(), {}, true);
    await patchScenarioMeta('a', { lastExportedAt: 12345 });
    expect((await loadScenarioParts('a'))!.meta.lastExportedAt).toBe(12345);
  });

  it('is a no-op for an unknown id', async () => {
    expect(await patchScenarioMeta('nope', { title: 'x' })).toBe(false);
  });
});

describe('allOk tri-state', () => {
  it('stores null distinctly from false — "not validated" is not "invalid"', async () => {
    await saveScenario(meta('a', { allOk: null }), doc(), {}, true);
    await saveScenario(meta('b', { allOk: false }), doc(), {}, true);
    expect((await loadScenarioParts('a'))!.meta.allOk).toBeNull();
    expect((await loadScenarioParts('b'))!.meta.allOk).toBe(false);
  });

  it('saves an INVALID scenario — saving must never be gated on validity', async () => {
    const broken: TestDoc = { schemaVersion: '0.4.6', graph: { entry: 'missing' } };
    expect(await saveScenario(meta('a', { allOk: false }), broken, {}, true)).toBe(true);
    expect((await loadScenarioParts('a'))!.doc).toEqual(broken);
  });
});

describe('degrades to a no-op when IndexedDB is unavailable', () => {
  it('every call returns its empty value rather than throwing', async () => {
    // Private mode / disabled storage: the API simply is not there.
    vi.stubGlobal('indexedDB', undefined);
    await expect(saveScenario(meta('a'), doc(), {}, true)).resolves.toBe(false);
    await expect(loadScenarioParts('a')).resolves.toBeNull();
    await expect(listScenarios()).resolves.toEqual([]);
    await expect(deleteScenario('a')).resolves.toBe(false);
    await expect(patchScenarioMeta('a', { title: 'x' })).resolves.toBe(false);
  });

  it('survives an indexedDB.open that throws outright', async () => {
    vi.stubGlobal('indexedDB', {
      open: () => {
        throw new Error('SecurityError');
      },
    });
    await expect(listScenarios()).resolves.toEqual([]);
    await expect(saveScenario(meta('a'), doc(), {}, true)).resolves.toBe(false);
  });
});

describe('requestPersistence', () => {
  it('returns false when the Storage API is absent — never throws', async () => {
    vi.stubGlobal('navigator', {});
    await expect(requestPersistence()).resolves.toBe(false);
  });

  it('short-circuits when already persisted', async () => {
    const persist = vi.fn();
    vi.stubGlobal('navigator', {
      storage: { persisted: async () => true, persist },
    });
    await expect(requestPersistence()).resolves.toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it('requests persistence and reports a denial without throwing', async () => {
    vi.stubGlobal('navigator', {
      storage: { persisted: async () => false, persist: async () => false },
    });
    // A denial must not block saving — the caller keeps nudging the author to Export instead.
    await expect(requestPersistence()).resolves.toBe(false);
  });

  it('swallows a rejecting persist()', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        persisted: async () => false,
        persist: async () => {
          throw new Error('nope');
        },
      },
    });
    await expect(requestPersistence()).resolves.toBe(false);
  });
});

describe('storageEstimate', () => {
  it('returns null when unsupported', async () => {
    vi.stubGlobal('navigator', {});
    await expect(storageEstimate()).resolves.toBeNull();
  });

  it('passes through usage and quota', async () => {
    vi.stubGlobal('navigator', {
      storage: { estimate: async () => ({ usage: 1000, quota: 5000 }) },
    });
    await expect(storageEstimate()).resolves.toEqual({ usage: 1000, quota: 5000 });
  });
});

describe('newScenarioId', () => {
  it('is unique', () => {
    const ids = new Set(Array.from({ length: 200 }, newScenarioId));
    expect(ids.size).toBe(200);
  });

  it('falls back when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {});
    expect(newScenarioId()).toMatch(/^s-/);
  });
});
