import UltimateDarkTower from '../src/UltimateDarkTower';
import { MockBluetoothAdapter } from './mocks/MockBluetoothAdapter';
import { TOWER_LIGHT_SEQUENCES, TOWER_AUDIO_LIBRARY } from 'ultimatedarktowerdata';
import { rtdt_unpack_state, type Drum } from '../src/udtTowerState';

// Command byte offsets (20-byte packet: byte[0] = command type, bytes[1-19] = state data)
const AUDIO_BYTE = 15; // state data[14] → command[15]: audio.sample
const LED_SEQUENCE_BYTE = 19; // state data[18] → command[19]: led_sequence

function decodeDrumPositions(write: Uint8Array): number[] {
  return rtdt_unpack_state(write.slice(1)).drum.map((d) => d.position);
}

function calibratedDrum(position: number): Drum {
  return { jammed: false, calibrated: true, position, playSound: false, reverse: false };
}

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
    await darkTower.lightOverrides(
      TOWER_LIGHT_SEQUENCES.sealReveal,
      TOWER_AUDIO_LIBRARY.TowerSeal.value,
    );

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

  test('syncs volume when caller requests 0 (Loud) but tracked volume differs', async () => {
    // Simulate the tower's tracked volume already being 2 (Quiet).
    darkTower['currentTowerState'].audio.volume = 2;

    await darkTower.breakSeal({ side: 'north', level: 'middle' }, 0);

    // Volume differs (2 -> 0), so a sync write must happen before sealReveal,
    // even though the requested volume (0) is falsy.
    expect(writes).toHaveLength(2);
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

describe('rotateWithState()', () => {
  let darkTower: UltimateDarkTower;
  let mockAdapter: MockBluetoothAdapter;
  let writes: Uint8Array[];

  beforeEach(async () => {
    mockAdapter = new MockBluetoothAdapter();
    darkTower = new UltimateDarkTower({ adapter: mockAdapter });
    darkTower.setLoggerOutputs([]);
    writes = setupAutoRespond(mockAdapter);
    await darkTower.connect();

    // All three drums calibrated at north (0), matching the post-calibration
    // state from the bug report (only the top drum's dropdown changed).
    darkTower['currentTowerState'].drum[0] = calibratedDrum(0);
    darkTower['currentTowerState'].drum[1] = calibratedDrum(0);
    darkTower['currentTowerState'].drum[2] = calibratedDrum(0);
  });

  afterEach(async () => {
    await darkTower.disconnect();
  });

  test('sends exactly one command when only the top drum changes', async () => {
    await darkTower.rotateWithState('east', 'north', 'north');

    expect(writes).toHaveLength(1);
    expect(decodeDrumPositions(writes[0])).toEqual([1, 0, 0]);
  });

  test('sends exactly one command encoding two changed drums, preserving the unchanged one', async () => {
    await darkTower.rotateWithState('north', 'west', 'south');

    expect(writes).toHaveLength(1);
    expect(decodeDrumPositions(writes[0])).toEqual([0, 3, 2]);
  });

  test('sends no command when no drum position changes', async () => {
    await darkTower.rotateWithState('north', 'north', 'north');

    expect(writes).toHaveLength(0);
  });

  test('sends only the sound command when no drum changes but a sound is requested', async () => {
    await darkTower.rotateWithState('north', 'north', 'north', 1);

    expect(writes).toHaveLength(1);
    expect(writes[0][AUDIO_BYTE] & 0x7f).toBe(1);
  });

  test('sends the rotate command followed by the sound command', async () => {
    await darkTower.rotateWithState('east', 'north', 'north', 1);

    expect(writes).toHaveLength(2);
    expect(decodeDrumPositions(writes[0])).toEqual([1, 0, 0]);
    expect(writes[1][AUDIO_BYTE] & 0x7f).toBe(1);
  });

  test('still commands an uncalibrated drum whose tracked position happens to match the target', async () => {
    darkTower['currentTowerState'].drum[1] = {
      jammed: false,
      calibrated: false,
      position: 0,
      playSound: false,
      reverse: false,
    };

    await darkTower.rotateWithState('north', 'north', 'north');

    expect(writes).toHaveLength(1);
  });

  test('rejects and still schedules the performingLongCommand reset when the write fails', async () => {
    darkTower.retrySendCommandMax = 0;
    mockAdapter.writeCharacteristic = async () => {
      throw new Error('Mock write failed');
    };

    jest.useFakeTimers();
    try {
      const promise = darkTower.rotateWithState('east', 'north', 'north');
      await expect(promise).rejects.toThrow('Mock write failed');

      expect(darkTower['bleConnection'].performingLongCommand).toBe(true);

      await jest.advanceTimersByTimeAsync(30000);
      expect(darkTower['bleConnection'].performingLongCommand).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('rotateDrumStateful()', () => {
  let darkTower: UltimateDarkTower;
  let mockAdapter: MockBluetoothAdapter;
  let writes: Uint8Array[];

  beforeEach(async () => {
    mockAdapter = new MockBluetoothAdapter();
    darkTower = new UltimateDarkTower({ adapter: mockAdapter });
    darkTower.setLoggerOutputs([]);
    writes = setupAutoRespond(mockAdapter);
    await darkTower.connect();

    darkTower['currentTowerState'].drum[0] = calibratedDrum(0);
  });

  afterEach(async () => {
    await darkTower.disconnect();
  });

  test('skips the command when the drum is already calibrated at the requested position', async () => {
    await darkTower.rotateDrumStateful(0, 0, false);

    expect(writes).toHaveLength(0);
  });

  test('still sends the command when playSound is true, even at the same position', async () => {
    await darkTower.rotateDrumStateful(0, 0, true);

    expect(writes).toHaveLength(1);
  });

  test('sends the command when the position actually differs', async () => {
    await darkTower.rotateDrumStateful(0, 1, false);

    expect(writes).toHaveLength(1);
    expect(decodeDrumPositions(writes[0])[0]).toBe(1);
  });
});

describe('sound index validation', () => {
  let darkTower: UltimateDarkTower;
  let mockAdapter: MockBluetoothAdapter;

  beforeEach(async () => {
    mockAdapter = new MockBluetoothAdapter();
    darkTower = new UltimateDarkTower({ adapter: mockAdapter });
    darkTower.setLoggerOutputs([]);
    await darkTower.connect();
  });

  afterEach(async () => {
    await darkTower.disconnect();
  });

  test('playSound rejects NaN and undefined sound indexes without sending a command', async () => {
    await darkTower.playSound(NaN);
    await darkTower.playSound(undefined as unknown as number);
    expect(mockAdapter.writeCalls).toBe(0);
  });

  test('playSoundStateful rejects NaN and undefined sound indexes without sending a command', async () => {
    await darkTower.playSoundStateful(NaN, false);
    await darkTower.playSoundStateful(undefined as unknown as number, false);
    expect(mockAdapter.writeCalls).toBe(0);
  });

  test('rotate() skips an invalid soundIndex byte instead of writing it unchecked', async () => {
    const writes = setupAutoRespond(mockAdapter);

    await darkTower.Rotate('north', 'north', 'north', NaN);

    expect(writes).toHaveLength(1);
    expect(writes[0][AUDIO_BYTE]).toBe(0);
  });
});
