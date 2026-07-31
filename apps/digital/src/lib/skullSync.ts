import type { SkullPhysicsHandle } from 'ultimatedarktowerdisplay/physics';

/**
 * Reconcile the 3D scene's skulls to `next` drops. Returns the new "previous"
 * count. A decrease (new game / session reset) clears and replays from zero.
 */
export function syncSkulls(
  handle: Pick<SkullPhysicsHandle, 'dropSkull' | 'clearSkulls'>,
  prev: number,
  next: number,
): number {
  if (next < prev) {
    handle.clearSkulls();
    prev = 0;
  }
  for (let i = prev; i < next; i++) handle.dropSkull();
  return next;
}
