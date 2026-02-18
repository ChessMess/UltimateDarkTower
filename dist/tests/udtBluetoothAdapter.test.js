"use strict";
/**
 * Tests for Bluetooth error types defined in udtBluetoothAdapter.ts
 *
 * Tests focus on: correct error names (used in error handling logic),
 * inheritance chain (instanceof checks in catch blocks), originalError
 * propagation, and type discrimination.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const udtBluetoothAdapter_1 = require("../src/udtBluetoothAdapter");
describe('Bluetooth Error Types', () => {
    describe('BluetoothError (base class)', () => {
        test('should set name, message, and extend Error', () => {
            const error = new udtBluetoothAdapter_1.BluetoothError('connection failed');
            expect(error.name).toBe('BluetoothError');
            expect(error.message).toBe('connection failed');
            expect(error).toBeInstanceOf(Error);
        });
        test('should store originalError when provided', () => {
            const original = new Error('root cause');
            const error = new udtBluetoothAdapter_1.BluetoothError('wrapped error', original);
            expect(error.originalError).toBe(original);
        });
        test('should have undefined originalError when not provided', () => {
            const error = new udtBluetoothAdapter_1.BluetoothError('no cause');
            expect(error.originalError).toBeUndefined();
        });
    });
    describe('Subclass names and inheritance', () => {
        test.each([
            { Class: udtBluetoothAdapter_1.BluetoothConnectionError, name: 'BluetoothConnectionError' },
            { Class: udtBluetoothAdapter_1.BluetoothDeviceNotFoundError, name: 'BluetoothDeviceNotFoundError' },
            { Class: udtBluetoothAdapter_1.BluetoothUserCancelledError, name: 'BluetoothUserCancelledError' },
            { Class: udtBluetoothAdapter_1.BluetoothTimeoutError, name: 'BluetoothTimeoutError' },
        ])('$name should set correct name and extend BluetoothError', ({ Class, name }) => {
            const error = new Class('test');
            expect(error.name).toBe(name);
            expect(error).toBeInstanceOf(udtBluetoothAdapter_1.BluetoothError);
        });
    });
    describe('Error hierarchy discrimination', () => {
        test('should distinguish between error types using instanceof', () => {
            const connectionError = new udtBluetoothAdapter_1.BluetoothConnectionError('conn');
            const notFoundError = new udtBluetoothAdapter_1.BluetoothDeviceNotFoundError('nf');
            const cancelledError = new udtBluetoothAdapter_1.BluetoothUserCancelledError('cancel');
            const timeoutError = new udtBluetoothAdapter_1.BluetoothTimeoutError('timeout');
            expect(connectionError).not.toBeInstanceOf(udtBluetoothAdapter_1.BluetoothDeviceNotFoundError);
            expect(connectionError).not.toBeInstanceOf(udtBluetoothAdapter_1.BluetoothUserCancelledError);
            expect(connectionError).not.toBeInstanceOf(udtBluetoothAdapter_1.BluetoothTimeoutError);
            expect(notFoundError).not.toBeInstanceOf(udtBluetoothAdapter_1.BluetoothConnectionError);
            expect(notFoundError).not.toBeInstanceOf(udtBluetoothAdapter_1.BluetoothUserCancelledError);
            expect(notFoundError).not.toBeInstanceOf(udtBluetoothAdapter_1.BluetoothTimeoutError);
            expect(cancelledError).not.toBeInstanceOf(udtBluetoothAdapter_1.BluetoothConnectionError);
            expect(cancelledError).not.toBeInstanceOf(udtBluetoothAdapter_1.BluetoothDeviceNotFoundError);
            expect(cancelledError).not.toBeInstanceOf(udtBluetoothAdapter_1.BluetoothTimeoutError);
            expect(timeoutError).not.toBeInstanceOf(udtBluetoothAdapter_1.BluetoothConnectionError);
            expect(timeoutError).not.toBeInstanceOf(udtBluetoothAdapter_1.BluetoothDeviceNotFoundError);
            expect(timeoutError).not.toBeInstanceOf(udtBluetoothAdapter_1.BluetoothUserCancelledError);
        });
        test('all error types are instanceof BluetoothError', () => {
            const errors = [
                new udtBluetoothAdapter_1.BluetoothConnectionError('a'),
                new udtBluetoothAdapter_1.BluetoothDeviceNotFoundError('b'),
                new udtBluetoothAdapter_1.BluetoothUserCancelledError('c'),
                new udtBluetoothAdapter_1.BluetoothTimeoutError('d'),
            ];
            for (const error of errors) {
                expect(error).toBeInstanceOf(udtBluetoothAdapter_1.BluetoothError);
            }
        });
    });
});
//# sourceMappingURL=udtBluetoothAdapter.test.js.map