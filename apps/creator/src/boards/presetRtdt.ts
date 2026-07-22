// The built-in Return to Dark Tower board, as a cloneable editor preset.
//
// TRAP — this cannot be a spread of `RTDT_BOARD_DEFINITION`. That definition keeps core's
// CAPITALIZED building names ('Citadel'), because the board renderers only test `building` for
// truthiness. The scenario schema's `$defs/buildingType` is `$defs/id` — kebab/snake case, so
// lowercase-only (it was a closed lowercase enum before 0.4.7 opened it; either way a spread clone
// fails L1). Every `building` must go through `.toLowerCase()` here.
// (`terrain` is an open string in the schema, so 'Grasslands' passes through as-is.)
//
// The art is REFERENCED, not embedded: `imageRef` is `BUILTIN_BOARD_IMAGE_REF`, so the clone
// renders on each consumer's own copy of the board image (the real art is 4096²/22 MB — ~30 MB of
// base64 in a shared document). Uploading art overwrites the ref with a stored `board-<id>` key.

// RtDT data comes from @udtc/adapters' reference layer, NOT a direct import of
// `ultimatedarktower`/`ultimatedarktowerboard`. See the note in ./vocabulary.ts — importing either
// here pulls UDT's Node-only BLE stack into the browser bundle and the app dies at load.
import { BUILTIN_BOARD_IMAGE_REF, getUDTReferenceLayer } from '@udtc/adapters';
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
    imageRef: BUILTIN_BOARD_IMAGE_REF,
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
