/**
 * dungeons.ts — the six dungeon types and every room card observed in them.
 *
 * Rooms are drawn at random and CAN repeat within a single delve, so each dungeon's list
 * is a POOL, not a layout — the source spreadsheet records every room seen across many
 * plays (see `docs/spreadsheet-import.md`). 12 rooms plus an entrance per type is
 * believed to be the real size, but it is not confirmed.
 */
import type { AdvantageType } from './advantages';

/** The six dungeon types printed on the dungeon side of the board. */
export type DungeonType = 'cave' | 'encampment' | 'fortress' | 'ruins' | 'shrine' | 'tomb';

/** A dungeon room card: the entrance flavour text, or one of the encounter rooms. */
export interface DungeonRoom {
  /** Stable, unique kebab-case id, prefixed by dungeon type (e.g. `'cave-jaryx-lair'`). */
  id: string;
  /** Display name as printed ('Entrance' for the entrance card). */
  name: string;
  /** Which dungeon this room belongs to. */
  dungeonType: DungeonType;
  /** `'entrance'` rows carry flavour text in `initial` and have no `upgraded` state. */
  kind: 'entrance' | 'room';
  /** Rules text in the room's initial (un-upgraded) state. */
  initial: string;
  /**
   * Rules text once the room is upgraded. Absent for entrances. Rooms upgrade through
   * play, and the companion Berat upgrades a random selection of rooms automatically.
   */
  upgraded?: string;
  /** Set where the source row is incomplete — see the `sourceNote` for why. */
  needsReview?: boolean;
  /** Why this row is incomplete or uncertain. */
  sourceNote?: string;
}

/**
 * Dungeon type → the single advantage type that may be spent inside it.
 *
 * This is a printed rule, not a theme: the dungeon token shows its type, and once you
 * enter you can only spend advantages of that one type.
 */
export const DUNGEON_ADVANTAGE: Readonly<Record<DungeonType, AdvantageType>> = Object.freeze({
  cave: 'Beast',
  encampment: 'Humanoid',
  fortress: 'Melee',
  ruins: 'Stealth',
  shrine: 'Magic',
  tomb: 'Undead',
});

/** The Cave room pool: 1 entrance + 12 encounter rooms. */
export const CAVE_ROOMS: readonly DungeonRoom[] = [
  {
    id: 'cave-entrance',
    name: 'Entrance',
    dungeonType: 'cave',
    kind: 'entrance',
    initial: 'A dank wind whistles, growing louder as you enter the gloom.',
  },
  {
    id: 'cave-craggy-crevasse',
    name: 'Craggy Crevasse',
    dungeonType: 'cave',
    kind: 'room',
    initial: 'Lose 5 warriors.',
    upgraded: 'Lose 1 warrior.',
  },
  {
    id: 'cave-crimson-bat-cave',
    name: 'Crimson Bat Cave',
    dungeonType: 'cave',
    kind: 'room',
    initial: 'Lose 6 warriors and 1 spirit.',
    upgraded: 'Lose 2 warriors.',
  },
  {
    id: 'cave-jaryx-lair',
    name: 'Jaryx Lair',
    dungeonType: 'cave',
    kind: 'room',
    initial: 'Lose 9 warriors or 2 gear.',
    upgraded: 'Gain 5 warriors.',
  },
  {
    id: 'cave-moonbound-centipedes',
    name: 'Moonbound Centipedes',
    dungeonType: 'cave',
    kind: 'room',
    initial: 'Lose 6 warriors.',
    upgraded: 'Gain 1 potion.',
  },
  {
    id: 'cave-murky-crevasse',
    name: 'Murky Crevasse',
    dungeonType: 'cave',
    kind: 'room',
    initial: 'Lose 12 warriors unless you have dusky cloaks.',
    upgraded: 'Gain 2 warriors.',
  },
  {
    id: 'cave-noxious-spores',
    name: 'Noxious Spores',
    dungeonType: 'cave',
    kind: 'room',
    initial: 'Lose 1 spirit and 1 warrior.',
    upgraded: 'Gain 1 spirit.',
  },
  {
    id: 'cave-pack-of-wild-rangos',
    name: 'Pack of Wild Rangos',
    dungeonType: 'cave',
    kind: 'room',
    initial: 'Lose 12 warriors unless you have longswords.',
    upgraded: 'Gain 3 warriors.',
  },
  {
    id: 'cave-tight-passageways',
    name: 'Tight Passageways',
    dungeonType: 'cave',
    kind: 'room',
    initial: 'Lose 2 spirit and 2 warriors.',
    upgraded: 'Gain 1 spirit.',
  },
  {
    id: 'cave-treasure-hunter',
    name: 'Treasure Hunter',
    dungeonType: 'cave',
    kind: 'room',
    initial: 'Lose 1 item.',
    upgraded: 'Gain the top card of the treasure deck.',
  },
  {
    id: 'cave-underground-river',
    name: 'Underground River',
    dungeonType: 'cave',
    kind: 'room',
    initial: 'Lose 6 warriors.',
    upgraded: 'Gain 2 warriors.',
  },
  {
    id: 'cave-unstable-cavern',
    name: 'Unstable Cavern',
    dungeonType: 'cave',
    kind: 'room',
    initial: 'Lose 6 warriors.',
    upgraded: 'Gain 1 warrior.',
  },
  {
    id: 'cave-widowmade-serpent',
    name: 'Widowmade Serpent',
    dungeonType: 'cave',
    kind: 'room',
    initial: 'Lose 6 warriors or 2 potions.',
    upgraded: 'Gain 2 potions.',
  },
];

/** The Encampment room pool: 1 entrance + 12 encounter rooms. */
export const ENCAMPMENT_ROOMS: readonly DungeonRoom[] = [
  {
    id: 'encampment-entrance',
    name: 'Entrance',
    dungeonType: 'encampment',
    kind: 'entrance',
    initial:
      'You can hear rowdy song and the clang of metal through the walls of the roughly built structures surrounding the campfires.',
  },
  {
    id: 'encampment-barracks',
    name: 'Barracks',
    dungeonType: 'encampment',
    kind: 'room',
    initial: 'Lose 8 warriors.',
    upgraded: 'Lose 1 warrior.',
  },
  {
    id: 'encampment-brig',
    name: 'Brig',
    dungeonType: 'encampment',
    kind: 'room',
    initial: 'Lose 8 warriors.',
    upgraded: 'Gain 1 warrior.',
  },
  {
    id: 'encampment-deep-well',
    name: 'Deep Well',
    dungeonType: 'encampment',
    kind: 'room',
    initial: 'No losses.',
    upgraded: 'Gain 1 spirit and 1 potion.',
  },
  {
    id: 'encampment-dusty-pathway',
    name: 'Dusty Pathway',
    dungeonType: 'encampment',
    kind: 'room',
    initial: 'Lose 1 gear.',
    upgraded: 'No losses.',
  },
  {
    id: 'encampment-galley',
    name: 'Galley',
    dungeonType: 'encampment',
    kind: 'room',
    initial: 'Lose 1 spirit and 3 warriors.',
    upgraded: 'No losses.',
  },
  {
    id: 'encampment-garrisoned-soldiers',
    name: 'Garrisoned Soldiers',
    dungeonType: 'encampment',
    kind: 'room',
    initial: 'Lose 9 warriors.',
    upgraded: 'Gain 4 warriors.',
  },
  {
    id: 'encampment-lookout-tower',
    name: 'Lookout Tower',
    dungeonType: 'encampment',
    kind: 'room',
    initial: 'No losses.',
    upgraded: 'Gain the top card of the treasure deck.',
  },
  {
    id: 'encampment-open-field',
    name: 'Open Field',
    dungeonType: 'encampment',
    kind: 'room',
    initial: 'Lose 5 warriors and 1 spirit.',
    upgraded: 'No losses.',
  },
  {
    id: 'encampment-quartermasters-tent',
    name: "Quartermaster's Tent",
    dungeonType: 'encampment',
    kind: 'room',
    initial: 'Lose 5 warriors.',
    upgraded: 'No losses.',
  },
  {
    id: 'encampment-spiked-barricade',
    name: 'Spiked Barricade',
    dungeonType: 'encampment',
    kind: 'room',
    initial: 'Lose 8 warriors.',
    upgraded: 'Lose 2 warriors.',
  },
  {
    id: 'encampment-training-grounds',
    name: 'Training Grounds',
    dungeonType: 'encampment',
    kind: 'room',
    initial: 'Lose 6 warriors.',
    upgraded: 'You may gain 1 gear.',
  },
  {
    id: 'encampment-weapon-racks',
    name: 'Weapon Racks',
    dungeonType: 'encampment',
    kind: 'room',
    initial: 'Lose 6 warriors.',
    upgraded: 'You may gain 1 gear.',
  },
];

/** The Fortress room pool: 1 entrance + 12 encounter rooms. */
export const FORTRESS_ROOMS: readonly DungeonRoom[] = [
  {
    id: 'fortress-entrance',
    name: 'Entrance',
    dungeonType: 'fortress',
    kind: 'entrance',
    initial: 'A rhythmic din echoes through the halls of this imposing structure.',
  },
  {
    id: 'fortress-armory',
    name: 'Armory',
    dungeonType: 'fortress',
    kind: 'room',
    initial: 'Lose 3 warriors.',
    upgraded: 'You may gain 1 leather armor gear card.',
  },
  {
    id: 'fortress-barracks',
    name: 'Barracks',
    dungeonType: 'fortress',
    kind: 'room',
    initial: 'Lose 1 gear.',
    upgraded: 'Gain 2 warriors.',
  },
  {
    id: 'fortress-captains-quarters',
    name: "Captain's Quarters",
    dungeonType: 'fortress',
    kind: 'room',
    initial: 'Lose 2 spirit and 1 warrior.',
    upgraded: 'Gain the top card of the treasure deck.',
  },
  {
    id: 'fortress-chapel',
    name: 'Chapel',
    dungeonType: 'fortress',
    kind: 'room',
    initial: 'Lose 1 spirit.',
    upgraded: 'Gain 1 spirit.',
  },
  {
    id: 'fortress-gaol',
    name: 'Gaol',
    dungeonType: 'fortress',
    kind: 'room',
    initial: 'Lose 1 spirit and 1 warrior.',
    upgraded: 'Gain 2 warriors.',
  },
  {
    id: 'fortress-gatehouse',
    name: 'Gatehouse',
    dungeonType: 'fortress',
    kind: 'room',
    initial: 'Lose 8 warriors unless you have 4 virtues.',
    upgraded: 'Gain 1 spirit.',
  },
  {
    id: 'fortress-infirmary',
    name: 'Infirmary',
    dungeonType: 'fortress',
    kind: 'room',
    initial: 'Lose 1 potion.',
    upgraded: 'Gain 2 warriors.',
  },
  {
    id: 'fortress-latrine',
    name: 'Latrine',
    dungeonType: 'fortress',
    kind: 'room',
    initial: 'Lose 1 potion.',
    upgraded: 'No effect.',
  },
  {
    id: 'fortress-map-room',
    name: 'Map Room',
    dungeonType: 'fortress',
    kind: 'room',
    initial: 'Lose 1 gear.',
    upgraded: 'You may gain 1 trusted maps gear card.',
  },
  {
    id: 'fortress-smithy',
    name: 'Smithy',
    dungeonType: 'fortress',
    kind: 'room',
    initial: 'Lose 2 items.',
    upgraded: 'You may gain 1 Longswords gear card.',
  },
  {
    id: 'fortress-training-hall',
    name: 'Training Hall',
    dungeonType: 'fortress',
    kind: 'room',
    initial: 'You may gain 1 leather armor gear card.',
    upgraded: 'Gain 2 warriors.',
  },
  {
    id: 'fortress-watchtower',
    name: 'Watchtower',
    dungeonType: 'fortress',
    kind: 'room',
    initial: 'No losses.',
    upgraded: 'Move a foe in your current kingdom up to 2 spaces.',
  },
];

/** The Ruins room pool: 1 entrance + 12 encounter rooms. */
export const RUINS_ROOMS: readonly DungeonRoom[] = [
  {
    id: 'ruins-entrance',
    name: 'Entrance',
    dungeonType: 'ruins',
    kind: 'entrance',
    initial: 'Loose rock crunches under your feet and dust chokes your lungs.',
  },
  {
    id: 'ruins-alchemical-storeroom',
    name: 'Alchemical Storeroom',
    dungeonType: 'ruins',
    kind: 'room',
    initial: 'Lose 2 warriors.',
    upgraded: 'Gain 2 potions.',
  },
  {
    id: 'ruins-antechamber',
    name: 'Antechamber',
    dungeonType: 'ruins',
    kind: 'room',
    initial: 'Lose 6 warriors.',
    upgraded: 'Gain 2 warriors.',
  },
  {
    id: 'ruins-fighting-pits',
    name: 'Fighting Pits',
    dungeonType: 'ruins',
    kind: 'room',
    initial: 'Lose 8 warriors.',
    upgraded: 'No losses.',
  },
  {
    id: 'ruins-guarded-greathall',
    name: 'Guarded Greathall',
    dungeonType: 'ruins',
    kind: 'room',
    initial: 'Lose 7 warriors.',
    upgraded: 'Lose 1 warrior.',
  },
  {
    id: 'ruins-haunted-dormitory',
    name: 'Haunted Dormitory',
    dungeonType: 'ruins',
    kind: 'room',
    initial: 'Lose 6 warriors.',
    upgraded: 'Gain 1 warrior.',
  },
  {
    id: 'ruins-mysterious-pool',
    name: 'Mysterious Pool',
    dungeonType: 'ruins',
    kind: 'room',
    initial: 'Lose 4 warriors.',
    upgraded: 'Spend 1 potion to gain 4 spirit.',
  },
  {
    id: 'ruins-obstructed-passageway',
    name: 'Obstructed Passageway',
    dungeonType: 'ruins',
    kind: 'room',
    initial: 'Lose 5 warriors.',
    upgraded: 'Gain 2 warriors.',
  },
  {
    id: 'ruins-overgrown-atrium',
    name: 'Overgrown Atrium',
    dungeonType: 'ruins',
    kind: 'room',
    initial: 'Lose 8 warriors if you do not have longswords.',
    upgraded: 'Lose 2 warriors.',
  },
  {
    id: 'ruins-rotting-larder',
    name: 'Rotting Larder',
    dungeonType: 'ruins',
    kind: 'room',
    initial: 'Lose 2 spirit and 5 warriors.',
    upgraded: 'Lose 1 spirit.',
  },
  {
    id: 'ruins-scriptorium',
    name: 'Scriptorium',
    dungeonType: 'ruins',
    kind: 'room',
    initial: 'Lost 1 spirit and 2 warriors.',
    upgraded: 'Spend 1 gear to gain the top card of the treasure deck.',
  },
  {
    id: 'ruins-stargazing-chamber',
    name: 'Stargazing Chamber',
    dungeonType: 'ruins',
    kind: 'room',
    initial: 'Lose 6 warriors.',
    upgraded: 'Gain 6 warriors.',
  },
  {
    id: 'ruins-warded-vault',
    name: 'Warded Vault',
    dungeonType: 'ruins',
    kind: 'room',
    initial: 'Lost 5 warriors.',
    upgraded: 'Gain 1 spirit.',
  },
];

/** The Shrine room pool: 1 entrance + 12 encounter rooms. */
export const SHRINE_ROOMS: readonly DungeonRoom[] = [
  {
    id: 'shrine-entrance',
    name: 'Entrance',
    dungeonType: 'shrine',
    kind: 'entrance',
    initial: 'The hairs on your arms and neck stand up as the whole place is suffused with energy.',
  },
  {
    id: 'shrine-casting-hall',
    name: 'Casting Hall',
    dungeonType: 'shrine',
    kind: 'room',
    initial: 'Lose 8 warriors.',
    upgraded: 'Gain 1 spirit.',
  },
  {
    id: 'shrine-chamber-of-gongs',
    name: 'Chamber of Gongs',
    dungeonType: 'shrine',
    kind: 'room',
    initial: 'Lose 2 spirit unless you have brass talismans.',
    upgraded: 'Gain 1 spirit if you have brass talismans.',
  },
  {
    id: 'shrine-dark-ritual-room',
    name: 'Dark Ritual Room',
    dungeonType: 'shrine',
    kind: 'room',
    initial: 'Lose 2 spirit and 6 warriors.',
    upgraded: 'No losses.',
  },
  {
    id: 'shrine-grotto-of-whispers',
    name: 'Grotto of Whispers',
    dungeonType: 'shrine',
    kind: 'room',
    initial: 'Lose 1 spirit unless you have brass talismans.',
    upgraded: 'Gain 5 warriors.',
  },
  {
    id: 'shrine-hall-of-echoes',
    name: 'Hall of Echoes',
    dungeonType: 'shrine',
    kind: 'room',
    initial: 'Lose 5 warriors.',
    upgraded: 'Gain 5 warriors.',
  },
  {
    id: 'shrine-lunar-observatory',
    name: 'Lunar Observatory',
    dungeonType: 'shrine',
    kind: 'room',
    initial: 'Lose 8 warriors.',
    upgraded: 'Gain 2 potions.',
  },
  {
    id: 'shrine-overgrown-garden',
    name: 'Overgrown Garden',
    dungeonType: 'shrine',
    kind: 'room',
    initial: 'Lose 1 gear and 3 warriors.',
    upgraded: 'No losses.',
  },
  {
    id: 'shrine-sacred-menagerie',
    name: 'Sacred Menagerie',
    dungeonType: 'shrine',
    kind: 'room',
    initial: 'Lose 2 spirit or 2 items.',
    upgraded: 'Gain 1 spirit.',
  },
  {
    id: 'shrine-secret-altar',
    name: 'Secret Altar',
    dungeonType: 'shrine',
    kind: 'room',
    initial: 'Lose 7 warriors.',
    upgraded: 'Lose 1 spirit.',
  },
  {
    id: 'shrine-shaded-reliquary',
    name: 'Shaded Reliquary',
    dungeonType: 'shrine',
    kind: 'room',
    initial: 'Lose 2 spirit and 3 warriors.',
    upgraded: 'Lose 3 warriors.',
  },
  {
    id: 'shrine-sleeping-cells',
    name: 'Sleeping Cells',
    dungeonType: 'shrine',
    kind: 'room',
    initial: 'Lose 6 warriors.',
    upgraded: 'You may gain 1 gear.',
  },
  {
    id: 'shrine-reflecting-pools',
    name: 'Reflecting Pools',
    dungeonType: 'shrine',
    kind: 'room',
    initial: 'Lose 1 potion and 1 warrior.',
    upgraded: 'Gain 1 potion.',
  },
];

/** The Tomb room pool: 1 entrance + 12 encounter rooms. */
export const TOMB_ROOMS: readonly DungeonRoom[] = [
  {
    id: 'tomb-entrance',
    name: 'Entrance',
    dungeonType: 'tomb',
    kind: 'entrance',
    initial:
      'The chamber is musty and stale, a layer of dust confirms that no one has set foot here in ages.',
  },
  {
    id: 'tomb-ceremonial-ossuary',
    name: 'Ceremonial Ossuary',
    dungeonType: 'tomb',
    kind: 'room',
    initial: 'Lose 8 warriors.',
    upgraded: 'Gain 1 spirit and 1 warrior.',
  },
  {
    id: 'tomb-corrupted-shrine',
    name: 'Corrupted Shrine',
    dungeonType: 'tomb',
    kind: 'room',
    initial: 'Lose 1 spirit and 1 warrior.',
    upgraded: 'You may gain 1 spirit and 1 blessed sceptres gear card.',
  },
  {
    id: 'tomb-embalming-chamber',
    name: 'Embalming Chamber',
    dungeonType: 'tomb',
    kind: 'room',
    initial: 'Lose 1 spirit and 2 warriors.',
    upgraded: 'Gain 1 potion.',
  },
  {
    id: 'tomb-foreboding-sigils',
    name: 'Foreboding Sigils',
    dungeonType: 'tomb',
    kind: 'room',
    initial: 'Lose 6 warriors.',
    upgraded: 'Gain 1 spirit.',
  },
  {
    id: 'tomb-offering-table',
    name: 'Offering Table',
    dungeonType: 'tomb',
    kind: 'room',
    initial: 'Lose 2 potions and 2 warriors.',
    upgraded: 'Gain 2 potions.',
  },
  {
    id: 'tomb-ominous-warning',
    name: 'Ominous Warning',
    dungeonType: 'tomb',
    kind: 'room',
    initial: 'Lose 5 warriors.',
    upgraded: 'Gain 2 warriors.',
  },
  {
    id: 'tomb-empty-sepulchre',
    name: 'Empty Sepulchre',
    dungeonType: 'tomb',
    kind: 'room',
    initial: 'Lose 6 warriors.',
    upgraded: 'Gain 1 warrior.',
  },
  {
    id: 'tomb-ritual-circle',
    name: 'Ritual Circle',
    dungeonType: 'tomb',
    kind: 'room',
    initial: 'Lose 2 spirit and 3 warriors.',
    upgraded: 'Gain 2 spirit.',
  },
  {
    id: 'tomb-shattered-sarcophagi',
    name: 'Shattered Sarcophagi',
    dungeonType: 'tomb',
    kind: 'room',
    initial: 'Lose 2 spirit and 2 warriors.',
    upgraded: 'Spend 1 spirit to gain the top card of the treasure deck.',
  },
  {
    id: 'tomb-the-final-guardian',
    name: 'The Final Guardian',
    dungeonType: 'tomb',
    kind: 'room',
    initial: 'Lose 5 warriors and 1 spirit.',
    upgraded: 'Gain 2 spirit.',
  },
  {
    id: 'tomb-the-shambling-reborn',
    name: 'The Shambling Reborn',
    dungeonType: 'tomb',
    kind: 'room',
    initial: 'Lose 6 warriors.',
    upgraded: 'Gain 1 spirit.',
  },
  {
    id: 'tomb-voracious-beetles',
    name: 'Voracious Beetles',
    dungeonType: 'tomb',
    kind: 'room',
    initial: 'Lose 4 warriors.',
    upgraded: 'Gain 2 warriors.',
  },
];

/** Every dungeon room across all six types (78 entries). */
export const DUNGEON_ROOMS: readonly DungeonRoom[] = [
  ...CAVE_ROOMS,
  ...ENCAMPMENT_ROOMS,
  ...FORTRESS_ROOMS,
  ...RUINS_ROOMS,
  ...SHRINE_ROOMS,
  ...TOMB_ROOMS,
];

/** Every dungeon room keyed by its stable `id`. */
export const DUNGEON_ROOM_BY_ID: Readonly<Record<string, DungeonRoom>> = Object.freeze(
  DUNGEON_ROOMS.reduce<Record<string, DungeonRoom>>((acc, room) => {
    acc[room.id] = room;
    return acc;
  }, {}),
);
