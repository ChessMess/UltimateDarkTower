// Tests for the library.resources.images mutators — updateResourceImage / updateResourceImages.
//
// These pin the invariants the upcoming IndexedDB scenario store depends on:
//   - empty images/resources containers are DELETED, so exports stay clean
//   - the images map's object identity changes iff images changed (the persistence dirty-check)
//   - sibling library keys and resources.{sounds,videos,documents} survive an image write
//   - a bulk patch revalidates ONCE (the O(N²) fix)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { scenarioSchema } from '@udtc/schema';
import { useCreatorStore } from '../store';
import { scaffoldScenario } from '../utils/scaffold';
import { flowToSchema } from '../utils/serializer';
import { runValidation } from '../utils/validation';
import { imagesOf, resolveImage } from './shared';
import type { ScenarioDoc } from '../types';

// Delegates to the real validator, but counts calls — revalidation count is the whole point of the
// bulk mutator, and it is not otherwise observable from outside the store.
vi.mock('../utils/validation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/validation')>();
  return { ...actual, runValidation: vi.fn(actual.runValidation) };
});

function scaffold(): ScenarioDoc {
  return scaffoldScenario({
    title: 'Image test',
    designer: 'Test',
    mode: 'coop',
    difficultyProfile: 'heroic',
    skullSupply: 30,
    monthEndMin: 5,
    monthEndMax: 8,
  });
}

function load(doc: ScenarioDoc): void {
  useCreatorStore.getState().loadScenario(doc, false);
}

/** load(), then zero the revalidate counter — loadScenario validates once on the way in, and the
 *  counting tests want to measure only the mutation under test. */
function loadClean(doc: ScenarioDoc): void {
  load(doc);
  vi.mocked(runValidation).mockClear();
}

const store = () => useCreatorStore.getState();

/** the raw images map — NOT imagesOf(), which fabricates a fresh {} when absent */
const rawImages = (): Record<string, string> | undefined => {
  const library = store().schemaDoc?.library as Record<string, unknown> | undefined;
  const resources = library?.resources as Record<string, unknown> | undefined;
  return resources?.images as Record<string, string> | undefined;
};

const rawResources = (): Record<string, unknown> | undefined => {
  const library = store().schemaDoc?.library as Record<string, unknown> | undefined;
  return library?.resources as Record<string, unknown> | undefined;
};

const URL_A = 'data:image/webp;base64,AAAA';
const URL_B = 'data:image/webp;base64,BBBB';

beforeEach(() => {
  useCreatorStore.getState().clearScenario();
  vi.mocked(runValidation).mockClear();
});

describe('updateResourceImage', () => {
  it('sets an image and resolves it back through resolveImage', () => {
    load(scaffold());
    store().updateResourceImage('art-a', URL_A);
    expect(rawImages()).toEqual({ 'art-a': URL_A });
    expect(resolveImage(store().schemaDoc, 'art-a')).toBe(URL_A);
    expect(store().isDirty).toBe(true);
  });

  it('DELETES the empty images/resources containers when the last image is cleared', () => {
    load(scaffold());
    store().updateResourceImage('art-a', URL_A);
    store().updateResourceImage('art-a', null);
    // Not `{}` — exports must not carry empty scaffolding.
    expect(rawImages()).toBeUndefined();
    expect(rawResources()).toBeUndefined();
  });

  it('keeps resources when a SIBLING resource type is present', () => {
    const doc = scaffold();
    doc.library = { ...doc.library, resources: { sounds: { horn: 'data:audio/ogg;base64,AA' } } };
    load(doc);
    store().updateResourceImage('art-a', URL_A);
    store().updateResourceImage('art-a', null);
    // images is gone, but resources survives because sounds is still there.
    expect(rawImages()).toBeUndefined();
    expect(rawResources()).toEqual({ sounds: { horn: 'data:audio/ogg;base64,AA' } });
  });

  it('is a no-op with no scenario loaded', () => {
    expect(store().schemaDoc).toBeNull();
    expect(() => store().updateResourceImage('art-a', URL_A)).not.toThrow();
    expect(store().schemaDoc).toBeNull();
  });

  it('produces an L1-valid document', () => {
    load(scaffold());
    store().updateResourceImage('art-a', URL_A);
    const ajv = new Ajv({ allErrors: true, strict: true });
    addFormats(ajv);
    const validate = ajv.compile(scenarioSchema);
    const valid = validate(store().schemaDoc);
    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
  });
});

describe('updateResourceImages (bulk)', () => {
  it('applies a whole patch at once', () => {
    load(scaffold());
    store().updateResourceImages({ 'art-a': URL_A, 'art-b': URL_B });
    expect(rawImages()).toEqual({ 'art-a': URL_A, 'art-b': URL_B });
  });

  it('sets and clears in a single patch', () => {
    load(scaffold());
    store().updateResourceImages({ 'art-a': URL_A, 'art-b': URL_B });
    store().updateResourceImages({ 'art-a': null, 'art-c': URL_A });
    expect(rawImages()).toEqual({ 'art-b': URL_B, 'art-c': URL_A });
  });

  it('deletes the containers when a patch clears the last image', () => {
    load(scaffold());
    store().updateResourceImages({ 'art-a': URL_A, 'art-b': URL_B });
    store().updateResourceImages({ 'art-a': null, 'art-b': null });
    expect(rawImages()).toBeUndefined();
    expect(rawResources()).toBeUndefined();
  });

  it('an empty patch is a no-op and does not touch the document', () => {
    loadClean(scaffold());
    const before = store().schemaDoc;
    store().updateResourceImages({});
    expect(store().schemaDoc).toBe(before);
    expect(runValidation).not.toHaveBeenCalled();
  });

  it('revalidates ONCE for a 20-image patch — the O(N^2) fix', () => {
    loadClean(scaffold());
    const patch: Record<string, string> = {};
    for (let i = 0; i < 20; i++) patch[`art-${i}`] = `${URL_A}${i}`;

    store().updateResourceImages(patch);

    expect(Object.keys(rawImages() ?? {})).toHaveLength(20);
    expect(runValidation).toHaveBeenCalledTimes(1);
  });

  it('the old per-image loop would have revalidated 20 times', () => {
    loadClean(scaffold());
    for (let i = 0; i < 20; i++) store().updateResourceImage(`art-${i}`, `${URL_A}${i}`);
    // Documents the cost the bulk form avoids: this is what importFragment used to do.
    expect(runValidation).toHaveBeenCalledTimes(20);
  });
});

describe('images map identity — the persistence dirty-check', () => {
  it('CHANGES when an image is written', () => {
    load(scaffold());
    store().updateResourceImage('art-a', URL_A);
    const first = rawImages();
    store().updateResourceImage('art-b', URL_B);
    expect(rawImages()).not.toBe(first);
  });

  it('is PRESERVED by sibling library mutators (cards / decks / boards)', () => {
    load(scaffold());
    store().updateResourceImage('art-a', URL_A);
    const images = rawImages();

    store().updateLibraryCards({ c1: { cardId: 'c1' } });
    expect(rawImages()).toBe(images);

    store().commitBoards({});
    expect(rawImages()).toBe(images);

    store().updateLibraryDecks({ d1: { deckId: 'd1' } });
    expect(rawImages()).toBe(images);
  });

  it('survives the flowToSchema flush path by reference', () => {
    load(scaffold());
    store().updateResourceImage('art-a', URL_A);
    const images = rawImages();
    const { rfNodes, rfEdges, schemaDoc } = store();
    const flushed = flowToSchema(rfNodes, rfEdges, schemaDoc!);
    const flushedImages = (
      (flushed.library as Record<string, unknown>).resources as Record<string, unknown>
    ).images;
    // Identity must survive the flush, or every autosave would rewrite the whole image blob.
    expect(flushedImages).toBe(images);
  });

  it('imagesOf() must NOT be used for the check — it fabricates a fresh {} when absent', () => {
    load(scaffold());
    expect(imagesOf(store().schemaDoc)).toEqual({});
    // Equal but distinct: an identity check against imagesOf() would always report "changed".
    expect(imagesOf(store().schemaDoc)).not.toBe(imagesOf(store().schemaDoc));
  });
});
