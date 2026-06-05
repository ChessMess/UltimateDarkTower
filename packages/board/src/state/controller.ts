import type { BoardState } from './boardState';
import { createDefaultBoardState } from './boardState';
import type { BoardCommand } from './commands';
import { applyBoardCommand } from './reducer';
import type { BoardEventName, BoardEventListener, BoardEventMap } from './events';

/**
 * Holds the current `BoardState`, runs the reducer on each dispatch, and emits
 * events. The single source of truth that renderers and UI subscribe to.
 */
export class BoardStateController {
  private state: BoardState;
  private readonly listeners: { [K in BoardEventName]: Set<BoardEventListener<K>> } = {
    stateChanged: new Set(),
    commandApplied: new Set(),
  };

  constructor(initial: BoardState = createDefaultBoardState()) {
    this.state = initial;
  }

  getState(): BoardState {
    return this.state;
  }

  /** Apply a command, update state, emit `commandApplied` then `stateChanged`. */
  dispatch(command: BoardCommand): BoardState {
    this.state = applyBoardCommand(this.state, command);
    this.emit('commandApplied', { command, state: this.state });
    this.emit('stateChanged', { state: this.state });
    return this.state;
  }

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<K extends BoardEventName>(name: K, listener: BoardEventListener<K>): () => void {
    this.listeners[name].add(listener);
    return () => {
      this.listeners[name].delete(listener);
    };
  }

  private emit<K extends BoardEventName>(name: K, payload: BoardEventMap[K]): void {
    for (const listener of this.listeners[name]) {
      listener(payload);
    }
  }
}
