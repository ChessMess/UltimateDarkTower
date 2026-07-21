import { describe, it, expect } from 'vitest';
import { parsePort } from './cli.js';

describe('parsePort', () => {
  it('accepts a valid port', () => {
    expect(parsePort('3001')).toBe(3001);
    expect(parsePort('1')).toBe(1);
    expect(parsePort('65535')).toBe(65535);
  });

  it('throws a friendly error when --port has no value (final arg → undefined)', () => {
    // This is the exact crash the validation prevents: NaN → app.listen(NaN) → ERR_SOCKET_BAD_PORT.
    expect(() => parsePort(undefined)).toThrow(/Invalid --port/);
  });

  it('rejects non-numeric, out-of-range, and non-integer values', () => {
    expect(() => parsePort('--stdio-only')).toThrow(/Invalid --port/);
    expect(() => parsePort('0')).toThrow(/between 1 and 65535/);
    expect(() => parsePort('65536')).toThrow(/between 1 and 65535/);
    expect(() => parsePort('3.5')).toThrow(/Invalid --port/);
    expect(() => parsePort('')).toThrow(/Invalid --port/);
  });
});
