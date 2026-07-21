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

/**
 * The `imageRef` a cloned RtDT board carries — "render me on the built-in Return to Dark Tower
 * art".
 *
 * DELIBERATELY NOT a `library.resources.images` key. The real art is 4096²/22 MB — ~30 MB once
 * base64-encoded into a document, against a 50 MB export budget, and 20× the Creator's own 1.5 MB
 * cap on uploaded board art. So a clone references it instead of embedding it, and each consumer
 * maps this ref to ITS OWN copy of the board image (the Player to `public/assets/board.png`, the
 * Creator to its downscaled designer backdrop). Nothing is added to the scenario document.
 *
 * Safe by construction: `$defs/resourceKey` is an open string so L1 accepts it, L2
 * (`validate-refs`) never resolves image refs, and the schema already documents a dangling image
 * ref as "renders a placeholder" — so a consumer that doesn't know this sentinel degrades to
 * blank art rather than erroring.
 */
export const BUILTIN_BOARD_IMAGE_REF = 'builtin:rtdt-board';

/** True when `ref` asks for the built-in RtDT art rather than a stored image. */
export function isBuiltinBoardImageRef(ref: string | undefined): boolean {
  return ref === BUILTIN_BOARD_IMAGE_REF;
}

/** The custom board a scenario selected, plus where its art lives. */
export interface ActiveBoard {
  boardId: string;
  def: BoardDefinition;
  /**
   * `library.resources.images` key for the board art, if the author supplied one — or
   * {@link BUILTIN_BOARD_IMAGE_REF} when the board keeps the built-in RtDT art.
   */
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
