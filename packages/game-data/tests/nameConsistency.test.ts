/**
 * Regression test for the v6 name reconciliation. `ultimatedarktower` used to disagree with
 * itself about the same 8 adversaries and 12 foes — e.g. "Isa the Exile" (seed parser, foe
 * roster) vs "Isa The Exile" (game content, box inventory) vs "Isa the Hollow" (audio
 * library), and singular foe names ("Dragon", "Frost Troll") next to plural ones ("Dragons",
 * "Frost Trolls"). `foes.ts`'s `ALL_FOES` is the canonical source — its own doc comment says
 * its names "match the seed-parser union exactly" — so every other roster that names a foe or
 * adversary must use exactly one of those spellings. This is what stops the drift returning.
 */

import { ALL_FOES, FOE_BY_ID } from '../src/foes';
import {
  TIER1_FOES,
  TIER2_FOES,
  TIER3_FOES,
  ADVERSARIES as SEED_ADVERSARIES,
} from '../src/seed/seedParser';
import {
  FOES as CONTENT_FOES,
  ADVERSARIES as CONTENT_ADVERSARIES,
  COMPANIONS as CONTENT_COMPANIONS,
} from '../src/gameContent';
import { TOWER_AUDIO_LIBRARY } from '../src/constants';
import { expansions } from '../src/boxInventory';
import { MONUMENT_BY_ID } from '../src/monuments';
import { BOARD_LOCATIONS, BOARD_LOCATION_BY_NAME } from '../src/board/gameBoard';
import { FOE_CARDS } from '../src/foeCards';
import { MONUMENT_CARDS } from '../src/monumentCards';
import { COMPANION_CARDS } from '../src/companionCards';
import { TREASURES } from '../src/treasures';
import { POTIONS_AND_GEAR } from '../src/potionsAndGear';
import { CORRUPTIONS } from '../src/corruptions';
import { QUEST_ITEMS } from '../src/questItems';
import { QUESTS } from '../src/quests';
import { SPELLS } from '../src/spells';
import { NATIONS } from '../src/nations';
import { DUNGEON_ADVANTAGE } from '../src/dungeons';

const CANONICAL_NAMES = new Set<string>(ALL_FOES.map((f) => f.name));

describe('foe/adversary name consistency (v6 reconciliation)', () => {
  test('foes.ts has the full canonical roster: 12 foes + 8 adversaries', () => {
    expect(CANONICAL_NAMES.size).toBe(20);
  });

  test('seed-parser tier/adversary enums use canonical spelling', () => {
    for (const name of [...TIER1_FOES, ...TIER2_FOES, ...TIER3_FOES, ...SEED_ADVERSARIES]) {
      expect(CANONICAL_NAMES.has(name)).toBe(true);
    }
  });

  test('gameContent.ts foes/adversaries use canonical spelling', () => {
    for (const name of Object.keys(CONTENT_FOES)) {
      expect(CANONICAL_NAMES.has(name)).toBe(true);
    }
    for (const name of Object.keys(CONTENT_ADVERSARIES)) {
      expect(CANONICAL_NAMES.has(name)).toBe(true);
    }
  });

  test('TOWER_AUDIO_LIBRARY Foe/Adversary labels use canonical spelling', () => {
    // A few keys in the "Foe" category are event-type cues, not foe names — exclude those.
    const NON_NAME_KEYS = new Set(['FoeEvent', 'FoeSpawn', 'LeveledUp']);
    const foeOrAdversaryEntries = Object.entries(TOWER_AUDIO_LIBRARY).filter(
      ([key, entry]) =>
        (entry.category === 'Foe' || entry.category === 'Adversary') && !NON_NAME_KEYS.has(key),
    );
    expect(foeOrAdversaryEntries.length).toBeGreaterThan(0);
    for (const [, entry] of foeOrAdversaryEntries) {
      expect(CANONICAL_NAMES.has(entry.name)).toBe(true);
    }
  });

  test('box inventory foe/adversary components (identified by their identity `level`) use canonical spelling', () => {
    const levelBearingNames: string[] = [];
    for (const expansion of expansions) {
      for (const category of expansion.categories) {
        for (const component of category.components) {
          // Every component in this dataset carrying a numeric `level` is a foe (2-4) or
          // adversary (5) identity level — no other component kind uses this field.
          if (typeof component.level === 'number' && component.name) {
            levelBearingNames.push(component.name);
          }
        }
      }
    }
    expect(levelBearingNames.length).toBeGreaterThan(0);
    for (const name of levelBearingNames) {
      expect(CANONICAL_NAMES.has(name)).toBe(true);
    }
  });
});

/**
 * The same guard, extended to the card datasets imported from the research spreadsheets.
 * The import found the draft using `utukku` where `foes.ts` says `utuk-ku`, and found
 * `boxInventory.ts` naming 42 cards differently from the cards themselves ("Amulet Of
 * Hope", "Diadem Of The Emmisary", "Opal of Protection"). These tests are what stop both
 * classes of drift coming back.
 */
describe('card data agrees with the identity rosters', () => {
  test('every foe card matches a roster foe on id AND name', () => {
    expect(FOE_CARDS).toHaveLength(ALL_FOES.length);
    for (const card of FOE_CARDS) {
      const foe = FOE_BY_ID[card.id];
      expect(foe, `no roster foe with id '${card.id}'`).toBeDefined();
      expect(card.name).toBe(foe.name);
      expect(card.level).toBe(foe.level);
    }
  });

  test('every monument card matches a roster monument on id AND name', () => {
    for (const card of MONUMENT_CARDS) {
      const monument = MONUMENT_BY_ID[card.id];
      expect(monument, `no roster monument with id '${card.id}'`).toBeDefined();
      expect(card.name).toBe(monument.name);
    }
  });

  test('gameContent companions all appear in COMPANION_CARDS with the same title', () => {
    const byName = new Map(COMPANION_CARDS.map((c) => [c.name, c]));
    for (const companion of Object.values(CONTENT_COMPANIONS)) {
      const card = byName.get(companion.name);
      expect(card, `no companion card named '${companion.name}'`).toBeDefined();
      expect(card!.title).toBe(companion.title);
    }
  });

  test('box inventory card names all exist in the matching card dataset', () => {
    // `Heroic Tests` is boxInventory's name for the 16 monthly quest cards.
    const CARD_CATEGORIES = new Set([
      'Treasures',
      'Quest Items',
      'Potions',
      'Gear',
      'Corruption',
      'Companion',
      'Spell',
      'Invocation',
      'Monuments',
      'Monument',
      'Heroic Tests',
    ]);
    const cardNames = new Set(
      [
        ...TREASURES,
        ...QUEST_ITEMS,
        ...POTIONS_AND_GEAR,
        ...CORRUPTIONS,
        ...COMPANION_CARDS,
        ...SPELLS,
        ...MONUMENT_CARDS,
        ...QUESTS,
      ]
        .map((c) => c.name)
        .filter(Boolean),
    );

    const checked: string[] = [];
    for (const expansion of expansions) {
      for (const category of expansion.categories) {
        if (!CARD_CATEGORIES.has(category.name)) continue;
        for (const component of category.components) {
          if (!component.name) continue;
          checked.push(component.name);
          expect(
            cardNames.has(component.name),
            `boxInventory '${category.name}' names '${component.name}', which no card dataset has`,
          ).toBe(true);
        }
      }
    }
    expect(checked.length).toBeGreaterThan(100);
  });
});

describe('board data agrees with the card datasets', () => {
  test('every location dungeon has a known type and a unique name', () => {
    const withDungeon = BOARD_LOCATIONS.filter((l) => l.dungeon);
    expect(withDungeon.length).toBeGreaterThan(0);

    const names = withDungeon.map((l) => l.dungeon!.name);
    // Location ↔ dungeon is one-to-one: the same dungeon never appears in two locations.
    expect(new Set(names).size).toBe(names.length);

    for (const location of withDungeon) {
      expect(Object.keys(DUNGEON_ADVANTAGE)).toContain(location.dungeon!.type);
    }
  });

  test('every quest names a real board location', () => {
    // All 16 quests are "Quest in <location> and …". This caught the imported text still
    // saying "Akartus" after the location itself was corrected to "Arkartus".
    const locationNames = Object.keys(BOARD_LOCATION_BY_NAME);
    for (const quest of QUESTS) {
      const hit = locationNames.some(
        // Quest text drops a leading "The" ("Quest in the Decaying Wilds").
        (name) => quest.details.includes(name) || quest.details.includes(name.replace(/^The /, '')),
      );
      expect(hit, `quest '${quest.name}' names no known location: ${quest.details}`).toBe(true);
    }
  });

  test('a quest’s virtue is its kingdom’s virtue', () => {
    const virtueByKingdom = new Map(NATIONS.map((n) => [n.kingdom, n.virtue]));
    for (const quest of QUESTS) {
      expect(quest.virtue).toBe(virtueByKingdom.get(quest.kingdom));
    }
  });
});
