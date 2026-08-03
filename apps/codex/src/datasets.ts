/**
 * The dataset registry — the only real logic in this app.
 *
 * Every view (table, card grid, detail) is a generic renderer over an entry here, so adding a
 * dataset is a data edit, never a component. Deliberately there is NO per-dataset render config:
 * `render.tsx`'s <Fields> walks Object.entries() and handles strings, string arrays, numbers and
 * one level of nesting, which covers every shape `ultimatedarktowerdata` exports.
 *
 * `exports` on each entry names the game-data exports it covers. `datasets.test.ts` asserts that
 * union equals the package's full export surface, so a new export there fails this app's tests
 * until it is registered — the codex can never silently stop being a complete view of the package.
 */
import * as D from 'ultimatedarktowerdata';

export type Row = Record<string, unknown>;

/** A cross-reference. `id` targets one record; `filter` (a `field:value` facet) targets a subset. */
export type Link = { label: string; dataset: string; id?: string; filter?: string };

export type Group =
  'Rosters' | 'Cards' | 'Dungeons & caravans' | 'Board' | 'Box inventory' | 'Tower' | 'Reference';

export const GROUP_ORDER: readonly Group[] = [
  'Rosters',
  'Cards',
  'Dungeons & caravans',
  'Board',
  'Box inventory',
  'Tower',
  'Reference',
];

export type Dataset = {
  /** URL slug: `#/treasures` */
  id: string;
  name: string;
  group: Group;
  /** game-data export names this entry covers — the drift guard reads these. */
  exports: string[];
  rows: Row[];
  /** Stable record id for URLs. Must be unique within the dataset. */
  key: (r: Row) => string;
  /** Heading for a card/detail. Defaults to the record's `name`, then its key. */
  title?: (r: Row) => string;
  /** Table columns, in order. */
  columns: string[];
  /** Fields offered as filter chips. */
  facets?: string[];
  /** Default view; omit for table. */
  view?: 'cards';
  /** One-line provenance or caveat, shown under the header. */
  note?: string;
  /** Extra badges beyond the automatic `needsReview` stamp. */
  flags?: (r: Row) => string[];
  related?: (r: Row) => Link[];
};

// ── helpers ────────────────────────────────────────────────────────────────────────────────────

const s = (r: Row, f: string): string => String(r[f] ?? '');
const byId = (r: Row): string => s(r, 'id');
const byName = (r: Row): string => s(r, 'name');

/**
 * Widen a typed game-data array to Row[]. Copies the array (not the records): game-data's arrays
 * are `readonly` to TypeScript but NOT frozen at runtime, so handing the live reference to a view
 * that sorts would reorder the data for every other consumer in the tab.
 */
const asRows = <T extends object>(a: readonly T[]): Row[] => [...a] as unknown as Row[];

/** Object keyed by name -> rows, with the key folded in as `field`. */
const rowsOf = (o: Record<string, unknown>, field = 'name'): Row[] =>
  Object.entries(o).map(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? ({ [field]: k, ...(v as Row) } as Row)
      : ({ [field]: k, value: v } as Row),
  );

/** Positional string arrays -> {list, index, value}. */
const listRows = (lists: Record<string, readonly string[]>): Row[] =>
  Object.entries(lists).flatMap(([list, vals]) =>
    vals.map((value, index) => ({ list, index, value })),
  );

const hex = (n: number): string => '0x' + n.toString(16).toUpperCase().padStart(2, '0');

/**
 * Join the parts of a composite key so it survives a hash route: '#' would terminate the hash and
 * '/' would fake a path segment. Real data hits this — box categories include "Manuals / Sheets".
 */
const safeKey = (...parts: string[]): string =>
  parts.filter(Boolean).join('::').replace(/[#/]/g, '-');

// ── cross-reference indexes ────────────────────────────────────────────────────────────────────

/**
 * One name -> link index across every roster and card dataset. This is what lets a box-inventory
 * component find its card and an audio cue find its foe without wiring each pair by hand — the
 * same name-agreement game-data's own nameConsistency test enforces, made navigable.
 */
const NAME_INDEX = new Map<string, Link>();
{
  const sources: [string, readonly { id: string; name: string }[]][] = [
    ['foes', D.ALL_FOES],
    ['heroes', D.HEROES],
    ['monuments', D.MONUMENTS],
    ['treasures', D.TREASURES],
    ['potions-gear', D.POTIONS_AND_GEAR],
    ['companion-cards', D.COMPANION_CARDS],
    ['corruptions', D.CORRUPTIONS],
    ['quest-items', D.QUEST_ITEMS],
    ['quests', D.QUESTS],
    ['spells', D.SPELLS],
    ['monument-cards', D.MONUMENT_CARDS],
    ['nations', D.NATIONS],
  ];
  for (const [dataset, rows] of sources) {
    for (const r of rows)
      if (r.name && !NAME_INDEX.has(r.name))
        NAME_INDEX.set(r.name, { label: r.name, dataset, id: r.id });
  }
}

const AUDIO_BY_NAME = new Map(Object.entries(D.TOWER_AUDIO_LIBRARY).map(([k, v]) => [v.name, k]));

const BOARD_NAMES = Object.keys(D.BOARD_LOCATION_BY_NAME);

/** Link back to whichever roster/card dataset owns this name, if any. */
const nameLink = (r: Row): Link[] => {
  const l = NAME_INDEX.get(s(r, 'name'));
  return l ? [l] : [];
};

// ── derived row sets ───────────────────────────────────────────────────────────────────────────

/** One row per spot rather than per location — 212 placement points, individually filterable. */
const BOARD_SPOT_ROWS: Row[] = Object.entries(D.BOARD_SPOTS).flatMap(([location, spots]) =>
  spots.map((sp) => ({
    location,
    spot: sp.id,
    x: Math.round(sp.at.x * 1000) / 1000,
    y: Math.round(sp.at.y * 1000) / 1000,
    accepts: [...sp.accepts],
  })),
);

const ADJACENCY_ROWS: Row[] = Object.entries(D.BOARD_ADJACENCY).map(([name, neighbors]) => ({
  name,
  degree: neighbors.length,
  neighbors: [...neighbors],
}));

/** Expansion -> Category -> Component, fully flattened so the whole box is one searchable table. */
const BOX_COMPONENT_ROWS: Row[] = D.expansions.flatMap((exp) =>
  exp.categories.flatMap((cat) =>
    cat.components.map((c) => ({
      expansion: exp.name,
      section: cat.section,
      category: cat.name,
      ...c,
    })),
  ),
);

const BOX_TOKEN_ROWS: Row[] = [
  ...D.coffers.flatMap((c) =>
    c.denominations.map((den) => ({ group: c.resource, name: den.name, count: den.count })),
  ),
  ...D.coffers2.tokens.map((t) => ({ group: 'Coffers 2', name: t.name, count: t.count })),
  ...D.skullsPack.tokens.map((t) => ({ group: 'Skulls pack', name: t.name, count: t.count })),
];

const SEED_ALPHABET_ROWS: Row[] = Array.from({ length: 34 }, (_, i) => ({
  value: i,
  char: D.valueToChar(i),
}));

// ── the registry ───────────────────────────────────────────────────────────────────────────────

export const DATASETS: Dataset[] = [
  // ── Rosters ──────────────────────────────────────────────────────────────────────────────────
  {
    id: 'heroes',
    name: 'Heroes',
    group: 'Rosters',
    exports: ['HEROES', 'HERO_BY_ID', 'HERO_BY_NAME'],
    rows: asRows(D.HEROES),
    key: byId,
    columns: ['name', 'source', 'bannerAction', 'startLocation'],
    facets: ['source'],
    view: 'cards',
    note: 'Identity and the gameplay sheet in one record. The 4 unreleased Expeditions heroes are identity-only — their cards are not public, so they carry no banner action or virtues rather than a guess.',
    flags: (r) => (s(r, 'source') === 'expeditions' ? ['provisional'] : []),
  },
  {
    id: 'foes',
    name: 'Foes & adversaries',
    group: 'Rosters',
    exports: ['ALL_FOES', 'FOES', 'ADVERSARY_ROSTER', 'FOE_BY_ID', 'FOE_BY_NAME'],
    rows: asRows(D.ALL_FOES),
    key: byId,
    columns: ['name', 'kind', 'level', 'tier', 'source'],
    facets: ['kind', 'tier', 'source'],
    note: 'ALL_FOES is the canonical spelling for every foe/adversary name in the package, enforced by game-data’s nameConsistency test. FOES + ADVERSARY_ROSTER together make this list.',
    related: (r) => [
      ...(s(r, 'id') in D.FOE_CARDS_BY_ID
        ? [{ label: 'Card face', dataset: 'foe-cards', id: s(r, 'id') }]
        : []),
      ...(AUDIO_BY_NAME.has(s(r, 'name'))
        ? [{ label: 'Tower sound', dataset: 'tower-audio', id: AUDIO_BY_NAME.get(s(r, 'name'))! }]
        : []),
    ],
  },
  {
    id: 'monuments',
    name: 'Monuments',
    group: 'Rosters',
    exports: ['MONUMENTS', 'MONUMENT_BY_ID'],
    rows: asRows(D.MONUMENTS),
    key: byId,
    columns: ['name', 'source'],
    facets: ['source'],
    related: (r) =>
      s(r, 'id') in D.MONUMENT_CARDS_BY_ID
        ? [{ label: 'Card face', dataset: 'monument-cards', id: s(r, 'id') }]
        : [],
  },

  // ── Cards ────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'foe-cards',
    name: 'Foe cards',
    group: 'Cards',
    exports: ['FOE_CARDS', 'FOE_CARDS_BY_ID'],
    rows: asRows(D.FOE_CARDS),
    key: byId,
    columns: ['name', 'level', 'traits', 'event'],
    facets: ['level'],
    view: 'cards',
    note: 'Foes carry whenBattling text and ready/savage/lethal acts; adversaries carry cardText instead.',
    related: (r) => [{ label: 'Roster entry', dataset: 'foes', id: s(r, 'id') }, ...nameLink(r)],
  },
  {
    id: 'monument-cards',
    name: 'Monument cards',
    group: 'Cards',
    exports: ['MONUMENT_CARDS', 'MONUMENT_CARDS_BY_ID'],
    rows: asRows(D.MONUMENT_CARDS),
    key: byId,
    columns: ['name', 'building', 'reinforce1', 'reinforce2', 'offering'],
    facets: ['building'],
    view: 'cards',
    related: (r) => [{ label: 'Roster entry', dataset: 'monuments', id: s(r, 'id') }],
  },
  {
    id: 'companion-cards',
    name: 'Companions',
    group: 'Cards',
    exports: ['COMPANION_CARDS', 'COMPANION_CARDS_BY_ID'],
    rows: asRows(D.COMPANION_CARDS),
    key: byId,
    columns: ['name', 'title', 'guild', 'quest', 'kingdom', 'ability'],
    facets: ['kingdom', 'guild'],
    view: 'cards',
    note: '22 cards: 10 quest companions and the 12 guild companions.',
  },
  {
    id: 'treasures',
    name: 'Treasures',
    group: 'Cards',
    exports: ['TREASURES', 'TREASURES_BY_ID'],
    rows: asRows(D.TREASURES),
    key: byId,
    columns: ['name', 'source', 'group', 'text'],
    facets: ['source', 'group'],
    view: 'cards',
  },
  {
    id: 'potions-gear',
    name: 'Potions & gear',
    group: 'Cards',
    exports: ['POTIONS_AND_GEAR', 'POTIONS_AND_GEAR_BY_ID'],
    rows: asRows(D.POTIONS_AND_GEAR),
    key: byId,
    columns: ['name', 'kind', 'effect', 'count', 'color'],
    facets: ['kind', 'color'],
    view: 'cards',
    note: 'Four rows are unreleased Expeditions gear the source author could not fully observe — they carry a source note rather than a guess.',
  },
  {
    id: 'corruptions',
    name: 'Corruptions',
    group: 'Cards',
    exports: ['CORRUPTIONS', 'CORRUPTIONS_BY_ID'],
    rows: asRows(D.CORRUPTIONS),
    key: byId,
    columns: ['name', 'source', 'description'],
    facets: ['source'],
    view: 'cards',
  },
  {
    id: 'quest-items',
    name: 'Quest items',
    group: 'Cards',
    exports: ['QUEST_ITEMS', 'QUEST_ITEMS_BY_ID'],
    rows: asRows(D.QUEST_ITEMS),
    key: byId,
    columns: ['name', 'effect', 'count', 'note'],
    view: 'cards',
    note: '17 distinct items across 20 physical cards.',
  },
  {
    id: 'quests',
    name: 'Monthly quests',
    group: 'Cards',
    exports: ['QUESTS', 'QUESTS_BY_ID'],
    rows: asRows(D.QUESTS),
    key: byId,
    columns: ['name', 'virtue', 'kingdom', 'details'],
    facets: ['kingdom', 'virtue'],
    view: 'cards',
    note: 'Four per kingdom. These are boxInventory’s “Heroic Tests” category.',
    related: (r) =>
      BOARD_NAMES.filter((n) => s(r, 'details').includes(n)).map((n) => ({
        label: n,
        dataset: 'board-locations',
        id: n,
      })),
  },
  {
    id: 'spells',
    name: 'Spells & invocations',
    group: 'Cards',
    exports: ['SPELLS', 'SPELLS_BY_ID'],
    rows: asRows(D.SPELLS),
    key: byId,
    columns: ['name', 'kind', 'effect'],
    facets: ['kind'],
    view: 'cards',
    note: 'Six spells and four invocations — the Reverent Astromancer’s deck.',
  },
  {
    id: 'nations',
    name: 'Nations',
    group: 'Cards',
    exports: ['NATIONS', 'NATIONS_BY_ID'],
    rows: asRows(D.NATIONS),
    key: byId,
    columns: ['name', 'kingdom', 'color', 'terrain', 'virtue', 'guild'],
    facets: ['kingdom'],
    view: 'cards',
  },

  // ── Dungeons & caravans ──────────────────────────────────────────────────────────────────────
  {
    id: 'dungeon-rooms',
    name: 'Dungeon rooms',
    group: 'Dungeons & caravans',
    exports: [
      'DUNGEON_ROOMS',
      'DUNGEON_ROOM_BY_ID',
      'CAVE_ROOMS',
      'ENCAMPMENT_ROOMS',
      'FORTRESS_ROOMS',
      'RUINS_ROOMS',
      'SHRINE_ROOMS',
      'TOMB_ROOMS',
      'DUNGEON_ADVANTAGE',
    ],
    rows: D.DUNGEON_ROOMS.map((r) => ({ ...r, advantage: D.DUNGEON_ADVANTAGE[r.dungeonType] })),
    key: byId,
    columns: ['name', 'dungeonType', 'advantage', 'kind', 'initial', 'upgraded'],
    facets: ['dungeonType', 'kind', 'advantage'],
    note: '78 rooms — one entrance and twelve rooms for each of the six dungeon types. `advantage` is the advantage that type lets you spend.',
  },
  {
    id: 'caravan-rooms',
    name: 'Caravan rooms',
    group: 'Dungeons & caravans',
    exports: ['CARAVAN_ROOMS', 'CARAVAN_ROOMS_BY_ID'],
    rows: asRows(D.CARAVAN_ROOMS),
    key: byId,
    columns: ['name', 'route', 'kind', 'initial', 'upgraded'],
    facets: ['route', 'kind'],
    note: 'Known-incomplete: the set was observed in play, so two rows carry a source note.',
  },

  // ── Board ────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'board-locations',
    name: 'Board locations',
    group: 'Board',
    exports: ['BOARD_LOCATIONS', 'BOARD_LOCATION_BY_NAME', 'BOARD_GROUPINGS'],
    rows: asRows(D.BOARD_LOCATIONS),
    key: byName,
    columns: ['name', 'terrain', 'building', 'kingdom', 'grouping', 'borders', 'dungeon'],
    facets: ['kingdom', 'terrain', 'building', 'grouping'],
    note: 'All 60 spaces. A dungeon has been identified for 46 of them.',
    flags: (r) => (r.dungeon ? [] : ['dungeon unidentified']),
    related: (r) => {
      const name = s(r, 'name');
      const dungeon = r.dungeon as { type: string } | undefined;
      return [
        { label: 'Adjacency', dataset: 'board-adjacency', id: name },
        { label: 'Token spots', dataset: 'board-spots', filter: `location:${name}` },
        ...(dungeon
          ? [
              {
                label: `${dungeon.type} rooms`,
                dataset: 'dungeon-rooms',
                filter: `dungeonType:${dungeon.type}`,
              },
            ]
          : []),
      ];
    },
  },
  {
    id: 'board-adjacency',
    name: 'Adjacency',
    group: 'Board',
    exports: ['BOARD_ADJACENCY'],
    rows: ADJACENCY_ROWS,
    key: byName,
    columns: ['name', 'degree', 'neighbors'],
    note: 'The movement graph. Every neighbour is a link, so this table browses as a graph.',
    related: (r) => [
      { label: 'Location', dataset: 'board-locations', id: s(r, 'name') },
      ...(r.neighbors as string[]).map((n) => ({ label: n, dataset: 'board-locations', id: n })),
    ],
  },
  {
    id: 'board-spots',
    name: 'Token spots',
    group: 'Board',
    exports: ['BOARD_SPOTS', 'BOARD_IMAGE_INFO'],
    rows: BOARD_SPOT_ROWS,
    key: (r) => safeKey(s(r, 'location'), s(r, 'spot')),
    title: (r) => `${s(r, 'location')} · ${s(r, 'spot')}`,
    columns: ['location', 'spot', 'x', 'y', 'accepts'],
    facets: ['spot'],
    note: `Where each token sits, as fractions of the board image (${D.BOARD_IMAGE_INFO.width}×${D.BOARD_IMAGE_INFO.height}, north heading ${D.BOARD_IMAGE_INFO.northHeadingDegrees}°). Foe spots also accept adversaries; marker spots also accept quests.`,
    related: (r) => [{ label: 'Location', dataset: 'board-locations', id: s(r, 'location') }],
  },

  // ── Box inventory ────────────────────────────────────────────────────────────────────────────
  {
    id: 'box-components',
    name: 'Components',
    group: 'Box inventory',
    exports: ['expansions', 'EXPANSIONS'],
    rows: BOX_COMPONENT_ROWS,
    // 26 of the 347 components carry no `name` at all: 12 (flags, monument minis) label themselves
    // with `type` and 14 (mini bases) with `color`. Both have to be in the key — and in the title,
    // or those rows render as their raw composite key.
    key: (r) =>
      safeKey(
        s(r, 'expansion'),
        s(r, 'category'),
        s(r, 'name'),
        s(r, 'type'),
        s(r, 'color'),
        s(r, 'level'),
      ),
    title: (r) => s(r, 'name') || s(r, 'type') || s(r, 'color'),
    columns: ['name', 'count', 'expansion', 'section', 'category', 'color', 'type', 'level'],
    facets: ['expansion', 'section', 'category'],
    note: 'Everything in every box, flattened. Card names here must match the card datasets verbatim — game-data’s nameConsistency test enforces it, and the Related link is that agreement made visible.',
    related: nameLink,
  },
  {
    id: 'box-tokens',
    name: 'Tokens',
    group: 'Box inventory',
    exports: ['coffers', 'coffers2', 'skullsPack'],
    rows: BOX_TOKEN_ROWS,
    key: (r) => safeKey(s(r, 'group'), s(r, 'name')),
    columns: ['group', 'name', 'count'],
    facets: ['group'],
  },
  {
    id: 'box-sleeves',
    name: 'Sleeves',
    group: 'Box inventory',
    exports: ['sleeves'],
    rows: asRows(D.sleeves),
    key: byName,
    columns: ['name', 'purposes'],
  },

  // ── Tower ────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'tower-audio',
    name: 'Tower audio',
    group: 'Tower',
    exports: ['TOWER_AUDIO_LIBRARY'],
    rows: rowsOf(D.TOWER_AUDIO_LIBRARY as unknown as Record<string, unknown>, 'key').map((r) => ({
      ...r,
      hex: hex(r.value as number),
    })),
    key: (r) => s(r, 'key'),
    columns: ['name', 'category', 'value', 'hex'],
    facets: ['category'],
    note: '113 cues in 12 categories. `value` is the byte the tower firmware expects; the labels carry no authority, the bytes do.',
    related: nameLink,
  },
  {
    id: 'light-sequences',
    name: 'Light sequences',
    group: 'Tower',
    exports: ['TOWER_LIGHT_SEQUENCES'],
    rows: Object.entries(D.TOWER_LIGHT_SEQUENCES).map(([name, value]) => ({
      name,
      value,
      hex: hex(value as number),
    })),
    key: byName,
    columns: ['name', 'value', 'hex'],
  },
  {
    id: 'glyphs',
    name: 'Glyphs',
    group: 'Tower',
    exports: ['GLYPHS'],
    rows: rowsOf(D.GLYPHS as unknown as Record<string, unknown>, 'key'),
    key: (r) => s(r, 'key'),
    columns: ['key', 'name', 'level', 'side'],
    note: 'The five seal glyphs and where each sits on the tower drums.',
  },

  // ── Reference ────────────────────────────────────────────────────────────────────────────────
  {
    id: 'kingdom-virtues',
    name: 'Kingdom virtues',
    group: 'Reference',
    exports: ['KINGDOM_VIRTUES', 'kingdomVirtues'],
    rows: Object.entries(D.KINGDOM_VIRTUES).map(([kingdom, v]) => ({ kingdom, ...v })),
    key: (r) => s(r, 'kingdom'),
    columns: ['kingdom', 'name', 'ability'],
    note: 'Taken at setup for your seating kingdom — not hero-specific, which is why they are not on the hero sheet.',
  },
  {
    id: 'vocabularies',
    name: 'Vocabularies',
    group: 'Reference',
    exports: ['ADVANTAGE_TYPES', 'FOE_STATUSES', 'RESERVED_TOKEN_TYPES'],
    rows: listRows({
      'Advantage types': D.ADVANTAGE_TYPES,
      'Foe statuses': D.FOE_STATUSES,
      'Reserved token types': D.RESERVED_TOKEN_TYPES,
    }),
    key: (r) => safeKey(s(r, 'list'), s(r, 'value')),
    title: (r) => s(r, 'value'),
    columns: ['list', 'value'],
    facets: ['list'],
    note: 'Closed vocabularies used as field values elsewhere. Order is presentational here — unlike Seed constants, the index means nothing.',
  },
  {
    id: 'seed-constants',
    name: 'Seed constants',
    group: 'Reference',
    exports: [
      'TIER1_FOES',
      'TIER2_FOES',
      'TIER3_FOES',
      'ADVERSARIES',
      'ALLIES',
      'DIFFICULTIES',
      'GAME_SOURCES',
    ],
    rows: listRows({
      'Tier 1 foes': D.TIER1_FOES,
      'Tier 2 foes': D.TIER2_FOES,
      'Tier 3 foes': D.TIER3_FOES,
      Adversaries: D.ADVERSARIES,
      Allies: D.ALLIES,
      Difficulties: D.DIFFICULTIES,
      'Game sources': D.GAME_SOURCES,
    }),
    key: (r) => safeKey(s(r, 'list'), s(r, 'index')),
    title: (r) => s(r, 'value'),
    columns: ['list', 'index', 'value'],
    facets: ['list'],
    note: 'These lists are positional: the index IS the value encoded in a game seed. To decode a whole seed, use the Seed Decoder app.',
  },
  {
    id: 'seed-alphabet',
    name: 'Seed alphabet',
    group: 'Reference',
    exports: ['charToValue', 'valueToChar'],
    rows: SEED_ALPHABET_ROWS,
    key: (r) => s(r, 'value'),
    title: (r) => `${s(r, 'char')} = ${s(r, 'value')}`,
    columns: ['value', 'char'],
    note: 'The base-34 alphabet seeds are written in. `0` and `o` are excluded so they can never be confused when read aloud.',
  },
];

export const DATASET_BY_ID = new Map(DATASETS.map((d) => [d.id, d]));

/** Total browsable records, for the home page. */
export const TOTAL_ROWS = DATASETS.reduce((n, d) => n + d.rows.length, 0);
