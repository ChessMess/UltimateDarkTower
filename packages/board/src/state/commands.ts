import type { BoardToken } from './boardState';

/** The command vocabulary the reducer understands. Extend as features land. */
export type BoardCommand =
  | { type: 'addToken'; token: BoardToken }
  | { type: 'removeToken'; tokenId: string }
  | { type: 'moveToken'; tokenId: string; location: string }
  | { type: 'reset' };

export type BoardCommandType = BoardCommand['type'];
