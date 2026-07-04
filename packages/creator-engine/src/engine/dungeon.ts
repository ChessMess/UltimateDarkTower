// dungeon.ts — the graph-faithful dungeon subflow (§4 row 157; catalog §5): room entry/gate/inside-
// event/improve/finalize, door movement, and completion (which completes the spawning quest). Cleared
// state persists across heroes on state.dungeons[id]. Depends on core, conditions, effects, and turn.

import { dir, fault } from './core';
import { evalCondition } from './conditions';
import { applyEffect, completeQuest } from './effects';
import { awardHeroic } from './turn';
import type { EngineState, Directive, EngineNode, DungeonCursor, DungeonRunState, DungeonRoomDef, NodeResult } from './types';

export function dungeonState(state: EngineState, id: string): DungeonRunState {
  if (!state.dungeons[id]) state.dungeons[id] = { clearedRooms: [], improvedRooms: [] };
  if (!state.dungeons[id].improvedRooms) state.dungeons[id].improvedRooms = [];
  return state.dungeons[id];
}
export function roomOf(state: EngineState, dc: DungeonCursor, roomId: string | null): DungeonRoomDef {
  const d = state._lib.dungeons?.[dc.dungeonId];
  const room = (d?.rooms || []).find((r) => r.id === roomId);
  if (!room)
    throw fault("dungeon.room references unknown room '" + roomId + "' in dungeon '" + dc.dungeonId + "'");
  return room;
}

// Resolve entry into the room a `dungeon.room` node names: gate → insideEvent → (improve boundary) →
// finalize. Returns {goto}|{await}|{terminal}.
export function resolveRoomEntry(node: EngineNode, state: EngineState, directives: Directive[]): NodeResult {
  const dc = state.clock.dungeon;
  if (!dc) throw fault('dungeon.room walked outside an active dungeon subflow: ' + node.id);
  const roomId = (node.props || {}).roomId as string | undefined;
  if (!roomId) throw fault('dungeon.room missing props.roomId: ' + node.id);
  const room = roomOf(state, dc, roomId);
  dc.currentRoom = roomId;
  dc.currentRoomNode = node.id;
  dir(directives, 'board.mutate', {
    command: 'revealRoom',
    args: { dungeon: dc.dungeonId, room: roomId, slice: room.bitmapSlice },
  });
  if (room.displayText) dir(directives, 'ui.update', { delta: { dungeonRoomText: room.displayText } });

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
    !(ds.improvedRooms || []).includes(roomId) &&
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

export function finalizeRoom(node: EngineNode, state: EngineState, directives: Directive[]): NodeResult {
  const dc = state.clock.dungeon as DungeonCursor;
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

export function awaitDungeonMove(_node: EngineNode, state: EngineState, directives: Directive[]): NodeResult {
  const dc = state.clock.dungeon as DungeonCursor;
  const room = roomOf(state, dc, dc.currentRoom);
  const doors = (['N', 'E', 'S', 'W'] as const).filter((d) => (room.exits || {})[d] === 'door');
  dir(directives, 'ui.prompt', {
    kind: 'choice',
    requestId: 'dungeonMove',
    text: 'Move through a door or leave the dungeon',
    room: dc.currentRoom as string,
    doors: doors as unknown as string[],
  });
  return { await: { request: { id: 'dungeonMove', kind: 'choice' } } };
}

// Clearing the target room completes the dungeon AND its spawning quest, removing the board token.
export function completeDungeon(state: EngineState, directives: Directive[]): NodeResult {
  const dc = state.clock.dungeon as DungeonCursor;
  const d = state._lib.dungeons?.[dc.dungeonId];
  dir(directives, 'board.mutate', {
    command: 'removeDungeonToken',
    args: { dungeon: dc.dungeonId },
  });
  dir(directives, 'log.entry', { event: 'dungeonComplete', dungeon: dc.dungeonId });
  if (d?.spawningQuestId) completeQuest(state, directives, d.spawningQuestId); // fires questComplete (§4.4)
  const ret = dc.completed;
  state.clock.dungeon = null;
  if (state.outcome.status !== 'running') return { terminal: true };
  // full turn: dungeon exploration is the quest heroic action — completed → +2 spirit
  if (state._setup && state._setup.fullTurn) awardHeroic(state, directives);
  if (state.outcome.status !== 'running') return { terminal: true };
  return { goto: ret };
}
