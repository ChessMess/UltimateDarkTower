"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TowerEmulatorAdapter = void 0;
const EMULATED_BATTERY_MV = 3600;
const BATTERY_HEARTBEAT_INTERVAL_MS = 200;
const INITIAL_STATE_RESPONSE_DELAY_MS = 0;
const COMMAND_RESPONSE_DELAY_MS = 50;
// Safety net only. Calibration normally completes when the emulator popup
// reports its visual sweep finished (via completeCalibration()); this fires
// only if that signal never arrives — e.g. the popup is closed, headless, or
// the 3D model never loaded. Comfortably above the worst-case sweep (~20s).
const CALIBRATION_FALLBACK_MS = 30000;
// Response type byte values (from TC constants in udtConstants.ts)
const TOWER_STATE_RESPONSE = 0x00;
const BATTERY_RESPONSE = 0x07;
const CMD_CALIBRATE = 4;
/**
 * A software-only Bluetooth adapter that simulates tower responses for use
 * with the Tower Emulator display window. No real BLE hardware required.
 *
 * Behavior:
 * - Stateful commands (byte 0 = 0x00): echoed back immediately as TOWER_STATE responses
 * - Calibration command (byte 0 = 4): answered with TWO responses, like real firmware — an
 *   immediate ack (so Tower.calibrate() resolves and the library arms calibration tracking),
 *   then a second TOWER_STATE emitted by completeCalibration() when the emulator popup reports
 *   its real sweep finished (or after CALIBRATION_FALLBACK_MS) — that second one fires
 *   onCalibrationComplete
 * - Other basic commands: echoes back the last known state packet
 * - Battery heartbeat: fires every 200ms so connection health monitoring stays satisfied
 */
class TowerEmulatorAdapter {
    constructor(options = {}) {
        this.options = options;
        this.connected = false;
        // Set while a calibration command is awaiting its completion reply. The reply
        // fires from completeCalibration() (popup-driven) or the fallback timer.
        this.calibrationPending = false;
        // Tracks the last 20-byte stateful command so non-stateful responses preserve current state
        this.lastStatePacket = new Uint8Array(20);
    }
    async connect(_deviceName, _serviceUuids) {
        this.connected = true;
        // Emit an initial state packet so the emulator window renders immediately after connect.
        setTimeout(() => {
            var _a;
            (_a = this.rxCallback) === null || _a === void 0 ? void 0 : _a.call(this, new Uint8Array(this.lastStatePacket));
        }, INITIAL_STATE_RESPONSE_DELAY_MS);
        this.batteryInterval = setInterval(() => {
            var _a;
            (_a = this.rxCallback) === null || _a === void 0 ? void 0 : _a.call(this, this.createBatteryResponse());
        }, BATTERY_HEARTBEAT_INTERVAL_MS);
    }
    async disconnect() {
        this.connected = false;
        this.stopBatteryHeartbeat();
        this.cancelCalibration();
    }
    /**
     * Emit the calibrated TOWER_STATE response that signals calibration is
     * complete. Called by the controller when the emulator popup reports its
     * visual sweep has finished (or by the fallback timer). No-op unless a
     * calibration command is currently pending, so stray calls can't inject a
     * spurious state.
     */
    completeCalibration() {
        var _a;
        if (!this.calibrationPending)
            return;
        this.cancelCalibration();
        // (2) completion — a second TOWER_STATE the library reads while
        // `performingCalibration` is armed, which fires onCalibrationComplete AND
        // updates the tower state to all-drums-calibrated. The library strips the
        // 1-byte command prefix (response.slice(1)) before unpacking the real state
        // (UltimateDarkTower.updateTowerStateFromResponse), so byte 0 stays 0x00 (→
        // recognised as TOWER_STATE) and the calibrated bits live in bytes 1–2.
        const calibratedResponse = this.createCalibratedStateResponse();
        this.lastStatePacket = new Uint8Array(calibratedResponse);
        (_a = this.rxCallback) === null || _a === void 0 ? void 0 : _a.call(this, calibratedResponse);
    }
    cancelCalibration() {
        this.calibrationPending = false;
        if (this.calibrationFallbackTimer) {
            clearTimeout(this.calibrationFallbackTimer);
            this.calibrationFallbackTimer = undefined;
        }
    }
    isConnected() {
        return this.connected;
    }
    isGattConnected() {
        return this.connected;
    }
    async writeCharacteristic(data) {
        var _a, _b, _c, _d;
        const commandType = data[0];
        if (data.length >= 20 && commandType === TOWER_STATE_RESPONSE) {
            // Stateful command — cache it and echo back as a TOWER_STATE response
            this.lastStatePacket = new Uint8Array(data);
            setTimeout(() => { var _a; return (_a = this.rxCallback) === null || _a === void 0 ? void 0 : _a.call(this, new Uint8Array(data)); }, COMMAND_RESPONSE_DELAY_MS);
            // Audio detection: state_data[14] = sample (bits 0–6) | loop (bit 7); state_data[17] bits 4–7 = volume
            // Command packet has a 1-byte type prefix (data[0]), so state_data[n] = data[n+1]
            const sample = data[15] & 0x7f;
            if (sample !== 0) {
                const loop = !!(data[15] & 0x80);
                const volume = (data[18] & 0xf0) >> 4;
                (_b = (_a = this.options).onAudioCommand) === null || _b === void 0 ? void 0 : _b.call(_a, sample, loop, volume);
            }
            // LED sequence detection: state_data[18] = led_sequence byte → data[19]
            // (after the 1-byte type prefix). Same fire-and-forget shape as audio:
            // framework's response handler strips it before any state propagates.
            const sequenceId = data[19];
            if (sequenceId !== 0) {
                (_d = (_c = this.options).onLightSequenceCommand) === null || _d === void 0 ? void 0 : _d.call(_c, sequenceId);
            }
        }
        else if (data.length === 1 && commandType === CMD_CALIBRATE) {
            // Calibration takes TWO responses, mirroring real tower firmware:
            //   1) an immediate ack (this echo) so the library's command queue
            //      resolves Tower.calibrate() and then arms `performingCalibration`;
            //   2) a later TOWER_STATE (completeCalibration(), below) that the library
            //      sees while `performingCalibration` is armed → fires onCalibrationComplete.
            // A single response can't work: the library arms the flag only AFTER the
            // command's ack, and handleTowerStateResponse runs before the command
            // completes — so the completion state must arrive after the ack.
            this.calibrationPending = true;
            if (this.calibrationFallbackTimer)
                clearTimeout(this.calibrationFallbackTimer);
            this.calibrationFallbackTimer = setTimeout(() => this.completeCalibration(), CALIBRATION_FALLBACK_MS);
            // (1) ack — echo current state so the command resolves.
            setTimeout(() => { var _a; return (_a = this.rxCallback) === null || _a === void 0 ? void 0 : _a.call(this, new Uint8Array(this.lastStatePacket)); }, COMMAND_RESPONSE_DELAY_MS);
        }
        else {
            // Other basic commands (unjam, reset counter, etc.) — echo last known state
            setTimeout(() => { var _a; return (_a = this.rxCallback) === null || _a === void 0 ? void 0 : _a.call(this, new Uint8Array(this.lastStatePacket)); }, COMMAND_RESPONSE_DELAY_MS);
        }
    }
    onCharacteristicValueChanged(callback) {
        this.rxCallback = callback;
    }
    onDisconnect(callback) {
        this.disconnectCallback = callback;
    }
    onBluetoothAvailabilityChanged(callback) {
        this.availabilityCallback = callback;
    }
    async readDeviceInformation() {
        return {
            modelNumber: 'Tower Emulator',
            firmwareRevision: '0.0.0',
        };
    }
    async cleanup() {
        this.connected = false;
        this.stopBatteryHeartbeat();
        this.cancelCalibration();
        this.lastStatePacket = new Uint8Array(20);
        this.rxCallback = undefined;
        this.disconnectCallback = undefined;
        this.availabilityCallback = undefined;
    }
    stopBatteryHeartbeat() {
        if (this.batteryInterval) {
            clearInterval(this.batteryInterval);
            this.batteryInterval = undefined;
        }
    }
    createBatteryResponse() {
        // Battery response format: [0x07, 0x00, 0x00, highByte, lowByte]
        // getMilliVoltsFromTowerResponse reads bytes 3 (high) and 4 (low) as a big-endian 16-bit value
        const response = new Uint8Array(5);
        response[0] = BATTERY_RESPONSE;
        response[3] = (EMULATED_BATTERY_MV >> 8) & 0xff;
        response[4] = EMULATED_BATTERY_MV & 0xff;
        return response;
    }
    createCalibratedStateResponse() {
        // 20-byte TOWER_STATE response with all 3 drums calibrated at position 0 (north).
        // The library strips byte 0 (command prefix) before unpacking the state, so the
        // state bytes are offset by one from rtdt_unpack_state's data[] indices:
        //   Byte 0: 0x00 — command prefix / TOWER_STATE type (kept 0 so it's recognised)
        //   Byte 1 (state data[0]): drum[0].calibrated = bit 4 → 0x10
        //   Byte 2 (state data[1]): drum[1].calibrated = bit 1 (0x02) | drum[2].calibrated = bit 6 (0x40) → 0x42
        //   Bytes 3–19: zero (no LEDs, no audio, beam count 0)
        const response = new Uint8Array(20);
        response[0] = TOWER_STATE_RESPONSE;
        response[1] = 0x10; // drum[0].calibrated
        response[2] = 0x42; // drum[1].calibrated | drum[2].calibrated
        return response;
    }
}
exports.TowerEmulatorAdapter = TowerEmulatorAdapter;
//# sourceMappingURL=TowerEmulatorAdapter.js.map