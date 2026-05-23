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
export type DisconnectCause = 'adapter_event' | 'gatt_health_check' | 'heartbeat_timeout' | 'response_timeout' | 'bt_unavailable' | 'user_initiated' | 'page_unload';
export type DiagEventKind = 'connect' | 'disconnect' | 'cmd_enqueued' | 'cmd_sent' | 'cmd_response' | 'cmd_timeout' | 'cmd_failed' | 'tower_state_response' | 'skull_drop' | 'heartbeat_late' | 'calibration_started' | 'calibration_complete' | 'log';
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
    currentCommand: {
        id: string;
        description?: string;
        timestamp: number;
    } | null;
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
    library: {
        version: string;
        platform: 'web' | 'node' | 'custom';
    };
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
export declare function bytesToHex(data: Uint8Array, maxBytes?: number): string;
export declare class InMemorySink implements DiagnosticsSink {
    private incidents;
    private maxIncidents;
    constructor(maxIncidents?: number);
    onIncident(report: IncidentReport): void;
    list(): IncidentReport[];
    get(incidentId: string): IncidentReport | undefined;
    clear(): void;
}
/**
 * BLE diagnostics recorder. Owned by an UltimateDarkTower instance.
 *
 * When `enabled` is false (default), all record* methods are no-ops aside from
 * a single boolean check. `enabled` can be flipped at runtime.
 */
export declare class UdtDiagnosticsRecorder {
    enabled: boolean;
    capturePayloads: boolean;
    private sinks;
    private events;
    private batteryHistory;
    private sessionId;
    private connectedAt;
    private lastIncident;
    constructor(config: DiagnosticsConfig);
    setSinks(sinks: DiagnosticsSink[]): void;
    getSinks(): DiagnosticsSink[];
    addSink(sink: DiagnosticsSink): void;
    /** Mark the start of a connected session. Called from BLE connect path. */
    beginSession(): void;
    recordEvent(kind: DiagEventKind, data?: Record<string, unknown>): void;
    recordCommandPayload(kind: 'cmd_sent' | 'cmd_response', data: Uint8Array, extra?: Record<string, unknown>): void;
    recordBattery(mv: number, pct: number): void;
    /** Forwards a log line into the events ring (called by Logger when bridged). */
    recordLog(level: LogLevel, message: string, context?: string): void;
    /**
     * Capture an incident snapshot and dispatch to sinks.
     * Must be called BEFORE the BLE layer clears state.
     */
    recordIncident(inputs: IncidentSnapshotInputs): IncidentReport | null;
    getRingBuffer(): DiagEvent[];
    getBatteryHistory(): BatterySample[];
    getSessionId(): string;
    getConnectedAt(): number | null;
    getLastIncident(): IncidentReport | null;
    clearRingBuffer(): void;
}
