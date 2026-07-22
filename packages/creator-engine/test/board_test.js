// board_test.js — custom game boards (schema 0.4.6 setup.board.boardRef → library.boards).
//
// Setup synthesizes the same {home, buildings} shape a hand-authored inline boardState spells
// out, so nothing downstream changes: hero start locations come from each kingdom's citadel and
// the buildings registry from every location carrying a building. The golden/lockstep streams
// are unaffected because this branch only activates when a boardRef is authored (proved by
// lockstep_test.js / fixture_test.js staying green).

const engine = require('../dist/engine');
const { golden } = require('../dist/golden-fixture');

let pass = 0,
  fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log('PASS  ' + name);
  } else {
    fail++;
    console.log('XXXX  ' + name + (extra ? '  — ' + extra : ''));
  }
}
function check(name, fn) {
  try {
    ok(name, fn());
  } catch (e) {
    fail++;
    console.log('XXXX  ' + name + '  — threw: ' + e.message);
  }
}

const clone = (o) => JSON.parse(JSON.stringify(o));

/** A 4-kingdom custom board: one citadel each, plus assorted other buildings. */
function customBoard(overrides) {
  return Object.assign(
    {
      id: 'shattered-reach',
      name: 'The Shattered Reach',
      imageInfo: { width: 2048, height: 2048 },
      locations: [
        { name: 'Emberfall', kingdom: 'north', terrain: 'Ash', building: 'citadel' },
        { name: 'Coldwatch', kingdom: 'north', terrain: 'Tundra' },
        { name: 'Saltmere', kingdom: 'north', terrain: 'Lake', building: 'bazaar' },
        { name: 'Kingsreach', kingdom: 'south', terrain: 'Plains', building: 'citadel' },
        { name: 'Thornhollow', kingdom: 'east', terrain: 'Forest', building: 'citadel' },
        { name: 'Gravelrun', kingdom: 'west', terrain: 'Hills', building: 'citadel' },
      ],
    },
    overrides || {},
  );
}

/** The golden fixture, re-pointed at a custom board. */
function withBoard(board) {
  const sc = clone(golden);
  sc.schemaVersion = '0.4.6';
  sc.setup.board = { boardRef: board.id };
  sc.library.boards = { [board.id]: board };
  return sc;
}

const init = (sc, playerCount) =>
  engine.init(sc, { seed: 'board-test-seed', playerCount: playerCount || 1 });

// ---------- hero homes ----------

check("boardRef: the hero starts on its kingdom's citadel", () => {
  const r = init(withBoard(customBoard()));
  // playerCount 1 ⇒ north is the only active kingdom (see golden's dormant split).
  return r.state.heroes.hero1.location === 'Emberfall';
});

check('boardRef: each active kingdom gets its OWN citadel as its hero home', () => {
  const r = init(withBoard(customBoard()), 4);
  const owner = r.state.kingdoms.ownership;
  const at = (k) => r.state.heroes[owner[k]].location;
  return (
    at('north') === 'Emberfall' &&
    at('south') === 'Kingsreach' &&
    at('east') === 'Thornhollow' &&
    at('west') === 'Gravelrun'
  );
});

check('boardRef: the FIRST citadel in a kingdom wins when several are authored', () => {
  const board = customBoard({
    locations: [
      { name: 'First Keep', kingdom: 'north', terrain: 'Ash', building: 'citadel' },
      { name: 'Second Keep', kingdom: 'north', terrain: 'Ash', building: 'citadel' },
    ],
  });
  return init(withBoard(board)).state.heroes.hero1.location === 'First Keep';
});

check('boardRef: a kingdom with no citadel leaves its hero unplaced (null, not a throw)', () => {
  const board = customBoard({
    locations: [{ name: 'Coldwatch', kingdom: 'north', terrain: 'Tundra' }],
  });
  return init(withBoard(board)).state.heroes.hero1.location === null;
});

// ---------- custom building types + heroStart (schema 0.4.7) ----------
//
// `library.buildingTypes` is an open registry, so a scenario can replace the RtDT four outright.
// Which building a hero starts on then comes from the type's `heroStart` flag rather than the
// literal string 'citadel' — with a fallback to 'citadel' when NOTHING is flagged, which is what
// keeps every pre-0.4.7 document (the golden fixture included) on its original path.

/** The golden fixture with an author-defined building registry replacing the RtDT four. */
function withBuildingTypes(sc, types) {
  sc.library.buildingTypes = types;
  return sc;
}

const watchtowerBoard = () =>
  customBoard({
    locations: [
      { name: 'Emberfall', kingdom: 'north', terrain: 'Ash', building: 'watchtower' },
      { name: 'Saltmere', kingdom: 'north', terrain: 'Lake', building: 'ashen-shrine' },
    ],
  });

check('heroStart: a hero starts on a CUSTOM building type flagged heroStart', () => {
  const sc = withBuildingTypes(withBoard(watchtowerBoard()), {
    watchtower: { heroStart: true, free: [] },
    'ashen-shrine': { free: [] },
  });
  return init(sc).state.heroes.hero1.location === 'Emberfall';
});

check('heroStart: an UNflagged custom type is not a home, even as the only building', () => {
  const sc = withBuildingTypes(withBoard(watchtowerBoard()), {
    watchtower: { free: [] }, // no heroStart anywhere in the map...
    'ashen-shrine': { free: [] },
  });
  // ...so the fallback applies, and neither type is 'citadel' ⇒ no home.
  return init(sc).state.heroes.hero1.location === null;
});

check('heroStart: the flag WINS over a literal citadel on the same board', () => {
  const board = customBoard({
    locations: [
      { name: 'Old Keep', kingdom: 'north', terrain: 'Ash', building: 'citadel' },
      { name: 'Emberfall', kingdom: 'north', terrain: 'Ash', building: 'watchtower' },
    ],
  });
  const sc = withBuildingTypes(withBoard(board), {
    citadel: { free: [] },
    watchtower: { heroStart: true, free: [] },
  });
  return init(sc).state.heroes.hero1.location === 'Emberfall';
});

check('heroStart: FALLBACK — no flag anywhere ⇒ citadel still places heroes (pre-0.4.7)', () => {
  // The compatibility guarantee. The golden fixture's own buildingTypes carry no heroStart, so
  // this is the path every existing document takes.
  const r = init(withBoard(customBoard()), 4);
  const owner = r.state.kingdoms.ownership;
  const at = (k) => r.state.heroes[owner[k]].location;
  return at('north') === 'Emberfall' && at('south') === 'Kingsreach';
});

check('heroStart: flags are matched case-insensitively, like the building values', () => {
  const board = customBoard({
    locations: [{ name: 'Emberfall', kingdom: 'north', terrain: 'Ash', building: 'Watchtower' }],
  });
  const sc = withBuildingTypes(withBoard(board), { watchtower: { heroStart: true, free: [] } });
  return init(sc).state.heroes.hero1.location === 'Emberfall';
});

check('custom types: a custom skullCapacity is what capacityOf reports', () => {
  // capacityOf drives BOTH skull paths (skull.place and emergence), so an authored capacity is
  // honoured at play — the reason 0.4.7 could relax the schema's `const 3`.
  const sc = withBuildingTypes(withBoard(watchtowerBoard()), {
    watchtower: { heroStart: true, skullCapacity: 5, free: [] },
    'ashen-shrine': { free: [] },
  });
  const r = init(sc);
  const b = r.state.buildings.find((x) => x.location === 'Emberfall');
  return b.type === 'watchtower' && r.state._lib.buildingTypes.watchtower.skullCapacity === 5;
});

// ---------- buildings registry ----------

check('boardRef: buildings registry lists every building location, in authored order', () => {
  const r = init(withBoard(customBoard()), 4);
  const locs = r.state.buildings.map((b) => b.location);
  return (
    locs.join(',') === 'Emberfall,Saltmere,Kingsreach,Thornhollow,Gravelrun' &&
    r.state.buildings.every((b) => b.skulls === 0 && b.destroyed === false)
  );
});

check('boardRef: a location with no building is not in the registry', () => {
  const r = init(withBoard(customBoard()), 4);
  return !r.state.buildings.some((b) => b.location === 'Coldwatch');
});

check('boardRef: building types + kingdoms are carried through', () => {
  const r = init(withBoard(customBoard()), 4);
  const saltmere = r.state.buildings.find((b) => b.location === 'Saltmere');
  return saltmere.type === 'bazaar' && saltmere.kingdom === 'north';
});

// ---------- the case trap ----------

check("boardRef: CAPITALIZED building names are matched case-insensitively ('Citadel')", () => {
  // Core spells it 'Citadel'; the Creator schema's enum is lowercase. A board built from either
  // source must place heroes and normalize the registry the same way.
  const board = customBoard({
    locations: [
      { name: 'Emberfall', kingdom: 'north', terrain: 'Ash', building: 'Citadel' },
      { name: 'Saltmere', kingdom: 'north', terrain: 'Lake', building: 'BAZAAR' },
    ],
  });
  const r = init(withBoard(board));
  const types = r.state.buildings.map((b) => b.type).join(',');
  return r.state.heroes.hero1.location === 'Emberfall' && types === 'citadel,bazaar';
});

// ---------- precedence + inertness ----------

check('an inline boardState still wins over a boardRef (pre-0.4.6 documents are untouched)', () => {
  const sc = withBoard(customBoard());
  sc.setup.board = {
    boardState: {
      home: { north: 'Hand-Authored Keep' },
      buildings: [{ kingdom: 'north', type: 'citadel', location: 'Hand-Authored Keep' }],
    },
  };
  const r = init(sc);
  return (
    r.state.heroes.hero1.location === 'Hand-Authored Keep' &&
    r.state.buildings.length === 1 &&
    r.state.buildings[0].location === 'Hand-Authored Keep'
  );
});

check('a DANGLING boardRef falls back to the default (no buildings, no throw)', () => {
  const sc = withBoard(customBoard());
  sc.library.boards = {};
  const r = init(sc);
  return r.state.buildings === undefined && r.state.heroes.hero1.location === null;
});

check('a board with NO locations falls back to the default', () => {
  const sc = withBoard(customBoard({ locations: [] }));
  const r = init(sc);
  return r.state.buildings === undefined && r.state.heroes.hero1.location === null;
});

check('the golden fixture (boardStateRef, no boardRef) is completely unaffected', () => {
  const a = engine.digest(init(golden).state);
  const b = engine.digest(init(clone(golden)).state);
  const untouched = init(golden);
  return (
    a === b &&
    untouched.state.buildings === undefined &&
    untouched.state.heroes.hero1.location === null
  );
});

check('adding an UNREFERENCED library.boards entry does not change the digest', () => {
  // Adjacency/anchors/imageInfo never reach engine state, and an unused board must not either.
  const before = engine.digest(init(golden).state);
  const sc = clone(golden);
  sc.library.boards = { 'shattered-reach': customBoard() };
  return engine.digest(init(sc).state) === before;
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
