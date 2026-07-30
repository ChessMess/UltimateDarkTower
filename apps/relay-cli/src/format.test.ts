import { describe, it, expect } from 'vitest';
import { drumSide, formatUptime, formatRelativeTime, getLanAddress } from './format';

describe('drumSide', () => {
  it('maps 0-3 to compass names', () => {
    expect(drumSide(0)).toBe('north');
    expect(drumSide(1)).toBe('east');
    expect(drumSide(2)).toBe('south');
    expect(drumSide(3)).toBe('west');
  });

  it('returns ? for an out-of-range position', () => {
    expect(drumSide(4)).toBe('?');
    expect(drumSide(-1)).toBe('?');
  });
});

describe('formatUptime', () => {
  it('formats under an hour as MM:SS', () => {
    expect(formatUptime(0)).toBe('00:00');
    expect(formatUptime(65_000)).toBe('01:05');
  });

  it('formats an hour or more as H:MM:SS', () => {
    expect(formatUptime(3_661_000)).toBe('1:01:01');
  });
});

describe('formatRelativeTime', () => {
  const now = 1_000_000;

  it('returns never for null', () => {
    expect(formatRelativeTime(null, now)).toBe('never');
  });

  it('returns just now for sub-second deltas', () => {
    expect(formatRelativeTime(new Date(now - 200), now)).toBe('just now');
  });

  it('formats seconds, minutes, and hours', () => {
    expect(formatRelativeTime(new Date(now - 5_000), now)).toBe('5s ago');
    expect(formatRelativeTime(new Date(now - 65_000), now)).toBe('1m ago');
    expect(formatRelativeTime(new Date(now - 3_665_000), now)).toBe('1h ago');
  });
});

describe('getLanAddress', () => {
  it('picks the first non-internal IPv4 address', () => {
    const fake = {
      lo0: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
      en0: [
        { address: 'fe80::1', family: 'IPv6', internal: false },
        { address: '192.168.1.42', family: 'IPv4', internal: false },
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    expect(getLanAddress(fake)).toBe('192.168.1.42');
  });

  it('returns null when nothing qualifies', () => {
    const fake = {
      lo0: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    expect(getLanAddress(fake)).toBeNull();
  });
});
