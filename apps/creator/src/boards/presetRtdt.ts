// The built-in Return to Dark Tower board, as a cloneable editor preset.
//
// TRAP — this cannot be a spread of `RTDT_BOARD_DEFINITION`. That definition keeps core's
// CAPITALIZED building names ('Citadel'), because the board renderers only test `building` for
// truthiness. The scenario schema's `$defs/buildingType` is a CLOSED LOWERCASE enum, so a spread
// clone fails L1 validation. Every `building` must go through `.toLowerCase()` here.
// (`terrain` is an open string in the schema, so 'Grasslands' passes through as-is.)
//
// No `imageRef`: the RtDT art is not bundled into scenario documents. A clone renders on the
// player's own copy of the board image; the author can upload their own art to override it.

// RtDT data comes from @udtc/adapters' reference layer, NOT a direct import of
// `ultimatedarktower`/`ultimatedarktowerboard`. See the note in ./vocabulary.ts — importing either
// here pulls UDT's Node-only BLE stack into the browser bundle and the app dies at load.
import { getUDTReferenceLayer } from '@udtc/adapters';
import type { Board, BuildingType, Kingdom, LocationAnchors } from './shared';
import { BUILDING_TYPES } from './shared';

function toBuildingType(raw: string | undefined): BuildingType | undefined {
  if (!raw) return undefined;
  const lowered = raw.toLowerCase();
  return (BUILDING_TYPES as readonly string[]).includes(lowered)
    ? (lowered as BuildingType)
    : undefined;
}

/** A deep clone of the built-in RtDT board under `id`, schema-valid and 3D-ready. */
export function buildRtdtPreset(id: string): Board {
  const udt = getUDTReferenceLayer();
  const locations = udt.boardLocations.map((l) => {
    const building = toBuildingType(l.building);
    return {
      name: l.name,
      kingdom: l.kingdom as Kingdom,
      terrain: String(l.terrain),
      ...(building ? { building } : {}),
    };
  });

  const anchors: Record<string, LocationAnchors> = {};
  for (const [name, slots] of Object.entries(udt.boardAnchors)) {
    const copy: LocationAnchors = {};
    for (const [slot, point] of Object.entries(slots)) {
      if (point) copy[slot as keyof LocationAnchors] = { x: point.x, y: point.y };
    }
    anchors[name] = copy;
  }

  const adjacency: Record<string, string[]> = {};
  for (const [name, neighbours] of Object.entries(udt.boardAdjacency)) {
    adjacency[name] = [...neighbours];
  }

  return {
    id,
    name: 'Return to Dark Tower (copy)',
    imageInfo: {
      width: udt.boardImageInfo.width,
      height: udt.boardImageInfo.height,
      centerX: udt.boardImageInfo.centerX,
      centerY: udt.boardImageInfo.centerY,
      radius: udt.boardImageInfo.radius,
      northHeadingDegrees: udt.boardImageInfo.northHeadingDegrees,
    },
    locations,
    anchors,
    adjacency,
  };
}
