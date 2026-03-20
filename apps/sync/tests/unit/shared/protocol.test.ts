/**
 * protocol.test.ts — unit tests for the shared WebSocket protocol module.
 *
 * Tests cover message factory helpers and the MessageType constants to verify
 * that the protocol layer produces well-formed relay messages.
 */

import {
  MessageType,
  PROTOCOL_VERSION,
  makeTowerCommandMessage,
  makeSyncStateMessage,
  makeHostStatusMessage,
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
});

describe('PROTOCOL_VERSION', () => {
  it('is a non-empty semver string', () => {
    expect(typeof PROTOCOL_VERSION).toBe('string');
    expect(PROTOCOL_VERSION.length).toBeGreaterThan(0);
    expect(PROTOCOL_VERSION).toMatch(/^\d+\.\d+\.\d+/);
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
    clientCount: 2,
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
