"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TowerEmulatorAdapter = void 0;
const EMULATED_BATTERY_MV = 3600;
const BATTERY_HEARTBEAT_INTERVAL_MS = 200;
const INITIAL_STATE_RESPONSE_DELAY_MS = 0;
const COMMAND_RESPONSE_DELAY_MS = 50;
const CALIBRATION_DELAY_MS = 1500;
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
 * - Calibration command (byte 0 = 4): after 1.5s, responds with all 3 drums calibrated
 * - Other basic commands: echoes back the last known state packet
 * - Battery heartbeat: fires every 200ms so connection health monitoring stays satisfied
 */
class TowerEmulatorAdapter {
    constructor(options = {}) {
        this.options = options;
        this.connected = false;
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
    }
    isConnected() {
        return this.connected;
    }
    isGattConnected() {
        return this.connected;
    }
    async writeCharacteristic(data) {
        var _a, _b;
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
        }
        else if (data.length === 1 && commandType === CMD_CALIBRATE) {
            // Calibration command — respond after delay with all 3 drums marked calibrated
            setTimeout(() => {
                var _a;
                const calibratedResponse = this.createCalibratedStateResponse();
                this.lastStatePacket = new Uint8Array(calibratedResponse);
                (_a = this.rxCallback) === null || _a === void 0 ? void 0 : _a.call(this, calibratedResponse);
            }, CALIBRATION_DELAY_MS);
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
        // 20-byte TOWER_STATE response with all 3 drums calibrated at position 0 (north)
        // Byte 0: 0x00 (TOWER_STATE response type)
        // Byte 1 (state data[0]): drum[0].calibrated = bit 4 → 0x10
        // Byte 2 (state data[1]): drum[1].calibrated = bit 1 (0x02) | drum[2].calibrated = bit 6 (0x40) → 0x42
        // Bytes 3–19: all zeros (no LEDs, no audio, beam count 0)
        const response = new Uint8Array(20);
        response[0] = TOWER_STATE_RESPONSE;
        response[1] = 0x10; // drum[0].calibrated
        response[2] = 0x42; // drum[1].calibrated | drum[2].calibrated
        return response;
    }
}
exports.TowerEmulatorAdapter = TowerEmulatorAdapter;
//# sourceMappingURL=TowerEmulatorAdapter.js.map