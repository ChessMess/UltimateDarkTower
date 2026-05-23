/**
 * BLE disconnect diagnostics ("flight recorder").
 *
 * Captures a structured ring buffer of recent BLE events and a snapshot of
 * connection state at the moment a disconnect is detected. Output goes to
 * pluggable sinks (in-memory, IndexedDB, custom).
 *
 * Off by default. Enable via UltimateDarkTowerConfig.diagnostics.enabled.
 *
 * See docs/BLE_DIAGNOSTICS.md for usage.
 */

import type { ConnectionStatus, DeviceInformation } from './udtBleConnection';
import type { TowerState } from './udtTowerState';
import type { LogLevel } from './udtLogger';

export type DisconnectCause =
    | 'adapter_event'
    | 'gatt_health_check'
    | 'heartbeat_timeout'
    | 'response_timeout'
    | 'bt_unavailable'
    | 'user_initiated'
    | 'page_unload';

export type DiagEventKind =
    | 'connect'
    | 'disconnect'
    | 'cmd_enqueued'
    | 'cmd_sent'
    | 'cmd_response'
    | 'cmd_timeout'
    | 'cmd_failed'
    | 'tower_state_response'
    | 'skull_drop'
    | 'heartbeat_late'
    | 'calibration_started'
    | 'calibration_complete'
    | 'log';

export interface DiagEvent {
    t: number;
    kind: DiagEventKind;
    data?: Record<string, unknown>;
}

export interface BatterySample {
    t: number;
    mv: number;
    pct: number;
}

export interface CommandQueueSnapshot {
    queueLength: number;
    isProcessing: boolean;
    currentCommand: { id: string; description?: string; timestamp: number } | null;
}

export interface IncidentReport {
    schemaVersion: 1;
    incidentId: string;
    sessionId: string;
    cause: DisconnectCause;
    triggeredAt: number;
    connectedAt: number | null;
    sessionDurationMs: number;

    connectionStatus: ConnectionStatus;
    deviceInformation: DeviceInformation;
    commandQueue: CommandQueueSnapshot;
    inFlightCommandAgeMs: number | null;
    towerState: TowerState | null;
    brokenSeals: string[];

    recentEvents: DiagEvent[];
    batteryHistory: BatterySample[];

    library: { version: string; platform: 'web' | 'node' | 'custom' };
    userAgent?: string;
}

export interface DiagnosticsSink {
    onEvent?(event: DiagEvent): void;
    onIncident(report: IncidentReport): void | Promise<void>;
}

export interface DiagnosticsConfig {
    enabled: boolean;
    capturePayloads?: boolean;
    sinks?: DiagnosticsSink[];
}

export interface IncidentSnapshotInputs {
    cause: DisconnectCause;
    connectionStatus: ConnectionStatus;
    deviceInformation: DeviceInformation;
    commandQueue: CommandQueueSnapshot;
    towerState: TowerState | null;
    brokenSeals: string[];
}

const RING_BUFFER_SIZE = 500;
const RING_BUFFER_DRAIN = 50;
const BATTERY_HISTORY_SIZE = 60;
const PAYLOAD_MAX_BYTES = 32;
const LIBRARY_VERSION = '3.0.0';

function detectPlatform(): 'web' | 'node' | 'custom' {
    if (typeof window !== 'undefined' && typeof (window as unknown as { navigator?: { bluetooth?: unknown } }).navigator !== 'undefined') {
        return 'web';
    }
    if (typeof process !== 'undefined' && (process as { versions?: { node?: string } }).versions?.node) {
        return 'node';
    }
    return 'custom';
}

function makeId(): string {
    const g = (globalThis as unknown as { crypto?: { randomUUID?: () => string } });
    if (g.crypto && typeof g.crypto.randomUUID === 'function') {
        try { return g.crypto.randomUUID(); } catch { /* fallthrough */ }
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function bytesToHex(data: Uint8Array, maxBytes: number = PAYLOAD_MAX_BYTES): string {
    const slice = data.length > maxBytes ? data.subarray(0, maxBytes) : data;
    let out = '';
    for (let i = 0; i < slice.length; i++) {
        out += slice[i].toString(16).padStart(2, '0');
    }
    if (data.length > maxBytes) {
        out += `..(+${data.length - maxBytes})`;
    }
    return out;
}

export class InMemorySink implements DiagnosticsSink {
    private incidents: IncidentReport[] = [];
    private maxIncidents: number;

    constructor(maxIncidents: number = 50) {
        this.maxIncidents = maxIncidents;
    }

    onIncident(report: IncidentReport): void {
        this.incidents.push(report);
        if (this.incidents.length > this.maxIncidents) {
            this.incidents.splice(0, this.incidents.length - this.maxIncidents);
        }
    }

    list(): IncidentReport[] {
        return [...this.incidents];
    }

    get(incidentId: string): IncidentReport | undefined {
        return this.incidents.find(r => r.incidentId === incidentId);
    }

    clear(): void {
        this.incidents = [];
    }
}

/**
 * BLE diagnostics recorder. Owned by an UltimateDarkTower instance.
 *
 * When `enabled` is false (default), all record* methods are no-ops aside from
 * a single boolean check. `enabled` can be flipped at runtime.
 */
export class UdtDiagnosticsRecorder {
    enabled: boolean;
    capturePayloads: boolean;
    private sinks: DiagnosticsSink[];

    private events: DiagEvent[] = [];
    private batteryHistory: BatterySample[] = [];

    private sessionId: string = '';
    private connectedAt: number | null = null;
    private lastIncident: IncidentReport | null = null;

    constructor(config: DiagnosticsConfig) {
        this.enabled = config.enabled;
        this.capturePayloads = config.capturePayloads ?? false;
        this.sinks = config.sinks ?? [];
    }

    setSinks(sinks: DiagnosticsSink[]): void {
        this.sinks = sinks;
    }

    getSinks(): DiagnosticsSink[] {
        return [...this.sinks];
    }

    addSink(sink: DiagnosticsSink): void {
        this.sinks.push(sink);
    }

    /** Mark the start of a connected session. Called from BLE connect path. */
    beginSession(): void {
        if (!this.enabled) return;
        this.sessionId = makeId();
        this.connectedAt = Date.now();
        this.events = [];
        this.batteryHistory = [];
        this.recordEvent('connect');
    }

    recordEvent(kind: DiagEventKind, data?: Record<string, unknown>): void {
        if (!this.enabled) return;
        const event: DiagEvent = { t: Date.now(), kind };
        if (data) event.data = data;
        this.events.push(event);
        if (this.events.length > RING_BUFFER_SIZE) {
            this.events.splice(0, RING_BUFFER_DRAIN);
        }
        for (const sink of this.sinks) {
            if (sink.onEvent) {
                try { sink.onEvent(event); } catch (e) { console.error('Diagnostics sink onEvent error:', e); }
            }
        }
    }

    recordCommandPayload(kind: 'cmd_sent' | 'cmd_response', data: Uint8Array, extra?: Record<string, unknown>): void {
        if (!this.enabled) return;
        const payload: Record<string, unknown> = { ...extra };
        if (this.capturePayloads) {
            payload.payloadHex = bytesToHex(data);
            payload.payloadLen = data.length;
        }
        this.recordEvent(kind, payload);
    }

    recordBattery(mv: number, pct: number): void {
        if (!this.enabled) return;
        this.batteryHistory.push({ t: Date.now(), mv, pct });
        if (this.batteryHistory.length > BATTERY_HISTORY_SIZE) {
            this.batteryHistory.splice(0, this.batteryHistory.length - BATTERY_HISTORY_SIZE);
        }
    }

    /** Forwards a log line into the events ring (called by Logger when bridged). */
    recordLog(level: LogLevel, message: string, context?: string): void {
        if (!this.enabled) return;
        this.recordEvent('log', { level, message, context });
    }

    /**
     * Capture an incident snapshot and dispatch to sinks.
     * Must be called BEFORE the BLE layer clears state.
     */
    recordIncident(inputs: IncidentSnapshotInputs): IncidentReport | null {
        if (!this.enabled) return null;

        const triggeredAt = Date.now();
        const inFlightCommandAgeMs = inputs.commandQueue.currentCommand
            ? triggeredAt - inputs.commandQueue.currentCommand.timestamp
            : null;

        const report: IncidentReport = {
            schemaVersion: 1,
            incidentId: makeId(),
            sessionId: this.sessionId || makeId(),
            cause: inputs.cause,
            triggeredAt,
            connectedAt: this.connectedAt,
            sessionDurationMs: this.connectedAt ? triggeredAt - this.connectedAt : 0,
            connectionStatus: { ...inputs.connectionStatus },
            deviceInformation: { ...inputs.deviceInformation },
            commandQueue: {
                queueLength: inputs.commandQueue.queueLength,
                isProcessing: inputs.commandQueue.isProcessing,
                currentCommand: inputs.commandQueue.currentCommand
                    ? { ...inputs.commandQueue.currentCommand }
                    : null,
            },
            inFlightCommandAgeMs,
            towerState: inputs.towerState ? JSON.parse(JSON.stringify(inputs.towerState)) : null,
            brokenSeals: [...inputs.brokenSeals],
            recentEvents: [...this.events],
            batteryHistory: [...this.batteryHistory],
            library: { version: LIBRARY_VERSION, platform: detectPlatform() },
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        };

        this.lastIncident = report;
        this.recordEvent('disconnect', { cause: inputs.cause });

        for (const sink of this.sinks) {
            try {
                const result = sink.onIncident(report);
                if (result && typeof (result as Promise<void>).then === 'function') {
                    (result as Promise<void>).catch(e => console.error('Diagnostics sink onIncident error:', e));
                }
            } catch (e) {
                console.error('Diagnostics sink onIncident error:', e);
            }
        }

        return report;
    }

    getRingBuffer(): DiagEvent[] {
        return [...this.events];
    }

    getBatteryHistory(): BatterySample[] {
        return [...this.batteryHistory];
    }

    getSessionId(): string {
        return this.sessionId;
    }

    getConnectedAt(): number | null {
        return this.connectedAt;
    }

    getLastIncident(): IncidentReport | null {
        return this.lastIncident;
    }

    clearRingBuffer(): void {
        this.events = [];
        this.batteryHistory = [];
    }
}
