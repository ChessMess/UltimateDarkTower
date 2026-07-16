// The active board's location vocabulary — what every location dropdown in the app offers.
//
// A scenario with a custom board (setup.board.boardRef) offers that board's names; everything
// else keeps the built-in Return to Dark Tower roster. This mirrors the L2 check in
// `@udtc/adapters`' `validate-refs`, so what the editor offers is exactly what validates.

// RtDT data comes from @udtc/adapters' reference layer, NOT a direct import of
// `ultimatedarktower`/`ultimatedarktowerboard`: the creator's Vite config aliases UDT to its CJS
// build, whose entry reaches UDT's Node-only BLE stack (@stoprocent/noble) and breaks the browser
// bundle. `udt.ts` is the single module allowed to import UDT, and it is pre-bundled for the browser.
import { getUDTReferenceLayer } from '@udtc/adapters';
import type { ScenarioDoc } from '../types';
import { activeBoardId, boardsOf } from './shared';

const RTDT_LOCATION_NAMES: readonly string[] = getUDTReferenceLayer().boardLocations.map(
  (l) => l.name,
);

/**
 * Location names for the scenario's active board, in authored order. Falls back to the RtDT
 * roster when no custom board is selected — or when the selected one is missing/empty, so a
 * dangling `boardRef` (which L2 flags) degrades to a usable list instead of an empty dropdown.
 */
export function activeBoardLocationNames(doc: ScenarioDoc | null): readonly string[] {
  const id = activeBoardId(doc);
  if (!id) return RTDT_LOCATION_NAMES;
  const board = boardsOf(doc)[id];
  const names = board?.locations?.map((l) => l.name).filter(Boolean) ?? [];
  return names.length > 0 ? names : RTDT_LOCATION_NAMES;
}
