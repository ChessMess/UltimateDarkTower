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
export type BoardGrouping = (typeof BOARD_GROUPINGS)[keyof typeof BOARD_GROUPINGS];
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
export declare const BOARD_GROUPINGS: {
    /** Dayside and Fivepint (North kingdom lakes). */
    readonly LONG_WATER: "Long Water";
    /** Delmsmire, Arkartus, and Yellowpike (West kingdom forests). */
    readonly THE_GREAT_WOODS: "The Great Woods";
    /** The Throne, The Cloister, and Archmont (South kingdom grasslands). */
    readonly REGAL_RUN: "Regal Run";
};
/** All 60 locations on the Return to Dark Tower game board. */
export declare const BOARD_LOCATIONS: BoardLocation[];
/** All 60 board locations indexed by name for O(1) lookup. */
export declare const BOARD_LOCATION_BY_NAME: Record<string, BoardLocation>;
