/**
 * protocol.test.ts — unit tests for the shared WebSocket protocol module.
 *
 * Tests cover message factory helpers and the MessageType constants to verify
 * that the protocol layer produces well-formed relay messages.
 */

import {
  MessageType,
  PROTOCOL_VERSION,
  CLOSE_CODE_PROTOCOL_VERSION_MISMATCH,
  makeTowerCommandMessage,
  makeSyncStateMessage,
  makeHostStatusMessage,
  makeHostLogConfigMessage,
  makeRelayPausedMessage,
  makeRelayResumedMessage,
  makeClientReadyMessage,
  type HostStatus,
} from '@dark-tower-sync/shared';

describe('MessageType constants', () => {
  it('defines expected message type strings', () => {
    expect(MessageType.TOWER_COMMAND).toBe('tower:command');
    expect(MessageType.SYNC_STATE).toBe('sync:state');
    expect(MessageType.CLIENT_CONNECTED).toBe('client:connected');
    expect(MessageType.CLIENT_DISCONNECTED).toBe('client:disconnected');
    expect(MessageType.HOST_STATUS).toBe('host:status');
    expect(MessageType.CLIENT_HELLO).toBe('client:hello');
  });

  it('defines relay and log message types', () => {
    expect(MessageType.CLIENT_LOG).toBe('client:log');
    expect(MessageType.HOST_LOG_CONFIG).toBe('host:log-config');
    expect(MessageType.RELAY_PAUSED).toBe('relay:paused');
    expect(MessageType.RELAY_RESUMED).toBe('relay:resumed');
    expect(MessageType.RELAY_TOWER_ALERT).toBe('relay:tower:alert');
  });
});

describe('PROTOCOL_VERSION', () => {
  it('is a non-empty semver string', () => {
    expect(typeof PROTOCOL_VERSION).toBe('string');
    expect(PROTOCOL_VERSION.length).toBeGreaterThan(0);
    expect(PROTOCOL_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('CLOSE_CODE_PROTOCOL_VERSION_MISMATCH', () => {
  it('is the custom WebSocket close code 4000', () => {
    expect(CLOSE_CODE_PROTOCOL_VERSION_MISMATCH).toBe(4000);
  });
});

describe('makeTowerCommandMessage()', () => {
  const sampleCommand = new Array(20).fill(0).map((_v, i) => i);

  it('produces a message with the correct type', () => {
    const msg = makeTowerCommandMessage(sampleCommand);
    expect(msg.type).toBe(MessageType.TOWER_COMMAND);
  });

  it('converts the input bytes to a number array in payload.data', () => {
    const msg = makeTowerCommandMessage(sampleCommand);
    expect(Array.isArray(msg.payload.data)).toBe(true);
    expect(msg.payload.data).toEqual(sampleCommand);
  });

  it('includes a valid ISO-8601 timestamp', () => {
    const msg = makeTowerCommandMessage(sampleCommand);
    expect(typeof msg.timestamp).toBe('string');
    expect(() => new Date(msg.timestamp)).not.toThrow();
    expect(new Date(msg.timestamp).toISOString()).toBe(msg.timestamp);
  });

  it('accepts a Uint8Array', () => {
    const bytes = new Uint8Array(sampleCommand);
    const msg = makeTowerCommandMessage(bytes);
    expect(msg.payload.data).toEqual(sampleCommand);
  });

  it('includes seq in payload', () => {
    const msg = makeTowerCommandMessage(sampleCommand, 7);
    expect(msg.payload.seq).toBe(7);
  });
});

describe('makeSyncStateMessage()', () => {
  it('produces a message with the correct type', () => {
    const msg = makeSyncStateMessage(null);
    expect(msg.type).toBe(MessageType.SYNC_STATE);
  });

  it('carries null lastCommand when no prior command exists', () => {
    const msg = makeSyncStateMessage(null);
    expect(msg.payload.lastCommand).toBeNull();
  });

  it('carries the last command bytes when provided', () => {
    const last = new Array(20).fill(0xff);
    const msg = makeSyncStateMessage(last);
    expect(msg.payload.lastCommand).toEqual(last);
  });
});

describe('makeHostStatusMessage()', () => {
  const status: HostStatus = {
    relaying: true,
    fakeTowerState: 'advertising',
    appConnected: true,
    clientCount: 2,
    towersConnected: 1,
    observerCount: 0,
    lastCommandAt: new Date().toISOString(),
  };

  it('produces a message with the correct type', () => {
    const msg = makeHostStatusMessage(status);
    expect(msg.type).toBe(MessageType.HOST_STATUS);
  });

  it('carries the full status payload', () => {
    const msg = makeHostStatusMessage(status);
    expect(msg.payload).toEqual(status);
  });
});

describe('makeHostLogConfigMessage()', () => {
  it('produces a message with the correct type', () => {
    const msg = makeHostLogConfigMessage(true);
    expect(msg.type).toBe(MessageType.HOST_LOG_CONFIG);
  });

  it('carries the enabled flag', () => {
    expect(makeHostLogConfigMessage(true).payload.enabled).toBe(true);
    expect(makeHostLogConfigMessage(false).payload.enabled).toBe(false);
  });
});

describe('makeRelayPausedMessage()', () => {
  it('produces a message with the correct type', () => {
    const msg = makeRelayPausedMessage('BLE disconnect');
    expect(msg.type).toBe(MessageType.RELAY_PAUSED);
  });

  it('carries the reason string', () => {
    const msg = makeRelayPausedMessage('BLE disconnect');
    expect(msg.payload.reason).toBe('BLE disconnect');
  });
});

describe('makeRelayResumedMessage()', () => {
  it('produces a message with the correct type', () => {
    const msg = makeRelayResumedMessage();
    expect(msg.type).toBe(MessageType.RELAY_RESUMED);
  });

  it('includes a valid ISO-8601 timestamp', () => {
    const msg = makeRelayResumedMessage();
    expect(new Date(msg.timestamp).toISOString()).toBe(msg.timestamp);
  });
});

describe('makeClientReadyMessage()', () => {
  it('produces a message with the correct type', () => {
    const msg = makeClientReadyMessage(true);
    expect(msg.type).toBe(MessageType.CLIENT_READY);
  });

  it('carries the ready flag', () => {
    expect(makeClientReadyMessage(true).payload.ready).toBe(true);
    expect(makeClientReadyMessage(false).payload.ready).toBe(false);
  });
});
