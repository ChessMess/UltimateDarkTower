// effects.ts — the §4.3 effect-verb instruction set (applyEffect, discriminated on `op`) plus its
// direct helpers: corruption/quest/event bookkeeping, win/loss transitions, deck shuffle/draw, and
// the buildings-registry helpers. Mutates EngineState and pushes directives; never reaches into the
// flow layer (nodes/resume/turn/battle/dungeon). Depends only on core + the engine-local pcg32.

import pcg32 from '../pcg32';
import { dir, fault } from './core';
import type { EngineState, Effect, Directive, HeroState, BuildingState, FoeStatus } from './types';

// ---------- effect verbs (§4.3, MVP subset) ----------
// Each returns nothing; mutates state, pushes directives. Loss-on-3rd-corruption and
// empty-supply checks fire inline exactly where the contract says (§4.3, §4.5).
export const FOE_LADDER: FoeStatus[] = ['panicked', 'unsteady', 'ready', 'savage', 'lethal'];

// a small helper to narrow the loose Effect payload to the specific fields a case needs, without
// modeling a full per-op discriminated union (deferred — see planning/engine-deferred-followups.md
// item 5). Justified because `op` (the real discriminant) is already narrowed by the switch.
type Eff<T extends object> = Effect & T;
type HeroRecord = Record<string, number>;

// Deterministic Fisher–Yates using the engine PRNG; advances + reserializes RNG state (§6).
export function shuffleInPlace(arr: unknown[], state: EngineState): void {
  const rng = pcg32.deserialize(state.rng);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = pcg32.nextRange(rng, 0, i);
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  state.rng = pcg32.serialize(rng);
}
export function getDeck(state: EngineState, name: string): { draw: unknown[]; discard: unknown[] } {
  if (!state.decks[name]) state.decks[name] = { draw: [], discard: [] };
  return state.decks[name];
}

// The full §4.3 instruction set, discriminated on `op`. "Mutation" = EngineState change;
// directives are handed to the host. Board-touching verbs update nothing physical here
// (headless) — they emit board.mutate for Board's reducer when it lands (§5.2, §10.5).
export function applyEffect(eff: Effect, state: EngineState, directives: Directive[]): void {
  const hero = state.heroes[state.clock.activeHero];
  const heroRec = hero as unknown as HeroRecord;
  const ui = (delta: Record<string, unknown>) => dir(directives, 'ui.update', { delta });
  switch (eff.op) {
    // ----- resources & hero state -----
    case 'resource.gain': {
      const e = eff as Eff<{ resource: string; amount: number }>;
      heroRec[e.resource] = (heroRec[e.resource] || 0) + e.amount;
      ui({ hero: state.clock.activeHero, [e.resource]: heroRec[e.resource] });
      break;
    }
    case 'resource.lose': {
      // mandatory; shortfall → util.catch → one corruption
      const e = eff as Eff<{ resource: string; amount: number }>;
      const short = e.amount - (heroRec[e.resource] || 0);
      heroRec[e.resource] = Math.max(0, (heroRec[e.resource] || 0) - e.amount);
      ui({ hero: state.clock.activeHero, [e.resource]: heroRec[e.resource] });
      if (short > 0) gainCorruption(state, directives, 'shortfall');
      break;
    }
    case 'resource.spend': {
      // optional; blocked if unaffordable
      const e = eff as Eff<{ resource: string; amount: number }>;
      if ((heroRec[e.resource] || 0) < e.amount)
        throw fault('cannot afford resource.spend ' + e.resource);
      heroRec[e.resource] -= e.amount;
      ui({ hero: state.clock.activeHero, [e.resource]: heroRec[e.resource] });
      break;
    }
    case 'corruption.gain': {
      const e = eff as Eff<{ source?: string }>;
      gainCorruption(state, directives, e.source || 'effect');
      break;
    }
    case 'corruption.remove': {
      const e = eff as Eff<{ all?: boolean; count?: number }>;
      hero.corruption = e.all ? 0 : Math.max(0, hero.corruption - (e.count || 0));
      ui({ hero: state.clock.activeHero, corruption: hero.corruption });
      break;
    }
    case 'virtue.activate': {
      const e = eff as Eff<{ virtue?: string }>;
      if (hero.virtues.inactive.length === 0) throw fault('no inactive virtue to activate');
      const v = e.virtue && hero.virtues.inactive.includes(e.virtue) ? e.virtue : hero.virtues.inactive[0];
      hero.virtues.inactive = hero.virtues.inactive.filter((x) => x !== v);
      hero.virtues.active.push(v);
      if (!e.virtue) dir(directives, 'ui.prompt', { kind: 'choice', text: 'Activate which virtue?' });
      ui({ hero: state.clock.activeHero, virtues: hero.virtues });
      break;
    }
    case 'virtue.grant': {
      const e = eff as Eff<{ virtue: string }>;
      hero.virtues.active.push(e.virtue);
      ui({ hero: state.clock.activeHero, virtues: hero.virtues });
      break;
    }
    case 'item.gain': {
      const e = eff as Eff<{ itemType: string; item?: string; from?: string }>;
      const bucket = (
        {
          gear: 'gear',
          treasure: 'treasure',
          potion: 'potions',
          questItem: 'questItems',
        } as Record<string, keyof HeroState['items']>
      )[e.itemType];
      if (!bucket) throw fault('unknown itemType ' + e.itemType);
      hero.items[bucket].push(e.item || e.itemType + ':' + (hero.items[bucket].length + 1));
      if (e.from) dir(directives, 'ui.update', { delta: { drew: e.from } });
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
    case 'foe.spawn': {
      const e = eff as Eff<{ foeId: string; status?: FoeStatus; location?: string | null }>;
      state.foes.push({
        instanceId: 'foe-' + (state.foes.length + 1),
        foeId: e.foeId,
        status: e.status || 'ready',
        location: e.location || null,
      });
      dir(directives, 'board.mutate', {
        command: 'spawnFoe',
        args: { foeId: e.foeId, location: e.location },
      });
      ui({ foe: e.foeId });
      break;
    }
    case 'foe.move': {
      const e = eff as Eff<{ foeId: string; to: string | null }>;
      const f = state.foes.find((x) => x.foeId === e.foeId);
      if (f) f.location = e.to;
      dir(directives, 'board.mutate', {
        command: 'moveFoe',
        args: { foeId: e.foeId, to: e.to },
      });
      break;
    }
    case 'foe.remove': {
      const e = eff as Eff<{ foeId?: string; instanceId?: string }>;
      // an explicit instanceId (set when the battle target was disambiguated, deferred item 1)
      // removes only that instance; otherwise falls back to removing every matching foeId, which
      // is exactly today's behavior for scenarios/streams that never disambiguate.
      state.foes = e.instanceId
        ? state.foes.filter((x) => x.instanceId !== e.instanceId)
        : state.foes.filter((x) => x.foeId !== e.foeId);
      dir(directives, 'board.mutate', { command: 'removeFoe', args: { foeId: e.foeId } });
      break;
    }
    case 'foe.escalateStatus': {
      const e = eff as Eff<{ foeId?: string; instanceId?: string; steps?: number }>;
      const f = e.instanceId
        ? state.foes.find((x) => x.instanceId === e.instanceId)
        : state.foes.find((x) => x.foeId === e.foeId);
      if (f)
        f.status = FOE_LADDER[Math.min(FOE_LADDER.length - 1, FOE_LADDER.indexOf(f.status) + (e.steps || 1))];
      ui({ foe: e.foeId });
      break;
    }
    case 'adversary.spawn': {
      const e = eff as Eff<{ location?: string }>;
      state.adversary.spawned = true;
      // the adversary spawns ON the board (rules.md §Completing the Main Goal) — at the authored
      // location, defaulting to the Tower space; heroes must reach it for the final battle.
      state.adversary.location = e.location || 'the-tower';
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
    }
    // ----- tokens & counters -----
    case 'token.place': {
      const e = eff as Eff<{ tokenTypeId: string; target: unknown }>;
      state.tokens.push({ tokenTypeId: e.tokenTypeId, target: e.target });
      dir(directives, 'board.mutate', {
        command: 'placeToken',
        args: { tokenTypeId: e.tokenTypeId, target: e.target },
      });
      break;
    }
    case 'token.counterIncrement': {
      const e = eff as Eff<{ hero?: string; tokenTypeId: string; amount?: number }>;
      const who = e.hero || state.clock.activeHero;
      const h = state.heroes[who];
      const key = e.tokenTypeId;
      h.counters[key] = (h.counters[key] || 0) + (e.amount || 1);
      ui({ hero: who, counter: key, value: h.counters[key] });
      const cfg = (state._lib.tokenTypes || {})[e.tokenTypeId]?.threshold;
      if (cfg && h.counters[key] >= cfg.at) {
        h.counters[key] = 0;
        for (const nested of cfg.onReach || []) {
          applyEffect(nested, state, directives);
          if (state.outcome.status !== 'running') break; // threshold effect ended the game
        }
      }
      break;
    }
    case 'token.remove': {
      const e = eff as Eff<{ tokenTypeId: string; target: unknown }>;
      const cfg = (state._lib.tokenTypes || {})[e.tokenTypeId] || {};
      if (cfg.removable === false) throw fault('token ' + e.tokenTypeId + ' is not removable');
      state.tokens = state.tokens.filter(
        (t) => !(t.tokenTypeId === e.tokenTypeId && JSON.stringify(t.target) === JSON.stringify(e.target)),
      );
      dir(directives, 'board.mutate', {
        command: 'removeToken',
        args: { tokenTypeId: e.tokenTypeId, target: e.target },
      });
      break;
    }
    // ----- hero / board placement -----
    case 'hero.placeOrMove': {
      const e = eff as Eff<{ hero?: string; to?: string | null }>;
      const heroId = e.hero || state.clock.activeHero;
      state.heroes[heroId].location = e.to ?? null;
      dir(directives, 'board.mutate', { command: 'placeHero', args: { hero: heroId, to: e.to } });
      break;
    }
    case 'board.placeMonument': {
      const e = eff as Eff<{ location: unknown }>;
      state.monuments.push(e.location);
      dir(directives, 'board.mutate', {
        command: 'placeMonument',
        args: { location: e.location },
      });
      break;
    }
    case 'board.placeMarker': {
      const e = eff as Eff<{ location: unknown; markerType: string }>;
      state.markers.push({ location: e.location, markerType: e.markerType });
      dir(directives, 'board.mutate', {
        command: 'placeMarker',
        args: { location: e.location, markerType: e.markerType },
      });
      break;
    }
    // ----- skulls & buildings (scenario-determined only; emergence is observed) -----
    case 'skull.place': {
      const e = eff as Eff<{ count: number; kingdom?: BuildingState['kingdom']; chooser?: string }>;
      state.skulls.supply -= e.count;
      if (state.buildings) {
        // registry model: each scenario-placed skull lands on a standing building of the named
        // kingdom (least-loaded first, like emergence), increments onBoard, and destroys the
        // building when its skulls exceed capacity — so authored skulls behave like emergent ones
        // (visible to cleanse, can raze a building). Byte-frozen `golden` has no registry → else.
        for (let i = 0; i < e.count; i++) {
          const b = pickBuildingForSkull(state, e.kingdom ? { kingdom: e.kingdom } : null);
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
          text: 'Choose building for ' + e.count + ' skull(s)',
        });
        dir(directives, 'board.mutate', {
          command: 'placeSkull',
          args: { count: e.count, kingdom: e.kingdom, chooser: e.chooser || 'homeOwner' },
        });
      }
      if (state.skulls.supply <= 0) loseGame(state, directives, 'empty-supply');
      break;
    }
    case 'skull.remove': {
      const e = eff as Eff<{ count: number }>;
      state.skulls.supply += e.count;
      state.skulls.onBoard = Math.max(0, state.skulls.onBoard - e.count);
      dir(directives, 'board.mutate', { command: 'removeSkull', args: { count: e.count } });
      ui({ supply: state.skulls.supply });
      break;
    }
    case 'building.destroy': {
      const e = eff as Eff<{ location?: string; kingdom?: BuildingState['kingdom'] }>;
      // Registry sync: mark the standing building destroyed and clear its on-board skulls. The
      // emergence + skull.place paths pre-mark the building (destroyed=true, skulls=0) before
      // delegating here, so this stays a no-op for them; a directly-authored destroy on a standing
      // building is the case that previously left the registry out of sync.
      const bd =
        (state.buildings || []).find((x) => x.location === e.location) ||
        (e.kingdom ? (state.buildings || []).find((x) => x.kingdom === e.kingdom && !x.destroyed) : undefined);
      if (bd && !bd.destroyed) {
        state.skulls.onBoard = Math.max(0, (state.skulls.onBoard || 0) - bd.skulls);
        bd.skulls = 0;
        bd.destroyed = true;
      }
      state.skulls.supply += 1; // the 4th skull returns to supply
      dir(directives, 'board.mutate', {
        command: 'removeBuilding',
        args: { location: e.location },
      });
      raiseEvent(state, directives, 'buildingDestroyed');
      const kingdom = e.kingdom;
      const dormant = kingdom ? state.kingdoms.dormant.includes(kingdom) : false;
      // the hero whose home kingdom lost the building gains the corruption (none if dormant)
      if (!dormant)
        gainCorruption(state, directives, 'building-destroyed', kingdom ? state.kingdoms.ownership[kingdom] : undefined);
      break;
    }
    case 'skull.modifySupply': {
      const e = eff as Eff<{ delta: number }>;
      state.skulls.supply += e.delta;
      ui({ supply: state.skulls.supply });
      break;
    }
    // ----- decks & market -----
    case 'deck.draw': {
      const e = eff as Eff<{ deck: string }>;
      const d = getDeck(state, e.deck);
      if (d.draw.length === 0)
        throw fault("deck '" + e.deck + "' empty (explicit deck.reshuffle required, §4.3)");
      const card = d.draw.shift();
      state._lastDraw = card;
      ui({ deck: e.deck, drew: card });
      break;
    }
    case 'deck.discard': {
      const e = eff as Eff<{ deck: string; card?: unknown }>;
      const d = getDeck(state, e.deck);
      d.discard.push(e.card || state._lastDraw);
      break;
    }
    case 'deck.reshuffle': {
      const e = eff as Eff<{ deck: string }>;
      const d = getDeck(state, e.deck);
      d.draw = d.draw.concat(d.discard);
      d.discard = [];
      shuffleInPlace(d.draw, state);
      break;
    }
    case 'market.refresh': {
      const e = eff as Eff<{ cards?: unknown[] }>;
      state.market = e.cards || ['t1', 't2', 't3', 't4'];
      ui({ market: state.market });
      break;
    }
    case 'market.acquireReplace': {
      dir(directives, 'ui.prompt', { kind: 'choice', text: 'Acquire / replace a market card' });
      ui({ market: state.market });
      break;
    }
    // ----- quests & seals & variables -----
    case 'quest.complete': {
      const e = eff as Eff<{ questId: string }>;
      completeQuest(state, directives, e.questId);
      break;
    }
    case 'quest.spawnDungeon': {
      const e = eff as Eff<{ dungeon: string; quest?: string }>;
      state.dungeons[e.dungeon] = { clearedRooms: [] };
      dir(directives, 'board.mutate', {
        command: 'spawnDungeon',
        args: { quest: e.quest, dungeon: e.dungeon },
      });
      break;
    }
    case 'quest.placeMarker': {
      const e = eff as Eff<{ location: unknown; quest?: string }>;
      state.markers.push({ location: e.location, markerType: 'quest', quest: e.quest });
      dir(directives, 'board.mutate', {
        command: 'placeMarker',
        args: { location: e.location, markerType: 'quest' },
      });
      break;
    }
    case 'seal.remove': {
      const e = eff as Eff<{ seal?: string }>;
      const seal = e.seal || state.sealsRemoved + 1 + '-north'; // engine/scenario/player-chosen (not observed, §3.4)
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
      const e = eff as Eff<{ seal: string }>;
      const seal = e.seal;
      state.brokenSeals = state.brokenSeals.filter((s) => s !== seal);
      state.sealsRemoved = Math.max(0, state.sealsRemoved - 1);
      dir(directives, 'tower.program', {
        brokenSeals: state.brokenSeals.slice(),
        target: 'display',
      });
      break;
    }
    case 'flag.set': {
      const e = eff as Eff<{ name: string; value: unknown }>;
      state.flags[e.name] = e.value;
      break;
    }
    case 'counter.set': {
      const e = eff as Eff<{ name: string; value: number }>;
      state.counters[e.name] = e.value;
      break;
    }
    default: {
      const _exhaustive: never = eff.op;
      throw fault('unknown effect verb: ' + _exhaustive + ' (closed set is the 36 of §4.3)');
    }
  }
}

export function gainCorruption(
  state: EngineState,
  directives: Directive[],
  source: string,
  heroId?: string,
): void {
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
const completingQuests: string[] = [];
export function completeQuest(state: EngineState, directives: Directive[], questId: string): void {
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
      for (const e of (qdef?.outcomes || {}).success || []) {
        applyEffect(e, state, directives);
        if (state.outcome.status !== 'running') return;
      }
    }
    // a companion quest grants its companion to the acting hero (rules.md §Monthly Quests)
    for (const cid of Object.keys(state._lib.companions || {})) {
      if ((state._lib.companions?.[cid] || {}).grantedByQuestId === questId) {
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

export function raiseEvent(state: EngineState, directives: Directive[], event: string): void {
  dir(directives, 'log.entry', { event });
  // onState bus: remember raised events until the next end-of-turn boundary consumes them
  // (only when the scenario authors onState triggers — legacy state stays untouched).
  if ((state._triggers || []).some((t) => (t as { trigger?: { on?: string } }).trigger?.on === 'onState')) {
    if (!state.clock.pendingEvents) state.clock.pendingEvents = [];
    if (!state.clock.pendingEvents.includes(event)) state.clock.pendingEvents.push(event);
  }
}

// Once the game is decided (won/lost/ended), the first outcome stands: a later win/loss check
// within the same resolution must not overwrite it (§9 — terminal is terminal).
export function loseGame(state: EngineState, directives: Directive[], reason: string): void {
  if (state.outcome.status !== 'running') return;
  state.outcome = { status: 'lost', reason };
  dir(directives, 'log.entry', { event: 'gameLost', reason });
}
export function winGame(state: EngineState, directives: Directive[], reason: string): void {
  if (state.outcome.status !== 'running') return;
  state.outcome = { status: 'won', reason };
  dir(directives, 'log.entry', { event: 'gameWon', reason });
}

// ---------- buildings registry helpers (used by applyEffect + the observed-skull resume path) ----------
export function buildingAt(state: EngineState, location: string | null): BuildingState | undefined {
  return (state.buildings || []).find((b) => b.location === location);
}
export function capacityOf(state: EngineState, b: BuildingState): number {
  const def = (state._lib.buildingTypes || {})[b.type];
  return def?.skullCapacity || 3; // 3 sit, the 4th destroys (schema-pinned)
}
// Resolve where an emergent skull lands: the observed placement if given, else a deterministic
// spread over standing buildings of ACTIVE kingdoms (dormant kingdoms redirect — schema
// dormantKingdoms.skullRedirect "nearestActive"): least-loaded first, registry order tie-break.
export function pickBuildingForSkull(
  state: EngineState,
  placement: { kingdom: BuildingState['kingdom']; type?: BuildingState['type']; location?: string } | null,
): BuildingState | null {
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
  const candidates = (state.buildings || []).filter((b) => !b.destroyed && !dormant.includes(b.kingdom));
  if (!candidates.length) return null;
  return candidates.reduce((best, b) => (b.skulls < best.skulls ? b : best), candidates[0]);
}
