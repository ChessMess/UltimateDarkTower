import { describe, it, expect } from 'vitest';
import { splitImages, joinImages, readImages, measureImages } from './split';
import type { ScenarioDocLike } from './split';

const URL_A = 'data:image/webp;base64,AAAA';
const URL_B = 'data:image/webp;base64,BBBB';

/** Deep-sort object keys — mirrors the Creator's canonicalJson, which is what actually decides
 *  whether a round-tripped document is byte-identical on export. */
function canonical(value: unknown): string {
  const sortDeep = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sortDeep);
    if (v !== null && typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(obj).sort()) out[k] = sortDeep(obj[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(sortDeep(value), null, 2);
}

/** A realistic document shape. ScenarioDocLike deliberately declares only `library`, so tests need
 *  their own type for the rest — mirroring how the Creator passes its full ScenarioDoc in. */
interface TestDoc extends ScenarioDocLike {
  schemaVersion: string;
  meta: Record<string, unknown>;
  setup: Record<string, unknown>;
  graph: Record<string, unknown>;
}

const docWith = (library: unknown): TestDoc => ({
  schemaVersion: '0.4.6',
  meta: { title: 'T' },
  setup: {},
  library,
  graph: { entry: 'a', nodes: [] },
});

describe('splitImages', () => {
  it('extracts the images map by reference — no copy of the payload', () => {
    const images = { a: URL_A };
    const doc = docWith({ resources: { images } });
    const out = splitImages(doc);
    expect(out.images).toBe(images);
  });

  it('drops library.resources when images was its only key', () => {
    const doc = docWith({ resources: { images: { a: URL_A } }, cards: { c1: {} } });
    const { doc: sansImages } = splitImages(doc);
    const library = sansImages.library as Record<string, unknown>;
    expect(library.resources).toBeUndefined();
    expect(library.cards).toEqual({ c1: {} });
  });

  it('KEEPS resources when a sibling resource type is present', () => {
    const doc = docWith({
      resources: { images: { a: URL_A }, sounds: { horn: 'data:audio/ogg;b' } },
    });
    const { doc: sansImages } = splitImages(doc);
    const resources = (sansImages.library as Record<string, unknown>).resources;
    expect(resources).toEqual({ sounds: { horn: 'data:audio/ogg;b' } });
  });

  it('drops an emptied library entirely', () => {
    const doc = docWith({ resources: { images: { a: URL_A } } });
    const { doc: sansImages } = splitImages(doc);
    expect('library' in sansImages).toBe(false);
  });

  it('does not mutate the input', () => {
    const doc = docWith({ resources: { images: { a: URL_A } } });
    const before = canonical(doc);
    splitImages(doc);
    expect(canonical(doc)).toBe(before);
  });

  it('is a pass-through for a document with no images', () => {
    const doc = docWith({ cards: {} });
    const out = splitImages(doc);
    expect(out.doc).toBe(doc);
    expect(out.images).toEqual({});
  });
});

describe('joinImages', () => {
  it('an empty map is a no-op — must not resurrect library.resources', () => {
    const doc = docWith({ cards: {} });
    expect(joinImages(doc, {})).toBe(doc);
    expect(joinImages(doc, undefined)).toBe(doc);
    const library = joinImages(doc, {}).library as Record<string, unknown>;
    expect(library.resources).toBeUndefined();
  });

  it('MERGES into an existing resources rather than replacing it', () => {
    const doc = docWith({ resources: { sounds: { horn: 'data:audio/ogg;b' } } });
    const joined = joinImages(doc, { a: URL_A });
    const resources = (joined.library as Record<string, unknown>).resources;
    // The sounds sibling must survive. A replace would silently destroy it.
    expect(resources).toEqual({ sounds: { horn: 'data:audio/ogg;b' }, images: { a: URL_A } });
  });

  it('creates library and resources when absent', () => {
    const doc: TestDoc = { schemaVersion: '0.4.6', meta: {}, setup: {}, graph: {} };
    const joined = joinImages(doc, { a: URL_A });
    expect((joined.library as Record<string, unknown>).resources).toEqual({ images: { a: URL_A } });
  });

  it('does not mutate the input', () => {
    const doc = docWith({ resources: { sounds: {} } });
    const before = canonical(doc);
    joinImages(doc, { a: URL_A });
    expect(canonical(doc)).toBe(before);
  });
});

describe('ROUND-TRIP: join(...split(doc)) is byte-identical', () => {
  const cases: Array<[string, TestDoc]> = [
    ['images only', docWith({ resources: { images: { a: URL_A, b: URL_B } } })],
    [
      'images + sibling library keys',
      docWith({ resources: { images: { a: URL_A } }, cards: { c1: { cardId: 'c1' } } }),
    ],
    [
      'images + resources.sounds sibling',
      docWith({ resources: { images: { a: URL_A }, sounds: { horn: 'data:audio/ogg;b' } } }),
    ],
    ['NO images at all', docWith({ cards: { c1: {} } })],
    [
      'no images, resources.sounds only',
      docWith({ resources: { sounds: { horn: 'data:audio/ogg;b' } } }),
    ],
    ['empty library', docWith({})],
    [
      'no library key',
      { schemaVersion: '0.4.6', meta: { title: 'T' }, setup: {}, graph: {} } as TestDoc,
    ],
  ];

  for (const [name, doc] of cases) {
    it(name, () => {
      const { doc: sansImages, images } = splitImages(doc);
      const rejoined = joinImages(sansImages, images);
      expect(canonical(rejoined)).toBe(canonical(doc));
    });
  }

  it('the split document carries none of the image payload', () => {
    const doc = docWith({ resources: { images: { a: URL_A, b: URL_B } }, cards: { c1: {} } });
    const { doc: sansImages } = splitImages(doc);
    // This is the whole point: the hot-path record must not contain the bytes.
    expect(JSON.stringify(sansImages)).not.toContain('base64');
  });
});

describe('readImages', () => {
  it('returns the map by reference, and undefined when absent', () => {
    const images = { a: URL_A };
    expect(readImages(docWith({ resources: { images } }))).toBe(images);
    expect(readImages(docWith({ cards: {} }))).toBeUndefined();
    expect(readImages(docWith({ resources: {} }))).toBeUndefined();
    expect(readImages(null)).toBeUndefined();
    expect(readImages(undefined)).toBeUndefined();
  });

  it('never fabricates — two reads of an image-less doc are both undefined, not fresh objects', () => {
    // Contrast with the Creator's imagesOf(), which returns `?? {}` and so can never be used as an
    // identity signal. readImages is the one the dirty-check must use.
    const doc = docWith({ cards: {} });
    expect(readImages(doc)).toBe(readImages(doc));
  });
});

describe('measureImages', () => {
  it('counts data-URL characters and image count', () => {
    expect(measureImages({ a: URL_A, b: URL_B })).toEqual({
      bytes: URL_A.length + URL_B.length,
      count: 2,
    });
    expect(measureImages({})).toEqual({ bytes: 0, count: 0 });
    expect(measureImages(undefined)).toEqual({ bytes: 0, count: 0 });
  });
});
