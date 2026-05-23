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
import type { DiagnosticsSink, IncidentReport } from '../udtDiagnostics';
export declare class IndexedDBSink implements DiagnosticsSink {
    private maxIncidents;
    private dbPromise;
    private available;
    constructor(maxIncidents?: number);
    private getDb;
    onIncident(report: IncidentReport): Promise<void>;
    list(): Promise<IncidentReport[]>;
    get(incidentId: string): Promise<IncidentReport | undefined>;
    delete(incidentId: string): Promise<void>;
    clear(): Promise<void>;
    /** Insert an externally-supplied report (e.g. from a JSON import). */
    put(report: IncidentReport): Promise<void>;
    private evictOld;
}
