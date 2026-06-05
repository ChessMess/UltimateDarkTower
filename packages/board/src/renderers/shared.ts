import type { BoardState } from '../state/boardState';

/** Focus/view selector shared by all renderers (maps to Display's cardinal sides + an overview). */
export type BoardFocus = 'all' | 'north' | 'east' | 'south' | 'west';

/** Common renderer contract: given a state (and optional focus), produce output. */
export interface BoardRenderer {
  render(state: BoardState, focus?: BoardFocus): void;
  dispose?(): void;
}
