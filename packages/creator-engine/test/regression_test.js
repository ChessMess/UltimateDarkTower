// regression_test.js — guards for the code-review bug fixes (engine 0.4.0):
//   A1 serialize/deserialize round-trip + digest(state) === digest(clone(state))
//   A2 full-turn battle deducts spent Advantages from the hero pool
//   A3 a lost/won game is not overwritten by a later win/loss in the same resolution
//   A4 authored building.destroy / skull.place keep the buildings registry in sync
// ...and the post-0.4.0 deferred follow-ups (planning/engine-deferred-followups.md):
//   D1 battle target instanceId disambiguates two same-type foes
//   D2 completeQuest faults on re-entry instead of recursing unboundedly
//   D3 digest hashes load-bearing clock state and ignores load-time refs (ENGINE_VERSION 0.5.0)
// Uses plain Node (no framework), matching the other engine suites.

const engine = require('../dist/engine');
const { golden, goldenFull } = require('../dist/golden-fixture');
const { __internals } = require('../dist/engine');
const { makeTestState, startBattle, resolveBattle, applyOne } = __internals;

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

const act = (choice, args) => ({
  requestId: 'action',
  value: args ? { choice, ...args } : { choice },
  kind: 'decision',
});
const obs = (v) => ({ requestId: 'skullCounter', value: v, kind: 'observed' });
const tgt = (foeId) => ({ requestId: 'target', value: { foeId }, kind: 'decision' });
const adv = (spend) => ({ requestId: 'advantageSpend', value: { spend }, kind: 'decision' });
const bc = (v) => ({ requestId: 'battleCard', value: v, kind: 'decision' });
const mov = (to) => ({ requestId: 'moveTarget', value: { to }, kind: 'decision' });
const hsel = (heroId) => ({ requestId: 'heroSelect', value: { heroId }, kind: 'decision' });
const opts = { seed: 'mvp-runtime-seed', playerCount: 1 };
const clone = (x) => JSON.parse(JSON.stringify(x));

function drive(scenario, o, script) {
  let r = engine.init(scenario, o);
  const results = [r];
  let i = 0,
    guard = 0;
  while (r.status === 'awaitingInput' && guard++ < 500) {
    const req = r.awaiting;
    let input;
    if (req.id === 'skullCounter' && !(i < script.length && script[i].requestId === 'skullCounter'))
      input = obs(0);
    else if (req.id === 'heroSelect' && !(i < script.length && script[i].requestId === 'heroSelect'))
      input = hsel(req.options[0].id);
    else {
      if (i >= script.length) break;
      input = script[i++];
      if (input.requestId !== req.id) throw new Error('script mismatch at ' + i);
    }
    r = engine.step(r.state, input);
    results.push(r);
  }
  return results;
}
const lastOf = (run) => run[run.length - 1];

// goldenFull opens with a lifecycle.selectHero boundary — init and step past it (one pick per seat),
// returning the first post-selection StepResult for tests that assert on immediate post-setup state.
function initPastSelect(scenario, o) {
  let r = engine.init(scenario, o);
  while (r.status === 'awaitingInput' && r.awaiting.id === 'heroSelect') {
    r = engine.step(r.state, hsel(r.awaiting.options[0].id));
  }
  return r;
}

// ---------- A1: serialize/deserialize round-trip (undefined keys) ----------
for (const [name, fx] of [
  ['golden', golden],
  ['goldenFull', goldenFull],
]) {
  const r = engine.init(fx, opts);
  let roundtrips = true;
  let err = '';
  try {
    engine.deserialize(engine.serialize(r.state));
  } catch (e) {
    roundtrips = false;
    err = e.message.slice(0, 80);
  }
  ok('A1: ' + name + ' init state survives serialize→deserialize', roundtrips, err);
  ok(
    'A1: ' + name + ' digest(state) === digest(clone(state))',
    engine.digest(r.state) === engine.digest(clone(r.state)),
  );
}
// the undefined-key case is real: golden lacks a move/dungeon spine, so _spine carries undefined
{
  const r = engine.init(golden, opts);
  ok(
    'A1: golden _spine actually carries undefined (regression is meaningful)',
    r.state._spine.moveEntry === undefined || r.state._spine.dungeonEntry === undefined,
  );
  const blob = engine.serialize(r.state);
  ok('A1: serialized blob contains no bare "undefined" token', blob.indexOf('undefined') === -1);
}

// ---------- A2: full-turn battle deducts spent Advantages ----------
{
  // move onto the brigands' space (Delmsmire), battle, spend 2 Advantages (two improves on the
  // first card = the card-ladder equivalent of the legacy adv(2))
  const run = drive(goldenFull, opts, [
    act('move'), mov('Delmsmire'), act('battle'), tgt('brigands'),
    bc({ reveal: true }), bc({ improve: true }), bc({ improve: true }), bc({ resolve: true }),
    bc({ reveal: true }), bc({ resolve: true }),
  ]);
  const s = lastOf(run).state;
  ok('A2: full-turn card battle deducts 2 Advantages (6 → 4)', s.heroes.hero1.advantages === 4, 'adv=' + s.heroes.hero1.advantages);
}
{
  // legacy (non-full-turn) golden must NOT deduct — its digests/streams are frozen
  const s = makeTestState(); // no _setup.fullTurn
  const before = s.heroes.hero1.advantages;
  startBattle(s, [], { foeId: 'brigands' });
  resolveBattle(s, [], { spend: 2 });
  ok('A2: legacy battle does not deduct Advantages (frozen behavior)', s.heroes.hero1.advantages === before);
}
{
  // full-turn deduction is capped by the 10/action rule and the pool
  const s = makeTestState();
  s._setup = { fullTurn: true };
  s.heroes.hero1.location = 'delmsmire'; // the brigands foe sits here in makeTestState
  s.heroes.hero1.advantages = 50;
  startBattle(s, [], { foeId: 'brigands' });
  resolveBattle(s, [], { spend: 99 });
  ok('A2: full-turn deduction clamps to 10/action', s.heroes.hero1.advantages === 40, 'adv=' + s.heroes.hero1.advantages);
}

// ---------- A3: a decided outcome is not overwritten in the same resolution ----------
{
  // an adversary battle where the LAST card's onResolve drives the hero to a 3rd corruption
  // (loss) must NOT be flipped to a win by the defeat check in the same resolveBattle call.
  // The adversary draws 5 cards (level 5); spending 5 clears all of them.
  const s = makeTestState();
  s.heroes.hero1.corruption = 2; // one more corruption → loss
  s._lib.battleDefs.trap = {
    cards: [
      { advantage: 'Magic', strikes: 1 },
      { advantage: 'Beast', strikes: 1 },
      { advantage: 'Humanoid', strikes: 1 },
      { advantage: 'Melee', strikes: 1 },
      { advantage: 'Undead', strikes: 1, onResolve: [{ op: 'corruption.gain', source: 'trap' }] },
    ],
  };
  s.adversary.foeId = 'trap';
  s.heroes.hero1.advantages = 5;
  startBattle(s, [], { foeId: 'trap', adversary: true }); // adversary path → winGame on defeat
  resolveBattle(s, [], { spend: 5 }); // clears all 5, last onResolve → 3rd corruption → loss
  ok('A3: onResolve loss is not overwritten by the defeat win', s.outcome.status === 'lost', 'status=' + s.outcome.status);
  ok('A3: the overwritten adversary is not falsely marked defeated', s.adversary.defeated !== true);
}
{
  // winGame/loseGame are no-ops once the game is over: a would-be loss cannot un-win a win.
  const s = makeTestState();
  s.heroes.hero1.corruption = 2;
  s.outcome = { status: 'won', reason: 'adversary-defeated' };
  applyOne(s, { op: 'corruption.gain', source: 'x' }); // corruption 2→3 → would loseGame, but guarded
  ok(
    'A3: loseGame is a no-op once the game is already won',
    s.outcome.status === 'won' && s.outcome.reason === 'adversary-defeated',
    'status=' + s.outcome.status + '/' + s.outcome.reason,
  );
}

// ---------- A4: authored building.destroy / skull.place keep the registry in sync ----------
{
  const r = initPastSelect(goldenFull, opts);
  const s = clone(r.state);
  s.outcome = { status: 'running', reason: null };
  const target = s.buildings.find((b) => b.kingdom === 'north' && !b.destroyed);
  ok('A4: precondition — a standing north building exists', !!target);
  const before = s.skulls.supply;
  applyOne(s, { op: 'skull.place', count: 1, kingdom: 'north' });
  const placed = s.buildings.find((b) => b.location === target.location);
  ok('A4: skull.place lands a skull on a standing building', placed.skulls === 1, 'skulls=' + placed.skulls);
  ok('A4: skull.place increments onBoard', s.skulls.onBoard >= 1);
  ok('A4: skull.place draws from supply', s.skulls.supply === before - 1);
}
{
  const r = initPastSelect(goldenFull, opts);
  const s = clone(r.state);
  s.outcome = { status: 'running', reason: null };
  const target = s.buildings.find((b) => b.kingdom === 'north' && !b.destroyed);
  applyOne(s, { op: 'building.destroy', kingdom: 'north', location: target.location });
  const b = s.buildings.find((x) => x.location === target.location);
  ok('A4: building.destroy marks the registry building destroyed', b.destroyed === true);
}

// ---------- D1: battle target instanceId disambiguates two same-type foes ----------
{
  const s = makeTestState();
  s.foes.push({ instanceId: 'foe-2', foeId: 'brigands', status: 'ready', location: 'elsewhere' });
  startBattle(s, [], { foeId: 'brigands', instanceId: 'foe-1' });
  resolveBattle(s, [], { spend: 2 }); // clears both brigands cards (level 2) → defeated
  ok(
    'D1: defeating one instance of a same-type foe leaves the other instance alive',
    s.foes.length === 1 && s.foes[0].instanceId === 'foe-2',
    'foes=' + JSON.stringify(s.foes),
  );
}
{
  const s = makeTestState();
  s.foes.push({ instanceId: 'foe-2', foeId: 'brigands', status: 'ready', location: 'elsewhere' });
  startBattle(s, [], { foeId: 'brigands' }); // no instanceId: legacy fallback behavior
  resolveBattle(s, [], { spend: 2 });
  ok(
    'D1: a legacy target with no instanceId still removes every matching foeId (unchanged fallback)',
    s.foes.length === 0,
  );
}
{
  const s = makeTestState();
  s.foes.push({ instanceId: 'foe-2', foeId: 'brigands', status: 'ready', location: 'elsewhere' });
  startBattle(s, [], { foeId: 'brigands', instanceId: 'foe-1' });
  resolveBattle(s, [], { spend: 0 }); // no spend, both strikes land → not defeated → escalates
  const f1 = s.foes.find((f) => f.instanceId === 'foe-1');
  const f2 = s.foes.find((f) => f.instanceId === 'foe-2');
  ok(
    'D1: an undefeated battle escalates only the targeted instance, not the other same-type foe',
    f1.status === 'savage' && f2.status === 'ready',
  );
}

// ---------- D2: completeQuest faults on re-entry instead of recursing unboundedly ----------
{
  const r = initPastSelect(goldenFull, opts);
  const s = clone(r.state);
  s.outcome = { status: 'running', reason: null };
  // a self-completing quest: its own success outcome re-fires quest.complete on itself
  s._lib.quests['selfQuest'] = {
    outcomes: { success: [{ op: 'quest.complete', questId: 'selfQuest' }] },
  };
  expectFault('D2: a quest whose success outcome completes itself faults (no stack overflow)', () =>
    applyOne(s, { op: 'quest.complete', questId: 'selfQuest' }),
  );
}
{
  const r = initPastSelect(goldenFull, opts);
  const s = clone(r.state);
  s.outcome = { status: 'running', reason: null };
  // an indirect cycle: questA's success completes questB, whose success completes questA back
  s._lib.quests['questA'] = { outcomes: { success: [{ op: 'quest.complete', questId: 'questB' }] } };
  s._lib.quests['questB'] = { outcomes: { success: [{ op: 'quest.complete', questId: 'questA' }] } };
  expectFault('D2: an indirect A→B→A quest-completion cycle also faults', () =>
    applyOne(s, { op: 'quest.complete', questId: 'questA' }),
  );
}
{
  // sanity: two INDEPENDENT quests completing each other in sequence (not a cycle) still succeed
  const r = initPastSelect(goldenFull, opts);
  const s = clone(r.state);
  s.outcome = { status: 'running', reason: null };
  s._lib.quests['questC'] = { outcomes: { success: [] } };
  applyOne(s, { op: 'quest.complete', questId: 'questC' });
  ok(
    'D2: a normal (non-cyclic) quest completion is unaffected by the guard',
    s.quests['questC'] && s.quests['questC'].complete === true,
  );
}

// ---------- D3: digest hashes load-bearing clock state and ignores load-time refs ----------
{
  const r = initPastSelect(goldenFull, opts);
  const before = engine.digest(r.state);
  const s = clone(r.state);
  s.outcome = { status: 'running', reason: null };
  s.heroes.hero1.location = 'Delmsmire'; // full-turn battles require the hero on the foe's space
  startBattle(s, [], { foeId: 'brigands' });
  const midBattle = engine.digest(s);
  ok(
    'D3: digest distinguishes a mid-battle state from the same state before battle started',
    before !== midBattle,
  );
  ok(
    'D3: digest(state) === digest(clone(state)) still holds for a mid-battle state',
    midBattle === engine.digest(clone(s)),
  );
}
{
  const r = initPastSelect(goldenFull, opts);
  const s = clone(r.state);
  s._lib = { mutatedForTest: true }; // a load-time ref: never changes at runtime post-init
  ok(
    'D3: digest ignores load-time refs — mutating _lib does not affect the divergence hash',
    engine.digest(r.state) === engine.digest(s),
  );
}
ok(
  'D3: ENGINE_VERSION bumped for generic decks + reveal/resolve (0.7.0)',
  engine.ENGINE_VERSION === '0.7.0',
);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
