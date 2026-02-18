"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BluetoothAdapterFactory = exports.BluetoothPlatform = void 0;
var BluetoothPlatform;
(function (BluetoothPlatform) {
    BluetoothPlatform["WEB"] = "web";
    BluetoothPlatform["NODE"] = "node";
    BluetoothPlatform["AUTO"] = "auto";
})(BluetoothPlatform || (exports.BluetoothPlatform = BluetoothPlatform = {}));
class BluetoothAdapterFactory {
    /**
     * Creates a Bluetooth adapter for the specified platform
     * @param platform - Target platform (web, node, or auto-detect)
     * @returns Platform-specific Bluetooth adapter instance
     */
    static create(platform = BluetoothPlatform.AUTO) {
        const detectedPlatform = platform === BluetoothPlatform.AUTO
            ? this.detectPlatform()
            : platform;
        switch (detectedPlatform) {
            case BluetoothPlatform.WEB: {
                const { WebBluetoothAdapter } = require('./adapters/WebBluetoothAdapter');
                return new WebBluetoothAdapter();
            }
            case BluetoothPlatform.NODE: {
                const { NodeBluetoothAdapter } = require('./adapters/NodeBluetoothAdapter');
                return new NodeBluetoothAdapter();
            }
            default:
                throw new Error(`Unsupported Bluetooth platform: ${detectedPlatform}`);
        }
    }
    /**
     * Detects the current runtime environment
     * @returns Detected platform (web or node)
     */
    static detectPlatform() {
        var _a;
        // Check for React Native (must provide custom adapter)
        if (typeof navigator !== 'undefined' && ((_a = navigator.userAgent) === null || _a === void 0 ? void 0 : _a.includes('React Native'))) {
            throw new Error('React Native detected. Auto-detection is not supported. ' +
                'Please provide a custom adapter implementing IBluetoothAdapter. ' +
                'See documentation for react-native-ble-plx adapter example.');
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
        throw new Error('Unable to detect Bluetooth platform. ' +
            'Environment is neither browser with Web Bluetooth nor Node.js. ' +
            'Please explicitly specify platform or provide a custom adapter.');
    }
}
exports.BluetoothAdapterFactory = BluetoothAdapterFactory;
//# sourceMappingURL=udtBluetoothAdapterFactory.js.map