import type { BoardState } from './boardState';
import type { BoardCommand } from './commands';

export type BoardEventName = 'stateChanged' | 'commandApplied';

export interface BoardEventMap {
  stateChanged: { state: BoardState };
  commandApplied: { command: BoardCommand; state: BoardState };
}

export type BoardEventListener<K extends BoardEventName> = (payload: BoardEventMap[K]) => void;
