import UltimateDarkTower from '../src/UltimateDarkTower';
import { MockBluetoothAdapter } from './mocks/MockBluetoothAdapter';
import { TOWER_LIGHT_SEQUENCES, TOWER_AUDIO_LIBRARY } from '../src/udtConstants';

// Command byte offsets (20-byte packet: byte[0] = command type, bytes[1-19] = state data)
const AUDIO_BYTE = 15;       // state data[14] → command[15]: audio.sample
const LED_SEQUENCE_BYTE = 19; // state data[18] → command[19]: led_sequence

/**
 * Override writeCharacteristic to capture writes and auto-simulate a tower
 * response after each write. This unblocks the CommandQueue, which waits for
 * an onResponse() signal before processing the next command.
 */
function setupAutoRespond(mockAdapter: MockBluetoothAdapter): Uint8Array[] {
  const writes: Uint8Array[] = [];
  mockAdapter.writeCharacteristic = async (data: Uint8Array) => {
    writes.push(new Uint8Array(data));
    // Simulate a non-battery tower response (byte[0] = 0x00) on the next tick
    setImmediate(() => mockAdapter.simulateResponse(new Uint8Array(20)));
  };
  return writes;
}

describe('lightOverrides()', () => {
  let darkTower: UltimateDarkTower;
  let mockAdapter: MockBluetoothAdapter;
  let writes: Uint8Array[];

  beforeEach(async () => {
    mockAdapter = new MockBluetoothAdapter();
    darkTower = new UltimateDarkTower({ adapter: mockAdapter });
    darkTower.setLoggerOutputs([]);
    writes = setupAutoRespond(mockAdapter);
    await darkTower.connect();
  });

  afterEach(async () => {
    await darkTower.disconnect();
  });

  test('sets led_sequence (byte 19) and audio (byte 15) when both provided', async () => {
    await darkTower.lightOverrides(TOWER_LIGHT_SEQUENCES.sealReveal, TOWER_AUDIO_LIBRARY.TowerSeal.value);

    expect(writes).toHaveLength(1);
    expect(writes[0][LED_SEQUENCE_BYTE]).toBe(TOWER_LIGHT_SEQUENCES.sealReveal); // 0x0e
    expect(writes[0][AUDIO_BYTE] & 0x7f).toBe(TOWER_AUDIO_LIBRARY.TowerSeal.value); // 0x70
  });

  test('sets led_sequence only with no audio when soundIndex omitted', async () => {
    await darkTower.lightOverrides(TOWER_LIGHT_SEQUENCES.sealReveal);

    expect(writes).toHaveLength(1);
    expect(writes[0][LED_SEQUENCE_BYTE]).toBe(TOWER_LIGHT_SEQUENCES.sealReveal);
    expect(writes[0][AUDIO_BYTE] & 0x7f).toBe(0x00);
  });
});

describe('breakSeal()', () => {
  let darkTower: UltimateDarkTower;
  let mockAdapter: MockBluetoothAdapter;
  let writes: Uint8Array[];

  beforeEach(async () => {
    mockAdapter = new MockBluetoothAdapter();
    darkTower = new UltimateDarkTower({ adapter: mockAdapter });
    darkTower.setLoggerOutputs([]);
    writes = setupAutoRespond(mockAdapter);
    await darkTower.connect();
  });

  afterEach(async () => {
    await darkTower.disconnect();
  });

  test('sends single sealReveal+TowerSeal command when volume is 0 (default)', async () => {
    // Default state has audio.volume = 0, so the volume-state command is skipped
    await darkTower.breakSeal({ side: 'north', level: 'middle' });

    expect(writes).toHaveLength(1);
    expect(writes[0][LED_SEQUENCE_BYTE]).toBe(TOWER_LIGHT_SEQUENCES.sealReveal); // 0x0e
    expect(writes[0][AUDIO_BYTE] & 0x7f).toBe(TOWER_AUDIO_LIBRARY.TowerSeal.value); // 0x70
  });

  test('sends volume state command first when volume > 0, then sealReveal', async () => {
    await darkTower.breakSeal({ side: 'north', level: 'middle' }, 1);

    expect(writes).toHaveLength(2);
    // Second write is the sealReveal+TowerSeal command
    expect(writes[1][LED_SEQUENCE_BYTE]).toBe(TOWER_LIGHT_SEQUENCES.sealReveal);
    expect(writes[1][AUDIO_BYTE] & 0x7f).toBe(TOWER_AUDIO_LIBRARY.TowerSeal.value);
  });

  test('does not send individual LED effect commands (no manual ledge/doorway writes)', async () => {
    await darkTower.breakSeal({ side: 'north', level: 'middle' });

    // Before refactor: 3 commands (volume, sound, lights). Now: 1.
    expect(writes).toHaveLength(1);
    // Verify the single command is a firmware override, not a manual LED state
    expect(writes[0][LED_SEQUENCE_BYTE]).not.toBe(0); // led_sequence is set
  });

  test('tracks the broken seal on the tower instance', async () => {
    await darkTower.breakSeal({ side: 'north', level: 'middle' });

    expect(darkTower.isSealBroken({ side: 'north', level: 'middle' })).toBe(true);
    expect(darkTower.isSealBroken({ side: 'south', level: 'middle' })).toBe(false);
  });
});
