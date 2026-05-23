"use strict";
/**
 * Browser-only durable sink. Persists incidents to IndexedDB so they survive
 * page refresh and tab close.
 *
 * Quota policy: keeps at most `maxIncidents` (default 50). Oldest by
 * triggeredAt are evicted. Reads are async via list() / get().
 *
 * Falls back to a no-op if IndexedDB is unavailable (server-side rendering,
 * old browsers, file:// protocol with restrictive policies, etc.).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexedDBSink = void 0;
const DB_NAME = 'udt-diagnostics';
const DB_VERSION = 1;
const STORE_NAME = 'incidents';
function indexedDBAvailable() {
    try {
        return typeof indexedDB !== 'undefined';
    }
    catch (_a) {
        return false;
    }
}
function openDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'incidentId' });
                store.createIndex('triggeredAt', 'triggeredAt', { unique: false });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
class IndexedDBSink {
    constructor(maxIncidents = 50) {
        this.dbPromise = null;
        this.maxIncidents = maxIncidents;
        this.available = indexedDBAvailable();
    }
    async getDb() {
        if (!this.available)
            return null;
        if (!this.dbPromise) {
            this.dbPromise = openDb().catch(err => {
                this.available = false;
                this.dbPromise = null;
                throw err;
            });
        }
        try {
            return await this.dbPromise;
        }
        catch (_a) {
            return null;
        }
    }
    async onIncident(report) {
        const db = await this.getDb();
        if (!db)
            return;
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put(report);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        }).catch(e => console.error('IndexedDBSink put failed:', e));
        await this.evictOld();
    }
    async list() {
        const db = await this.getDb();
        if (!db)
            return [];
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => {
                const all = req.result.slice();
                all.sort((a, b) => b.triggeredAt - a.triggeredAt);
                resolve(all);
            };
            req.onerror = () => reject(req.error);
        });
    }
    async get(incidentId) {
        const db = await this.getDb();
        if (!db)
            return undefined;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(incidentId);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
    async delete(incidentId) {
        const db = await this.getDb();
        if (!db)
            return;
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(incidentId);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        }).catch(e => console.error('IndexedDBSink delete failed:', e));
    }
    async clear() {
        const db = await this.getDb();
        if (!db)
            return;
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        }).catch(e => console.error('IndexedDBSink clear failed:', e));
    }
    /** Insert an externally-supplied report (e.g. from a JSON import). */
    async put(report) {
        return this.onIncident(report);
    }
    async evictOld() {
        const db = await this.getDb();
        if (!db)
            return;
        await new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const countReq = store.count();
            countReq.onsuccess = () => {
                const total = countReq.result;
                if (total <= this.maxIncidents) {
                    resolve();
                    return;
                }
                const toRemove = total - this.maxIncidents;
                const idx = store.index('triggeredAt');
                const cursorReq = idx.openCursor();
                let removed = 0;
                cursorReq.onsuccess = () => {
                    const cursor = cursorReq.result;
                    if (!cursor || removed >= toRemove) {
                        resolve();
                        return;
                    }
                    cursor.delete();
                    removed++;
                    cursor.continue();
                };
                cursorReq.onerror = () => resolve();
            };
            countReq.onerror = () => resolve();
        });
    }
}
exports.IndexedDBSink = IndexedDBSink;
//# sourceMappingURL=IndexedDBSink.js.map