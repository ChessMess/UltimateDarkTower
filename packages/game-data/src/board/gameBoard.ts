/**
 * Return to Dark Tower game board data.
 * Contains types and constants for all 60 board locations across the four kingdoms.
 */

// `import type` is load-bearing: `./board` is its own subpath export with its own esbuild
// bundle, and a value import here would pull all 78 dungeon rooms into every consumer of
// `ultimatedarktowerdata/board`.
import type { DungeonType } from '../dungeons';

/** The terrain type of a board location. */
export type TerrainType = 'Hills' | 'Lake' | 'Desert' | 'Mountains' | 'Grasslands' | 'Forest';

/** The building present at a board location, if any. */
export type BuildingType = 'Bazaar' | 'Village' | 'Sanctuary' | 'Citadel';

/** One of the four kingdoms on the game board. Lowercase to match library conventions. */
export type BoardKingdom = 'north' | 'south' | 'east' | 'west';

/** A named grouping of thematically connected locations on the board. */
export type BoardGrouping = (typeof BOARD_GROUPINGS)[keyof typeof BOARD_GROUPINGS];

/**
 * What a location borders. `'tower'` = the Tower at the centre of the board, `'map-edge'`
 * = the outside of the board, and a kingdom name = the neighbouring kingdom.
 */
export type RegionBorder = 'tower' | 'map-edge' | 'north' | 'south' | 'east' | 'west';

/**
 * The dungeon found at a location. Dungeon names are flavour, but the location → dungeon
 * relationship is one-to-one and stable: the Earthen Warrens is always a Cave in
 * Delmsmire, whatever quest surfaced it. `type` determines which advantage may be spent
 * inside — see `DUNGEON_ADVANTAGE` in `dungeons.ts`.
 */
export type LocationDungeon = {
  /** Dungeon name as printed. */
  name: string;
  /** Which of the six dungeon types this is. */
  type: DungeonType;
};

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
  /** What this location borders. Empty for interior spaces bordering nothing notable. */
  borders: readonly RegionBorder[];
  /**
   * The dungeon found here. Absent for the 14 locations where none has been observed yet —
   * every location is expected to have exactly one. See `docs/open-questions.md`.
   */
  dungeon?: LocationDungeon;
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
  // ── North ──────────────────────────────────────────────────────────────────
  { name: 'Broken Lands', terrain: 'Hills', kingdom: 'north', borders: ['west'] },
  {
    name: 'Dayside',
    terrain: 'Lake',
    building: 'Bazaar',
    kingdom: 'north',
    grouping: BOARD_GROUPINGS.LONG_WATER,
    borders: ['map-edge'],
    dungeon: { name: "Smuggler's Den", type: 'cave' },
  },
  {
    name: "Egan's End",
    terrain: 'Grasslands',
    building: 'Village',
    kingdom: 'north',
    borders: ['map-edge', 'east'],
    dungeon: { name: "Egan's Fairgrounds", type: 'encampment' },
  },
  {
    name: 'Fivepint',
    terrain: 'Lake',
    kingdom: 'north',
    grouping: BOARD_GROUPINGS.LONG_WATER,
    borders: ['map-edge'],
    dungeon: { name: "Drunkard's Demiste", type: 'tomb' },
  },
  { name: 'Green Bridge', terrain: 'Grasslands', kingdom: 'north', borders: [] },
  {
    name: 'Lodestone Mountains',
    terrain: 'Mountains',
    kingdom: 'north',
    borders: ['map-edge', 'west'],
    dungeon: { name: 'Tower of the Guardians', type: 'encampment' },
  },
  {
    name: 'Lower Ice Fangs',
    terrain: 'Mountains',
    kingdom: 'north',
    borders: [],
    dungeon: { name: 'Palace of the Winter Fey', type: 'fortress' },
  },
  { name: 'Muted Forest', terrain: 'Forest', kingdom: 'north', borders: ['west'] },
  {
    name: 'Peaks of the Djinn',
    terrain: 'Mountains',
    kingdom: 'north',
    borders: ['east'],
    dungeon: { name: 'Hall of the Great Djinn', type: 'shrine' },
  },
  { name: 'Pearl of the North', terrain: 'Grasslands', kingdom: 'north', borders: ['map-edge'] },
  {
    name: 'Radiant Mountains',
    terrain: 'Mountains',
    building: 'Citadel',
    kingdom: 'north',
    borders: [],
  },
  {
    name: 'Rimeweald',
    terrain: 'Forest',
    kingdom: 'north',
    borders: ['east'],
    dungeon: { name: 'Pearl of Dawn', type: 'shrine' },
  },
  {
    name: 'The Tundra',
    terrain: 'Desert',
    kingdom: 'north',
    borders: ['map-edge'],
    dungeon: { name: 'White Forest Palisade', type: 'encampment' },
  },
  {
    name: 'Tower Scar Desert',
    terrain: 'Desert',
    kingdom: 'north',
    borders: ['tower', 'east', 'west'],
    dungeon: { name: 'City of Restless Sands', type: 'ruins' },
  },
  {
    name: 'Upper Ice Fangs',
    terrain: 'Mountains',
    building: 'Sanctuary',
    kingdom: 'north',
    borders: ['east'],
    dungeon: { name: 'Thundering Quarters', type: 'tomb' },
  },

  // ── East ───────────────────────────────────────────────────────────────────
  {
    name: 'Big Sister',
    terrain: 'Mountains',
    kingdom: 'east',
    borders: ['south'],
    dungeon: { name: 'Golden Wolf Burrows', type: 'cave' },
  },
  {
    name: 'Bleak Wastes',
    terrain: 'Desert',
    kingdom: 'east',
    borders: ['tower', 'north'],
    dungeon: { name: 'Vile Refuge', type: 'ruins' },
  },
  {
    name: 'Copper Grove',
    terrain: 'Forest',
    kingdom: 'east',
    borders: ['map-edge'],
    dungeon: { name: 'Burnished Dome', type: 'shrine' },
  },
  {
    name: 'Dragontooth Lake',
    terrain: 'Lake',
    kingdom: 'east',
    borders: ['north'],
    dungeon: { name: 'Sunken Labyrinth', type: 'cave' },
  },
  {
    name: 'Duwani',
    terrain: 'Grasslands',
    building: 'Village',
    kingdom: 'east',
    borders: ['map-edge'],
    dungeon: { name: "Wani's Way", type: 'encampment' },
  },
  {
    name: 'Forest of Shades',
    terrain: 'Forest',
    kingdom: 'east',
    borders: ['tower', 'south'],
    dungeon: { name: 'Desecrated Clearing', type: 'ruins' },
  },
  {
    name: 'Greater Tombstones',
    terrain: 'Hills',
    building: 'Sanctuary',
    kingdom: 'east',
    borders: [],
  },
  {
    name: 'Inner Kinghills',
    terrain: 'Hills',
    building: 'Citadel',
    kingdom: 'east',
    borders: ['north'],
    dungeon: { name: 'Crypt of the Winter King', type: 'tomb' },
  },
  {
    name: 'Jewel Hills',
    terrain: 'Hills',
    kingdom: 'east',
    borders: ['map-edge'],
    dungeon: { name: 'Emerald Castle', type: 'fortress' },
  },
  {
    name: 'Lake of Songs',
    terrain: 'Lake',
    kingdom: 'east',
    borders: ['map-edge'],
    dungeon: { name: 'Seafoam Chapel', type: 'shrine' },
  },
  {
    name: 'Lesser Tombstones',
    terrain: 'Hills',
    kingdom: 'east',
    borders: ['south'],
    dungeon: { name: 'Steading of the Giants', type: 'encampment' },
  },
  {
    name: 'Outer Kinghills',
    terrain: 'Hills',
    kingdom: 'east',
    borders: ['map-edge', 'north'],
    dungeon: { name: 'Bandit Redoubt', type: 'fortress' },
  },
  {
    name: 'The Decaying Wilds',
    terrain: 'Grasslands',
    kingdom: 'east',
    borders: [],
    dungeon: { name: 'Silent Stones', type: 'ruins' },
  },
  {
    name: 'Three Rivers',
    terrain: 'Grasslands',
    building: 'Bazaar',
    kingdom: 'east',
    borders: ['map-edge', 'south'],
    dungeon: { name: 'Rock on the Shore', type: 'encampment' },
  },
  { name: "Utar's Barrows", terrain: 'Desert', kingdom: 'east', borders: [] },

  // ── West ───────────────────────────────────────────────────────────────────
  {
    name: 'Anza',
    terrain: 'Grasslands',
    building: 'Village',
    kingdom: 'west',
    borders: ['map-edge'],
    dungeon: { name: 'Garrison of the Horselords', type: 'encampment' },
  },
  {
    name: 'Arkartus',
    terrain: 'Forest',
    building: 'Sanctuary',
    kingdom: 'west',
    grouping: BOARD_GROUPINGS.THE_GREAT_WOODS,
    borders: ['map-edge'],
    dungeon: { name: 'Greatwood Castle', type: 'fortress' },
  },
  {
    name: 'Ash Hills',
    terrain: 'Hills',
    kingdom: 'west',
    borders: ['north'],
    dungeon: { name: "Serpent's Skin", type: 'cave' },
  },
  {
    name: 'Cloudhold',
    terrain: 'Mountains',
    kingdom: 'west',
    borders: ['north'],
    dungeon: { name: 'Cloudhold Keep', type: 'fortress' },
  },
  {
    name: 'Delmsmire',
    terrain: 'Forest',
    kingdom: 'west',
    grouping: BOARD_GROUPINGS.THE_GREAT_WOODS,
    borders: ['map-edge'],
    dungeon: { name: 'Earthen Warrens', type: 'cave' },
  },
  {
    name: 'Hissing Groves',
    terrain: 'Forest',
    building: 'Citadel',
    kingdom: 'west',
    borders: [],
    dungeon: { name: 'Barrows of the Hissing Dead', type: 'tomb' },
  },
  {
    name: 'Idran Forest',
    terrain: 'Forest',
    kingdom: 'west',
    borders: ['south'],
    dungeon: { name: 'Forbidden Theater', type: 'shrine' },
  },
  {
    name: 'Lonelight Hills',
    terrain: 'Hills',
    kingdom: 'west',
    borders: ['south'],
    dungeon: { name: 'Unspoken Mausoleum', type: 'tomb' },
  },
  {
    name: 'Lost Lands',
    terrain: 'Desert',
    kingdom: 'west',
    borders: ['map-edge', 'south'],
    dungeon: { name: 'Plague Bethel', type: 'ruins' },
  },
  {
    name: 'Plains of Plovo',
    terrain: 'Grasslands',
    building: 'Bazaar',
    kingdom: 'west',
    borders: ['map-edge', 'north'],
    dungeon: { name: 'Tomb of Plovo', type: 'tomb' },
  },
  {
    name: 'Plains of Woldra',
    terrain: 'Grasslands',
    kingdom: 'west',
    borders: ['map-edge', 'south'],
    dungeon: { name: 'Infinite Sanctum', type: 'ruins' },
  },
  {
    name: 'The Empty Glade',
    terrain: 'Grasslands',
    kingdom: 'west',
    borders: [],
    dungeon: { name: 'Fount of Terror', type: 'ruins' },
  },
  {
    name: 'The Grass Sea',
    terrain: 'Grasslands',
    kingdom: 'west',
    borders: ['tower', 'north', 'south'],
    dungeon: { name: 'Vanishing Tribe', type: 'ruins' },
  },
  { name: 'Weeping Waters', terrain: 'Lake', kingdom: 'west', borders: [] },
  {
    name: 'Yellowpike',
    terrain: 'Forest',
    kingdom: 'west',
    grouping: BOARD_GROUPINGS.THE_GREAT_WOODS,
    borders: ['map-edge'],
  },

  // ── South ──────────────────────────────────────────────────────────────────
  {
    name: 'Archmont',
    terrain: 'Grasslands',
    kingdom: 'south',
    grouping: BOARD_GROUPINGS.REGAL_RUN,
    borders: [],
  },
  { name: "Azkol's Bane", terrain: 'Desert', kingdom: 'south', borders: [] },
  {
    name: 'Bone Hills',
    terrain: 'Hills',
    kingdom: 'south',
    borders: ['map-edge'],
    dungeon: { name: "Sisters' Circle", type: 'encampment' },
  },
  {
    name: 'Howling Desert',
    terrain: 'Desert',
    building: 'Citadel',
    kingdom: 'south',
    borders: ['west'],
    dungeon: { name: 'Tunnels of the Doomed Warlord', type: 'tomb' },
  },
  { name: 'Irontops', terrain: 'Mountains', kingdom: 'south', borders: ['tower', 'west'] },
  {
    name: 'Little Sister',
    terrain: 'Mountains',
    kingdom: 'south',
    borders: [],
    dungeon: { name: 'Shadow Warrens', type: 'cave' },
  },
  {
    name: 'Middle Sister',
    terrain: 'Mountains',
    kingdom: 'south',
    borders: ['east'],
    dungeon: { name: 'Silvervein Tunnels', type: 'cave' },
  },
  {
    name: 'Mountains of the Watchers',
    terrain: 'Mountains',
    kingdom: 'south',
    borders: ['west'],
    dungeon: { name: 'Fortress of the Watchers', type: 'fortress' },
  },
  {
    name: 'Pine Barrens',
    terrain: 'Forest',
    kingdom: 'south',
    borders: ['map-edge', 'east'],
    dungeon: { name: 'Temple of the Cruel King', type: 'shrine' },
  },
  {
    name: 'Sands of Madness',
    terrain: 'Desert',
    building: 'Sanctuary',
    kingdom: 'south',
    borders: ['east'],
  },
  {
    name: 'Southern Wastes',
    terrain: 'Desert',
    building: 'Village',
    kingdom: 'south',
    borders: ['map-edge'],
    dungeon: { name: 'Oblivion Catacombs', type: 'tomb' },
  },
  {
    name: 'The Cloister',
    terrain: 'Grasslands',
    kingdom: 'south',
    grouping: BOARD_GROUPINGS.REGAL_RUN,
    borders: [],
    dungeon: { name: 'Smoldering Pits', type: 'encampment' },
  },
  {
    name: 'The Emerald Expanse',
    terrain: 'Grasslands',
    building: 'Bazaar',
    kingdom: 'south',
    borders: ['map-edge', 'west'],
    dungeon: { name: 'Empty Jaws', type: 'cave' },
  },
  {
    name: 'The Throne',
    terrain: 'Grasslands',
    kingdom: 'south',
    grouping: BOARD_GROUPINGS.REGAL_RUN,
    borders: ['tower', 'east'],
  },
  {
    name: "Ulamel's Hollow",
    terrain: 'Grasslands',
    kingdom: 'south',
    borders: ['map-edge'],
    dungeon: { name: "Ulamel's Stronghold", type: 'fortress' },
  },
];

/** All 60 board locations indexed by name for O(1) lookup. */
export const BOARD_LOCATION_BY_NAME: Record<string, BoardLocation> = Object.fromEntries(
  BOARD_LOCATIONS.map((loc) => [loc.name, loc]),
);
