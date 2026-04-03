/**
 * Return to Dark Tower game board data.
 * Contains types and constants for all 60 board locations across the four kingdoms.
 */

/** The terrain type of a board location. */
export type TerrainType = 'Hills' | 'Lake' | 'Desert' | 'Mountains' | 'Grasslands' | 'Forest';

/** The building present at a board location, if any. */
export type BuildingType = 'Bazaar' | 'Village' | 'Sanctuary' | 'Citadel';

/** One of the four kingdoms on the game board. Lowercase to match library conventions. */
export type BoardKingdom = 'north' | 'south' | 'east' | 'west';

/** A named grouping of thematically connected locations on the board. */
export type BoardGrouping =
  (typeof BOARD_GROUPINGS)[keyof typeof BOARD_GROUPINGS];

/** A single location on the Return to Dark Tower game board. */
export type BoardLocation = {
  /** The location's name. */
  name: string;
  /** The terrain type of this location. */
  terrain: TerrainType;
  /** The building at this location, if any. */
  building?: BuildingType;
  /** The kingdom this location belongs to. */
  kingdom: BoardKingdom;
  /** Named grouping this location belongs to (e.g. "Long Water"), if any. */
  grouping?: BoardGrouping;
};

/** Named groupings of thematically connected locations on the board. */
export const BOARD_GROUPINGS = {
  /** Dayside and Fivepint (North kingdom lakes). */
  LONG_WATER: 'Long Water',
  /** Delmsmire, Arkartus, and Yellowpike (West kingdom forests). */
  THE_GREAT_WOODS: 'The Great Woods',
  /** The Throne, The Cloister, and Archmont (South kingdom grasslands). */
  REGAL_RUN: 'Regal Run',
} as const;

/** All 60 locations on the Return to Dark Tower game board. */
export const BOARD_LOCATIONS: BoardLocation[] = [
  // ── North ───────────────────────────────────────────────────────────────
  { name: 'Broken Lands', terrain: 'Hills', kingdom: 'north' },
  { name: 'Dayside', terrain: 'Lake', building: 'Bazaar', kingdom: 'north', grouping: BOARD_GROUPINGS.LONG_WATER },
  { name: "Egan's End", terrain: 'Grasslands', building: 'Village', kingdom: 'north' },
  { name: 'Fivepint', terrain: 'Lake', kingdom: 'north', grouping: BOARD_GROUPINGS.LONG_WATER },
  { name: 'Green Bridge', terrain: 'Grasslands', kingdom: 'north' },
  { name: 'Lodestone Mountains', terrain: 'Mountains', kingdom: 'north' },
  { name: 'Lower Ice Fangs', terrain: 'Mountains', kingdom: 'north' },
  { name: 'Muted Forest', terrain: 'Forest', kingdom: 'north' },
  { name: 'Peaks of the Djinn', terrain: 'Mountains', kingdom: 'north' },
  { name: 'Pearl of the North', terrain: 'Grasslands', kingdom: 'north' },
  { name: 'Radiant Mountains', terrain: 'Mountains', building: 'Citadel', kingdom: 'north' },
  { name: 'Rimeweald', terrain: 'Forest', kingdom: 'north' },
  { name: 'The Tundra', terrain: 'Desert', kingdom: 'north' },
  { name: 'Tower Scar Desert', terrain: 'Desert', kingdom: 'north' },
  { name: 'Upper Ice Fangs', terrain: 'Mountains', building: 'Sanctuary', kingdom: 'north' },

  // ── East ────────────────────────────────────────────────────────────────
  { name: 'Big Sister', terrain: 'Mountains', kingdom: 'east' },
  { name: 'Bleak Wastes', terrain: 'Desert', kingdom: 'east' },
  { name: 'Copper Grove', terrain: 'Forest', kingdom: 'east' },
  { name: 'Dragontooth Lake', terrain: 'Lake', kingdom: 'east' },
  { name: 'Duwani', terrain: 'Grasslands', building: 'Village', kingdom: 'east' },
  { name: 'Forest of Shades', terrain: 'Forest', kingdom: 'east' },
  { name: 'Greater Tombstones', terrain: 'Hills', building: 'Sanctuary', kingdom: 'east' },
  { name: 'Inner Kinghills', terrain: 'Hills', building: 'Citadel', kingdom: 'east' },
  { name: 'Jewel Hills', terrain: 'Hills', kingdom: 'east' },
  { name: 'Lake of Songs', terrain: 'Lake', kingdom: 'east' },
  { name: 'Lesser Tombstones', terrain: 'Hills', kingdom: 'east' },
  { name: 'Outer Kinghills', terrain: 'Hills', kingdom: 'east' },
  { name: 'The Decaying Wilds', terrain: 'Grasslands', kingdom: 'east' },
  { name: 'Three Rivers', terrain: 'Grasslands', building: 'Bazaar', kingdom: 'east' },
  { name: "Utar's Barrows", terrain: 'Desert', kingdom: 'east' },

  // ── West ────────────────────────────────────────────────────────────────
  { name: 'Anza', terrain: 'Grasslands', building: 'Village', kingdom: 'west' },
  { name: 'Arkartus', terrain: 'Forest', building: 'Sanctuary', kingdom: 'west', grouping: BOARD_GROUPINGS.THE_GREAT_WOODS },
  { name: 'Ash Hills', terrain: 'Hills', kingdom: 'west' },
  { name: 'Cloudhold', terrain: 'Mountains', kingdom: 'west' },
  { name: 'Delmsmire', terrain: 'Forest', kingdom: 'west', grouping: BOARD_GROUPINGS.THE_GREAT_WOODS },
  { name: 'Hissing Groves', terrain: 'Forest', building: 'Citadel', kingdom: 'west' },
  { name: 'Idran Forest', terrain: 'Forest', kingdom: 'west' },
  { name: 'Lonelight Hills', terrain: 'Hills', kingdom: 'west' },
  { name: 'Lost Lands', terrain: 'Desert', kingdom: 'west' },
  { name: 'Plains of Plovo', terrain: 'Grasslands', building: 'Bazaar', kingdom: 'west' },
  { name: 'Plains of Woldra', terrain: 'Grasslands', kingdom: 'west' },
  { name: 'The Empty Glade', terrain: 'Grasslands', kingdom: 'west' },
  { name: 'The Grass Sea', terrain: 'Grasslands', kingdom: 'west' },
  { name: 'Weeping Waters', terrain: 'Lake', kingdom: 'west' },
  { name: 'Yellowpike', terrain: 'Forest', kingdom: 'west', grouping: BOARD_GROUPINGS.THE_GREAT_WOODS },

  // ── South ───────────────────────────────────────────────────────────────
  { name: 'Archmont', terrain: 'Grasslands', kingdom: 'south', grouping: BOARD_GROUPINGS.REGAL_RUN },
  { name: "Azkol's Bane", terrain: 'Desert', kingdom: 'south' },
  { name: 'Bone Hills', terrain: 'Hills', kingdom: 'south' },
  { name: 'Howling Desert', terrain: 'Desert', building: 'Citadel', kingdom: 'south' },
  { name: 'Irontops', terrain: 'Mountains', kingdom: 'south' },
  { name: 'Little Sister', terrain: 'Mountains', kingdom: 'south' },
  { name: 'Middle Sister', terrain: 'Mountains', kingdom: 'south' },
  { name: 'Mountains of the Watchers', terrain: 'Mountains', kingdom: 'south' },
  { name: 'Pine Barrens', terrain: 'Forest', kingdom: 'south' },
  { name: 'Sands of Madness', terrain: 'Desert', building: 'Sanctuary', kingdom: 'south' },
  { name: 'Southern Wastes', terrain: 'Desert', building: 'Village', kingdom: 'south' },
  { name: 'The Cloister', terrain: 'Grasslands', kingdom: 'south', grouping: BOARD_GROUPINGS.REGAL_RUN },
  { name: 'The Emerald Expanse', terrain: 'Grasslands', building: 'Bazaar', kingdom: 'south' },
  { name: 'The Throne', terrain: 'Grasslands', kingdom: 'south', grouping: BOARD_GROUPINGS.REGAL_RUN },
  { name: "Ulamel's Hollow", terrain: 'Grasslands', kingdom: 'south' },
];

/** All 60 board locations indexed by name for O(1) lookup. */
export const BOARD_LOCATION_BY_NAME: Record<string, BoardLocation> =
  Object.fromEntries(BOARD_LOCATIONS.map((loc) => [loc.name, loc]));
