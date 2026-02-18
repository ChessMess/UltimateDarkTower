import {
    UART_SERVICE_UUID,
    UART_TX_CHARACTERISTIC_UUID,
    UART_RX_CHARACTERISTIC_UUID,
    DIS_SERVICE_UUID,
    DIS_MANUFACTURER_NAME_UUID,
    DIS_MODEL_NUMBER_UUID,
    DIS_SERIAL_NUMBER_UUID,
    DIS_HARDWARE_REVISION_UUID,
    DIS_FIRMWARE_REVISION_UUID,
    DIS_SOFTWARE_REVISION_UUID,
    DIS_SYSTEM_ID_UUID,
    DIS_IEEE_REGULATORY_UUID,
    DIS_PNP_ID_UUID,
} from '../udtConstants';
import {
    type IBluetoothAdapter,
    BluetoothConnectionError,
    BluetoothDeviceNotFoundError,
    BluetoothUserCancelledError,
} from '../udtBluetoothAdapter';
import { type DeviceInformation } from '../udtBleConnection';

/**
 * Web Bluetooth adapter implementation for browser environments.
 * Uses the Web Bluetooth API (navigator.bluetooth).
 */
export class WebBluetoothAdapter implements IBluetoothAdapter {
    private device: any = null;
    private txCharacteristic: any = null;
    private rxCharacteristic: any = null;

    private characteristicCallback?: (data: Uint8Array) => void;
    private disconnectCallback?: () => void;
    private availabilityCallback?: (available: boolean) => void;

    // Bound event handlers for cleanup
    private boundOnCharacteristicValueChanged: ((event: Event) => void) | null = null;
    private boundOnDeviceDisconnected: ((event: Event) => void) | null = null;
    private boundOnAvailabilityChanged: ((event: Event) => void) | null = null;

    async connect(deviceName: string, serviceUuids: string[]): Promise<void> {
        try {
            // @ts-ignore - Web Bluetooth types may not be available in all environments
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: deviceName }],
                optionalServices: serviceUuids
            });

            if (this.device === null) {
                throw new BluetoothDeviceNotFoundError('Tower not found');
            }

            // Set up disconnect listener
            this.boundOnDeviceDisconnected = () => {
                if (this.disconnectCallback) {
                    this.disconnectCallback();
                }
            };
            this.device.addEventListener('gattserverdisconnected', this.boundOnDeviceDisconnected);

            // Set up Bluetooth availability monitoring
            this.boundOnAvailabilityChanged = (event: any) => {
                if (this.availabilityCallback) {
                    this.availabilityCallback(event.value);
                }
            };
            // @ts-ignore
            if (navigator.bluetooth) {
                // @ts-ignore
                navigator.bluetooth.addEventListener('availabilitychanged', this.boundOnAvailabilityChanged);
            }

            // Connect to GATT server
            const server = await this.device.gatt.connect();

            // Get UART service
            const service = await server.getPrimaryService(UART_SERVICE_UUID);

            // Get characteristics
            this.txCharacteristic = await service.getCharacteristic(UART_TX_CHARACTERISTIC_UUID);
            this.rxCharacteristic = await service.getCharacteristic(UART_RX_CHARACTERISTIC_UUID);

            // Set up RX notifications
            await this.rxCharacteristic.startNotifications();
            this.boundOnCharacteristicValueChanged = (event: Event) => {
                const target = event.target as any;
                const receivedData = new Uint8Array(target.value.byteLength);
                for (let i = 0; i < target.value.byteLength; i++) {
                    receivedData[i] = target.value.getUint8(i);
                }
                if (this.characteristicCallback) {
                    this.characteristicCallback(receivedData);
                }
            };
            await this.rxCharacteristic.addEventListener(
                'characteristicvaluechanged',
                this.boundOnCharacteristicValueChanged
            );

        } catch (error: any) {
            // Re-throw our own error types
            if (error instanceof BluetoothDeviceNotFoundError ||
                error instanceof BluetoothUserCancelledError ||
                error instanceof BluetoothConnectionError) {
                throw error;
            }

            const errorMsg = error?.message ?? String(error);

            if (errorMsg.includes('User cancelled')) {
                throw new BluetoothUserCancelledError('User cancelled device selection', error);
            }
            if (errorMsg.includes('not found') || error?.name === 'NotFoundError') {
                throw new BluetoothDeviceNotFoundError('Device not found', error);
            }
            throw new BluetoothConnectionError(`Failed to connect: ${errorMsg}`, error);
        }
    }

    async disconnect(): Promise<void> {
        if (!this.device) {
            return;
        }

        if (this.device.gatt.connected) {
            // Remove event listeners before disconnecting
            if (this.boundOnDeviceDisconnected) {
                this.device.removeEventListener('gattserverdisconnected', this.boundOnDeviceDisconnected);
            }
            await this.device.gatt.disconnect();
        }

        this.device = null;
        this.txCharacteristic = null;
        this.rxCharacteristic = null;
    }

    isConnected(): boolean {
        return !!this.device;
    }

    isGattConnected(): boolean {
        return this.device?.gatt?.connected ?? false;
    }

    async writeCharacteristic(data: Uint8Array): Promise<void> {
        if (!this.txCharacteristic) {
            throw new BluetoothConnectionError('TX characteristic not available');
        }
        await this.txCharacteristic.writeValue(data);
    }

    onCharacteristicValueChanged(callback: (data: Uint8Array) => void): void {
        this.characteristicCallback = callback;
    }

    onDisconnect(callback: () => void): void {
        this.disconnectCallback = callback;
    }

    onBluetoothAvailabilityChanged(callback: (available: boolean) => void): void {
        this.availabilityCallback = callback;
    }

    async readDeviceInformation(): Promise<DeviceInformation> {
        const info: DeviceInformation = {};

        if (!this.device?.gatt?.connected) {
            return info;
        }

        try {
            const disService = await this.device.gatt.getPrimaryService(DIS_SERVICE_UUID);

            const characteristicMap = [
                { uuid: DIS_MANUFACTURER_NAME_UUID, key: 'manufacturerName', binary: false },
                { uuid: DIS_MODEL_NUMBER_UUID, key: 'modelNumber', binary: false },
                { uuid: DIS_SERIAL_NUMBER_UUID, key: 'serialNumber', binary: false },
                { uuid: DIS_HARDWARE_REVISION_UUID, key: 'hardwareRevision', binary: false },
                { uuid: DIS_FIRMWARE_REVISION_UUID, key: 'firmwareRevision', binary: false },
                { uuid: DIS_SOFTWARE_REVISION_UUID, key: 'softwareRevision', binary: false },
                { uuid: DIS_SYSTEM_ID_UUID, key: 'systemId', binary: true },
                { uuid: DIS_IEEE_REGULATORY_UUID, key: 'ieeeRegulatory', binary: false },
                { uuid: DIS_PNP_ID_UUID, key: 'pnpId', binary: true },
            ];

            for (const { uuid, key, binary } of characteristicMap) {
                try {
                    const characteristic = await disService.getCharacteristic(uuid);
                    const value = await characteristic.readValue();

                    if (binary) {
                        const hexValue = Array.from(new Uint8Array(value.buffer))
                            .map((b: number) => b.toString(16).padStart(2, '0'))
                            .join(':');
                        (info as any)[key] = hexValue;
                    } else {
                        (info as any)[key] = new TextDecoder().decode(value);
                    }
                } catch {
                    // Characteristic not available - skip
                }
            }

            info.lastUpdated = new Date();
        } catch {
            // DIS service not available
        }

        return info;
    }

    async cleanup(): Promise<void> {
        // Remove Bluetooth availability listener
        // @ts-ignore
        if (navigator.bluetooth && this.boundOnAvailabilityChanged) {
            // @ts-ignore
            navigator.bluetooth.removeEventListener('availabilitychanged', this.boundOnAvailabilityChanged);
        }

        if (this.device && this.boundOnDeviceDisconnected) {
            this.device.removeEventListener('gattserverdisconnected', this.boundOnDeviceDisconnected);
        }

        if (this.isConnected()) {
            await this.disconnect();
        }
    }
}
