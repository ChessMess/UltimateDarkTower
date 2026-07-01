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

import type { Status, InputRequest } from '../types';

const DB_NAME = 'udt-player';
const STORE = 'session';
const KEY = 'current';
const DB_VERSION = 1;

export interface SavedSession {
  version: 1; // snapshot format version
  engineVersion: string; // ENGINE_VERSION at save time
  scenario: unknown; // loaded scenario doc
  serializedState: string; // JSON.stringify(engineState)
  status: Status;
  awaiting: InputRequest | null;
  boardState: unknown | null; // board().getState() when ready
  lastCommand: number[]; // checkpoint.lastCommand (tower resync)
  seq: number; // checkpoint.seq
  log: string[]; // event log (already capped at 200)
  scenarioName: string; // resume-prompt label
  savedAt: number; // Date.now()
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

export async function clearSession(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}
