"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BluetoothTimeoutError = exports.BluetoothUserCancelledError = exports.BluetoothDeviceNotFoundError = exports.BluetoothConnectionError = exports.BluetoothError = void 0;
/**
 * Standard Bluetooth error types for cross-platform handling
 * Base class for all Bluetooth-related errors
 */
class BluetoothError extends Error {
    constructor(message, originalError) {
        super(message);
        this.originalError = originalError;
        this.name = 'BluetoothError';
    }
}
exports.BluetoothError = BluetoothError;
/**
 * Error thrown when Bluetooth connection fails or is lost
 */
class BluetoothConnectionError extends BluetoothError {
    constructor(message, originalError) {
        super(message, originalError);
        this.name = 'BluetoothConnectionError';
    }
}
exports.BluetoothConnectionError = BluetoothConnectionError;
/**
 * Error thrown when the requested Bluetooth device cannot be found
 */
class BluetoothDeviceNotFoundError extends BluetoothError {
    constructor(message, originalError) {
        super(message, originalError);
        this.name = 'BluetoothDeviceNotFoundError';
    }
}
exports.BluetoothDeviceNotFoundError = BluetoothDeviceNotFoundError;
/**
 * Error thrown when user cancels the device selection dialog
 * (Primarily used in Web Bluetooth environments)
 */
class BluetoothUserCancelledError extends BluetoothError {
    constructor(message, originalError) {
        super(message, originalError);
        this.name = 'BluetoothUserCancelledError';
    }
}
exports.BluetoothUserCancelledError = BluetoothUserCancelledError;
/**
 * Error thrown when a Bluetooth operation times out
 */
class BluetoothTimeoutError extends BluetoothError {
    constructor(message, originalError) {
        super(message, originalError);
        this.name = 'BluetoothTimeoutError';
    }
}
exports.BluetoothTimeoutError = BluetoothTimeoutError;
//# sourceMappingURL=udtBluetoothAdapter.js.map