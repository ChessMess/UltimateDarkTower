import { BoardStateController } from '../state/controller';
import type { BoardState } from '../state/boardState';
import { createDefaultBoardState } from '../state/boardState';
import { BoardReadout } from '../renderers/readout';
import type { BoardFocus } from '../renderers/shared';

export interface BoardRenderViewOptions {
  initialState?: BoardState;
}

/**
 * Facade tying the controller to the (three-free) renderers and, later, the
 * dockable UI. Re-renders the readout whenever state or focus changes.
 */
export class BoardRenderView {
  readonly controller: BoardStateController;
  readonly readout = new BoardReadout();
  private currentFocus: BoardFocus = 'all';

  constructor(options: BoardRenderViewOptions = {}) {
    this.controller = new BoardStateController(options.initialState ?? createDefaultBoardState());
    this.controller.on('stateChanged', ({ state }) => this.readout.render(state, this.currentFocus));
    this.readout.render(this.controller.getState(), this.currentFocus);
  }

  get focus(): BoardFocus {
    return this.currentFocus;
  }

  setFocus(focus: BoardFocus): void {
    this.currentFocus = focus;
    this.readout.render(this.controller.getState(), this.currentFocus);
  }
}
