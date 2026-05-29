# Adapters

The library talks to Bluetooth through a single interface — `IBluetoothAdapter`. Ship-supplied implementations cover browsers (Web Bluetooth) and Node.js (`@stoprocent/noble`). For React Native, Cordova, or anywhere else, you write your own.

> See [ARCHITECTURE.md](../ARCHITECTURE.md#why-the-adapter-pattern) for the reasoning behind this layer.

---

## The interface

```typescript
interface IBluetoothAdapter {
  connect(deviceName: string, serviceUuids: string[]): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  isGattConnected(): boolean;
  writeCharacteristic(data: Uint8Array): Promise<void>;
  onCharacteristicValueChanged(callback: (data: Uint8Array) => void): void;
  onDisconnect(callback: () => void): void;
  onBluetoothAvailabilityChanged(callback: (available: boolean) => void): void;
  readDeviceInformation(): Promise<DeviceInformation>;
  cleanup(): Promise<void>;
}
```

Source: [src/udtBluetoothAdapter.ts](../../src/udtBluetoothAdapter.ts).

The interface deliberately matches the shape of a GATT session — `connect` opens it, `writeCharacteristic` writes to the UART RX char, `onCharacteristicValueChanged` fires for UART TX notifications. The library never reaches around this surface, so your adapter is free to use whatever underlying BLE library you want.

---

## Built-in adapters

| Adapter | Platform | Auto-detected | Source |
|---|---|---|---|
| `WebBluetoothAdapter` | Browser (Chrome, Edge, Samsung Internet) | Yes | [src/adapters/WebBluetoothAdapter.ts](../../src/adapters/WebBluetoothAdapter.ts) |
| `NodeBluetoothAdapter` | Node.js 18+ with `@stoprocent/noble` | Yes | [src/adapters/NodeBluetoothAdapter.ts](../../src/adapters/NodeBluetoothAdapter.ts) |

Auto-detection happens inside `BluetoothAdapterFactory` based on whether `navigator.bluetooth` is available. Electron renderer processes resolve to `WebBluetoothAdapter`; Electron main processes resolve to `NodeBluetoothAdapter`.

### Explicit creation

```typescript
import { BluetoothAdapterFactory, BluetoothPlatform } from 'ultimatedarktower';

const adapter = BluetoothAdapterFactory.create();                       // auto-detect
const web    = BluetoothAdapterFactory.create(BluetoothPlatform.WEB);
const node   = BluetoothAdapterFactory.create(BluetoothPlatform.NODE);

const platform = BluetoothAdapterFactory.detectPlatform();              // 'web' | 'node'
```

---

## Building a custom adapter

### React Native (via `react-native-ble-plx`)

```typescript
import {
  IBluetoothAdapter,
  DeviceInformation,
} from 'ultimatedarktower';
import { BleManager, Device, Characteristic } from 'react-native-ble-plx';

class ReactNativeAdapter implements IBluetoothAdapter {
  private manager = new BleManager();
  private device: Device | null = null;
  private rxChar: Characteristic | null = null;
  private txChar: Characteristic | null = null;
  private valueChangedCb: ((data: Uint8Array) => void) | null = null;
  private disconnectCb: (() => void) | null = null;

  async connect(deviceName: string, serviceUuids: string[]): Promise<void> {
    this.device = await this.scanFor(deviceName, serviceUuids);
    await this.device.connect();
    await this.device.discoverAllServicesAndCharacteristics();
    // resolve RX (write) + TX (notify) characteristics, subscribe to TX
    // …
  }

  async disconnect(): Promise<void> {
    await this.device?.cancelConnection();
    this.device = null;
  }

  isConnected(): boolean {
    return this.device !== null;
  }

  isGattConnected(): boolean {
    return this.isConnected();
  }

  async writeCharacteristic(data: Uint8Array): Promise<void> {
    if (!this.rxChar) throw new Error('Not connected');
    await this.rxChar.writeWithoutResponse(Buffer.from(data).toString('base64'));
  }

  onCharacteristicValueChanged(cb: (data: Uint8Array) => void): void {
    this.valueChangedCb = cb;
  }

  onDisconnect(cb: () => void): void {
    this.disconnectCb = cb;
  }

  onBluetoothAvailabilityChanged(cb: (available: boolean) => void): void {
    this.manager.onStateChange((state) => cb(state === 'PoweredOn'), true);
  }

  async readDeviceInformation(): Promise<DeviceInformation> {
    // Read DIS characteristics via this.device.readCharacteristicForService(...)
    return { /* … */ };
  }

  async cleanup(): Promise<void> {
    await this.disconnect();
    this.manager.destroy();
  }

  private async scanFor(name: string, uuids: string[]): Promise<Device> {
    /* ... */
  }
}

const tower = new UltimateDarkTower({ adapter: new ReactNativeAdapter() });
```

The full set of UUIDs you'll need (UART service + DIS + Battery) are exported as constants from the library — `UART_SERVICE_UUID`, `UART_RX_CHARACTERISTIC_UUID`, `UART_TX_CHARACTERISTIC_UUID`, `DIS_SERVICE_UUID`, etc. See [src/udtConstants.ts](../../src/udtConstants.ts) or the BLE service map screenshots in [TOWER_TECH_NOTES.md](../TOWER_TECH_NOTES.md).

### Cordova / Capacitor

Same pattern with a different underlying library — typically `cordova-plugin-ble-central` or `@capacitor-community/bluetooth-le`. The adapter contract is identical; only the inside changes.

### MockBluetoothAdapter (testing)

The library ships a mock adapter for unit tests at [tests/mocks/MockBluetoothAdapter.ts](../../tests/mocks/MockBluetoothAdapter.ts). Pass it via the `adapter` config:

```typescript
import UltimateDarkTower from 'ultimatedarktower';
import { MockBluetoothAdapter } from 'ultimatedarktower/tests/mocks/MockBluetoothAdapter';

const mock = new MockBluetoothAdapter();
const tower = new UltimateDarkTower({ adapter: mock });

await tower.connect();
mock.simulateResponse(/* hex packet */);
expect(/* … */);
```

> The mock isn't part of the published package. For your own unit tests, copy the file into your suite or implement an equivalent against the public `IBluetoothAdapter` interface.

---

## Platform support matrix

| Platform | Adapter | Status |
|---|---|---|
| Chrome / Edge / Samsung Internet (desktop + Android) | `WebBluetoothAdapter` | Auto-detected |
| Node.js 18+ | `NodeBluetoothAdapter` | Auto-detected (needs `@stoprocent/noble`) |
| Electron renderer | `WebBluetoothAdapter` | Auto-detected |
| Electron main | `NodeBluetoothAdapter` | Auto-detected |
| iOS Safari / iOS Chrome | — | Not supported (use [Bluefy](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055)) |
| Firefox | — | Not supported |
| React Native (iOS/Android) | Custom (`react-native-ble-plx` recommended) | Bring your own |
| Cordova / Capacitor | Custom (platform plugin) | Bring your own |

---

## See also

- [connection.md](connection.md) — how `connect`/`disconnect` use the adapter.
- [../ARCHITECTURE.md](../ARCHITECTURE.md) — where adapters sit in the stack.
- [../TOWER_TECH_NOTES.md](../TOWER_TECH_NOTES.md) — BLE service UUIDs and screenshots of the real device's BLE tree.
