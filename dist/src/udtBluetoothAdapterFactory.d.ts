import { type IBluetoothAdapter } from './udtBluetoothAdapter';
export declare enum BluetoothPlatform {
    WEB = "web",
    NODE = "node",
    AUTO = "auto"
}
export declare class BluetoothAdapterFactory {
    /**
     * Creates a Bluetooth adapter for the specified platform
     * @param platform - Target platform (web, node, or auto-detect)
     * @returns Platform-specific Bluetooth adapter instance
     */
    static create(platform?: BluetoothPlatform): IBluetoothAdapter;
    /**
     * Detects the current runtime environment
     * @returns Detected platform (web or node)
     */
    static detectPlatform(): BluetoothPlatform;
}
