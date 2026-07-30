/**
 * Pure formatting helpers for the dashboard. Deliberately free of `ink`/`react`
 * imports so they can be unit-tested without pulling in ink's yoga-layout wasm.
 */
import { networkInterfaces } from 'node:os';

const COMPASS = ['north', 'east', 'south', 'west'] as const;

/** Map a drum's raw 2-bit position (0-3) to its compass name, `?` if out of range. */
export function drumSide(position: number): string {
  return COMPASS[position] ?? '?';
}

/** Format a millisecond duration as `H:MM:SS` (or `MM:SS` under an hour). */
export function formatUptime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Format a past Date as a short relative "Xs ago" / "Xm ago" string, or `never`. */
export function formatRelativeTime(date: Date | null, now: number = Date.now()): string {
  if (!date) return 'never';
  const seconds = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (seconds < 1) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

/** First non-internal IPv4 address, for printing a LAN-reachable relay URL. */
export function getLanAddress(
  interfaces: ReturnType<typeof networkInterfaces> = networkInterfaces(),
): string | null {
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (!entry.internal && entry.family === 'IPv4') {
        return entry.address;
      }
    }
  }
  return null;
}
