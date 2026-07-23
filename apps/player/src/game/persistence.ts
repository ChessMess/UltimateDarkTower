// Session persistence — durable recovery across page refreshes.
//
// The player's in-memory Zustand store is lost on reload; this module snapshots
// the recoverable slice (engine state + derived board state + meta) into
// IndexedDB so an in-progress game can be resumed. Engine state is stored as a
// JSON string for round-tripping through @udtc/engine's deserialize(); the
// scenario doc and board state are structured objects IndexedDB stores directly.
//
// Every call is guarded: if IndexedDB is unavailable (private mode, quota, etc.)
// persistence silently degrades to a no-op — it must never throw and break play.

import type { Status, InputRequest, BattlePromptPayload } from '../types';

const DB_NAME = 'udt-player';
const STORE = 'session';
const KEY = 'current';
// The exact JSON text `saveSession` wrote, stored as a sibling of `KEY` in the same
// transaction — the true "raw" source for the stale-save dialog's download, since IndexedDB
// itself stores a structured clone, not bytes. Absent for a record saved before this sibling
// existed; `checkForResumableSession` falls back to re-serializing the structured clone then.
const KEY_RAW = 'current-raw';
const DB_VERSION = 1;

export interface SavedSession {
  /**
   * Snapshot format version. v1 records carry `boardState` in `ultimatedarktowerboard`'s
   * pre-0.5.0 bucket shape (`heroes`/`foes`/`buildings`/…), which this build can no longer
   * read — v2 is `BoardState`'s current one-`tokens`-collection shape. Refused, not migrated:
   * `checkForResumableSession` detects a mismatch (or an absent stamp) and surfaces it via
   * `staleSave` so the LoadPanel can offer a download before the save is discarded.
   */
  version: 2;
  engineVersion: string; // ENGINE_VERSION at save time
  scenario: unknown; // loaded scenario doc
  serializedState: string; // JSON.stringify(engineState)
  status: Status;
  awaiting: InputRequest | null;
  battlePrompt: BattlePromptPayload | null; // card-battle presentation (only during a card battle)
  boardState: unknown | null; // board().getState() when ready
  lastCommand: number[]; // checkpoint.lastCommand (tower resync)
  seq: number; // checkpoint.seq
  log: string[]; // event log (already capped at 200)
  scenarioName: string; // resume-prompt label
  savedAt: number; // Date.now()
  revealedRooms?: Record<string, string[]>; // app-side dungeon fog overlay (optional; v1-compatible)
}

/** Small subset surfaced to the resume prompt. */
export interface SavedSessionMeta {
  scenarioName: string;
  seq: number;
  savedAt: number;
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
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveSession(session: SavedSession): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(session, KEY);
      // Written from `session` directly, before any structured-clone round trip, so it's a
      // faithful snapshot even for fields (e.g. an explicit `undefined`) a clone read-back
      // could handle differently than the original object.
      tx.objectStore(STORE).put(JSON.stringify(session, null, 2), KEY_RAW);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}

export async function loadSession(): Promise<SavedSession | null> {
  const db = await openDb();
  if (!db) return null;
  const result = await new Promise<SavedSession | null>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as SavedSession | undefined) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  db.close();
  return result;
}

/**
 * The exact JSON text `saveSession` most recently wrote (see `KEY_RAW`), or `null` if none was
 * ever written — either nothing has been saved, or the record predates this sibling existing.
 * Callers that need a "raw" copy of an unreadable record (`checkForResumableSession`'s stale-save
 * path) should prefer this over re-serializing the structured clone `loadSession` returns, and
 * fall back to that re-serialization only when this comes back `null`.
 */
export async function loadRawSession(): Promise<string | null> {
  const db = await openDb();
  if (!db) return null;
  const result = await new Promise<string | null>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY_RAW);
      req.onsuccess = () => resolve((req.result as string | undefined) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  db.close();
  return result;
}

/**
 * Trigger a browser download of `raw` (see `loadRawSession`) so a player can keep a copy of a
 * stale/unreadable save before it's discarded — see `staleSave` in the store.
 */
export function downloadRawSession(
  raw: string,
  fileName = `udt-player-save-${Date.now()}.json`,
): void {
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function clearSession(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.objectStore(STORE).delete(KEY_RAW);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}
