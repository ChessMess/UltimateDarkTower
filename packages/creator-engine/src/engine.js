// engine.js — the shared rules-engine reducer (MVP vertical slice).
// Implements the contract's API surface (§2.3): init / step / replay / serialize / digest,
// a near-pure (EngineState, Input) → StepResult reducer (§5.1), the closed directive (§5.2)
// and input (§5.3) vocabularies, the observed-input bridge (§5.4: skullCounter), determinism
// via the engine-local pcg32 PRNG (§6), phase sequencing (§4.5), and win/loss detection (§9).
//
// SCOPE: this is a faithful *vertical slice* — real engine machinery (deterministic step loop,
// effects that mutate state, a genuine decision boundary + an observed boundary, the skull
// invariant, all three loss conditions + the win condition, the closed directive set) over a
// COMPACT golden scenario. It implements the node kinds and effect verbs the golden fixture
// uses; unimplemented kinds/verbs raise a clear fault rather than silently passing. Full
// month-by-month rules fidelity and the remaining verbs are a later pass (§4.3 is the full set).

const pcg32 = require('./pcg32');
const { KINGDOMS, canonical, serialize, deserialize, digest, clone, fault, dir } = require('./engine/core');
const { evalCondition } = require('./engine/conditions');

const ENGINE_VERSION = '0.4.0';
const SUPPORTED_SCHEMA_RANGE = '>=0.4.0 <0.5.0'; // semver-range, same-minor pre-1.0 (§8)

const {
  FOE_LADDER,
  shuffleInPlace,
  applyEffect,
  gainCorruption,
  completeQuest,
  raiseEvent,
  loseGame,
  winGame,
  buildingAt,
  capacityOf,
  pickBuildingForSkull,
} = require('./engine/effects');

// ---------- dungeon subflow (§4 row 157; catalog §5) ----------
// The dungeon's room graph is GRAPH-FAITHFUL: `dungeon.subflow` routes (`enter`) to the entrance
// `dungeon.room` node; rooms are wired N/E/S/W (doors = wires on directional ports — catalog §5);
// each room's *data* (cell/exits/insideEvent/improveOnce/enterRequirement/isTarget) lives in
// `library.dungeons[id].rooms` keyed by `props.roomId`. Cleared rooms are tracked per-dungeon and
// persist ACROSS heroes (contract §3.1 / catalog §5 "cleared state persists for any hero") — so the
// set lives on `state.dungeons[id].clearedRooms`, not per-hero. Walk context is `state.clock.dungeon`.

function dungeonState(state, id) {
  if (!state.dungeons[id]) state.dungeons[id] = { clearedRooms: [], improvedRooms: [] };
  if (!state.dungeons[id].improvedRooms) state.dungeons[id].improvedRooms = [];
  return state.dungeons[id];
}
function roomOf(state, dc, roomId) {
  const d = state._lib.dungeons[dc.dungeonId];
  const room = (d.rooms || []).find((r) => r.id === roomId);
  if (!room)
    throw fault(
      "dungeon.room references unknown room '" + roomId + "' in dungeon '" + dc.dungeonId + "'",
    );
  return room;
}

// Resolve entry into the room a `dungeon.room` node names: gate → insideEvent → (improve boundary) →
// finalize. Returns {goto}|{await}|{terminal}.
function resolveRoomEntry(node, state, directives) {
  const dc = state.clock.dungeon;
  if (!dc) throw fault('dungeon.room walked outside an active dungeon subflow: ' + node.id);
  const roomId = (node.props || {}).roomId;
  if (!roomId) throw fault('dungeon.room missing props.roomId: ' + node.id);
  const room = roomOf(state, dc, roomId);
  dc.currentRoom = roomId;
  dc.currentRoomNode = node.id;
  dir(directives, 'board.mutate', {
    command: 'revealRoom',
    args: { dungeon: dc.dungeonId, room: roomId, slice: room.bitmapSlice },
  });
  if (room.displayText)
    dir(directives, 'ui.update', { delta: { dungeonRoomText: room.displayText } });

  const ds = dungeonState(state, dc.dungeonId);
  if (ds.clearedRooms.includes(roomId)) {
    // already cleared (persists across heroes): reveal only, no re-resolution (catalog §5)
    if (room.isTarget) return completeDungeon(state, directives);
    return awaitDungeonMove(node, state, directives);
  }
  // enter requirement (catalog §5; glyph-gate-shaped: a condition gate and/or a spirit tax)
  const req = room.enterRequirement;
  if (req) {
    const hero = state.heroes[state.clock.activeHero];
    const blocked =
      (req.condition && !evalCondition(req.condition, state)) ||
      (req.spiritCost && (hero.spirit || 0) < req.spiritCost);
    if (blocked) {
      for (const e of req.onFail || []) {
        applyEffect(e, state, directives);
        if (state.outcome.status !== 'running') return { terminal: true };
      }
      dir(directives, 'log.entry', {
        event: 'dungeonRoomBlocked',
        dungeon: dc.dungeonId,
        room: roomId,
      });
      const left = dc.left;
      state.clock.dungeon = null;
      return { goto: left }; // gated → cannot enter → leave
    }
    if (req.spiritCost) {
      hero.spirit -= req.spiritCost;
      dir(directives, 'ui.update', {
        delta: { hero: state.clock.activeHero, spirit: hero.spirit },
      });
    }
  }
  // inside event — the "apply results" step (base result)
  for (const e of room.insideEvent || []) {
    applyEffect(e, state, directives);
    if (state.outcome.status !== 'running') return { terminal: true };
  }
  // improve-once boundary: 1 Advantage may improve this room's result, once per room (catalog §5)
  const canImprove =
    room.improveOnce &&
    !ds.improvedRooms.includes(roomId) &&
    (state.heroes[state.clock.activeHero].advantages || 0) >= 1;
  if (canImprove) {
    dir(directives, 'ui.prompt', {
      kind: 'advantageSpend',
      requestId: 'dungeonRoomAdvantage',
      text: 'Spend 1 Advantage to improve this room?',
      room: roomId,
    });
    return { await: { request: { id: 'dungeonRoomAdvantage', kind: 'advantageSpend' } } };
  }
  return finalizeRoom(node, state, directives);
}

function finalizeRoom(node, state, directives) {
  const dc = state.clock.dungeon;
  const ds = dungeonState(state, dc.dungeonId);
  const room = roomOf(state, dc, dc.currentRoom);
  if (!ds.clearedRooms.includes(room.id)) {
    ds.clearedRooms.push(room.id);
    dir(directives, 'log.entry', {
      event: 'dungeonRoomCleared',
      dungeon: dc.dungeonId,
      room: room.id,
    });
  }
  if (room.isTarget) return completeDungeon(state, directives);
  return awaitDungeonMove(node, state, directives);
}

function awaitDungeonMove(node, state, directives) {
  const dc = state.clock.dungeon;
  const room = roomOf(state, dc, dc.currentRoom);
  const doors = ['N', 'E', 'S', 'W'].filter((d) => (room.exits || {})[d] === 'door');
  dir(directives, 'ui.prompt', {
    kind: 'choice',
    requestId: 'dungeonMove',
    text: 'Move through a door or leave the dungeon',
    room: dc.currentRoom,
    doors,
  });
  return { await: { request: { id: 'dungeonMove', kind: 'choice' } } };
}

// Clearing the target room completes the dungeon AND its spawning quest, removing the board token.
function completeDungeon(state, directives) {
  const dc = state.clock.dungeon;
  const d = state._lib.dungeons[dc.dungeonId];
  dir(directives, 'board.mutate', {
    command: 'removeDungeonToken',
    args: { dungeon: dc.dungeonId },
  });
  dir(directives, 'log.entry', { event: 'dungeonComplete', dungeon: dc.dungeonId });
  if (d.spawningQuestId) completeQuest(state, directives, d.spawningQuestId); // fires questComplete (§4.4)
  const ret = dc.completed;
  state.clock.dungeon = null;
  if (state.outcome.status !== 'running') return { terminal: true };
  // full turn: dungeon exploration is the quest heroic action — completed → +2 spirit
  if (state._setup && state._setup.fullTurn) awardHeroic(state, directives);
  if (state.outcome.status !== 'running') return { terminal: true };
  return { goto: ret };
}

// ---------- glyph gate (§4.4 / §3.4) ----------
// While a REVEALED glyph faces the acting hero's HOME kingdom, the matching action requires 1 spirit,
// else it is blocked. Facing is DERIVED (not observed) from the engine's mirrored drum positions
// (UDT getGlyphsFacingDirection). The drum→facing geometry resolves via the UDT adapter; until that
// geometry is source-verified it is a tagged placeholder (cf. the headless board/tower targets and the
// Advantage-pool placeholder). The engine carries the derived facing mirror in `state.tower.glyphFacing`
// (a `{ kingdom: glyph|null }` map — only REVEALED glyphs appear), which is what the gate reads.
function homeKingdomOf(state, heroId) {
  const own = (state.kingdoms && state.kingdoms.ownership) || {};
  for (const k of Object.keys(own)) if (own[k] === heroId) return k;
  return undefined;
}
function deriveGlyphFacing(state) {
  return (state.tower && state.tower.glyphFacing) || {};
}
// Adapter seam (intended-design placeholder): recompute the derived facing from drum positions + the
// broken-seal set. Real impl calls UDT getGlyphsFacingDirection(drums) and reveals only seal-broken
// glyphs. Kept as a no-op stand-in so commanded rotations / seal changes have an explicit hook.
function recomputeGlyphFacing(state) {
  if (!state.tower) state.tower = { drums: [0, 0, 0], glyphFacing: {}, calibrated: true };
  return state.tower.glyphFacing;
}

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

// ---------- battle subflow (§4 row 157; runs on AUTHORED battleDefs.cards, §389.3) ----------
// startBattle: select foe → draw cards = foe level (2–4; adversary 5) from the authored battleDef.
function startBattle(state, directives, sel) {
  const isAdversary = sel.foeId === state.adversary.foeId || sel.adversary === true;
  const foeId = isAdversary ? state.adversary.foeId : sel.foeId;
  const def = (state._lib.battleDefs || {})[foeId];
  // a battle with no authored cards would "clear" instantly (0 of 0) — fail loudly instead
  if (!def || !(def.cards || []).length)
    throw fault("foe '" + foeId + "' has no authored battleDef cards");
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
    } else if (!state.foes.some((f) => f.foeId === foeId && f.location === hero.location)) {
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
  state.clock.battle = { foeId, isAdversary, level, cards, resolved: 0 };
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
      applyEffect({ op: 'foe.remove', foeId: b.foeId }, state, directives);
    }
  } else if (state.outcome.status === 'running') {
    applyEffect({ op: 'foe.escalateStatus', foeId: b.foeId }, state, directives);
  }
  // full turn: the battle heroic action is complete (all cards resolved) → +2 spirit (rules.md §100)
  if (state._setup && state._setup.fullTurn && state.outcome.status === 'running')
    awardHeroic(state, directives);
  state.clock.battle = null;
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

// ---------- the run loop ----------
function run(state, directives) {
  // safety bound so a malformed graph can't spin forever
  for (let guard = 0; guard < 100000; guard++) {
    if (
      state.outcome.status === 'won' ||
      state.outcome.status === 'lost' ||
      state.outcome.status === 'ended'
    )
      return state.outcome.status;
    const node = state._nodes[state.clock.cursor];
    if (!node) {
      state.outcome.status = 'ended';
      return 'ended';
    }
    const r = interpretNode(node, state, directives);
    if (r.await) {
      state.clock.pending = { request: r.await.request };
      state.outcome.status = 'awaitingInput';
      return 'awaitingInput';
    }
    if (r.terminal) return state.outcome.status;
    if (r.end || r.goto === undefined) {
      // an end-of-turn event chain ran off its last node: pop the next due chain, then resume
      // the turn spine (rotate + goto) stashed before the events fired.
      const q = state.clock.eventQueue;
      if (q && q.length) {
        state.clock.cursor = q.shift();
        continue;
      }
      const ae = state.clock.afterEvents;
      if (ae) {
        state.clock.afterEvents = null;
        state.clock.eventQueue = null;
        if (ae.rotate) rotateActiveHero(state);
        state.clock.cursor = ae.target;
        continue;
      }
      state.outcome.status = 'ended';
      return 'ended';
    }
    state.clock.cursor = r.goto;
  }
  throw fault('run loop exceeded guard (graph cycle without progress?)');
}

// ---------- public API (§2.3) ----------
// Build the active/dormant kingdom split for a player count. Prefers the authored map
// (setup.playerCountScaling.dormantKingdoms.byPlayerCount, schema v0.4) and falls back to the
// canonical order (first N kingdoms active, remainder dormant; 4P → none dormant). The complement of
// the dormant set must leave exactly one active kingdom per player — otherwise it's a load fault.
function buildKingdoms(scenario, playerCount) {
  const pcs = (scenario.setup && scenario.setup.playerCountScaling) || {};
  const byPC = pcs.dormantKingdoms && pcs.dormantKingdoms.byPlayerCount;
  const dormant =
    byPC && Array.isArray(byPC[String(playerCount)])
      ? byPC[String(playerCount)].slice()
      : KINGDOMS.slice(playerCount);
  const active = KINGDOMS.filter((k) => !dormant.includes(k));
  if (active.length !== playerCount)
    throw fault(
      'playerCount ' +
        playerCount +
        ' needs ' +
        playerCount +
        ' active kingdom(s); setup yields ' +
        active.length +
        ' (dormant: [' +
        dormant.join(',') +
        '])',
    );
  return { active, dormant };
}
function makeHero(fullTurn) {
  // Hero rich-data (real 7+1 split, banner, move value, 3+3 virtues, Advantage pool) is injected
  // content (§10.3, D2-blocked); the engine starts every hero from the documented placeholder.
  // Full-turn scenarios seed the 3+3 virtue split (rules.md §Hero Setup) with placeholder ids so
  // the citadel's enhanced Reinforce (virtue.activate) is exercisable before hero content ships.
  const virtues = fullTurn
    ? {
        active: ['virtue-1', 'virtue-2', 'virtue-3'],
        inactive: ['virtue-4', 'virtue-5', 'virtue-6'],
      }
    : { active: [], inactive: [] };
  return {
    warriors: 7,
    spirit: 1,
    corruption: 0,
    advantages: 6,
    virtues,
    items: { gear: [], treasure: [], potions: [], questItems: [] },
    companions: [],
    counters: {},
    location: null,
  };
}

function init(scenario, opts) {
  if (!opts || !opts.seed) throw fault('init requires opts.seed (engine runtime seed, §6)');
  const nodes = {};
  for (const n of scenario.graph.nodes) nodes[n.id] = n;
  const byKind = (k) => {
    const n = scenario.graph.nodes.find((x) => x.kind === k);
    return n && n.id;
  };
  // Honor opts.playerCount (§3.1): build the hero set, per-player home-kingdom ownership, the dormant
  // complement, and clockwise seating. Fail at load (§ "fail at load, never mid-game") on a bad count
  // or a dormant-set that doesn't leave exactly one active kingdom per player.
  const playerCount = opts.playerCount | 0 || 1;
  if (playerCount < 1 || playerCount > 4)
    throw fault('playerCount must be 1–4 (got ' + opts.playerCount + ')');
  const { active, dormant } = buildKingdoms(scenario, playerCount);
  // Full-turn discriminator (fidelity gate): the actionMiddle node opts in with props.turn === "full".
  // Legacy scenarios (no prop) keep the single-action-per-turn MVP loop byte-identical.
  const amidNode = scenario.graph.nodes.find((n) => n.kind === 'lifecycle.actionMiddle');
  const fullTurn = !!(amidNode && amidNode.props && amidNode.props.turn === 'full');
  const heroIds = [];
  for (let i = 1; i <= playerCount; i++) heroIds.push('hero' + i);
  const heroes = {};
  for (const id of heroIds) heroes[id] = makeHero(fullTurn);
  const ownership = {};
  active.forEach((k, i) => {
    ownership[k] = heroIds[i];
  });
  // Buildings registry + hero start locations from the authored (opaque-to-L1) boardState:
  // { home: { kingdom: location }, buildings: [{ kingdom, type, location }] }. Heroes start on
  // their home kingdom's citadel space (rules.md §Hero Setup).
  const boardState = (scenario.setup.board && scenario.setup.board.boardState) || null;
  const buildings =
    boardState && Array.isArray(boardState.buildings)
      ? boardState.buildings.map((b) => ({
          kingdom: b.kingdom,
          type: b.type,
          location: b.location,
          skulls: 0,
          destroyed: false,
        }))
      : null;
  if (boardState && boardState.home) {
    for (const k of Object.keys(ownership)) {
      if (boardState.home[k] != null) heroes[ownership[k]].location = boardState.home[k];
    }
  }
  const firstHero = heroIds[0];
  const rng = pcg32.create(opts.seed);
  const state = {
    meta: {
      scenarioVersion: scenario.meta.scenarioVersion,
      schemaVersion: scenario.schemaVersion,
      engine: ENGINE_VERSION,
    },
    clock: {
      month: 0,
      turnInMonth: 0,
      turnsThisMonth: 0,
      globalTurn: 0,
      cursor: scenario.graph.entry,
      pending: null,
      activeHero: firstHero,
      turnOrder: heroIds.slice(),
      firstPlayerOfMonth: firstHero,
      latches: {},
    },
    kingdoms: { ownership, dormant },
    heroes,
    ...(buildings ? { buildings } : {}),
    foes: [],
    adversary: {
      foeId: scenario.setup.selections.adversaryId,
      spawned: false,
      defeated: false,
      advantages: [],
      advantagesBanked: 0,
      questProgress: 0,
      battleProgress: 0,
    },
    skulls: { supply: scenario.setup.difficulty.skullSupply, onBoard: 0 },
    decks: {},
    market: [],
    monuments: [],
    markers: [],
    tokens: [],
    flags: {},
    counters: {},
    sealsRemoved: 0,
    brokenSeals: [],
    quests: {},
    mainGoalComplete: false,
    dungeons: {},
    tower: { drums: [0, 0, 0], glyphFacing: {}, calibrated: true }, // engine-owned derived mirror (§3.4)
    rng: pcg32.serialize(rng),
    outcome: { status: 'running', reason: null },
    // load-time references kept out of the digest-relevant game state but needed at run:
    _nodes: nodes,
    _lib: scenario.library,
    _spine: {
      startMonth: byKind('lifecycle.startMonth'),
      playerTurn: byKind('lifecycle.playerTurn'),
      newMonthCheck: byKind('lifecycle.newMonthCheck'),
      newQuests: byKind('lifecycle.newQuests'),
      actionMiddle: amidNode && amidNode.id,
      endEval: byKind('winloss.winCondition'),
      gameEnd: byKind('lifecycle.gameEnd'),
      battleEntry: byKind('battle.selectFoe') || byKind('action.battle'),
      tradeEntry: byKind('action.trade'),
      moveEntry: byKind('action.move'),
      dungeonEntry: byKind('dungeon.subflow'),
    },
    _setup: {
      monthEnd: scenario.setup.monthEnd,
      mainGoalId: scenario.setup.selections.mainGoalId,
      goalThreshold: (scenario.meta.tuning && scenario.meta.tuning.goalThreshold) || 3,
      adversaryToughness: (scenario.meta.tuning && scenario.meta.tuning.adversaryToughness) || 2,
      fullTurn,
      // foe level by selection tier (rules: tier1→2, tier2→3, tier3→4); adversary is always 5
      foeTiers: (() => {
        const f = scenario.setup.selections.foes || {};
        const m = {};
        if (f.tier1) m[f.tier1] = 2;
        if (f.tier2) m[f.tier2] = 3;
        if (f.tier3) m[f.tier3] = 4;
        return m;
      })(),
      // quests issued by the authored newQuests node are attemptable only while active
      monthlyQuestIds: (() => {
        const nq = scenario.graph.nodes.find((n) => n.kind === 'lifecycle.newQuests');
        const ids = [];
        if (nq && nq.props && nq.props.monthly)
          for (const m of Object.values(nq.props.monthly))
            for (const v of Object.values(m)) ids.push(v);
        return ids;
      })(),
    },
    // end-of-turn event triggers in graph order (deterministic firing order)
    _triggers: scenario.graph.nodes
      .filter((n) => n.kind === 'trigger.schedule' || n.kind === 'trigger.onState')
      .map((n) => ({
        id: n.id,
        trigger: (n.props || {}).trigger,
        next: ((n.wires || {}).out || [])[0],
      })),
  };
  resetLatches(state);
  const directives = [];
  const status = run(state, directives);
  return {
    state,
    directives,
    status,
    awaiting: state.clock.pending ? state.clock.pending.request : undefined,
  };
}

function step(prevState, input) {
  const state = clone(prevState);
  // _nodes/_lib/_setup survive clone (plain JSON) — fine, they're immutable references.
  const directives = [];
  if (state.clock.pending) {
    const pending = state.clock.pending;
    state.clock.pending = null;
    state.outcome.status = 'running';
    const r = resume(pending, state, input, directives);
    if (r && r.await) {
      // resume can open a NEW input boundary (e.g. dungeon room: improve → move)
      state.clock.pending = { request: r.await.request };
      state.outcome.status = 'awaitingInput';
      return { state, directives, status: 'awaitingInput', awaiting: r.await.request };
    }
    if (r && r.goto !== undefined) state.clock.cursor = r.goto;
    else if (r && r.terminal) {
      /* outcome already set */
    }
  } else if (input && input.kind === 'control') {
    return { state: prevState, directives: [], status: prevState.outcome.status };
  }
  const status =
    state.outcome.status === 'running' || state.outcome.status === 'awaitingInput'
      ? run(state, directives)
      : state.outcome.status;
  return {
    state,
    directives,
    status,
    awaiting: state.clock.pending ? state.clock.pending.request : undefined,
  };
}

function replay(scenario, opts, inputs) {
  const results = [];
  let r = init(scenario, opts);
  results.push(r);
  for (const inp of inputs) {
    if (r.status === 'won' || r.status === 'lost' || r.status === 'ended') break;
    r = step(r.state, inp);
    results.push(r);
  }
  return results;
}

// Test-only surface (NOT part of the §2.3 public API): lets the verb suite apply a single
// effect against a minimal EngineState and inspect the mutation + emitted directives.
function makeTestState(overrides) {
  const heroId = 'hero1';
  const state = {
    clock: {
      month: 1,
      turnInMonth: 1,
      turnsThisMonth: 5,
      cursor: null,
      pending: null,
      activeHero: heroId,
      turnOrder: [heroId],
      firstPlayerOfMonth: heroId,
      latches: {},
    },
    kingdoms: { ownership: { north: heroId }, dormant: [] },
    heroes: {
      [heroId]: {
        warriors: 7,
        spirit: 3,
        corruption: 0,
        advantages: 6,
        virtues: { active: [], inactive: ['v1', 'v2'] },
        items: { gear: [], treasure: [], potions: [], questItems: [] },
        companions: [],
        counters: {},
      },
    },
    foes: [
      {
        instanceId: 'foe-1',
        foeId: 'brigands',
        status: 'ready',
        traits: ['Humanoid'],
        location: 'delmsmire',
      },
    ],
    adversary: {
      foeId: 'ashstrider',
      spawned: false,
      defeated: false,
      advantages: [],
      advantagesBanked: 0,
      questProgress: 0,
      battleProgress: 0,
    },
    skulls: { supply: 24, onBoard: 0 },
    decks: {},
    market: [],
    monuments: [],
    markers: [],
    tokens: [],
    flags: {},
    counters: {},
    sealsRemoved: 0,
    brokenSeals: [],
    quests: {},
    mainGoalComplete: false,
    dungeons: {},
    tower: { drums: [0, 0, 0], glyphFacing: {}, calibrated: true },
    rng: pcg32.serialize(pcg32.create('test')),
    outcome: { status: 'running', reason: null },
    _lib: {
      tokenTypes: {
        'river-of-fire': { removable: false },
        spore: {
          removable: true,
          threshold: { at: 3, onReach: [{ op: 'corruption.gain', source: 'spore' }] },
        },
      },
      quests: {},
      foes: { brigands: { level: 2 } },
      battleDefs: {
        ashstrider: {
          cards: [
            { advantage: 'Magic', strikes: 1 },
            { advantage: 'Beast', strikes: 1 },
            { advantage: 'Humanoid', strikes: 1 },
            { advantage: 'Melee', strikes: 1 },
            { advantage: 'Undead', strikes: 1 },
          ],
        },
        brigands: {
          cards: [
            { advantage: 'Humanoid', strikes: 1 },
            { advantage: 'Melee', strikes: 1 },
          ],
        },
        crit: {
          cards: [
            { advantage: 'Magic', strikes: 1, critical: true },
            { advantage: 'Beast', strikes: 1 },
          ],
        },
      },
    },
  };
  return Object.assign(state, overrides || {});
}
function applyOne(state, eff) {
  const directives = [];
  applyEffect(eff, state, directives);
  return { state, directives };
}

module.exports = {
  ENGINE_VERSION,
  SUPPORTED_SCHEMA_RANGE,
  init,
  step,
  replay,
  serialize,
  deserialize,
  digest,
  evalCondition,
  __internals: {
    applyEffect,
    makeTestState,
    applyOne,
    startBattle,
    resolveBattle,
    applyTrade,
    interpretNode,
    resolveRoomEntry,
    finalizeRoom,
    completeDungeon,
    deriveGlyphFacing,
    homeKingdomOf,
    recomputeGlyphFacing,
  },
};
