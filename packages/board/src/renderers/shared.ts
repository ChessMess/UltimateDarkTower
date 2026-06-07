import type { BoardKingdom } from '../data/udtReexports';
import type { BoardState } from '../state/boardState';

/** Camera/view angle. A 3D-camera concept — inert for the readout and 2D map; wired through for M3. */
export type BoardViewAngle = 'overhead' | 'isometric';

/**
 * Focus/view selector shared by all renderers (PRD §7.2). `kingdom` maps to Display's cardinal sides
 * (plus `all`); `angle` is reserved for the 3D camera (M3) and ignored by the readout/2D map.
 */
export type BoardFocus = { kingdom: BoardKingdom | 'all'; angle: BoardViewAngle };

/** The default focus: the whole board, overhead. */
export const DEFAULT_FOCUS: BoardFocus = { kingdom: 'all', angle: 'overhead' };

/** Structural equality for two focuses — the early-return / fan-out loop guard. */
export function focusEquals(a: BoardFocus, b: BoardFocus): boolean {
  return a.kingdom === b.kingdom && a.angle === b.angle;
}

/** Common renderer contract: given a state (and optional focus), produce output. */
export interface BoardRenderer {
  render(state: BoardState, focus?: BoardFocus): void;
  dispose?(): void;
}
