// battle.js — the battle subflow (§4 row 157): draw cards = foe level from the authored battleDef,
// spend Advantages, fire cleared cards' onResolve, tally strikes as warrior loss, then defeat/escalate
// (the adversary banks Advantages and may retreat). Depends on core, effects, and turn (heroic reward).

const { dir, fault } = require('./core');
const { applyEffect, winGame, raiseEvent, shuffleInPlace } = require('./effects');
const { awardHeroic } = require('./turn');

// ---------- battle subflow (§4 row 157; runs on AUTHORED battleDefs.cards, §389.3) ----------
// startBattle: select foe → draw cards = foe level (2–4; adversary 5) from the authored battleDef.
function startBattle(state, directives, sel) {
  const isAdversary = sel.foeId === state.adversary.foeId || sel.adversary === true;
  const foeId = isAdversary ? state.adversary.foeId : sel.foeId;
  const def = (state._lib.battleDefs || {})[foeId];
  // a battle with no authored cards would "clear" instantly (0 of 0) — fail loudly instead
  if (!def || !(def.cards || []).length)
    throw fault("foe '" + foeId + "' has no authored battleDef cards");
  // Resolve which specific foe instance is targeted: honor an explicit sel.instanceId (so two
  // same-type foes can be fought independently — deferred item 1), falling back to the first
  // matching foeId for legacy/compact input streams that don't disambiguate. This preserves
  // current behavior exactly when there's at most one foe per type (e.g. golden/goldenFull).
  const targetFoe = isAdversary
    ? null
    : sel.instanceId
      ? state.foes.find((f) => f.instanceId === sel.instanceId && f.foeId === foeId)
      : state.foes.find((f) => f.foeId === foeId);
  if (state._setup && state._setup.fullTurn) {
    // rules.md §Battle: you battle a foe ON YOUR SPACE; the adversary must be reached on the board.
    const hero = state.heroes[state.clock.activeHero];
    if (isAdversary) {
      if (!state.adversary.spawned)
        throw fault('battle: the adversary has not spawned (complete the main goal first)');
      if (state.adversary.location !== hero.location)
        throw fault(
          'battle: the adversary is at ' + state.adversary.location + ', not on your space',
        );
    } else if (!targetFoe || targetFoe.location !== hero.location) {
      throw fault('battle: no ' + foeId + ' on your space (' + (hero.location || 'nowhere') + ')');
    }
  }
  // level = cards drawn (rules): adversary 5; foes by selection tier (tier1→2, tier2→3, tier3→4);
  // the _lib.foes level read remains as the fallback for direct __internals test states.
  const level = isAdversary
    ? 5
    : ((state._setup || {}).foeTiers || {})[foeId] ||
      ((state._lib.foes || {})[foeId] || {}).level ||
      2;
  // draw `level` cards deterministically from the authored card pool (cycle if fewer)
  const pool = def.cards.slice();
  shuffleInPlace(pool, state);
  const cards = [];
  for (let i = 0; i < level && pool.length; i++) cards.push(pool[i % pool.length]);
  // Only carry instanceId forward when the caller explicitly disambiguated: `targetFoe` above also
  // resolves a bare foeId to its first match (for the fullTurn location check), but silently
  // switching foe.remove/foe.escalateStatus to single-instance semantics for callers who never
  // asked for it would change today's remove-all-matching behavior wherever >1 foe of a type
  // exists. Legacy/compact callers keep exactly that behavior; only an explicit sel.instanceId
  // narrows the later verbs to one instance.
  const resolvedInstanceId = sel.instanceId && targetFoe ? targetFoe.instanceId : undefined;
  state.clock.battle = {
    foeId,
    instanceId: resolvedInstanceId,
    isAdversary,
    level,
    cards,
    resolved: 0,
  };
  dir(directives, 'tower.program', { ops: [{ channel: 'sound', category: 'Battle' }] });
  dir(directives, 'ui.prompt', {
    kind: 'advantageSpend',
    text: 'Spend Advantages (≤10) or retreat',
    cards: cards.length,
  });
}

// resolveBattle: apply spent Advantages (capped 10/action and by the hero pool), fire each cleared
// card's onResolve, tally remaining strikes as warrior loss, then defeat / escalate. The adversary
// banks applied Advantages across battles (cumulative) and allows retreat after ≥1 card.
function resolveBattle(state, directives, decision) {
  const b = state.clock.battle;
  if (!b) throw fault('resolveBattle with no active battle');
  const hero = state.heroes[state.clock.activeHero];
  if (decision.retreat) {
    // retreat after ≥1 card; foe survives, adversary keeps banked Advantages
    state.clock.battle = null;
    dir(directives, 'log.entry', { event: 'retreat', foeId: b.foeId });
    return;
  }
  const spend = Math.min(decision.spend | 0, 10, hero.advantages | 0); // ≤10/action, no undo
  // Full-turn scenarios deduct the spent Advantages from the hero's pool (rules.md §Battle: spent
  // Advantages are gone). Legacy scenarios keep the frozen no-deduct behavior so `golden` and the
  // __internals verb states stay byte-identical.
  if (state._setup && state._setup.fullTurn && spend > 0) {
    hero.advantages -= spend;
    dir(directives, 'ui.update', {
      delta: { hero: state.clock.activeHero, advantages: hero.advantages },
    });
  }
  let pool = spend + (b.isAdversary ? state.adversary.advantagesBanked || 0 : 0);
  let remainingStrikes = 0,
    cleared = 0;
  for (const card of b.cards) {
    let s = card.strikes || 0;
    if (!card.critical) {
      const use = Math.min(pool, s);
      pool -= use;
      s -= use;
    }
    if (s === 0) {
      cleared++;
      for (const e of card.onResolve || []) {
        applyEffect(e, state, directives);
        if (state.outcome.status !== 'running') break; // a card's onResolve ended the game
      }
    }
    remainingStrikes += s;
    if (state.outcome.status !== 'running') break;
  }
  if (b.isAdversary)
    state.adversary.advantagesBanked = (state.adversary.advantagesBanked || 0) + spend; // persists
  // if an onResolve effect already decided the game, do not run the strike/defeat tail on top of it
  if (state.outcome.status !== 'running') {
    state.clock.battle = null;
    return;
  }
  if (remainingStrikes > 0)
    applyEffect(
      { op: 'resource.lose', resource: 'warriors', amount: remainingStrikes },
      state,
      directives,
    );
  if (state.outcome.status !== 'running') {
    // warrior-loss shortfall drove a corruption loss — don't overwrite it with a defeat win
    state.clock.battle = null;
    return;
  }
  const defeated = cleared === b.cards.length;
  dir(directives, 'ui.update', {
    delta: { battle: { foeId: b.foeId, cleared, remainingStrikes, defeated } },
  });
  if (defeated) {
    if (b.isAdversary) {
      state.adversary.defeated = true;
      state.flags.adversaryDefeated = true;
      dir(directives, 'board.mutate', { command: 'removeFoe', args: { adversary: true } });
      raiseEvent(state, directives, 'foeDefeated');
      winGame(state, directives, 'adversary-defeated');
    } else {
      applyEffect({ op: 'foe.remove', foeId: b.foeId, instanceId: b.instanceId }, state, directives);
    }
  } else if (state.outcome.status === 'running') {
    applyEffect(
      { op: 'foe.escalateStatus', foeId: b.foeId, instanceId: b.instanceId },
      state,
      directives,
    );
  }
  // full turn: the battle heroic action is complete (all cards resolved) → +2 spirit (rules.md §100)
  if (state._setup && state._setup.fullTurn && state.outcome.status === 'running')
    awardHeroic(state, directives);
  state.clock.battle = null;
}

module.exports = { startBattle, resolveBattle };
