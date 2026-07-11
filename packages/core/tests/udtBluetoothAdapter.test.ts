/**
 * Tests for Bluetooth error types defined in udtBluetoothAdapter.ts
 *
 * Tests focus on: correct error names (used in error handling logic),
 * inheritance chain (instanceof checks in catch blocks), originalError
 * propagation, and type discrimination.
 */

import {
  BluetoothError,
  BluetoothConnectionError,
  BluetoothDeviceNotFoundError,
  BluetoothUserCancelledError,
  BluetoothTimeoutError,
} from '../src/udtBluetoothAdapter';

describe('Bluetooth Error Types', () => {
  describe('BluetoothError (base class)', () => {
    test('should set name, message, and extend Error', () => {
      const error = new BluetoothError('connection failed');
      expect(error.name).toBe('BluetoothError');
      expect(error.message).toBe('connection failed');
      expect(error).toBeInstanceOf(Error);
    });

    test('should store originalError when provided', () => {
      const original = new Error('root cause');
      const error = new BluetoothError('wrapped error', original);
      expect(error.originalError).toBe(original);
    });

    test('should have undefined originalError when not provided', () => {
      const error = new BluetoothError('no cause');
      expect(error.originalError).toBeUndefined();
    });
  });

  describe('Subclass names and inheritance', () => {
    test.each([
      { Class: BluetoothConnectionError, name: 'BluetoothConnectionError' },
      { Class: BluetoothDeviceNotFoundError, name: 'BluetoothDeviceNotFoundError' },
      { Class: BluetoothUserCancelledError, name: 'BluetoothUserCancelledError' },
      { Class: BluetoothTimeoutError, name: 'BluetoothTimeoutError' },
    ])('$name should set correct name and extend BluetoothError', ({ Class, name }) => {
      const error = new Class('test');
      expect(error.name).toBe(name);
      expect(error).toBeInstanceOf(BluetoothError);
    });
  });

  describe('Error hierarchy discrimination', () => {
    test('should distinguish between error types using instanceof', () => {
      const connectionError = new BluetoothConnectionError('conn');
      const notFoundError = new BluetoothDeviceNotFoundError('nf');
      const cancelledError = new BluetoothUserCancelledError('cancel');
      const timeoutError = new BluetoothTimeoutError('timeout');

      expect(connectionError).not.toBeInstanceOf(BluetoothDeviceNotFoundError);
      expect(connectionError).not.toBeInstanceOf(BluetoothUserCancelledError);
      expect(connectionError).not.toBeInstanceOf(BluetoothTimeoutError);

      expect(notFoundError).not.toBeInstanceOf(BluetoothConnectionError);
      expect(notFoundError).not.toBeInstanceOf(BluetoothUserCancelledError);
      expect(notFoundError).not.toBeInstanceOf(BluetoothTimeoutError);

      expect(cancelledError).not.toBeInstanceOf(BluetoothConnectionError);
      expect(cancelledError).not.toBeInstanceOf(BluetoothDeviceNotFoundError);
      expect(cancelledError).not.toBeInstanceOf(BluetoothTimeoutError);

      expect(timeoutError).not.toBeInstanceOf(BluetoothConnectionError);
      expect(timeoutError).not.toBeInstanceOf(BluetoothDeviceNotFoundError);
      expect(timeoutError).not.toBeInstanceOf(BluetoothUserCancelledError);
    });

    test('all error types are instanceof BluetoothError', () => {
      const errors = [
        new BluetoothConnectionError('a'),
        new BluetoothDeviceNotFoundError('b'),
        new BluetoothUserCancelledError('c'),
        new BluetoothTimeoutError('d'),
      ];

      for (const error of errors) {
        expect(error).toBeInstanceOf(BluetoothError);
      }
    });
  });
});
