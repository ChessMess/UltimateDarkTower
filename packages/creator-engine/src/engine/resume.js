// resume.js — resumption from an input boundary (§5.3/§5.4): dispatches the awaited request id to
// its handler (action/target/advantageSpend/trade/moveTarget/dungeon*/skullCounter), including the
// observed-skull bridge. Depends on core, effects, turn, battle, and dungeon.

const { dir, fault } = require('./core');
const { applyEffect, gainCorruption, capacityOf, pickBuildingForSkull } = require('./effects');
const {
  markHeroic,
  awardHeroic,
  performAction,
  applyTrade,
  collectDueEvents,
  rotateActiveHero,
} = require('./turn');
const { startBattle, resolveBattle } = require('./battle');
const { dungeonState, roomOf, finalizeRoom } = require('./dungeon');

// ---------- resume from an input boundary ----------
function resume(pending, state, input, directives) {
  if (pending.request.id !== (input && input.requestId))
    throw fault('input requestId mismatch: expected ' + pending.request.id);
  const node = state._nodes[state.clock.cursor];
  const next = node.wires && node.wires.out ? node.wires.out[0] : undefined;
  switch (pending.request.id) {
    case 'action': {
      // legacy: a bare string choice; full-turn protocol: { choice, ...args } (e.g. questId, enhanced)
      const raw = input.value;
      const choice = typeof raw === 'string' ? raw : (raw || {}).choice;
      const args = raw && typeof raw === 'object' ? raw : {};
      const full = state._setup && state._setup.fullTurn;
      if (choice === 'battle' && state._spine.battleEntry) {
        if (full) markHeroic(state);
        return { goto: state._spine.battleEntry };
      }
      if (choice === 'trade' && state._spine.tradeEntry) {
        if (full && state.clock.latches.tradeUsed) throw fault('trade already used this turn');
        return { goto: state._spine.tradeEntry };
      }
      if (choice === 'move' && state._spine.moveEntry) {
        if (full && state.clock.latches.moveUsed) throw fault('move already used this turn');
        return { goto: state._spine.moveEntry };
      }
      if (choice === 'dungeon' && state._spine.dungeonEntry) {
        if (full) markHeroic(state);
        return { goto: state._spine.dungeonEntry };
      }
      if (full && choice === 'endTurn') return { goto: next }; // proceed to the mandatory skull drop
      performAction(choice, state, directives, args);
      if (state.outcome.status !== 'running') return { terminal: true };
      // full turn: performed actions return to Action: Middle for the next pick (rules.md §Middle of Turn)
      return { goto: full ? state._spine.actionMiddle : next };
    }
    case 'target': {
      // battle.selectFoe — choose the foe (or adversary) and draw cards = level
      const sel = input.value || {};
      // Defensive fallback: if target input arrives without a concrete foe/adversary choice,
      // treat it as a cancel rather than faulting on foe 'undefined'.
      if (sel.cancel || (!sel.foeId && !sel.adversary)) {
        const full = state._setup && state._setup.fullTurn;
        if (full) state.clock.latches.heroicActionUsed = false;
        let cancelTarget = state._spine.actionMiddle || next;
        // Some scenarios route action.battle -> battle.selectFoe -> battle.applyAdvantage -> battle.end.
        // If we don't have an action-middle spine cursor, skip that whole chain on cancel instead of
        // bouncing into another battle input boundary.
        if (!state._spine.actionMiddle) {
          const seen = new Set();
          while (cancelTarget && !seen.has(cancelTarget)) {
            seen.add(cancelTarget);
            const n = state._nodes[cancelTarget];
            if (!n) break;
            if (
              n.kind === 'action.battle' ||
              (typeof n.kind === 'string' && n.kind.indexOf('battle.') === 0)
            ) {
              cancelTarget = (n.wires && n.wires.out && n.wires.out[0]) || undefined;
              continue;
            }
            break;
          }
        }
        return cancelTarget ? { goto: cancelTarget } : { goto: next };
      }
      startBattle(state, directives, sel);
      return { goto: next };
    }
    case 'advantageSpend': {
      // battle.applyAdvantage — spend Advantages (≤10/action), or retreat
      resolveBattle(state, directives, input.value || {});
      if (state.outcome.status !== 'running') return { terminal: true };
      return { goto: next };
    }
    case 'trade': {
      // action.trade — atomic, unanimous-by-construction transfer over TradeAsset (§10.9)
      applyTrade(state, directives, input.value || {});
      return { goto: next };
    }
    case 'moveTarget': {
      // action.move — split-move allowed; Board validates the path
      const moveTo = (input.value || {}).to;
      if (moveTo != null) state.heroes[state.clock.activeHero].location = moveTo;
      state.clock.latches.moveUsed = true; // one Move step per turn (rules.md §Middle of Turn)
      dir(directives, 'board.mutate', {
        command: 'moveHero',
        args: { hero: state.clock.activeHero, to: moveTo },
      });
      return { goto: next };
    }
    case 'dungeonRoomAdvantage': {
      // dungeon.room — spend 1 Advantage to improve this room (once)
      const dc = state.clock.dungeon;
      if (!dc) throw fault('dungeonRoomAdvantage with no active dungeon');
      const ds = dungeonState(state, dc.dungeonId);
      const room = roomOf(state, dc, dc.currentRoom);
      const hero = state.heroes[state.clock.activeHero];
      if (
        (input.value || {}).improve &&
        room.improveOnce &&
        !ds.improvedRooms.includes(room.id) &&
        (hero.advantages || 0) >= 1
      ) {
        hero.advantages -= 1;
        ds.improvedRooms.push(room.id);
        for (const e of room.improveOnce.effects) {
          applyEffect(e, state, directives);
          if (state.outcome.status !== 'running') return { terminal: true };
        }
        dir(directives, 'ui.update', {
          delta: { hero: state.clock.activeHero, advantages: hero.advantages },
        });
        dir(directives, 'log.entry', {
          event: 'dungeonRoomImproved',
          dungeon: dc.dungeonId,
          room: room.id,
        });
      }
      return finalizeRoom(node, state, directives);
    }
    case 'dungeonMove': {
      // dungeon.room — move through a door (directional wire) or leave (catalog §5)
      const dc = state.clock.dungeon;
      if (!dc) throw fault('dungeonMove with no active dungeon');
      const v = input.value || {};
      if (v.leave) {
        const left = dc.left;
        state.clock.dungeon = null;
        dir(directives, 'log.entry', { event: 'dungeonLeft', dungeon: dc.dungeonId });
        // full turn: leaving still completes the quest heroic action (rooms were explored) → +2 spirit
        if (state._setup && state._setup.fullTurn) {
          awardHeroic(state, directives);
          if (state.outcome.status !== 'running') return { terminal: true };
        }
        return { goto: left };
      }
      const d4 = v.direction; // "N"|"E"|"S"|"W"
      const room = roomOf(state, dc, dc.currentRoom);
      if ((room.exits || {})[d4] !== 'door')
        throw fault('dungeonMove: no door ' + d4 + ' from room ' + dc.currentRoom);
      const tgt = ((node.wires && node.wires[d4]) || [])[0]; // doors = wires on directional ports (catalog §5)
      if (!tgt) throw fault('dungeonMove: door ' + d4 + ' not wired from node ' + node.id);
      return { goto: tgt };
    }
    case 'skullCounter': {
      // observed emergence enters the canonical stream (§5.4): a bare count (legacy), or
      // { count, placements: [{ kingdom, type }] } — the app names the buildings the skulls landed
      // on (rules.md §Placing Skulls); the COUNT is always tower-determined, never engine-dictated.
      const raw = input.value;
      const isObj = raw !== null && typeof raw === 'object';
      const count = (isObj ? raw.count : raw) | 0;
      const placements = isObj ? raw.placements || [] : [];
      dir(directives, 'log.entry', { event: 'emergence', count });
      const registry = (state.buildings || []).length > 0;
      for (let i = 0; i < count; i++) {
        state.skulls.onBoard = (state.skulls.onBoard || 0) + 1;
        if (registry) {
          // per-building model: each skull lands on a standing building; a building's 4th skull
          // destroys it — its 3 skulls leave the game, the 4th returns to supply, and the owning
          // kingdom's hero gains a corruption (rules.md §Placing Skulls).
          const b = pickBuildingForSkull(state, placements[i]);
          if (b) {
            b.skulls += 1;
            dir(directives, 'board.mutate', {
              command: 'placeSkull',
              args: { source: 'emergence', kingdom: b.kingdom, type: b.type, location: b.location },
            });
            const cap = capacityOf(state, b);
            if (b.skulls > cap) {
              b.destroyed = true;
              state.skulls.onBoard = Math.max(0, state.skulls.onBoard - b.skulls); // 3 out of the game + the 4th back to supply
              b.skulls = 0;
              applyEffect(
                { op: 'building.destroy', kingdom: b.kingdom, location: b.location },
                state,
                directives,
              );
              if (state.outcome.status !== 'running') return { terminal: true };
            }
          } else {
            dir(directives, 'board.mutate', {
              command: 'placeSkull',
              args: { source: 'emergence' },
            }); // no standing building left
          }
        } else {
          // compact legacy model: every 4th emergent skull anywhere destroys a building → active hero corruption.
          dir(directives, 'board.mutate', { command: 'placeSkull', args: { source: 'emergence' } });
          if (state.skulls.onBoard % 4 === 0) {
            dir(directives, 'board.mutate', { command: 'removeBuilding', args: {} });
            gainCorruption(state, directives, 'building-destroyed');
            if (state.outcome.status !== 'running') return { terminal: true };
          }
        }
      }
      // Engine sequencing (§4.5): resolve end-of-turn events (rules.md §Events), then End Turn
      // advances clockwise turn order (catalog §132) and hands to New Month Check at month-end
      // or starts the next turn this month.
      const endOfMonth = state.clock.turnInMonth >= state.clock.turnsThisMonth;
      const target = endOfMonth ? state._spine.newMonthCheck : state._spine.playerTurn;
      if ((state._triggers || []).length) {
        const due = collectDueEvents(state);
        if (due.length) {
          state.clock.eventQueue = due.slice(1);
          state.clock.afterEvents = { target, rotate: true };
          return { goto: due[0] };
        }
      }
      rotateActiveHero(state);
      return { goto: target };
    }
    default:
      throw fault('no resume handler for ' + pending.request.id);
  }
}

module.exports = { resume };
