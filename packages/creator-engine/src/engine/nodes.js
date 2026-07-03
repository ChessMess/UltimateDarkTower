// nodes.js — the node interpreter (§4.2): the closed node-kind vocabulary mapped to state mutations,
// directives, and control flow ({goto}|{await}|{terminal}|{end}). An unknown kind faults (invariant
// #4). Depends on core, conditions, effects, glyph, turn, and dungeon, plus the engine-local pcg32.

const pcg32 = require('../pcg32');
const { dir, fault } = require('./core');
const { evalCondition } = require('./conditions');
const { FOE_LADDER, applyEffect, completeQuest, loseGame, winGame } = require('./effects');
const { homeKingdomOf, deriveGlyphFacing, recomputeGlyphFacing } = require('./glyph');
const { resetLatches } = require('./turn');
const { dungeonState, resolveRoomEntry } = require('./dungeon');

// ---------- node interpretation (§4.2) ----------
// Returns {goto} | {await:{request,ctx}} | {terminal} | {end}.
function interpretNode(node, state, directives) {
  const out = (node.wires && node.wires.out) || [];
  const next = out[0];
  switch (node.kind) {
    case 'lifecycle.gameStart':
      dir(directives, 'log.entry', { event: 'gameStart' });
      return { goto: next };
    case 'lifecycle.boardSetup': {
      dir(directives, 'board.mutate', { command: 'setupBoard', args: {} });
      // Hero start locations (from boardState.home, set at init) — the board controller
      // is never told about heroes otherwise, so it can't render or later move them.
      for (const h of state.clock.turnOrder) {
        const loc = state.heroes[h].location;
        if (loc != null)
          dir(directives, 'board.mutate', { command: 'placeHero', args: { hero: h, to: loc } });
      }
      // Author-defined initial foe placement — each entry runs the shared foe.spawn effect
      // so a setup spawn is byte-identical to an authored effect.apply foe.spawn.
      const spawns = (node.props && node.props.spawns) || [];
      for (const sp of spawns)
        applyEffect(
          { op: 'foe.spawn', foeId: sp.foeId, location: sp.location, status: sp.status },
          state,
          directives,
        );
      dir(directives, 'ui.update', { delta: { phase: 'setup' } });
      return { goto: next };
    }
    case 'lifecycle.startMonth': {
      state.clock.month += 1;
      state.clock.turnInMonth = 0;
      // catalog §107: months 2+ begin with the player left of last month's final player. Continuous
      // clockwise rotation (rotateActiveHero at End Turn) leaves activeHero already pointing there.
      state.clock.firstPlayerOfMonth = state.clock.activeHero;
      // resolve month length within the authored range via the engine PRNG (§4.5, §10.1)
      const me = state._setup.monthEnd;
      const range = (me.perMonth && me.perMonth[state.clock.month]) || me.default;
      const rng = pcg32.deserialize(state.rng);
      state.clock.turnsThisMonth =
        me.resolution === 'randomInRange'
          ? pcg32.nextRange(rng, range.minTurn, range.maxTurn)
          : range.maxTurn;
      state.rng = pcg32.serialize(rng);
      resetLatches(state);
      dir(directives, 'log.entry', {
        event: 'startMonth',
        month: state.clock.month,
        turns: state.clock.turnsThisMonth,
      });
      return { goto: next };
    }
    case 'lifecycle.playerTurn':
      state.clock.turnInMonth += 1;
      state.clock.globalTurn = (state.clock.globalTurn || 0) + 1;
      resetLatches(state);
      dir(directives, 'log.entry', {
        event: 'playerTurn',
        month: state.clock.month,
        turn: state.clock.turnInMonth,
      });
      return { goto: next };
    case 'lifecycle.actionStart':
      return { goto: next };
    case 'lifecycle.actionMiddle': {
      // INPUT BOUNDARY: the player chooses & performs their action(s) (§5.1 choice).
      if (state._setup && state._setup.fullTurn) {
        // FULL TURN (rules.md §Taking Your Turn): optional banner + move + ONE heroic action
        // (quest / cleanse / battle / dungeon) + reinforce + trade, in any order, each at most
        // once per turn; End Turn proceeds to the mandatory skull drop. Performed actions loop
        // back here; the option list shrinks as the per-turn latches are spent.
        const L = state.clock.latches;
        const options = [];
        if (!L.bannerUsed) options.push('banner');
        if (!L.moveUsed && state._spine.moveEntry) options.push('move');
        if (!L.heroicActionUsed) {
          options.push('quest', 'cleanse');
          if (state._spine.battleEntry) options.push('battle');
          if (state._spine.dungeonEntry) options.push('dungeon');
        }
        if (!L.reinforceUsed) options.push('reinforce');
        if (!L.tradeUsed && state._spine.tradeEntry) options.push('trade');
        options.push('endTurn');
        dir(directives, 'ui.prompt', {
          kind: 'choice',
          requestId: 'action',
          text: 'Take your turn',
          options,
        });
        return {
          await: {
            request: { id: 'action', kind: 'choice', options: options.map((id) => ({ id })) },
          },
        };
      }
      dir(directives, 'ui.prompt', {
        kind: 'choice',
        requestId: 'action',
        text: 'Choose your action',
        options: ['quest', 'cleanse', 'battle', 'pass'],
      });
      return {
        await: {
          request: {
            id: 'action',
            kind: 'choice',
            options: [{ id: 'quest' }, { id: 'cleanse' }, { id: 'battle' }, { id: 'pass' }],
          },
        },
      };
    }
    case 'lifecycle.actionEnd':
      // OBSERVED BOUNDARY: mandatory skull drop (§4.5). supply-- (loss if empty), then await skullCounter.
      if (state.skulls.supply <= 0) {
        loseGame(state, directives, 'empty-supply');
        return { terminal: true };
      }
      state.skulls.supply -= 1;
      state.clock.latches.itemLock = true;
      dir(directives, 'tower.program', { ops: [{ channel: 'skull.dropTrigger' }] }); // NEVER a count (skull invariant)
      dir(directives, 'ui.update', { delta: { supply: state.skulls.supply } });
      return {
        await: { request: { id: 'skullCounter', kind: 'observed', observed: 'skullCounter' } },
      };
    case 'lifecycle.newMonthCheck': {
      // Monthly-quest expiry (rules.md §Monthly Quests): quests fail if not completed by month end;
      // a failed adversary quest lets the adversary advance (its authored outcomes.failure).
      if (state.activeQuests && state.activeQuests.length) {
        const remaining = [];
        for (const aq of state.activeQuests) {
          if ((state.quests[aq.questId] || {}).complete) continue;
          if (aq.expiresMonth <= state.clock.month) {
            dir(directives, 'log.entry', {
              event: 'questFailed',
              questId: aq.questId,
              kind: aq.kind,
            });
            const q = (state._lib.quests || {})[aq.questId];
            for (const e of ((q || {}).outcomes || {}).failure || []) {
              applyEffect(e, state, directives);
              if (state.outcome.status !== 'running') return { terminal: true };
            }
          } else remaining.push(aq);
        }
        state.activeQuests = remaining;
      }
      // compact adversary-quest progress, kept for scenarios WITHOUT an authored newQuests node
      if (!state._spine.newQuests && state.clock.month >= 2 && !state.mainGoalComplete) {
        state.adversary.questProgress = (state.adversary.questProgress || 0) + 1;
        dir(directives, 'log.entry', {
          event: 'newQuests',
          adversaryQuestProgress: state.adversary.questProgress,
        });
      }
      // Engine sequencing (§4.5): after month 6, evaluate end-game; else issue the next month's
      // quests (if authored) and start the next month.
      if (state.clock.month >= 6) return { goto: state._spine.endEval };
      return { goto: state._spine.newQuests || state._spine.startMonth };
    }
    case 'lifecycle.newQuests': {
      // Issue the upcoming month's companion + adversary quests (months 2+; rules.md §Monthly Quests).
      const upcoming = state.clock.month + 1;
      const monthly = ((node.props || {}).monthly || {})[String(upcoming)];
      if (monthly) {
        if (!state.activeQuests) state.activeQuests = [];
        for (const kind of ['companion', 'adversary']) {
          const qid = monthly[kind];
          if (qid && !(state.quests[qid] || {}).complete) {
            state.activeQuests.push({ questId: qid, kind, expiresMonth: upcoming });
            dir(directives, 'log.entry', {
              event: 'newQuest',
              kind,
              questId: qid,
              month: upcoming,
            });
            dir(directives, 'ui.update', { delta: { activeQuests: state.activeQuests.slice() } });
          }
        }
      }
      return { goto: next };
    }
    case 'lifecycle.gameEnd':
      // Reached after month 6 (or via win route). If adversary defeated → win; else loss (out of time).
      if (state.adversary.defeated) {
        winGame(state, directives, 'adversary-defeated');
        return { terminal: true };
      }
      loseGame(state, directives, 'out-of-time');
      return { terminal: true };
    case 'effect.apply': {
      const effs = node.props.effects || (node.props.effect ? [node.props.effect] : []);
      for (const e of effs) {
        applyEffect(e, state, directives);
        if (state.outcome.status !== 'running') return { terminal: true };
      }
      return { goto: next };
    }
    case 'tower.op':
      dir(directives, 'tower.program', { ops: [node.props.towerOp] });
      return { goto: next };
    case 'cond.branch': {
      const truthy = evalCondition(node.props.condition, state);
      const port = truthy ? 'true' : 'false';
      const tgt = node.wires[port] && node.wires[port][0];
      if (!tgt) throw fault("cond.branch missing '" + port + "' port at " + node.id);
      return { goto: tgt };
    }
    case 'cond.check':
      if (!evalCondition(node.props.condition, state))
        throw fault('cond.check failed at ' + node.id);
      return { goto: next };
    case 'winloss.mainGoal':
      return { goto: next };
    case 'winloss.winCondition':
      if (evalCondition(node.props.condition, state)) {
        winGame(state, directives, 'win-condition');
        return { terminal: true };
      }
      return { goto: next };
    case 'winloss.lossCondition':
      if (evalCondition(node.props.condition, state)) {
        loseGame(state, directives, 'loss-condition');
        return { terminal: true };
      }
      return { goto: next };
    case 'action.banner':
      dir(directives, 'ui.prompt', { kind: 'banner', text: node.props.title });
      return { goto: next };
    // ----- turn actions & battle subflow (§4 row 156–157) -----
    case 'action.battle':
    case 'battle.selectFoe': // INPUT BOUNDARY: choose the foe (or adversary)
      dir(directives, 'ui.prompt', {
        kind: 'target',
        requestId: 'target',
        text: 'Select a foe to battle',
      });
      return { await: { request: { id: 'target', kind: 'target' } } };
    case 'battle.applyAdvantage': // INPUT BOUNDARY: spend Advantages (≤10) or retreat
      return { await: { request: { id: 'advantageSpend', kind: 'advantageSpend' } } };
    case 'battle.end':
      return { goto: next };
    case 'action.trade': // INPUT BOUNDARY: the mutual-consent trade decision
      dir(directives, 'ui.prompt', { kind: 'choice', requestId: 'trade', text: 'Propose a trade' });
      return { await: { request: { id: 'trade', kind: 'choice' } } };
    case 'action.move': // INPUT BOUNDARY: choose destination (split-move allowed)
      dir(directives, 'ui.prompt', { kind: 'target', requestId: 'moveTarget', text: 'Move to…' });
      return { await: { request: { id: 'moveTarget', kind: 'target' } } };
    case 'action.cleanse':
      applyEffect({ op: 'corruption.remove', count: 1 }, state, directives);
      return { goto: next };
    case 'action.quest':
      if (node.props && node.props.questId) completeQuest(state, directives, node.props.questId);
      if (state.outcome.status !== 'running') return { terminal: true };
      return { goto: next };
    case 'action.reinforce':
      if (state.clock.latches.reinforceUsed) throw fault('reinforce already used this turn');
      state.clock.latches.reinforceUsed = true;
      applyEffect({ op: 'resource.gain', resource: 'warriors', amount: 2 }, state, directives);
      return { goto: next };
    case 'media.narration':
      dir(directives, 'media.play', { media: 'narration', text: node.props.text });
      return { goto: next };
    // ----- dungeon subflow (§4 row 157; catalog §5) -----
    case 'dungeon.subflow': {
      const dId = node.props.dungeonId;
      const d = (state._lib.dungeons || {})[dId];
      if (!d) throw fault('dungeon.subflow references unknown dungeon: ' + dId);
      const ds = dungeonState(state, dId);
      const target = (d.rooms || []).find((r) => r.isTarget);
      // re-entry after the dungeon is already cleared → straight to `completed` (no re-walk)
      if (target && ds.clearedRooms.includes(target.id))
        return { goto: (node.wires.completed || [])[0] };
      state.clock.dungeon = {
        dungeonId: dId,
        completed: (node.wires.completed || [])[0],
        left: (node.wires.left || [])[0],
        currentRoom: null,
        currentRoomNode: null,
      };
      dir(directives, 'tower.program', {
        ops: [
          { channel: 'light.named', sequenceId: d.idleLight || 'dungeonIdle' },
          { channel: 'sound', category: d.ambientSoundCategory || 'Dungeon' },
        ],
      });
      dir(directives, 'board.mutate', { command: 'enterDungeon', args: { dungeon: dId } });
      const entrance = (node.wires.enter || [])[0];
      if (!entrance)
        throw fault("dungeon.subflow missing 'enter' wire to its entrance room node: " + node.id);
      return { goto: entrance };
    }
    case 'dungeon.room':
      return resolveRoomEntry(node, state, directives);
    // ----- glyph gate (§4.4 / §3.4): derived facing → 1-spirit tax, else blocked -----
    case 'cond.glyphGate': {
      const action = node.props.action; // banner|quest|battle|reinforce|cleanse ($defs/glyph)
      const heroId = state.clock.activeHero;
      const home = homeKingdomOf(state, heroId);
      const gated = home && deriveGlyphFacing(state)[home] === action;
      if (!gated) return { goto: (node.wires.out || [])[0] };
      const hero = state.heroes[heroId];
      if ((hero.spirit || 0) >= 1) {
        // pay the spirit tax → proceed
        hero.spirit -= 1;
        dir(directives, 'ui.update', { delta: { hero: heroId, spirit: hero.spirit } });
        dir(directives, 'log.entry', { event: 'glyphGatePaid', action, kingdom: home });
        return { goto: (node.wires.out || [])[0] };
      }
      // no spirit → the matching action is blocked
      dir(directives, 'log.entry', { event: 'glyphGateBlocked', action, kingdom: home });
      const blocked = (node.wires.blocked || [])[0];
      if (!blocked) throw fault("cond.glyphGate blocked but no 'blocked' port at " + node.id);
      return { goto: blocked };
    }
    // ----- end-of-turn events (rules.md §Events) — chain roots fired via the event queue -----
    case 'trigger.schedule':
    case 'trigger.onState':
      return { goto: next };
    case 'event.foesStrike': {
      // each foe on the board strikes the acting hero with its authored strike effects
      // (skipped per foe type not on the board); movement beyond `scripted` needs Board adjacency.
      const filter = (node.props || {}).foeIds;
      for (const f of state.foes.slice()) {
        if (filter && !filter.includes(f.foeId)) continue;
        const def = (state._lib.foes || {})[f.foeId] || {};
        dir(directives, 'log.entry', {
          event: 'foeStrike',
          foeId: f.foeId,
          location: f.location,
          status: f.status,
        });
        for (const e of (def.strike || {}).effects || []) {
          applyEffect(e, state, directives);
          if (state.outcome.status !== 'running') return { terminal: true };
        }
      }
      for (const mv of (node.props || {}).moves || [])
        applyEffect({ op: 'foe.move', foeId: mv.foeId, to: mv.to }, state, directives);
      return { goto: next };
    }
    case 'event.foesGrow': {
      const steps = (node.props || {}).steps || 1;
      for (const f of state.foes)
        f.status =
          FOE_LADDER[Math.min(FOE_LADDER.length - 1, FOE_LADDER.indexOf(f.status) + steps)];
      dir(directives, 'log.entry', {
        event: 'foesGrow',
        foes: state.foes.map((f) => ({ foeId: f.foeId, status: f.status })),
      });
      return { goto: next };
    }
    case 'event.foesSpawn': {
      for (const sp of (node.props || {}).spawns || [])
        applyEffect(
          { op: 'foe.spawn', foeId: sp.foeId, location: sp.location, status: sp.status },
          state,
          directives,
        );
      return { goto: next };
    }
    case 'event.towerStirs': {
      dir(directives, 'tower.program', {
        ops: [{ channel: 'drum.rotate', level: (node.props || {}).level || 'top' }],
      });
      recomputeGlyphFacing(state);
      if ((node.props || {}).removeSeal) applyEffect({ op: 'seal.remove' }, state, directives);
      dir(directives, 'log.entry', { event: 'towerStirs' });
      return { goto: next };
    }
    case 'event.towerActs': {
      dir(directives, 'log.entry', { event: 'towerActs' });
      for (const e of (node.props || {}).effects || []) {
        applyEffect(e, state, directives);
        if (state.outcome.status !== 'running') return { terminal: true };
      }
      return { goto: next };
    }
    case 'event.newWares':
      applyEffect({ op: 'market.refresh', cards: (node.props || {}).cards }, state, directives);
      dir(directives, 'log.entry', { event: 'newWares' });
      return { goto: next };
    case 'event.companion': {
      const cid = (node.props || {}).companionId;
      if (cid) {
        const hero = state.heroes[state.clock.activeHero];
        if (!hero.companions.includes(cid)) hero.companions.push(cid);
        dir(directives, 'ui.update', {
          delta: { hero: state.clock.activeHero, companions: hero.companions.slice() },
        });
      }
      dir(directives, 'log.entry', { event: 'companionEvent', companion: cid });
      return { goto: next };
    }
    case 'event.readAloud':
      dir(directives, 'media.play', { media: 'narration', text: (node.props || {}).text });
      return { goto: next };
    case 'event.router': {
      const outs = (node.wires && node.wires.out) || [];
      if (!outs.length) return {};
      const rng = pcg32.deserialize(state.rng);
      const pick = pcg32.nextRange(rng, 0, outs.length - 1);
      state.rng = pcg32.serialize(rng);
      return { goto: outs[pick] };
    }
    default:
      throw fault('node kind not implemented in MVP slice: ' + node.kind);
  }
}

module.exports = { interpretNode };
