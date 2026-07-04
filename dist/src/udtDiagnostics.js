"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UdtDiagnosticsRecorder = exports.InMemorySink = void 0;
exports.bytesToHex = bytesToHex;
const RING_BUFFER_SIZE = 500;
const RING_BUFFER_DRAIN = 50;
const BATTERY_HISTORY_SIZE = 60;
const PAYLOAD_MAX_BYTES = 32;
// Keep in sync with package.json's "version" at release time.
const LIBRARY_VERSION = '5.0.0';
function detectPlatform() {
    var _a;
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
        return 'web';
    }
    if (typeof process !== 'undefined' && ((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node)) {
        return 'node';
    }
    return 'custom';
}
function makeId() {
    // eslint-disable-next-line no-undef -- globalThis is ES2020+ standard; recognized by TS but not ESLint's legacy env config
    const g = globalThis;
    if (g.crypto && typeof g.crypto.randomUUID === 'function') {
        try {
            return g.crypto.randomUUID();
        }
        catch ( /* fallthrough */_a) { /* fallthrough */ }
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}
function bytesToHex(data, maxBytes = PAYLOAD_MAX_BYTES) {
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
class InMemorySink {
    constructor(maxIncidents = 50) {
        this.incidents = [];
        this.maxIncidents = maxIncidents;
    }
    onIncident(report) {
        this.incidents.push(report);
        if (this.incidents.length > this.maxIncidents) {
            this.incidents.splice(0, this.incidents.length - this.maxIncidents);
        }
    }
    list() {
        return [...this.incidents];
    }
    get(incidentId) {
        return this.incidents.find(r => r.incidentId === incidentId);
    }
    clear() {
        this.incidents = [];
    }
}
exports.InMemorySink = InMemorySink;
/**
 * BLE diagnostics recorder. Owned by an UltimateDarkTower instance.
 *
 * When `enabled` is false (default), all record* methods are no-ops aside from
 * a single boolean check. `enabled` can be flipped at runtime.
 */
class UdtDiagnosticsRecorder {
    constructor(config) {
        var _a, _b;
        this.events = [];
        this.batteryHistory = [];
        this.sessionId = '';
        this.connectedAt = null;
        this.lastIncident = null;
        this.enabled = config.enabled;
        this.capturePayloads = (_a = config.capturePayloads) !== null && _a !== void 0 ? _a : false;
        this.sinks = (_b = config.sinks) !== null && _b !== void 0 ? _b : [];
    }
    setSinks(sinks) {
        this.sinks = sinks;
    }
    getSinks() {
        return [...this.sinks];
    }
    addSink(sink) {
        this.sinks.push(sink);
    }
    /** Mark the start of a connected session. Called from BLE connect path. */
    beginSession() {
        if (!this.enabled)
            return;
        this.sessionId = makeId();
        this.connectedAt = Date.now();
        this.events = [];
        this.batteryHistory = [];
        this.recordEvent('connect');
    }
    recordEvent(kind, data) {
        if (!this.enabled)
            return;
        const event = { t: Date.now(), kind };
        if (data)
            event.data = data;
        this.events.push(event);
        if (this.events.length > RING_BUFFER_SIZE) {
            this.events.splice(0, RING_BUFFER_DRAIN);
        }
        for (const sink of this.sinks) {
            if (sink.onEvent) {
                try {
                    sink.onEvent(event);
                }
                catch (e) {
                    console.error('Diagnostics sink onEvent error:', e);
                }
            }
        }
    }
    recordCommandPayload(kind, data, extra) {
        if (!this.enabled)
            return;
        const payload = Object.assign({}, extra);
        if (this.capturePayloads) {
            payload.payloadHex = bytesToHex(data);
            payload.payloadLen = data.length;
        }
        this.recordEvent(kind, payload);
    }
    recordBattery(mv, pct) {
        if (!this.enabled)
            return;
        this.batteryHistory.push({ t: Date.now(), mv, pct });
        if (this.batteryHistory.length > BATTERY_HISTORY_SIZE) {
            this.batteryHistory.splice(0, this.batteryHistory.length - BATTERY_HISTORY_SIZE);
        }
    }
    /** Forwards a log line into the events ring (called by Logger when bridged). */
    recordLog(level, message, context) {
        if (!this.enabled)
            return;
        this.recordEvent('log', { level, message, context });
    }
    /**
     * Capture an incident snapshot and dispatch to sinks.
     * Must be called BEFORE the BLE layer clears state.
     */
    recordIncident(inputs) {
        if (!this.enabled)
            return null;
        const triggeredAt = Date.now();
        const inFlightCommandAgeMs = inputs.commandQueue.currentCommand
            ? triggeredAt - inputs.commandQueue.currentCommand.timestamp
            : null;
        const report = {
            schemaVersion: 1,
            incidentId: makeId(),
            sessionId: this.sessionId || makeId(),
            cause: inputs.cause,
            triggeredAt,
            connectedAt: this.connectedAt,
            sessionDurationMs: this.connectedAt ? triggeredAt - this.connectedAt : 0,
            connectionStatus: Object.assign({}, inputs.connectionStatus),
            deviceInformation: Object.assign({}, inputs.deviceInformation),
            commandQueue: {
                queueLength: inputs.commandQueue.queueLength,
                isProcessing: inputs.commandQueue.isProcessing,
                currentCommand: inputs.commandQueue.currentCommand
                    ? Object.assign({}, inputs.commandQueue.currentCommand) : null,
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
                if (result && typeof result.then === 'function') {
                    result.catch(e => console.error('Diagnostics sink onIncident error:', e));
                }
            }
            catch (e) {
                console.error('Diagnostics sink onIncident error:', e);
            }
        }
        return report;
    }
    getRingBuffer() {
        return [...this.events];
    }
    getBatteryHistory() {
        return [...this.batteryHistory];
    }
    getSessionId() {
        return this.sessionId;
    }
    getConnectedAt() {
        return this.connectedAt;
    }
    getLastIncident() {
        return this.lastIncident;
    }
    clearRingBuffer() {
        this.events = [];
        this.batteryHistory = [];
    }
}
exports.UdtDiagnosticsRecorder = UdtDiagnosticsRecorder;
//# sourceMappingURL=udtDiagnostics.js.map