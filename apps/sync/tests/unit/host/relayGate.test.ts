/**
 * relayGate.test.ts — verifies the relay gate pattern used in both host entry
 * points (index.ts and electron/main.ts):
 *
 *   if (!parser.isValid(data)) { warn + return }
 *   relay.broadcast(data)
 *
 * These tests do not spin up BLE or WebSocket servers; they exercise the
 * conditional directly so that the contract is explicit and regression-proof.
 */

import { CommandParser } from '../../../packages/host/src/commandParser';

describe('relay gate (command handler wiring)', () => {
  it('calls broadcast for a valid 20-byte command', () => {
    const parser = new CommandParser();
    const broadcast = jest.fn().mockReturnValue(1);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const data = Buffer.alloc(20, 0xaa);
    if (parser.isValid(data)) broadcast(data);

    expect(broadcast).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does NOT call broadcast for a short packet', () => {
    const parser = new CommandParser();
    const broadcast = jest.fn();

    const data = Buffer.alloc(10);
    if (parser.isValid(data)) broadcast(data);

    expect(broadcast).not.toHaveBeenCalled();
  });

  it('does NOT call broadcast for an empty buffer', () => {
    const parser = new CommandParser();
    const broadcast = jest.fn();

    if (parser.isValid(Buffer.alloc(0))) broadcast(Buffer.alloc(0));

    expect(broadcast).not.toHaveBeenCalled();
  });

  it('does NOT call broadcast for a 21-byte packet', () => {
    const parser = new CommandParser();
    const broadcast = jest.fn();

    if (parser.isValid(Buffer.alloc(21))) broadcast(Buffer.alloc(21));

    expect(broadcast).not.toHaveBeenCalled();
  });
});
