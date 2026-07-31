import type { SkullPhysicsHandle } from 'ultimatedarktowerdisplay/physics';

/**
 * Reconcile the 3D scene's skulls to `next` drops. Returns the new "previous"
 * count. A decrease (new game / session reset) clears and replays from zero.
 * `next === 0` always forces a clear, even if `prev` already reads 0 — a real
 * game never un-drops a skull, so a reset to zero is an unambiguous "the floor
 * is empty" signal regardless of whether `prev`'s bookkeeping drifted (e.g.
 * across a pop-out/pop-in re-attach). Cheap even when the world's already
 * empty: `clearSkulls()` on an empty world is a no-op.
 */
export function syncSkulls(
  handle: Pick<SkullPhysicsHandle, 'dropSkull' | 'clearSkulls'>,
  prev: number,
  next: number,
): number {
  if (next === 0 || next < prev) {
    handle.clearSkulls();
    prev = 0;
  }
  for (let i = prev; i < next; i++) handle.dropSkull();
  return next;
}
