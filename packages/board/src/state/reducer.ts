import type { BoardState } from './boardState';
import { createDefaultBoardState } from './boardState';
import type { BoardCommand } from './commands';

/** Pure reducer: `(state, command) -> nextState`. Never mutates `state`. */
export function applyBoardCommand(state: BoardState, command: BoardCommand): BoardState {
  switch (command.type) {
    case 'addToken':
      return { ...state, tokens: [...state.tokens, command.token] };
    case 'removeToken':
      return { ...state, tokens: state.tokens.filter((t) => t.id !== command.tokenId) };
    case 'moveToken':
      return {
        ...state,
        tokens: state.tokens.map((t) =>
          t.id === command.tokenId ? { ...t, location: command.location } : t
        ),
      };
    case 'reset':
      return createDefaultBoardState();
    default:
      return state;
  }
}
