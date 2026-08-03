/**
 * Integrity tests for the card datasets imported from the RtDT research spreadsheets
 * (see `docs/spreadsheet-import.md`). Roster sizes here are load-bearing: several of them
 * are independently corroborated by counts the source author published on BGG, so a size
 * change means either a real discovery or a lost/duplicated row.
 *
 * Cross-dataset name and id agreement lives in `nameConsistency.test.ts`, not here.
 */
import { ADVANTAGE_TYPES } from '../src/advantages';
import {
  DUNGEON_ROOMS,
  DUNGEON_ROOM_BY_ID,
  DUNGEON_ADVANTAGE,
  CAVE_ROOMS,
  ENCAMPMENT_ROOMS,
  FORTRESS_ROOMS,
  RUINS_ROOMS,
  SHRINE_ROOMS,
  TOMB_ROOMS,
  type DungeonType,
} from '../src/dungeons';
import { CARAVAN_ROOMS, CARAVAN_ROOMS_BY_ID } from '../src/caravans';
import { FOE_CARDS, FOE_CARDS_BY_ID } from '../src/foeCards';
import { MONUMENT_CARDS, MONUMENT_CARDS_BY_ID } from '../src/monumentCards';
import { COMPANION_CARDS, COMPANION_CARDS_BY_ID } from '../src/companionCards';
import { TREASURES, TREASURES_BY_ID } from '../src/treasures';
import { POTIONS_AND_GEAR, POTIONS_AND_GEAR_BY_ID } from '../src/potionsAndGear';
import { CORRUPTIONS, CORRUPTIONS_BY_ID } from '../src/corruptions';
import { QUEST_ITEMS, QUEST_ITEMS_BY_ID } from '../src/questItems';
import { QUESTS, QUESTS_BY_ID } from '../src/quests';
import { SPELLS, SPELLS_BY_ID } from '../src/spells';
import { NATIONS, NATIONS_BY_ID } from '../src/nations';

const DATASETS: ReadonlyArray<
  [name: string, rows: readonly { id: string }[], byId: Readonly<Record<string, unknown>>]
> = [
  ['DUNGEON_ROOMS', DUNGEON_ROOMS, DUNGEON_ROOM_BY_ID],
  ['CARAVAN_ROOMS', CARAVAN_ROOMS, CARAVAN_ROOMS_BY_ID],
  ['FOE_CARDS', FOE_CARDS, FOE_CARDS_BY_ID],
  ['MONUMENT_CARDS', MONUMENT_CARDS, MONUMENT_CARDS_BY_ID],
  ['COMPANION_CARDS', COMPANION_CARDS, COMPANION_CARDS_BY_ID],
  ['TREASURES', TREASURES, TREASURES_BY_ID],
  ['POTIONS_AND_GEAR', POTIONS_AND_GEAR, POTIONS_AND_GEAR_BY_ID],
  ['CORRUPTIONS', CORRUPTIONS, CORRUPTIONS_BY_ID],
  ['QUEST_ITEMS', QUEST_ITEMS, QUEST_ITEMS_BY_ID],
  ['QUESTS', QUESTS, QUESTS_BY_ID],
  ['SPELLS', SPELLS, SPELLS_BY_ID],
  ['NATIONS', NATIONS, NATIONS_BY_ID],
];

describe('card dataset shape', () => {
  test.each(DATASETS)('%s has unique kebab-case ids', (_name, rows) => {
    const ids = rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  test.each(DATASETS)('%s _BY_ID is frozen and covers every row', (_name, rows, byId) => {
    expect(Object.isFrozen(byId)).toBe(true);
    expect(Object.keys(byId)).toHaveLength(rows.length);
    for (const row of rows) {
      expect(byId[row.id]).toBe(row);
    }
  });
});

describe('roster sizes', () => {
  test('each dungeon type has 1 entrance + 12 rooms, 78 in total', () => {
    const pools: [DungeonType, readonly { kind: string; dungeonType: DungeonType }[]][] = [
      ['cave', CAVE_ROOMS],
      ['encampment', ENCAMPMENT_ROOMS],
      ['fortress', FORTRESS_ROOMS],
      ['ruins', RUINS_ROOMS],
      ['shrine', SHRINE_ROOMS],
      ['tomb', TOMB_ROOMS],
    ];
    for (const [type, pool] of pools) {
      expect(pool).toHaveLength(13);
      expect(pool.filter((r) => r.kind === 'entrance')).toHaveLength(1);
      for (const room of pool) {
        expect(room.dungeonType).toBe(type);
      }
    }
    expect(DUNGEON_ROOMS).toHaveLength(78);
  });

  test('DUNGEON_ADVANTAGE maps all six types to a real advantage type', () => {
    const entries = Object.entries(DUNGEON_ADVANTAGE);
    expect(entries).toHaveLength(6);
    for (const [, advantage] of entries) {
      expect(ADVANTAGE_TYPES).toContain(advantage);
    }
  });

  test('caravan pools: the three routes plus the two shared framing cards', () => {
    expect(CARAVAN_ROOMS).toHaveLength(32);
    // Known incomplete — rooms repeat within a run, so these are floors, not totals.
    expect(CARAVAN_ROOMS.filter((r) => r.route === 'east')).toHaveLength(11);
    expect(CARAVAN_ROOMS.filter((r) => r.route === 'north')).toHaveLength(10);
    expect(CARAVAN_ROOMS.filter((r) => r.route === 'west')).toHaveLength(9);
    expect(CARAVAN_ROOMS.filter((r) => r.route === 'all')).toHaveLength(2);
  });

  test('20 foe cards: 12 foes with acts + 8 adversaries without', () => {
    expect(FOE_CARDS).toHaveLength(20);
    const foes = FOE_CARDS.filter((c) => c.level < 5);
    const adversaries = FOE_CARDS.filter((c) => c.level === 5);
    expect(foes).toHaveLength(12);
    expect(adversaries).toHaveLength(8);
    // Foes use `whenBattling` + `acts`; adversaries use `cardText` and have no strike track.
    for (const foe of foes) {
      expect(foe.whenBattling).toBeDefined();
      expect(foe.acts).toBeDefined();
    }
    for (const adversary of adversaries) {
      expect(adversary.cardText).toBeDefined();
      expect(adversary.acts).toBeUndefined();
    }
  });

  test('foe traits are real advantage types; only Isa the Exile has one', () => {
    for (const card of FOE_CARDS) {
      for (const trait of card.traits) {
        expect(ADVANTAGE_TYPES).toContain(trait);
      }
    }
    const single = FOE_CARDS.filter((c) => c.traits.length === 1);
    expect(single.map((c) => c.id)).toEqual(['isa-the-exile']);
  });

  test('22 companions: 12 guild + 10 base-game quest companions', () => {
    expect(COMPANION_CARDS).toHaveLength(22);
    expect(COMPANION_CARDS.filter((c) => c.guild)).toHaveLength(12);
    expect(COMPANION_CARDS.filter((c) => c.quest)).toHaveLength(10);
  });

  test('17 quest-item entries totalling the 20 physical cards in the box', () => {
    expect(QUEST_ITEMS).toHaveLength(17);
    const copies = QUEST_ITEMS.reduce((sum, item) => sum + (item.count ?? 1), 0);
    expect(copies).toBe(20);
  });

  test('62 treasures, 24 corruptions, 8 monument cards, 18 potion/gear entries', () => {
    expect(TREASURES).toHaveLength(62);
    expect(CORRUPTIONS).toHaveLength(24);
    expect(MONUMENT_CARDS).toHaveLength(8);
    expect(POTIONS_AND_GEAR).toHaveLength(18);
  });

  test('16 quests — four players × four kingdoms in competitive play', () => {
    expect(QUESTS).toHaveLength(16);
    for (const kingdom of ['north', 'south', 'east', 'west'] as const) {
      expect(QUESTS.filter((q) => q.kingdom === kingdom)).toHaveLength(4);
    }
  });

  test('10 spells: 6 spells + 4 invocations, and 4 nations', () => {
    expect(SPELLS.filter((s) => s.kind === 'spell')).toHaveLength(6);
    expect(SPELLS.filter((s) => s.kind === 'invocation')).toHaveLength(4);
    expect(NATIONS).toHaveLength(4);
  });

  test('treasure advantages use real advantage types', () => {
    for (const treasure of TREASURES) {
      if (treasure.advantage) {
        expect(ADVANTAGE_TYPES).toContain(treasure.advantage.type);
        expect(treasure.advantage.count).toBeGreaterThan(0);
      }
    }
  });

  test('every row flagged needsReview explains itself with a sourceNote', () => {
    const flagged = [...CARAVAN_ROOMS, ...DUNGEON_ROOMS, ...POTIONS_AND_GEAR].filter(
      (r) => r.needsReview,
    );
    expect(flagged.length).toBeGreaterThan(0);
    for (const row of flagged) {
      expect(row.sourceNote).toBeTruthy();
    }
  });
});
