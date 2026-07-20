import {
  UdtDiagnosticsRecorder,
  InMemorySink,
  bytesToHex,
  type DiagnosticsSink,
  type IncidentReport,
} from '../src/udtDiagnostics';
import UltimateDarkTower from '../src/UltimateDarkTower';
import { MockBluetoothAdapter } from './mocks/MockBluetoothAdapter';

describe('UdtDiagnosticsRecorder', () => {
  describe('disabled (default)', () => {
    let recorder: UdtDiagnosticsRecorder;

    beforeEach(() => {
      recorder = new UdtDiagnosticsRecorder({ enabled: false });
    });

    test('recordEvent is a no-op', () => {
      recorder.recordEvent('cmd_sent', { foo: 'bar' });
      expect(recorder.getRingBuffer()).toHaveLength(0);
    });

    test('recordBattery is a no-op', () => {
      recorder.recordBattery(3500, 75);
      expect(recorder.getBatteryHistory()).toHaveLength(0);
    });

    test('recordIncident returns null', () => {
      const result = recorder.recordIncident({
        cause: 'adapter_event',
        connectionStatus: makeConnStatus(),
        deviceInformation: {},
        commandQueue: { queueLength: 0, isProcessing: false, currentCommand: null },
        towerState: null,
        brokenSeals: [],
      });
      expect(result).toBeNull();
    });
  });

  describe('enabled', () => {
    let recorder: UdtDiagnosticsRecorder;
    let sink: InMemorySink;

    beforeEach(() => {
      sink = new InMemorySink();
      recorder = new UdtDiagnosticsRecorder({ enabled: true, sinks: [sink] });
      recorder.beginSession();
    });

    test('beginSession seeds a connect event and sets sessionId', () => {
      const events = recorder.getRingBuffer();
      expect(events).toHaveLength(1);
      expect(events[0].kind).toBe('connect');
      expect(recorder.getSessionId()).not.toBe('');
    });

    test('records events with timestamps and data', () => {
      recorder.recordEvent('cmd_enqueued', { id: 'abc', queueDepth: 1 });
      const events = recorder.getRingBuffer();
      expect(events).toHaveLength(2);
      expect(events[1]).toMatchObject({
        kind: 'cmd_enqueued',
        data: { id: 'abc', queueDepth: 1 },
      });
      expect(typeof events[1].t).toBe('number');
    });

    test('ring buffer caps at 500 entries (drains 50 on overflow)', () => {
      for (let i = 0; i < 600; i++) {
        recorder.recordEvent('cmd_sent', { i });
      }
      const events = recorder.getRingBuffer();
      expect(events.length).toBeLessThanOrEqual(500);
      expect(events.length).toBeGreaterThanOrEqual(450);
    });

    test('battery history is separate from events ring', () => {
      for (let i = 0; i < 5; i++) recorder.recordBattery(3500 + i, 75 + i);
      expect(recorder.getBatteryHistory()).toHaveLength(5);
      // Battery samples must NOT pollute the events ring (5Hz cadence).
      const eventsAfterBattery = recorder.getRingBuffer();
      expect(
        eventsAfterBattery.find((e) => e.kind === ('battery_heartbeat' as never)),
      ).toBeUndefined();
    });

    test('battery history caps at 60 entries', () => {
      for (let i = 0; i < 100; i++) recorder.recordBattery(3500, 75);
      expect(recorder.getBatteryHistory().length).toBeLessThanOrEqual(60);
    });

    test('capturePayloads off (default) does not include payloadHex', () => {
      recorder.recordCommandPayload('cmd_sent', new Uint8Array([1, 2, 3]));
      const events = recorder.getRingBuffer();
      const cmdEvent = events.find((e) => e.kind === 'cmd_sent')!;
      expect(cmdEvent.data?.payloadHex).toBeUndefined();
    });

    test('capturePayloads on includes hex with truncation', () => {
      recorder.capturePayloads = true;
      const big = new Uint8Array(100).map((_, i) => i & 0xff);
      recorder.recordCommandPayload('cmd_sent', big);
      const events = recorder.getRingBuffer();
      const cmdEvent = events.find((e) => e.kind === 'cmd_sent')!;
      expect(cmdEvent.data?.payloadHex).toMatch(/\.\.\(\+\d+\)/);
      expect(cmdEvent.data?.payloadLen).toBe(100);
    });

    test('recordIncident produces a fully-shaped report', () => {
      recorder.recordEvent('cmd_sent', { id: 'x' });
      recorder.recordBattery(3700, 80);

      const report = recorder.recordIncident({
        cause: 'heartbeat_timeout',
        connectionStatus: makeConnStatus(),
        deviceInformation: { firmwareRevision: '1.0' },
        commandQueue: {
          queueLength: 2,
          isProcessing: true,
          currentCommand: { id: 'cmd_x', description: 'rotate', timestamp: Date.now() - 500 },
        },
        towerState: null,
        brokenSeals: ['top-north'],
      });

      expect(report).not.toBeNull();
      expect(report!.schemaVersion).toBe(1);
      expect(report!.cause).toBe('heartbeat_timeout');
      expect(report!.commandQueue.queueLength).toBe(2);
      expect(report!.inFlightCommandAgeMs).toBeGreaterThanOrEqual(500);
      expect(report!.recentEvents.length).toBeGreaterThan(0);
      expect(report!.batteryHistory).toHaveLength(1);
      expect(report!.brokenSeals).toEqual(['top-north']);
      expect(report!.library.version).toBeDefined();
    });

    test('recordIncident appends a disconnect event with cause', () => {
      recorder.recordIncident({
        cause: 'gatt_health_check',
        connectionStatus: makeConnStatus(),
        deviceInformation: {},
        commandQueue: { queueLength: 0, isProcessing: false, currentCommand: null },
        towerState: null,
        brokenSeals: [],
      });
      const events = recorder.getRingBuffer();
      const last = events[events.length - 1];
      expect(last.kind).toBe('disconnect');
      expect(last.data?.cause).toBe('gatt_health_check');
    });

    test('sink.onIncident is called', () => {
      recorder.recordIncident({
        cause: 'response_timeout',
        connectionStatus: makeConnStatus(),
        deviceInformation: {},
        commandQueue: { queueLength: 0, isProcessing: false, currentCommand: null },
        towerState: null,
        brokenSeals: [],
      });
      expect(sink.list()).toHaveLength(1);
      expect(sink.list()[0].cause).toBe('response_timeout');
    });

    test('a failing sink does not block other sinks', () => {
      const failingSink: DiagnosticsSink = {
        onIncident: () => {
          throw new Error('boom');
        },
      };
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      recorder.setSinks([failingSink, sink]);
      recorder.recordIncident({
        cause: 'adapter_event',
        connectionStatus: makeConnStatus(),
        deviceInformation: {},
        commandQueue: { queueLength: 0, isProcessing: false, currentCommand: null },
        towerState: null,
        brokenSeals: [],
      });
      expect(sink.list()).toHaveLength(1);
      errorSpy.mockRestore();
    });

    test('beginSession rotates sessionId on each connect', () => {
      const id1 = recorder.getSessionId();
      recorder.beginSession();
      const id2 = recorder.getSessionId();
      expect(id1).not.toBe(id2);
    });

    test('beginSession clears prior ring buffer and battery history', () => {
      recorder.recordEvent('cmd_sent');
      recorder.recordBattery(3700, 80);
      recorder.beginSession();
      // After re-begin: only the synthesized 'connect' event survives
      expect(recorder.getRingBuffer()).toHaveLength(1);
      expect(recorder.getBatteryHistory()).toHaveLength(0);
    });
  });

  describe('incident-only capture (captureIncidents, verbose off)', () => {
    let recorder: UdtDiagnosticsRecorder;
    let sink: InMemorySink;

    beforeEach(() => {
      sink = new InMemorySink();
      recorder = new UdtDiagnosticsRecorder({
        enabled: false,
        captureIncidents: true,
        sinks: [sink],
      });
      recorder.beginSession();
    });

    test('beginSession establishes session context even with verbose off', () => {
      expect(recorder.getSessionId()).not.toBe('');
      expect(recorder.getConnectedAt()).not.toBeNull();
    });

    test('verbose event/battery stream stays off', () => {
      recorder.recordEvent('cmd_sent', { id: 'x' });
      recorder.recordBattery(3700, 80);
      // enabled:false ⇒ recordEvent/recordBattery remain no-ops (incidents only).
      expect(recorder.getRingBuffer()).toHaveLength(0);
      expect(recorder.getBatteryHistory()).toHaveLength(0);
    });

    test('recordIncident captures and dispatches to sinks', () => {
      const report = recorder.recordIncident({
        cause: 'response_timeout',
        connectionStatus: makeConnStatus(),
        deviceInformation: {},
        commandQueue: {
          queueLength: 1,
          isProcessing: true,
          currentCommand: { id: 'cmd_1', description: 'play sound', timestamp: Date.now() - 300 },
        },
        towerState: null,
        brokenSeals: [],
      });

      expect(report).not.toBeNull();
      expect(report!.cause).toBe('response_timeout');
      expect(report!.commandQueue.currentCommand?.description).toBe('play sound');
      expect(report!.inFlightCommandAgeMs).toBeGreaterThanOrEqual(300);
      expect(report!.sessionId).not.toBe('');
      // Verbose off ⇒ no ring-buffer history carried on the incident.
      expect(report!.recentEvents).toHaveLength(0);
      expect(report!.batteryHistory).toHaveLength(0);
      expect(sink.list()).toHaveLength(1);
      expect(recorder.getLastIncident()?.cause).toBe('response_timeout');
    });

    test('both flags false (default) captures nothing', () => {
      const off = new UdtDiagnosticsRecorder({ enabled: false });
      const result = off.recordIncident({
        cause: 'adapter_event',
        connectionStatus: makeConnStatus(),
        deviceInformation: {},
        commandQueue: { queueLength: 0, isProcessing: false, currentCommand: null },
        towerState: null,
        brokenSeals: [],
      });
      expect(result).toBeNull();
      expect(off.getLastIncident()).toBeNull();
    });
  });

  describe('bytesToHex', () => {
    test('encodes and pads short payloads', () => {
      expect(bytesToHex(new Uint8Array([0x00, 0x0a, 0xff]))).toBe('000aff');
    });

    test('truncates with marker', () => {
      const data = new Uint8Array(40);
      const hex = bytesToHex(data, 8);
      expect(hex).toMatch(/^0{16}\.\.\(\+32\)$/);
    });
  });
});

describe('UltimateDarkTower diagnostics integration', () => {
  test('default constructor has diagnostics disabled', () => {
    const tower = new UltimateDarkTower({ adapter: new MockBluetoothAdapter() });
    expect(tower.isDiagnosticsEnabled()).toBe(false);
    expect(tower.getLastIncident()).toBeNull();
  });

  test('opting in produces an incident on adapter disconnect', async () => {
    const adapter = new MockBluetoothAdapter();
    const sink = new InMemorySink();
    const tower = new UltimateDarkTower({
      adapter,
      diagnostics: { enabled: true, sinks: [sink] },
    });

    await tower.connect();
    adapter.simulateDisconnect();

    const incident = tower.getLastIncident();
    expect(incident).not.toBeNull();
    expect(incident!.cause).toBe('adapter_event');
    expect(sink.list()).toHaveLength(1);
  });

  test('captureIncidents:true records the incident with verbose diagnostics off', async () => {
    const adapter = new MockBluetoothAdapter();
    const sink = new InMemorySink();
    const tower = new UltimateDarkTower({
      adapter,
      diagnostics: { enabled: false, captureIncidents: true, sinks: [sink] },
    });

    await tower.connect();
    adapter.simulateDisconnect();

    const incident = tower.getLastIncident();
    expect(incident).not.toBeNull();
    expect(incident!.cause).toBe('adapter_event');
    expect(sink.list()).toHaveLength(1);
    // Verbose stream off: incident carries no event/battery history, and the
    // public "diagnostics enabled" flag stays false.
    expect(incident!.recentEvents).toHaveLength(0);
    expect(tower.isDiagnosticsEnabled()).toBe(false);
  });

  test('cmd_ignored_calibration event is recorded when a command is dropped during calibration', async () => {
    const adapter = new MockBluetoothAdapter();
    const sink = new InMemorySink();
    const tower = new UltimateDarkTower({
      adapter,
      diagnostics: { enabled: true, sinks: [sink] },
    });

    await tower.connect();

    const calibratePromise = tower.calibrate();
    await tower.playSound(1); // ignored while calibrating

    const events = tower.getDiagnosticsRecorder().getRingBuffer();
    expect(events.some((e) => e.kind === 'cmd_ignored_calibration')).toBe(true);

    adapter.simulateResponse(new Uint8Array(20));
    await calibratePromise;
  });

  test('bt_unavailable cause fires when bluetooth becomes unavailable mid-session', async () => {
    const adapter = new MockBluetoothAdapter();
    const sink = new InMemorySink();
    const tower = new UltimateDarkTower({
      adapter,
      diagnostics: { enabled: true, sinks: [sink] },
    });

    await tower.connect();
    adapter.simulateAvailabilityChange(false);

    const incident = sink.list().pop();
    expect(incident?.cause).toBe('bt_unavailable');
  });

  test('user_initiated cause fires on explicit disconnect()', async () => {
    const adapter = new MockBluetoothAdapter();
    const sink = new InMemorySink();
    const tower = new UltimateDarkTower({
      adapter,
      diagnostics: { enabled: true, sinks: [sink] },
    });

    await tower.connect();
    await tower.disconnect();

    expect(sink.list().pop()?.cause).toBe('user_initiated');
  });

  test('runtime toggle works without reconstructing tower', async () => {
    const adapter = new MockBluetoothAdapter();
    const sink = new InMemorySink();
    const tower = new UltimateDarkTower({
      adapter,
      diagnostics: { enabled: false, sinks: [sink] },
    });

    await tower.connect();
    // First disconnect: diagnostics off, no incident
    adapter.simulateDisconnect();
    expect(sink.list()).toHaveLength(0);

    // Re-enable, reconnect, disconnect again
    tower.setDiagnosticsEnabled(true);
    await tower.connect();
    adapter.simulateDisconnect();
    expect(sink.list()).toHaveLength(1);
  });

  test('exportDiagnosticsJSON produces parseable JSON with last incident', async () => {
    const adapter = new MockBluetoothAdapter();
    const tower = new UltimateDarkTower({
      adapter,
      diagnostics: { enabled: true },
    });

    await tower.connect();
    adapter.simulateDisconnect();

    const json = tower.exportDiagnosticsJSON();
    const parsed = JSON.parse(json) as {
      schemaVersion: number;
      lastIncident: IncidentReport | null;
    };
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.lastIncident).not.toBeNull();
    expect(parsed.lastIncident!.cause).toBe('adapter_event');
  });

  test('warn/error log messages are bridged into the events ring', async () => {
    const adapter = new MockBluetoothAdapter();
    const sink = new InMemorySink();
    const tower = new UltimateDarkTower({
      adapter,
      diagnostics: { enabled: true, sinks: [sink] },
    });

    await tower.connect();
    adapter.simulateDisconnect();

    const incident = sink.list().pop()!;
    const logEvent = incident.recentEvents.find((e) => e.kind === 'log');
    expect(logEvent).toBeDefined();
    expect(logEvent!.data?.level).toMatch(/warn|error/);
  });

  test('command queue snapshot is captured at incident time (in-flight cmd preserved)', async () => {
    const adapter = new MockBluetoothAdapter();
    const sink = new InMemorySink();
    const tower = new UltimateDarkTower({
      adapter,
      diagnostics: { enabled: true, sinks: [sink] },
    });

    await tower.connect();
    // Issue a command but don't simulate a response so it stays in-flight
    const cmdPromise = tower.sendTowerCommand(new Uint8Array(20));
    // Tower never responds; force a disconnect — incident should capture the in-flight cmd
    adapter.simulateDisconnect();

    await cmdPromise.catch(() => {
      /* expected: queue cleared on disconnect */
    });

    const incident = sink.list().pop()!;
    // Either current command captured, or queueLength shows pending work.
    expect(
      incident.commandQueue.currentCommand !== null || incident.commandQueue.queueLength > 0,
    ).toBe(true);
  });
});

function makeConnStatus() {
  return {
    isConnected: true,
    isGattConnected: true,
    lastBatteryHeartbeatMs: 100,
    lastCommandResponseMs: 200,
    batteryHeartbeatHealthy: true,
    connectionMonitoringEnabled: true,
    batteryHeartbeatMonitoringEnabled: true,
    batteryHeartbeatTimeoutMs: 3000,
    batteryHeartbeatVerifyConnection: true,
    connectionTimeoutMs: 30000,
  };
}
