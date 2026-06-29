/**
 * The bridge between the live state sources and the single `GameSession` object.
 *
 * - `captureSession` reads the current tower & board from the sources and folds them into
 *   a session, keeping the non-source parts (meta/config/progress/playerBoards) from a base
 *   session the store owns.
 * - `applyGameSession` hydrates the sources from a loaded session (the load/share path).
 *
 * Tower & board are deep-cloned at the boundary so a captured snapshot never aliases the
 * live, still-mutating source state.
 */
import type { BoardStateSource, TowerStateSource } from '@/sources/types';
import { cloneSession } from './serialize';
import type { GameSession } from './types';

/** Build a session from a base (meta/config/progress/playerBoards) + the live tower/board sources. */
export function captureSession(
  base: GameSession,
  tower: TowerStateSource,
  board: BoardStateSource,
): GameSession {
  const next = cloneSession(base);
  next.tower = {
    state: structuredClone(tower.getState()),
    brokenSeals: tower.getBrokenSeals().map((s) => ({ ...s })),
  };
  next.board = structuredClone(board.getState());
  next.meta.updatedAt = new Date().toISOString();
  return next;
}

/** Push a loaded session's tower & board into the live sources (hydration). */
export function applyGameSession(
  session: GameSession,
  tower: TowerStateSource,
  board: BoardStateSource,
): void {
  tower.load(session.tower.state, session.tower.brokenSeals);
  board.load(session.board);
}
