// effects.js — the §4.3 effect-verb instruction set (applyEffect, discriminated on `op`) plus its
// direct helpers: corruption/quest/event bookkeeping, win/loss transitions, deck shuffle/draw, and
// the buildings-registry helpers. Mutates EngineState and pushes directives; never reaches into the
// flow layer (nodes/resume/turn/battle/dungeon). Depends only on core + the engine-local pcg32.

const pcg32 = require('../pcg32');
const { dir, fault } = require('./core');

// ---------- effect verbs (§4.3, MVP subset) ----------
// Each returns nothing; mutates state, pushes directives. Loss-on-3rd-corruption and
// empty-supply checks fire inline exactly where the contract says (§4.3, §4.5).
const FOE_LADDER = ['panicked', 'unsteady', 'ready', 'savage', 'lethal'];

// Deterministic Fisher–Yates using the engine PRNG; advances + reserializes RNG state (§6).
function shuffleInPlace(arr, state) {
  const rng = pcg32.deserialize(state.rng);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = pcg32.nextRange(rng, 0, i);
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  state.rng = pcg32.serialize(rng);
}
function getDeck(state, name) {
  if (!state.decks[name]) state.decks[name] = { draw: [], discard: [] };
  return state.decks[name];
}

// The full §4.3 instruction set, discriminated on `op`. "Mutation" = EngineState change;
// directives are handed to the host. Board-touching verbs update nothing physical here
// (headless) — they emit board.mutate for Board's reducer when it lands (§5.2, §10.5).
function applyEffect(eff, state, directives) {
  const hero = state.heroes[state.clock.activeHero];
  const ui = (delta) => dir(directives, 'ui.update', { delta });
  switch (eff.op) {
    // ----- resources & hero state -----
    case 'resource.gain':
      hero[eff.resource] = (hero[eff.resource] || 0) + eff.amount;
      ui({ hero: state.clock.activeHero, [eff.resource]: hero[eff.resource] });
      break;
    case 'resource.lose': {
      // mandatory; shortfall → util.catch → one corruption
      const short = eff.amount - (hero[eff.resource] || 0);
      hero[eff.resource] = Math.max(0, (hero[eff.resource] || 0) - eff.amount);
      ui({ hero: state.clock.activeHero, [eff.resource]: hero[eff.resource] });
      if (short > 0) gainCorruption(state, directives, 'shortfall');
      break;
    }
    case 'resource.spend': {
      // optional; blocked if unaffordable
      if ((hero[eff.resource] || 0) < eff.amount)
        throw fault('cannot afford resource.spend ' + eff.resource);
      hero[eff.resource] -= eff.amount;
      ui({ hero: state.clock.activeHero, [eff.resource]: hero[eff.resource] });
      break;
    }
    case 'corruption.gain':
      gainCorruption(state, directives, eff.source || 'effect');
      break;
    case 'corruption.remove':
      hero.corruption = eff.all ? 0 : Math.max(0, hero.corruption - (eff.count || 0));
      ui({ hero: state.clock.activeHero, corruption: hero.corruption });
      break;
    case 'virtue.activate': {
      if (hero.virtues.inactive.length === 0) throw fault('no inactive virtue to activate');
      const v =
        eff.virtue && hero.virtues.inactive.includes(eff.virtue)
          ? eff.virtue
          : hero.virtues.inactive[0];
      hero.virtues.inactive = hero.virtues.inactive.filter((x) => x !== v);
      hero.virtues.active.push(v);
      if (!eff.virtue)
        dir(directives, 'ui.prompt', { kind: 'choice', text: 'Activate which virtue?' });
      ui({ hero: state.clock.activeHero, virtues: hero.virtues });
      break;
    }
    case 'virtue.grant':
      hero.virtues.active.push(eff.virtue);
      ui({ hero: state.clock.activeHero, virtues: hero.virtues });
      break;
    case 'item.gain': {
      const bucket = {
        gear: 'gear',
        treasure: 'treasure',
        potion: 'potions',
        questItem: 'questItems',
      }[eff.itemType];
      if (!bucket) throw fault('unknown itemType ' + eff.itemType);
      hero.items[bucket].push(eff.item || eff.itemType + ':' + (hero.items[bucket].length + 1));
      if (eff.from) dir(directives, 'ui.update', { delta: { drew: eff.from } });
      ui({ hero: state.clock.activeHero, items: hero.items });
      break;
    }
    case 'item.enforceLimits': {
      const over =
        hero.items.gear.length > 6 ||
        hero.items.treasure.length > 4 ||
        new Set(hero.items.gear).size !== hero.items.gear.length;
      if (over)
        dir(directives, 'ui.prompt', { kind: 'choice', text: 'Discard to satisfy carry limits' });
      ui({ hero: state.clock.activeHero, items: hero.items });
      break;
    }
    // ----- foes & adversary -----
    case 'foe.spawn':
      state.foes.push({
        instanceId: 'foe-' + (state.foes.length + 1),
        foeId: eff.foeId,
        status: eff.status || 'ready',
        location: eff.location || null,
      });
      dir(directives, 'board.mutate', {
        command: 'spawnFoe',
        args: { foeId: eff.foeId, location: eff.location },
      });
      ui({ foe: eff.foeId });
      break;
    case 'foe.move': {
      const f = state.foes.find((x) => x.foeId === eff.foeId);
      if (f) f.location = eff.to;
      dir(directives, 'board.mutate', {
        command: 'moveFoe',
        args: { foeId: eff.foeId, to: eff.to },
      });
      break;
    }
    case 'foe.remove':
      // an explicit instanceId (set when the battle target was disambiguated, deferred item 1)
      // removes only that instance; otherwise falls back to removing every matching foeId, which
      // is exactly today's behavior for scenarios/streams that never disambiguate.
      state.foes = eff.instanceId
        ? state.foes.filter((x) => x.instanceId !== eff.instanceId)
        : state.foes.filter((x) => x.foeId !== eff.foeId);
      dir(directives, 'board.mutate', { command: 'removeFoe', args: { foeId: eff.foeId } });
      break;
    case 'foe.escalateStatus': {
      const f = eff.instanceId
        ? state.foes.find((x) => x.instanceId === eff.instanceId)
        : state.foes.find((x) => x.foeId === eff.foeId);
      if (f)
        f.status =
          FOE_LADDER[
            Math.min(FOE_LADDER.length - 1, FOE_LADDER.indexOf(f.status) + (eff.steps || 1))
          ];
      ui({ foe: eff.foeId });
      break;
    }
    case 'adversary.spawn':
      state.adversary.spawned = true;
      // the adversary spawns ON the board (rules.md §Completing the Main Goal) — at the authored
      // location, defaulting to the Tower space; heroes must reach it for the final battle.
      state.adversary.location = eff.location || 'the-tower';
      dir(directives, 'board.mutate', {
        command: 'spawnAdversary',
        args: { foeId: state.adversary.foeId, location: state.adversary.location },
      });
      dir(directives, 'tower.program', {
        ops: [{ channel: 'light.named', sequenceId: 'adversaryReveal' }],
      });
      ui({ adversarySpawned: true, adversaryLocation: state.adversary.location });
      raiseEvent(state, directives, 'adversarySpawned');
      break;
    // ----- tokens & counters -----
    case 'token.place':
      state.tokens.push({ tokenTypeId: eff.tokenTypeId, target: eff.target });
      dir(directives, 'board.mutate', {
        command: 'placeToken',
        args: { tokenTypeId: eff.tokenTypeId, target: eff.target },
      });
      break;
    case 'token.counterIncrement': {
      const who = eff.hero || state.clock.activeHero;
      const h = state.heroes[who];
      const key = eff.tokenTypeId;
      h.counters[key] = (h.counters[key] || 0) + (eff.amount || 1);
      ui({ hero: who, counter: key, value: h.counters[key] });
      const cfg = ((state._lib.tokenTypes || {})[eff.tokenTypeId] || {}).threshold;
      if (cfg && h.counters[key] >= cfg.at) {
        h.counters[key] = 0;
        for (const e of cfg.onReach || []) {
          applyEffect(e, state, directives);
          if (state.outcome.status !== 'running') break; // threshold effect ended the game
        }
      }
      break;
    }
    case 'token.remove': {
      const cfg = (state._lib.tokenTypes || {})[eff.tokenTypeId] || {};
      if (cfg.removable === false) throw fault('token ' + eff.tokenTypeId + ' is not removable');
      state.tokens = state.tokens.filter(
        (t) =>
          !(
            t.tokenTypeId === eff.tokenTypeId &&
            JSON.stringify(t.target) === JSON.stringify(eff.target)
          ),
      );
      dir(directives, 'board.mutate', {
        command: 'removeToken',
        args: { tokenTypeId: eff.tokenTypeId, target: eff.target },
      });
      break;
    }
    // ----- hero / board placement -----
    case 'hero.placeOrMove': {
      const heroId = eff.hero || state.clock.activeHero;
      state.heroes[heroId].location = eff.to ?? null;
      dir(directives, 'board.mutate', { command: 'placeHero', args: { hero: heroId, to: eff.to } });
      break;
    }
    case 'board.placeMonument':
      state.monuments.push(eff.location);
      dir(directives, 'board.mutate', {
        command: 'placeMonument',
        args: { location: eff.location },
      });
      break;
    case 'board.placeMarker':
      state.markers.push({ location: eff.location, markerType: eff.markerType });
      dir(directives, 'board.mutate', {
        command: 'placeMarker',
        args: { location: eff.location, markerType: eff.markerType },
      });
      break;
    // ----- skulls & buildings (scenario-determined only; emergence is observed) -----
    case 'skull.place':
      state.skulls.supply -= eff.count;
      if (state.buildings) {
        // registry model: each scenario-placed skull lands on a standing building of the named
        // kingdom (least-loaded first, like emergence), increments onBoard, and destroys the
        // building when its skulls exceed capacity — so authored skulls behave like emergent ones
        // (visible to cleanse, can raze a building). Byte-frozen `golden` has no registry → else.
        for (let i = 0; i < eff.count; i++) {
          const b = pickBuildingForSkull(state, eff.kingdom ? { kingdom: eff.kingdom } : null);
          if (!b) {
            dir(directives, 'board.mutate', { command: 'placeSkull', args: { source: 'effect' } });
            continue;
          }
          b.skulls += 1;
          state.skulls.onBoard = (state.skulls.onBoard || 0) + 1;
          dir(directives, 'board.mutate', {
            command: 'placeSkull',
            args: { source: 'effect', kingdom: b.kingdom, type: b.type, location: b.location },
          });
          if (b.skulls > capacityOf(state, b)) {
            state.skulls.onBoard = Math.max(0, state.skulls.onBoard - b.skulls); // 3 leave, 4th → supply
            b.skulls = 0;
            b.destroyed = true;
            applyEffect(
              { op: 'building.destroy', kingdom: b.kingdom, location: b.location },
              state,
              directives,
            );
            if (state.outcome.status !== 'running') return;
          }
        }
      } else {
        dir(directives, 'ui.prompt', {
          kind: 'choice',
          text: 'Choose building for ' + eff.count + ' skull(s)',
        });
        dir(directives, 'board.mutate', {
          command: 'placeSkull',
          args: { count: eff.count, kingdom: eff.kingdom, chooser: eff.chooser || 'homeOwner' },
        });
      }
      if (state.skulls.supply <= 0) loseGame(state, directives, 'empty-supply');
      break;
    case 'skull.remove':
      state.skulls.supply += eff.count;
      state.skulls.onBoard = Math.max(0, state.skulls.onBoard - eff.count);
      dir(directives, 'board.mutate', { command: 'removeSkull', args: { count: eff.count } });
      ui({ supply: state.skulls.supply });
      break;
    case 'building.destroy': {
      // Registry sync: mark the standing building destroyed and clear its on-board skulls. The
      // emergence + skull.place paths pre-mark the building (destroyed=true, skulls=0) before
      // delegating here, so this stays a no-op for them; a directly-authored destroy on a standing
      // building is the case that previously left the registry out of sync.
      const bd =
        (state.buildings || []).find((x) => x.location === eff.location) ||
        (eff.kingdom
          ? (state.buildings || []).find((x) => x.kingdom === eff.kingdom && !x.destroyed)
          : undefined);
      if (bd && !bd.destroyed) {
        state.skulls.onBoard = Math.max(0, (state.skulls.onBoard || 0) - bd.skulls);
        bd.skulls = 0;
        bd.destroyed = true;
      }
      state.skulls.supply += 1; // the 4th skull returns to supply
      dir(directives, 'board.mutate', {
        command: 'removeBuilding',
        args: { location: eff.location },
      });
      raiseEvent(state, directives, 'buildingDestroyed');
      const kingdom = eff.kingdom;
      const dormant = state.kingdoms.dormant.includes(kingdom);
      // the hero whose home kingdom lost the building gains the corruption (none if dormant)
      if (!dormant)
        gainCorruption(
          state,
          directives,
          'building-destroyed',
          kingdom && state.kingdoms.ownership[kingdom],
        );
      break;
    }
    case 'skull.modifySupply':
      state.skulls.supply += eff.delta;
      ui({ supply: state.skulls.supply });
      break;
    // ----- decks & market -----
    case 'deck.draw': {
      const d = getDeck(state, eff.deck);
      if (d.draw.length === 0)
        throw fault("deck '" + eff.deck + "' empty (explicit deck.reshuffle required, §4.3)");
      const card = d.draw.shift();
      state._lastDraw = card;
      ui({ deck: eff.deck, drew: card });
      break;
    }
    case 'deck.discard': {
      const d = getDeck(state, eff.deck);
      d.discard.push(eff.card || state._lastDraw);
      break;
    }
    case 'deck.reshuffle': {
      const d = getDeck(state, eff.deck);
      d.draw = d.draw.concat(d.discard);
      d.discard = [];
      shuffleInPlace(d.draw, state);
      break;
    }
    case 'market.refresh':
      state.market = eff.cards || ['t1', 't2', 't3', 't4'];
      ui({ market: state.market });
      break;
    case 'market.acquireReplace':
      dir(directives, 'ui.prompt', { kind: 'choice', text: 'Acquire / replace a market card' });
      ui({ market: state.market });
      break;
    // ----- quests & seals & variables -----
    case 'quest.complete':
      completeQuest(state, directives, eff.questId);
      break;
    case 'quest.spawnDungeon':
      state.dungeons[eff.dungeon] = { clearedRooms: [] };
      dir(directives, 'board.mutate', {
        command: 'spawnDungeon',
        args: { quest: eff.quest, dungeon: eff.dungeon },
      });
      break;
    case 'quest.placeMarker':
      state.markers.push({ location: eff.location, markerType: 'quest', quest: eff.quest });
      dir(directives, 'board.mutate', {
        command: 'placeMarker',
        args: { location: eff.location, markerType: 'quest' },
      });
      break;
    case 'seal.remove': {
      const seal = eff.seal || state.sealsRemoved + 1 + '-north'; // engine/scenario/player-chosen (not observed, §3.4)
      state.sealsRemoved += 1;
      if (!state.brokenSeals.includes(seal)) state.brokenSeals.push(seal);
      raiseEvent(state, directives, 'sealRemoved');
      dir(directives, 'tower.program', { ops: [{ channel: 'seal.break', seal }] });
      dir(directives, 'tower.program', {
        brokenSeals: state.brokenSeals.slice(),
        target: 'display',
      }); // app-level seal sidecar (§5.2)
      dir(directives, 'ui.prompt', {
        kind: 'confirm',
        text: 'Physically remove the indicated seal',
      });
      break;
    }
    case 'seal.replace': {
      const seal = eff.seal;
      state.brokenSeals = state.brokenSeals.filter((s) => s !== seal);
      state.sealsRemoved = Math.max(0, state.sealsRemoved - 1);
      dir(directives, 'tower.program', {
        brokenSeals: state.brokenSeals.slice(),
        target: 'display',
      });
      break;
    }
    case 'flag.set':
      state.flags[eff.name] = eff.value;
      break;
    case 'counter.set':
      state.counters[eff.name] = eff.value;
      break;
    default:
      throw fault('unknown effect verb: ' + eff.op + ' (closed set is the 36 of §4.3)');
  }
}

function gainCorruption(state, directives, source, heroId) {
  const who = heroId || state.clock.activeHero;
  const hero = state.heroes[who];
  hero.corruption += 1;
  dir(directives, 'ui.prompt', { kind: 'reveal', text: 'Corruption drawn (' + source + ')' });
  dir(directives, 'ui.update', { delta: { hero: who, corruption: hero.corruption } });
  raiseEvent(state, directives, 'corruptionGained');
  if (hero.corruption >= 3) loseGame(state, directives, 'third-corruption'); // §3.1 / §4.3
}

// Call-stack guard for completeQuest re-entrancy (direct self-reference or an indirect A→B→A
// chain through authored success outcomes). Deliberately NOT stored on EngineState: completeQuest
// is fully synchronous (no await between push and pop), so a module-level stack is sufficient and
// — unlike a state field — never leaks into serialize/digest/clone (§9 byte-identical requirement).
const completingQuests = [];
function completeQuest(state, directives, questId) {
  // fail-at-load philosophy (see planning/engine-deferred-followups.md #2): an authoring bug that
  // re-enters an already-completing quest must fault loudly, not overflow the stack.
  if (completingQuests.includes(questId))
    throw fault('quest.complete re-entered while already completing quest: ' + questId);
  completingQuests.push(questId);
  try {
    state.quests[questId] = { complete: true };
    dir(directives, 'log.entry', { event: 'questComplete', questId });
    raiseEvent(state, directives, 'questComplete');
    // full-turn scenarios apply the quest's authored success outcomes on completion, wherever the
    // completion came from (the quest action, a dungeon's spawning quest, …). Legacy stays inert.
    if (state._setup && state._setup.fullTurn) {
      const qdef = (state._lib.quests || {})[questId];
      for (const e of ((qdef || {}).outcomes || {}).success || []) {
        applyEffect(e, state, directives);
        if (state.outcome.status !== 'running') return;
      }
    }
    // a companion quest grants its companion to the acting hero (rules.md §Monthly Quests)
    for (const cid of Object.keys(state._lib.companions || {})) {
      if ((state._lib.companions[cid] || {}).grantedByQuestId === questId) {
        const hero = state.heroes[state.clock.activeHero];
        if (hero && !hero.companions.includes(cid)) {
          hero.companions.push(cid);
          dir(directives, 'ui.update', {
            delta: { hero: state.clock.activeHero, companions: hero.companions.slice() },
          });
          dir(directives, 'log.entry', { event: 'companionGained', companion: cid });
        }
      }
    }
    const q = (state._lib.quests || {})[questId];
    if (q && q.isMainGoal) {
      state.mainGoalComplete = true;
      raiseEvent(state, directives, 'mainGoalComplete');
      // main-goal completion fires the adversary.spawn path (§4.3)
      applyEffect({ op: 'adversary.spawn' }, state, directives);
    }
  } finally {
    completingQuests.pop();
  }
}

function raiseEvent(state, directives, event) {
  dir(directives, 'log.entry', { event });
  // onState bus: remember raised events until the next end-of-turn boundary consumes them
  // (only when the scenario authors onState triggers — legacy state stays untouched).
  if ((state._triggers || []).some((t) => (t.trigger || {}).on === 'onState')) {
    if (!state.clock.pendingEvents) state.clock.pendingEvents = [];
    if (!state.clock.pendingEvents.includes(event)) state.clock.pendingEvents.push(event);
  }
}

// Once the game is decided (won/lost/ended), the first outcome stands: a later win/loss check
// within the same resolution must not overwrite it (§9 — terminal is terminal).
function loseGame(state, directives, reason) {
  if (state.outcome.status !== 'running') return;
  state.outcome = { status: 'lost', reason };
  dir(directives, 'log.entry', { event: 'gameLost', reason });
}
function winGame(state, directives, reason) {
  if (state.outcome.status !== 'running') return;
  state.outcome = { status: 'won', reason };
  dir(directives, 'log.entry', { event: 'gameWon', reason });
}

// ---------- buildings registry helpers (used by applyEffect + the observed-skull resume path) ----------
function buildingAt(state, location) {
  return (state.buildings || []).find((b) => b.location === location);
}
function capacityOf(state, b) {
  const def = (state._lib.buildingTypes || {})[b.type];
  return (def && def.skullCapacity) || 3; // 3 sit, the 4th destroys (schema-pinned)
}
// Resolve where an emergent skull lands: the observed placement if given, else a deterministic
// spread over standing buildings of ACTIVE kingdoms (dormant kingdoms redirect — schema
// dormantKingdoms.skullRedirect "nearestActive"): least-loaded first, registry order tie-break.
function pickBuildingForSkull(state, placement) {
  if (placement) {
    const b = (state.buildings || []).find(
      (x) =>
        !x.destroyed &&
        x.kingdom === placement.kingdom &&
        (placement.type ? x.type === placement.type : true) &&
        (placement.location ? x.location === placement.location : true),
    );
    if (!b) throw fault('skull placement names no standing building: ' + JSON.stringify(placement));
    return b;
  }
  const dormant = state.kingdoms.dormant || [];
  const candidates = (state.buildings || []).filter(
    (b) => !b.destroyed && !dormant.includes(b.kingdom),
  );
  if (!candidates.length) return null;
  return candidates.reduce((best, b) => (b.skulls < best.skulls ? b : best), candidates[0]);
}

module.exports = {
  FOE_LADDER,
  shuffleInPlace,
  getDeck,
  applyEffect,
  gainCorruption,
  completeQuest,
  raiseEvent,
  loseGame,
  winGame,
  buildingAt,
  capacityOf,
  pickBuildingForSkull,
};
