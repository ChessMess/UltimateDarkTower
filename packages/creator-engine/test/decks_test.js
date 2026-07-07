// decks_test.js — generic library.decks support (engine 0.7.0 / schema 0.4.3):
//   - init seeds state.decks draw piles in AUTHORED order (copies expanded), NEVER shuffling at init
//     (correction C1): init leaves the PRNG identical whether or not library.decks is present.
//   - deck.draw reveal → a fire-and-forget cardDraw ui.prompt carrying resourceKeys, NEVER data URLs
//     (headless proof); resolve → applies the drawn card's own effects with a terminal early-out.
//   - deck.reshuffle is seed-deterministic; the empty-deck fault contract is unchanged.
//   - emitBattlePrompt passes through per-card artRef + deck-level appearance ONLY when authored, so
//     an unadorned (legacy) deck's payload is byte-identical (no such keys).
// Uses engine.__internals + self-contained libraries + a cloned `golden` (never mutating the frozen
// fixture). Plain Node, matching the other engine suites. All card text here is original.

const engine = require('../dist/engine');
const { golden } = require('../dist/golden-fixture');
const { __internals } = engine;
const { makeTestState, applyEffect, startCardBattle } = __internals;

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
    ok(name, !!fn());
  } catch (e) {
    fail++;
    console.log('XXXX  ' + name + '  — threw: ' + e.message);
  }
}
function expectFault(name, fn) {
  try {
    fn();
    fail++;
    console.log('XXXX  ' + name + '  — expected fault');
  } catch (e) {
    if (e.isFault) {
      pass++;
      console.log('PASS  ' + name);
    } else {
      fail++;
      console.log('XXXX  ' + name + '  — wrong error: ' + e.message);
    }
  }
}

const gain = (n, r) => ({ op: 'resource.gain', resource: r || 'warriors', amount: n });
const lose = (n, r) => ({ op: 'resource.lose', resource: r || 'warriors', amount: n });

// ---- seeding at init (C1: authored order, copies expanded, no shuffle) ----

function goldenWithDecks() {
  const c = JSON.parse(JSON.stringify(golden));
  c.library.cards = {
    'azkol-crown': {
      id: 'azkol-crown',
      name: 'Crown of Azkol',
      type: 'treasure',
      effects: [gain(2, 'spirit')],
    },
    'azkol-chalice': {
      id: 'azkol-chalice',
      name: 'Chalice of Azkol',
      type: 'treasure',
      effects: [gain(1, 'warriors')],
    },
  };
  c.library.decks = {
    'azkol-treasures': {
      category: 'treasure',
      cards: [
        { cardId: 'azkol-crown', copies: 2 },
        { cardId: 'azkol-chalice', copies: 3 },
      ],
    },
  };
  return c;
}

const OPTS = { seed: 'decks-suite-seed', playerCount: 1 };
const bare = engine.init(golden, OPTS);
const seeded = engine.init(goldenWithDecks(), OPTS);

ok(
  'init seeds the draw pile in AUTHORED order with copies expanded',
  JSON.stringify(seeded.state.decks['azkol-treasures'].draw) ===
    JSON.stringify([
      'azkol-crown',
      'azkol-crown',
      'azkol-chalice',
      'azkol-chalice',
      'azkol-chalice',
    ]),
);
ok(
  'init leaves the PRNG state identical whether or not library.decks is present (no shuffle at init, C1)',
  JSON.stringify(bare.state.rng) === JSON.stringify(seeded.state.rng),
);
ok(
  'a scenario with no library.decks seeds an empty decks map (legacy byte-identical)',
  Object.keys(bare.state.decks).length === 0,
);

// ---- deck.reshuffle: seed-deterministic + membership-preserving ----

function drawAllAfterReshuffle() {
  const s = makeTestState();
  s._lib = { cards: {}, decks: {} };
  s.decks = { d: { draw: ['a', 'b', 'c', 'd', 'e'], discard: [] } };
  applyEffect({ op: 'deck.reshuffle', deck: 'd' }, s, []);
  return s.decks.d.draw.slice();
}
const reshuffleA = drawAllAfterReshuffle();
const reshuffleB = drawAllAfterReshuffle();
ok(
  'deck.reshuffle is deterministic for a fixed seed',
  JSON.stringify(reshuffleA) === JSON.stringify(reshuffleB),
);
ok(
  'deck.reshuffle preserves membership (all cards still present)',
  reshuffleA.slice().sort().join(',') === 'a,b,c,d,e',
);

// ---- empty-deck fault contract unchanged ----

expectFault('deck.draw on an empty pile faults (explicit reshuffle required, §4.3)', () => {
  const s = makeTestState();
  s._lib = { cards: {}, decks: {} };
  s.decks = { d: { draw: [], discard: [] } };
  applyEffect({ op: 'deck.draw', deck: 'd' }, s, []);
});

// ---- reveal: cardDraw prompt carries resourceKeys, NEVER data URLs (headless proof) ----

function treasureLib() {
  return {
    resources: {
      // a real data URL lives in the library, but the engine must never surface it in a directive
      images: { 'art-crown': 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' },
    },
    cards: {
      crown: {
        id: 'crown',
        name: 'Crown of Azkol',
        type: 'treasure',
        description: 'Gain 2 spirit.',
        flavor: 'Cold gold, colder history.',
        artRef: 'art-crown',
        effects: [gain(2, 'spirit')],
      },
    },
    decks: {
      treasure: {
        category: 'treasure',
        cards: [{ cardId: 'crown', copies: 1 }],
        appearance: { backRef: 'deck-back', template: 'fullArt', accent: '#c77dff' },
      },
    },
  };
}

check('deck.draw reveal emits a cardDraw ui.prompt carrying resourceKeys', () => {
  const s = makeTestState();
  s._lib = treasureLib();
  s.decks = { treasure: { draw: ['crown'], discard: [] } };
  const dirs = [];
  applyEffect({ op: 'deck.draw', deck: 'treasure', reveal: true }, s, dirs);
  const prompt = dirs.find((d) => d.type === 'ui.prompt' && d.kind === 'cardDraw');
  return (
    !!prompt &&
    prompt.card.cardId === 'crown' &&
    prompt.card.name === 'Crown of Azkol' &&
    prompt.card.artRef === 'art-crown' &&
    prompt.card.appearance.backRef === 'deck-back' &&
    prompt.card.appearance.template === 'fullArt'
  );
});

check('a reveal directive stream contains NO data: URLs (engine stays headless)', () => {
  const s = makeTestState();
  s._lib = treasureLib();
  s.decks = { treasure: { draw: ['crown'], discard: [] } };
  const dirs = [];
  applyEffect({ op: 'deck.draw', deck: 'treasure', reveal: true, resolve: true }, s, dirs);
  return JSON.stringify(dirs).indexOf('data:') === -1;
});

// ---- resolve: applies the drawn card's own effects, with a terminal early-out ----

check('deck.draw resolve applies the drawn card own effects', () => {
  const s = makeTestState();
  const before = s.heroes.hero1.spirit;
  s._lib = {
    cards: { crown: { id: 'crown', name: 'Crown', type: 'treasure', effects: [gain(2, 'spirit')] } },
    decks: {},
  };
  s.decks = { treasure: { draw: ['crown'], discard: [] } };
  applyEffect({ op: 'deck.draw', deck: 'treasure', resolve: true }, s, []);
  return s.heroes.hero1.spirit === before + 2;
});

check('deck.draw resolve stops applying effects once the game ends (terminal early-out)', () => {
  const s = makeTestState();
  const beforeWarriors = s.heroes.hero1.warriors;
  s._lib = {
    cards: {
      cursed: {
        id: 'cursed',
        name: 'Cursed Relic',
        type: 'treasure',
        // the 3rd corruption ends the game; the trailing gain must NOT apply
        effects: [
          { op: 'corruption.gain', source: 'a' },
          { op: 'corruption.gain', source: 'b' },
          { op: 'corruption.gain', source: 'c' },
          gain(999, 'warriors'),
        ],
      },
    },
    decks: {},
  };
  s.decks = { treasure: { draw: ['cursed'], discard: [] } };
  applyEffect({ op: 'deck.draw', deck: 'treasure', resolve: true }, s, []);
  return s.outcome.status === 'lost' && s.heroes.hero1.warriors === beforeWarriors;
});

expectFault('deck.draw resolve recursion terminates via the empty-deck fault', () => {
  const s = makeTestState();
  s._lib = {
    cards: {
      // resolving this card draws again from the same 1-card pile → second draw hits empty → fault
      loop: {
        id: 'loop',
        name: 'Loop',
        type: 'treasure',
        effects: [{ op: 'deck.draw', deck: 'd', resolve: true }],
      },
    },
    decks: {},
  };
  s.decks = { d: { draw: ['loop'], discard: [] } };
  applyEffect({ op: 'deck.draw', deck: 'd', resolve: true }, s, []);
});

// ---- battle prompt passthrough: appearance + artRef only when authored ----

function ladderLib() {
  return {
    foes: { grunts: { level: 2 }, plain: { level: 1 } },
    battleDefs: {
      grunts: {
        appearance: { backRef: 'grunt-back', template: 'classic', accent: '#e94560' },
        cards: [
          {
            name: 'Jab',
            advantage: 'Melee',
            artRef: 'art-jab',
            steps: [{ text: 'lose 1 warrior', effects: [lose(1)] }, { text: 'no losses' }],
          },
          {
            name: 'Feint',
            advantage: 'Stealth',
            steps: [{ text: 'lose 1 warrior', effects: [lose(1)] }, { text: 'no losses' }],
          },
        ],
      },
      plain: {
        cards: [
          {
            name: 'Bash',
            advantage: 'Melee',
            steps: [{ text: 'lose 1 warrior', effects: [lose(1)] }, { text: 'no losses' }],
          },
        ],
      },
    },
  };
}

check('emitBattlePrompt surfaces deck appearance + per-card artRef for an adorned ladder deck', () => {
  const s = makeTestState();
  s._lib = ladderLib();
  const dirs = [];
  startCardBattle(s, dirs, { foeId: 'grunts', defId: 'grunts', isAdversary: false, level: 2 });
  const prompt = dirs.find((d) => d.type === 'ui.prompt' && d.kind === 'battleCard');
  return (
    !!prompt &&
    !!prompt.battle.appearance &&
    prompt.battle.appearance.backRef === 'grunt-back' &&
    prompt.battle.cards.some((c) => c.artRef === 'art-jab')
  );
});

check('emitBattlePrompt for an unadorned deck has NO appearance and NO card artRef keys (legacy byte-identical)', () => {
  const s = makeTestState();
  s._lib = ladderLib();
  const dirs = [];
  startCardBattle(s, dirs, { foeId: 'plain', defId: 'plain', isAdversary: false, level: 1 });
  const prompt = dirs.find((d) => d.type === 'ui.prompt' && d.kind === 'battleCard');
  return (
    !!prompt &&
    !('appearance' in prompt.battle) &&
    prompt.battle.cards.every((c) => !('artRef' in c))
  );
});

// ---- goldenFull vault treasury: an E-then-S walk draws + resolves a treasure (room deck.draw) ----

const { goldenFull } = require('../dist/golden-fixture');
const hsel = (heroId) => ({ requestId: 'heroSelect', value: { heroId }, kind: 'decision' });
const act = (choice) => ({ requestId: 'action', value: { choice }, kind: 'decision' });
const obs0 = { requestId: 'skullCounter', value: 0, kind: 'observed' };
const dimp = (improve) => ({ requestId: 'dungeonRoomAdvantage', value: { improve }, kind: 'decision' });
const dmove = (direction) => ({ requestId: 'dungeonMove', value: { direction }, kind: 'decision' });

// step through a decision script, auto-answering skullCounter (obs 0) and heroSelect (first offered)
function drive(scenario, o, script) {
  let r = engine.init(scenario, o);
  const results = [r];
  let i = 0,
    guard = 0;
  while (r.status === 'awaitingInput' && guard++ < 500) {
    const req = r.awaiting;
    let input;
    if (req.id === 'skullCounter' && !(i < script.length && script[i].requestId === 'skullCounter')) {
      input = obs0;
    } else if (req.id === 'heroSelect' && !(i < script.length && script[i].requestId === 'heroSelect')) {
      input = hsel(req.options[0].id);
    } else {
      if (i >= script.length) break;
      input = script[i++];
    }
    r = engine.step(r.state, input);
    results.push(r);
  }
  return results;
}

const vaultRun = drive(
  goldenFull,
  { seed: 'mvp-runtime-seed', playerCount: 1 },
  [act('dungeon'), dimp(false), dmove('E'), dmove('S')],
);
let drawIdx = -1;
let drawPrompt = null;
for (let i = 0; i < vaultRun.length; i++) {
  const p = (vaultRun[i].directives || []).find(
    (d) => d.type === 'ui.prompt' && d.kind === 'cardDraw',
  );
  if (p) {
    drawIdx = i;
    drawPrompt = p;
    break;
  }
}
ok('goldenFull vault treasury (walk E then S) emits a cardDraw prompt', !!drawPrompt);
check("the drawn treasure's resource delta lands on the hero (reveal+resolve room event)", () => {
  if (!drawPrompt) return false;
  const card = goldenFull.library.cards[drawPrompt.card.cardId];
  if (!card) return false;
  const before = vaultRun[drawIdx - 1].state.heroes.hero1;
  const after = vaultRun[drawIdx].state.heroes.hero1;
  const exp = { warriors: 0, spirit: 0 };
  for (const e of card.effects || []) if (e.op === 'resource.gain') exp[e.resource] += e.amount;
  return (
    after.warriors - before.warriors === exp.warriors &&
    after.spirit - before.spirit === exp.spirit
  );
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
