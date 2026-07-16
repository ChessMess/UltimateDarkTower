// Store-level tests for the IndexedDB scenario library.
//
// jsdom has no IndexedDB, so these run against fake-indexeddb.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { listScenarios, readImages } from '@udtc/scenario-store';
import { useCreatorStore } from './index';
import { scaffoldScenario } from '../utils/scaffold';
import { buildRtdtPreset } from '../boards/presetRtdt';
import type { ScenarioDoc } from '../types';

const URL_A = 'data:image/webp;base64,AAAA';
const URL_B = 'data:image/webp;base64,BBBB';

function scaffold(title = 'Lib test'): ScenarioDoc {
  return scaffoldScenario({
    title,
    designer: 'Test',
    mode: 'coop',
    difficultyProfile: 'heroic',
    skullSupply: 30,
    monthEndMin: 5,
    monthEndMax: 8,
  });
}

const store = () => useCreatorStore.getState();

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  store().clearScenario();
  useCreatorStore.setState({ scenarioList: [] });
});

describe('saveCurrent / saveCurrentAs', () => {
  it('assigns an id on first save and clears isDirty', async () => {
    store().loadScenario(scaffold(), false);
    store().updateResourceImage('art-a', URL_A);
    expect(store().currentScenarioId).toBeNull();
    expect(store().isDirty).toBe(true);

    expect(await store().saveCurrent()).toBe(true);
    expect(store().currentScenarioId).not.toBeNull();
    expect(store().isDirty).toBe(false);
  });

  it('SAVES AN INVALID SCENARIO — save is never gated on validity', async () => {
    const broken = scaffold();
    broken.graph = { entry: 'does-not-exist', nodes: [] };
    store().loadScenario(broken, false);
    expect(store().validationResults?.allOk).toBe(false);

    // This is the headline behaviour change: Export stays gated, Save does not.
    expect(await store().saveCurrent()).toBe(true);
    const rows = await listScenarios();
    expect(rows[0].allOk).toBe(false);
  });

  it('saveCurrentAs writes a NEW entry and leaves the original alone', async () => {
    store().loadScenario(scaffold('First'), false);
    await store().saveCurrent();
    const firstId = store().currentScenarioId;

    await store().saveCurrentAs('Second');
    expect(store().currentScenarioId).not.toBe(firstId);
    expect(store().schemaDoc?.meta.title).toBe('Second');

    const rows = await listScenarios();
    expect(rows.map((r) => r.title).sort()).toEqual(['First', 'Second']);
  });

  it('records image bytes and count in the list row', async () => {
    store().loadScenario(scaffold(), false);
    store().updateResourceImages({ a: URL_A, b: URL_B });
    await store().saveCurrent();

    const [row] = await listScenarios();
    expect(row.imageCount).toBe(2);
    expect(row.imageBytes).toBe(URL_A.length + URL_B.length);
  });

  it('is a no-op with no document', async () => {
    expect(await store().saveCurrent()).toBe(false);
  });
});

describe('the images identity dirty-check', () => {
  it('seeds lastSavedImages on load so the first save does not rewrite the blob', () => {
    const doc = scaffold();
    doc.library = { ...doc.library, resources: { images: { a: URL_A } } };
    store().loadScenario(doc, false);
    // Seeded to THIS doc's map — not undefined, which would look like "images changed".
    expect(store().lastSavedImages).toBe(readImages(store().schemaDoc!));
  });

  it('clearScenario resets it, so a stale identity cannot suppress the next scenario', () => {
    const doc = scaffold();
    doc.library = { ...doc.library, resources: { images: { a: URL_A } } };
    store().loadScenario(doc, false);
    expect(store().lastSavedImages).toBeDefined();
    store().clearScenario();
    expect(store().lastSavedImages).toBeUndefined();
  });

  it('advances after a save that wrote images', async () => {
    store().loadScenario(scaffold(), false);
    store().updateResourceImage('a', URL_A);
    await store().saveCurrent();
    expect(store().lastSavedImages).toBe(readImages(store().schemaDoc!));
  });

  it('does not advance when a save FAILS', async () => {
    store().loadScenario(scaffold(), false);
    store().updateResourceImage('a', URL_A);
    const before = store().lastSavedImages;

    vi.stubGlobal('indexedDB', undefined);
    expect(await store().saveCurrent()).toBe(false);
    // A failed write must not convince the next save that the images are already on disk.
    expect(store().lastSavedImages).toBe(before);
    expect(store().draftSaveFailed).toBe(true);
    vi.unstubAllGlobals();
  });
});

describe('openScenario', () => {
  it('round-trips a document with images through storage, byte-identically', async () => {
    store().loadScenario(scaffold('Arted'), false);
    store().updateResourceImages({ a: URL_A, b: URL_B });
    await store().saveCurrent();
    const id = store().currentScenarioId!;
    // Compare the canonical export, which is what the save actually persisted: saving flushes the
    // React Flow positions into meta.layout via flowToSchema, so the pre-save schemaDoc is a
    // legitimately different (staler) object than the stored one.
    const before = store().exportScenario();

    store().clearScenario();
    expect(await store().openScenario(id)).toBe(true);
    expect(store().exportScenario()).toBe(before);
    expect(store().currentScenarioId).toBe(id);
    expect(store().isDirty).toBe(false);
  });

  it('reopened art is intact, not just structurally equal', async () => {
    store().loadScenario(scaffold('Arted'), false);
    store().updateResourceImages({ a: URL_A, b: URL_B });
    await store().saveCurrent();
    const id = store().currentScenarioId!;

    store().clearScenario();
    await store().openScenario(id);
    expect(readImages(store().schemaDoc!)).toEqual({ a: URL_A, b: URL_B });
  });

  it('returns false for an unknown id and leaves the document untouched', async () => {
    store().loadScenario(scaffold('Keep me'), false);
    expect(await store().openScenario('nope')).toBe(false);
    expect(store().schemaDoc?.meta.title).toBe('Keep me');
  });

  it('RESETS priorSetupBoard — S1 → S2 must not leak the setup.board stash', async () => {
    // S1: activate a custom board, which stashes the displaced inline setup.board.
    store().loadScenario(scaffold('S1'), false);
    store().commitBoards({ b1: buildRtdtPreset('b1') });
    store().setActiveBoard('b1');
    expect(store().priorSetupBoard).toBeDefined();
    await store().saveCurrent();

    // S2: a different scenario, saved separately.
    store().clearScenario();
    store().loadScenario(scaffold('S2'), false);
    await store().saveCurrent();
    const s2 = store().currentScenarioId!;

    // Re-open S2. priorSetupBoard is session-scoped with no schema surface, so if openScenario
    // did not route through clearScenario() first, S1's stash would still be sitting here and
    // deactivating a board in S2 would restore S1's setup.board.
    await store().openScenario(s2);
    expect(store().priorSetupBoard).toBeUndefined();
  });
});

describe('rename / duplicate / delete', () => {
  it('rename updates the row and the open document title together', async () => {
    store().loadScenario(scaffold('Before'), false);
    await store().saveCurrent();
    const id = store().currentScenarioId!;

    await store().renameScenario(id, 'After');
    expect(store().schemaDoc?.meta.title).toBe('After');
    expect((await listScenarios())[0].title).toBe('After');
  });

  it('duplicate creates an independent copy with its own id', async () => {
    store().loadScenario(scaffold('Original'), false);
    store().updateResourceImage('a', URL_A);
    await store().saveCurrent();
    const id = store().currentScenarioId!;

    await store().duplicateScenario(id);
    const rows = await listScenarios();
    expect(rows).toHaveLength(2);
    const copy = rows.find((r) => r.title === 'Original (copy)')!;
    expect(copy.id).not.toBe(id);
    // The copy carries its own art, and has never been exported.
    expect(copy.imageCount).toBe(1);
    expect(copy.lastExportedAt).toBeNull();
  });

  it('deleting the OPEN scenario detaches it rather than resurrecting the id on next save', async () => {
    store().loadScenario(scaffold('Doomed'), false);
    await store().saveCurrent();
    const id = store().currentScenarioId!;

    await store().removeScenario(id);
    expect(store().currentScenarioId).toBeNull();
    // The work is still on screen — deleting the library entry must not wipe the editor.
    expect(store().schemaDoc?.meta.title).toBe('Doomed');
    expect(await listScenarios()).toEqual([]);
  });
});

describe('markExported — the durability signal', () => {
  it('stamps lastExportedAt and survives later saves', async () => {
    store().loadScenario(scaffold(), false);
    await store().saveCurrent();
    expect((await listScenarios())[0].lastExportedAt).toBeNull();

    await store().markExported();
    const stamped = (await listScenarios())[0].lastExportedAt;
    expect(stamped).toBeGreaterThan(0);

    // An export is a property of the scenario, not of one write — a later save must not clear it.
    store().updateNodeLabel(store().schemaDoc!.graph.nodes[0].id, 'edited');
    await store().saveCurrent();
    expect((await listScenarios())[0].lastExportedAt).toBe(stamped);
  });

  it('is a no-op for an unsaved scenario', async () => {
    store().loadScenario(scaffold(), false);
    await expect(store().markExported()).resolves.toBeUndefined();
  });
});

describe('storage unavailable', () => {
  it('every library action degrades rather than throwing', async () => {
    vi.stubGlobal('indexedDB', undefined);
    store().loadScenario(scaffold(), false);
    await expect(store().saveCurrent()).resolves.toBe(false);
    await expect(store().openScenario('x')).resolves.toBe(false);
    await expect(store().refreshScenarioList()).resolves.toBeUndefined();
    await expect(store().duplicateScenario('x')).resolves.toBeUndefined();
    await expect(store().removeScenario('x')).resolves.toBeUndefined();
    expect(store().scenarioList).toEqual([]);
    vi.unstubAllGlobals();
  });
});
