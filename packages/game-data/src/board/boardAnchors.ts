/**
 * Marked spots for the Return to Dark Tower board, plus board-image metadata. Each
 * location carries one spot per occupant slot type that can appear there (a building
 * space adds 'building' + 'skull'); renderers fan multiple tokens around a single spot.
 * Coordinates are normalized [0, 1] against the board image, so they are
 * resolution-independent.
 *
 * GENERATED from tools/location-marker/udtBoardData.json by gen-board-data.mjs.
 * Do not hand-edit — re-author in the location-marker tool and regenerate.
 */

export type SpotPoint = { x: number; y: number };

/** A marked spot on a location: a point plus the token type ids it accepts. */
export type BoardSpot = {
  id: string;
  at: SpotPoint;
  accepts: readonly string[];
};

export type BoardSpotMap = Readonly<Record<string /* LocationName */, readonly BoardSpot[]>>;

/**
 * Token type ids usable in a spot's `accepts` with no `library.tokenTypes` registry entry —
 * the RtDT board vocabulary every consumer understands natively.
 */
export const RESERVED_TOKEN_TYPES = [
  'hero',
  'foe',
  'adversary',
  'building',
  'skull',
  'monument',
  'marker',
  'quest',
] as const;

export type ReservedTokenType = (typeof RESERVED_TOKEN_TYPES)[number];

/**
 * Board-image metadata so consumers can map normalized image coordinates onto a
 * 2D canvas or the 3D disc. `northHeadingDegrees` is the image rotation that
 * aligns image-north with the scene's north. A singleton for the four-kingdoms
 * board (v1); the type leaves room for a future per-region map.
 */
export type BoardImageInfo = {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  radius: number;
  northHeadingDegrees: number;
};

export const BOARD_IMAGE_INFO: BoardImageInfo = {
  width: 4096,
  height: 4096,
  centerX: 0.5,
  centerY: 0.5,
  radius: 0.5,
  northHeadingDegrees: 135,
};

/** Marked spots for all 60 board locations, keyed by location name. */
export const BOARD_SPOTS: BoardSpotMap = {
  'Broken Lands': [
    { id: 'hero', at: { x: 0.80599, y: 0.51238 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.8355, y: 0.50648 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.81451, y: 0.53009 }, accepts: ['marker', 'quest'] },
  ],
  Dayside: [
    { id: 'building', at: { x: 0.74564, y: 0.7754 }, accepts: ['building'] },
    { id: 'skull', at: { x: 0.75351, y: 0.77147 }, accepts: ['skull'] },
    { id: 'hero', at: { x: 0.78708, y: 0.84542 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.82397, y: 0.81232 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.79742, y: 0.81818 }, accepts: ['marker', 'quest'] },
  ],
  "Egan's End": [
    { id: 'building', at: { x: 0.57088, y: 0.9152 }, accepts: ['building'] },
    { id: 'skull', at: { x: 0.57506, y: 0.92844 }, accepts: ['skull'] },
    { id: 'hero', at: { x: 0.65606, y: 0.89196 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.66675, y: 0.91679 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.63365, y: 0.91644 }, accepts: ['marker', 'quest'] },
  ],
  Fivepint: [
    { id: 'marker', at: { x: 0.84691, y: 0.76433 }, accepts: ['marker', 'quest'] },
    { id: 'hero', at: { x: 0.82, y: 0.75615 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.83838, y: 0.73603 }, accepts: ['foe', 'adversary'] },
  ],
  'Green Bridge': [
    { id: 'hero', at: { x: 0.73574, y: 0.71149 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.77097, y: 0.67222 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.76259, y: 0.69647 }, accepts: ['marker', 'quest'] },
  ],
  'Lodestone Mountains': [
    { id: 'hero', at: { x: 0.90983, y: 0.54979 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.93133, y: 0.52482 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.92439, y: 0.57164 }, accepts: ['marker', 'quest'] },
  ],
  'Lower Ice Fangs': [
    { id: 'hero', at: { x: 0.644, y: 0.75336 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.60986, y: 0.76715 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.65399, y: 0.77853 }, accepts: ['marker', 'quest'] },
  ],
  'Muted Forest': [
    { id: 'hero', at: { x: 0.72254, y: 0.57754 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.71006, y: 0.53557 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.74474, y: 0.54875 }, accepts: ['marker', 'quest'] },
  ],
  'Peaks of the Djinn': [
    { id: 'hero', at: { x: 0.52263, y: 0.73716 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.53056, y: 0.76095 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.53401, y: 0.78715 }, accepts: ['marker', 'quest'] },
  ],
  'Pearl of the North': [
    { id: 'marker', at: { x: 0.90091, y: 0.66962 }, accepts: ['marker', 'quest'] },
    { id: 'hero', at: { x: 0.89715, y: 0.69647 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.91852, y: 0.64046 }, accepts: ['foe', 'adversary'] },
  ],
  'Radiant Mountains': [
    { id: 'building', at: { x: 0.82063, y: 0.64652 }, accepts: ['building'] },
    { id: 'skull', at: { x: 0.82727, y: 0.64883 }, accepts: ['skull'] },
    { id: 'hero', at: { x: 0.81081, y: 0.6058 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.82294, y: 0.57982 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.85182, y: 0.59425 }, accepts: ['marker', 'quest'] },
  ],
  Rimeweald: [
    { id: 'hero', at: { x: 0.58228, y: 0.83094 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.54746, y: 0.84576 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.614, y: 0.84852 }, accepts: ['marker', 'quest'] },
  ],
  'The Tundra': [
    { id: 'hero', at: { x: 0.71123, y: 0.84955 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.69675, y: 0.82094 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.72778, y: 0.87369 }, accepts: ['marker', 'quest'] },
  ],
  'Tower Scar Desert': [
    { id: 'marker', at: { x: 0.63365, y: 0.57476 }, accepts: ['marker', 'quest'] },
    { id: 'hero', at: { x: 0.64227, y: 0.53994 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.58642, y: 0.61028 }, accepts: ['foe', 'adversary'] },
  ],
  'Upper Ice Fangs': [
    { id: 'building', at: { x: 0.68089, y: 0.66613 }, accepts: ['building'] },
    { id: 'skull', at: { x: 0.68571, y: 0.66096 }, accepts: ['skull'] },
    { id: 'foe', at: { x: 0.5478, y: 0.67889 }, accepts: ['foe', 'adversary'] },
    { id: 'hero', at: { x: 0.63882, y: 0.7044 }, accepts: ['hero'] },
    { id: 'marker', at: { x: 0.59159, y: 0.67578 }, accepts: ['marker', 'quest'] },
  ],
  'Big Sister': [
    { id: 'hero', at: { x: 0.29269, y: 0.60241 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.28651, y: 0.56064 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.26136, y: 0.54023 }, accepts: ['marker', 'quest'] },
  ],
  'Bleak Wastes': [
    { id: 'marker', at: { x: 0.45929, y: 0.67741 }, accepts: ['marker', 'quest'] },
    { id: 'hero', at: { x: 0.44885, y: 0.64751 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.47163, y: 0.65937 }, accepts: ['foe', 'adversary'] },
  ],
  'Copper Grove': [
    { id: 'hero', at: { x: 0.34044, y: 0.8742 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.37074, y: 0.91984 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.3369, y: 0.90017 }, accepts: ['marker', 'quest'] },
  ],
  'Dragontooth Lake': [
    { id: 'marker', at: { x: 0.43784, y: 0.75253 }, accepts: ['marker', 'quest'] },
    { id: 'hero', at: { x: 0.38955, y: 0.70385 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.38599, y: 0.7367 }, accepts: ['foe', 'adversary'] },
  ],
  Duwani: [
    { id: 'building', at: { x: 0.21975, y: 0.79014 }, accepts: ['building'] },
    { id: 'skull', at: { x: 0.22094, y: 0.79251 }, accepts: ['skull'] },
    { id: 'hero', at: { x: 0.20946, y: 0.83367 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.18729, y: 0.76599 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.16988, y: 0.77905 }, accepts: ['marker', 'quest'] },
  ],
  'Forest of Shades': [
    { id: 'hero', at: { x: 0.36184, y: 0.57047 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.35393, y: 0.54355 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.37965, y: 0.6053 }, accepts: ['marker', 'quest'] },
  ],
  'Greater Tombstones': [
    { id: 'building', at: { x: 0.31989, y: 0.66902 }, accepts: ['building'] },
    { id: 'skull', at: { x: 0.32384, y: 0.66467 }, accepts: ['skull'] },
    { id: 'hero', at: { x: 0.27041, y: 0.67773 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.22133, y: 0.66546 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.25933, y: 0.65675 }, accepts: ['marker', 'quest'] },
  ],
  'Inner Kinghills': [
    { id: 'building', at: { x: 0.4061, y: 0.83461 }, accepts: ['building'] },
    { id: 'skull', at: { x: 0.41279, y: 0.83658 }, accepts: ['skull'] },
    { id: 'hero', at: { x: 0.45685, y: 0.81494 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.43364, y: 0.87592 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.46236, y: 0.84169 }, accepts: ['marker', 'quest'] },
  ],
  'Jewel Hills': [
    { id: 'marker', at: { x: 0.26293, y: 0.86082 }, accepts: ['marker', 'quest'] },
    { id: 'foe', at: { x: 0.29301, y: 0.81688 }, accepts: ['foe', 'adversary'] },
    { id: 'hero', at: { x: 0.27599, y: 0.84063 }, accepts: ['hero'] },
  ],
  'Lake of Songs': [
    { id: 'hero', at: { x: 0.1157, y: 0.71675 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.14498, y: 0.72862 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.10778, y: 0.68825 }, accepts: ['marker', 'quest'] },
  ],
  'Lesser Tombstones': [
    { id: 'hero', at: { x: 0.19169, y: 0.5889 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.18179, y: 0.6178 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.1715, y: 0.655 }, accepts: ['marker', 'quest'] },
  ],
  'Outer Kinghills': [
    { id: 'hero', at: { x: 0.49606, y: 0.90673 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.44183, y: 0.91306 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.46242, y: 0.9289 }, accepts: ['marker', 'quest'] },
  ],
  'The Decaying Wilds': [
    { id: 'marker', at: { x: 0.34526, y: 0.79037 }, accepts: ['marker', 'quest'] },
    { id: 'hero', at: { x: 0.31399, y: 0.77414 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.33339, y: 0.76503 }, accepts: ['foe', 'adversary'] },
  ],
  'Three Rivers': [
    { id: 'building', at: { x: 0.10461, y: 0.59524 }, accepts: ['building'] },
    { id: 'skull', at: { x: 0.10976, y: 0.59445 }, accepts: ['skull'] },
    { id: 'hero', at: { x: 0.10066, y: 0.56159 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.05672, y: 0.60869 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.07216, y: 0.56516 }, accepts: ['marker', 'quest'] },
  ],
  "Utar's Barrows": [
    { id: 'hero', at: { x: 0.21227, y: 0.72268 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.27322, y: 0.75554 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.25502, y: 0.73416 }, accepts: ['marker', 'quest'] },
  ],
  Archmont: [
    { id: 'marker', at: { x: 0.28906, y: 0.28849 }, accepts: ['marker', 'quest'] },
    { id: 'hero', at: { x: 0.2475, y: 0.26474 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.22375, y: 0.24297 }, accepts: ['foe', 'adversary'] },
  ],
  "Azkol's Bane": [
    { id: 'hero', at: { x: 0.31755, y: 0.2026 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.35515, y: 0.20339 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.2851, y: 0.22002 }, accepts: ['marker', 'quest'] },
  ],
  'Bone Hills': [
    { id: 'marker', at: { x: 0.26112, y: 0.1386 }, accepts: ['marker', 'quest'] },
    { id: 'hero', at: { x: 0.23354, y: 0.15298 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.28374, y: 0.10136 }, accepts: ['foe', 'adversary'] },
  ],
  'Howling Desert': [
    { id: 'building', at: { x: 0.46416, y: 0.25928 }, accepts: ['building'] },
    { id: 'skull', at: { x: 0.46145, y: 0.25218 }, accepts: ['skull'] },
    { id: 'hero', at: { x: 0.41951, y: 0.22546 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.47464, y: 0.2011 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.44488, y: 0.20009 }, accepts: ['marker', 'quest'] },
  ],
  Irontops: [
    { id: 'hero', at: { x: 0.44934, y: 0.35744 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.46636, y: 0.32986 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.425, y: 0.33632 }, accepts: ['marker', 'quest'] },
  ],
  'Little Sister': [
    { id: 'hero', at: { x: 0.23451, y: 0.34805 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.21272, y: 0.32604 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.19827, y: 0.36466 }, accepts: ['marker', 'quest'] },
  ],
  'Middle Sister': [
    { id: 'hero', at: { x: 0.16203, y: 0.46453 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.1493, y: 0.49904 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.15513, y: 0.43088 }, accepts: ['marker', 'quest'] },
  ],
  'Mountains of the Watchers': [
    { id: 'hero', at: { x: 0.49023, y: 0.12066 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.45633, y: 0.09633 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.4994, y: 0.18246 }, accepts: ['marker', 'quest'] },
  ],
  'Pine Barrens': [
    { id: 'hero', at: { x: 0.06957, y: 0.49147 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.07316, y: 0.4185 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.06957, y: 0.45478 }, accepts: ['marker', 'quest'] },
  ],
  'Sands of Madness': [
    { id: 'building', at: { x: 0.27133, y: 0.44721 }, accepts: ['building'] },
    { id: 'skull', at: { x: 0.26256, y: 0.44561 }, accepts: ['skull'] },
    { id: 'hero', at: { x: 0.28249, y: 0.39777 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.30083, y: 0.33636 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.29964, y: 0.37464 }, accepts: ['marker', 'quest'] },
  ],
  'Southern Wastes': [
    { id: 'marker', at: { x: 0.16607, y: 0.22512 }, accepts: ['marker', 'quest'] },
    { id: 'building', at: { x: 0.16248, y: 0.29211 }, accepts: ['building'] },
    { id: 'skull', at: { x: 0.1553, y: 0.28931 }, accepts: ['skull'] },
    { id: 'hero', at: { x: 0.16686, y: 0.24466 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.17723, y: 0.19242 }, accepts: ['foe', 'adversary'] },
  ],
  'The Cloister': [
    { id: 'hero', at: { x: 0.35027, y: 0.30566 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.39692, y: 0.28014 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.36862, y: 0.28254 }, accepts: ['marker', 'quest'] },
  ],
  'The Emerald Expanse': [
    { id: 'building', at: { x: 0.3746, y: 0.14179 }, accepts: ['building'] },
    { id: 'skull', at: { x: 0.37699, y: 0.14817 }, accepts: ['skull'] },
    { id: 'hero', at: { x: 0.34071, y: 0.08955 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.43121, y: 0.05407 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.38177, y: 0.08357 }, accepts: ['marker', 'quest'] },
  ],
  'The Throne': [
    { id: 'marker', at: { x: 0.35865, y: 0.43166 }, accepts: ['marker', 'quest'] },
    { id: 'hero', at: { x: 0.36782, y: 0.38979 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.33991, y: 0.46236 }, accepts: ['foe', 'adversary'] },
  ],
  "Ulamel's Hollow": [
    { id: 'foe', at: { x: 0.10307, y: 0.38022 }, accepts: ['foe', 'adversary'] },
    { id: 'hero', at: { x: 0.11981, y: 0.34872 }, accepts: ['hero'] },
    { id: 'marker', at: { x: 0.0935, y: 0.34952 }, accepts: ['marker', 'quest'] },
  ],
  Anza: [
    { id: 'building', at: { x: 0.69519, y: 0.13269 }, accepts: ['building'] },
    { id: 'skull', at: { x: 0.69876, y: 0.1242 }, accepts: ['skull'] },
    { id: 'hero', at: { x: 0.67642, y: 0.16664 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.72244, y: 0.16888 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.74656, y: 0.14609 }, accepts: ['marker', 'quest'] },
  ],
  Arkartus: [
    { id: 'building', at: { x: 0.81849, y: 0.28504 }, accepts: ['building'] },
    { id: 'skull', at: { x: 0.82832, y: 0.27789 }, accepts: ['skull'] },
    { id: 'hero', at: { x: 0.81983, y: 0.23544 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.87702, y: 0.25376 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.84753, y: 0.24036 }, accepts: ['marker', 'quest'] },
  ],
  'Ash Hills': [
    { id: 'hero', at: { x: 0.68312, y: 0.44364 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.69161, y: 0.46732 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.71618, y: 0.45347 }, accepts: ['marker', 'quest'] },
  ],
  Cloudhold: [
    { id: 'marker', at: { x: 0.80375, y: 0.41683 }, accepts: ['marker', 'quest'] },
    { id: 'hero', at: { x: 0.77694, y: 0.42041 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.79124, y: 0.44274 }, accepts: ['foe', 'adversary'] },
  ],
  Delmsmire: [
    { id: 'foe', at: { x: 0.83994, y: 0.34892 }, accepts: ['foe', 'adversary'] },
    { id: 'hero', at: { x: 0.86675, y: 0.32703 }, accepts: ['hero'] },
    { id: 'marker', at: { x: 0.89221, y: 0.31631 }, accepts: ['marker', 'quest'] },
  ],
  'Hissing Groves': [
    { id: 'marker', at: { x: 0.67151, y: 0.33865 }, accepts: ['marker', 'quest'] },
    { id: 'building', at: { x: 0.70502, y: 0.3869 }, accepts: ['building'] },
    { id: 'skull', at: { x: 0.71127, y: 0.38422 }, accepts: ['skull'] },
    { id: 'hero', at: { x: 0.66436, y: 0.38645 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.64783, y: 0.36054 }, accepts: ['foe', 'adversary'] },
  ],
  'Idran Forest': [
    { id: 'hero', at: { x: 0.54105, y: 0.21221 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.54865, y: 0.23455 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.58394, y: 0.22294 }, accepts: ['marker', 'quest'] },
  ],
  'Lonelight Hills': [
    { id: 'marker', at: { x: 0.58573, y: 0.30291 }, accepts: ['marker', 'quest'] },
    { id: 'hero', at: { x: 0.58662, y: 0.32524 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.54507, y: 0.30112 }, accepts: ['foe', 'adversary'] },
  ],
  'Lost Lands': [
    { id: 'hero', at: { x: 0.56339, y: 0.08935 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.57813, y: 0.10633 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.57367, y: 0.0688 }, accepts: ['marker', 'quest'] },
  ],
  'Plains of Plovo': [
    { id: 'marker', at: { x: 0.92348, y: 0.42532 }, accepts: ['marker', 'quest'] },
    { id: 'building', at: { x: 0.88238, y: 0.39717 }, accepts: ['building'] },
    { id: 'skull', at: { x: 0.89042, y: 0.3936 }, accepts: ['skull'] },
    { id: 'hero', at: { x: 0.89221, y: 0.43158 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.91053, y: 0.44632 }, accepts: ['foe', 'adversary'] },
  ],
  'Plains of Woldra': [
    { id: 'hero', at: { x: 0.62862, y: 0.12107 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.57322, y: 0.15815 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.60851, y: 0.16798 }, accepts: ['marker', 'quest'] },
  ],
  'The Empty Glade': [
    { id: 'hero', at: { x: 0.72646, y: 0.29352 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.78052, y: 0.34982 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.74746, y: 0.32078 }, accepts: ['marker', 'quest'] },
  ],
  'The Grass Sea': [
    { id: 'hero', at: { x: 0.57099, y: 0.37662 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.62281, y: 0.43426 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.60181, y: 0.40343 }, accepts: ['marker', 'quest'] },
  ],
  'Weeping Waters': [
    { id: 'hero', at: { x: 0.64202, y: 0.24795 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.65453, y: 0.23053 }, accepts: ['foe', 'adversary'] },
    { id: 'marker', at: { x: 0.67464, y: 0.24393 }, accepts: ['marker', 'quest'] },
  ],
  Yellowpike: [
    { id: 'marker', at: { x: 0.76533, y: 0.22338 }, accepts: ['marker', 'quest'] },
    { id: 'hero', at: { x: 0.79348, y: 0.19792 }, accepts: ['hero'] },
    { id: 'foe', at: { x: 0.81492, y: 0.17379 }, accepts: ['foe', 'adversary'] },
  ],
};
