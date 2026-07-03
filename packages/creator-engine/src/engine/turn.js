// turn.js — turn-structure bookkeeping: the per-turn latches, the full-turn heroic-action latch +
// reward (rules.md §Heroic Actions), end-of-turn event collection, clockwise seat rotation, the
// action performer (§5.1 choice), and the atomic TradeAsset transfer (§10.9). Depends on core,
// conditions, and effects; never reaches into nodes/resume/battle/dungeon.

const { dir, fault } = require('./core');
const { evalCondition } = require('./conditions');
const { applyEffect, completeQuest, buildingAt } = require('./effects');

function resetLatches(state) {
  state.clock.latches = {
    bannerUsed: false,
    moveUsed: false,
    heroicActionUsed: false,
    reinforceUsed: false,
    tradeUsed: false,
    itemLock: false,
  };
}

// ---- full-turn heroic-action bookkeeping (rules.md §Heroic Actions) ----
// ONE heroic action per turn; completing one awards 2 spirit. The latch is taken when the heroic
// action starts (battle/dungeon subflow entry, quest/cleanse resolution); the reward fires on
// completion (a retreat abandons the battle heroic action and forfeits the reward).
function markHeroic(state) {
  if (state.clock.latches.heroicActionUsed) throw fault('heroic action already used this turn');
  state.clock.latches.heroicActionUsed = true;
}
function awardHeroic(state, directives) {
  applyEffect({ op: 'resource.gain', resource: 'spirit', amount: 2 }, state, directives);
  dir(directives, 'log.entry', { event: 'heroicActionComplete', hero: state.clock.activeHero });
}
// End-of-turn event triggers (rules.md §Events): schedule triggers match the clock; onState
// triggers match events raised since the last boundary. Order is graph order (deterministic).
function collectDueEvents(state) {
  const due = [];
  const pend = state.clock.pendingEvents || [];
  for (const t of state._triggers || []) {
    const tr = t.trigger || {};
    if (tr.on === 'schedule') {
      const m = state.clock.month,
        turn = state.clock.turnInMonth;
      let fire = false;
      if (tr.month != null && tr.turn != null) fire = m === tr.month && turn === tr.turn;
      else if (tr.month != null) fire = m === tr.month && turn === 1;
      else if (tr.turn != null) fire = turn === tr.turn;
      else if (tr.everyNTurns != null) fire = (state.clock.globalTurn || 0) % tr.everyNTurns === 0;
      if (fire && t.next) due.push(t.next);
    } else if (tr.on === 'onState') {
      if (tr.event && pend.includes(tr.event) && t.next) due.push(t.next);
    }
  }
  state.clock.pendingEvents = [];
  return due;
}

// End Turn (§4.5 step 5 / catalog §132 "advances clockwise turn order"): hand the active seat to the
// next hero clockwise. Single-hero games are a no-op, which keeps 1P digests byte-stable. Continuous
// rotation also satisfies catalog §107 (months 2+ begin with the player left of last month's final
// player): after the final turn of a month the seat has already advanced one step, so recording it as
// firstPlayerOfMonth at the next Start Month yields exactly "left of last month's final player".
function rotateActiveHero(state) {
  const order = state.clock.turnOrder || [];
  if (order.length <= 1) return;
  const idx = order.indexOf(state.clock.activeHero);
  state.clock.activeHero = order[(idx + 1 + order.length) % order.length];
}

// ---------- action performer (§5.1 choice) ----------
function performAction(choice, state, directives, args) {
  const full = state._setup && state._setup.fullTurn;
  const a = args || {};
  switch (choice) {
    case 'quest': {
      if (full) {
        // rules.md §Completing a Quest: be at the quest's location and meet its requirements;
        // success applies the authored outcomes, completes the quest, and pays the heroic reward.
        markHeroic(state);
        const questId = a.questId;
        if (!questId) throw fault('quest action requires a questId (full-turn protocol)');
        const q = (state._lib.quests || {})[questId];
        if (!q) throw fault('unknown quest: ' + questId);
        if ((state.quests[questId] || {}).complete)
          throw fault('quest already complete: ' + questId);
        if (
          (state._setup.monthlyQuestIds || []).includes(questId) &&
          !(state.activeQuests || []).some((x) => x.questId === questId)
        )
          throw fault('monthly quest is not currently active: ' + questId);
        for (const r of q.requirements || [])
          if (!evalCondition(r.condition, state))
            throw fault('quest requirement not met: ' + (r.label || questId));
        completeQuest(state, directives, questId); // applies the authored success outcomes (full-turn)
        if (state.outcome.status !== 'running') return;
        awardHeroic(state, directives);
        break;
      }
      // legacy: advance the main goal; complete it when progress hits the threshold
      state.counters.goalProgress = (state.counters.goalProgress || 0) + 1;
      dir(directives, 'ui.update', { delta: { goalProgress: state.counters.goalProgress } });
      if (state.counters.goalProgress >= state._setup.goalThreshold && !state.mainGoalComplete) {
        completeQuest(state, directives, state._setup.mainGoalId);
      }
      break;
    }
    case 'cleanse': {
      if (full) {
        // rules.md §Heroic Actions A: remove ALL skulls from the building on your space,
        // returning them to the supply (cannot cleanse a space without skulls).
        markHeroic(state);
        const hero = state.heroes[state.clock.activeHero];
        const b = buildingAt(state, hero.location);
        if (!b || b.destroyed)
          throw fault('cleanse: no standing building at ' + (hero.location || '(nowhere)'));
        if (b.skulls <= 0) throw fault('cleanse: no skulls on the building at ' + hero.location);
        const removed = b.skulls;
        b.skulls = 0;
        state.skulls.supply += removed;
        state.skulls.onBoard = Math.max(0, state.skulls.onBoard - removed);
        dir(directives, 'board.mutate', {
          command: 'removeSkull',
          args: { count: removed, location: b.location },
        });
        dir(directives, 'ui.update', { delta: { supply: state.skulls.supply } });
        awardHeroic(state, directives);
        break;
      }
      applyEffect({ op: 'corruption.remove', count: 1 }, state, directives);
      break;
    }
    case 'reinforce': {
      // once per turn (§4.1 latch)
      if (state.clock.latches.reinforceUsed) throw fault('reinforce already used this turn');
      state.clock.latches.reinforceUsed = true;
      if (full) {
        // rules.md §Reinforce / buildings.md: use the building on your space — its free effect,
        // or the enhanced effect after paying the spirit cost ({ enhanced: true } in the decision).
        const hero = state.heroes[state.clock.activeHero];
        const b = buildingAt(state, hero.location);
        if (!b) throw fault('reinforce: no building at ' + (hero.location || '(nowhere)'));
        if (b.destroyed)
          throw fault('reinforce: the building at ' + hero.location + ' is destroyed');
        const def = (state._lib.buildingTypes || {})[b.type];
        if (!def) throw fault('reinforce: no buildingType definition for ' + b.type);
        const effects = a.enhanced ? def.enhanced.effects : def.free;
        if (a.enhanced)
          applyEffect(
            {
              op: 'resource.spend',
              resource: def.enhanced.cost.resource || 'spirit',
              amount: def.enhanced.cost.amount,
            },
            state,
            directives,
          );
        for (const e of effects || []) {
          applyEffect(e, state, directives);
          if (state.outcome.status !== 'running') return;
        }
        dir(directives, 'log.entry', {
          event: 'reinforce',
          building: b.type,
          location: b.location,
          enhanced: !!a.enhanced,
        });
        break;
      }
      applyEffect({ op: 'resource.gain', resource: 'warriors', amount: 2 }, state, directives);
      break;
    }
    case 'banner': {
      // rules.md §Start of Turn: the optional per-turn banner action. The hero-specific ability
      // body is injected content (D2-blocked) — the engine owns only the once-per-turn latch.
      if (!full) throw fault('unknown action choice: banner');
      if (state.clock.latches.bannerUsed) throw fault('banner already used this turn');
      state.clock.latches.bannerUsed = true;
      dir(directives, 'log.entry', { event: 'bannerAction', hero: state.clock.activeHero });
      break;
    }
    case 'pass':
      if (full) throw fault('unknown action choice: pass (use endTurn in the full-turn protocol)');
      break;
    default:
      throw fault('unknown action choice: ' + choice);
  }
}

// applyTrade: atomic, unanimous-by-construction transfer over the closed TradeAsset union (§10.9).
function applyTrade(state, directives, t) {
  const from = state.heroes[t.from],
    to = state.heroes[t.to];
  if (!from || !to) throw fault('trade references unknown hero');
  if (state._setup && state._setup.fullTurn) {
    // rules.md §Making Trades: once per turn, with heroes on your space
    if (state.clock.latches.tradeUsed) throw fault('trade already used this turn');
    if (from.location !== to.location) throw fault('trade requires heroes on the same space');
  }
  const move = (giver, taker, asset) => {
    switch (asset.asset) {
      case 'warriors':
      case 'spirit':
        if ((giver[asset.asset] || 0) < asset.amount)
          throw fault('trade: insufficient ' + asset.asset);
        giver[asset.asset] -= asset.amount;
        taker[asset.asset] += asset.amount;
        break;
      case 'item': {
        const buckets = ['gear', 'treasure', 'potions', 'questItems'];
        let found = false;
        for (const bk of buckets) {
          const i = giver.items[bk].indexOf(asset.itemRef);
          if (i >= 0) {
            giver.items[bk].splice(i, 1);
            taker.items[bk].push(asset.itemRef);
            found = true;
            break;
          }
        }
        if (!found) throw fault('trade: item not held: ' + asset.itemRef);
        break;
      }
      case 'companion': {
        const i = giver.companions.indexOf(asset.companionId);
        if (i < 0) throw fault('trade: companion not held: ' + asset.companionId);
        giver.companions.splice(i, 1);
        taker.companions.push(asset.companionId);
        break;
      }
      default:
        throw fault('trade: untradeable asset (virtues/corruptions are structurally untradeable)');
    }
  };
  // atomic: validate+apply on a working copy is overkill here since faults abort the cloned step state
  for (const a of t.give || []) move(from, to, a);
  for (const a of t.receive || []) move(to, from, a);
  state.clock.latches.tradeUsed = true;
  dir(directives, 'ui.update', { delta: { trade: { from: t.from, to: t.to } } });
}

module.exports = {
  resetLatches,
  markHeroic,
  awardHeroic,
  collectDueEvents,
  rotateActiveHero,
  performAction,
  applyTrade,
};
