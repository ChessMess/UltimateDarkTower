// Resolves the board a scenario plays on.
//
// `setup.board` is a oneOf: `{boardStateRef}` / `{boardState}` mean the implicit built-in
// Return to Dark Tower board (the pre-0.4.6 behaviour), while `{boardRef}` names an entry in
// `library.boards` — a creator-authored custom board. `resolveActiveBoardDef` returns `null`
// for the implicit case, which every consumer reads as "use the RtDT default".
//
// The `BoardDefinition` import is type-only (precedent: `board.ts`), so this module adds no
// runtime dependency on `ultimatedarktowerboard`.

import type { BoardDefinition } from 'ultimatedarktowerboard';

/** The custom board a scenario selected, plus where its art lives. */
export interface ActiveBoard {
  boardId: string;
  def: BoardDefinition;
  /** `library.resources.images` key for the board art, if the author supplied one. */
  imageRef?: string;
}

function obj(v: unknown): Record<string, unknown> | undefined {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

/**
 * Coerces a raw `library.boards[id]` entry into a `BoardDefinition`. The document has already
 * passed L1 (the schema pins the shape), so this is a narrow structural cast rather than a
 * re-validation — it only guards the fields consumers dereference without checking.
 */
export function boardDefFromLibrary(id: string, raw: unknown): BoardDefinition | null {
  const b = obj(raw);
  if (!b) return null;
  const imageInfo = obj(b['imageInfo']);
  const locations = b['locations'];
  if (!imageInfo || !Array.isArray(locations)) return null;
  return {
    id: str(b['id']) ?? id,
    name: str(b['name']),
    imageInfo: imageInfo as unknown as BoardDefinition['imageInfo'],
    locations: locations as unknown as BoardDefinition['locations'],
    anchors: (obj(b['anchors']) ?? {}) as unknown as BoardDefinition['anchors'],
    adjacency: obj(b['adjacency']) as unknown as BoardDefinition['adjacency'],
  };
}

/**
 * The custom board this scenario plays on, or `null` for the implicit built-in RtDT board
 * (no `boardRef`, or a `boardRef` that doesn't resolve — L2 reports the dangling ref; runtime
 * degrades to the default rather than throwing).
 */
export function resolveActiveBoardDef(scenario: unknown): ActiveBoard | null {
  const s = obj(scenario);
  if (!s) return null;
  const board = obj(obj(s['setup'])?.['board']);
  const boardId = board ? str(board['boardRef']) : undefined;
  if (!boardId) return null;

  const boards = obj(obj(s['library'])?.['boards']);
  const raw = boards?.[boardId];
  if (raw === undefined) return null;

  const def = boardDefFromLibrary(boardId, raw);
  if (!def) return null;
  return { boardId, def, imageRef: str(obj(raw)?.['imageRef']) };
}
