/**
 * Tests that all public API symbols are properly exported from the package entry point.
 * This is the export-contract check for `ultimatedarktowerdata` — split out of
 * `ultimatedarktower`'s exports.test.ts in v6, when this data moved packages. Prevents
 * regressions where a symbol used in the public API is accidentally removed from exports.
 */

import {
  BOARD_LOCATIONS,
  BOARD_LOCATION_BY_NAME,
  BOARD_GROUPINGS,
  BOARD_ANCHORS,
  BOARD_IMAGE_INFO,
  BOARD_ADJACENCY,
  neighborsOf,
  stepDistance,
  shortestPath,
  type TerrainType,
  type BuildingType,
  type BoardKingdom,
  type BoardGrouping,
  type BoardLocation,
  type Anchor,
  type AnchorSlot,
  type LocationAnchors,
  type BoardAnchorMap,
  type BoardImageInfo,
  type BoardAdjacency,
  charToValue,
  valueToChar,
  validateSeed,
  decodeSeed,
  decodeRngSeed,
  createSeed,
  encodeSeed,
  compareSeedsRaw,
  dumpSeedChars,
  TIER1_FOES,
  TIER2_FOES,
  TIER3_FOES,
  ADVERSARIES,
  ALLIES,
  DIFFICULTIES,
  GAME_SOURCES,
  SystemRandom,
  type Tier1Foe,
  type Tier2Foe,
  type Tier3Foe,
  type Adversary,
  type Ally,
  type Difficulty,
  type GameSource,
  type ExpansionType,
  type Confidence,
  type SeedBank,
  type DecodedSeed,
  type SeedConfig,
  type CharDiff,
  type SeedComparison,
  type CharDump,
  HEROES,
  HERO_BY_ID,
  MONUMENTS,
  FOES,
  FOE_STATUSES,
  gameContent,
  expansions,
  EXPANSIONS,
  sleeves,
} from '../src';

describe('Package Exports', () => {
  describe('Game Board Exports', () => {
    test('BOARD_LOCATIONS contains 60 entries', () => {
      expect(BOARD_LOCATIONS).toHaveLength(60);
    });

    test('every location has required fields', () => {
      for (const loc of BOARD_LOCATIONS) {
        expect(typeof loc.name).toBe('string');
        expect(loc.name.length).toBeGreaterThan(0);
        expect(['Hills', 'Lake', 'Desert', 'Mountains', 'Grasslands', 'Forest']).toContain(
          loc.terrain,
        );
        expect(['north', 'east', 'west', 'south']).toContain(loc.kingdom);
        if (loc.building !== undefined) {
          expect(['Bazaar', 'Village', 'Sanctuary', 'Citadel']).toContain(loc.building);
        }
        if (loc.grouping !== undefined) {
          expect(Object.values(BOARD_GROUPINGS)).toContain(loc.grouping);
        }
      }
    });

    test('BOARD_LOCATION_BY_NAME has 60 entries', () => {
      expect(Object.keys(BOARD_LOCATION_BY_NAME)).toHaveLength(60);
    });

    test('BOARD_LOCATION_BY_NAME lookup returns correct location', () => {
      const dayside = BOARD_LOCATION_BY_NAME['Dayside'];
      expect(dayside).toBeDefined();
      expect(dayside.terrain).toBe('Lake');
      expect(dayside.building).toBe('Bazaar');
      expect(dayside.kingdom).toBe('north');
      expect(dayside.grouping).toBe(BOARD_GROUPINGS.LONG_WATER);
    });

    test('grouping members are correct', () => {
      const longWater = BOARD_LOCATIONS.filter((l) => l.grouping === BOARD_GROUPINGS.LONG_WATER);
      expect(longWater.map((l) => l.name).sort()).toEqual(['Dayside', 'Fivepint']);

      const greatWoods = BOARD_LOCATIONS.filter(
        (l) => l.grouping === BOARD_GROUPINGS.THE_GREAT_WOODS,
      );
      expect(greatWoods.map((l) => l.name).sort()).toEqual(['Arkartus', 'Delmsmire', 'Yellowpike']);

      const regalRun = BOARD_LOCATIONS.filter((l) => l.grouping === BOARD_GROUPINGS.REGAL_RUN);
      expect(regalRun.map((l) => l.name).sort()).toEqual([
        'Archmont',
        'The Cloister',
        'The Throne',
      ]);
    });

    test('each kingdom has 15 locations', () => {
      const kingdoms: BoardKingdom[] = ['north', 'east', 'west', 'south'];
      for (const k of kingdoms) {
        expect(BOARD_LOCATIONS.filter((l) => l.kingdom === k)).toHaveLength(15);
      }
    });

    test('BOARD_GROUPINGS has expected values', () => {
      expect(BOARD_GROUPINGS.LONG_WATER).toBe('Long Water');
      expect(BOARD_GROUPINGS.THE_GREAT_WOODS).toBe('The Great Woods');
      expect(BOARD_GROUPINGS.REGAL_RUN).toBe('Regal Run');
    });

    test('type aliases are usable', () => {
      const terrain: TerrainType = 'Forest';
      const building: BuildingType = 'Citadel';
      const kingdom: BoardKingdom = 'west';
      const grouping: BoardGrouping = BOARD_GROUPINGS.LONG_WATER;
      const loc: BoardLocation = BOARD_LOCATIONS[0];
      expect(terrain).toBe('Forest');
      expect(building).toBe('Citadel');
      expect(kingdom).toBe('west');
      expect(grouping).toBe('Long Water');
      expect(loc).toBeDefined();
    });
  });

  describe('Board Layout & Adjacency Exports', () => {
    test('BOARD_IMAGE_INFO has the expected shape', () => {
      const info: BoardImageInfo = BOARD_IMAGE_INFO;
      expect(typeof info.width).toBe('number');
      expect(typeof info.height).toBe('number');
      expect(typeof info.centerX).toBe('number');
      expect(typeof info.centerY).toBe('number');
      expect(typeof info.radius).toBe('number');
      expect(typeof info.northHeadingDegrees).toBe('number');
    });

    test('BOARD_ANCHORS and BOARD_ADJACENCY each cover all 60 locations', () => {
      expect(Object.keys(BOARD_ANCHORS)).toHaveLength(60);
      expect(Object.keys(BOARD_ADJACENCY)).toHaveLength(60);
    });

    test('graph helpers are functions', () => {
      expect(typeof neighborsOf).toBe('function');
      expect(typeof stepDistance).toBe('function');
      expect(typeof shortestPath).toBe('function');
    });

    test('type aliases are usable', () => {
      const anchor: Anchor = { x: 0.5, y: 0.5 };
      const slot: AnchorSlot = 'hero';
      const locAnchors: LocationAnchors = { hero: anchor };
      const map: BoardAnchorMap = BOARD_ANCHORS;
      const adj: BoardAdjacency = BOARD_ADJACENCY;
      expect(slot).toBe('hero');
      expect(locAnchors.hero).toBe(anchor);
      expect(map).toBeDefined();
      expect(adj).toBeDefined();
    });
  });

  describe('Seed Parser Exports', () => {
    test('charToValue is a function', () => {
      expect(typeof charToValue).toBe('function');
    });

    test('valueToChar is a function', () => {
      expect(typeof valueToChar).toBe('function');
    });

    test('validateSeed is a function', () => {
      expect(typeof validateSeed).toBe('function');
    });

    test('decodeSeed is a function', () => {
      expect(typeof decodeSeed).toBe('function');
    });

    test('decodeRngSeed is a function', () => {
      expect(typeof decodeRngSeed).toBe('function');
    });

    test('createSeed is a function', () => {
      expect(typeof createSeed).toBe('function');
    });

    test('encodeSeed is a function', () => {
      expect(typeof encodeSeed).toBe('function');
    });

    test('compareSeedsRaw is a function', () => {
      expect(typeof compareSeedsRaw).toBe('function');
    });

    test('dumpSeedChars is a function', () => {
      expect(typeof dumpSeedChars).toBe('function');
    });

    test('DecodedSeed type is usable', () => {
      const result: DecodedSeed = decodeSeed('AA9A-AAGS-W634');
      expect(result).toBeDefined();
      expect(result.seed).toBe('AA9A-AAGS-W634');
      expect(result.tier1Foe).toBe('Brigands');
    });

    test('SeedComparison type is usable', () => {
      const comp: SeedComparison = compareSeedsRaw('AA9A-AAGS-W634', 'BA9A-AAGS-W634');
      expect(comp.seed1).toBe('AA9A-AAGS-W634');
      expect(comp.diffs.length).toBeGreaterThan(0);
    });

    test('CharDiff type is usable', () => {
      const diff: CharDiff = { charIndex: 0, value1: 0, value2: 1, char1: 'a', char2: '1' };
      expect(diff.charIndex).toBe(0);
    });

    test('CharDump type is usable', () => {
      const dump: CharDump = dumpSeedChars('AA9A-AAGS-W634');
      expect(dump.chars).toHaveLength(12);
    });

    test('Confidence type is usable', () => {
      const c: Confidence = 'confirmed';
      expect(c).toBe('confirmed');
    });

    test('lookup arrays are exported', () => {
      expect(TIER1_FOES).toHaveLength(4);
      expect(TIER2_FOES).toHaveLength(4);
      expect(TIER3_FOES).toHaveLength(4);
      expect(ADVERSARIES).toHaveLength(8);
      expect(ALLIES).toHaveLength(10);
      expect(DIFFICULTIES).toHaveLength(2);
      expect(GAME_SOURCES).toHaveLength(2);
    });

    test('SeedConfig type is usable', () => {
      const config: SeedConfig = {
        source: 'Core',
        playerCount: 1,
        adversary: 'Ashstrider',
        ally: 'Gleb',
        difficulty: 'Heroic',
        foes: ['Brigands', 'Frost Trolls', 'Dragons'],
        expansions: [],
      };
      expect(config.source).toBe('Core');
    });

    test('SeedBank type is usable', () => {
      const bank: SeedBank = { initializationSeed: 100, questSeed: 99, seedString: 'test' };
      expect(bank.questSeed).toBe(99);
    });

    test('game type unions are usable', () => {
      const t1: Tier1Foe = 'Brigands';
      const t2: Tier2Foe = 'Frost Trolls';
      const t3: Tier3Foe = 'Dragons';
      const adv: Adversary = 'Ashstrider';
      const ally: Ally = 'Gleb';
      const diff: Difficulty = 'Heroic';
      const src: GameSource = 'Core';
      const exp: ExpansionType = 'Alliances';
      expect(t1).toBe('Brigands');
      expect(t2).toBe('Frost Trolls');
      expect(t3).toBe('Dragons');
      expect(adv).toBe('Ashstrider');
      expect(ally).toBe('Gleb');
      expect(diff).toBe('Heroic');
      expect(src).toBe('Core');
      expect(exp).toBe('Alliances');
    });
  });

  describe('SystemRandom Exports', () => {
    test('SystemRandom is a constructor', () => {
      expect(typeof SystemRandom).toBe('function');
      const rng = new SystemRandom(42);
      expect(rng).toBeDefined();
      expect(typeof rng.next).toBe('function');
      expect(typeof rng.nextMax).toBe('function');
      expect(typeof rng.nextRange).toBe('function');
      expect(typeof rng.nextDouble).toBe('function');
    });
  });

  describe('Flat exports (v6)', () => {
    test('heroes / monuments / foes board rosters resolve at the top level', () => {
      expect(HEROES.length).toBeGreaterThan(0);
      expect(typeof HERO_BY_ID).toBe('object');
      expect(MONUMENTS.length).toBe(8);
      expect(FOES.length).toBeGreaterThan(0);
      expect(FOE_STATUSES.length).toBe(5);
    });

    test('box inventory data resolves at the top level', () => {
      expect(expansions.length).toBe(4);
      expect(EXPANSIONS['Base Game'].name).toBe('Base Game');
      expect(sleeves.length).toBeGreaterThan(0);
    });

    test('gameContent stays a sub-namespace (distinct shape from the board roster)', () => {
      expect(gameContent.HEROES.Spymaster.name).toBe('Spymaster');
      expect(gameContent.heroes.length).toBe(10);
      expect(gameContent.COMPANIONS.Gleb.title).toBe('The Outlaw King');
      expect(gameContent.kingdomVirtues.length).toBe(4);
    });
  });
});
