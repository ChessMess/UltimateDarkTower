// battle_cards_test.js — the new-format (card-ladder) battle flow (schema 0.4.2): reveal one card
// at a time, spend Advantages to climb a card's improvement ladder, resolve the current step, and
// the adversary's persistent deck / retreat rules. Uses engine.__internals + a self-contained
// ladder library so no fixture is touched. All card text here is original.

const engine = require('../dist/engine');
const { __internals } = engine;
const { makeTestState, startCardBattle, battleCardInput, battleHeroChoiceInput, startBattle } = __internals;

let pass = 0,
  fail = 0;
function check(name, fn) {
  try {
    if (fn()) {
      pass++;
      console.log('PASS  ' + name);
    } else {
      fail++;
      console.log('XXXX  ' + name);
    }
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

const lose = (n, r) => ({ op: 'resource.lose', resource: r || 'warriors', amount: n });
const gain = (n, r) => ({ op: 'resource.gain', resource: r || 'warriors', amount: n });
const scope = (s, effects) => ({ op: 'hero.scope', scope: s, effects });

// A self-contained ladder library. Every regular deck is homogeneous ladder-shape.
function ladderLib() {
  return {
    tokenTypes: {},
    quests: {},
    foes: { grunts: { level: 2 } },
    battleDefs: {
      grunts: {
        cards: [
          { name: 'Jab', advantage: 'Melee', steps: [
            { text: 'lose 3 warriors', effects: [lose(3)] },
            { text: 'lose 1 warrior', effects: [lose(1)] },
            { text: 'no losses' },
          ] },
          { name: 'Feint', advantage: 'Stealth', steps: [
            { text: 'lose 1 warrior', effects: [lose(1)] },
            { text: 'no losses' },
          ] },
          { name: 'Rally', advantage: 'Humanoid', steps: [
            { text: 'lose 2 warriors', effects: [lose(2)] },
            { text: 'no losses' },
          ] },
        ],
      },
      // homogeneous decks used to make draws deterministic (every card identical)
      rally: { cards: [{ name: 'Rally', advantage: 'Humanoid', copies: 2, steps: [
        { text: 'lose 2 warriors', effects: [lose(2)] },
        { text: 'gain 3 warriors', effects: [gain(3)] },
      ] }] },
      onestep: { cards: [{ name: 'Skewer', advantage: 'Melee', critical: true, copies: 2, steps: [
        { text: 'lose 4 warriors', effects: [lose(4)] },
      ] }] },
      critimprove: { cards: [{ name: 'Slash', advantage: 'Beast', critical: true, copies: 2, steps: [
        { text: 'lose 3 warriors', effects: [lose(3)] },
        { text: 'lose 1 warrior', effects: [lose(1)] },
      ] }] },
      doubleloss: { cards: [{ name: 'Rend', advantage: 'Beast', copies: 2, steps: [
        { text: 'lose everything', effects: [lose(100, 'warriors'), lose(100, 'spirit')] },
      ] }] },
      longladder: { cards: [{ name: 'Grind', advantage: 'Melee', copies: 2, steps: [
        { text: 's0', effects: [lose(1)] }, { text: 's1', effects: [lose(1)] },
        { text: 's2', effects: [lose(1)] }, { text: 's3', effects: [lose(1)] },
        { text: 's4', effects: [lose(1)] }, { text: 's5', effects: [lose(1)] },
        { text: 's6', effects: [lose(1)] }, { text: 's7', effects: [lose(1)] },
        { text: 's8', effects: [lose(1)] }, { text: 's9', effects: [lose(1)] },
        { text: 's10', effects: [lose(1)] }, { text: 's11 clear' },
      ] }] },
      // adversary deck: 5 distinct x2 copies = 10, each a 3-step ladder
      boss: {
        cards: [
          { name: 'Ember', advantage: 'Magic', copies: 2, steps: [
            { text: 'lose 4', effects: [lose(4)] }, { text: 'lose 2', effects: [lose(2)] }, { text: 'none' } ] },
          { name: 'Cinder', advantage: 'Beast', copies: 2, steps: [
            { text: 'lose 4', effects: [lose(4)] }, { text: 'lose 2', effects: [lose(2)] }, { text: 'none' } ] },
          { name: 'Ash', advantage: 'Undead', copies: 2, steps: [
            { text: 'lose 4', effects: [lose(4)] }, { text: 'lose 2', effects: [lose(2)] }, { text: 'none' } ] },
          { name: 'Soot', advantage: 'Humanoid', copies: 2, steps: [
            { text: 'lose 4', effects: [lose(4)] }, { text: 'lose 2', effects: [lose(2)] }, { text: 'none' } ] },
          { name: 'Lash', advantage: 'Melee', copies: 2, steps: [
            { text: 'lose 4', effects: [lose(4)] }, { text: 'lose 2', effects: [lose(2)] }, { text: 'none' } ] },
        ],
      },
      // hero.scope decks
      plague: { cards: [{ name: 'Plague', advantage: 'Undead', copies: 2, steps: [
        { text: 'all lose 2', effects: [scope('all', [lose(2)])] },
      ] }] },
      curse: { cards: [{ name: 'Curse', advantage: 'Magic', copies: 2, steps: [
        { text: 'another loses 4', effects: [scope('other', [lose(4)])] },
      ] }] },
      duel: { cards: [{ name: 'Duel', advantage: 'Melee', copies: 2, steps: [
        { text: 'you and another lose 5', effects: [scope('selfAndOther', [lose(5)])] },
      ] }] },
      // legacy strikes deck, to prove the gate still routes to resolveBattle
      legacy: { cards: [{ advantage: 'Melee', strikes: 1 }, { advantage: 'Beast', strikes: 1 }] },
    },
  };
}

function mk(over) {
  const s = makeTestState();
  s._lib = ladderLib();
  return Object.assign(s, over || {});
}
// build a multi-hero state (turnOrder-ordered heroes on the same location/kingdom)
function mkHeroes(n, over) {
  const heroes = {};
  const order = [];
  for (let i = 1; i <= n; i++) {
    const id = 'hero' + i;
    order.push(id);
    heroes[id] = {
      warriors: 10, spirit: 3, corruption: 0, advantages: 6,
      virtues: { active: [], inactive: [] },
      items: { gear: [], treasure: [], potions: [], questItems: [] },
      companions: [], counters: {}, location: 'delmsmire', heroRef: null,
    };
  }
  const s = mk(
    Object.assign(
      {
        heroes,
        clock: Object.assign(makeTestState().clock, { activeHero: 'hero1', turnOrder: order }),
      },
      over || {},
    ),
  );
  return s;
}
const start = (s, args) => {
  startCardBattle(s, [], Object.assign({ isAdversary: false, level: 2 }, args));
};
const bc = (s, v) => battleCardInput(s, [], v);

// ---------- reveal-order determinism ----------
check('same seed ⇒ identical hand + deck order', () => {
  const a = mk();
  const b = mk();
  start(a, { foeId: 'grunts', defId: 'grunts' });
  start(b, { foeId: 'grunts', defId: 'grunts' });
  return (
    JSON.stringify(a.clock.battle.hand) === JSON.stringify(b.clock.battle.hand) &&
    JSON.stringify(a.clock.battle.deck) === JSON.stringify(b.clock.battle.deck)
  );
});

// ---------- reveal + resolve advances the hand ----------
check('reveal→resolve×2 defeats a level-2 foe (done)', () => {
  const s = mk({ heroes: { hero1: Object.assign(makeTestState().heroes.hero1, { warriors: 50 }) } });
  s.foes = [{ instanceId: 'g1', foeId: 'grunts', status: 'ready', location: 'delmsmire' }];
  start(s, { foeId: 'grunts', defId: 'grunts', instanceId: 'g1' });
  bc(s, { reveal: true });
  bc(s, { resolve: true });
  bc(s, { reveal: true });
  const out = bc(s, { resolve: true });
  return out === 'done' && s.clock.battle === null && s.foes.length === 0;
});

// ---------- improve: fullTurn deducts; legacy caps without deducting ----------
check('improve moves step +1 and (fullTurn) deducts 1 Advantage', () => {
  const s = mk({ _setup: { fullTurn: true } });
  start(s, { foeId: 'grunts', defId: 'grunts' });
  bc(s, { reveal: true });
  const before = s.heroes.hero1.advantages;
  bc(s, { improve: true });
  const dc = s.clock.battle.deck[s.clock.battle.hand[0]];
  return dc.step === 1 && s.clock.battle.advantagesSpent === 1 && s.heroes.hero1.advantages === before - 1;
});
check('improve does NOT deduct Advantages in legacy (non-fullTurn) states', () => {
  const s = mk(); // no _setup ⇒ fullTurn falsy
  start(s, { foeId: 'grunts', defId: 'grunts' });
  bc(s, { reveal: true });
  const before = s.heroes.hero1.advantages;
  bc(s, { improve: true });
  return s.clock.battle.advantagesSpent === 1 && s.heroes.hero1.advantages === before;
});

// ---------- critical is presentational: 1-step unimprovable, multi-step improvable ----------
expectFault('improve on a 1-step card faults (unimprovable)', () => {
  const s = mk();
  start(s, { foeId: 'onestep', defId: 'onestep' });
  bc(s, { reveal: true });
  bc(s, { improve: true });
});
check('a multi-step critical card improves normally (critical flag has no rules effect)', () => {
  const s = mk();
  start(s, { foeId: 'critimprove', defId: 'critimprove' });
  bc(s, { reveal: true });
  bc(s, { improve: true });
  return s.clock.battle.deck[s.clock.battle.hand[0]].step === 1;
});

// ---------- resolve applies the CURRENT step's effects ----------
check('resolve at step 0 applies step-0 effects; at step 1 applies step-1', () => {
  const a = mk({ heroes: { hero1: Object.assign(makeTestState().heroes.hero1, { warriors: 7 }) } });
  start(a, { foeId: 'rally', defId: 'rally' });
  bc(a, { reveal: true });
  bc(a, { resolve: true }); // step 0: lose 2 ⇒ 7 → 5
  const b = mk({ _setup: { fullTurn: true }, heroes: { hero1: Object.assign(makeTestState().heroes.hero1, { warriors: 7, advantages: 6 }) } });
  start(b, { foeId: 'rally', defId: 'rally' });
  bc(b, { reveal: true });
  bc(b, { improve: true }); // step 1
  bc(b, { resolve: true }); // step 1: gain 3 ⇒ 7 → 10
  return a.heroes.hero1.warriors === 5 && b.heroes.hero1.warriors === 10;
});

// ---------- corruption shortfall ----------
check('unpayable loss yields exactly 1 corruption', () => {
  const s = mk({ heroes: { hero1: Object.assign(makeTestState().heroes.hero1, { warriors: 0 }) } });
  start(s, { foeId: 'onestep', defId: 'onestep' }); // lose 4 warriors, hero has 0
  bc(s, { reveal: true });
  bc(s, { resolve: true });
  return s.heroes.hero1.corruption === 1;
});
check('a card with two unpayable losses still corrupts a hero only once (FAQ latch)', () => {
  const s = mk({ heroes: { hero1: Object.assign(makeTestState().heroes.hero1, { warriors: 0, spirit: 0 }) } });
  start(s, { foeId: 'doubleloss', defId: 'doubleloss' });
  bc(s, { reveal: true });
  bc(s, { resolve: true });
  return s.heroes.hero1.corruption === 1;
});

// ---------- hero.scope multi-hero targets ----------
check('hero.scope "all" hits every hero deterministically', () => {
  const s = mkHeroes(3);
  start(s, { foeId: 'plague', defId: 'plague', level: 1 });
  bc(s, { reveal: true });
  bc(s, { resolve: true });
  return s.heroes.hero1.warriors === 8 && s.heroes.hero2.warriors === 8 && s.heroes.hero3.warriors === 8;
});
check('hero.scope "other" with >1 candidates prompts, then the pick takes the loss', () => {
  const s = mkHeroes(3);
  start(s, { foeId: 'curse', defId: 'curse', level: 1 });
  bc(s, { reveal: true });
  const out = bc(s, { resolve: true });
  if (out !== 'continue' || !s.clock.battle.pendingHeroChoice) return false;
  battleHeroChoiceInput(s, [], { heroId: 'hero3' });
  return s.heroes.hero1.warriors === 10 && s.heroes.hero2.warriors === 10 && s.heroes.hero3.warriors === 6;
});
check('hero.scope "other" solo (0 others) skips silently, no fault, no loss', () => {
  const s = mkHeroes(1);
  start(s, { foeId: 'curse', defId: 'curse', level: 1 });
  bc(s, { reveal: true });
  const out = bc(s, { resolve: true });
  return out === 'done' && s.heroes.hero1.warriors === 10;
});
check('hero.scope "selfAndOther" auto-resolves with exactly 1 other (both lose)', () => {
  const s = mkHeroes(2);
  start(s, { foeId: 'duel', defId: 'duel', level: 1 });
  bc(s, { reveal: true });
  bc(s, { resolve: true });
  return s.heroes.hero1.warriors === 5 && s.heroes.hero2.warriors === 5;
});

// ---------- adversary: lazy persistent deck + cross-battle improvement + retreat ----------
check('adversary deck is instantiated lazily (10 cards) and reused, not rebuilt', () => {
  const s = mk({ heroes: { hero1: Object.assign(makeTestState().heroes.hero1, { warriors: 500 }) } });
  const before = s.adversary.cardDeck;
  startCardBattle(s, [], { foeId: 'ashstrider', defId: 'boss', isAdversary: true, level: 5 });
  const created = s.adversary.cardDeck;
  s.clock.battle = null;
  startCardBattle(s, [], { foeId: 'ashstrider', defId: 'boss', isAdversary: true, level: 5 });
  return before === undefined && created && created.length === 10 && s.adversary.cardDeck === created;
});
check('adversary improvements persist across a retreat and re-battle', () => {
  const s = mk({ _setup: { fullTurn: true }, heroes: { hero1: Object.assign(makeTestState().heroes.hero1, { warriors: 500, advantages: 6 }) } });
  startCardBattle(s, [], { foeId: 'ashstrider', defId: 'boss', isAdversary: true, level: 5 });
  bc(s, { reveal: true });
  bc(s, { improve: true });
  bc(s, { improve: true }); // active card → step 2
  bc(s, { resolve: true }); // ≥1 resolved ⇒ retreat allowed
  const out = bc(s, { retreat: true });
  const persisted = s.adversary.cardDeck.filter((c) => c.step === 2).length;
  // re-battle: advantagesSpent resets; the improved deck card is still at step 2 somewhere
  startCardBattle(s, [], { foeId: 'ashstrider', defId: 'boss', isAdversary: true, level: 5 });
  return out === 'done' && persisted === 1 && s.clock.battle.advantagesSpent === 0 &&
    s.adversary.cardDeck.filter((c) => c.step === 2).length === 1;
});
expectFault('retreat faults against a regular foe', () => {
  const s = mk();
  start(s, { foeId: 'grunts', defId: 'grunts' });
  bc(s, { reveal: true });
  bc(s, { retreat: true });
});
expectFault('retreat faults from the adversary before resolving ≥1 card', () => {
  const s = mk({ heroes: { hero1: Object.assign(makeTestState().heroes.hero1, { warriors: 500 }) } });
  startCardBattle(s, [], { foeId: 'ashstrider', defId: 'boss', isAdversary: true, level: 5 });
  bc(s, { reveal: true });
  bc(s, { retreat: true });
});

// ---------- advantage cap 10 per battle ----------
check('the 11th improve in a battle faults (cap 10)', () => {
  const s = mk({ _setup: { fullTurn: true }, heroes: { hero1: Object.assign(makeTestState().heroes.hero1, { warriors: 500, advantages: 20 }) } });
  start(s, { foeId: 'longladder', defId: 'longladder', level: 1 });
  bc(s, { reveal: true });
  for (let i = 0; i < 10; i++) bc(s, { improve: true });
  let capped = false;
  try {
    bc(s, { improve: true });
  } catch (e) {
    capped = !!e.isFault;
  }
  return s.clock.battle.advantagesSpent === 10 && capped;
});

// ---------- adversary defeat → win ----------
check('resolving the whole adversary hand wins the game', () => {
  const s = mk({ heroes: { hero1: Object.assign(makeTestState().heroes.hero1, { warriors: 1000 }) } });
  startCardBattle(s, [], { foeId: 'ashstrider', defId: 'boss', isAdversary: true, level: 5 });
  let out;
  for (let i = 0; i < 5; i++) {
    bc(s, { reveal: true });
    out = bc(s, { resolve: true });
  }
  return out === 'terminal' && s.adversary.defeated && s.flags.adversaryDefeated &&
    s.outcome.reason === 'adversary-defeated';
});

// ---------- full-turn heroic reward ----------
check('completing a card battle awards +2 spirit in full-turn scenarios', () => {
  const s = mk({ _setup: { fullTurn: true }, heroes: { hero1: Object.assign(makeTestState().heroes.hero1, { warriors: 500, spirit: 3, advantages: 6 }) } });
  s.foes = [{ instanceId: 'g1', foeId: 'grunts', status: 'ready', location: 'delmsmire' }];
  start(s, { foeId: 'grunts', defId: 'grunts', instanceId: 'g1' });
  bc(s, { reveal: true });
  bc(s, { resolve: true });
  bc(s, { reveal: true });
  bc(s, { resolve: true });
  return s.heroes.hero1.spirit === 5;
});

// ---------- mid-battle checkpoint round-trips to a digest-identical continuation ----------
check('serialize/deserialize mid-battle yields an identical digest and continuation', () => {
  const s = mk({ _setup: { fullTurn: true }, heroes: { hero1: Object.assign(makeTestState().heroes.hero1, { warriors: 50, advantages: 6 }) } });
  start(s, { foeId: 'grunts', defId: 'grunts' });
  bc(s, { reveal: true });
  bc(s, { improve: true });
  const d1 = engine.digest(s);
  const restored = engine.deserialize(engine.serialize(s));
  if (engine.digest(restored) !== d1) return false;
  bc(s, { resolve: true });
  battleCardInput(restored, [], { resolve: true });
  return engine.digest(s) === engine.digest(restored);
});

// ---------- legacy gate: a strikes-shape deck still routes to the legacy flow ----------
check('a legacy strikes battleDef routes to the old flow (no ladder cursor)', () => {
  const s = mk();
  s.foes = [{ instanceId: 'g1', foeId: 'grunts', status: 'ready', location: 'delmsmire' }];
  // point the foe at the legacy deck via battleDefId
  s._lib.foes = { grunts: { level: 2, battleDefId: 'legacy' } };
  startBattle(s, [], { foeId: 'grunts' });
  return s.clock.battle.hand === undefined && Array.isArray(s.clock.battle.cards) && s.clock.battle.cards.length === 2;
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
