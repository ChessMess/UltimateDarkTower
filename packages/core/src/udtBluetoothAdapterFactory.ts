import { type IBluetoothAdapter } from './udtBluetoothAdapter';

export enum BluetoothPlatform {
  WEB = 'web',
  NODE = 'node',
  AUTO = 'auto',
  /** Software-only — no Bluetooth (e.g. headless rendering, iOS Safari). Returns a no-op adapter. */
  NONE = 'none',
}

export class BluetoothAdapterFactory {
  /**
   * Creates a Bluetooth adapter for the specified platform
   * @param platform - Target platform (web, node, or auto-detect)
   * @returns Platform-specific Bluetooth adapter instance
   */
  static create(platform: BluetoothPlatform = BluetoothPlatform.AUTO): IBluetoothAdapter {
    const detectedPlatform = platform === BluetoothPlatform.AUTO ? this.detectPlatform() : platform;

    switch (detectedPlatform) {
      case BluetoothPlatform.WEB: {
        // Synchronous require keeps create() sync and lazy-loads only the
        // adapter for the active platform (avoids pulling node BLE into browser bundles).
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { WebBluetoothAdapter } = require('./adapters/WebBluetoothAdapter');
        return new WebBluetoothAdapter();
      }
      case BluetoothPlatform.NODE: {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { NodeBluetoothAdapter } = require('./adapters/NodeBluetoothAdapter');
        return new NodeBluetoothAdapter();
      }
      case BluetoothPlatform.NONE: {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { NoopBluetoothAdapter } = require('./adapters/NoopBluetoothAdapter');
        return new NoopBluetoothAdapter();
      }
      default:
        throw new Error(`Unsupported Bluetooth platform: ${detectedPlatform}`);
    }
  }

  /**
   * Detects the current runtime environment
   * @returns Detected platform (web or node)
   */
  static detectPlatform(): BluetoothPlatform {
    // Check for React Native (must provide custom adapter)
    if (typeof navigator !== 'undefined' && navigator.userAgent?.includes('React Native')) {
      throw new Error(
        'React Native detected. Auto-detection is not supported. ' +
          'Please provide a custom adapter implementing IBluetoothAdapter. ' +
          'See documentation for react-native-ble-plx adapter example.',
      );
    }

    // Check for browser environment with Web Bluetooth support
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      if ('bluetooth' in navigator) {
        return BluetoothPlatform.WEB;
      }
    }

    // Check for Node.js environment
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      return BluetoothPlatform.NODE;
    }

    throw new Error(
      'Unable to detect Bluetooth platform. ' +
        'Environment is neither browser with Web Bluetooth nor Node.js. ' +
        'Please explicitly specify platform or provide a custom adapter.',
    );
  }
}
