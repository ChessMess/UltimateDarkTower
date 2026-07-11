/**
 * Player-board constants + pure transforms (PRD-03). UTDD is a tracker, not a rules
 * engine: these helpers clamp to the base game's capacities and flag the corruption
 * loss, but never block a move or spend a resource on the player's behalf.
 *
 * Every transform returns a NEW `PlayerBoard` (the store replaces the board by reference),
 * so callers do `update(b => withResource(b, 'warriors', +1))`.
 */
import type { PlayerBoard, VirtueTile } from './types';

/** Carry limits (verified: items.md). Treasures ≤ 4; one of each of the 6 gear types. */
export const TREASURE_CAP = 4;
export const GEAR_CAP = 6;

/** Corruption: 0..2 in normal play; the 3rd is a game loss. */
export const CORRUPTION_MAX = 2;
export const CORRUPTION_LOSS = 3;

/** Each hero places 3 hero virtue tiles + 1 kingdom virtue tile (rules.md). */
export const HERO_VIRTUE_COUNT = 3;

/** Fungible pools tracked as plain counts. */
export type ResourceKey = 'warriors' | 'spirit' | 'corruption' | 'potions';

/** Distinct-card collections tracked as labeled lists (some capacity-limited). */
export type ListKey = 'treasures' | 'gear' | 'questItems' | 'companions';

/** Upper bounds per pool (lower bound is always 0). */
const RESOURCE_MAX: Partial<Record<ResourceKey, number>> = {
  // Allow reaching 3 so the loss can be shown; you can't meaningfully hold a 4th.
  corruption: CORRUPTION_LOSS,
};

/** Item caps; `undefined` = unlimited. */
export const LIST_CAPS: Record<ListKey, number | undefined> = {
  treasures: TREASURE_CAP,
  gear: GEAR_CAP,
  questItems: undefined,
  companions: undefined,
};

/** Bump a pool by `delta`, clamped to [0, max]. */
export function withResource(pb: PlayerBoard, key: ResourceKey, delta: number): PlayerBoard {
  const max = RESOURCE_MAX[key] ?? Infinity;
  const next = Math.min(max, Math.max(0, pb[key] + delta));
  return { ...pb, [key]: next };
}

/** True once a labeled list is at its capacity (so the UI can hide "add"). */
export function listIsFull(pb: PlayerBoard, key: ListKey): boolean {
  const cap = LIST_CAPS[key];
  return cap !== undefined && pb[key].length >= cap;
}

/** Append a trimmed label to a list, unless blank or the list is full. */
export function withListAdded(pb: PlayerBoard, key: ListKey, label: string): PlayerBoard {
  const value = label.trim();
  if (!value || listIsFull(pb, key)) return pb;
  return { ...pb, [key]: [...pb[key], value] };
}

/** Remove the item at `index` from a list. */
export function withListRemoved(pb: PlayerBoard, key: ListKey, index: number): PlayerBoard {
  return { ...pb, [key]: pb[key].filter((_, i) => i !== index) };
}

function flip(tile: VirtueTile): VirtueTile {
  return { ...tile, active: !tile.active };
}

/** Toggle a virtue's active side — a hero tile by index, or the kingdom tile. */
export function withVirtueToggled(pb: PlayerBoard, which: 'kingdom' | number): PlayerBoard {
  if (which === 'kingdom') {
    return { ...pb, virtues: { ...pb.virtues, kingdom: flip(pb.virtues.kingdom) } };
  }
  return {
    ...pb,
    virtues: {
      ...pb.virtues,
      hero: pb.virtues.hero.map((tile, i) => (i === which ? flip(tile) : tile)),
    },
  };
}

/** The 3rd corruption is the loss condition (display only). */
export function isCorruptionLoss(pb: PlayerBoard): boolean {
  return pb.corruption >= CORRUPTION_LOSS;
}

/** How many virtue tiles (hero + kingdom) are on their active side. */
export function activeVirtueCount(pb: PlayerBoard): number {
  return pb.virtues.hero.filter((v) => v.active).length + (pb.virtues.kingdom.active ? 1 : 0);
}
