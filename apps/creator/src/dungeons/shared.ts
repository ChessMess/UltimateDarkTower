// Shared model, helpers, and inline styles for the first-class dungeon builder
// (apps/creator/src/dungeons). Named exports; inline React.CSSProperties + theme CSS variables per
// repo convention. Mirrors decks/shared.ts.

import type { CSSProperties } from 'react';
import type { ScenarioDoc } from '../types';

export const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// schema $defs/dungeonTrait
export const DUNGEON_TRAITS = ['Beast', 'Magic', 'Humanoid', 'Melee', 'Undead', 'Stealth'] as const;
export type DungeonTrait = (typeof DUNGEON_TRAITS)[number];

export const DIRS = ['N', 'E', 'S', 'W'] as const;
export type Dir = (typeof DIRS)[number];
export const OPPOSITE: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E' };
// Screen coords: E = col+1, W = col-1, S = row+1, N = row-1 (matches engine geometry).
export const DELTA: Record<Dir, { dc: number; dr: number }> = {
  N: { dc: 0, dr: -1 },
  S: { dc: 0, dr: 1 },
  E: { dc: 1, dr: 0 },
  W: { dc: -1, dr: 0 },
};
export const DIR_LABEL: Record<Dir, string> = { N: '↑ N', E: '→ E', S: '↓ S', W: '← W' };

export type RoomExits = Partial<Record<Dir, 'wall' | 'door'>>;
export type DungeonRoom = {
  id: string;
  name?: string;
  cell: { col: number; row: number };
  exits: RoomExits;
  displayText?: string;
  artRef?: string;
  isEntrance?: boolean;
  isTarget?: boolean;
  insideEvent?: unknown[];
  improveOnce?: { effects: unknown[] };
  enterRequirement?: { condition?: unknown; spiritCost?: number; onFail?: unknown[] };
};
/** masterBitmap placement in grid-cell units (schema 0.4.5). Absent = fills the grid exactly. */
export type BitmapRect = { x: number; y: number; w: number; h: number };
export type Dungeon = {
  id: string;
  name?: string;
  trait?: DungeonTrait;
  grid: { cols: number; rows: number };
  masterBitmap?: string;
  bitmapRect?: BitmapRect;
  spawningQuestId?: string;
  idleLight?: string;
  rooms: DungeonRoom[];
};

/** The map image's rect in grid-cell units — the stored bitmapRect, or the grid-filling default. */
export function bitmapRectOf(d: Pick<Dungeon, 'bitmapRect' | 'grid'>): BitmapRect {
  return d.bitmapRect ?? { x: 0, y: 0, w: d.grid.cols, h: d.grid.rows };
}

export function dungeonsOf(doc: ScenarioDoc | null): Record<string, Dungeon> {
  const lib = (doc?.library as Record<string, unknown> | undefined) ?? {};
  return (lib.dungeons as Record<string, Dungeon> | undefined) ?? {};
}
export function questsOf(doc: ScenarioDoc | null): Record<string, { id: string; name?: string }> {
  const lib = (doc?.library as Record<string, unknown> | undefined) ?? {};
  return (lib.quests as Record<string, { id: string; name?: string }> | undefined) ?? {};
}
export function imagesOf(doc: ScenarioDoc | null): Record<string, string> {
  const lib = (doc?.library as Record<string, unknown> | undefined) ?? {};
  const resources = lib.resources as Record<string, unknown> | undefined;
  return (resources?.images as Record<string, string> | undefined) ?? {};
}
export function resolveImage(doc: ScenarioDoc | null, key: string | undefined): string | undefined {
  if (!key) return undefined;
  return imagesOf(doc)[key];
}

/** the room occupying a grid cell (or undefined) */
export function roomAtCell(d: Dungeon, col: number, row: number): DungeonRoom | undefined {
  return d.rooms.find((r) => r.cell.col === col && r.cell.row === row);
}

/** true when some dungeon.subflow node in the graph references this dungeonId (see syncDungeonNodes) */
export function referencedBySubflow(doc: ScenarioDoc | null, dungeonId: string): boolean {
  if (!doc) return false;
  return doc.graph.nodes.some(
    (n) => n.kind === 'dungeon.subflow' && (n.props as { dungeonId?: string } | undefined)?.dungeonId === dungeonId,
  );
}

/** rough byte size of a stored string (data URLs are ASCII, so length ≈ bytes) */
export const byteLen = (s: string): number => s.length;
/** ~5 MB localStorage budget shared with decks (library.resources.images). */
export const IMAGE_BUDGET_BYTES = 5_000_000;

export const inputStyle: CSSProperties = {
  padding: '4px 6px',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 4,
  fontSize: 12,
  background: 'var(--c-surface-raised)',
  color: 'var(--c-text)',
  boxSizing: 'border-box',
};
export const smallBtn: CSSProperties = {
  padding: '4px 10px',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 4,
  background: 'var(--c-surface)',
  color: 'var(--c-text-2)',
  fontSize: 12,
  cursor: 'pointer',
};
export const primaryBtn: CSSProperties = {
  padding: '5px 12px',
  border: 'none',
  borderRadius: 4,
  background: 'var(--c-primary)',
  color: 'var(--c-primary-fg)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};
export const dangerBtn: CSSProperties = {
  padding: '4px 10px',
  border: '1px solid var(--c-danger)',
  borderRadius: 4,
  background: 'transparent',
  color: 'var(--c-danger)',
  fontSize: 12,
  cursor: 'pointer',
};
export const dangerIconBtn: CSSProperties = {
  padding: '2px 6px',
  border: 'none',
  borderRadius: 4,
  background: 'transparent',
  color: 'var(--c-danger)',
  fontSize: 11,
  lineHeight: 1,
  cursor: 'pointer',
};
export const labelStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.04,
  textTransform: 'uppercase',
  color: 'var(--c-text-faint)',
  margin: '8px 0 4px',
};
