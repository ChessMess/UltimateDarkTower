// scenarioDb — the Creator's scenario library, and the Creator→Player handoff channel.
//
// Modelled on apps/player/src/game/persistence.ts: raw IndexedDB, no dependencies, openDb()
// resolves null on any failure, every call guarded. Keep that discipline — persistence must never
// throw and break authoring.
//
// THREE STORES, because they have different write frequencies:
//   meta   — one small record per scenario. The list reads ONLY this, so rendering is O(list
//            length), not O(bytes): it never deserializes a document or touches image payloads.
//   docs   — the document WITHOUT its images (a few KB). Written on every autosave.
//   images — the image map (megabytes). Written ONLY when the images actually changed.
// See split.ts for why the images are separated at all.
//
// SHARED ORIGIN: the Creator and Player are same-origin siblings when deployed
// (/UltimateDarkTower/creator/ and /player/), so both can open this database — that is what makes
// "Open in Player" work without a file round-trip. In dev they run on localhost:5173 and :5174,
// which are DIFFERENT origins and therefore do NOT share it. Use `pnpm preview:site` to test the
// handoff faithfully.

import type { ImageMap, ScenarioDocLike } from './split';

const DB_NAME = 'udt-scenarios';
const DB_VERSION = 1;
const STORE_META = 'meta';
const STORE_DOCS = 'docs';
const STORE_IMAGES = 'images';

/** Snapshot format version. There is no migration machinery anywhere in this repo — a mismatch is
 *  discarded rather than upgraded, exactly as the old localStorage draft did. Bump deliberately. */
export const SNAPSHOT_VERSION = 1;

/** The list row. Everything here must be cheap — this is what makes the list O(list length). */
export interface ScenarioMeta {
  version: number;
  id: string;
  title: string;
  scenarioVersion?: string;
  updatedAt: number;
  /** data-URL characters of all images (≈ bytes added to the exported .json) */
  imageBytes: number;
  imageCount: number;
  /**
   * L1/L2/L3 validity at save time. `null` means "not validated yet" — a document that arrived by
   * migration or import has no validation results, and null must NOT be conflated with false.
   */
  allOk: boolean | null;
  /** Date.now() of the last Export, or null if never exported. Browser storage is evictable; a
   *  scenario that has never been exported has no durable copy anywhere. */
  lastExportedAt: number | null;
}

/** A scenario read back from storage, in parts. Rejoin with joinImages(doc, images). */
export interface StoredScenario {
  meta: ScenarioMeta;
  /** the document WITHOUT library.resources.images */
  doc: ScenarioDocLike;
  images: ImageMap;
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META);
        if (!db.objectStoreNames.contains(STORE_DOCS)) db.createObjectStore(STORE_DOCS);
        if (!db.objectStoreNames.contains(STORE_IMAGES)) db.createObjectStore(STORE_IMAGES);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function reqToPromise<T>(makeReq: () => IDBRequest<T>): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      const req = makeReq();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Ask the browser to exempt this origin from eviction.
 *
 * Without this, IndexedDB is best-effort storage: Safari's ITP drops it after ~7 days without
 * interaction and Chrome evicts under storage pressure. Once the library is where authored work
 * lives, an eviction is data loss — so ask once, on the first save. Returns false when unsupported
 * or denied; the caller must treat that as "keep nudging the author to Export", never as an error.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Real quota headroom, when the browser will tell us. Both fields may be undefined. */
export async function storageEstimate(): Promise<{ usage?: number; quota?: number } | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
    const { usage, quota } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}

/** Every saved scenario's metadata, newest first. Never touches docs or images. */
export async function listScenarios(): Promise<ScenarioMeta[]> {
  const db = await openDb();
  if (!db) return [];
  const rows = await reqToPromise<ScenarioMeta[]>(() =>
    db.transaction(STORE_META, 'readonly').objectStore(STORE_META).getAll(),
  );
  db.close();
  if (!rows) return [];
  return rows
    .filter((r) => r && r.version === SNAPSHOT_VERSION)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Write a scenario.
 *
 * `images` is written only when `writeImages` is true — the caller decides that by comparing the
 * images map's object identity against the last write. That check is why the autosave hot path
 * costs kilobytes instead of megabytes; see split.ts.
 *
 * Returns false when storage is unavailable or the write failed (quota, eviction, private mode).
 * Never throws.
 */
export async function saveScenario(
  meta: ScenarioMeta,
  docSansImages: ScenarioDocLike,
  images: ImageMap,
  writeImages: boolean,
): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  const ok = await new Promise<boolean>((resolve) => {
    try {
      const stores = writeImages
        ? [STORE_META, STORE_DOCS, STORE_IMAGES]
        : [STORE_META, STORE_DOCS];
      const tx = db.transaction(stores, 'readwrite');
      tx.objectStore(STORE_META).put(meta, meta.id);
      tx.objectStore(STORE_DOCS).put(docSansImages, meta.id);
      if (writeImages) tx.objectStore(STORE_IMAGES).put(images, meta.id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
  db.close();
  return ok;
}

/**
 * Read a scenario's three parts back. The caller rejoins them with joinImages(), which keeps this
 * module free of document semantics.
 *
 * Returns null when the id is unknown — a NORMAL outcome, not an error: the scenario was deleted,
 * storage was cleared, the browser evicted it, or (in dev) the Player is on a different origin than
 * the Creator that saved it. Callers must offer the file-import fallback.
 */
export async function loadScenarioParts(id: string): Promise<StoredScenario | null> {
  const db = await openDb();
  if (!db) return null;
  const meta = await reqToPromise<ScenarioMeta>(() =>
    db.transaction(STORE_META, 'readonly').objectStore(STORE_META).get(id),
  );
  if (!meta || meta.version !== SNAPSHOT_VERSION) {
    db.close();
    return null;
  }
  const doc = await reqToPromise<ScenarioDocLike>(() =>
    db.transaction(STORE_DOCS, 'readonly').objectStore(STORE_DOCS).get(id),
  );
  if (!doc) {
    db.close();
    return null;
  }
  const images = await reqToPromise<ImageMap>(() =>
    db.transaction(STORE_IMAGES, 'readonly').objectStore(STORE_IMAGES).get(id),
  );
  db.close();
  return { meta, doc, images: images ?? {} };
}

/** Delete a scenario and all three of its records. */
export async function deleteScenario(id: string): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  const ok = await new Promise<boolean>((resolve) => {
    try {
      const tx = db.transaction([STORE_META, STORE_DOCS, STORE_IMAGES], 'readwrite');
      tx.objectStore(STORE_META).delete(id);
      tx.objectStore(STORE_DOCS).delete(id);
      tx.objectStore(STORE_IMAGES).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
  db.close();
  return ok;
}

/** Patch a scenario's meta record in place (rename, lastExportedAt). No-op if the id is unknown. */
export async function patchScenarioMeta(
  id: string,
  patch: Partial<Omit<ScenarioMeta, 'id' | 'version'>>,
): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  const existing = await reqToPromise<ScenarioMeta>(() =>
    db.transaction(STORE_META, 'readonly').objectStore(STORE_META).get(id),
  );
  if (!existing) {
    db.close();
    return false;
  }
  const ok = await new Promise<boolean>((resolve) => {
    try {
      const tx = db.transaction(STORE_META, 'readwrite');
      tx.objectStore(STORE_META).put({ ...existing, ...patch }, id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
  db.close();
  return ok;
}

/** A fresh scenario id. Only ever lives in this envelope — the schema forbids an id in the
 *  document (root and meta are both additionalProperties:false, and meta has no `id` property). */
export function newScenarioId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    // fall through
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
