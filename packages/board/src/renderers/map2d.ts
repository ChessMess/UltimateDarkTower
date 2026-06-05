import type { BoardState } from '../state/boardState';
import type { BoardFocus, BoardRenderer } from './shared';

/**
 * 2D overhead map renderer (SVG/canvas over the board image). Scaffold stub:
 * real token placement waits on UDT's BOARD_ANCHORS + BOARD_IMAGE_INFO (spec §7).
 */
export class BoardMap2D implements BoardRenderer {
  constructor(private readonly container: HTMLElement) {}

  render(_state: BoardState, _focus: BoardFocus = 'all'): void {
    // TODO(scaffold): draw the board image (via assetBaseUrl) and place tokens
    // using normalized BOARD_ANCHORS once they ship upstream.
    this.container.dataset.boardRendered = 'true';
  }
}
